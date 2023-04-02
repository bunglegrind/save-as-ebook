(function () {
    const regexpUrl = (
        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_"
        + "Expressions"
    );

    const defaultOption = `<option>${translate("selectExistingCSS")}</option>`;

    const html = `<div id="cssEditor-Modal">
    <div id="cssEditor-modalContent">
        <div id="cssEditor-modalHeader">
            <span id="cssEditor-Title">${translate("styleEditor")}</span>
            <button
                id="cssEditor-close"
                class="cssEditor-text-button cssEditor-float-right"
        >X</button>
        </div>
        <div id="cssEditor-modalList">
            <div id="cssEditor-ebookTitleHolder">
                <select id="cssEditor-selectStyle">
                    ${defaultOption}
                </select>
                <label id="cssEditor-orLabel">${translate("orLabel")}</label>
                <button id="cssEditor-createNewStyle">
                    ${translate("createNewStyle")}
                </button>
                <button id="cssEditor-exportCustomStyles">
                ${translate("exportCustomStyles")}
                </button>
                <label id="cssEditor-importCustomStyles">
                    ${translate("importCustomStyles")}
                <input type="file" accept="application/json">
                </label>
            </div>
            <div style="display: none;" id="cssEditor-styleEditor">
                <div id="cssEditor-editorContent">
                    <div class="cssEditor-left-panel">
                        <div class="cssEditor-field-label-holder">
                            <label class="cssEditor-field-label">
                                ${translate("styleNameLabel")}
                            </label>
                        </div>
                        <div class="cssEditor-field-holder">
                            <input id="cssEditor-styleName" type="text">
                        </div>
                        <div class="cssEditor-field-label-holder">
                            <label class="cssEditor-field-label">
                                URL Regex
                            </label>
                            <a href="${regexpUrl}">
                            ${translate("howToWriteRegexLabel")}
                            </a>
                        </div>
                        <div class="cssEditor-field-holder">
                            <input id="cssEditor-matchUrl" type="text">
                        </div>
                    </div>
                    <div class="cssEditor-right-panel">
                        <div class="cssEditor-field-label-holder">
                            <label class="cssEditor-field-label">CSS</label>
                        </div>
                        <div class="cssEditor-field-holder">
                            <textarea
                                id="cssEditor-styleContent"
                                data="language: css"
                            >
                            </textarea>
                        </div>
                    </div>
                </div>
                <div id="cssEditor-modalFooter">
                <button
                    id="cssEditor-removeStyle"
                    class="cssEditor-footer-button
                        cssEditor-float-left
                        cssEditor-cancel-button"
                >
                        ${translate("removeStyle")}
                </button>
                <button
                    id="cssEditor-saveStyle"
                    class="cssEditor-footer-button
                        cssEditor-float-right
                        cssEditor-save-button"
                >
                    ${translate("saveStyle")}
                </button>
                </div>
            </div>
        </div>
    </div>
</div>`;
    [...document.styleSheets].forEach(function (css) {
        css.disabled = true;
    });

    document.querySelector("#cssEditor-Modal")?.remove();

    var allPagesRef = null;
    var allStyles = [];
    let currentStyle;
    let currentStyleIndex = -1;


    showEditor();

    function createElement(el) {
        return function (options) {
            const element = document.createElement(el);

            Object.entries(options).forEach(function ([key, value]) {
                if (key === "name") {
                    element.id = `cssEditor-${options.name}`;
                } else {
                    element[key] = value;
                }
            });

            return element;
        }
    }

    const createDiv = createElement("div");
    const createSpan = createElement("span");
    const createButton = createElement("button");
    const createOption = createElement("option");
    const createLabel = createElement("label");
    const createInput = createElement("input");
    const createAnchor = createElement("a");

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
        document.querySelector("#cssEditor-importCustomStyles").onclick = importCustomStyles;

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
                try {
                    const importedStyles = JSON.parse(reader.result);
                } catch (e) {
                    alert(translate('invalidCustomStyleJson'));
                    return;
                }
                if (validateCustomStyles(importedStyles)) {
                    chrome.runtime.sendMessage({
                            'type': 'ImportCustomStyles',
                            'customStyles': importedStyles
                        },
                        function () {
                            alert(translate('stylesImported'));
                            closeModal();
                        }
                    );
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
        function exportCustomStyles() {
            chrome.runtime.sendMessage({'type': 'ExportCustomStyles'});
        }

        document.querySelector("#cssEditor-removeStyle").onclick = removeStyle;
        document.querySelector("#cssEditor-saveStyle").onclick = saveStyle;

        function createStyleList(allStylesTmp) {
            allStyles = allStyles.concat(allStylesTmp);

            existingStyles.innerHTML = defaultOption;
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
})();
