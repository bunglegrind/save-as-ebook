/*jslint browser, unordered*/
/*property
    a, append, button, class, create, createElement, div, entries, forEach,
    freeze, id, input, isArray, join, label, map, option, select, setAttribute,
    span, textarea
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

const specialize = (el) => (props = {}) => (...nodes) => dom(
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

export default Object.freeze({
    div,
    span,
    select,
    button,
    label,
    input,
    a,
    textarea,
    option: specialize("option")
});
