"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DrawIOEditorProvider_1 = require("./DrawIOEditorProvider");
function activate(context) {
    context.subscriptions.push(DrawIOEditorProvider_1.DrawIOEditorProvider.register(context));
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map