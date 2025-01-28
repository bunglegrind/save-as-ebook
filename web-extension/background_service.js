importScripts("./background_common.js");

function resetBusy() {
    chrome.storage.session.set({isBusy: false}).then(function () {
        chrome.alarms.clear("busy").then(function (ignore) {
            chrome.action.setBadgeText({text: ""});
        });
    });
}

function downloadFile(blob, filename, callback) {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = function () {
        const url = reader.result;
        chrome.downloads.download({
            'saveAs': true,
            'url': url,
// TODO listent downloads.onChanged
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/downloads/download
            'filename': filename
        }, callback);
    };

}