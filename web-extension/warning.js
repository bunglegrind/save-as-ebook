function warning(timeout) {
    let started = false;
    let cancel;

    function set() {
        if (!started) {
            started = true;
            insertTag();
            cancel = setTimeout(remove, timeout);
        }
    }

    function isVisible() {
        return started;
    }

    function remove() {
        clearTimeout(cancel);
        cancel = undefined;
        started = false;

        clearTag();
    }

    function insertTag() {
        chrome.browserAction.setBadgeBackgroundColor({color: "red"});
        chrome.browserAction.setBadgeText({text: "Busy"});
    }

    function clearTag() {
        chrome.browserAction.setBadgeText({text: ""});
        const popups = chrome.extension.getViews({type: "popup"});

        if (popups.length > 0) {
            popups[0].close();
        }
    }

    return Object.freeze({
        set,
        isVisible,
        remove
    });
}

export default Object.freeze(warning);