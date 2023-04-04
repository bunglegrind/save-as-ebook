import(local("./libs/parseq-extended.js")).then(function (m) {
    const pq = m["default"];

    pq.parallel_object({
        htmlTemplate: pq.default_import(local("./cssEditor/template.js")),
        adapter: pq.default_import(local("./browser-adapter.js")),
    })(function (value, reason) {
        if (value === undefined) {
            return console.log(reason);
        }
        const {htmlTemplate, adapter} = value;
        const html = htmlTemplate(translate);


        [...document.styleSheets].forEach(function (css) {
            css.disabled = true;
        });

        document.querySelector("#cssEditor-Modal")?.remove();

        let allPagesRef = null;
        let allStyles = [];
        let currentStyle;
        let currentStyleIndex = -1;

        showEditor();

        function showEditor() {
            const body = document.querySelector("body");
            body.innerHTML += html;
            const modal = document.querySelector("#cssEditor-Modal");
            const modalContent = document.querySelector("#cssEditor-ModalContent");
            const existingStyles = document.querySelector("#cssEditor-selectStyle");

            ////////
            // Header

            document.querySelector("#cssEditor-close").onclick = closeModal;

            /////////////////////
            // Content List

            document.querySelector("#cssEditor-selectStyle").onchange = function (event) {
                if (existingStyles.selectedIndex === 0) {
                    currentStyle = undefined;
                    currentStyleIndex = -1;
                    hideStyleEditor();
                    hideRemoveStyle();
                    hideSaveStyle();
                    return;
                }
                currentStyleIndex = existingStyles.selectedIndex - 1;
                currentStyle = allStyles[currentStyleIndex];
                editCurrentStyle();
            };

            document.querySelector("#cssEditor-createNewStyle").onclick = createNewStyle;
            document.querySelector("#cssEditor-exportCustomStyles").onclick = exportCustomStyles;
            document.querySelector("#cssEditor-importCustomStyles").onchange = importCustomStyles;

            function createNewStyle() {
                currentStyle = undefined;
                currentStyleIndex = -1;
                resetFields();
                showStyleEditor();
                showSaveStyle();
                hideRemoveStyle();
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
                        importStyles(importedStyles, function () {
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

            document.querySelector("#cssEditor-removeStyle").onclick = removeStyle;
            document.querySelector("#cssEditor-saveStyle").onclick = saveStyle;

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

                document.getElementById("cssEditor-styleName").value = currentStyle.title;
                document.getElementById("cssEditor-matchUrl").value = currentStyle.url;
                document.getElementById("cssEditor-styleContent").value = currentStyle.style;

            }

            function resetFields() {
                document.getElementById("cssEditor-styleName").value = "";
                document.getElementById("cssEditor-matchUrl").value = "";
                document.getElementById("cssEditor-styleContent").value = "";
            }

            function hideStyleEditor() {
                document.getElementById("cssEditor-styleEditor").style.display = "none";
            }

            function showStyleEditor() {
                document.getElementById("cssEditor-styleEditor").style.display = "block";
            }

            function showRemoveStyle() {
                document.getElementById("cssEditor-removeStyle").style.display = "inline-block";
            }

            function hideRemoveStyle() {
                document.getElementById("cssEditor-removeStyle").style.display = "none";
            }

            function showSaveStyle() {
                document.getElementById("cssEditor-saveStyle").style.display = "inline-block";
            }

            function hideSaveStyle() {
                document.getElementById("cssEditor-saveStyle").style.display = "none";
            }

            function saveStyle() {
                var isRegexValid = checkRegex(document.getElementById("cssEditor-matchUrl").value);
                if (!isRegexValid) {
                    alert(translate("invalidRegex"));
                    return;
                }
                var tmpValue = {
                    title: document.getElementById("cssEditor-styleName").value,
                    url: document.getElementById("cssEditor-matchUrl").value,
                    style: document.getElementById("cssEditor-styleContent").value
                }
                if (currentStyle === null) {
                    allStyles.push(tmpValue);
                    currentStyle = tmpValue;
                    currentStyleIndex = allStyles.length - 1;
                } else {
                    currentStyle = tmpValue;
                    allStyles[currentStyleIndex] = currentStyle;
                }
                setStyles(allStyles);
                createStyleList();
                showRemoveStyle();
                alert(translate("styleSaved"));
            }

            function checkRegex(regexContent) {
                var isValid = true;
                if (typeof regexContent !== "string") {
                    return false;
                }
                try {
                    new RegExp(regexContent);
                } catch(e) {
                    isValid = false;
                }
                return isValid;
            }

            function removeStyle() {
                if (confirm(translate('confirmDeleteStyle')) == true) {
                    allStyles.splice(currentStyleIndex, 1);
                    setStyles(allStyles);
                    hideSaveStyle();
                    hideRemoveStyle();
                    hideStyleEditor();
                    createStyleList();
                }
            }

            window.onclick = function (event) {
                if (event.target === modal) {
                    closeModal();
                }
            };

            modal.style.display = "block";

            document.onkeydown = function (evt) {
                evt = evt || window.event;
                if (evt.keyCode == 27) {
                    closeModal();
                }
            };

            function closeModal() {
                Array.from(document.styleSheets).forEach(function (item) {
                    item.disabled = false;
                });
                modal.remove();
            }

            getStyles(createStyleList);
        }
    });
});
