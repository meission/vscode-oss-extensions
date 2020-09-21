"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ChildProcess = require("child_process");
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const events_1 = require("events");
const dlangui_1 = require("./dlangui");
const installer_1 = require("./installer");
const extension_1 = require("./extension");
var async = require("async");
var LineByLineReader = require('line-by-line');
function byteOffsetAt(editor, pos) {
    return Buffer.byteLength(editor.getText(new vscode.Range(new vscode.Position(0, 0), pos)), "utf8");
}
function positionFromByteOffset(editor, byteOff) {
    return editor.positionAt(new Buffer(editor.getText()).slice(0, byteOff).toString("utf8").length);
}
const mixinRegex = /-mixin-\d+$/;
const importRegex = /import ([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)?/;
const undefinedIdentifier = /^undefined identifier '(\w+)'(?:, did you mean .*? '(\w+)'\?)?$/;
const undefinedTemplate = /template '(\w+)' is not defined/;
const moduleRegex = /module\s+([a-zA-Z_]\w*\s*(?:\s*\.\s*[a-zA-Z_]\w*)*)\s*;/;
function fixPath(pathStr, projectRoot, stringImportPaths) {
    var match = mixinRegex.exec(pathStr);
    if (match)
        pathStr = pathStr.slice(0, -match[0].length);
    var absPath = path.isAbsolute(pathStr) ? pathStr : path.join(projectRoot, pathStr);
    if (pathStr.endsWith(".d"))
        pathStr = absPath;
    else if (!path.isAbsolute(pathStr)) {
        var found = false;
        for (var i = 0; i < stringImportPaths.length; i++) {
            var importPath = stringImportPaths[i];
            if (!path.isAbsolute(importPath))
                importPath = path.join(projectRoot, importPath);
            var modPath = path.join(importPath, pathStr);
            if (fs.existsSync(modPath)) {
                pathStr = modPath;
                found = true;
                break;
            }
        }
        if (!found)
            pathStr = absPath;
    }
    else
        pathStr = absPath;
    return pathStr;
}
exports.TARGET_VERSION = [2, 9, 1];
class WorkspaceD extends events_1.EventEmitter {
    constructor(projectRoot, processEnv) {
        super();
        this.projectRoot = projectRoot;
        this.processEnv = processEnv;
        this.workspaced = true;
        this.dubReady = false;
        this.dcdReady = false;
        this.dfmtReady = false;
        this.dlanguiReady = false;
        this.importerReady = false;
        this.dscannerReady = false;
        this.shouldRestart = true;
        this.requestNum = 0;
        this.scanTypes = {
            g: vscode.SymbolKind.Enum,
            e: vscode.SymbolKind.Field,
            v: vscode.SymbolKind.Variable,
            i: vscode.SymbolKind.Interface,
            c: vscode.SymbolKind.Class,
            s: vscode.SymbolKind.Class,
            f: vscode.SymbolKind.Function,
            u: vscode.SymbolKind.Class,
            T: vscode.SymbolKind.Property,
            a: vscode.SymbolKind.Field
        };
        this.types = {
            c: vscode.CompletionItemKind.Class,
            i: vscode.CompletionItemKind.Interface,
            s: vscode.CompletionItemKind.Unit,
            u: vscode.CompletionItemKind.Unit,
            v: vscode.CompletionItemKind.Variable,
            m: vscode.CompletionItemKind.Field,
            k: vscode.CompletionItemKind.Keyword,
            f: vscode.CompletionItemKind.Function,
            g: vscode.CompletionItemKind.Enum,
            e: vscode.CompletionItemKind.Field,
            P: vscode.CompletionItemKind.Module,
            M: vscode.CompletionItemKind.Module,
            a: vscode.CompletionItemKind.Variable,
            A: vscode.CompletionItemKind.Variable,
            l: vscode.CompletionItemKind.Reference,
            t: vscode.CompletionItemKind.Property,
            T: vscode.CompletionItemKind.Property,
        };
        let self = this;
        this.on("error", function (err) {
            console.error(err);
            if (this.shouldRestart)
                self.ensureDCDRunning();
        });
        this.startWorkspaceD();
    }
    startWorkspaceD() {
        if (!this.shouldRestart)
            return;
        let self = this;
        this.workspaced = true;
        let path = extension_1.config().get("workspacedPath", "workspace-d");
        this.instance = ChildProcess.spawn(path, [], { cwd: this.projectRoot, env: this.processEnv });
        this.totalData = new Buffer(0);
        this.instance.stderr.on("data", function (chunk) {
            console.log("WorkspaceD Debug: " + chunk);
            if (chunk.toString().indexOf("DCD-Server stopped with code") != -1)
                self.ensureDCDRunning();
        });
        this.instance.stdout.on("data", function (chunk) {
            self.handleData.call(self, chunk);
        });
        this.instance.on("error", function (err) {
            console.log("WorkspaceD ended with an error:");
            console.log(err);
            if (err && err.code == "ENOENT") {
                vscode.window.showErrorMessage(extension_1.localize("d.ext.workspacedENOENT", "workspace-d is not installed or points to a folder"), extension_1.localize("d.ext.workspacedENOENT.install", "Install workspace-d"), extension_1.localize("d.ext.openUserSettings", "Open User Settings"), extension_1.localize("d.ext.workspacedENOENT.retry", "Retry")).then(s => {
                    if (s == extension_1.localize("d.ext.workspacedENOENT.retry", "Retry"))
                        self.startWorkspaceD.call(self);
                    else if (s == extension_1.localize("d.ext.openUserSettings", "Open User Settings"))
                        vscode.commands.executeCommand("workbench.action.openGlobalSettings");
                    else if (s == extension_1.localize("d.ext.workspacedENOENT.install", "Install workspace-d"))
                        installer_1.installWorkspaceD(self.processEnv);
                });
                self.workspaced = false;
            }
        });
        this.instance.on("exit", function (code) {
            console.log("WorkspaceD ended with code " + code);
            vscode.window.showWarningMessage(extension_1.localize("d.ext.workspacedCrash", "workspace-d crashed. Please kill dcd-server if neccessary!"), extension_1.localize("d.ext.workspaced.restart", "Restart")).then(s => {
                if (s == extension_1.localize("d.ext.workspaced.restart", "Restart"))
                    self.startWorkspaceD.call(self);
            });
        });
        this.emit("workspace-d-start");
        this.checkVersion();
    }
    provideCompletionItems(document, position, token) {
        let self = this;
        console.log("provideCompletionItems");
        return new Promise((resolve, reject) => {
            if (!self.dcdReady)
                return resolve([]);
            let offset = byteOffsetAt(document, position);
            self.request({ cmd: "dcd", subcmd: "list-completion", code: document.getText(), pos: offset }).then((completions) => {
                if (completions.type == "identifiers") {
                    let items = [];
                    if (completions.identifiers && completions.identifiers.length)
                        completions.identifiers.forEach(element => {
                            let item = new vscode.CompletionItem(element.identifier);
                            item.kind = self.types[element.type] || vscode.CompletionItemKind.Text;
                            items.push(item);
                        });
                    console.log("resolve");
                    console.log(items);
                    resolve(items);
                }
                else {
                    console.log("resolve null");
                    resolve([]);
                }
            }, reject);
        });
    }
    provideCodeActions(document, range, context, token) {
        var match;
        for (var i = context.diagnostics.length - 1; i >= 0; i--) {
            if (context.diagnostics[i].message.indexOf("import ") != -1) {
                match = importRegex.exec(context.diagnostics[i].message);
                if (!match)
                    continue;
                return Promise.resolve([{
                        title: extension_1.localize("d.ext.importModule", "Import {0}", match[1]),
                        command: "code-d.addImport",
                        arguments: [match[1], document.offsetAt(range.start)]
                    }]);
            }
            else if ((match = undefinedIdentifier.exec(context.diagnostics[i].message))
                || (match = undefinedTemplate.exec(context.diagnostics[i].message))) {
                if (!this.dscannerReady)
                    return;
                var rets = [];
                // Soon™
                /*if (match[2])
                    rets.push({
                        title: "Change to " + match[2],
                        command: "code-d.renameSymbol",
                        arguments: [match[2], document.offsetAt(range.start), document.offsetAt(range.end)]
                    });*/
                return new Promise((resolve) => {
                    var file = document.fileName;
                    if (!path.isAbsolute(file))
                        file = path.normalize(path.join(this.projectRoot, file));
                    this.request({ cmd: "dscanner", subcmd: "find-symbol", symbol: match[1] }).then((data) => {
                        var modules = [];
                        async.eachSeries(data, (item, callback) => {
                            if (!path.isAbsolute(item.file))
                                item.file = path.normalize(path.join(this.projectRoot, item.file));
                            if (item.file == file)
                                return callback(null);
                            var lr = new LineByLineReader(item.file);
                            var line = 0;
                            lr.on("line", function (line) {
                                var match = moduleRegex.exec(line);
                                if (match) {
                                    modules.push(match[1].replace(/\s+/g, ""));
                                    callback(null);
                                    lr.close();
                                }
                                else {
                                    line++;
                                    if (line > 100) {
                                        lr.close();
                                        callback(null);
                                    }
                                }
                            });
                        }, () => {
                            for (var i = 0; i < modules.length; i++) {
                                rets.push({
                                    title: extension_1.localize("d.ext.importModule", "Import {0}", modules[i]),
                                    command: "code-d.addImport",
                                    arguments: [modules[i], document.offsetAt(range.start)]
                                });
                            }
                            resolve(rets);
                        });
                    });
                });
            }
        }
        return Promise.resolve([]);
    }
    extractFunctionParameters(sig) {
        let params = [];
        let i = sig.length - 1;
        if (sig[i] == ')')
            i -= 1;
        let paramEnd = i;
        let skip = (open, close) => {
            i -= 1;
            let depth = 1;
            while (i < 0 && depth > 0) {
                if (sig[i] == open) {
                    depth += 1;
                }
                else if (sig[i] == close) {
                    depth -= 1;
                }
                i -= 1;
            }
        };
        while (i >= 0) {
            switch (sig[i]) {
                case ',':
                    params.push(sig.substr(i + 1, paramEnd - i).trim());
                    i -= 1;
                    paramEnd = i;
                    break;
                case ';':
                case '(':
                    let param = sig.substr(i + 1, paramEnd - i).trim();
                    if (param.length != 0)
                        params.push(param);
                    return params.reverse();
                case ')':
                    skip(')', '(');
                    break;
                case '}':
                    skip('}', '{');
                    break;
                case ']':
                    skip(']', '[');
                    break;
                default:
                    i -= 1;
            }
        }
        return params;
    }
    provideSignatureHelp(document, position, token) {
        let self = this;
        console.log("provideSignatureHelp");
        return new Promise((resolve, reject) => {
            if (!self.dcdReady)
                return resolve(null);
            let offset = byteOffsetAt(document, position);
            self.request({ cmd: "dcd", subcmd: "list-completion", code: document.getText(), pos: offset }).then((completions) => {
                if (completions.type == "calltips") {
                    let help = new vscode.SignatureHelp();
                    if (completions.calltips && completions.calltips.length) {
                        let paramsCounts = [];
                        completions.calltips.forEach(element => {
                            let sig = new vscode.SignatureInformation(element);
                            let params = self.extractFunctionParameters(element);
                            paramsCounts.push(params.length - 1);
                            params.forEach(param => {
                                sig.parameters.push(new vscode.ParameterInformation(param));
                            });
                            help.signatures.push(sig);
                        });
                        let text = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
                        let extractedParams = self.extractFunctionParameters(text);
                        help.activeParameter = Math.max(0, extractedParams.length - 1);
                        let possibleFunctions = [];
                        for (var i = 0; i < paramsCounts.length; i++) {
                            if (paramsCounts[i] >= extractedParams.length - 1)
                                possibleFunctions.push(i);
                        }
                        help.activeSignature = possibleFunctions[0] || 0;
                    }
                    console.log("resolve");
                    resolve(help);
                }
                else {
                    console.log("resolve null");
                    resolve(null);
                }
            }, reject);
        });
    }
    provideWorkspaceSymbols(query, token) {
        let self = this;
        console.log("provideWorkspaceSymbols");
        return new Promise((resolve, reject) => {
            if (!self.dcdReady)
                return resolve([]);
            self.request({ cmd: "dcd", subcmd: "search-symbol", query: query }).then((symbols) => {
                let found = [];
                if (symbols && symbols.length)
                    symbols.forEach(element => {
                        let type = self.types[element.type] || vscode.CompletionItemKind.Text;
                        let range = new vscode.Range(1, 1, 1, 1);
                        let uri = vscode.Uri.file(element.file);
                        vscode.workspace.textDocuments.forEach(doc => {
                            if (doc.uri.fsPath == uri.fsPath) {
                                range = doc.getWordRangeAtPosition(positionFromByteOffset(doc, element.position));
                            }
                        });
                        let entry = new vscode.SymbolInformation(query, type, range, uri);
                        if (entry && range)
                            found.push(entry);
                    });
                console.log("resolve");
                console.log(found);
                resolve(found);
            }, reject);
        });
    }
    provideDocumentSymbols(document, token) {
        let self = this;
        console.log("provideDocumentSymbols");
        return new Promise((resolve, reject) => {
            if (!self.dscannerReady)
                return resolve([]);
            self.request({ cmd: "dscanner", subcmd: "list-definitions", file: document.uri.fsPath }).then(definitions => {
                let informations = [];
                if (definitions && definitions.length)
                    definitions.forEach(element => {
                        let container = undefined;
                        let range = new vscode.Range(element.line - 1, 0, element.line - 1, 0);
                        let type = self.scanTypes[element.type];
                        if (element.type == "f" && element.name == "this")
                            type = vscode.SymbolKind.Constructor;
                        if (element.attributes.struct)
                            container = element.attributes.struct;
                        if (element.attributes.class)
                            container = element.attributes.class;
                        if (element.attributes.enum)
                            container = element.attributes.enum;
                        if (element.attributes.union)
                            container = element.attributes.union;
                        informations.push(new vscode.SymbolInformation(element.name, type, range, document.uri, container));
                    });
                console.log("resolve");
                console.log(informations);
                resolve(informations);
            }, reject);
        });
    }
    provideHover(document, position, token) {
        let self = this;
        console.log("provideHover");
        return new Promise((resolve, reject) => {
            if (!self.dcdReady)
                return resolve(null);
            let offset = byteOffsetAt(document, position);
            self.request({ cmd: "dcd", subcmd: "get-documentation", code: document.getText(), pos: offset }).then((documentation) => {
                if (!documentation || documentation.trim().length == 0) {
                    console.log("resolve null");
                    return resolve(null);
                }
                console.log("resolve");
                console.log(new vscode.Hover({ language: "ddoc", value: documentation.trim() }));
                resolve(new vscode.Hover({ language: "ddoc", value: documentation.trim() }));
            }, reject);
        });
    }
    provideDefinition(document, position, token) {
        let self = this;
        console.log("provideDefinition");
        return new Promise((resolve, reject) => {
            if (!self.dcdReady)
                return resolve(null);
            let offset = byteOffsetAt(document, position);
            self.request({ cmd: "dcd", subcmd: "find-declaration", code: document.getText(), pos: offset }).then((declaration) => {
                if (!declaration) {
                    console.log("Resolve null");
                    return resolve(null);
                }
                let range = new vscode.Range(1, 1, 1, 1);
                let uri = document.uri;
                if (declaration[0] != "stdin")
                    uri = vscode.Uri.file(declaration[0]);
                vscode.workspace.textDocuments.forEach(doc => {
                    if (doc.uri.fsPath == uri.fsPath) {
                        let pos = positionFromByteOffset(doc, declaration[1]);
                        if (!pos)
                            pos = new vscode.Position(1, 1);
                        range = doc.getWordRangeAtPosition(pos);
                        if (!range)
                            range = new vscode.Range(pos, pos);
                    }
                });
                if (!range)
                    range = new vscode.Range(1, 1, 1, 1);
                console.log("resolve");
                console.log(new vscode.Location(uri, range));
                resolve(new vscode.Location(uri, range));
            }, reject);
        });
    }
    provideDocumentFormattingEdits(document, options, token) {
        let self = this;
        console.log("provideDocumentFormattingEdits");
        return new Promise((resolve, reject) => {
            if (!self.dfmtReady)
                return resolve([]);
            var request = {
                cmd: "dfmt",
                code: document.getText()
            };
            if (extension_1.config().get("overrideDfmtEditorconfig", true)) {
                var dfmt = vscode.workspace.getConfiguration("dfmt");
                var maxLineLength = 120;
                var softMaxLineLength = 80;
                var rulers = vscode.workspace.getConfiguration("editor").get("rulers", []);
                if (rulers.length == 1) {
                    maxLineLength = rulers[0];
                    softMaxLineLength = maxLineLength - 40;
                }
                else if (rulers.length >= 2) {
                    maxLineLength = rulers[rulers.length - 1];
                    softMaxLineLength = rulers[rulers.length - 2];
                }
                request.arguments = [
                    "--align_switch_statements", dfmt.get("alignSwitchStatements", true).toString(),
                    "--brace_style", dfmt.get("braceStyle", "allman"),
                    "--end_of_line", document.getText(document.lineAt(0).rangeIncludingLineBreak).endsWith("\r\n") ? "crlf" : "lf",
                    "--indent_size", options.tabSize.toString(),
                    "--indent_style", options.insertSpaces ? "space" : "tab",
                    "--max_line_length", maxLineLength.toString(),
                    "--soft_max_line_length", softMaxLineLength.toString(),
                    "--outdent_attributes", dfmt.get("outdentAttributes", true).toString(),
                    "--space_after_cast", dfmt.get("spaceAfterCast", true).toString(),
                    "--split_operator_at_line_end", dfmt.get("splitOperatorAtLineEnd", false).toString(),
                    "--tab_width", options.tabSize.toString(),
                    "--selective_import_space", dfmt.get("selectiveImportSpace", true).toString(),
                    "--compact_labeled_statements", dfmt.get("compactLabeledStatements", true).toString(),
                    "--template_constraint_style", dfmt.get("templateConstraintStyle", "conditional_newline_indent")
                ];
            }
            self.request(request).then((formatted) => {
                let lastLine = document.lineCount;
                let lastLineLastCol = document.lineAt(lastLine - 1).range.end.character;
                let range = new vscode.Range(0, 0, lastLine - 1, lastLineLastCol);
                console.log("resolve");
                console.log([new vscode.TextEdit(range, formatted)]);
                resolve([new vscode.TextEdit(range, formatted)]);
            }, reject);
        });
    }
    lint(document) {
        let self = this;
        console.log("lint");
        return new Promise((resolve, reject) => {
            if (!self.dscannerReady)
                return resolve([]);
            let useProjectIni = fs.existsSync(path.join(self.projectRoot, "dscanner.ini"));
            let ini = useProjectIni ? path.join(self.projectRoot, "dscanner.ini") : "";
            self.request({ cmd: "dscanner", subcmd: "lint", file: document.uri.fsPath, ini: ini }).then((issues) => {
                let diagnostics = [];
                if (issues && issues.length)
                    issues.forEach(element => {
                        let range;
                        var match;
                        if (match = /^Line is longer than (\d+) characters$/.exec(element.description)) {
                            range = new vscode.Range(Math.max(0, element.line - 1), parseInt(match[1]), Math.max(0, element.line - 1), 1000);
                        }
                        else
                            range = document.getWordRangeAtPosition(new vscode.Position(Math.max(0, element.line - 1), element.column));
                        if (!range || !range.start)
                            range = new vscode.Range(Math.max(0, element.line - 1), element.column, Math.max(0, element.line - 1), element.column + 1);
                        console.log(range);
                        if (range)
                            diagnostics.push(new vscode.Diagnostic(range, element.description, self.mapLintType(element.type)));
                    });
                console.log("Resolve");
                console.log([[document.uri, diagnostics]]);
                resolve([[document.uri, diagnostics]]);
            }, reject);
        });
    }
    dubBuild(document) {
        console.log("dubBuild");
        return new Promise((resolve, reject) => {
            if (!this.dubReady)
                return resolve([]);
            this.listStringImports().then((stringImportPaths) => {
                this.request({ cmd: "dub", subcmd: "build" }).then((issues) => {
                    let diagnostics = [];
                    if (issues && issues.length)
                        issues.forEach(element => {
                            let range = new vscode.Range(Math.max(0, element.line - 1), element.column - 1, Math.max(0, element.line - 1), element.column + 500);
                            let uri = vscode.Uri.file(fixPath(element.file, this.projectRoot, stringImportPaths));
                            let error = new vscode.Diagnostic(range, element.text, this.mapDubLintType(element.type));
                            let found = false;
                            diagnostics.forEach(element => {
                                if (element[0].fsPath == uri.fsPath) {
                                    found = true;
                                    element[1].push(error);
                                }
                            });
                            if (!found)
                                diagnostics.push([uri, [error]]);
                        });
                    console.log("Resolve");
                    console.log(diagnostics);
                    resolve(diagnostics);
                });
            });
        });
    }
    dispose() {
        this.shouldRestart = false;
        console.log("Disposing");
        let to = setTimeout(this.instance.kill, 150);
        this.request({ cmd: "unload", components: "*" }).then((data) => {
            console.log("Unloaded");
            this.instance.kill();
            clearTimeout(to);
        });
    }
    upgrade() {
        return this.request({ cmd: "dub", subcmd: "upgrade" });
    }
    addImport(code, name, location) {
        return this.request({ cmd: "importer", subcmd: "add", "importName": name, "code": code, "pos": location });
    }
    listConfigurations() {
        return this.request({ cmd: "dub", subcmd: "list:configurations" });
    }
    getConfiguration() {
        return this.request({ cmd: "dub", subcmd: "get:configuration" });
    }
    setConfiguration(config) {
        return this.request({ cmd: "dub", subcmd: "set:configuration", configuration: config }).then((success) => {
            if (success) {
                this.listImports().then(console.log);
                this.emit("configuration-change", config);
                if (this.dcdReady) {
                    this.request({ cmd: "dcd", subcmd: "refresh-imports" }).then(() => {
                        console.log("Updated completion for dcd");
                    });
                }
            }
            else
                vscode.window.showInformationMessage(extension_1.localize("d.ext.noImportPaths.project", "No import paths available for this project. Autocompletion could be broken!"), extension_1.localize("d.action.switchConfiguration", "Switch Configuration")).then((s) => {
                    if (s == extension_1.localize("d.action.switchConfiguration", "Switch Configuration")) {
                        vscode.commands.executeCommand("code-d.switchConfiguration");
                    }
                });
            return success;
        });
    }
    getCompiler() {
        return this.request({ cmd: "dub", subcmd: "get:compiler" });
    }
    setCompiler(comp) {
        return this.request({ cmd: "dub", subcmd: "set:compiler", compiler: comp }).then((success) => {
            if (success) {
                this.listImports().then(console.log);
                this.getCompiler().then(comp => this.emit("compiler-change", comp));
                if (this.dcdReady) {
                    this.request({ cmd: "dcd", subcmd: "refresh-imports" }).then(() => {
                        console.log("Updated completion for dcd");
                    });
                }
            }
            else
                vscode.window.showErrorMessage(extension_1.localize("d.ext.compilerFail", "Could not switch compiler"), extension_1.localize("d.action.switchCompiler", "Switch Compiler")).then((s) => {
                    if (s == extension_1.localize("d.action.switchCompiler", "Switch Compiler")) {
                        vscode.commands.executeCommand("code-d.switchCompiler");
                    }
                });
            return success;
        });
    }
    listArchTypes() {
        return this.request({ cmd: "dub", subcmd: "list:arch-types" });
    }
    getArchType() {
        return this.request({ cmd: "dub", subcmd: "get:arch-type" });
    }
    setArchType(arch) {
        return this.request({ cmd: "dub", subcmd: "set:arch-type", "arch-type": arch }).then((success) => {
            if (success)
                this.emit("arch-type-change", arch);
            else
                vscode.window.showInformationMessage(extension_1.localize("d.ext.archFail", "Could not switch arch type"), extension_1.localize("d.action.switchArchType", "Switch Arch Type")).then((s) => {
                    if (s == extension_1.localize("d.action.switchArchType", "Switch Arch Type")) {
                        vscode.commands.executeCommand("code-d.switchArchType");
                    }
                });
            return success;
        }, (err) => {
            console.error(err);
            vscode.window.showErrorMessage(extension_1.localize("d.ext.ultimateArchFail", "Failed to switch arch type. See console for details."));
            return false;
        });
    }
    listBuildTypes() {
        return this.request({ cmd: "dub", subcmd: "list:build-types" });
    }
    getBuildType() {
        return this.request({ cmd: "dub", subcmd: "get:build-type" });
    }
    setBuildType(config) {
        return this.request({ cmd: "dub", subcmd: "set:build-type", "build-type": config }).then((success) => {
            if (success) {
                this.request({ cmd: "dub", subcmd: "list:import" }).then(console.log);
                this.emit("build-type-change", config);
            }
            else
                vscode.window.showInformationMessage(extension_1.localize("d.ext.noImportPaths.buildType", "No import paths available for this build type. Autocompletion could be broken!"), extension_1.localize("d.action.switchBuildType", "Switch Build Type")).then((s) => {
                    if (s == extension_1.localize("d.action.switchBuildType", "Switch Build Type")) {
                        vscode.commands.executeCommand("code-d.switchBuildType");
                    }
                });
            return success;
        });
    }
    killServer() {
        if (!this.dcdReady)
            return new Promise((resolve, reject) => { reject(); });
        return this.request({ cmd: "dcd", subcmd: "kill-server" });
    }
    restartServer() {
        if (!this.dcdReady)
            return new Promise((resolve, reject) => { reject(); });
        return this.request({ cmd: "dcd", subcmd: "restart-server" });
    }
    updateImports() {
        return new Promise((resolve, reject) => {
            if (!this.dubReady)
                reject();
            this.request({ cmd: "dub", subcmd: "update" }).then((success) => {
                if (!success)
                    return resolve(success);
                if (this.dcdReady) {
                    this.request({ cmd: "dcd", subcmd: "refresh-imports" }).then(() => {
                        resolve(true);
                        this.listImports().then(console.log);
                    }, reject);
                }
                else {
                    vscode.window.showWarningMessage(extension_1.localize("d.ext.dcdUpdateFail", "Could not update DCD. Please restart DCD if its not working properly"));
                    resolve(true);
                }
            }, reject);
        });
    }
    listImports() {
        if (!this.dubReady)
            return new Promise((resolve, reject) => { resolve([]); });
        return this.request({ cmd: "dub", subcmd: "list:import" });
    }
    listStringImports() {
        if (!this.dubReady)
            return new Promise((resolve, reject) => { resolve([]); });
        return this.request({ cmd: "dub", subcmd: "list:string-import" });
    }
    getDlangUI(subs) {
        var decoType = vscode.window.createTextEditorDecorationType({});
        subs.push(decoType);
        var handler = new dlangui_1.DlangUIHandler(this, decoType);
        vscode.workspace.onDidChangeTextDocument(e => handler.fileUpdate(e));
        return handler;
    }
    mapLintType(type) {
        switch (type) {
            case "warn":
                return vscode.DiagnosticSeverity.Warning;
            case "error":
            default:
                return vscode.DiagnosticSeverity.Error;
        }
    }
    mapDubLintType(type) {
        switch (type) {
            case 2:
                return vscode.DiagnosticSeverity.Information;
            case 1:
                return vscode.DiagnosticSeverity.Warning;
            case 0:
            default:
                return vscode.DiagnosticSeverity.Error;
        }
    }
    checkResponsiveness() {
        return new Promise((resolve) => {
            var unresponsiveTimeout = setTimeout(() => {
                vscode.window.showWarningMessage(extension_1.localize("d.ext.workspacedUnresponsive", "workspace-d is unresponsive. Auto completion could be broken!"), extension_1.localize("d.ext.workspaced.restart", "Restart")).then(s => {
                    if (s == extension_1.localize("d.ext.workspaced.restart", "Restart")) {
                        this.shouldRestart = true;
                        try {
                            process.kill(-this.instance.pid);
                        }
                        catch (e) {
                            vscode.window.showErrorMessage(extension_1.localize("d.ext.workspacedUnkillable", "Could not kill workspace-d. Please manually kill it! PID: {0}", this.instance.pid));
                        }
                        this.startWorkspaceD();
                    }
                });
                resolve(false);
            }, 10 * 1000);
            this.request({ cmd: "version" }).then(version => {
                clearTimeout(unresponsiveTimeout);
                resolve(true);
            });
        });
    }
    checkVersion() {
        var installNewest = extension_1.localize("d.ext.workspacedOutdated.install", "Install newest version");
        let callback = (r) => {
            if (r == installNewest)
                installer_1.installWorkspaceD(this.processEnv);
        };
        this.request({ cmd: "version" }).then((version) => {
            console.log("workspace-d version: " + formatVersion([version.major, version.minor, version.patch]));
            if (version.major < exports.TARGET_VERSION[0])
                return vscode.window.showErrorMessage(extension_1.localize("d.ext.workspacedOutdated.major", "workspace-d is outdated! Please update to continue using this plugin. (target={0}, workspaced={1})", formatVersion(exports.TARGET_VERSION), formatVersion([version.major, version.minor, version.patch])), installNewest).then(callback);
            if (version.major == exports.TARGET_VERSION[0] && version.minor < exports.TARGET_VERSION[1])
                vscode.window.showWarningMessage(extension_1.localize("d.ext.workspacedOutdated.minor", "workspace-d might be outdated! Please update if things are not working as expected. (target={0}, workspaced={1})", formatVersion(exports.TARGET_VERSION), formatVersion([version.major, version.minor, version.patch])), installNewest).then(callback);
            if (version.major == exports.TARGET_VERSION[0] && version.minor == exports.TARGET_VERSION[1] && version.patch < exports.TARGET_VERSION[2])
                vscode.window.showInformationMessage(extension_1.localize("d.ext.workspacedOutdated.minor", "workspace-d has a new optional update! Please update before submitting a bug report. (target={0}, workspaced={1})", formatVersion(exports.TARGET_VERSION), formatVersion([version.major, version.minor, version.patch])), installNewest).then(callback);
            this.setupDub();
        }, () => {
            vscode.window.showErrorMessage(extension_1.localize("d.ext.workspacedOutdated.unknown", "Could not identify workspace-d version. Please update workspace-d!"), installNewest).then(callback);
        });
    }
    dubPackageDescriptorExists() {
        return fs.existsSync(path.join(this.projectRoot, "dub.json")) ||
            fs.existsSync(path.join(this.projectRoot, "dub.sdl")) ||
            fs.existsSync(path.join(this.projectRoot, "package.json"));
    }
    setupDub() {
        if (extension_1.config().get("neverUseDub", false)) {
            this.setupCustomWorkspace();
            return;
        }
        if (this.dubPackageDescriptorExists()) {
            this.request({ cmd: "load", components: ["dub"], dir: this.projectRoot }).then((data) => {
                console.log("dub is ready");
                this.dubReady = true;
                this.emit("dub-ready");
                this.setupDCD();
                this.setupDScanner();
                this.setupDfmt();
                this.setupDlangUI();
                this.setupImporter();
                this.listConfigurations().then((configs) => {
                    if (configs.length == 0) {
                        vscode.window.showInformationMessage(extension_1.localize("d.ext.noConfigurations.project", "No configurations available for this project. Autocompletion could be broken!"));
                    }
                    else {
                        var defaultConfig = extension_1.config().get("dubConfiguration", "");
                        if (defaultConfig) {
                            if (configs.indexOf(defaultConfig) == -1) {
                                vscode.window.showErrorMessage(extension_1.localize("d.ext.config.invalid.configuration", "Configuration '{0}' which is specified in the config is not available!", defaultConfig));
                                return this.setConfiguration(configs[0]);
                            }
                            else {
                                return this.setConfiguration(defaultConfig);
                            }
                        }
                        else {
                            return this.setConfiguration(configs[0]);
                        }
                    }
                }).then(success => {
                    console.log("Configuration: " + success);
                    var defaultArchType = extension_1.config().get("dubArchType", "");
                    var defaultBuildType = extension_1.config().get("dubBuildType", "");
                    var defaultCompiler = extension_1.config().get("dubCompiler", "");
                    if (defaultArchType) {
                        this.setArchType(defaultArchType).then(success => {
                            if (!success)
                                vscode.window.showErrorMessage(extension_1.localize("d.ext.config.invalid.archType", "Arch Type '{0}' which is specified in the config is not available!", defaultArchType));
                        });
                    }
                    if (defaultBuildType) {
                        this.setBuildType(defaultBuildType).then(success => {
                            if (!success)
                                vscode.window.showErrorMessage(extension_1.localize("d.ext.config.invalid.buildType", "Build Type '{0}' which is specified in the config is not available!", defaultBuildType));
                        });
                    }
                    if (defaultCompiler) {
                        this.setCompiler(defaultCompiler).then(success => {
                            if (!success)
                                vscode.window.showErrorMessage(extension_1.localize("d.ext.config.invalid.compiler", "Compiler '{0}' which is specified in the config is not available!", defaultCompiler));
                        });
                    }
                });
            }, (err) => {
                vscode.window.showWarningMessage(extension_1.localize("d.ext.dubFail", "Could not initialize dub. Falling back to limited functionality!"));
                this.setupCustomWorkspace();
            });
        }
        else
            this.setupCustomWorkspace();
    }
    getPossibleSourceRoots() {
        let confPaths = extension_1.config().get("projectImportPaths", []);
        if (confPaths && confPaths.length) {
            let roots = [];
            confPaths.forEach(p => {
                if (path.isAbsolute(p))
                    roots.push(p);
                else
                    roots.push(path.join(this.projectRoot, p));
            });
            return roots;
        }
        if (fs.existsSync(path.join(this.projectRoot, "source")))
            return [path.join(this.projectRoot, "source")];
        if (fs.existsSync(path.join(this.projectRoot, "src")))
            return [path.join(this.projectRoot, "src")];
        return [this.projectRoot];
    }
    setupCustomWorkspace() {
        let paths = this.getPossibleSourceRoots();
        let rootDir = paths[0];
        let addPaths = [];
        if (paths.length > 1)
            addPaths = paths.slice(1);
        this.request({ cmd: "load", components: ["fsworkspace"], dir: rootDir, additionalPaths: addPaths }).then((data) => {
            console.log("fsworkspace is ready");
            this.setupDCD();
            this.setupDScanner();
            this.setupDfmt();
            this.setupDlangUI();
            this.setupImporter();
        }, (err) => {
            vscode.window.showErrorMessage(extension_1.localize("d.ext.fsworkspaceFail", "Could not initialize fsworkspace. See console for details!"));
        });
    }
    setupDScanner() {
        this.request({ cmd: "load", components: ["dscanner"], dir: this.projectRoot, dscannerPath: extension_1.config().get("dscannerPath", "dscanner") }).then((data) => {
            console.log("DScanner is ready");
            this.emit("dscanner-ready");
            this.dscannerReady = true;
        });
    }
    setupDCD() {
        if (extension_1.config().get("enableAutoComplete", true))
            this.request({
                cmd: "load",
                components: ["dcd"],
                dir: this.projectRoot,
                autoStart: false,
                clientPath: extension_1.config().get("dcdClientPath", "dcd-client"),
                serverPath: extension_1.config().get("dcdServerPath", "dcd-server")
            }).then((data) => {
                this.startDCD();
            }, (err) => {
                vscode.window.showErrorMessage(extension_1.localize("d.ext.dcdFail", "Could not initialize DCD. See console for details!"));
            });
    }
    setupDfmt() {
        this.request({ cmd: "load", components: ["dfmt"], dir: this.projectRoot, dfmtPath: extension_1.config().get("dfmtPath", "dfmt") }).then((data) => {
            console.log("Dfmt is ready");
            this.emit("dfmt-ready");
            this.dfmtReady = true;
        });
    }
    setupDlangUI() {
        this.request({ cmd: "load", components: ["dlangui"] }).then((data) => {
            console.log("DlangUI is ready");
            this.emit("dlangui-ready");
            this.dlanguiReady = true;
        });
    }
    setupImporter() {
        this.request({ cmd: "load", components: ["importer"] }).then((data) => {
            console.log("Importer is ready");
            this.emit("importer-ready");
            this.importerReady = true;
        });
    }
    ensureDCDRunning() {
        if (!this.dcdReady)
            return;
        if (!this.shouldRestart)
            return;
        clearTimeout(this.runCheckTimeout);
        this.runCheckTimeout = setTimeout((() => {
            console.log("Checking status...");
            this.request({ cmd: "dcd", subcmd: "status" }).then((status) => {
                console.log("Status:");
                console.log(status);
                if (!status.isRunning) {
                    console.error("Restarting DCD");
                    this.startDCD();
                }
            });
        }).bind(this), 500);
    }
    startDCD() {
        this.request({
            cmd: "dcd",
            subcmd: "find-and-select-port",
            port: 9166
        }).then((data) => {
            this.request({ cmd: "dcd", subcmd: "start-server", additionalImports: vscode.workspace.getConfiguration("d").get("stdlibPath", ["/usr/include/dmd/druntime/import", "/usr/include/dmd/phobos"]) }).then((data) => {
                console.log("DCD is ready");
                this.emit("dcd-ready");
                this.dcdReady = true;
                if (this.dcdReady) {
                    this.request({ cmd: "dcd", subcmd: "refresh-imports" }).then(() => {
                        this.listImports().then((paths) => {
                            console.log("Loaded completions for " + paths.length + " import paths");
                        });
                    });
                }
                else {
                    vscode.window.showWarningMessage(extension_1.localize("d.ext.dcdUpdateFail", "Could not update DCD. Please restart DCD if its not working properly"));
                }
            }, (err) => {
                vscode.window.showErrorMessage(extension_1.localize("d.ext.dcdFail", "Could not initialize DCD. See console for details!"));
            });
        }, (err) => {
            vscode.window.showErrorMessage(extension_1.localize("d.ext.dcdFail", "Could not initialize DCD. See console for details!"));
        });
    }
    request(data, debug = false) {
        let lengthBuffer = new Buffer(4);
        let idBuffer = new Buffer(4);
        if (debug)
            console.log(data);
        let dataStr = JSON.stringify(data);
        lengthBuffer.writeInt32BE(Buffer.byteLength(dataStr, "utf8") + 4, 0);
        let reqID = this.requestNum++;
        idBuffer.writeInt32BE(reqID, 0);
        let buf = Buffer.concat([lengthBuffer, idBuffer, new Buffer(dataStr, "utf8")]);
        this.instance.stdin.write(buf);
        return new Promise((resolve, reject) => {
            this.once("res-" + reqID, function (error, data) {
                if (debug)
                    console.log(error, data);
                if (error)
                    reject(error);
                else
                    resolve(data);
            });
        });
    }
    handleData(chunk) {
        this.totalData = Buffer.concat([this.totalData, chunk]);
        while (this.handleChunks())
            ;
    }
    handleChunks() {
        if (this.totalData.length < 8)
            return false;
        let len = this.totalData.readInt32BE(0);
        if (this.totalData.length >= len + 4) {
            let id = this.totalData.readInt32BE(4);
            let buf = new Buffer(len - 4);
            this.totalData.copy(buf, 0, 8, 4 + len);
            let newBuf = new Buffer(this.totalData.length - 4 - len);
            this.totalData.copy(newBuf, 0, 4 + len);
            this.totalData = newBuf;
            let obj = JSON.parse(buf.toString());
            if (typeof obj == "object" && obj && obj["error"]) {
                this.emit("error", obj);
                this.emit("res-" + id, obj);
            }
            else
                this.emit("res-" + id, null, obj);
            return true;
        }
        return false;
    }
}
exports.WorkspaceD = WorkspaceD;
function formatVersion(version) {
    return version[0] + "." + version[1] + "." + version[2];
}
//# sourceMappingURL=workspace-d.js.map