import defaultStyles from "./defaultStyles.js";
import warning from "./warning.js";
import parseq from "./libs/parseq.js";

function tabQuery(callback, props) {
    return chrome.tabs.query(
        props,
        callback
    );
}

function sendMessage(tabId) {
    return function sendMessageRequestor(callback, message) {
        return chrome.tabs.sendMessage(tabId, message, function (response) {
            if (chrome.runtime.lastError) {
                return callback(undefined, `sendMessage failed: tab - ${tabId} ${chrome.runtime.lastError}`);
            }
            return callback(response);
        });
    }
}


function getFromStorage(key, defaultValue) {
    return function getFromStorageRequestor(callback) {
        return chrome.storage.local.get(
            key,
            function (data) {
                //Not clear in the docs...
                //https://developer.chrome.com/docs/extensions/reference/storage/
                if (chrome.runtime.lastError) {
                    return callback(undefined, `getStorage failed: key - ${key} ${chrome.runtime.lastError}`);
                }
                const toR = Object.create(null);
                toR[key] = data[key] ?? defaultValue;
                callback(toR);
            }
        );
    }
}

//WARNING: the callback is missing from everywhere in the code!
function setStorage(key) {
    return function setStorageRequestor(callback, req) {
        const obj = Object.create(null);
        obj[key] = req[key];
        return chrome.storage.local.set(obj, function () {
            if (typeof callback === "function") {
                if (chrome.runtime.lastError) {
                    return callback(undefined, `setStorage failed: key - ${key} ${chrome.runtime.lastError}`);
                }
                return callback("success");
            }
        });
    }
}

function removeFromStorage(key) {
    return function removeFromStorageRequestor(callback) {
        return chrome.storage.local.remove(key, function () {
            if (chrome.runtime.lastError) {
                return callback(undefined, `removeFromStorage failed: key - ${key} ${chrome.runtime.lastError}`);
            }
            return callback("success");
        });
    }
}

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


const clearBook = parseq.parallel([
    removeFromStorage("allPages"),
    removeFromStorage("title")
]);


function savePage() {//TODO: action and tabId may be a closure for the following requestors


    let sendToTab;

    parseq.sequence([
        parseq.parallel([
            tabQuery,
            getIncludeStyle,
            getStyles,//We may optimize checking if custom styles are needed before asking all the styles
            clearBook//WARNING Deletes the book
        ]),
        prepareStyles,
        startJob,
        generateOutcome
    ])(function (value, reason) {
        if (value === undefined) {
            return console.log(reason);
        }
        return console.log(value);
    }, {
        currentWindow: true,
        active: true
    });


    function prepareStyles(callback, value) {
        const [tab, includeStyle, {styles}] = value;
        sendToTab = sendMessage(tab[0].id);
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
            tabId,
            {code: currentStyle.style},
            () => callback(value)
        );

    }

    function startJob(callback, value) {
        const includeStyle = value[1];
        const appliedStyles = value.appliedStyles;
        const justAddToBuffer = false;
        const action = "extract-page";

        return sendToTab(
            callback,
            {
                type: action,
                includeStyle: includeStyle,
                appliedStyles: appliedStyles,
            });

    }

    function generateOutcome(callback, response) {
        let message;

        if (response.content.trim() === "") {
            warn.remove();
            message = {"alert": "Cannot generate the eBook from an empty selection!"};
        } else {
            message = {"shortcut": "build-ebook", response: [response]};
        }
        return sendToTab(callback, message);
    }
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
    // addPage,
    // saveSelection,
    // addSelection,
    removeWarn: warn.remove
});
