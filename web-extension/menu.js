    import adapter from "./browser-adapter.js";
    import pq from "./libs/parseq-extended.js";
    import * as R from "./node_modules/ramda/es/index.js";

    const camelize = (s) => s.replace(/-./g, x => x[1].toUpperCase());

    const prop = R.curry(function(key, obj) {
        if (obj[key] !== undefined) {
            return obj[key];
        }
        const reason = new Error(`${key} not found or undefined`);
        reason.evidence = obj;
        throw reason;
    });

    function dispatch(type, justAddToBuffer) {
        console.debug("dispatch: " + type);
        document.getElementById('busy').style.display = 'block';
        
        if (!core.isBusy()) {
            core[type](justAddToBuffer);
        }

        adapter.sendRuntimeMessage({type, justAddToBuffer})(
            function (value, reason) {
                document.getElementById('busy').style.display = 'none';
            }
        );
    }

    function menuActions(value, reason) {
        if (value === undefined) {
            return console.log(reason);
        }
        const {executeCommand, core} = value;

        pq.parallel([
            pq.sequence([
                pq.requestorize(R.pipe(
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
            pq.sequence([
                core.getStyles,
                createStyleList,
            ]),
            pq.sequence([
                core.getIncludeStyle,
                pq.requestorize(R.pipe(
                    R.tap((x) => document.getElementById("includeStyleCheck").checked = x),
                ))
            ]),
            // get all shortcuts and display them in the menuTitle
            pq.sequence([
                adapter.getAllCommands,
                pq.requestorize(R.pipe(
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
            console.log(reason.evidence);
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

        pq.sequence([
            adapter.getTabs,
            pq.requestorize(R.head),
            function (callback, tab) {
                const currentUrl = tab.url.replace(/(http[s]?:\/\/|www\.)/i, '').toLowerCase();
                // if multiple URL regexes match, select the longest one
                allMatchingStyles = allMatchingStyles.filter((style) => style.regexp && style.regexp.test(currentUrl));

                const index = R.pipe(
                    R.sort((a, b) => b.length - a.length),
                    R.head,
                    R.unless(R.isNil, prop("index"))
                )(allMatchingStyles);

                if (index !== undefined) {
                    return adapter.sendRuntimeMessage({
                        type: "set current style",
                        currentStyle: styles[index]
                    })(callback);
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
        adapter.sendRuntimeMessage({
                type: "set include style",
                includeStyle: includeStyleCheck.checked
            })(function callback(value, reason) {
                if (value === undefined) {
                    return console.log("reason: menu-set include style " + reason);
                }
                return console.log("value: menu-set include style " + JSON.stringify(value));
            });
    }

    const firstTabId = pq.requestorize(R.pipe(R.head, prop("id")));

    document.getElementById("editStyles").onclick = function () {
        if (document.getElementById('cssEditor-Modal')) {
            return;
        }
    //Build the style editor...
        pq.sequence([
            adapter.getTabs,
            firstTabId,
            function injectScripts(callback, tabId) {
                return pq.parallel([
                    pq.wrap_requestor(adapter.insertCss(tabId))(
                        {file: "/cssEditor.css"}
                    ),
                    pq.wrap_requestor(adapter.executeScript(tabId))(
                        {file: "/cssEditor.js"}
                    )
                ])(callback, tabId);
            },
            function (callback, value) {
                window.close();//closes menu
                callback(value);
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
        pq.sequence([
            adapter.getTabs,
            firstTabId,
            function injectScripts(callback, tabId) {
                return pq.parallel([
                    pq.wrap_requestor(adapter.insertCss(tabId), {file: "/chapterEditor.css"}),
                    pq.wrap_requestor(adapter.executeScript(tabId), {file: "./chapterEditor.js"})
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
