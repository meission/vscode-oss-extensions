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
class Package {
    constructor(extension) {
        this.suggestions = [];
        this.extension = extension;
    }
    initialize(defaultPackages) {
        Object.keys(defaultPackages).forEach(key => {
            const item = defaultPackages[key];
            const pack = new vscode.CompletionItem(item.command, vscode.CompletionItemKind.Module);
            pack.detail = item.detail;
            pack.documentation = new vscode.MarkdownString(`[${item.documentation}](${item.documentation})`);
            this.suggestions.push(pack);
        });
    }
    provideFrom() {
        return this.provide();
    }
    provide() {
        if (this.suggestions.length === 0) {
            const pkgs = JSON.parse(fs.readFileSync(`${this.extension.extensionRoot}/data/packagenames.json`).toString());
            this.initialize(pkgs);
        }
        return this.suggestions;
    }
}
exports.Package = Package;
//# sourceMappingURL=package.js.map