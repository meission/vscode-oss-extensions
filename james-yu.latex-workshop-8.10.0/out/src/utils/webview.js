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
const path = __importStar(require("path"));
function replaceWebviewPlaceholders(content, extension, webview) {
    const resourcesFolder = path.join(extension.extensionRoot, 'resources');
    const filePath = vscode.Uri.file(resourcesFolder);
    const link = webview.asWebviewUri(filePath).toString();
    return content.replace(/%VSCODE_RES%/g, link)
        .replace(/%VSCODE_CSP%/g, webview.cspSource);
}
exports.replaceWebviewPlaceholders = replaceWebviewPlaceholders;
//# sourceMappingURL=webview.js.map