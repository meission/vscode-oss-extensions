"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const cmdDrawio_1 = require("./cmdDrawio");
console.log("init extension drawio");
// 初始化drawio
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    const setting = vscode.workspace.getConfiguration("drawio");
    // 检查并启动 drawio chrome 浏览器
    console.log("setting:", setting.get("assetsDirName"));
    context.subscriptions.push(cmdDrawio_1.cmdDrawio);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map