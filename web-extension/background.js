import core from "./core.js";

//Listener for keyboard shortcuts
chrome.commands.onCommand.addListener(
    (command) => executeCommand({type: command})
);

//Listener for incoming messages
chrome.runtime.onMessage.addListener(_execRequest);


//convert shortcuts to messages
function executeCommand(command) {
    if (core.isBusy()) {
        chrome.tabs.query({
                currentWindow: true,
                active: true
            },
            (tab) => chrome.tabs.sendMessage(
                tab[0].id,
                {
                    'alert': (
                        'Work in progress! Please wait until the current ' +
                        'eBook is generated!'
                    )
                },
                (r) => console.log(r)
            )
        )
    }

    core.setWarn();

    if (command.type === 'save-page') {
        dispatch('extract-page', false, []);
    } else if (command.type === 'save-selection') {
        dispatch('extract-selection', false, []);
    } else if (command.type === 'add-page') {
        dispatch('extract-page', true, []);
    } else if (command.type === 'add-selection') {
        dispatch('extract-selection', true, []);
    }

}

function dispatch(action, justAddToBuffer, appliedStyles) {
    //WARNING: when saving page, the book buffer is reset
    if (!justAddToBuffer) {
        _execRequest({type: 'clear book'});
    }

    chrome.tabs.query({
        currentWindow: true,
        active: true
    }, (tab) => {

        isIncludeStyles((result) => {
            let isIncludeStyle = result.includeStyle;
            prepareStyles(
                tab,
                isIncludeStyle,
                appliedStyles,
                function (tmpAppliedStyles) {
                    applyAction(
                        tab,
                        action,
                        justAddToBuffer,
                        isIncludeStyle,
                        tmpAppliedStyles,
                        () => alert('done')
                    )
                })
        })
    });
}

function isIncludeStyles(callback) {
    chrome.storage.local.get('includeStyle', (data) => {
        if (!data) {
            callback({includeStyle: false});
        } else {
            callback({includeStyle: data.includeStyle});
        }
    });
}

function prepareStyles(tab, includeStyle, appliedStyles, callback) {
    if (!includeStyle) {
        return callback(appliedStyles);
    }

    chrome.storage.local.get('styles', (data) => {
        let styles = defaultStyles;
        if (data && data.styles) {
            styles = data.styles;
        }
        if (!styles || styles.length === 0) {
            return callback(appliedStyles);
        }

        let currentUrl = tab[0].url;
        let currentStyle = null;
        let allMatchingStyles = [];

        styles.forEach(function (style, i) {
            currentUrl = currentUrl.replace(/(http[s]?:\/\/|www\.)/i, '').toLowerCase();
            let styleUrl = style.url;
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
        });

        if (allMatchingStyles.length === 0) {
            return callback(appliedStyles);
        }

        allMatchingStyles.sort((a, b) => b.length - a.length);
        let selStyle = allMatchingStyles[0];

        if (!selStyle) {
            return callback(appliedStyles);
        }

        currentStyle = styles[selStyle.index];

        if (!currentStyle || !currentStyle.style) {
            return callback(appliedStyles);
        }


        chrome.tabs.insertCSS(tab[0].id, {code: currentStyle.style}, () => {
            appliedStyles.push(currentStyle);
            return callback(appliedStyles)
        });
    });
}

function applyAction(tab, action, justAddToBuffer, includeStyle, appliedStyles) {
    chrome.tabs.sendMessage(tab[0].id, {
        type: action,
        includeStyle: includeStyle,
        appliedStyles: appliedStyles
    }, (response) => {

        if (!response) {
            core.removeWarn();
            return chrome.tabs.sendMessage(tab[0].id, {'alert': 'Save as eBook does not work on this web site!'}, () => {
            });
        }

        if (response.content.trim() === '') {
            core.removeWarn();
            if (justAddToBuffer) {
                chrome.tabs.sendMessage(tab[0].id, {'alert': 'Cannot add an empty selection as chapter!'}, () => {
                });
            } else {
                chrome.tabs.sendMessage(tab[0].id, {'alert': 'Cannot generate the eBook from an empty selection!'}, () => {
                });
            }
            return;
        }
        if (!justAddToBuffer) {
            chrome.tabs.sendMessage(tab[0].id, {'shortcut': 'build-ebook', response: [response]}, () => {
            });
        } else {
            chrome.storage.local.get('allPages', (data) => {
                if (!data || !data.allPages) {
                    data.allPages = [];
                }
                data.allPages.push(response);
                chrome.storage.local.set({'allPages': data.allPages});
                core.removeWarn();
                chrome.tabs.sendMessage(tab[0].id, {'alert': 'Page or selection added as chapter!'}, () => {
                });
            })
        }
    });
}

//MUST return true
//https://developer.chrome.com/docs/extensions/reference/runtime/#event-onMessage
function _execRequest(request, sender, sendResponse) {
    if (request.type === 'get') {
        chrome.storage.local.get('allPages', function (data) {
            if (!data || !data.allPages) {
                return sendResponse({allPages: []});
            }
            sendResponse({allPages: data.allPages});
        })
    }
    if (request.type === 'set') {
        chrome.storage.local.set({'allPages': request.pages});
    }
    if (request.type === 'clear book') {
        core.clearBook();
    }
    if (request.type === 'get title') {
        chrome.storage.local.get('title', function (data) {
            if (!data || !data.title || data.title.trim().length === 0) {
                sendResponse({title: 'eBook'});
            } else {
                sendResponse({title: data.title});
            }
        })
    }
    if (request.type === 'set title') {
        chrome.storage.local.set({'title': request.title});
    }
    if (request.type === 'get styles') {
        core.getStyles(sendResponse);
    }
    if (request.type === 'set styles') {
        chrome.storage.local.set({'styles': request.styles});
    }
    if (request.type === 'get current style') {
        chrome.storage.local.get('currentStyle', function (data) {
            if (!data || !data.currentStyle) {
                sendResponse({currentStyle: 0});
            } else {
                sendResponse({currentStyle: data.currentStyle});
            }
        });
    }
    if (request.type === 'set current style') {
        core.setCurrentStyle(request);
    }
    if (request.type === 'get include style') {
        core.getIncludeStyle(sendResponse);
    }
    if (request.type === 'set include style') {
        core.setIncludeStyle(request);
    }
    if (request.type === 'is busy?') {
        sendResponse({isBusy: core.isBusy()});
    }
    if (request.type === 'save-page' || request.type === 'save-selection' ||
        request.type === 'add-page' || request.type === 'add-selection') {
        executeCommand({type: request.type});
    }
    if (request.type === 'done') {
        core.removeWarn();
    }
    return true;
}