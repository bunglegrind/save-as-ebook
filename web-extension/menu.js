import chr from "./adapter.js";

const {sendRuntimeMessage, getAllCommands, tabQuery} = chr;


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

// get all shortcuts and display them in the menuTitle
getAllCommands((commands) => {
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

sendRuntimeMessage(function (response) {
    if (response.isBusy) {
        document.getElementById('busy').style.display = 'block';
    } else {
        document.getElementById('busy').style.display = 'none';
    }
}, {type: "is busy?"});

sendRuntimeMessage(function (response) {
    createStyleList(response.styles);
}, {type: "get styles"});

sendRuntimeMessage(function (response) {
    const includeStyleCheck = document.getElementById('includeStyleCheck');
    includeStyleCheck.checked = response.includeStyle;
}, {type: "get include style"});


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

    tabQuery(
        function (tab) {
            insertCss(tab[0].id)(
                () => {
                },
                {file: '/cssEditor.css'}
            );

            insertCss(tab[0].id)(
                () => {
                },
                {file: '/cssEditor.js'}
            );
            window.close();
        }, {
            currentWindow: true,
            active: true
        }
    );
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


