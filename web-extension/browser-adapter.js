import parseq from "./libs/parseq-extended.js";

function getTabs(callback, props) {
    return chrome.tabs.query(
        props,
        function (tabs) {
            if (chrome.runtime.lastError) {
                return callback(undefined, `getTabs failed: ${chrome.runtime.lastError}`);
            }
            return callback(tabs);
        }
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
    };
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


function fromStorage(key, defaultValue) {
    return function fromStorageRequestor(callback) {
        return chrome.storage.local.get(
            key,
            function (data) {
                //Not clear in the docs...
                //https://developer.chrome.com/docs/extensions/reference/storage/
                if (chrome.runtime.lastError) {
                    return callback(undefined, `fromStorage failed: key - ${key} ${chrome.runtime.lastError}`);
                }
                const toR = Object.create(null);
                toR[key] = data[key] ?? defaultValue;
                callback(toR);
            }
        );
    }
}

//WARNING: the callback is missing from everywhere in the code!
function toStorage(key) {
    return function toStorageRequestor(callback, req) {
        const obj = Object.create(null);
        obj[key] = req[key];
        return chrome.storage.local.set(obj, function () {
            if (typeof callback === "function") {
                if (chrome.runtime.lastError) {
                    return callback(undefined, `toStorage failed: key - ${key} ${chrome.runtime.lastError}`);
                }
                return callback("success");
            }
        });
    };
}

function removeFromStorage(key) {
    return function removeFromStorageRequestor(callback) {
        return chrome.storage.local.remove(key, function () {
            if (chrome.runtime.lastError) {
                return callback(undefined, `removeFromStorage failed: key - ${key} ${chrome.runtime.lastError}`);
            }
            return callback("success");
        });
    };
}

function getAllCommands(callback) {
    return chrome.commands.getAll(callback);
}

function get_background_page_requestor(callback) {
    return chrome.runtime.getBackgroundPage(callback, function (err) {
        return callback(undefined, err);
    });
}

export default Object.freeze({
    getTabs,
    sendMessage,
    sendRuntimeMessage,
    fromStorage,
    toStorage,
    removeFromStorage,
    getAllCommands,
    insertCss,
    executeScript,
    local_text: (id) => chrome.i18n.getMessage(id),
    get_background_page_requestor: (cb) => parseq.promise_requestorize(
        chrome.runtime.getBackgroundPage(cb)
    ),
    commands: Object.keys(chrome.runtime.getManifest().commands)
});
