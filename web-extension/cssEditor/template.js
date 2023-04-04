const regexpUrl = (
    "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_"
    + "Expressions"
);
export default (translate) => `<div id="cssEditor-Modal">
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
                    <option>${translate("selectExistingCSS")}</option>
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

