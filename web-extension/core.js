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
    return function sendMessageRequestor(callback, message) {
        return chrome.tabs.sendMessage(tabId, message, function (response) {
            if (response === undefined) {
                return callback(undefined, chrome.runtime.lastError);
            }
            return callback(response);
        });
    }
}


const getFromStorage = curry(
    function getFromStorageUncarried(key, defaultValue, callback) {
        chrome.storage.local.get(
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
const setStorage = curry(function setFromStorageUncarried(key, req, callback) {
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
const getIncludeStyleRequestor = (callback, ignore) => getIncludeStyle(callback);
const getStylesRequestor = (callback, ignore) => getStyles(callback);
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

function savePage() {//TODO: action and tabId may be a closure for the following requestors
    clearBook();//WARNING Deletes the book

    let tabId;

    parseq.sequence([
        parseq.parallel([
            tabQuery,
            getIncludeStyleRequestor,
            getStylesRequestor//We may optimize checking if custom styles are needed before asking all the styles
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
        tabId = tab[0].id;
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

        return sendMessage(tabId)(
            callback,
            {
                type: action,
                includeStyle: includeStyle,
                appliedStyles: appliedStyles,
            });

    }

    function generateOutcome(callback, response) {
        let mess;

        if (response.content.trim() === "") {
            warn.remove();
            mess = {"alert": "Cannot generate the eBook from an empty selection!"};
        } else {
            mess = {"shortcut": "build-ebook", response: [response]};
        }
        return sendMessage(tabId)(callback, mess);
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
