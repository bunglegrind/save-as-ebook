function tabQuery(callback, props) {
    return chrome.tabs.query(
        props,
        (tab) => callback(tab)
    );
}

function insertCss(tabId) {
    return function insertCssRequestor(callback, message) {
        return chrome.tabs.insertCSS(tabId, message, function () {
            if (chrome.runtime.lastError) {
                return callback(undefined, `executedScript failed: tab - ${tabId} ${chrome.runtime.lastError}`);
            }
            return callback("success");
        });
    }
}

function executeScript(tabId) {
    return function executeScriptRequestor(callback, script) {
        return chrome.tabs.executeScript(tabId, script, function () {
            if (chrome.runtime.lastError) {
                return callback(undefined, `executedScript failed: tab - ${tabId} ${chrome.runtime.lastError}`);
            }
            return callback("success");
        });
    }
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
    chrome.runtime.sendMessage(message, function (response) {
        if (!response && chrome.runtime.lastError) {
            return callback(undefined, `sendRuntimeMessage (message: ${JSON.stringify(message)}) failed: ${chrome.runtime.lastError}`);
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

function getAllCommands(callback) {
    return chrome.commands.getAll(callback);
}

export default Object.freeze({
    tabQuery,
    sendMessage,
    sendRuntimeMessage,
    getFromStorage,
    setStorage,
    removeFromStorage,
    getAllCommands,
    insertCss,
    executeScript
});
