import chr from "./adapter.js";
import parseq from "./libs/parseq.js";
import {tap, pipe, prop, forEach, filter, map, props, head, sort} from "./libs/ramda/index.js";

const {executeScript, insertCss, sendRuntimeMessage, getAllCommands, tabQuery} = chr;

const commands = Object.keys(chrome.runtime.getManifest().commands);

function factory(requestor, value) {
    return function (callback) {
        return requestor(callback, value);
    }
}

function requestorize(unary) {
    return function (callback, value) {
        try {
            return callback(unary(value));
        } catch (e) {
            return callback(undefined, e);
        }
    }
}

parseq.parallel([
    parseq.sequence([
        factory(sendRuntimeMessage, {type: "is busy?"}),
        requestorize(pipe(
            prop("isBusy"),
            tap((x) => document.getElementById("busy").style.display = (x) ? "block" : "none")
        ))
    ]),
    parseq.sequence([
        factory(sendRuntimeMessage, {type: "get styles"}),
        requestorize(pipe(
            prop("styles")
        )),
        createStyleList
    ]),
    parseq.sequence([
        factory(sendRuntimeMessage, {type: "get include style"}),
        requestorize(pipe(
            prop("includeStyle"),
            tap((x) => document.getElementById("includeStyleCheck").checked = x)
        ))
    ]),
    // get all shortcuts and display them in the menuTitle
    parseq.sequence([
        getAllCommands,
        requestorize(pipe(
            filter((x) => commands.includes(x.name)),
            map(props(["name", "shortcut"])),
            tap(forEach(
                (x) => document.getElementById(x[0] + "-shortcut").textContent = x[1]
            ))
        ))
    ])
])
(function (value, reason) {
    if (value === undefined) {
        return console.log(`Error - drawing menu: ${reason}`);
    }
});

function createStyleList(callback, styles) {
    if (!styles || styles.length === 0) {
        return callback("success");
    }

    let allMatchingStyles = styles.map(function (style, i) {
        return {
            index: i,
            length: style.url.length,
            regexp: new RegExp(style.url, "i")
        };
    });

    parseq.sequence([
        tabQuery,
        requestorize(head),
        function (callback, tab) {
            const currentUrl = tab.url.replace(/(http[s]?:\/\/|www\.)/i, '').toLowerCase();
            // if multiple URL regexes match, select the longest one
            allMatchingStyles = allMatchingStyles.filter((style) => style.regexp && style.regexp.test(currentUrl));

            const index = pipe(
                sort((a, b) => b.length - a.length),
                head,
                prop("index")
            )(allMatchingStyles);

            if (index !== undefined) {
                return sendRuntimeMessage(callback, {
                    type: "set current style",
                    currentStyle: styles[index]
                });
            }

            return callback("success");
        }
    ])(callback, {"active": true});
}


// create menu labels
document.getElementById('menuTitle').innerHTML = chrome.i18n.getMessage('extName');
document.getElementById('includeStyle').innerHTML = chrome.i18n.getMessage('includeStyle');
document.getElementById('editStyles').innerHTML = chrome.i18n.getMessage('editStyles');
document.getElementById('savePageLabel').innerHTML = chrome.i18n.getMessage('savePage');
document.getElementById('saveSelectionLabel').innerHTML = chrome.i18n.getMessage('saveSelection');
document.getElementById('pageChapterLabel').innerHTML = chrome.i18n.getMessage('pageChapter');
document.getElementById('selectionChapterLabel').innerHTML = chrome.i18n.getMessage('selectionChapter');
document.getElementById('editChapters').innerHTML = chrome.i18n.getMessage('editChapters');
document.getElementById('waitMessage').innerHTML = chrome.i18n.getMessage('waitMessage');

document.getElementById('includeStyleCheck').onclick = function () {
    let includeStyleCheck = document.getElementById('includeStyleCheck');
    sendRuntimeMessage(function callback(value, reason) {
            if (value === undefined) {
                return console.log("reason: menu-set include style " + reason);
            }
            return console.log("value: menu-set include style " + value);
        },
        {
            type: "set include style",
            includeStyle: includeStyleCheck.checked
        });
}

const firstTabId = requestorize(pipe(head, prop("id")));

document.getElementById("editStyles").onclick = function () {

    if (document.getElementById('cssEditor-Modal')) {
        return;
    }
//Build the style editor...
    parseq.sequence([
        tabQuery,
        firstTabId,
        function injectScripts(callback, tabId) {
            return parseq.parallel([
                factory(insertCss(tabId), {file: "/cssEditor.css"}),
                factory(executeScript(tabId), {file: "/cssEditor.js"})
            ])(callback, tabId);
        },
        function (callback, value) {
            window.close();//closes menu
            return callback(value);
        }
    ])(function (value, reason) {
        if (value === undefined) {
            return console.log(`Error - drawing style editor: ${reason}`);
        }
    }, {
        currentWindow: true,
        active: true
    });

}

document.getElementById("editChapters").onclick = function () {

    if (document.getElementById('chapterEditor-Modal')) {
        return;
    }

    parseq.sequence([
        tabQuery,
        firstTabId,
        function injectScripts(callback, tabId) {
            return parseq.parallel([
                factory(insertCss(tabId), {file: "/chapterEditor.css"}),
                factory(executeScript(tabId), {file: "./libs/jquery.js"}),
                factory(executeScript(tabId), {file: "./libs/jquery-sortable.js"}),
                factory(executeScript(tabId), {file: "./chapterEditor.js"})
            ])(callback, tabId);
        },
        function (callback, value) {
            window.close();//closes menu
            return callback(value);
        }
    ])(function (value, reason) {
        if (value === undefined) {
            return console.log(`Error - drawing book editor: ${reason}`);
        }
    }, {
        currentWindow: true,
        active: true
    });

};

document.getElementById('savePage').onclick = function () {
    dispatch('save-page', false);
};

document.getElementById('saveSelection').onclick = function () {
    dispatch('save-selection', false);
};

document.getElementById('pageChapter').onclick = function () {
    dispatch('add-page', true);
};

document.getElementById('selectionChapter').onclick = function () {
    dispatch('add-selection', true);
};

function dispatch(commandType, justAddToBuffer) {
    console.debug("dispatch: " + commandType);
    document.getElementById('busy').style.display = 'block';

    sendRuntimeMessage(function () {
        //FIXME - hidden before done
        document.getElementById('busy').style.display = 'none';
    }, {
        type: commandType,
        justAddToBuffer
    });
}

