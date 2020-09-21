"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sdlparse_1 = require("./sdlparse");
function getLocationInfo(document, position) {
    var root = sdlparse_1.parseSDL(document.getText());
    var pos = document.offsetAt(position);
    var current = [root];
    var currentNamespace = [""];
    var currentName = [""];
    (function findContext() {
        var prevCur = current.length;
        Object.keys(current[current.length - 1].tags).forEach(key => {
            if (current[current.length - 1].tags[key])
                current[current.length - 1].tags[key].forEach(tag => {
                    if (tag.range) {
                        if (pos >= tag.range[0] && pos < tag.range[1]) {
                            current.push(tag);
                            currentNamespace.push("");
                            currentName.push(key);
                            findContext();
                            return;
                        }
                    }
                });
        });
        Object.keys(current[current.length - 1].namespaces).forEach(key => {
            if (current[current.length - 1].namespaces[key])
                Object.keys(current[current.length - 1].namespaces[key].tags).forEach(tagkey => {
                    if (current[current.length - 1].namespaces[key].tags[tagkey])
                        current[current.length - 1].namespaces[key].tags[tagkey].forEach(tag => {
                            if (tag.range) {
                                if (pos >= tag.range[0] && pos < tag.range[1]) {
                                    current.push(tag);
                                    currentNamespace.push(key);
                                    currentName.push(tagkey);
                                    findContext();
                                    return;
                                }
                            }
                        });
                });
        });
        if (prevCur != current.length) {
            findContext();
        }
    })();
    var locationType = "block";
    var namespaceStack = currentNamespace;
    var nameStack = currentName;
    var valueContent = "";
    var partialContent = "";
    function findInValues(values, attribName) {
        values.forEach(value => {
            if (pos >= value.ownerRange[0] && pos < value.ownerRange[1]) {
                if (value.type == "none") {
                    if (value.range[0] == value.range[1])
                        locationType = "attribute";
                    else
                        locationType = "value";
                    namespaceStack.push(value.namespace);
                    nameStack.push(attribName || "");
                    valueContent = "";
                    partialContent = valueContent;
                }
                else {
                    locationType = "attribute";
                    namespaceStack.push(value.namespace);
                    nameStack.push(attribName || "");
                    valueContent = "";
                    partialContent = valueContent;
                }
            }
            else if (pos >= value.range[0] && pos < value.range[1]) {
                locationType = "value";
                namespaceStack.push(value.namespace);
                nameStack.push(attribName || "");
                valueContent = value.value;
                partialContent = valueContent.substr(0, value.range[0] - pos);
            }
        });
    }
    var curr = current[current.length - 1];
    findInValues(curr.values);
    Object.keys(curr.attributes).forEach(key => {
        findInValues(curr.attributes[key], key);
    });
    if (locationType == "block" && curr.attributesRange) {
        if (pos >= curr.attributesRange[0] && pos < curr.attributesRange[1]) {
            locationType = "attribute";
            namespaceStack.push("");
            nameStack.push("");
            valueContent = "";
            partialContent = valueContent;
        }
    }
    return {
        currentSDLObject: curr,
        type: locationType,
        namespace: namespaceStack,
        name: nameStack,
        value: valueContent,
        partial: partialContent
    };
}
exports.getLocationInfo = getLocationInfo;
//# sourceMappingURL=sdlinfo.js.map