/*jslint browser, unordered*/
/*global chrome*/
/*properties
    getTabs, sendMessage, sendRuntimeMessage, fromStorage, toStorage,
    removeFromStorage, getAllCommands, insertCss, listenForCommands,
    listenForMessages, executeScript, retrieveStyles, saveStyles, importStyles,
    exportStyles, getTabs, make_reason
*/
import pq from "./libs/parseq-extended.js";

function getTabsRequestor(callback, {active}) {
    chrome.tabs.query(
        {active},
        function (tabs) {
            if (chrome.runtime.lastError) {
                return callback(
                    undefined,
                    pq.make_reason(
                        "getTabs",
                        `getTabs failed: ${chrome.runtime.lastError}`,
                        {active}
                    )
                );
            }
            return callback(tabs);
        }
    );
}
const getTabs = pq.factory_maker(pq.try_catcher(getTabsRequestor), "getTabs");

function insertCssRequestor(callback, {tabId, message}) {
    chrome.tabs.insertCSS(tabId, message, function () {
        if (chrome.runtime.lastError) {
            return callback(
                undefined,
                pq.make_reason(
                    "insertCss",
                    `insertCSS tab-${tabId} ${chrome.runtime.lastError}`,
                    {tabId, message}
                )
            );
        }
        return callback(tabId);
    });
}
const insertCss = pq.factory_maker(
    pq.try_catcher(insertCssRequestor, "insertCss")
);

function executeScriptRequestor(callback, {tabId, script}) {
    chrome.tabs.executeScript(tabId, script, function () {
        if (chrome.runtime.lastError) {
            return callback(
                undefined,
                pq.make_reason(
                    "executeScript",
                    `executeScript tab-${tabId} ${chrome.runtime.lastError}`,
                    {tabId, script}
                )
            );
        }
        return callback(script);
    });
}
const executeScript = pq.factory_maker(
    pq.try_catcher(executeScriptRequestor, "executeScript")
);

function sendMessageRequestor(callback, {message, tabId}) {
    chrome.tabs.sendMessage(tabId, message, function (response) {
        if (chrome.runtime.lastError) {
            return callback(
                undefined,
                pq.make_reason(
                    "sendMessage",
                    `sendMessage tab-${tabId} ${chrome.runtime.lastError}`,
                    {tabId, message}
                )
            );
        }
        return callback(response);
    });
}
const sendMessage = pq.factory_maker(
    pq.try_catcher(sendMessageRequestor, "sendMessage")
);

function sendRuntimeMessageRequestor(callback, {message}) {
    chrome.runtime.sendMessage(message, function (response) {
        if (!response && chrome.runtime.lastError) {
            return callback(
                undefined,
                pq.make_reason(
                    "sendRuntimeMessage",
                    `sendRuntimeMessage ${chrome.runtime.lastError}`,
                    {message}
                )
            );
        }
        return callback(response);
    });
}
const sendRuntimeMessage = pq.factory_maker(
    pq.try_catcher(sendRuntimeMessageRequestor),
    "sendRuntimeMessage"
);

const retrieveStyles = sendRuntimeMessage({message: {type: "get styles"}});
const saveStyles = (styles) => sendRuntimeMessage(
    {message: {type: "set styles", req: {styles}}}
);
const importStyles = (importedStyles) => sendRuntimeMessage(
    {message: {type: "ImportCustomStyles", customStyles: importedStyles}}
);
const exportStyles = sendRuntimeMessage(
    {message: {type: "ExportCustomStyles"}}
);

function fromStorageRequestor(callback, {key, defaultValue}) {
    chrome.storage.local.get(
        key,
        function (data) {
            //Not clear in the docs...
            //https://developer.chrome.com/docs/extensions/reference/storage/
            if (chrome.runtime.lastError) {
                return callback(
                    undefined,
                    pq.make_reason(
                        "fromStorage",
                        `fromStorage ${chrome.runtime.lastError}`,
                        {key, defaultValue}
                    )
                );
            }
            return callback(data[key] || defaultValue);
        }
    );
}
const fromStorage = pq.factory_maker(pq.try_catcher(
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
                    pq.make_reason(
                        "toStorage",
                        `toStorage ${chrome.runtime.lastError}`,
                        {key, req}
                    )
                );
            }
            return callback(req);
        }
    });
}
const toStorage = pq.factory_maker(pq.try_catcher(
    toStorageRequestor,
    "toStorage"
));

function removeFromStorageRequestor(callback, {key, value}) {
    chrome.storage.local.remove(key, function () {
        if (chrome.runtime.lastError) {
            return callback(
                undefined,
                pq.make_reason(
                    "removeFromStorage",
                    `removeFromStorage ${chrome.runtime.lastError}`,
                    {key, value}
                )
            );
        }
        return callback(value ?? "");
    });
}
const removeFromStorage = pq.factory_maker(pq.try_catcher(
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
    retrieveStyles,
    saveStyles,
    importStyles,
    exportStyles,
    local_text: (id) => chrome.i18n.getMessage(id),
    get_background_page_requestor: (cb) => pq.promise_requestorize(
        chrome.runtime.getBackgroundPage(cb)
    ),
    commands: Object.keys(chrome.runtime.getManifest().commands)
});
