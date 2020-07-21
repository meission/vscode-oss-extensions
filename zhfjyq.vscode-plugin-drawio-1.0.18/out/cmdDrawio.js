"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const DrawioChrome_1 = require("./DrawioChrome");
const path = require("path");
const mdChrome = {};
// 注册文件关闭监听器，当md文档关闭后，关闭关联的chrome窗口
vscode.workspace.onDidCloseTextDocument((doc) => __awaiter(void 0, void 0, void 0, function* () {
    const docPath = doc.uri.fsPath;
    const chrome = mdChrome[docPath];
    if (chrome) {
        // 如果关闭，则关掉关联的chrome窗口
        yield chrome.close();
        delete mdChrome[docPath];
    }
}));
function _getCursorDrawioSvgName() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!vscode.window.activeTextEditor)
            return;
        const sel = vscode.window.activeTextEditor.selections;
        if (!sel || sel.length <= 0)
            return;
        const assetsDirName = vscode.workspace
            .getConfiguration("drawio")
            .get("assetsDirName");
        const line = vscode.window.activeTextEditor.document.lineAt(sel[0].anchor.line);
        const m = line.text.match(/\!\[.*\]\((.*)\)$/);
        console.log("line:", line.lineNumber, line.text, m);
        if (!m || m.length !== 2)
            return;
        const svgPath = m[1].trim();
        // 检测是否再assets目录下
        if (!svgPath.startsWith(assetsDirName)) {
            console.log(`svg file not in ${assetsDirName} dir`);
        }
        const name = path.parse(svgPath).base;
        console.log("using name:", name);
        // filename
        return name;
    });
}
exports.cmdDrawio = vscode.commands.registerCommand("extension.drawio", () => __awaiter(void 0, void 0, void 0, function* () {
    if (!vscode.window.activeTextEditor ||
        vscode.window.activeTextEditor.document.languageId !== "markdown") {
        vscode.window.showInformationMessage(`please open markdown file`);
        return;
    }
    // 获取mdfile，为每个目录的markdown打开一个chrome窗口
    const mdfile = vscode.window.activeTextEditor.document.uri.fsPath;
    const mdPath = path.parse(mdfile).dir;
    try {
        if (!mdChrome[mdPath] || mdChrome[mdPath].isClosed()) {
            mdChrome[mdPath] = new DrawioChrome_1.DrawioChrome(mdPath);
            // 等待初始化完成
            yield mdChrome[mdPath].init();
        }
        const chrome = mdChrome[mdPath];
        // 获取当前行所在的svg文件名
        const svgName = yield _getCursorDrawioSvgName();
        // 激活当前关联的chrome窗口
        yield chrome.active(svgName);
    }
    catch (e) {
        console.error("open chrome error:", e);
    }
}));
//# sourceMappingURL=cmdDrawio.js.map