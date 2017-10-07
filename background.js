function doGloss(info, tab) {
	chrome.windows.create({
		"url": "https://la-lojban.github.io/sutysisku/en/#sisku/" + encodeURIComponent(info.selectionText),
		"focused": true,
		"incognito": tab.incognito,
		"type": "popup"
	});
}

chrome.contextMenus.create({
	"title": "lojban",
	"contexts": ["selection"],
	"onclick": doGloss,
});
