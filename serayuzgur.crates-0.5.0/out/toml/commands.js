"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAll = exports.reload = exports.replaceVersion = exports.status = void 0;
/**
 * Commands related to TOML files.
 */
const vscode_1 = require("vscode");
const listener_1 = require("./listener");
exports.status = {
    inProgress: false,
    replaceItems: [],
};
exports.replaceVersion = vscode_1.commands.registerTextEditorCommand("crates.replaceVersion", (editor, edit, info) => {
    if (editor && info && !exports.status.inProgress) {
        const { fileName } = editor.document;
        if (fileName.toLocaleLowerCase().endsWith("cargo.toml")) {
            exports.status.inProgress = true;
            console.log("Replacing", info.item);
            edit.replace(new vscode_1.Range(editor.document.positionAt(info.start + 1), editor.document.positionAt(info.end - 1)), info.item.substr(1, info.item.length - 2));
            exports.status.inProgress = false;
        }
    }
});
exports.reload = vscode_1.commands.registerTextEditorCommand("crates.retry", (editor, edit, info) => {
    if (editor) {
        listener_1.default(editor);
    }
});
exports.updateAll = vscode_1.commands.registerTextEditorCommand("crates.updateAll", (editor, edit) => {
    if (editor &&
        !exports.status.inProgress &&
        exports.status.replaceItems &&
        exports.status.replaceItems.length > 0 &&
        editor.document.fileName.toLocaleLowerCase().endsWith("cargo.toml")) {
        exports.status.inProgress = true;
        console.log("Replacing All");
        for (let i = exports.status.replaceItems.length - 1; i > -1; i--) {
            const rItem = exports.status.replaceItems[i];
            edit.replace(new vscode_1.Range(editor.document.positionAt(rItem.start), editor.document.positionAt(rItem.end)), rItem.item);
        }
        exports.status.inProgress = false;
        //Sometimes fails at the first time.
        editor.document.save().then(a => {
            if (!a) {
                editor.document.save();
            }
        });
    }
});
exports.default = { replaceVersion: exports.replaceVersion };
//# sourceMappingURL=commands.js.map