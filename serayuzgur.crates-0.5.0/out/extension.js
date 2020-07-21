"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
/**
 * This extension helps to manage crate dependency versions.
 */
const vscode_1 = require("vscode");
const listener_1 = require("./toml/listener");
const commands_1 = require("./toml/commands");
function activate(context) {
    // Add active text editor listener and run once on start.
    context.subscriptions.push(vscode_1.window.onDidChangeActiveTextEditor(listener_1.default));
    context.subscriptions.push(vscode_1.workspace.onDidChangeTextDocument((e) => {
        const { fileName } = e.document;
        if (!e.document.isDirty && fileName.toLocaleLowerCase().endsWith("cargo.toml")) {
            listener_1.default(vscode_1.window.activeTextEditor);
        }
    }));
    listener_1.default(vscode_1.window.activeTextEditor);
    // Add commands
    context.subscriptions.push(commands_1.default.replaceVersion);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map