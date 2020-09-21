"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const path = require("path");
const extension_1 = require("./extension");
var dubLoaded = false;
function setupDub(served) {
    let subscriptions = [new vscode.Disposable(() => { dubLoaded = false; })];
    if (dubLoaded)
        return new vscode.Disposable(() => { });
    dubLoaded = true;
    subscriptions.push(new ConfigSelector(served));
    subscriptions.push(new ArchSelector(served));
    subscriptions.push(new BuildSelector(served));
    subscriptions.push(new CompilerSelector(served));
    return vscode.Disposable.from(...subscriptions);
}
exports.setupDub = setupDub;
function isStatusbarRelevantDocument(document) {
    var language = document.languageId;
    if (language == "d" || language == "dml" || language == "diet")
        return true;
    var filename = path.basename(document.fileName.toLowerCase());
    if (filename == "dub.json" || filename == "dub.sdl")
        return true;
    return false;
}
exports.isStatusbarRelevantDocument = isStatusbarRelevantDocument;
function checkStatusbarVisibility(overrideConfig, editor) {
    if (editor === null) {
        if (extension_1.config(null).get(overrideConfig, false))
            return true;
        else
            return false;
    }
    else {
        if (!editor)
            editor = vscode.window.activeTextEditor;
        if (editor) {
            if (extension_1.config(editor.document.uri).get(overrideConfig, false) || isStatusbarRelevantDocument(editor.document))
                return true;
            else
                return false;
        }
        else {
            return false;
        }
    }
}
exports.checkStatusbarVisibility = checkStatusbarVisibility;
class GenericSelector {
    constructor(served, x, command, tooltip, event, method) {
        this.subscriptions = [];
        this.served = served;
        this.x = x;
        this.command = command;
        this.tooltip = tooltip;
        this.event = event;
        this.method = method;
        served.client.onReady().then(this.create.bind(this));
    }
    create() {
        this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, this.x);
        this.item.command = this.command;
        this.item.tooltip = this.tooltip;
        this.updateDocumentVisibility();
        this.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
            this.updateDocumentVisibility(editor || null);
        }));
        this.served.on(this.event, config => {
            if (this.item)
                this.item.text = config;
        });
        this.served.on("workspace-change", () => {
            this.update();
        });
        this.update();
    }
    updateDocumentVisibility(editor) {
        if (this.item) {
            if (checkStatusbarVisibility("alwaysShowDubStatusButtons", editor))
                this.item.show();
            else
                this.item.hide();
        }
    }
    update() {
        this.served.client.sendRequest(this.method).then(config => {
            if (this.item)
                this.item.text = config;
        });
    }
    dispose() {
        vscode.Disposable.from(...this.subscriptions).dispose();
    }
}
class ConfigSelector extends GenericSelector {
    constructor(served) {
        super(served, 0.92145, "code-d.switchConfiguration", "Switch Configuration", "config-change", "served/getConfig");
    }
}
class ArchSelector extends GenericSelector {
    constructor(served) {
        super(served, 0.92144, "code-d.switchArchType", "Switch Arch Type", "arch-type-change", "served/getArchType");
    }
}
class BuildSelector extends GenericSelector {
    constructor(served) {
        super(served, 0.92143, "code-d.switchBuildType", "Switch Build Type", "build-type-change", "served/getBuildType");
    }
}
class CompilerSelector extends GenericSelector {
    constructor(served) {
        super(served, 0.92142, "code-d.switchCompiler", "Switch Compiler", "compiler-change", "served/getCompiler");
    }
}
class StartupProgress {
    constructor() {
        this.startedGlobal = false;
    }
    startGlobal() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.startedGlobal)
                return;
            this.startedGlobal = true;
            vscode.window.withProgress({
                cancellable: false,
                location: vscode.ProgressLocation.Window,
                title: "D"
            }, (progress, token) => {
                this.progress = progress;
                return new Promise((resolve, reject) => {
                    this.resolve = resolve;
                    this.reject = reject;
                });
            });
        });
    }
    finishGlobal() {
        if (!this.startedGlobal)
            return;
        this.startedGlobal = false;
        if (this.resolve)
            this.resolve();
        this.progress = undefined;
        this.resolve = undefined;
        this.reject = undefined;
    }
    globalStep(step, max, title, msg) {
        if (!this.startedGlobal || !this.progress)
            return;
        let percent = step / (max || 1);
        this.progress.report({
            message: title + " (" + formatPercent(percent) + "): " + msg
        });
    }
    setWorkspace(name) {
        this.workspace = name;
        this.globalStep(0, 1, "workspace " + name, "starting up...");
    }
    workspaceStep(step, max, msg) {
        this.globalStep(step, max, "workspace " + this.workspace, msg);
    }
}
exports.StartupProgress = StartupProgress;
function formatPercent(p) {
    return (p * 100).toFixed(1) + " %";
}
//# sourceMappingURL=statusbar.js.map