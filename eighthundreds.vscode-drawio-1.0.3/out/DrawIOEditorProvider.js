"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const logger_1 = require("./logger");
const fileTypeFormateMap = {
    drawio: "svg",
    svg: "xmlsvg",
    png: "xmlpng",
};
const viewType = "vscode-drawio.editor";
class DrawIOEditorProvider {
    constructor(context) {
        this.context = context;
    }
    static register(context) {
        const provider = new DrawIOEditorProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(viewType, provider, {
            webviewOptions: {
                retainContextWhenHidden: true,
            },
        });
        return providerRegistration;
    }
    resolveCustomTextEditor(document, webviewPanel, token) {
        const drawIoAppRoot = path.join(this.context.extensionPath, "drawioApp");
        let indexContent = fs.readFileSync(path.join(drawIoAppRoot, "index.html"), "utf8");
        indexContent = indexContent.replace(/#vscode-root#/g, webviewPanel.webview.asWebviewUri(vscode.Uri.file(drawIoAppRoot)).toString());
        indexContent = indexContent.replace(/#init-localStorage#/, `vscode.setState(${this.context.workspaceState.get("drawio") || "{}"})`);
        indexContent = indexContent.replace(/#init-localStorage#/, "");
        webviewPanel.webview.html = indexContent;
        webviewPanel.webview.options = {
            enableScripts: true,
        };
        webviewPanel.webview.onDidReceiveMessage((e) => {
            if (e.type === "error") {
                return;
            }
            const data = e.data;
            logger_1.Logger.debug(`message from drawio:${JSON.stringify(data)}`);
            if (e.type === "data") {
                this.dataEventHandler(data, document, webviewPanel);
            }
            if (e.type === "setting") {
                this.settingEventHandler(data, document, webviewPanel);
            }
        });
    }
    dataEventHandler(data, document, webviewPanel) {
        if (data.event === "init") {
            webviewPanel.webview.postMessage({
                action: "load",
                autosave: 1,
                xml: this.loadContent(document),
            });
        }
        if (data.event === "save") {
            const fileType = getFileType(document);
            webviewPanel.webview.postMessage({
                action: "export",
                xml: data.xml,
                format: fileTypeFormateMap[fileType],
            });
        }
        if (data.event === "autosave") {
            this.updateDocument(document, data);
        }
        if (data.event === "export") {
            this.updateDocument(document, data, true);
        }
        if (data.event === "error") {
            logger_1.Logger.debug(`Error: ${JSON.stringify(data)}`);
        }
    }
    settingEventHandler(data, document, webviewPanel) {
        this.context.workspaceState.update("drawio", JSON.stringify(data || {}));
    }
    updateDocument(document, dataFromDrawIO, save) {
        const fileType = getFileType(document);
        const edit = new vscode.WorkspaceEdit();
        let newContent;
        switch (fileType) {
            case "png":
                if (!dataFromDrawIO.data) {
                    return;
                }
                newContent = dataFromDrawIO.data.substr("data:image/png;base64,".length);
                fs.writeFileSync(document.uri.fsPath, Buffer.from(newContent, "base64"));
                return;
            case "svg":
                if (!dataFromDrawIO.data) {
                    return;
                }
                newContent = dataFromDrawIO.data.substr("data:image/svg+xml;base64,".length);
                newContent = Buffer.from(newContent, "base64").toString();
                break;
            case "drawio":
                newContent = dataFromDrawIO.xml;
                break;
            default:
                break;
        }
        edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newContent);
        const editTask = vscode.workspace.applyEdit(edit);
        if (save) {
            editTask.then(() => {
                document.save();
            });
        }
    }
    loadContent(document) {
        const fileType = getFileType(document);
        const result = document.getText();
        switch (fileType) {
            case "drawio":
            case "svg":
                return result;
            case "png":
                return `data:image/png;base64,${result || ""}`;
            default:
                break;
        }
    }
}
exports.DrawIOEditorProvider = DrawIOEditorProvider;
function getFileType(document) {
    const fileExt = path.extname(document.fileName);
    const fileType = fileExt.replace(".", "");
    return fileType;
}
//# sourceMappingURL=DrawIOEditorProvider.js.map