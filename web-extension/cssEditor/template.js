/*jslint browser, unordered*/
/*property
    accept, class, data, freeze, href, id, style, type
 */

import dom from "../libs/dom.js";

const {
    div,
    span,
    select,
    button,
    label,
    option,
    input,
    a,
    textarea
} = dom;

const regexpUrl = (
    "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_"
    + "Expressions"
);

export default Object.freeze((translate) => div("Modal")(
    div("modalContent")(
        div("modalHeader")(
            span("Title")(translate("styleEditor")),
            button({id: "close", class: ["text-button", "float-right"]})("X")
        ),
        div("modalList")(
            div("ebookTitleHolder")(
                select("selectStyle")(
                    option()(translate("selectExistingCSS"))
                ),
                span("orLabel")(translate("orLabel")),
                button("createNewStyle")(translate("createNewStyle")),
                button("exportCustomStyles")(
                    translate("exportCustomStyles")
                ),
                label("importCustomStyles")(
                    translate("importCustomStyles"),
                    input({type: "file", accept: "application/json"})
                )
            ),
            div({id: "styleEditor", style: "display:none"})(
                div("editorContent")(
                    div({class: "left-panel"})(
                        div({class: "field-label-holder"})(
                            label({class: "field-label"})(
                                translate("styleNameLabel")
                            )
                        ),
                        div({class: "field-holder"})(
                            input({id: "styleName", type: "text"})
                        ),
                        div({class: "field-label-holder"})(
                            label({class: "field-label"})("URL Regex"),
                            a({href: regexpUrl})(
                                translate("howToWriteRegexLabel")
                            )
                        ),
                        div({class: "field-holder"})(
                            input({id: "matchUrl", type: "text"})
                        )
                    ),
                    div({class: "right-panel"})(
                        div({class: "field-label-holder"})(
                            label({class: "field-label"})("CSS")
                        ),
                        div({class: "field-holder"})(
                            textarea(
                                {id: "styleContent", data: "language: css"}
                            )
                        )
                    )
                ),
                div("modalFooter")(
                    button({
                        id: "removeStyle",
                        class: ["footer-button", "float-left", "cancel-button"]
                    })(
                        translate("removeStyle")
                    ),
                    button({
                        id: "saveStyle",
                        class: ["footer-button", "float-right", "save-button"]
                    })(
                        translate("saveStyle")
                    )
                )
            )
        )
    )
));
