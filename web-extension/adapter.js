function tabQuery(callback, props) {
    return chrome.tabs.query(
        props,
        callback
    );
}

function sendMessage(tabId) {
    return function sendMessageRequestor(callback, message) {
        return chrome.tabs.sendMessage(tabId, message, function (response) {
            if (chrome.runtime.lastError) {
                return callback(undefined, `sendMessage failed: tab - ${tabId} ${chrome.runtime.lastError}`);
            }
            return callback(response);
        });
    }
}

function sendRuntimeMessage(callback, message) {
    return chrome.runtime.sendMessage(tabId, message, function (response) {
        if (chrome.runtime.lastError) {
            return callback(undefined, `sendMessage failed: tab - ${tabId} ${chrome.runtime.lastError}`);
        }
        return callback(response);
    });
}


function getFromStorage(key, defaultValue) {
    return function getFromStorageRequestor(callback) {
        return chrome.storage.local.get(
            key,
            function (data) {
                //Not clear in the docs...
                //https://developer.chrome.com/docs/extensions/reference/storage/
                if (chrome.runtime.lastError) {
                    return callback(undefined, `getFromStorage failed: key - ${key} ${chrome.runtime.lastError}`);
                }
                const toR = Object.create(null);
                toR[key] = data[key] ?? defaultValue;
                callback(toR);
            }
        );
    }
}

//WARNING: the callback is missing from everywhere in the code!
function setStorage(key) {
    return function setStorageRequestor(callback, req) {
        const obj = Object.create(null);
        obj[key] = req[key];
        return chrome.storage.local.set(obj, function () {
            if (typeof callback === "function") {
                if (chrome.runtime.lastError) {
                    return callback(undefined, `setStorage failed: key - ${key} ${chrome.runtime.lastError}`);
                }
                return callback("success");
            }
        });
    }
}

function removeFromStorage(key) {
    return function removeFromStorageRequestor(callback) {
        return chrome.storage.local.remove(key, function () {
            if (chrome.runtime.lastError) {
                return callback(undefined, `removeFromStorage failed: key - ${key} ${chrome.runtime.lastError}`);
            }
            return callback("success");
        });
    }
}

export default Object.freeze({
    tabQuery,
    sendMessage,
    sendRuntimeMessage,
    getFromStorage,
    setStorage,
    removeFromStorage
});
