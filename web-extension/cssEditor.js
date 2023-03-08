[...document.styleSheets].forEach(function (css) {
    css.disabled = true;
});

document.querySelector("#cssEditor-Modal")?.remove();

var allPagesRef = null;
var allStyles = [];
var currentStyle = null;
var currentStyleIndex = -1;


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

function showEditor() {
    const body = document.querySelector("body");

    const modalContent = createDiv({name: "modalContent"});
    const modalHeader = createDiv({name: "modalList"});
    const modalFooter = createDiv({name: "modalFooter"});

    ////////
    // Header
    const title = createSpan({
        name: "Title",
        innerText: chrome.i18n.getMessage("styleEditor")
    });

    const upperCloseButton = createButton({
        name: "UpperCloseButton",
        onclick: closeModal,
        innerText: "X"
    });
    upperCloseButton.className = 'cssEditor-text-button cssEditor-float-right';

    modalHeader.appendChild(title);
    modalHeader.appendChild(upperCloseButton);
    /////////////////////
    // Content List

    const titleHolder = createDiv({name: "ebookTitleHolder"});

    const existingStyles = createSelect({
        name: "selectStyle",
        onchange: function (event) {
            if (existingStyles.selectedIndex === 0) {
                currentStyle = null;
                currentStyleIndex = -1;
                hideStyleEditor();
                hideRemoveStyle();
                hideSaveStyle();
                return;
            }
            currentStyleIndex = existingStyles.selectedIndex - 1;
            currentStyle = allStyles[currentStyleIndex];
            editCurrentStyle();
        }
    });

    const defaultOption =  createOption({
        name: "defaultOption",
        innerText: chrome.i18n.getMessage("selectExistingCSS")
    });
    existingStyles.appendChild(defaultOption);
    titleHolder.appendChild(existingStyles);

    const titleLabel = createLabel({
        name: "orLabel",
        innerText: chrome.i18n.getMessage('orLabel')
    });
    titleHolder.appendChild(titleLabel);

    const createNewStyleButton = createButton({
        name: "createNewStyle",
        innerText: "createNewStyle",
        onclick: createNewStyle
    });
    titleHolder.appendChild(createNewStyleButton);

    const exportCustomStylesButton = createButton({
        name: "exportCustomStyles",
        innerText: chrome.i18n.getMessage("exportCustomStyles"),
        onclick: exportCustomStyles
    });
    titleHolder.appendChild(exportCustomStylesButton);

    const importCustomStylesInput = createInput({name: "importCustomStylesInput"});
    const importCustomStylesButton = createLabel({
        name: "impotCustomStyles",
        type: "file",
        accept: "application/json",
        innerText: chrome.i18n.getMessage('importCustomStyles'),
        onchange:importCustomStyles
    });

    importCustomStylesButton.appendChild(importCustomStylesInput);
    titleHolder.appendChild(importCustomStylesButton);

    modalList.appendChild(titleHolder);

    function createNewStyle() {
        currentStyle = null;
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
                alert(chrome.i18n.getMessage('invalidCustomStyleJson'));
                return;
            }
            if (validateCustomStyles(importedStyles)) {
                chrome.runtime.sendMessage({
                        'type': 'ImportCustomStyles',
                        'customStyles': importedStyles
                    },
                    function () {
                        alert(chrome.i18n.getMessage('stylesImported'));
                        closeModal();
                    }
                );
            } else {
                alert(chrome.i18n.getMessage('invalidCustomStyleJson'));
            }
            return;
        };

        reader.onerror = function () {
            alert(chrome.i18n.getMessage('errorOnReadingFile'));
            return;
        };
    }
    function exportCustomStyles() {
        chrome.runtime.sendMessage({'type': 'ExportCustomStyles'});
    }
    //////

    const editorHolder = createDiv("styleEditor");
    editorHolder.style.display = 'none';

    const editorHolderLeft = createDiv({
        name: "editorHolderLeft",
        className: "cssEditor-left-panel"
    });
    const editorHolderRight = createDiv({
        name: "editorHolderRight",
        className: "cssEditor-right-panel"
    });

    const nameLabelHolder = createDiv({
        name: "nameLabelHolder",
        className: "cssEditor-field-label-holder"
    });

    const nameLabel = createLabel({
        name: "nameLabel",
        className: "cssEditor-field-label",
        innerText: chrome.i18n.getMessage('styleNameLabel') 
    });
    nameLabelHolder.appendChild(nameLabel);
    editorHolderLeft.appendChild(nameLabelHolder);

    const nameInputHolder = createDiv({
        className: "cssEditor-field-holder"
    });
    const cssNameInput = createInput({
        name: "cssEditor-styleName",
        type: "text"
    });
    nameInputHolder.appendChild(cssNameInput);
    editorHolderLeft.appendChild(nameInputHolder);


    const urlLabelHolder = createDiv({
        className: "cssEditor-field-label-holder"
    });
    var urlLabel = document.createElement('label');
    urlLabel.className = 'cssEditor-field-label';
    urlLabel.innerText = 'URL Regex'; // TODO addd link to regex tutorial
    var regexHelp = document.createElement('a');
    regexHelp.innerText = chrome.i18n.getMessage('howToWriteRegexLabel');
    regexHelp.setAttribute('href', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions');
    urlLabelHolder.appendChild(urlLabel);
    urlLabelHolder.appendChild(regexHelp);
    editorHolderLeft.appendChild(urlLabelHolder);

    var urlInputHolder = document.createElement('div');
    urlInputHolder.className = 'cssEditor-field-holder';
    var urlInput = document.createElement('input');
    urlInput.id = 'cssEditor-matchUrl';
    urlInput.type = 'text';
    urlInputHolder.appendChild(urlInput);
    editorHolderLeft.appendChild(urlInputHolder);

    var contentLabelHolder = document.createElement('div');
    contentLabelHolder.className = 'cssEditor-field-label-holder';
    var contentLabel = document.createElement('label');
    contentLabel.className = 'cssEditor-field-label';
    contentLabel.innerText = 'CSS';
    contentLabelHolder.appendChild(contentLabel);
    editorHolderRight.appendChild(contentLabelHolder);

    var contentInputHolder = document.createElement('div');
    contentInputHolder.className = 'cssEditor-field-holder';
    var contentInput = document.createElement('textarea');
    contentInput.id = 'cssEditor-styleContent';
    contentInput.setAttribute('data', 'language: css');
    contentInputHolder.appendChild(contentInput);
    editorHolderRight.appendChild(contentInputHolder);

    editorHolder.appendChild(editorHolderLeft);
    editorHolder.appendChild(editorHolderRight);
    modalList.appendChild(editorHolder);



    var saveButtonsHolder = document.createElement('div');

    var removeCssButton = document.createElement('button');
    removeCssButton.id = 'cssEditor-removeStyle';
    removeCssButton.innerText = chrome.i18n.getMessage('removeStyle');
    removeCssButton.className = 'cssEditor-footer-button cssEditor-float-left cssEditor-cancel-button';
    removeCssButton.onclick = removeStyle;
    saveButtonsHolder.appendChild(removeCssButton);

    var saveCssButton = document.createElement('button');
    saveCssButton.id = 'cssEditor-saveStyle';
    saveCssButton.innerText = chrome.i18n.getMessage('saveStyle');
    saveCssButton.className = 'cssEditor-footer-button cssEditor-float-right cssEditor-save-button';
    saveCssButton.onclick = saveStyle;
    saveButtonsHolder.appendChild(saveCssButton);

    modalFooter.appendChild(saveButtonsHolder);

    //////////////////////////

    function createStyleList(allStylesTmp) {
        if (allStylesTmp && allStylesTmp.length > 0) {
            allStyles = allStyles.concat(allStylesTmp);
        }

        while (existingStyles.hasChildNodes() && existingStyles.childElementCount > 1) {
            existingStyles.removeChild(existingStyles.lastChild);
        }

        for (var i = 0; i < allStyles.length; i++) {
            var listItem = document.createElement('option');
            listItem.id = 'option_' + i;
            listItem.className = 'cssEditor-chapter-item';
            listItem.value = 'option_' + i;
            listItem.innerText = allStyles[i].title;
            if (currentStyle && (allStyles[i].title === currentStyle.title)) {
                listItem.selected = 'selected';
            }
            existingStyles.appendChild(listItem);
        }
    }

    function editCurrentStyle() {
        if (!currentStyle) {
            return;
        }

        showStyleEditor();
        showRemoveStyle();
        showSaveStyle();

        document.getElementById('cssEditor-styleName').value = currentStyle.title;
        document.getElementById('cssEditor-matchUrl').value = currentStyle.url;
        document.getElementById('cssEditor-styleContent').value = currentStyle.style;

    }

    function resetFields() {
        document.getElementById('cssEditor-styleName').value = '';
        document.getElementById('cssEditor-matchUrl').value = '';
        document.getElementById('cssEditor-styleContent').value = '';
    }

    function hideStyleEditor() {
        document.getElementById('cssEditor-styleEditor').style.display = 'none';
    }

    function showStyleEditor() {
        document.getElementById('cssEditor-styleEditor').style.display = 'flex';
    }

    function showRemoveStyle() {
        document.getElementById('cssEditor-removeStyle').style.display = 'inline-block';
    }

    function hideRemoveStyle() {
        document.getElementById('cssEditor-removeStyle').style.display = 'none';
    }

    function showSaveStyle() {
        document.getElementById('cssEditor-saveStyle').style.display = 'inline-block';
    }

    function hideSaveStyle() {
        document.getElementById('cssEditor-saveStyle').style.display = 'none';
    }

    function saveStyle() {
        var isRegexValid = checkRegex(document.getElementById('cssEditor-matchUrl').value);
        if (!isRegexValid) {
            alert(chrome.i18n.getMessage('invalidRegex'));
            return;
        }
        var tmpValue = {
            title: document.getElementById('cssEditor-styleName').value,
            url: document.getElementById('cssEditor-matchUrl').value,
            style: document.getElementById('cssEditor-styleContent').value
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
        alert(chrome.i18n.getMessage('styleSaved'));
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
        if (confirm(chrome.i18n.getMessage('confirmDeleteStyle')) == true) {
            allStyles.splice(currentStyleIndex, 1);
            setStyles(allStyles);
            hideSaveStyle();
            hideRemoveStyle();
            hideStyleEditor();
            createStyleList();
        }
    }


    /////////////////////

    var modal = document.createElement('div');
    modal.id = 'cssEditor-Modal';

    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalList);
    modalContent.appendChild(modalFooter);
    modal.appendChild(modalContent);

    body.appendChild(modal);

    modal.style.display = "none";
    modal.style.position = 'fixed';
    modal.style.zIndex = '1';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.overflow = 'auto';
    modal.style.backgroundColor = 'rgba(210, 210, 210, 1)';

    modalContent.style.zIndex = '2';
    modalContent.style.backgroundColor = '#fff';
    modalContent.style.margin = '5% auto';
    modalContent.style.padding = '0';
    modalContent.style.width = '70%';

    window.onclick = function(event) {
        if (event.target == modal) {
            closeModal();
        }
    };

    modal.style.display = "block";

    document.onkeydown = function(evt) {
        evt = evt || window.event;
        if (evt.keyCode == 27) {
            closeModal();
        }
    };

    function closeModal() {
        for (var i=0; i<document.styleSheets.length; i++) {
            document.styleSheets.item(i).disabled = false;
        }
        modal.style.display = "none";
        modalContent.parentNode.removeChild(modalContent);
        modal.parentNode.removeChild(modal);
    }

    function saveChanges() {
        var newChapters = [];
        var newEbookTitle = ebookTilte.value;
        if (newEbookTitle.trim() === '') {
            newEbookTitle = 'eBook';
        }

        try {
            var tmpChaptersList = document.getElementsByClassName('cssEditor-chapter-item');
            if (!tmpChaptersList || !allPagesRef) {
                return;
            }

            for (var i = 0; i < tmpChaptersList.length; i++) {
                var listIndex = Number(tmpChaptersList[i].id.replace('li', ''));
                if (allPagesRef[listIndex].removed === false) {
                    newChapters.push(allPagesRef[listIndex]);
                }
            }

            saveEbookTitle(newEbookTitle);
            saveEbookPages(newChapters);
            return newChapters;
        } catch (e) {
            console.log('Error:', e);
        }
    }

    /////////////////////

    getStyles(createStyleList);
}
