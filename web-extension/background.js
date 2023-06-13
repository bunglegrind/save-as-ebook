import core from "./core.js";//TODO maybe it's just a workaround
import parseq from "./libs/parseq-extended.js";
import adapter from "./browser-adapter.js";
import * as R from "./node_modules/ramda/es/index.js";

const currentTab = {
    currentWindow: true,
    active: true
};
//Listener for keyboard shortcuts
adapter.listenForCommands(executeCommand);

//Listener for incoming messages
adapter.listenForMessages(_execRequest);

//convert shortcuts to messages
function executeCommand(command) {
    const action = commandToAction(command);

    parseq.sequence([
        adapter.getTabs,
        parseq.requestorize(R.pipe(R.head, R.pick(["id", "url"]), R.objOf("tab"))),
        (
            core.isBusy()
            ? adapter.sendMessage({
                    message: {
                        "alert": (
                            "Work in progress! Please wait until the current "
                            + "eBook is generated!"
                        )
                    }
                })
            : parseq.sequence([
//WARNING: when saving page, the book buffer is reset
                // if (!insertInBook) {
                //     _execRequest({type: "clear book"});
                // }
                parseq.requestorize(R.tap(core.setWarn)),
                parseq.parallel_merge({
                    includeStyle: core.getIncludeStyle
                }),
                parseq.when(
                    ({includeStyle}) => includeStyle,
                    parseq.sequence([
                        parseq.parallel_merge({
                            css: parseq.sequence([
                                parseq.parallel_merge({
                                    styles: core.getStyles,
                                }),
                                parseq.requestorize(extractCustomStyle),
                                adapter.insertCss(function ({tabId, style}) {
                                    return {
                                        tabId,
                                        message: {code: style}
                                    };
                                })
                            ])
                        }),
                        parseq.requestorize(R.tap(console.log)),
                        parseq.parallel_merge({
                            message: parseq.sequence([
                                adapter.sendMessage(function ({tabId, includeStyle}) {
                                    return {
                                        tabId,
                                        message: {type: action, includeStyle}
                                    }
                                }),
                                processResponse
                            ])
                        }),
                        adapter.sendMessage(),
                        parseq.requestorize(R.tap(core.removeWarn))
                    ])
                )
            ])
        )
    ])(my_callback, currentTab);


    function my_callback(value, reason) {
        if (value === undefined) {
            return console.log(reason);
        }
    }

    if (command === "save-page") {
        core.savePage();
        // dispatch("extract-page", false);
    } else if (command === "save-selection") {
        dispatch("extract-selection", false);
    } else if (command === "add-page") {
        dispatch("extract-page", true);
    } else if (command === "add-selection") {
        dispatch("extract-selection", true);
    }
}

function commandToAction(command) {
    if (command === "save-page") {
        return {
            subject: "page",
            inBuffer: false
        };
    }
    if (command === "add-page") {
        return {
            subject: "page",
            inBuffer: true
        };
    }
    if (command === "save-selection") {
        return {
            subject: "selection",
            inBuffer: false
        };
    }
    if (command === "add-selection") {
        return {
            subject: "selection",
            inBuffer: true
        };
    }
    throw new Error("Command unrecognized");
}

function extractCustomStyle({tab, styles}) {
    const currentUrl = tab.url.replace(/(http[s]?:\/\/|www\.)/i, "").toLowerCase();

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
    return {
        tabId: tab.id,
        style: (
            allMatchingStyles.length > 0
            ? styles[allMatchingStyles[0].index].style
            : ""
        )
    };
}


function processResponse(callback, response) {
    if (!response) {
        callback({"alert": "Save as eBook does not work on this web site!"});
    } else if (response.content.trim() === "") {
        callback(
            justAddToBuffer
            ? {"alert": "Cannot add an empty selection as chapter!"}
            : {"alert": "Cannot generate the eBook from an empty selection!"}
        );
    } else if (!justAddToBuffer) {
        callback({"shortcut": "build-ebook", response: [response]});
    } else {
        parseq.sequence([
            core.getBook,
            parseq.requestorize(function (data) {
                data.allPages.push(response);
                return {allPages: data.allPages};
            }),
            core.setBook,
            parseq.constant({"alert": "Page or selection added as chapter!"})
        ])(callback);
    }
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
    if ([
        "save-page",
        "save-selection",
        "add-page",
        "add-selection"
    ].includes(request.type)) {
        executeCommand(request.type);
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
            }, sendResponse);
        });

    }
    if (request.type === 'ImportCustomStyles') {
        chrome.storage.local.set(
            {'styles': request.customStyles.styles},
            () => sendResponse(true)
        );
    }
    if (request.type === 'downloadEBook') {
        try {
//Chromium does not support Blob as message content
            chrome.downloads.download(
                {
                'saveAs': true,
                'url': URL.createObjectURL(
                    new Blob(
                        [Uint8Array.from(request.content)],
                        {type: request.mime}
                    ),
                    {type: request.mime}
                ),
//TODO listent downloads.onChanged
//https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/downloads/download
                'filename': request.filename.replace(/[<>"*|:]/g, "")

                },
                function (downloadId) {
                    console.log("done " + downloadId);
                    core.removeWarn();
                }
            );
        } catch (e) {
            sendResponse(e.message);
            core.removeWarn();
        }
    }
    return true;
}

window.core = core;
window.executeCommand = executeCommand;
