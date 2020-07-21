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
const fs = __importStar(require("fs-extra"));
class DocumentClass {
    constructor(extension) {
        this.suggestions = [];
        this.extension = extension;
    }
    initialize(classes) {
        Object.keys(classes).forEach(key => {
            const item = classes[key];
            const cl = new vscode.CompletionItem(item.command, vscode.CompletionItemKind.Module);
            cl.detail = item.detail;
            cl.documentation = new vscode.MarkdownString(`[${item.documentation}](${item.documentation})`);
            this.suggestions.push(cl);
        });
    }
    provideFrom() {
        return this.provide();
    }
    provide() {
        if (this.suggestions.length === 0) {
            const allClasses = JSON.parse(fs.readFileSync(`${this.extension.extensionRoot}/data/classnames.json`).toString());
            this.initialize(allClasses);
        }
        return this.suggestions;
    }
}
exports.DocumentClass = DocumentClass;
//# sourceMappingURL=documentclass.js.map