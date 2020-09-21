"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
function getEditorUrl(uri) {
    return uri.with({
        scheme: "dubsettings",
        path: uri.path + ".editor",
        query: uri.toString()
    });
}
function isDubPackage(uri) {
    if (uri.scheme == "dubsettings")
        return false;
    let file = path.basename(uri.path).toLowerCase();
    return file == "dub.json" || file == "dub.sdl";
}
function copyFile(source, target, cb) {
    var cbCalled = false;
    var rd = fs.createReadStream(source);
    rd.on("error", function (err) {
        done(err);
    });
    var wr = fs.createWriteStream(target);
    wr.on("error", function (err) {
        done(err);
    });
    wr.on("close", function (ex) {
        done();
    });
    rd.pipe(wr);
    function done(err) {
        if (!cbCalled) {
            cb(err);
            cbCalled = true;
        }
    }
}
const pathSeparator = " >_> ";
function getPath(content, path) {
    var splits = path.split(pathSeparator);
    var scope = content;
    for (var i = 0; i < splits.length; i++) {
        if (scope === undefined)
            return undefined;
        var path = splits[i];
        if (path[0] == ":") {
            var eqIdx = path.indexOf("=");
            var key = path.substring(1, eqIdx);
            var value = path.substr(eqIdx + 1);
            for (var j = 0; j < scope.length; j++)
                if (scope[j][key] == value) {
                    scope = scope[j];
                    break;
                }
        }
        else
            scope = scope[path];
    }
    return scope;
}
function setPath(content, path, value) {
    var splits = path.split(pathSeparator);
    var scope = content;
    for (var i = 0; i < splits.length - 1; i++) {
        var path = splits[i];
        if (path[0] == ":") {
            if (scope === undefined)
                return;
            var eqIdx = path.indexOf("=");
            var key = path.substring(1, eqIdx);
            var val = path.substr(eqIdx + 1);
            for (var j = 0; j < scope.length; j++)
                if (scope[j][key] == val) {
                    scope = scope[j];
                    break;
                }
        }
        else {
            if (scope[splits[i]] === undefined)
                scope[splits[i]] = {};
            scope = scope[path];
        }
    }
    scope[splits[splits.length - 1]] = value;
    if (value === undefined)
        delete scope[splits[splits.length - 1]];
}
class DubEditor {
    constructor(context) {
        this.asyncTimeout = undefined;
        this.asyncStarted = false;
        this.editorPath = context.asAbsolutePath("html/dubeditor.html");
        this.editorTemplate = fs.readFileSync(this.editorPath, "utf8");
        context.subscriptions.push(vscode.commands.registerCommand("_dubedit.setValue", (arg) => {
            let uri = vscode.Uri.parse(arg.file);
            vscode.workspace.openTextDocument(uri).then(doc => {
                if (doc.isDirty) {
                    vscode.window.showErrorMessage("Please save or close all instances of this dub.json file and try again");
                    return;
                }
                var text = doc.getText();
                var jsonContent;
                clearTimeout(this.asyncTimeout);
                if (!this.asyncStarted) {
                    try {
                        jsonContent = JSON.parse(text.trim());
                    }
                    catch (e) {
                        vscode.window.showErrorMessage("dub.json is not a valid json file");
                        console.error(e);
                        return;
                    }
                    this.asyncBuffer = jsonContent;
                    this.asyncStarted = true;
                }
                setPath(this.asyncBuffer, arg.path, arg.value);
                this.asyncTimeout = setTimeout(() => {
                    this.asyncStarted = false;
                    this.updateDubJson(uri, this.asyncBuffer);
                }, 30);
                // avoid multiple writes on same file at once to avoid data loss
            });
        }));
    }
    updateDubJson(uri, content) {
        if (!content || typeof content !== "object")
            return vscode.window.showErrorMessage("Failed to generate dub.json");
        return fs.stat(uri.fsPath + ".bak", function (err, stats) {
            var prepareWrite = function (err) {
                var performWrite = function () {
                    fs.writeFile(uri.fsPath, JSON.stringify(content, null, "\t"), function (err) {
                        if (err) {
                            vscode.window.showErrorMessage("Failed to update dub.json");
                            console.error(err);
                        }
                    });
                };
                if (err)
                    vscode.window.showWarningMessage("Failed to backup dub.json", "Override without Backup").then(r => {
                        if (r == "Override without Backup")
                            performWrite();
                    });
                else
                    performWrite();
            };
            if (err || (new Date().getTime() - stats.ctime.getTime()) > 3000) //
                copyFile(uri.fsPath, uri.fsPath + ".bak", prepareWrite);
            else
                prepareWrite(undefined);
        });
    }
    provideTextDocumentContent(uri, token) {
        console.log("provideTextDocumentContent");
        return new Promise((resolve, reject) => {
            resolve(this.editorTemplate.replace("/* INJECT EDITOR */", `var dubFile = ${JSON.stringify(uri.query.toString())};
				var packageType = "json";`));
        });
    }
    open(file) {
        if (typeof file == "string")
            file = vscode.Uri.parse(file);
        if (!(file instanceof vscode.Uri)) {
            if (vscode.window.activeTextEditor) {
                file = vscode.window.activeTextEditor.document.uri;
                if (!isDubPackage(file)) {
                    var workspace = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri);
                    if (workspace)
                        file = vscode.Uri.file(path.join(workspace.uri.path, "dub.json"));
                }
            }
        }
        if (!(file instanceof vscode.Uri) || !isDubPackage(file))
            return undefined;
        return vscode.commands.executeCommand('vscode.previewHtml', getEditorUrl(file), undefined, `Dub Package`);
    }
    close(file) {
        if (!(file instanceof vscode.Uri)) {
            return vscode.commands.executeCommand('workbench.action.navigateBack');
        }
        const docUri = vscode.Uri.parse(file.query);
        for (let editor of vscode.window.visibleTextEditors) {
            if (editor.document.uri.toString() === docUri.toString()) {
                return vscode.window.showTextDocument(editor.document, editor.viewColumn);
            }
        }
        return vscode.workspace.openTextDocument(docUri).then(doc => {
            return vscode.window.showTextDocument(doc);
        });
    }
}
exports.DubEditor = DubEditor;
//# sourceMappingURL=dub-editor.js.map