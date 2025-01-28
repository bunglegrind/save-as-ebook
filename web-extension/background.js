function resetBusy() {
    chrome.storage.session.set({isBusy: false}).then(function () {
        chrome.alarms.clear("busy").then(function (ignore) {
            chrome.action.setBadgeText({text: ""})

            let popups = chrome.extension.getViews({type: "popup"});
            if (popups && popups.length > 0) {
                popups[0].close();
            }
        });
    });
}

function downloadFile(blob, filename, callback) {
    chrome.downloads.download({
        'saveAs': true,
        'url': URL.createObjectURL(blob),
        'filename': filename
    }, callback);
}