(function() {
	"use strict";

	var VALIS_PROXY = 'https://atcors.herokuapp.com/';
	var VALIS_URL = 'http://vrici.lojban.org:5555';

	var appCache = window.applicationCache;
	if (appCache) {
		function checkAppCache() {
			if (appCache.status === appCache.UPDATEREADY) {
				location.reload();
			}
		}
		try {
			appCache.update();
		} catch (ex) {
			// ignore
		}
		checkAppCache();
		appCache.addEventListener('updateready', checkAppCache, false);
	}

	var input = document.createElement('textarea');
	var output = document.createElement('pre');
	var container = document.createElement('div');

	function update() {
		var text = input.value;
		var parsed;
		try {
			parsed = camxes.parse(text);
		} catch (ex) {
			parsed = ["camxes-error", [["camxes-error-before", text.substr(0, ex.offset)], ["camxes-error-after", text.substr(ex.offset)]]];
		}

		var index = 0;
		function toElement(x) {
			if (typeof x === 'string') {
				var node = [];
				var offset = text.indexOf(x);
				if (offset != 0) {
					node.push(document.createTextNode(text.substr(0, offset)));
				}
				node.push(document.createTextNode(x));
				index += offset + x.length;
				text = text.substr(offset + x.length);
				return node;
			}
			if (typeof x[0] === 'string') {
				var el = document.createElement('span');
				el.className = 'c-' + x[0];
				if (x.length === 2 && typeof x[1] === 'string') {
					el.setAttribute('data-offset', index + text.indexOf(x[1]));
					el.setAttribute('data-length', x[1].length);
				}
				x.slice(1).forEach(function(y) {
					toElement(y).forEach(function(z) {
						el.appendChild(z);
					});
				});
				return [el];
			}
			return [].concat.apply([], x.map(toElement));
		}

		while (output.firstChild) {
			output.removeChild(output.firstChild);
		}

		toElement(parsed).forEach(function(el) {
			output.appendChild(el);
		});
		if (text) {
			output.appendChild(document.createTextNode(text));
		}
		output.scrollTop = input.scrollTop;
		output.scrollLeft = input.scrollLeft;
	}

	if (localStorage['notepad'] !== undefined) {
		input.value = JSON.parse(localStorage['notepad']);
		update();
	}
	input.addEventListener('input', function() {
		localStorage['notepad'] = JSON.stringify(input.value);
		update();
	}, false);
	input.addEventListener('scroll', function() {
		output.scrollTop = input.scrollTop;
		output.scrollLeft = input.scrollLeft;
	}, false);
	input.addEventListener('keypress', function() {
		[].forEach.call(output.querySelectorAll('.tooltip'), function(el) {
			el.parentNode.removeChild(el);
		});
	}, false);
	input.addEventListener('click', function() {
		[].forEach.call(output.querySelectorAll('.tooltip'), function(el) {
			el.parentNode.removeChild(el);
		});
		if (input.selectionStart === input.selectionEnd) {
			[].forEach.call(output.querySelectorAll('[data-offset][data-length]'), function(el) {
				var offset = +el.getAttribute('data-offset');
				var length = +el.getAttribute('data-length');
				if (offset <= input.selectionStart && input.selectionStart - offset <= length) {
					var tooltip = document.createElement('span');
					tooltip.className = 'tooltip';
					var xhr = new XMLHttpRequest();
					xhr.open('GET', VALIS_PROXY + VALIS_URL + '/data/valsi/' + encodeURIComponent(input.value.substr(offset, length)), true);
					xhr.onload = function() {
						var resp = JSON.parse(xhr.responseText);
						if (!resp.definitions) {
							tooltip.parentNode.removeChild(tooltip);
							return;
						}
						var url = resp.definitions.en;
						navigator.languages.some(function(l) {
							if (l in resp.definitions) {
								url = resp.definitions[l];
								return true;
							}
							return false;
						});
						if (!url) {
							tooltip.parentNode.removeChild(tooltip);
							return;
						}
						xhr = new XMLHttpRequest();
						xhr.open('GET', VALIS_PROXY + url, true);
						xhr.onload = function() {
							var resp = JSON.parse(xhr.responseText);
							var definition = resp.items[0].definition;
							if (resp.items[0].notes !== undefined) {
								definition += '\n\n' + resp.items[0].notes;
							}
							var inMath = true;
							definition.split(/\$/g).forEach(function(s) {
								inMath = !inMath;
								if (inMath) {
									var first = true;
									s.replace(/[\{\}]/g, '').split(/=/g).forEach(function(x) {
										if (first) {
											first = false;
										} else {
											tooltip.appendChild(document.createTextNode('='));
										}
										if (x.indexOf('_') !== -1) {
											x = x.split(/_/);
											tooltip.appendChild(document.createTextNode(x[0]));
											var subscript = document.createElement('sub');
											subscript.appendChild(document.createTextNode(x[1]));
											tooltip.appendChild(subscript);
										} else if (x.indexOf('^') !== -1) {
											x = x.split(/\^/);
											tooltip.appendChild(document.createTextNode(x[0]));
											var superscript = document.createElement('sup');
											superscript.appendChild(document.createTextNode(x[1]));
											tooltip.appendChild(superscript);
										} else {
											tooltip.appendChild(document.createTextNode(x));
										}
									});
								} else {
									tooltip.appendChild(document.createTextNode(s));
								}
							});
						};
						xhr.send();
					};
					xhr.send();
					el.appendChild(tooltip);
				}
			});
		}
	}, false);

	container.appendChild(input);
	container.appendChild(output);
	container.id = 'container';
	document.body.appendChild(container);
	input.focus();
})();
