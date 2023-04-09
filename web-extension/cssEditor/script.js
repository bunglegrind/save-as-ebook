import(local("./libs/parseq-extended.js")).then(function (m) {
    const pq = m["default"];

    pq.parallel_object({
        htmlTemplate: pq.default_import(local("./cssEditor/template.js")),
        adapter: pq.default_import(local("./browser-adapter.js")),
        // r: pq.default_import(local("./node_modules/ramda/es/index.js"))
    })(function (value, reason) {
        if (value === undefined) {
            console.log("Error in cssEditor page");
            return console.log(reason);
        }
        const {htmlTemplate, adapter} = value;
        const html = htmlTemplate(translate);


        [...document.styleSheets].forEach(function (css) {
            css.disabled = true;
        });

        function select(id) {
            return document.querySelector(`#cssEditor-${id}`);
        }

        select("Modal")?.remove();

        let allStyles = [];
            let currentStyle;
        let currentStyleIndex = -1;

        showEditor();

        function showEditor() {
            // const setDisplay = r.curry(function (value, id) {
            //     document.querySelector(
            //         `#css-Editor-${id}`
            //     ).style.display = value;
            // });
            
            const setDisplay = function (value) {
                return function (id) {
                    select(id).style.display = value;
                };
            };
            const displayNone = setDisplay("none");
            const displayBlock = setDisplay("block");
            const displayInlineBlock = setDisplay("inline-block");

            const body = document.querySelector("body");
            body.innerHTML += html;
            const modal = select("Modal");
            const existingStyles = select("selectStyle");

            select("close").onclick = closeModal;
            select("selectStyle").onchange = function (event) {
                if (existingStyles.selectedIndex === 0) {
                    currentStyle = undefined;
                    currentStyleIndex = -1;
                    displayNone("styleEditor");
                    displayNone("removeStyle");
                    displayNone("saveStyle");
                    return;
                }
                currentStyleIndex = existingStyles.selectedIndex - 1;
                currentStyle = allStyles[currentStyleIndex];
                editCurrentStyle();
            };

            select("createNewStyle").onclick = createNewStyle;
            select("exportCustomStyles").onclick = function () {
                adapter.exportStyles(function (value, reason) {
                    if (value === undefined) {
                        return alert(reason);
                    }
                    alert(value);//TODO add a message
                });
            };
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

            modal.style.display = "block";
            adapter.getStyles(createStyleList);

            function createNewStyle() {
                currentStyle = undefined;
                currentStyleIndex = -1;
                resetFields();
                displayBlock("styleEditor");
                displayInlineBlock("saveStyle");
                displayNone("removeStyle");
                createStyleList();
            }

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
                        adapter.importStyles(importedStyles)(function (value, reason) {
                            alert(
                                value !== undefined
                                ? translate('stylesImported')
                                : reason
                            );
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


            function createStyleList(allStylesTmp = []) {
                allStyles = allStyles.concat(allStylesTmp);

                existingStyles.innerHTML = (
                `<option>
                    ${translate("selectExistingCSS")}
                 </option>`
                 );
                allStyles.forEach(function (style, i) {
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

            function editCurrentStyle() {
                if (!currentStyle) {
                    return;
                }

                showStyleEditor();
                showRemoveStyle();
                showSaveStyle();

                select("styleName").value = currentStyle.title;
                select("matchUrl").value = currentStyle.url;
                select("styleContent").value = currentStyle.style;

            }

            function resetFields() {
                select("styleName").value = "";
                select("matchUrl").value = "";
                select("styleContent").value = "";
            }

            function hideStyleEditor() {
                select("styleEditor").style.display = "none";
            }

            function showStyleEditor() {
                select("styleEditor").style.display = "block";
            }

            function showRemoveStyle() {
                select("removeStyle").style.display = "inline-block";
            }

            function hideRemoveStyle() {
                select("removeStyle").style.display = "none";
            }

            function showSaveStyle() {
                select("saveStyle").style.display = "inline-block";
            }

            function hideSaveStyle() {
                select("saveStyle").style.display = "none";
            }

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
                adapter.setStyles(allStyles)(function (value, reason) {
                    if (value === undefined) {
                        return console.log(reason);
                    }
                    createStyleList();
                    showRemoveStyle();
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

            function removeStyle() {
                if (confirm(translate('confirmDeleteStyle')) == true) {
                    allStyles.splice(currentStyleIndex, 1);
                    adapter.setStyles(allStyles);
                    adapter.setStyles(allStyles)(function (value, reason) {
                        if (value === undefined) {
                            return console.log(reason);
                        }
                        hideSaveStyle();
                        hideRemoveStyle();
                        hideStyleEditor();
                        createStyleList();
                    });
                }
            }

            function closeModal() {
                Array.from(document.styleSheets).forEach(function (item) {
                    item.disabled = false;
                });
                modal.remove();
            }
        }
    });
});
