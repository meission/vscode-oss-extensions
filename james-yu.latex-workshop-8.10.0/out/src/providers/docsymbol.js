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
class DocSymbolProvider {
    constructor(extension) {
        this.sections = [];
        this.extension = extension;
        const rawSections = vscode.workspace.getConfiguration('latex-workshop').get('view.outline.sections');
        rawSections.forEach(section => {
            this.sections = this.sections.concat(section.split('|'));
        });
    }
    provideDocumentSymbols(document) {
        return new Promise((resolve, _reject) => {
            resolve(this.sectionToSymbols(this.extension.structureProvider.buildModel(document.fileName, undefined, undefined, undefined, false)));
        });
    }
    sectionToSymbols(sections) {
        const symbols = [];
        sections.forEach(section => {
            const range = new vscode.Range(section.lineNumber, 0, section.toLine, 65535);
            const symbol = new vscode.DocumentSymbol(section.label ? section.label : 'empty', '', vscode.SymbolKind.String, range, range);
            symbols.push(symbol);
            if (section.children.length > 0) {
                symbol.children = this.sectionToSymbols(section.children);
            }
        });
        return symbols;
    }
}
exports.DocSymbolProvider = DocSymbolProvider;
//# sourceMappingURL=docsymbol.js.map