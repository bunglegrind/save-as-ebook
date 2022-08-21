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
                    "alert": (
                        "Work in progress! Please wait until the current " +
                        "eBook is generated!"
                    )
                },
                (r) => console.log(r)
            )
        )
    }

    core.setWarn();

    if (command.type === "save-page") {
        core.savePage();
        // dispatch("extract-page", false);
    } else if (command.type === "save-selection") {
        dispatch("extract-selection", false);
    } else if (command.type === "add-page") {
        dispatch("extract-page", true);
    } else if (command.type === "add-selection") {
        dispatch("extract-selection", true);
    }
}

function dispatch(action, insertInBook) {
    //WARNING: when saving page, the book buffer is reset
    if (!insertInBook) {
        _execRequest({type: "clear book"});
    }

    chrome.tabs.query({
        currentWindow: true,
        active: true
    }, (tab) => {

        core.getIncludeStyle(
            function (result) {
                prepareStyles(
                    tab,
                    result.includeStyle,
                    function (tmpAppliedStyles) {
                        applyAction(
                            tab,
                            action,
                            insertInBook,
                            isIncludeStyle,
                            tmpAppliedStyles,
                            () => alert("done")
                        )
                    }
                )
            }
        )
    });
}

function prepareStyles(tab, includeStyle, callback) {
    const appliedStyles = [];

    if (!includeStyle) {
        return callback(appliedStyles);
    }
    core.getStyles(
        function (data) {
            const styles = data.styles;
            const currentUrl = tab[0].url.replace(
                /(http[s]?:\/\/|www\.)/i,
                ""
            ).toLowerCase();

            //We can write also as filter + map
            const allMatchingStyles = styles.reduce(function (acc, style, i) {
                const styleUrlRegex = new RegExp(style.url, "i");

                if (styleUrlRegex && styleUrlRegex.test(currentUrl)) {
                    return acc.concat({
                        index: i,
                        length: style.url.length
                    });
                }
                return acc;
            }, []);

            allMatchingStyles.sort((a, b) => b.length - a.length);
            const selStyle = allMatchingStyles.length > 0 ? allMatchingStyles[0] : false;

            if (!selStyle) {
                return callback(appliedStyles);
            }

            const currentStyle = styles[selStyle.index];

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
        includeStyle,
        appliedStyles
    }, (response) => {
        if (!response) {
            core.removeWarn();
            return chrome.tabs.sendMessage(tab[0].id, {"alert": "Save as eBook does not work on this web site!"}, () => {
            });
        }

        if (response.content.trim() === "") {
            core.removeWarn();
            if (justAddToBuffer) {
                chrome.tabs.sendMessage(tab[0].id, {"alert": "Cannot add an empty selection as chapter!"}, () => {
                });
            } else {
                chrome.tabs.sendMessage(tab[0].id, {"alert": "Cannot generate the eBook from an empty selection!"}, () => {
                });
            }
            return;
        }
        if (!justAddToBuffer) {
            chrome.tabs.sendMessage(tab[0].id, {"shortcut": "build-ebook", response: [response]});
        } else {
            core.getBook(function (data) {
                data.allPages.push(response);
                core.setBook(function () {
                    core.removeWarn();
                    chrome.tabs.sendMessage(
                        tab[0].id,
                        {"alert": "Page or selection added as chapter!"}
                    );
                }, {"allPages": data.allPages});
            })
        }
    });
}

//MUST return true
//https://developer.chrome.com/docs/extensions/reference/runtime/#event-onMessage
function _execRequest(request, sender, sendResponse) {
    function callback(value, reason) {
        if (value === undefined) {
            return console.log("reason: " + request.type + " " + reason);
        }
        return console.log("value: " + request.type + " " + value);
    }


    if (request.type === "get") {
        core.getBook(sendResponse);
    }
    if (request.type === "set") {
        core.setBook(request);
    }
    if (request.type === "clear book") {
        core.clearBook(sendResponse);
    }
    if (request.type === "get title") {
        core.getTitle(sendResponse);
    }
    if (request.type === "set title") {
        core.setTitle(sendResponse, request);
    }
    if (request.type === "get styles") {
        core.getStyles(sendResponse);
    }
    if (request.type === "set styles") {
        core.setStyles(sendResponse, request);
    }
    if (request.type === "get current style") {
        core.getCurrentStyle(sendResponse);
    }
    if (request.type === "set current style") {
        core.setCurrentStyle(sendResponse, request);
    }
    if (request.type === "get include style") {
        core.getIncludeStyle(sendResponse);
    }
    if (request.type === "set include style") {
        core.setIncludeStyle(sendResponse, request);
    }
    if (request.type === "is busy?") {
        sendResponse({isBusy: core.isBusy()});
    }
    if (request.type === "save-page" || request.type === "save-selection" ||
        request.type === "add-page" || request.type === "add-selection") {
        executeCommand({type: request.type});
    }
    if (request.type === "done") {
        core.removeWarn();
    }
    if (request.type === 'ExportCustomStyles') {
        chrome.storage.local.get(null, function (data) {
            chrome.downloads.download({
                'saveAs': true,
                'url': URL.createObjectURL(
                    new Blob([JSON.stringify({styles: data.styles})], {
                        type: "application/json",
                    })
                ),
                'filename': 'customStyles.json'
            });
        });

    }
    if (request.type === 'ImportCustomStyles') {
        chrome.storage.local.set(
            {'styles': request.customStyles.styles},
            sendResponse
        );
    }
    if (request.type === 'downloadEBook') {
        chrome.downloads.download(
            {
            'saveAs': true,
            'url': URL.createObjectURL(
                request.content, {
                    type: "application/epub+zip",
                }),
            //TODO listent downloads.onChanged
            //https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/downloads/download
            'filename': request.filename.replace(/[<>"*|:]/g, "")

            },
            function (downloadId) {
                console.log("done " + downloadId);
                core.removeWarn();
            }
        );
    }
    return true;
}

window.core = core;
window.executeCommand = executeCommand;
