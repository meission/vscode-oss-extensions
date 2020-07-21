"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = exports.filterCrates = exports.findVersion = exports.Item = void 0;
/**
 * Item is a data structure to define parsed items, hierarchy and index.
 */
class Item {
    constructor(item) {
        this.key = "";
        this.values = [];
        this.value = "";
        this.start = -1;
        this.end = -1;
        if (item) {
            this.key = item.key;
            this.values = item.values;
            this.value = item.value;
            this.start = item.start;
            this.end = item.end;
        }
    }
}
exports.Item = Item;
/**
 * Finds all version items with a flat crate=version pair.
 * @param item Item to search in
 * @param level Level of depth in search.
 */
function findVersion(item, level) {
    let dependencies = [];
    for (let i = 0; i < item.values.length; i++) {
        let value = item.values[i];
        if (value.values.length > 0) {
            dependencies = dependencies.concat(findVersion(value, level + 1));
        }
        else if (level === 0) {
            dependencies.push(value);
        }
        else if (value.key === "version") {
            const mock = new Item(value);
            mock.key = item.key;
            dependencies.push(mock);
        }
    }
    return dependencies;
}
exports.findVersion = findVersion;
/**
 * Filters all dependency related items with a flat crate=version match.
 * @param items
 */
function filterCrates(items) {
    let dependencies = [];
    for (let i = 0; i < items.length; i++) {
        let value = items[i];
        if (value.key.endsWith("dependencies")) {
            dependencies = dependencies.concat(findVersion(value, 0));
        }
        else {
            const dotIndex = value.key.lastIndexOf(".");
            const wordIndex = dotIndex - 12;
            if (value.key.indexOf("dependencies") === wordIndex) {
                const mock = new Item(value);
                mock.key = value.key.substring(dotIndex + 1);
                dependencies = dependencies.concat(findVersion(mock, 1));
            }
        }
    }
    return dependencies;
}
exports.filterCrates = filterCrates;
/**
 *
 * @param data Parse the given document and index all items.
 */
function parse(data) {
    let item = new Item();
    item.start = 0;
    item.end = data.length;
    parseTables(data, item);
    return item;
}
exports.parse = parse;
/**
 * Parse table level items.
 * @param data
 * @param parent
 */
function parseTables(data, parent) {
    let item = new Item();
    let i = -1;
    let buff = [];
    while (i++ < data.length) {
        const ch = data.charAt(i);
        if (isWhiteSpace(ch) || isNewLine(ch)) {
            continue;
        }
        else if (ch === "#") {
            i = parseComment(data, i);
        }
        else if (ch === "[") {
            item = new Item();
            item.start = i;
            buff = [];
        }
        else if (ch === "]") {
            item.key = buff.join("");
            i = parseValues(data, item, i);
            item = initNewItem(item, parent, i);
        }
        else {
            buff.push(ch);
        }
    }
    return parent;
}
/**
 * Parse key=value pairs.
 * @param data
 * @param parent
 * @param index
 */
function parseValues(data, parent, index) {
    let i = index;
    let item = new Item();
    let isParsingKey = true;
    while (i++ < data.length) {
        const ch = data.charAt(i);
        if (isWhiteSpace(ch) || isNewLine(ch) || isComma(ch)) {
            continue;
        }
        else if (ch === "#") {
            i = parseComment(data, i);
        }
        else if (isParsingKey) {
            if (ch === "[") {
                return --i;
            }
            else if (ch === "}") {
                return i;
            }
            i = parseKey(data, item, i);
            isParsingKey = false;
        }
        else if (ch === "#") {
            i = parseComment(data, i);
        }
        else if (ch === '"' || ch === "'") {
            i = parseString(data, item, i, ch);
            item = initNewItem(item, parent, i);
            isParsingKey = true;
        }
        else if (ch === "[") {
            i = parseArray(data, item, i);
            item = initNewItem(item, parent, i);
            isParsingKey = true;
        }
        else if (ch === "{") {
            i = parseValues(data, item, i);
            if (!isCratesDep(item)) {
                item.start = -1;
            }
            item = initNewItem(item, parent, i);
            isParsingKey = true;
        }
        else if (isBoolean(data, i)) {
            i = parseBoolean(data, item, i, ch);
            item = initNewItem(item, parent, i);
            isParsingKey = true;
        }
        else if (isNumber(data, i)) {
            i = parseNumber(data, item, i);
            item = initNewItem(item, parent, i);
            isParsingKey = true;
        }
    }
    return i;
}
function isCratesDep(i) {
    if (i.values && i.values.length) {
        for (let value of i.values) {
            if (value.key === "git" || value.key === "path") {
                return false;
            }
            else if (value.key === "package") {
                i.key = value.value;
            }
        }
    }
    return true;
}
/**
 * Parse array elements.
 * @param data
 * @param parent
 * @param index
 */
function parseArray(data, parent, index) {
    let i = index;
    let item = new Item();
    while (i++ < data.length) {
        const ch = data.charAt(i);
        if (isWhiteSpace(ch) || isNewLine(ch) || isComma(ch)) {
            continue;
        }
        else if (ch === '"' || ch === "'") {
            i = parseString(data, item, i, ch);
            item = initNewItem(item, parent, i);
        }
        else if (ch === "]") {
            return i;
        }
    }
    return i;
}
/**
 * Parse string
 * @param data
 * @param item
 * @param index
 * @param opener
 */
function parseString(data, item, index, opener) {
    let i = index;
    item.start = index;
    let buff = [];
    while (i++ < data.length) {
        const ch = data.charAt(i);
        switch (ch) {
            case '"':
            case "'":
                if (ch === opener) {
                    item.value = buff.join("");
                    item.end = i;
                    return i;
                }
            default:
                buff.push(ch);
        }
    }
    return i;
}
/**
 * Parse comment
 * @param data
 * @param index
 */
function parseComment(data, index) {
    let i = index;
    while (i++ < data.length) {
        const ch = data.charAt(i);
        if (isNewLine(ch)) {
            return i;
        }
    }
    return i;
}
/**
 * Parse key
 * @param data
 * @param item
 * @param index
 */
function parseKey(data, item, index) {
    let i = index;
    let buff = [];
    item.start = index;
    while (i < data.length) {
        const ch = data.charAt(i);
        if (ch === "=") {
            item.key = buff.join("");
            return i;
        }
        else if (!isWhiteSpace(ch)) {
            buff.push(ch);
        }
        i++;
    }
    return i;
}
/**
 * Parse boolean
 * @param data
 * @param item
 * @param index
 * @param opener
 */
function parseBoolean(data, item, index, opener) {
    const ch = data.charAt(index);
    switch (ch) {
        case "t":
            item.value = "true";
            return index + 3;
        case "f":
            item.value = "false";
            return index + 4;
        default:
            return index;
    }
}
/**
 * Parse number
 * @param data
 * @param item
 * @param index
 * @param opener
 */
function parseNumber(data, item, index) {
    const ch = data.charAt(index);
    if (ch === "+" || ch === "-") {
        index++;
    }
    let i = index;
    item.start = index;
    let buff = [];
    while (i < data.length) {
        const ch = data.charAt(i);
        switch (ch) {
            case "0":
            case "1":
            case "2":
            case "3":
            case "4":
            case "5":
            case "6":
            case "7":
            case "8":
            case "9":
            case ".":
                buff.push(ch);
                break;
            default:
                if (isNewLine(ch)) {
                    item.value = buff.join("");
                    item.end = i;
                    return i;
                }
        }
        i++;
    }
    return i;
}
/**
 * Reset some values
 * @param item
 * @param parent
 * @param i
 * @param buff
 */
function initNewItem(item, parent, i) {
    if (item.start !== -1) {
        item.end = i + 1;
        parent.values.push(item);
    }
    return new Item();
}
function isWhiteSpace(ch) {
    return ch === " " || ch === "\t";
}
function isNewLine(ch) {
    return ch === "\n" || ch === "\r";
}
function isComma(ch) {
    return ch === ",";
}
function isBoolean(data, i) {
    return data.substring(i, i + 4) === "true" || data.substring(i, i + 5) === "false";
}
function isNumber(data, i) {
    const ch = data.charAt(i);
    if (ch === "+" || ch === "-") {
        return true;
    }
    return parseInt(data.charAt(i), 10);
}
//# sourceMappingURL=parser.js.map