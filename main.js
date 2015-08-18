(function() {
	"use strict";

	var appCache = window.applicationCache;
	function checkAppCache() {
		if (appCache.status === appCache.UPDATEREADY) {
			location.reload();
		}
	}
	if (appCache) {
		try {
			appCache.update();
		} catch (ex) {
			// ignore
		}
		checkAppCache();
		appCache.addEventListener('updateready', checkAppCache, false);
	}

	var dict = function(callback) {
		dict.q.push(callback);
	};
	dict.q = [];
	window.dict = function(callback) {dict(callback)};
	function loadDict() {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', 'dict/en.xml', true);
		xhr.overrideMimeType('text/xml; charset=utf-8');
		xhr.onload = function() {
			dict.q.forEach(function(callback) {
				callback(xhr.responseXML);
			});
			dict = function(callback) {
				callback(xhr.responseXML);
			};
		};
		xhr.send();
	}
	loadDict();

	var input = document.createElement('textarea');
	var output = document.createElement('pre');
	var container = document.createElement('div');

	function update() {
		var text = input.value;
		var parsed;
		var error;
		try {
			parsed = camxes.parse(text);
		} catch (ex) {
			error = ex;
			parsed = ["camxes-error", [["camxes-error-before", text.substr(0, ex.offset)], ["camxes-error-after", text.substr(ex.offset)]]];
		}

		var index = 0;
		function toElement(x) {
			if (typeof x === 'string') {
				var node = [];
				var offset = text.indexOf(x);
				if (offset !== 0) {
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
				if (!error && x.length === 2 && typeof x[1] === 'string') {
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
	}
	if (input.value.length === 0) {
		input.value = 'coi lo sampli\n\n.i ma cmene do';
	}
	update();
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
					var word = input.value.substr(offset, length);
					dict(function(d) {
						var valsi = d.querySelector('valsi[word="' + word + '"]');
						if (!valsi) {
							tooltip.appendChild(document.createTextNode('undefined '));
							tooltip.appendChild(document.createTextNode(el.className.substr(2)));
							return;
						}
						var definition = valsi.querySelector('definition').textContent;
						var notes = valsi.querySelector('notes');
						if (notes) {
							definition += '\n\n' + notes.textContent;
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
					});
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
