import parseq from "./libs/parseq-extended.js";

function getTabs(callback, props) {
    chrome.tabs.query(
        props,
        function (tabs) {
            if (chrome.runtime.lastError) {
                return callback(undefined, `getTabs failed: ${chrome.runtime.lastError}`);
            }
            return callback(tabs);
        }
    );
}

function insertCss(message) {
    return function insertCssRequestor(callback, tabId) {
        chrome.tabs.insertCSS(tabId, message, function () {
            if (chrome.runtime.lastError) {
                return callback(undefined, `executedScript failed: tab - ${tabId} ${chrome.runtime.lastError}`);
            }
            return callback(tabId);
        });
    };
}

function executeScript(tabId) {
    return function executeScriptRequestor(callback, script) {
        chrome.tabs.executeScript(tabId, script, function () {
            if (chrome.runtime.lastError) {
                return callback(undefined, `executedScript failed: tab - ${tabId} ${chrome.runtime.lastError}`);
            }
            return callback(script);
        });
    }
}

// function sendMessage(message) {
//     return function sendMessageRequestor(callback, tabId) {
//         chrome.tabs.sendMessage(tabId, message, function (response) {
//             if (chrome.runtime.lastError) {
//                 return callback(undefined, `sendMessage failed: tab - ${tabId} ${chrome.runtime.lastError}`);
//             }
//             return callback(response);
//         });
//     }
// }

function sendMessage(message, builder = function (v1, v2) {
    return {
        message: v1,
        tabId: v2
    };
}) {
    return function sendMessageRequestor(callback, value) {
        const {message, tabId} = builder(message, value);
        chrome.tabs.sendMessage(tabId, message, function (response) {
            if (chrome.runtime.lastError) {
                return callback(undefined, `sendMessage failed: tab - ${tabId} ${chrome.runtime.lastError}`);
            }
            return callback(response);
        });
    }
}

function sendRuntimeMessage(message) {
    return function sendRuntimeMessageRequestor(callback) {
       chrome.runtime.sendMessage(message, function (response) {
            if (!response && chrome.runtime.lastError) {
                return callback(undefined, `sendRuntimeMessage (message: ${JSON.stringify(message)}) failed: ${chrome.runtime.lastError}`);
            }
            return callback(response);
        });
    };
}

// function sendRuntimeMessage(callback, message) {
//     chrome.runtime.sendMessage(message, function (response) {
//         if (!response && chrome.runtime.lastError) {
//             return callback(undefined, `sendRuntimeMessage (message: ${JSON.stringify(message)}) failed: ${chrome.runtime.lastError}`);
//         }
//         return callback(response);
//     });
// }


function fromStorage(key, defaultValue) {
    return function fromStorageRequestor(callback) {
        chrome.storage.local.get(
            key,
            function (data) {
                //Not clear in the docs...
                //https://developer.chrome.com/docs/extensions/reference/storage/
                if (chrome.runtime.lastError) {
                    return callback(undefined, `fromStorage failed: key - ${key} ${chrome.runtime.lastError}`);
                }
                return callback(data[key] ?? defaultValue);
            }
        );
    }
}

//WARNING: the callback is missing from everywhere in the code!
function toStorage(key) {
    return function toStorageRequestor(callback, req) {
        const obj = Object.create(null);
        obj[key] = req[key];
        chrome.storage.local.set(obj, function () {
            if (typeof callback === "function") {
                if (chrome.runtime.lastError) {
                    return callback(undefined, `toStorage failed: key - ${key} ${chrome.runtime.lastError}`);
                }
                return callback(req);
            }
        });
    };
}

function removeFromStorage(key, builder = (key, ignore) => key) {
    return function removeFromStorageRequestor(callback, value = "") {
        const key = builder(keu, value);
        chrome.storage.local.remove(key, function () {
            if (chrome.runtime.lastError) {
                return callback(undefined, `removeFromStorage failed: key - ${key} ${chrome.runtime.lastError}`);
            }
            return callback(value);
        });
    };
}

function getAllCommands(callback) {
    chrome.commands.getAll(callback);
}

function listenForCommands(callback) {
    chrome.commands.onCommand.addListener(callback);
}

function listenForMessages(callback) {
    chrome.runtime.onMessage.addListener(callback);
}

function get_background_page_requestor(callback) {
    chrome.runtime.getBackgroundPage(callback, function (err) {
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
    listenForCommands,
    listenForMessages,
    executeScript,
    local_text: (id) => chrome.i18n.getMessage(id),
    get_background_page_requestor: (cb) => parseq.promise_requestorize(
        chrome.runtime.getBackgroundPage(cb)
    ),
    commands: Object.keys(chrome.runtime.getManifest().commands)
});
