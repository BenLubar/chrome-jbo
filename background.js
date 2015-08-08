function doGloss(info, tab) {
	chrome.windows.create({
		"url": "http://mw.lojban.org/extensions/ilmentufa/i/en/#sisku/" + encodeURIComponent(info.selectionText),
		"focused": true,
		"incognito": tab["incognito"],
		"type": "popup"
	});	
}

chrome.contextMenus.create({
	"title": "lojban",
	"contexts": ["selection"],
	"onclick": doGloss,
});
