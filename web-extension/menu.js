import adapter from "./browser-adapter.js";
import parseq from "./libs/parseq-extended.js";

const camelize = s => s.replace(/-./g, x => x[1].toUpperCase());

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

function menuActions(value, reason) {
    if (value === undefined) {
        return console.log(reason);
    }
    const {executeCommand, core} = value;

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
				R.filter((x) => adapter.commands.includes(x.name)),
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
    adapter.commands.slice(0, 2).map(makeButton).join("\n")
    +  "<hr />"
    + adapter.commands.slice(2).map(makeButton).join("\n")
);

// create menu labels
document.getElementById('menuTitle').innerHTML = adapter.local_text('extName');
document.getElementById('includeStyle').innerHTML = adapter.local_text('includeStyle');
document.getElementById('editStyles').innerHTML = adapter.local_text('editStyles');
//adapter.commands.forEach(function (x) {
//    document.querySelector(`button#${cmd} label`).innerHTML = adapter.local_text(cmd);
//});

document.querySelector("button#save-page span").innerHTML = adapter.local_text('savePage');
document.querySelector("button#save-selection span").innerHTML = adapter.local_text('saveSelection');
document.querySelector("button#add-page span").innerHTML = adapter.local_text('pageChapter');
document.querySelector("button#add-selection span").innerHTML = adapter.local_text('selectionChapter');
document.getElementById('editChapters').innerHTML = adapter.local_text('editChapters');
document.getElementById('waitMessage').innerHTML = adapter.local_text('waitMessage');

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
                parseq.wrap_requestor(adapter.insertCss(tabId))({file: "/cssEditor.css"}),
                parseq.wrap_requestor(adapter.executeScript(tabId))({file: "/cssEditor.js"})
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
                parseq.wrap_requestor(adapter.insertCss(tabId), {file: "/chapterEditor.css"}),
                parseq.wrap_requestor(adapter.executeScript(tabId), {file: "./chapterEditor.js"})
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

    adapter.commands.forEach(function (cmd) {
	document.getElementById(cmd).onclick = function () {
	    executeCommand(cmd);
	    window.close();
	}
    });
}

adapter.get_background_page_requestor(menuActions);
