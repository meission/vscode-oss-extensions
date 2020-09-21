"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const p = require("path");
class DubDependency extends vscode.TreeItem {
    constructor(info, command, icon) {
        super(typeof info == "string" ? info : info.name + ":  " + info.version, typeof info == "string" ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed);
        if (typeof info == "object") {
            this.info = info;
            this.iconPath = {
                light: p.join(__filename, "..", "..", "..", "images", "dependency-light.svg"),
                dark: p.join(__filename, "..", "..", "..", "images", "dependency-dark.svg")
            };
            this.command = {
                command: "code-d.viewDubPackage",
                title: "Open README",
                tooltip: "Open README",
                arguments: [info.path]
            };
            this.contextValue = info.root ? "root" : "dependency";
        }
        if (command)
            this.command = command;
        if (icon)
            this.iconPath = {
                light: p.join(__filename, "..", "..", "..", "images", icon + "-light.svg"),
                dark: p.join(__filename, "..", "..", "..", "images", icon + "-dark.svg")
            };
    }
}
exports.DubDependency = DubDependency;
//# sourceMappingURL=dub-view.js.map