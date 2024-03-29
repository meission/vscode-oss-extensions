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
class ProjectSymbolProvider {
    constructor(extension) {
        this.extension = extension;
    }
    provideWorkspaceSymbols(_query, _token) {
        return new Promise((resolve, _reject) => {
            const symbols = [];
            if (this.extension.manager.rootFile === undefined) {
                resolve(symbols);
                return;
            }
            this.sectionToSymbols(symbols, this.extension.structureProvider.buildModel(this.extension.manager.rootFile));
            resolve(symbols);
        });
    }
    sectionToSymbols(symbols, sections, containerName = 'Document') {
        sections.forEach(section => {
            const location = new vscode.Location(vscode.Uri.file(section.fileName), new vscode.Range(section.lineNumber, 0, section.toLine, 65535));
            symbols.push(new vscode.SymbolInformation(section.label, vscode.SymbolKind.String, containerName, location));
            if (section.children.length > 0) {
                this.sectionToSymbols(symbols, section.children, section.label);
            }
        });
    }
}
exports.ProjectSymbolProvider = ProjectSymbolProvider;
//# sourceMappingURL=projectsymbol.js.map