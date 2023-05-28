/*jslint browser*/
/*property
    accept, append, class, create, createElement, data, entries, forEach,
    freeze, href, id, isArray, join, map, setAttribute, style, type, voidEl
*/
function dom(tag, ...nodes) {
    let node;
    if (typeof tag === "string") {
        node = document.createElement(tag);
    } else {
        if (
            !Array.isArray(tag)
            || typeof tag[0] !== "string"
            || typeof tag[1] !== "object"
        ) {
            throw new Error("dom: invalid first parameter");
        }
        node = document.createElement(tag[0]);
        Object.entries(tag[1]).forEach(function ([key, value]) {
            node.setAttribute(key, value);
        });
    }
//Elements with no children must be invoked
    node.append(...nodes.map((n) => (
        typeof n === "function"
        ? n()
        : n
    )));

    return node;
}

const regexpUrl = (
    "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_"
    + "Expressions"
);

function build(tag, props) {
    if (typeof props === "string") {
        return [tag, {id: `cssEditor-${props}`}];
    }

    const attrs = Object.create(null);
    if (props.id !== undefined) {
        attrs.id = `cssEditor-${props.id}`;
    }
    if (props.class !== undefined) {
        const cn = (
            Array.isArray(props.class)
            ? props.class
            : [props.class]
        );
        attrs.class = cn.map((c) => `cssEditor-${c}`).join(" ");
    }

/*jslint-disable*/
    return [tag, {...props, ...attrs}];
/*jslint-enable*/
}

const specialize = (el) => (props) => (...nodes) => dom(
    build(el, props),
    ...nodes
);
const voidEl = (el) => (props) => dom(build(el, props));

const div = specialize("div");
const span = specialize("span");
const select = specialize("select");
const button = specialize("button");
const label = specialize("label");
const input = voidEl("input");
const a = specialize("a");
const textarea = specialize("textarea");

export default Object.freeze((translate) => div("Modal")(
    div("modalContent")(
        div("modalHeader")(
            span("Title")(translate("styleEditor")),
            button({id: "close", class: ["text-button", "float-right"]})("X")
        ),
        div("modalList")(
            div("ebookTitleHolder")(
                select("selectStyle")(
                    dom("option", translate("selectExistingCSS"))
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
