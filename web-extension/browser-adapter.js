/*jslint browser, unordered*/
/*global chrome*/
/*property
    active, addListener, browserAction, color, commands, create, customStyles,
    defaultValue, executeScript, exportStyles, extensions, factory_maker,
    freeze, fromStorage, get, getAll, getAllCommands, getBackgroundPage,
    getCommands, getLocalText, getManifest, getMessage, getTabs, getViews, i18n,
    importStyles, insertCSS, insertCss, key, keys, lastError, listenForCommands,
    listenForMessages, local, make_reason, message, onCommand, onMessage, query,
    remove, removeFromStorage, req, retrieveStyles, runtime, saveStyles, script,
    sendMessage, sendRuntimeMessage, set, setBadgeBackgroundColor, setBadgeText,
    storage, styles, tabId, tabs, text, toStorage, try_catcher, type, value,
    windowId
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

function setBadgeBackgroundColorRequestor(callback, {color, tabId, windowId}) {
    chrome.browserAction.setBadgeBackgroundColor(
        {color, tabId, windowId},
        function () {
            if (chrome.runtime.lastError) {
                return callback(
                    undefined,
                    pq.make_reason(
                        "setBadgeBackgroundColor",
                        `setBadgeBackgroundColor ${chrome.runtime.lastError}`,
                        {color, tabId, windowId}
                    )
                );
            }
            return callback(true);
        }
    );
}
const setBadgeBackgroundColor = pq.factory_maker(
    setBadgeBackgroundColorRequestor,
    "setBadgeBackgroundColor"
);

function setBadgeTextRequestor(callback, {text, tabId, windowId}) {
    chrome.browserAction.setBadgeText({text, tabId, windowId}, function () {
        if (chrome.runtime.lastError) {
            return callback(
                undefined,
                pq.make_reason(
                    "setBadgeText",
                    `setBadgeText ${chrome.runtime.lastError}`,
                    {text, tabId, windowId}
                )
            );
        }
        return callback(true);
    });
}
const setBadgeText = pq.factory_maker(setBadgeTextRequestor, "setBadgeText");

function getViews({type}) {
    return chrome.extensions.getViews({type});
}

function getBackgroundPageRequestor(callback) {
    chrome.runtime.getBackgroundPage(function (page) {
        if (chrome.runtime.lastError) {
            return callback(
                undefined,
                pq.make_reason(
                    "getBackgroundPage",
                    `getBackgroundPage ${chrome.runtime.lastError}`
                )
            );
        }
        return callback(page);

    });
}
const getBackgroundPage = pq.factory_maker(
    getBackgroundPageRequestor,
    "getBackgroundPage"
);

const getLocalText = (id) => chrome.i18n.getMessage(id);

const getCommands = () => Object.keys(chrome.runtime.getManifest().commands);

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
    setBadgeBackgroundColor,
    setBadgeText,
    getViews,
    getLocalText,
    getBackgroundPage,
    getCommands
});
