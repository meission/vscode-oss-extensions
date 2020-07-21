"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusBarItem = void 0;
/**
 * A utility to manage Status Bar operations.
 */
const vscode_1 = require("vscode");
exports.statusBarItem = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left, 0);
exports.statusBarItem.text = "Crates: OK";
exports.statusBarItem.setText = (text) => (exports.statusBarItem.text = text ? `Crates: ${text}` : "Crates: OK");
exports.default = {
    statusBarItem: exports.statusBarItem,
};
//# sourceMappingURL=indicators.js.map