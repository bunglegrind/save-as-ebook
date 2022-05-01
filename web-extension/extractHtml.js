
// Used to replace <img> src links that don't have a file extension
// If the image src doesn't have a file type:
// 1. Create a dummy link
// 2. Detect image type from the binary data & create new links
// 3. Replace all the dummy links in tmpGlobalContent with the new links
var tmpGlobalContent = null;

var allImages = [];
var extractedImages = [];
const allowedTags = [
    "address", "article", "aside", "footer", "header", "h1", "h2", "h3", "h4", "h5", "h6",
    "hgroup", "nav", "section", "dd", "div", "dl", "dt", "figcaption", "figure", "hr", "li",
    "main", "ol", "p", "pre", "ul", "a", "abbr", "b", "bdi", "bdo", "br", "cite", "code", "data",
    "dfn", "em", "i", "img", "kbd", "mark", "q", "rb", "rp", "rt", "rtc", "ruby", "s", "samp", "small", "span",
    "strong", "sub", "sup", "time", "u", "var", "wbr", "del", "ins", "caption", "col", "colgroup",
    "table", "tbody", "td", "tfoot", "th", "thead", "tr",
    "math", "maction", "menclose", "merror", "mfenced", "mfrac", "mglyph", "mi", "mlabeledtr", "mmultiscripts", "mn", "mo", "mover", "mpadded", "mphantom", "mroot",
    "mrow", "ms", "mspace", "msqrt", "mstyle", "msub", "msup", "msubsup", "mtable", "mtd", "mtext", "mtr", "munder", "munderover", "msgroup", "mlongdiv", "mscarries",
    "mscarry", "mstack", "semantics"
    // TODO ?
    // ,'form', 'button'

    // TODO svg support ?
    // , 'svg', 'g', 'path', 'line', 'circle', 'text'
];
// const svgTags = ['svg', 'g', 'path', 'line', 'circle', 'text']
var mathMLTags = [
    "math", "maction", "menclose", "merror", "mfenced", "mfrac", "mglyph", "mi", "mlabeledtr", "mmultiscripts", "mn", "mo", "mover", "mpadded", "mphantom", "mroot",
    "mrow", "ms", "mspace", "msqrt", "mstyle", "msub", "msup", "msubsup", "mtable", "mtd", "mtext", "mtr", "munder", "munderover", "msgroup", "mlongdiv", "mscarries",
    "mscarry", "mstack", "semantics"
]
var cssClassesToTmpIds = {};
var tmpIdsToNewCss = {};
var tmpIdsToNewCssSTRING = {};

// src: https://idpf.github.io/a11y-guidelines/content/style/reference.html
var supportedCss = [
    "background-color",
    "border-top-width",
    "border-top-style",
    "border-top-color",
    "border-bottom-width",
    "border-bottom-style",
    "border-bottom-color",
    "border-right-width",
    "border-right-style",
    "border-right-color",
    "border-left-width",
    "border-left-style",
    "border-left-color",
    "border-collapse",
    "color",
    "font-style",
    "font-variant",
    "font-weight",
    "font-size",
    "font-family",
    "line-height",
    "list-style",
    "margin-top",
    "margin-bottom",
    "margin-right",
    "margin-left",
    "padding-top",
    "padding-bottom",
    "padding-right",
    "padding-left",
    "text-align",
	"white-space",
    "display"
];

var inheritedCss = [];
//////

function getImageSrc(srcTxt) {
    if (!srcTxt) {
        return '';
    }
    srcTxt = srcTxt.trim();
    if (srcTxt === "") {
        return "";
    }

    // TODO move
    srcTxt = srcTxt.replace(/&amp;/g, "&")

    // TODO - convert <imgs> with svg sources to jpeg OR add support for svg

    let fileExtension = getFileExtension(srcTxt);
    if (fileExtension === "") {
       fileExtension = "TODO-EXTRACT"
    }
    let newImgFileName = "img-" + generateRandomNumber(true) + '.' + fileExtension;

    let isB64Img = isBase64Img(srcTxt);
    if (isB64Img) {
        extractedImages.push({
            filename: newImgFileName, // TODO name
            data: getBase64ImgData(srcTxt)
        });
    } else {
        allImages.push({
            originalUrl: getImgDownloadUrl(srcTxt),
            filename: newImgFileName,  // TODO name
        });
    }

    return "../images/" + newImgFileName;
}

// tested
function extractMathMl(element) {
		element.querySelectorAll("span[id^=\"MathJax-Element-\"]").forEach(
		function (e) {
			e.outerHTML = "<span>" + e.getAttribute("data-mathml") + "</span>";
		}
	);
}

// tested
function extractCanvasToImg(element) {
    element.querySelectorAll("canvas").forEach(
		function (e) {
			try {
				e.outerHTML = (
					"<img src=\""
					+ e.toDataURL("image/jpeg")
					+ "\" alt=\"\"></img>"
				);
			} catch (error) {
				console.log(error)
			}
    });
}

// tested
function extractSvgToImg(element) {
    const serializer = new XMLSerializer();

    element.querySelectorAll("svg").forEach(function (elem) {
        // add width & height because the result image was too big
        const bbox = elem.getBoundingClientRect();
        elem.outerHTML = (
			"<img src=\"data:image/svg+xml;base64,"
			+ window.btoa(serializer.serializeToString(elem))
			+ "\" width=\"" + bbox.width
			+ "\" height=\"" + bbox.height
			+ "\">"	+ "</img>"
		);
    });
}

// replaces all iframes by divs with the same innerHTML content
function extractIFrames(iframes, prefix = "") {
	if (!iframes.length) {
		return;
	}

	function addIdInStyle(style, id) {
		return style.split("{").map(function (segment) {
			const selectors = segment.split("}");
		// if the CSS is well formed, selectors may be 1 element (for the first 
		// rule) or 2 elements array. Last element is the one which contains the
		// actual selectors.
			selectors[selectors.length - 1] = selectors[selectors.length - 1]
				.split(",")
				.map(function (selector) {
				return (
					selector.trim().length > 0//check if it's just an empty line
					? "#" + id + " " + selector.replace("body", "")
					: selector
				);
			});
			return selectors.join("}");
		}).join("{");
	}

    const divs = iframes.map(function (iframe, index) {
        const div = document.createElement("div");
        div.id = prefix + "save-as-ebook-iframe-" + index;
        if (!iframe.contentDocument || !iframe.contentDocument.body) {
			console.log("CORS not enabled or empty iframe. Discarding " + div.id);
            return div;
        }
        const bbox = iframe.getBoundingClientRect();
        div.style.width = bbox.width;
        div.style.height = bbox.height;
		console.log(div.id);
        div.innerHTML = iframe.contentDocument.body.innerHTML;
        Array.from(div.querySelectorAll("style")).forEach(function (style) {
            style.innerHTML = addIdInStyle(style.innerHTML, div.id);
        });

        return div;
    });
    iframes.forEach((iframe, i) => iframe.parentNode.replaceChild(divs[i], iframe));
	return divs.forEach((div, i) => extractIFrames(
		Array.from(div.querySelectorAll("iframe")),
		i + "-"
	));
}

function parseHTML(rawContentString) {
    allImages = [];
    extractedImages = [];
    let results = '';
    let lastFragment = '';
    let lastTag = '';

    try {
        HTMLParser(rawContentString, {
            start: function(tag, attrs, unary) {
                lastTag = tag;
                if (allowedTags.indexOf(tag) < 0) {
                    return;
                }

                if (tag === "img") {
                    let tmpAttrsTxt = '';
                    let tmpSrc = ''
                    for (let i = 0; i < attrs.length; i++) {
                        if (attrs[i].name === "src") {
                            tmpSrc = getImageSrc(attrs[i].value)
                            tmpAttrsTxt += " src=\"" + tmpSrc + "\"";
                        } else if (attrs[i].name === "data-class") {
                            tmpAttrsTxt += " class=\"" + attrs[i].value + "\"";
                        } else if (attrs[i].name === "width") {
                            // used when converting svg to img - the result image was too big
                            tmpAttrsTxt += " width=\"" + attrs[i].value + "\"";
                        } else if (attrs[i].name === "height") {
                            // used when converting svg to img - the result image was too big
                            tmpAttrsTxt += " height=\"" + attrs[i].value + "\"";
                        }
                    }
                    if (tmpSrc === "") {
                        // ignore imgs without source
                        lastFragment = "";
                    } else {
                        lastFragment = tmpAttrsTxt.length === 0 ? "<img></img>" : "<img" + tmpAttrsTxt + " alt=\"\"></img>";
                    }
                } else if (tag === "a") {
                    let tmpAttrsTxt = "";
                    for (let i = 0; i < attrs.length; i++) {
                        if (attrs[i].name === "href") {
                            tmpAttrsTxt += " href=\"" + getHref(attrs[i].value) + "\"";
                        } else if (attrs[i].name === "data-class") {
 f                           tmpAttrsTxt += " class=\"" + attrs[i].value + "\"";
                        }
                    }
                    lastFragment = tmpAttrsTxt.length === 0 ? "<a>" : "<a" + tmpAttrsTxt + ">";
                } else if (tag === "br" || tag === "hr") {
                    let tmpAttrsTxt = "";
                    for (let i = 0; i < attrs.length; i++) {
                        if (attrs[i].name === "data-class") {
                            tmpAttrsTxt += " class=\"" + attrs[i].value + "\"";
                        }
                    }
                    lastFragment = "<" + tag + tmpAttrsTxt + "></" + tag + ">";
                } else if (tag === "math") {
                    let tmpAttrsTxt = '';
                    tmpAttrsTxt += " xmlns=\"http://www.w3.org/1998/Math/MathML\"";
                    for (let i = 0; i < attrs.length; i++) {
                        if (attrs[i].name === "alttext") {
                            tmpAttrsTxt += " alttext=\"" + attrs[i].value + "\"";
                        }
                    }
                    lastFragment = "<" + tag + tmpAttrsTxt + ">";
                } else {
                    let tmpAttrsTxt = "";
                    for (let i = 0; i < attrs.length; i++) {
                        if (attrs[i].name === "data-class") {
                            tmpAttrsTxt += " class=\"" + attrs[i].value + "\"";
                        }
                    }
                    lastFragment = "<" + tag + tmpAttrsTxt + ">";
                }

                results += lastFragment;
                lastFragment = "";
            },
            end: function(tag) {
                if (allowedTags.indexOf(tag) < 0 || tag === "img" || tag === "br" || tag === "hr") {
                    return;
                }

                results += "</" + tag + ">";
            },
            chars: function(text) {
                if (lastTag !== "" && allowedTags.indexOf(lastTag) < 0) {
                    return;
                }
                results += text;
            },
            comment: function(text) {
                // results += "<!--" + text + "-->";
            }
        });

        // TODO - (re)move
        results = results.replace(/&nbsp;/gi, "&#160;");

        return results;

    } catch (e) {
        console.log("Error:", e);
        return "Error: " + e  //+"  " + force($(rawContentString))
    }

}

function getContent(htmlContent) {
    try {
        let tmp = document.createElement("div");
        tmp.appendChild(htmlContent.cloneNode(true));
        let tmpHtml = "<div>" + tmp.innerHTML + "</div>";
        return parseHTML(tmpHtml);
    } catch (e) {
        console.log("Error:", e);
        return htmlContent;
    }
}

/////

function getSelectedNodes() {
    // if (document.selection) {
        // return document.selection.createRange().parentElement();
        // return document.selection.createRange();
    // }
    let selection = window.getSelection();
    let docfrag = [];
    for (let i = 0; i < selection.rangeCount; i++) {
        docfrag.push(selection.getRangeAt(i).cloneContents());
    }
    return docfrag;
}

/////

function isVisible(elem) {
	return Boolean(
        elem.offsetWidth
        || elem.offsetHeight
        || elem.getClientRects().length
    );
}

function extractCss(includeStyle, appliedStyles) {
    if (includeStyle) {
        document.querySelectorAll("body *").forEach(function (pre, i) {
            if (
				allowedTags.indexOf(pre.tagName.toLowerCase()) < 0
				|| mathMLTags.indexOf(pre.tagName.toLowerCase()) > -1
			) {
				return;
			}

            if (!isVisible(pre)) {
                pre.outerHTML = "";
            } else {
                if (pre.tagName.toLowerCase() === "svg") return;

                const elementId = pre.tagName + "-" + generateRandomNumber(true);
                let tmpName = generateRandomTag(2) + i;
				cssClassesToTmpIds[elementId] = tmpName;
				const  tmpNewCss = {};
				const styles = window.getComputedStyle(pre);

				for (let cssTagName of supportedCss.concat(inheritedCss)) {
					let cssValue = styles.getPropertyValue(cssTagName);
					if (cssValue && cssValue.length > 0) {
						if (cssTagName === "font-size") {
							const parentFontSize = parseInt(getComputedStyle(pre.parentElement).getPropertyValue("font-size"));
							if (parentFontSize > 0) {
								cssValue = (parseInt(cssValue)/parentFontSize).toFixed(1) + "em";
							}
						}
						if (cssTagName === "line-height") {
							const fontSize = parseInt(styles.getPropertyValue("font-size"));
							const numCssValue = parseInt(cssValue);
							if (numCssValue > 0) {
								cssValue = (numCssValue / fontSize).toFixed(1);
							}
						}
						tmpNewCss[cssTagName] = cssValue;
					}
				}

			// Reuse CSS - if the same css code was generated for another element, reuse it's class name

				let tcss = JSON.stringify(tmpNewCss)
				let found = false

				if (Object.keys(tmpIdsToNewCssSTRING).length === 0) {
					tmpIdsToNewCssSTRING[tmpName] = tcss;
					tmpIdsToNewCss[tmpName] = tmpNewCss;
				} else {
					for (const key in tmpIdsToNewCssSTRING) {
						if (tmpIdsToNewCssSTRING[key] === tcss) {
							tmpName = key
							found = true
							break
						}
					}
					if (!found) {
						tmpIdsToNewCssSTRING[tmpName] = tcss;
						tmpIdsToNewCss[tmpName] = tmpNewCss;
					}
				}
                pre.setAttribute('data-class', tmpName);
            }
        });
        return jsonToCss(tmpIdsToNewCss);
    } else {
        // remove hidden elements when style is not included
        document.querySelectorAll("body *").forEach(function ( pre) {
            if (!isVisible(pre)) {
                pre.outerHTML = "";
            }
        });
        let mergedCss = "";
        if (appliedStyles && appliedStyles.length > 0) {
            for (let i = 0; i < appliedStyles.length; i++) {
                mergedCss += appliedStyles[i].style;
            }
            return mergedCss;
        }
    }
    return null;
}

/////

function promiseAddZip(url, filename) {
	return fetch(url).then(function (data) {
		return data.arrayBuffer();
	}).then(function (data) {
		// TODO - move to utils.js
		if (filename.endsWith("TODO-EXTRACT")) {
			let oldFilename = filename
			let arr = (new Uint8Array(data)).subarray(0, 4);
			let header = "";
			for (let i = 0; i < arr.length; i++) {
				header += arr[i].toString(16);
			}
			if (header.startsWith("89504e47")) {
				filename = filename.replace("TODO-EXTRACT", "png")
			} else if (header.startsWith("47494638")) {
				filename = filename.replace("TODO-EXTRACT", "gif")
			} else if (header.startsWith("ffd8ff")) {
				filename = filename.replace("TODO-EXTRACT", "jpg")
			} else {
				// ERROR
				return Promise.reject("Error! Unable to extract the image type! " + filename + " " +  url);
			}
			tmpGlobalContent = tmpGlobalContent.replace(oldFilename, filename);
		}
		extractedImages.push({
			filename: filename,
			// TODO - must be JSON serializable
			data: base64ArrayBuffer(data)
		});
		return true;
	});
}

function walkTheDOM(f) {
	return function (node) {
		f(node);
		node = node.firstChild;
		while (node) {
			walkTheDOM(f)(node);
			node = node.nextSibling;
		}
	}
}

const dataClassToClass = walkTheDOM(function (element) {
	if (element.getAttributesNames().includes("data-class")) {
		element.className = element.getAttribute("data-class");
	}
});

function prepareImages(content) {
	content.querySelectorAll("img").forEach(function (img) {
		//remove all attributes but src, class, width, height following above
	});
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	if (!["extract-page", "extract-selection"].includes(request.type)) {
		return;
	}
    let imgsPromises = [];
    let result = {};
    let pageSrc = "";
    let styleFile = null;
	let content;

    extractIFrames(Array.from(document.querySelectorAll("iframe")));

    setTimeout(function () {
		//extract style and add data-class to every relevant node
		styleFile = extractCss(request.includeStyle, request.appliedStyles);
		if (request.type === "extract-page") {
			content = document.body;
		} else if (request.type === "extract-selection") {
			content = document.createElement("div");
			getSelectedNodes().forEach((fg) => content.appendChild(fg));
		}
		extractMathMl(content);
		extractCanvasToImg(content);
		extractSvgToImg(content);
		dataClassToClass(content);
		prepareImages(content);
		prepareAnchors(content);
		prepareBR(content);
		prepareHR(content);
	
		tmpGlobalContent = getContent(content);

		allImages.forEach(function (tmpImg) {
			imgsPromises.push(promiseAddZip(tmpImg.originalUrl, tmpImg.filename));
		});

		Promise.all(imgsPromises).then(function () {
				const tmpTitle = getPageTitle(document.title);
				result = {
					url: getPageUrl(tmpTitle),
					title: tmpTitle,
					baseUrl: getBaseUrl(),
					styleFileContent: styleFile,
					styleFileName: "style" + generateRandomNumber() + ".css",
					images: extractedImages,
					content: tmpGlobalContent
				};
				sendResponse(result);
			}
		).catch(function (e) {
			console.log("Error:", e);
			sendResponse(null);
		});
	}, 3000);
    return true;
});
