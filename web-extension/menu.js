import chr from "./adapter.js";
import parseq from "./libs/parseq.js";

const {executeScript, insertCss, sendRuntimeMessage, getAllCommands, tabQuery} = chr;

function factory(requestor, value) {
    return function (callback) {
        return requestor(callback, value);
    }
}


//TODO: it looks like I'm breaking the Single Responsible Principle...
parseq.parallel([
    factory(sendRuntimeMessage, {type: "is busy?"}),
    factory(sendRuntimeMessage, {type: "get styles"}),
    factory(sendRuntimeMessage, {type: "get include style"}),
    getAllCommands
])(function (responses, reason) {
    if (responses === undefined) {
        return console.log(`Error - drawing menu: ${reason}`);
    }

    document.getElementById("busy").style.display = (responses[0].isBusy) ? "block" : "none";
    createStyleList(responses[1].styles);
    document.getElementById("includeStyleCheck").checked = responses[2].includeStyle;

    // get all shortcuts and display them in the menuTitle
    const commands = responses[3];

    for (let command of commands) {
        if (command.name === 'save-page') {
            document.getElementById('savePageShortcut').appendChild(document.createTextNode(command.shortcut));
        } else if (command.name === 'save-selection') {
            document.getElementById('saveSelectionShortcut').appendChild(document.createTextNode(command.shortcut));
        } else if (command.name === 'add-page') {
            document.getElementById('pageChapterShortcut').appendChild(document.createTextNode(command.shortcut));
        } else if (command.name === 'add-selection') {
            document.getElementById('selectionChapterShortcut').appendChild(document.createTextNode(command.shortcut));
        }
    }

});

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

document.getElementById("editStyles").onclick = function () {

    if (document.getElementById('cssEditor-Modal')) {
        return;
    }
//Build the style editor...
    parseq.sequence([
        tabQuery,
        (callback, tab) => callback(tab[0].id),
        function (callback, tabId) {
            return parseq.parallel([
                factory(insertCss(tabId), {file: "/cssEditor.css"}),
                factory(executeScript(tabId), {file: "/cssEditor.js"})
            ])(callback, tabId);
        },
        function (callback, value) {
            window.close();
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

    chrome.tabs.query({
        currentWindow: true,
        active: true
    }, function (tab) {

        chrome.tabs.executeScript(tab[0].id, {file: './libs/jquery.js'});
        chrome.tabs.executeScript(tab[0].id, {file: './libs/jquery-sortable.js'});
        chrome.tabs.insertCSS(tab[0].id, {file: '/chapterEditor.css'});

        chrome.tabs.executeScript(tab[0].id, {
            file: '/chapterEditor.js'
        });

        window.close();
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

function createStyleList(styles) {
    chrome.tabs.query({'active': true}, function (tabs) {
        let currentUrl = tabs[0].url;

        if (!styles || styles.length === 0) {
            return;
        }

        // if multiple URL regexes match, select the longest one
        let allMatchingStyles = [];

        for (let i = 0; i < styles.length; i++) {
            let listItem = document.createElement('option');
            listItem.id = 'option_' + i;
            listItem.className = 'cssEditor-chapter-item';
            listItem.value = 'option_' + i;
            listItem.innerText = styles[i].title;

            currentUrl = currentUrl.replace(/(http[s]?:\/\/|www\.)/i, '').toLowerCase();
            let styleUrl = styles[i].url;
            let styleUrlRegex = null;

            try {
                styleUrlRegex = new RegExp(styleUrl, 'i');
            } catch (e) {
            }

            if (styleUrlRegex && styleUrlRegex.test(currentUrl)) {
                allMatchingStyles.push({
                    index: i,
                    length: styleUrl.length
                });
            }
        }

        if (allMatchingStyles.length >= 1) {
            allMatchingStyles.sort(function (a, b) {
                return b.length - a.length;
            });
            sendRuntimeMessage(
                () => {
                },
                {
                    type: "set current style",
                    currentStyle: styles[allMatchingStyles[0].index]
                }
            );
        }
    });
}


