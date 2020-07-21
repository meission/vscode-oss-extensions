"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = __importStar(require("vscode"));
const utils = __importStar(require("../utils/utils"));
function tokenizer(document, position) {
    const startResult = document.getText(new vscode.Range(new vscode.Position(position.line, 0), position)).match(/[\\{,](?=[^\\{,]*$)/);
    const endResult = document.getText(new vscode.Range(position, new vscode.Position(position.line, 65535))).match(/[{}[\],]/);
    if (startResult === null || endResult === null ||
        startResult.index === undefined || endResult.index === undefined ||
        startResult.index < 0 || endResult.index < 0) {
        return undefined;
    }
    const startIndex = startResult[0] === '\\' ? startResult.index : startResult.index + 1;
    return document.getText(new vscode.Range(new vscode.Position(position.line, startIndex), new vscode.Position(position.line, position.character + endResult.index))).trim();
}
exports.tokenizer = tokenizer;
function onAPackage(document, position, token) {
    const line = document.lineAt(position.line).text;
    const escapedToken = utils.escapeRegExp(token);
    const regex = new RegExp(`\\\\usepackage(?:\\[[^\\[\\]\\{\\}]*\\])?\\{[\\w,]*${escapedToken}[\\w,]*\\}`);
    if (line.match(regex)) {
        return true;
    }
    return false;
}
exports.onAPackage = onAPackage;
//# sourceMappingURL=tokenizer.js.map