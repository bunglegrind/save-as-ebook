import defaultStyles from "./defaultStyles.js";
import warning from "./warning.js";
import {curry} from "./libs/ramda/index.js";

const getFromStorage = curry(
    function getFromStorageUncarried(key, defaultValue, callback) {
        return chrome.storage.local.get(
            'styles',
            function (data) {
                const toR = Object.create(null);
                toR[key] = data?.styles ?? defaultValue;
                callback(toR);
            }
        );
    }
);

//WARNING: the callback is missing from everywhere in the code!
const setStorage = curry(function setFromStorageUncarried(key, req) {
    const obj = Object.create(null);
    obj[key] = req.key;
    return chrome.storage.local.set(obj);
});

const warn = warning(20000);

const getStyles = getFromStorage("styles", defaultStyles);
const getIncludeStyle = getFromStorage("includeStyle", false);

const setCurrentStyle = setStorage("currentStyle");
const setIncludeStyle = setStorage("includeStyle");


function clearBook() {
    chrome.storage.local.remove('allPages');
    chrome.storage.local.remove('title');
}

export default Object.freeze({
    clearBook,
    isBusy: warn.isVisible,
    setWarn: warn.set,
    getStyles,
    setCurrentStyle,
    getIncludeStyle,
    setIncludeStyle,
    removeWarn: warn.remove
});