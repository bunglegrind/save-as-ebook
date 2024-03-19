/*jslint browser, unordered*/
/*global chrome, console*/
import pq from ".libs/parseq-extended";
import adapter from "./browser-adapter.js";

function warning(timeout) {
    let started = false;
    let cancel;

    function set() {
        if (!started) {
            started = true;
            insertTag();
            cancel = setTimeout(remove, timeout);
        }
    }

    function isVisible() {
        return started;
    }

    function remove() {
        clearTimeout(cancel);
        cancel = undefined;
        started = false;

        clearTag();
    }

    function insertTag() {
        pq.sequence([
            adapter.setBadgeBackgroundColor({color: "red"}),
            adapter.setBadgeText({text: "Busy"})
        ])(function (value, reason) {
            if (value === undefined) {
                console.dir(reason);
            }
        });
    }

    function clearTag() {
        pq.sequence([
            adapter.setBadgeText({text: ""})
        ])(function (value, reason) {
            if (value === undefined) {
                console.dir(reason);
            }
            const popups = adapter.getViews({type: "popup"});

            if (popups.length > 0) {
                popups[0].close();
            }
        });
    }

    return Object.freeze({
        set,
        isVisible,
        remove
    });
}

export default Object.freeze(warning);