import defaultStyles from "./defaultStyles.js";
import warning from "./warning.js";
import {curry} from "./libs/ramda/index.js";
import parseq from "./libs/parseq.js";

function tabQuery(callback, props) {
    return chrome.tabs.query(
        props,
        callback
    );
}

function sendMessage(tabId) {
    return function sendMessageRequestor(callback, props) {
        return chrome.tabs.sendMessage(tabId, props, function (response) {
            if (response === undefined) {
                return callback(undefined, chrome.runtime.lastError);
            }
            return callback(response);
        });
    }
}



const getFromStorage = curry(
    function getFromStorageUncarried(key, defaultValue, callback, ignore) {
        return chrome.storage.local.get(
            key,
            function (data) {
                //Not clear in the docs...
                //https://developer.chrome.com/docs/extensions/reference/storage/
                if (data === undefined) {
                    return callback(undefined, chrome.runtime.lastError);
                }
                const toR = Object.create(null);
                toR[key] = data?.styles ?? defaultValue;
                callback(toR);
            }
        );
    }
);

//WARNING: the callback is missing from everywhere in the code!
const setStorage = curry(function setFromStorageUncarried(key, req, callback, ignore) {
    const obj = Object.create(null);
    obj[key] = req.key;
    if (typeof callback === "function") {
        return chrome.storage.local.set(obj, callback);
    }
    return chrome.storage.local.set(obj);
});

const warn = warning(20000);

const getStyles = getFromStorage("styles", defaultStyles);
const getIncludeStyle = getFromStorage("includeStyle", false);
const getBook = getFromStorage("allPages", []);
const getTitle = getFromStorage("title", "eBook");
const getCurrentStyle = getFromStorage("currentStyle", 0);

const setCurrentStyle = setStorage("currentStyle");
const setIncludeStyle = setStorage("includeStyle");
const setBook = setStorage("allPages");
const setTitle = setStorage("title");
const setStyles = setStorage("styles");


function clearBook() {
    chrome.storage.local.remove('allPages');
    chrome.storage.local.remove('title');
}

function savePage() {//TODO: action may be a closure for the following requestors
    core.clearBook();//WARNING Deletes the book

    parseq.sequence([
        parseq.parallel([
            tabQuery,
            getIncludeStyle,
            getStyles//We may optimize checking if custom styles are needed before asking all the styles
        ]),
        prepareStyles,
        applyAction
    ])(function (value, reason) {
        if (value === undefined) {
            return console.log(reason);
        }
        return console.log(value);
    }, {
        currentWindow: true,
        active: true
    });
}

function prepareStyles(callback, value) {
    const [tab, includeStyle, {styles}] = value;
    const appliedStyles = [];

    value.appliedStyles = appliedStyles;

    if (!includeStyle) {
        return callback(value);
    }
//Is the actual site included in the custom CSS? TODO: Extract the function
    const currentUrl = tab[0].url.replace(
        /(http[s]?:\/\/|www\.)/i,
        ''
    ).toLowerCase();

    //We can write also as filter + map
    const allMatchingStyles = styles.reduce(function (acc, style, i) {
        const styleUrlRegex = new RegExp(style.url, 'i');

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
        return callback(value);
    }

    const currentStyle = styles[selStyle.index];

    if (!currentStyle || !currentStyle.style) {
        return callback(value);
    }
    appliedStyles.push(currentStyle);

    chrome.tabs.insertCSS(
        tab[0].id,
        {code: currentStyle.style},
        () => callback(value)
    );

}

function applyAction(callback, {tab, appliedStyles, includeStyle}) {
    const justAddToBuffer = false;
    const action = "extract-page";

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
            chrome.tabs.sendMessage(tab[0].id, {'shortcut': 'build-ebook', response: [response]});
        } else {
            core.getBook(function (data) {
                data.allPages.push(response);
                core.setBook({'allPages': data.allPages}, function () {
                    core.removeWarn();
                    chrome.tabs.sendMessage(
                        tab[0].id,
                        {'alert': 'Page or selection added as chapter!'}
                    );
                });
            })
        }
    });
}

export default Object.freeze({
    clearBook,
    isBusy: warn.isVisible,
    setWarn: warn.set,
    getStyles,
    getCurrentStyle,
    getBook,
    setBook,
    getTitle,
    setCurrentStyle,
    getIncludeStyle,
    setIncludeStyle,
    setTitle,
    setStyles,
    savePage,
    addPage,
    saveSelection,
    addSelection,
    removeWarn: warn.remove
});