import adapter from "./browser-adapter.js";
import parseq from "./libs/parseq-extended.js";

const commands = Object.keys(chrome.runtime.getManifest().commands);

const camelize = s => s.replace(/-./g, x=>x[1].toUpperCase());

function factory(requestor, value) {
    return function (callback) {
        return requestor(callback, value);
    }
}

function dispatch(type, justAddToBuffer) {
    console.debug("dispatch: " + type);
    document.getElementById('busy').style.display = 'block';
    
    if (!core.isBusy()) {
		core[type](justAddToBuffer,  )
    }

    adapter.sendRuntimeMessage(
		function (value, reason) {
			document.getElementById('busy').style.display = 'none';
		},
		{type, justAddToBuffer}
	);
}

function menuActions({executeCommand, core}) {
    parseq.parallel([
		parseq.sequence([
			parseq.requestorize(R.pipe(
				core.isBusy,
				R.tap(
					(x) => document.getElementById("busy").style.display = (
						x
						? "block"
						: "none"
					)
				),
			))
		]),
		parseq.sequence([
			core.getStyles,
			parseq.requestorize(R.prop("styles")),
			createStyleList,
		]),
		parseq.sequence([
			core.getIncludeStyle,
			parseq.requestorize(R.pipe(
				R.prop("includeStyle"),
				R.tap((x) => document.getElementById("includeStyleCheck").checked = x),
			))
		]),
		// get all shortcuts and display them in the menuTitle
		parseq.sequence([
			adapter.getAllCommands,
			parseq.requestorize(R.pipe(
				R.filter((x) => commands.includes(x.name)),
				R.map(R.props(["name", "shortcut"])),
				R.tap(R.forEach(
					(x) => document.getElementById(x[0] + "-shortcut").textContent = x[1]
				))
			))
		])
    ])
(function (value, reason) {
    if (value === undefined) {
        return console.log(`Error - drawing menu: ${reason}`);
    }
});

function createStyleList(callback, styles) {
    if (!styles || styles.length === 0) {
        return callback("success");
    }

    let allMatchingStyles = styles.map(function (style, i) {
        return {
            index: i,
            length: style.url.length,
            regexp: new RegExp(style.url, "i")
        };
    });

    parseq.sequence([
        adapter.getTabs,
        parseq.requestorize(R.head),
        function (callback, tab) {
            const currentUrl = tab.url.replace(/(http[s]?:\/\/|www\.)/i, '').toLowerCase();
            // if multiple URL regexes match, select the longest one
            allMatchingStyles = allMatchingStyles.filter((style) => style.regexp && style.regexp.test(currentUrl));

            const index = R.pipe(
                R.sort((a, b) => b.length - a.length),
                R.head,
                R.prop("index")
            )(allMatchingStyles);

            if (index !== undefined) {
                return adapter.sendRuntimeMessage(callback, {
                    type: "set current style",
                    currentStyle: styles[index]
                });
            }

            return callback("success");
        }
    ])(callback, {"active": true});
}
//create menu buttons
document.getElementById("buttons").innerHTML = (
    commands.slice(0, 2).map(makeButton).join("\n")
    +  "<hr />"
    + commands.slice(2).map(makeButton).join("\n")
);

// create menu labels
document.getElementById('menuTitle').innerHTML = chrome.i18n.getMessage('extName');
document.getElementById('includeStyle').innerHTML = chrome.i18n.getMessage('includeStyle');
document.getElementById('editStyles').innerHTML = chrome.i18n.getMessage('editStyles');
//commands.forEach(function (x) {
//    document.querySelector(`button#${cmd} label`).innerHTML = chrome.i18n.getMessage(cmd);
//});

document.querySelector("button#save-page span").innerHTML = chrome.i18n.getMessage('savePage');
document.querySelector("button#save-selection span").innerHTML = chrome.i18n.getMessage('saveSelection');
document.querySelector("button#add-page span").innerHTML = chrome.i18n.getMessage('pageChapter');
document.querySelector("button#add-selection span").innerHTML = chrome.i18n.getMessage('selectionChapter');
document.getElementById('editChapters').innerHTML = chrome.i18n.getMessage('editChapters');
document.getElementById('waitMessage').innerHTML = chrome.i18n.getMessage('waitMessage');

document.getElementById('includeStyleCheck').onclick = function () {
    let includeStyleCheck = document.getElementById('includeStyleCheck');
    adapter.sendRuntimeMessage(
		function callback(value, reason) {
            if (value === undefined) {
                return console.log("reason: menu-set include style " + reason);
            }
            return console.log("value: menu-set include style " + value);
        },
        {
            type: "set include style",
            includeStyle: includeStyleCheck.checked
        }
	);
}

const firstTabId = parseq.requestorize(R.pipe(R.head, R.prop("id")));

document.getElementById("editStyles").onclick = function () {
    if (document.getElementById('cssEditor-Modal')) {
        return;
    }
//Build the style editor...
    parseq.sequence([
        adapter.getTabs,
        firstTabId,
        function injectScripts(callback, tabId) {
            return parseq.parallel([
                factory(adapter.insertCss(tabId), {file: "/cssEditor.css"}),
                factory(adapter.executeScript(tabId), {file: "/cssEditor.js"})
            ])(callback, tabId);
        },
        function (callback, value) {
            window.close();//closes menu
            return callback(value);
        }
    ])(function (value, reason) {
        if (value === undefined) {
            return console.log(`Error - drawing style editor: ${reason}`);
        }
    }, {
        currentWindow: true,
        active: true
    });
}

document.getElementById("editChapters").onclick = function () {
	if (document.getElementById('chapterEditor-Modal')) {
	    return;
	}
	parseq.sequence([
	    adapter.getTabs,
	    firstTabId,
	    function injectScripts(callback, tabId) {
		return parseq.parallel([
		    factory(adapter.insertCss(tabId), {file: "/chapterEditor.css"}),
		    factory(adapter.executeScript(tabId), {file: "./chapterEditor.js"})
		])(callback, tabId);
	    },
	    function (callback, value) {
		window.close();//closes menu
		return callback(value);
	    }
	])(function (value, reason) {
	    if (value === undefined) {
		return console.log(`Error - drawing book editor: ${reason}`);
	    }
	}, {
	    currentWindow: true,
	    active: true
	});

};

function makeButton(cmd) {
	return `<button id="${cmd}" type="button" name="button">
	    <span></span>
	    <div id="${cmd}-shortcut" class="shortcut"></div>
	    </button>`;
    }

    commands.forEach(function (cmd) {
	document.getElementById(cmd).onclick = function () {
	    executeCommand(cmd);
	    window.close();
	}
    });
}

chrome.runtime.getBackgroundPage(menuActions);
