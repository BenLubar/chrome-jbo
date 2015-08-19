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

	// based on code from github.com/dag/jbo
	var c       = '[bcdfgjklmnprstvxz]',
		v       = '[aeiou]',
		cc      = '(?:bl|br|cf|ck|cl|cm|cn|cp|cr|ct|dj|dr|dz|fl|fr|gl|gr|jb|jd|jg|jm|jv|kl|kr|ml|mr|pl|pr|sf|sk|sl|sm|sn|sp|sr|st|tc|tr|ts|vl|vr|xl|xr|zb|zd|zg|zm|zv)',
		vv      = '(?:ai|ei|oi|au)',
		rafsi3v = '(?:' + cc + v + '|' + c + vv + '|' + c + v + '\'' + v + ')',
		rafsi3  = '(?:' + rafsi3v + '|' + c + v + c + ')',
		rafsi4  = '(?:' + c + v + c + c + '|' + cc + v + c + ')',
		rafsi5  = rafsi4 + v,
		rafsiRe = [];
	function splitRafsi(compound) {
		if (rafsiRe.length < compound.length / 3) {
			var reg = '^';
			for (var i = 0; i < compound.length / 3; i++) {
				reg += '(?:(' + rafsi3 + ')[nry]??|(' + rafsi4 + ')y)';
				if (rafsiRe.length <= i) {
					rafsiRe.push(new RegExp(reg + '(' + rafsi3v + '|' + rafsi5 + ')$', 'm'));
				}
			}
		}

		var result;
		if (rafsiRe.slice(0, Math.floor(compound.length / 3)).some(function(re) {
			result = re.exec(compound);
			if (result) {
				result = result.slice(1).filter(function(x) {
					return x;
				});
				return true;
			}
			return false;
		})) {
			return result;
		}

		return [];
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
			var rafsi = {};
			[].forEach.call(xhr.responseXML.querySelectorAll('valsi>rafsi'), function(r) {
				rafsi[r.textContent] = r.parentNode.getAttribute('word');
			});

			[].forEach.call(xhr.responseXML.querySelectorAll('valsi[type="gismu"]'), function(v) {
				var s = v.getAttribute('word');
				rafsi[s.substr(0, 4)] = s;
			});

			// unofficial stuff:
			[].forEach.call(xhr.responseXML.querySelectorAll('valsi[type="experimental gismu"]'), function(v) {
				var s = v.getAttribute('word');

				if (s === 'datru') {
					return;
				}

				if (s.substr(0, 4) in rafsi) {
					console.error('duplicate rafsi: ', s.substr(0, 4), ' (', s, ', ', rafsi[s.substr(0, 4)], ')');
				} else {
					rafsi[s.substr(0, 4)] = s;
				}
			});

			[].forEach.call(xhr.responseXML.querySelectorAll('valsi>notes'), function(notes) {
				var valsi = notes.parentNode;
				var type = valsi.getAttribute('type');
				if (type === 'lujvo' || type == 'fu\'ivla' || /^obsolete /.test(type)) {
					return;
				}

				var word = valsi.getAttribute('word');
				if (word === 'zi\'ai') {
					// hard-coded to ignore false positive
					return;
				}

				var re = new RegExp('\\W-(' + rafsi3 + ')-(?:\\W|$)', 'g');
				var m;
				while ((m = re.exec(notes.textContent)) !== null) {
					if (m[1] in rafsi) {
						console.error('duplicate rafsi: ', m[1], ' (', word, ', ', rafsi[m[1]], ')');
					} else {
						rafsi[m[1]] = word;
					}
				}
			});

			dict.q.forEach(function(callback) {
				callback(xhr.responseXML, rafsi);
			});
			dict = function(callback) {
				callback(xhr.responseXML, rafsi);
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
		var tooltip;
		function doTooltip(el, word) {
			if (tooltip) {
				tooltip.appendChild(document.createElement('hr'));
			} else {
				tooltip = document.createElement('span');
				tooltip.className = 'tooltip';
			}
			dict(function(d, rafsi) {
				function writeTooltip(definition) {
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
				}
				var valsi = d.querySelector('valsi[word="' + word + '"]');
				if (!valsi) {
					tooltip.appendChild(document.createTextNode('undefined '));
					tooltip.appendChild(document.createTextNode(el.className.substr(2)));
				} else {
					var definition = valsi.querySelector('definition').textContent;
					var notes = valsi.querySelector('notes');
					if (notes) {
						definition += '\n\n' + notes.textContent;
					}
					writeTooltip(definition);
				}

				if (el.className === 'c-lujvo') {
					splitRafsi(word).forEach(function(r) {
						tooltip.appendChild(document.createElement('hr'));
						if (r in rafsi) {
							var bold = document.createElement('strong');
							bold.textContent = rafsi[r];
							tooltip.appendChild(bold);
							tooltip.appendChild(document.createTextNode(' – '));
							var valsi = d.querySelector('valsi[word="' + rafsi[r] + '"]');
							var definition = valsi.querySelector('definition').textContent;
							var notes = valsi.querySelector('notes');
							if (notes) {
								definition += '\n\n' + notes.textContent;
							}
							writeTooltip(definition);
						} else {
							tooltip.appendChild(document.createTextNode('undefined rafsi: '));
							tooltip.appendChild(document.createTextNode(r));
						}
					});
				}
				el.appendChild(tooltip);
			});
		}
		if (input.selectionStart === input.selectionEnd) {
			var didBu = false;
			[].forEach.call(output.querySelectorAll('[data-offset][data-length]'), function(el) {
				var offset = +el.getAttribute('data-offset');
				var length = +el.getAttribute('data-length');
				if (offset <= input.selectionStart && input.selectionStart - offset <= length) {
					if (!didBu) {
						for (var parent = el; parent; parent = parent.parentNode) {
							if (parent.className === 'c-bu_clause') {
								var start = parent.querySelector('[data-offset][data-length]');
								var bu = parent.querySelectorAll('.c-BU');
								bu = bu[bu.length - 1];
								doTooltip(parent, input.value.substring(+start.getAttribute('data-offset'), +bu.getAttribute('data-offset') + +bu.getAttribute('data-length')));
								didBu = true;
								break;
							}
						}
					}
					doTooltip(el, input.value.substr(offset, length));
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
