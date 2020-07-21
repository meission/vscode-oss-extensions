"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
let _channel;
function getChannel() {
    if (!_channel) {
        _channel = vscode_1.window.createOutputChannel("DrawIOEditor");
    }
    return _channel;
}
class Logger {
    static debug(message) {
        if (process.env.NODE_ENV === "production"
            && !vscode_1.workspace.getConfiguration('vscode-drawio').get('debug')) {
            return;
        }
        getChannel().appendLine(`[DEBUG} - ${new Date()}] ${message}`);
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map