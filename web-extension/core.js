import defaultStyles from "./defaultStyles.js";
import warning from "./warning.js";
import parseq from "./libs/parseq-extended.js";

import adapter from "./browser-adapter.js";

const {
        getTabs,
        fromStorage,
        toStorage,
        removeFromStorage
} = adapter;
const warn = warning(20000);

const getStyles = fromStorage("styles", defaultStyles);
const getIncludeStyle = fromStorage("includeStyle", false);
const getBook = fromStorage("allPages", []);
const getTitle = fromStorage("title", "eBook");
const getCurrentStyle = fromStorage("currentStyle", 0);

const setCurrentStyle = toStorage("currentStyle");
const setIncludeStyle = toStorage("includeStyle");
const setBook = toStorage("allPages");
const setTitle = toStorage("title");
const setStyles = toStorage("styles");

const clearBook = parseq.parallel([
    removeFromStorage("allPages"),
    removeFromStorage("title")
]);


function savePage() {//TODO: action and tabId may be a closure for the following requestors


    let tabId;

    parseq.sequence([
        parseq.parallel([
            getTabs,
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
        return console.log(`savePage: ${value}`);
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

        adapter.insertCss(tabId)(
            () => callback(value),
            {code: currentStyle.style}
        );

    }

    function startJob(callback, value) {
        const includeStyle = value[1];
        const appliedStyles = value.appliedStyles;
        const justAddToBuffer = false;
        const type = "extract-page";

        return adapter.sendMessage();

        adapter.sendMessage({
                type,
                 includeStyle,
                 appliedStyles
            })(callback, tabId);
    }

    function generateOutcome(callback, response) {
        let message;

        if (response.content.trim() === "") {
            warn.remove();
            message = {"alert": "Cannot generate the eBook from an empty selection!"};
        } else {
            message = {"shortcut": "build-ebook", response: [response]};
        }
        return adapter.sendMessage(message)(callback, tabId);
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
