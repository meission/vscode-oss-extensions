'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
function isEmpty(obj) {
    for (var key in obj) {
        if (obj.hasOwnProperty(key))
            return false;
    }
    return true;
}
function activate(context) {
    console.log('"cmake-format" extension is now active!');
    let disposable = vscode.languages.registerDocumentFormattingEditProvider({ scheme: 'file', language: 'cmake' }, {
        provideDocumentFormattingEdits(document) {
            var fs = require('fs');
            var path = require('path');
            var config = vscode.workspace.getConfiguration('cmakeFormat');
            var exePath = config.get("exePath");
            var args = config.get("args", []);
            // NOTE(josh): in case the final user-supplied argument is a
            // nargs="*", we need to tell argparse that the next argument
            // ("-") is a positional argument. We do that by adding "--"
            // after the last user-supplied argument and before the "-"
            if (args[args.length - 1] != "--") {
                args = args.concat(["--"]);
            }
            args = args.concat(["-"]);
            var opts = {
                input: document.getText(),
                encoding: 'utf-8'
            };
            var cwd = config.get("cwd");
            if (cwd == null && document.uri.fsPath != null) {
                cwd = path.dirname(document.uri.fsPath);
                console.log("No cwd configured, using: " + cwd);
            }
            if (cwd == null) {
                var folder = vscode.workspace.getWorkspaceFolder(document.uri);
                if (folder != null) {
                    cwd = folder.uri.fsPath;
                    console.log("No cwd configured, using workspace path: " + cwd);
                }
            }
            if (cwd != null && fs.statSync(cwd).isDirectory()) {
                opts["cwd"] = cwd;
            }
            else {
                console.log("Can't use cwd: " + cwd);
            }
            var env = {};
            if (config.get("mergeEnv", true)) {
                env = JSON.parse(JSON.stringify(process.env));
            }
            var cenv = config.get("env", {});
            if (cenv !== null) {
                var delim = path.delimiter;
                for (var [key, value] of Object.entries(cenv)) {
                    if (key.endsWith("PATH")) {
                        var items = cenv[key].split(delim);
                        if (key in env) {
                            items = items.concat(env[key].split(delim));
                        }
                        env[key] = items.join(delim);
                    }
                    else {
                        env[key] = value;
                    }
                }
            }
            if (!isEmpty(env)) {
                opts["env"] = env;
            }
            const cp = require('child_process');
            // NOTE(josh): execFileSync will throw an Error if the
            // subprocess exits with non-zero status. The vscode GUI will
            // display the stacktrace in the corner.
            var replacementText = cp.execFileSync(exePath, args, opts);
            var firstLine = document.lineAt(0);
            var lastLine = document.lineAt(document.lineCount - 1);
            var wholeRange = new vscode.Range(0, firstLine.range.start.character, document.lineCount - 1, lastLine.range.end.character);
            return [vscode.TextEdit.replace(wholeRange, replacementText)];
        }
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map