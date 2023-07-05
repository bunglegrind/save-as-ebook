import(local("./libs/parseq-extended.js")).then(function (m) {
    const pq = m["default"];
    const select = (id) => document.querySelector(`#cssEditor-${id}`);
    const setDisplay = R.curry(function (value, id) {
        document.querySelector(
            `#cssEditor-${id}`
        ).style.display = value;
    });
    const displayNone = setDisplay("none");
    const displayBlock = setDisplay("block");
    const displayInlineBlock = setDisplay("inline-block");

    function disableCss() {
        [...document.styleSheets].forEach(function (css) {
            css.disabled = true;
        });
    }

    function resetFields() {
        select("styleName").value = "";
        select("matchUrl").value = "";
        select("styleContent").value = "";
    }

    pq.parallel_object({
        htmlTemplate: pq.dynamic_default_import(
            local("./cssEditor/template.js")
        ),
        adapter: pq.dynamic_default_import(local("./browser-adapter.js")),
        R: pq.dynamic_import(local("./node_modules/ramda/es/index.js"))
    })(function (value, reason) {
        if (value === undefined) {
            console.log("Error in cssEditor page");
            return console.log(reason);
        }
        const {htmlTemplate, adapter, R, dom} = value;

        let allStyles = [];
        let currentStyle;
        let currentStyleIndex = -1;
        let existingStyles;

        function createStyleList(allStylesTmp = []) {
            allStyles = allStyles.concat(allStylesTmp);

            existingStyle.replaceChildren();

            styles = dom.option()(translate("selectExistingCSS"));

            allStyles.forEach(function (style, i) {
                const listItem = dom.option({
                    id: `option_i`,
                    className: "cssEditor-chapter-item",

                });
                const listItem = document.createElement("option");
                listItem.id = "option_" + i;
                listItem.className = "cssEditor-chapter-item";
                listItem.value = "option_" + i;
                listItem.innerText = style.title;
                if (style.title === currentStyle?.title) {
                    listItem.selected = 'selected';
                }
                existingStyles.appendChild(listItem);
            });
        }

        pq.sequence([
            pq.requestorize(R.tap(function () {
                const {html} = htmlTemplate(translate);

                disableCss();
                select("Modal")?.remove();

                const body = document.querySelector("body");
                body.append(html);
                const modal = select("Modal");
                existingStyles = select("selectStyle");

                function closeModal() {
                    Array.from(document.styleSheets).forEach(function (item) {
                        item.disabled = false;
                    });
                    modal.remove();
                }
                select("close").onclick = closeModal;

                function editCurrentStyle() {
                    if (!currentStyle) {
                        return;
                    }

                    displayBlock("styleEditor");
                    displayInlineBlock("removeStyle");
                    displayInlineBlock("saveStyle");

                    select("styleName").value = currentStyle.title;
                    select("matchUrl").value = currentStyle.url;
                    select("styleContent").value = currentStyle.style;

                }
                select("selectStyle").onchange = function (event) {
                    if (existingStyles.selectedIndex === 0) {
                        currentStyle = undefined;
                        currentStyleIndex = -1;
                        displayNone("styleEditor");
                        displayNone("removeStyle");
                        displayNone("saveStyle");
                    } else {
                        currentStyleIndex = existingStyles.selectedIndex - 1;
                        currentStyle = allStyles[currentStyleIndex];
                        editCurrentStyle();
                    }
                };

                function createNewStyle() {
                    currentStyle = undefined;
                    currentStyleIndex = -1;
                    resetFields();
                    displayBlock("styleEditor");
                    displayInlineBlock("saveStyle");
                    displayNone("removeStyle");
                    createStyleList();
                }

                select("createNewStyle").onclick = createNewStyle;
                select("exportCustomStyles").onclick = function () {
                    adapter.exportStyles(function (value, reason) {
                        if (value === undefined) {
                            return alert(reason);
                        }
                        alert(value);//TODO add a message
                    });
                };
                function removeStyle() {
                    if (confirm(translate('confirmDeleteStyle')) == true) {
                        allStyles.splice(currentStyleIndex, 1);
                        adapter.saveStyles(allStyles)(function (value, reason) {
                            if (value === undefined) {
                                return console.log(reason);
                            }
                            displayNone("saveStyle");
                            displayNone("removeStyle");
                            displayNone("styleEditor");
                            createStyleList();
                        });
                    }
                }
                select("importCustomStyles").onchange = importCustomStyles;
                select("removeStyle").onclick = removeStyle;
                select("saveStyle").onclick = saveStyle;
                window.onclick = function (event) {
                    if (event.target === modal) {
                        closeModal();
                    }
                };

                document.onkeydown = function (evt) {
                    evt = evt || window.event;
                    if (evt.keyCode == 27) {
                        closeModal();
                    }
                };

                function validateCustomStyles(customStyles) {
                    if (!customStyles.styles) {
                        return false;
                    }
                    return customStyles.styles.every((style) => (
                        checkRegex(style.url)
                        && typeof style.title === "string" && style.title.length
                        && typeof style.style === "string" && style.style.length
                    ));
                }

                function importCustomStyles(event) {
                    const reader = new FileReader();
                    reader.readAsText(event.target.files[0]);
                    reader.onload = function () {
                        let importedStyles;
                        try {
                            importedStyles = JSON.parse(reader.result);
                        } catch (e) {
                            alert(translate('invalidCustomStyleJson'));
                            return;
                        }
                        if (validateCustomStyles(importedStyles)) {
                            adapter.importStyles(importedStyles)(
                                function (value, reason) {
                                    if (value === undefined) {
                                        console.log(reason.evidence);
                                        return console.log(reason);
                                    }
                                    alert(translate('stylesImported'));
                                    closeModal();
                                });
                        } else {
                            alert(translate('invalidCustomStyleJson'));
                        }
                        return;
                    };

                    reader.onerror = function () {
                        alert(translate('errorOnReadingFile'));
                        return;
                    };
                }

                modal.style.display = "block";

                function saveStyle() {
                    const isRegexValid = checkRegex(select("matchUrl").value);
                    if (!isRegexValid) {
                        alert(translate("invalidRegex"));
                        return;
                    }
                    const tmpValue = {
                        title: select("styleName").value,
                        url: select("matchUrl").value,
                        style: select("styleContent").value
                    }
                    if (currentStyle === null) {
                        allStyles.push(tmpValue);
                        currentStyle = tmpValue;
                        currentStyleIndex = allStyles.length - 1;
                    } else {
                        currentStyle = tmpValue;
                        allStyles[currentStyleIndex] = currentStyle;
                    }
                    adapter.saveStyles({req: {styles: allStyles}})(function (value, reason) {
                        if (value === undefined) {
                            return console.log(reason);
                        }
                        createStyleList();
                        displayInlineBlock("removeStyle");
                        alert(translate("styleSaved"));
                    });
                }

                function checkRegex(regexContent) {
                    if (typeof regexContent !== "string") {
                        return false;
                    }
                    try {
                        new RegExp(regexContent);
                    } catch (e) {
                        return false;
                    }
                    return true;
                }
            })),
            adapter.retrieveStyles,
            pq.requestorize(R.tap(createStyleList))
        ])(function (value, reason) {
            if (value === undefined) {
                console.log(reason?.evidence);
                return console.log(reason);
            }
        }, true);
    });
});
