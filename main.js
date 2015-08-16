(function() {
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
			parsed = ["camxes-error", [["camxes-error-before", text.substring(0, ex.offset)], ["camxes-error-after", text.substring(ex.offset)]]];
		}

		function toElement(x) {
			if (typeof x === 'string') {
				var node = [];
				var offset = text.indexOf(x);
				if (offset != 0) {
					node.push(document.createTextNode(text.substring(0, offset)));
				}
				node.push(document.createTextNode(x));
				text = text.substring(offset + x.length);
				return node;
			}
			if (typeof x[0] === 'string') {
				var el = document.createElement('span');
				el.className = 'c-' + x[0];
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

	container.appendChild(input);
	container.appendChild(output);
	container.id = 'container';
	document.body.appendChild(container);
	input.focus();
})();
