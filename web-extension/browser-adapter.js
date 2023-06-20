import parseq from "./libs/parseq-extended.js";


function tryCatcher(func) {
    return function (callback, value) {
        try {
            return func(callback, value);
        } catch (e) {
            const jsonValue = JSON.stringify(
                value,
                (k, v) => (
                    v === undefined
                    ? "undefined"
                    : v
                )
            );
            return callback(
                undefined,
                parseq.make_reason(
                    "try-catcher",
                    `catched requestor error ${jsonValue}`,
                    e
                )
            );
        }
    };
}

const getTabs = tryCatcher(function (callback, props) {
    chrome.tabs.query(
        props,
        function (tabs) {
            if (chrome.runtime.lastError) {
                return callback(
                    undefined,
                    `getTabs failed: ${chrome.runtime.lastError}`
                );
            }
            return callback(tabs);
        }
    );
}, "getTabs");

function insertCssRequestor(callback, {tabId, message}) {
    chrome.tabs.insertCSS(tabId, message, function () {
        if (chrome.runtime.lastError) {
            return callback(
                undefined,
                `executedScript failed: tab - ${tabId} ${chrome.runtime.lastError}`
            );
        }
        return callback(tabId);
    });
}
const insertCss = parseq.factory(tryCatcher(insertCssRequestor, "insertCss"));

function executeScriptRequestor(callback, {tabId, script}) {
    chrome.tabs.executeScript(tabId, script, function () {
        if (chrome.runtime.lastError) {
            return callback(
                undefined,
                `executeScript failed: tab - ${tabId} ${chrome.runtime.lastError}`
            );
        }
        return callback(script);
    });
}
const executeScript = parseq.factory(tryCatcher(executeScriptRequestor, "executeScript"));

function sendMessageRequestor(callback, {message, tabId}) {
    chrome.tabs.sendMessage(tabId, message, function (response) {
        if (chrome.runtime.lastError) {
            return callback(
                undefined,
                `sendMessage failed: tab - ${tabId} ${chrome.runtime.lastError}`
            );
        }
        return callback(response);
    });
}
const sendMessage = parseq.factory(tryCatcher(sendMessageRequestor, "sendMessage"));

function sendRuntimeMessageRequestor(callback, {message}) {
    chrome.runtime.sendMessage(message, function (response) {
        if (!response && chrome.runtime.lastError) {
            return callback(
                undefined,
                `sendRuntimeMessage (message: ${JSON.stringify(message)})`
                + ` failed: ${chrome.runtime.lastError}`
            );
        }
        return callback(response);
    });
}
const sendRuntimeMessage = parseq.factory(
    tryCatcher(sendRuntimeMessageRequestor), "sendRuntimeMessage"
);

const getStyles = sendRuntimeMessage({message: {type: "get styles"}});
const setStyles = (styles) => sendRuntimeMessage({message: {type: "set styles", req: {styles}}});
const importStyles = sendRuntimeMessage({message: {type: "ImportCustomStyles"}});
const exportStyles = sendRuntimeMessage({message: {type: "ExportCustomStyles"}});

function fromStorageRequestor(callback, {key, defaultValue}) {
    chrome.storage.local.get(
        key,
        function (data) {
            //Not clear in the docs...
            //https://developer.chrome.com/docs/extensions/reference/storage/
            if (chrome.runtime.lastError) {
                return callback(
                    undefined,
                    `fromStorage failed: key - ${key} ${chrome.runtime.lastError}`
                );
            }
            return callback(data[key] ?? defaultValue);
        }
    );
}
const fromStorage = parseq.factory(tryCatcher(
    fromStorageRequestor,
    "fromStorage"
));

//WARNING: the callback is missing from everywhere in the code!
function toStorageRequestor(callback, {key, req}) {
    const obj = Object.create(null);
    obj[key] = req[key];
    chrome.storage.local.set(obj, function () {
        if (typeof callback === "function") {
            if (chrome.runtime.lastError) {
                return callback(
                    undefined,
                    `toStorage failed: key - ${key} ${chrome.runtime.lastError}`
                );
            }
            return callback(req);
        }
    });
}
const toStorage = parseq.factory(tryCatcher(
    toStorageRequestor,
    "toStorage"
));

function removeFromStorageRequestor(callback, {key, value}) {
    chrome.storage.local.remove(key, function () {
        if (chrome.runtime.lastError) {
            return callback(
                undefined,
                `removeFromStorage failed: key - ${key} ${chrome.runtime.lastError}`
            );
        }
        return callback(value ?? "");
    });
}
const removeFromStorage = parseq.factory(tryCatcher(
    removeFromStorageRequestor,
    "removeFromStorage"
));

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
    getStyles,
    setStyles,
    importStyles,
    exportStyles,
    local_text: (id) => chrome.i18n.getMessage(id),
    get_background_page_requestor: (cb) => parseq.promise_requestorize(
        chrome.runtime.getBackgroundPage(cb)
    ),
    commands: Object.keys(chrome.runtime.getManifest().commands)
});
