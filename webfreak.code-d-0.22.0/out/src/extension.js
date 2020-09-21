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
const fs = require("fs");
const vscode_languageclient_1 = require("vscode-languageclient");
const installer_1 = require("./installer");
const events_1 = require("events");
const ChildProcess = require("child_process");
const which = require("which");
const mode = require("./dmode");
const statusbar = require("./statusbar");
const sdl_contributions_1 = require("./sdl/sdl-contributions");
const json_contributions_1 = require("./json-contributions");
const gcprofiler_1 = require("./gcprofiler");
const coverage_1 = require("./coverage");
const commands_1 = require("./commands");
const dub_view_1 = require("./dub-view");
const expandTilde = require("expand-tilde");
const builtin_plugins_1 = require("./builtin_plugins");
const api_impl_1 = require("./api_impl");
const project_creator_1 = require("./project-creator");
class CustomErrorHandler {
    constructor(output) {
        this.output = output;
        this.restarts = [];
    }
    error(error, message, count) {
        return vscode_languageclient_1.ErrorAction.Continue;
    }
    closed() {
        this.restarts.push(Date.now());
        if (this.restarts.length < 10) {
            return vscode_languageclient_1.CloseAction.Restart;
        }
        else {
            let diff = this.restarts[this.restarts.length - 1] - this.restarts[0];
            if (diff <= 60 * 1000) {
                // TODO: run automated diagnostics about current code file here
                this.output.appendLine(`Server crashed 10 times in the last minute. The server will not be restarted.`);
                return vscode_languageclient_1.CloseAction.DoNotRestart;
            }
            else {
                this.restarts.shift();
                return vscode_languageclient_1.CloseAction.Restart;
            }
        }
    }
}
class ServeD extends events_1.EventEmitter {
    constructor(client) {
        super();
        this.client = client;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refreshDependencies() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        return new Promise(resolve => {
            var req = (element && element.info) ? element.info.name : "";
            var items = [];
            if (element && element.info) {
                if (element.info.description)
                    items.push(new dub_view_1.DubDependency(element.info.description, undefined, "description"));
                if (element.info.homepage)
                    items.push(new dub_view_1.DubDependency(element.info.homepage, {
                        command: "open",
                        title: "Open",
                        arguments: [vscode.Uri.parse(element.info.homepage)]
                    }, "web"));
                if (element.info.authors && element.info.authors.join("").trim())
                    items.push(new dub_view_1.DubDependency("Authors: " + element.info.authors.join(), undefined, "authors"));
                if (element.info.license)
                    items.push(new dub_view_1.DubDependency("License: " + element.info.license, undefined, "license"));
                if (element.info.copyright)
                    items.push(new dub_view_1.DubDependency(element.info.copyright));
            }
            if (!element || req)
                this.client.sendRequest("served/listDependencies", req).then((deps) => {
                    deps.forEach(dep => {
                        items.push(new dub_view_1.DubDependency(dep));
                    });
                    resolve(items);
                });
            else
                resolve(items);
        });
    }
    triggerDscanner(uri) {
        this.client.sendNotification("served/doDscanner", {
            textDocument: {
                uri: uri.toString()
            }
        });
    }
    findFiles(query) {
        return this.client.sendRequest("served/searchFile", query);
    }
    findFilesByModule(query) {
        return this.client.sendRequest("served/findFilesByModule", query);
    }
    addDependencySnippet(params) {
        return this.client.sendRequest("served/addDependencySnippet", params);
    }
}
exports.ServeD = ServeD;
ServeD.taskGroups = [
    vscode.TaskGroup.Build,
    vscode.TaskGroup.Clean,
    vscode.TaskGroup.Rebuild,
    vscode.TaskGroup.Test,
];
function startClient(context) {
    let servedPath = expandTilde(config(null).get("servedPath", "serve-d"));
    let args = ["--require", "D", "--lang", vscode.env.language, "--provide", "http", "--provide", "implement-snippets", "--provide", "context-snippets"];
    let executable = {
        run: {
            command: servedPath,
            args: args,
            options: {
                cwd: context.extensionPath
            }
        },
        debug: {
            //command: "gdbserver",
            //args: ["--once", ":2345", servedPath, "--require", "D", "--lang", vscode.env.language],
            command: servedPath,
            args: args.concat("--wait"),
            options: {
                cwd: context.extensionPath
            }
        }
    };
    var outputChannel = vscode.window.createOutputChannel("code-d & serve-d");
    let clientOptions = {
        documentSelector: [mode.D_MODE, mode.DUB_MODE, mode.DIET_MODE, mode.DML_MODE, mode.DSCANNER_INI_MODE],
        synchronize: {
            configurationSection: ["d", "dfmt", "dscanner", "editor", "git"],
            fileEvents: [
                vscode.workspace.createFileSystemWatcher("**/*.d"),
                vscode.workspace.createFileSystemWatcher("**/dub.json"),
                vscode.workspace.createFileSystemWatcher("**/dub.sdl")
            ]
        },
        outputChannel: outputChannel,
        errorHandler: new CustomErrorHandler(outputChannel)
    };
    let client = new vscode_languageclient_1.LanguageClient("serve-d", "code-d & serve-d", executable, clientOptions);
    client.start();
    exports.served = new ServeD(client);
    context.subscriptions.push({
        dispose() {
            client.stop();
        }
    });
    client.onReady().then(() => {
        var updateSetting = new vscode_languageclient_1.NotificationType("coded/updateSetting");
        client.onNotification(updateSetting, (arg) => {
            config(null).update(arg.section, arg.value, arg.global);
        });
        var logInstall = new vscode_languageclient_1.NotificationType("coded/logInstall");
        client.onNotification(logInstall, (message) => {
            installer_1.getInstallOutput().appendLine(message);
        });
        client.onNotification("coded/initDubTree", function () {
            context.subscriptions.push(statusbar.setupDub(exports.served));
            vscode.commands.executeCommand("setContext", "d.hasDubProject", true);
            context.subscriptions.push(vscode.window.registerTreeDataProvider("dubDependencies", exports.served));
        });
        client.onNotification("coded/updateDubTree", function () {
            exports.served.refreshDependencies();
        });
        client.onNotification("coded/changedSelectedWorkspace", function () {
            exports.served.emit("workspace-change");
            exports.served.refreshDependencies();
        });
        const startupProgress = new statusbar.StartupProgress();
        client.onNotification("window/logMessage", function (info) {
            if (info.type == vscode_languageclient_1.MessageType.Log && info.message.startsWith("[progress]")) {
                let m = /^\[progress\] \[(\d+\.\d+)\] \[(\w+)\](?:\s*(\d+)?\s*(?:\/\s*(\d+))?:\s)?(.*)/.exec(info.message);
                if (!m)
                    return;
                const time = parseFloat(m[1]);
                const type = m[2];
                const step = m[3] ? parseInt(m[3]) : undefined;
                const max = m[4] ? parseInt(m[4]) : undefined;
                const args = m[5] || undefined;
                if (type == "configLoad") {
                    startupProgress.startGlobal();
                    const p = vscode.Uri.parse(args || "").fsPath;
                    startupProgress.setWorkspace(shortenPath(p));
                }
                else if (type == "configFinish") {
                    startupProgress.finishGlobal();
                }
                else if (type == "workspaceStartup" && step !== undefined && max) {
                    startupProgress.workspaceStep(step * 0.5, max, "updating");
                }
                else if (type == "completionStartup" && step !== undefined && max) {
                    startupProgress.workspaceStep(step * 0.5 + max * 0.5, max, "indexing");
                }
                else if ((type == "dubReload" || type == "importReload" || type == "importUpgrades") && step !== undefined && max) {
                    if (step == max)
                        startupProgress.finishGlobal();
                    else {
                        startupProgress.startGlobal();
                        const p = vscode.Uri.parse(args || "").fsPath;
                        let label;
                        switch (type) {
                            case "dubReload":
                                label = "updating";
                                break;
                            case "importReload":
                                label = "indexing";
                                break;
                            case "importUpgrades":
                                label = "downloading dependencies";
                                break;
                            default:
                                label = "loading";
                                break;
                        }
                        startupProgress.globalStep(step, max, shortenPath(p), label);
                    }
                }
                // console.log("progress:", time, type, step, max, args);
            }
        });
        client.onRequest("coded/interactiveDownload", function (e, token) {
            return new Promise((resolve, reject) => {
                let aborted = false;
                installer_1.downloadFileInteractive(e.url, e.title || "Dependency Download", () => {
                    aborted = true;
                    resolve(false);
                }).then(stream => stream.pipe(fs.createWriteStream(e.output)).on("finish", () => {
                    if (!aborted)
                        resolve(true);
                }));
            });
        });
        // this code is run on every restart too
        api_impl_1.CodedAPIServedImpl.getInstance().started(exports.served);
        client.onDidChangeState((event) => {
            if (event.newState == vscode_languageclient_1.State.Starting) {
                client.onReady().then(() => {
                    api_impl_1.CodedAPIServedImpl.getInstance().started(exports.served);
                });
            }
        });
    });
    commands_1.registerClientCommands(context, client, exports.served);
}
function activate(context) {
    // TODO: Port to serve-d
    /*{
        var phobosPath = config().getStdlibPath();
        var foundCore = false;
        var foundStd = false;
        var someError = false;
        var userSettings = (r) => {
            if (r == "Open User Settings")
                vscode.commands.executeCommand("workbench.action.openGlobalSettings");
        };
        var i = 0;
        var fn = function () {
            if (typeof phobosPath[i] == "string")
                fs.exists(phobosPath[i], function (exists) {
                    if (exists) {
                        fs.readdir(phobosPath[i], function (err, files) {
                            if (files.indexOf("std") != -1)
                                foundStd = true;
                            if (files.indexOf("core") != -1)
                                foundCore = true;
                            if (++i < phobosPath.length)
                                fn();
                            else {
                                if (!foundStd && !foundCore)
                                    vscode.window.showWarningMessage("Your d.stdlibPath setting doesn't contain a path to phobos or druntime. Auto completion might lack some symbols!", "Open User Settings").then(userSettings);
                                else if (!foundStd)
                                    vscode.window.showWarningMessage("Your d.stdlibPath setting doesn't contain a path to phobos. Auto completion might lack some symbols!", "Open User Settings").then(userSettings);
                                else if (!foundCore)
                                    vscode.window.showWarningMessage("Your d.stdlibPath setting doesn't contain a path to druntime. Auto completion might lack some symbols!", "Open User Settings").then(userSettings);
                            }
                        });
                    }
                    else
                        vscode.window.showWarningMessage("A path in your d.stdlibPath setting doesn't exist. Auto completion might lack some symbols!", "Open User Settings").then(userSettings);
                });
        };
        fn();
    }*/
    try {
        let data = fs.readFileSync(context.asAbsolutePath("package.json"));
        exports.currentVersion = JSON.parse(data.toString()).version;
    }
    catch (e) {
        console.error("Failed reading current code-d version from package manifest: ", e);
    }
    preStartup(context);
    context.subscriptions.push(sdl_contributions_1.addSDLProviders());
    context.subscriptions.push(json_contributions_1.addJSONProviders());
    commands_1.registerCommands(context);
    greetNewUsers(context);
    if (vscode.workspace.workspaceFolders) {
        {
            let gcprofiler = new gcprofiler_1.GCProfiler();
            vscode.languages.registerCodeLensProvider(mode.D_MODE, gcprofiler);
            let watcher = vscode.workspace.createFileSystemWatcher("**/profilegc.log", false, false, false);
            watcher.onDidCreate(gcprofiler.updateProfileCache, gcprofiler, context.subscriptions);
            watcher.onDidChange(gcprofiler.updateProfileCache, gcprofiler, context.subscriptions);
            watcher.onDidDelete(gcprofiler.clearProfileCache, gcprofiler, context.subscriptions);
            context.subscriptions.push(watcher);
            let profileGCPath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, "profilegc.log");
            if (fs.existsSync(profileGCPath))
                gcprofiler.updateProfileCache(vscode.Uri.file(profileGCPath));
            context.subscriptions.push(vscode.commands.registerCommand("code-d.showGCCalls", gcprofiler.listProfileCache, gcprofiler));
        }
        {
            let coverageanal = new coverage_1.CoverageAnalyzer();
            context.subscriptions.push(coverageanal);
            context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider("dcoveragereport", coverageanal));
            let watcher = vscode.workspace.createFileSystemWatcher("**/*.lst", false, false, false);
            watcher.onDidCreate(coverageanal.updateCache, coverageanal, context.subscriptions);
            watcher.onDidChange(coverageanal.updateCache, coverageanal, context.subscriptions);
            watcher.onDidDelete(coverageanal.removeCache, coverageanal, context.subscriptions);
            context.subscriptions.push(watcher);
            vscode.workspace.onDidOpenTextDocument(coverageanal.populateCurrent, coverageanal, context.subscriptions);
            vscode.workspace.findFiles("*.lst", "").then(files => {
                files.forEach(file => {
                    coverageanal.updateCache(file);
                });
            });
            vscode.commands.registerCommand("code-d.generateCoverageReport", () => {
                vscode.workspace.openTextDocument(vscode.Uri.parse("dcoveragereport://null"));
            });
        }
    }
    const instance = api_impl_1.CodedAPIServedImpl.getInstance();
    builtin_plugins_1.builtinPlugins(instance);
    return instance;
}
exports.activate = activate;
function config(resource) {
    return vscode.workspace.getConfiguration("d", resource);
}
exports.config = config;
function preStartup(context) {
    return __awaiter(this, void 0, void 0, function* () {
        const userConfig = "Open User Settings";
        installer_1.setContext(context);
        let proxy = vscode.workspace.getConfiguration("http").get("proxy", "");
        if (proxy)
            process.env["http_proxy"] = proxy;
        yield project_creator_1.restoreCreateProjectPackageBackup(context);
        let presentCompiler;
        if (!context.globalState.get("checkedCompiler", false)) {
            console.log("Checking if compiler is present");
            presentCompiler = yield checkCompilers();
            context.globalState.update("checkedCompiler", true);
            if (!presentCompiler.has)
                vscode.env.openExternal(vscode.Uri.parse("https://dlang.org/download.html")).then(() => {
                    vscode.window.showInformationMessage("Please install a D compiler from dlang.org and reload the window once done.");
                });
        }
        function checkDub(dubPath, updateSetting = false) {
            return __awaiter(this, void 0, void 0, function* () {
                let tryCompiler = !!dubPath;
                if (!dubPath)
                    dubPath = expandTilde(config(null).get("dubPath", "dub"));
                try {
                    yield spawnOneShotCheck(dubPath, ["--version"], false, { cwd: vscode.workspace.rootPath });
                }
                catch (e) {
                    // for example invalid executable error
                    if (!tryCompiler)
                        return false;
                    if (!presentCompiler)
                        presentCompiler = yield checkCompilers();
                    if (!presentCompiler.has || !presentCompiler.path)
                        return false;
                    else {
                        let ext = process.platform == "win32" ? ".exe" : "";
                        return yield checkDub(path.join(path.dirname(presentCompiler.path), "dub" + ext), true);
                    }
                }
                if (updateSetting)
                    yield config(null).update("dubPath", path);
                return true;
            });
        }
        function checkProgram(configName, defaultPath, name, installFunc, btn, outdatedCheck) {
            return __awaiter(this, void 0, void 0, function* () {
                var version = "";
                try {
                    version = yield spawnOneShotCheck(expandTilde(config(null).get(configName, defaultPath)), ["--version"], true, { cwd: vscode.workspace.rootPath });
                }
                catch (err) {
                    // for example invalid executable error
                    console.error(err);
                    const fullConfigName = "d." + configName;
                    if (btn == "Install" || btn == "Download")
                        btn = "Reinstall";
                    const reinstallBtn = btn + " " + name;
                    const userSettingsBtn = "Open User Settings";
                    let defaultHandler = (s) => {
                        if (s == userSettingsBtn)
                            vscode.commands.executeCommand("workbench.action.openGlobalSettings");
                        else if (s == reinstallBtn)
                            return installFunc(process.env);
                        return Promise.resolve(undefined);
                    };
                    if (err && err.code == "ENOENT") {
                        if (config(null).get("aggressiveUpdate", true)) {
                            return installFunc(process.env);
                        }
                        else {
                            var isDirectory = false;
                            try {
                                var testPath = config(null).get(configName, "");
                                isDirectory = path.isAbsolute(testPath) && fs.statSync(testPath).isDirectory();
                            }
                            catch (e) { }
                            if (isDirectory) {
                                return yield vscode.window.showErrorMessage(name + " from setting " + fullConfigName + " points to a directory", reinstallBtn, userSettingsBtn).then(defaultHandler);
                            }
                            else {
                                return yield vscode.window.showErrorMessage(name + " from setting " + fullConfigName + " is not installed or couldn't be found", reinstallBtn, userSettingsBtn).then(defaultHandler);
                            }
                        }
                    }
                    else if (err && err.code == "EACCES") {
                        return yield vscode.window.showErrorMessage(name + " from setting " + fullConfigName + " is not marked as executable or is in a non-executable directory.", reinstallBtn, userSettingsBtn).then(defaultHandler);
                    }
                    else if (err && err.code) {
                        return yield vscode.window.showErrorMessage(name + " from setting " + fullConfigName + " failed executing: " + err.code, reinstallBtn, userSettingsBtn).then(defaultHandler);
                    }
                    else if (err) {
                        return yield vscode.window.showErrorMessage(name + " from setting " + fullConfigName + " failed executing: " + err, reinstallBtn, userSettingsBtn).then(defaultHandler);
                    }
                    return false;
                }
                let outdatedResult = outdatedCheck && outdatedCheck(version);
                let isOutdated = false;
                let msg;
                if (typeof outdatedResult == "boolean")
                    isOutdated = outdatedResult;
                else if (Array.isArray(outdatedResult))
                    [isOutdated, msg] = outdatedResult;
                if (isOutdated) {
                    if (config(null).get("aggressiveUpdate", true)) {
                        return yield installFunc(process.env);
                    }
                    else {
                        let s = yield vscode.window.showErrorMessage(name + " is outdated. " + (msg || ""), btn + " " + name, "Continue Anyway");
                        if (s == "Continue Anyway")
                            return false;
                        else if (s == btn + " " + name)
                            return yield installFunc(process.env);
                        return undefined;
                    }
                }
                return false;
            });
        }
        // disable dub checks for now because precompiled dub binaries on windows are broken
        if (!(yield checkDub(undefined))) {
            console.error("Failed to automatically find dub or execute it! Please set d.dubPath properly.");
            if (config(null).get("dubPath", "dub") != "dub")
                vscode.window.showErrorMessage("The dub path specified in your user settings via d.dubPath is not a"
                    + " valid dub executable. Please unset it to automatically find it through your compiler or manually"
                    + " point it to a valid executable file.\n\nIssues building projects might occur.", userConfig).then((item) => {
                    if (item == userConfig)
                        vscode.commands.executeCommand("workbench.action.openGlobalSettings");
                });
        }
        let isLegacyBeta = config(null).get("betaStream", false);
        let servedReleaseChannel = config(null).inspect("servedReleaseChannel");
        let channelString = config(null).get("servedReleaseChannel", "stable");
        let reloading = false;
        let started = false;
        let outdated = false;
        function didChangeReleaseChannel(updated) {
            if (started && !reloading) {
                reloading = true;
                // make sure settings get updated
                updated.then(() => {
                    vscode.commands.executeCommand("workbench.action.reloadWindow");
                });
            }
            else
                outdated = true;
        }
        function isServedOutdated(current) {
            return (log) => {
                if (!current || !current.asset)
                    return false; // network failure or frozen release channel, let's not bother the user
                else if (current.name == "nightly") {
                    let date = new Date(current.asset.created_at);
                    let installed = installer_1.extractServedBuiltDate(log);
                    if (!installed)
                        return [true, "(target=nightly, installed=none)"];
                    date.setUTCHours(0);
                    date.setUTCMinutes(0);
                    date.setUTCSeconds(0);
                    installed.setUTCHours(12);
                    installed.setUTCMinutes(0);
                    installed.setUTCSeconds(0);
                    return [installed < date, `(target from ${date.toDateString()}, installed ${installed.toDateString()})`];
                }
                let installedChannel = context.globalState.get("serve-d-downloaded-release-channel");
                if (installedChannel && channelString != installedChannel)
                    return [true, "(target channel=" + channelString + ", installed channel=" + installedChannel + ")"];
                var m = /serve-d v(\d+\.\d+\.\d+(?:-[-.a-zA-Z0-9]+)?)/.exec(log);
                var target = current.name;
                if (target.startsWith("v"))
                    target = target.substr(1);
                if (m) {
                    try {
                        return [installer_1.cmpSemver(m[1], target) < 0, "(target=" + target + ", installed=" + m[1] + ")"];
                    }
                    catch (e) {
                        installer_1.getInstallOutput().show(true);
                        installer_1.getInstallOutput().appendLine("ERROR: could not compare current serve-d version with release");
                        installer_1.getInstallOutput().appendLine(e.toString());
                    }
                }
                return false;
            };
        }
        if (isLegacyBeta && servedReleaseChannel && !servedReleaseChannel.globalValue) {
            config(null).update("servedReleaseChannel", "nightly", vscode.ConfigurationTarget.Global);
            channelString = "nightly";
            let stable = "Switch to Stable";
            let beta = "Switch to Beta";
            vscode.window.showInformationMessage("Hey! The setting 'd.betaStream' no longer exists and has been replaced with "
                + "'d.servedReleaseChannel'. Your settings have been automatically updated to fetch nightly builds, but you "
                + "probably want to remove the old setting.\n\n"
                + "Stable and beta releases are planned more frequently now, so they might be a better option for you.", stable, beta, userConfig).then(item => {
                if (item == userConfig) {
                    vscode.commands.executeCommand("workbench.action.openGlobalSettings");
                }
                else if (item == stable) {
                    let done = config(null).update("servedReleaseChannel", "stable", vscode.ConfigurationTarget.Global);
                    didChangeReleaseChannel(done);
                }
                else if (item == beta) {
                    let done = config(null).update("servedReleaseChannel", "beta", vscode.ConfigurationTarget.Global);
                    didChangeReleaseChannel(done);
                }
            });
        }
        let force = true; // force release lookup before first install
        if (context.globalState.get("serve-d-downloaded-release-channel"))
            force = false;
        let version = yield installer_1.findLatestServeD(force, channelString);
        let upToDate = yield checkProgram("servedPath", "serve-d", "serve-d", version ? (version.asset
            ? installer_1.installServeD([{ url: version.asset.browser_download_url, title: "Serve-D" }], version.name)
            : installer_1.compileServeD((version && version.name != "nightly") ? version.name : undefined))
            : installer_1.updateAndInstallServeD, version ? (version.asset ? "Download" : "Compile") : "Install", isServedOutdated(version));
        if (upToDate === undefined)
            return; /* user dismissed install dialogs, don't continue startup */
        yield context.globalState.update("serve-d-downloaded-release-channel", channelString);
        if (outdated) {
            if (!reloading) {
                reloading = true;
                // just to be absolutely sure all settings have been written
                setTimeout(() => {
                    vscode.commands.executeCommand("workbench.action.reloadWindow");
                }, 500);
            }
        }
        else {
            startClient(context);
            started = true;
        }
    });
}
function checkCompiler(compiler) {
    return __awaiter(this, void 0, void 0, function* () {
        let compilerPath;
        try {
            compilerPath = yield which(compiler);
        }
        catch (e) {
            return { has: false };
        }
        if (!compilerPath)
            return { has: false };
        let proc;
        try {
            proc = ChildProcess.spawn(compilerPath, ["--version"]);
        }
        catch (err) {
            return { has: false, path: compilerPath };
        }
        return yield new Promise((resolve) => {
            proc.on("error", function () {
                resolve({ has: false, path: compilerPath });
            }).on("exit", function () {
                resolve({ has: true, path: compilerPath });
            });
        });
    });
}
function checkCompilers() {
    return __awaiter(this, void 0, void 0, function* () {
        const compilers = ["dmd", "ldc", "ldc2", "gdc"];
        let fallbackPath = undefined;
        for (let i = 0; i < compilers.length; i++) {
            const check = compilers[i];
            let result = yield checkCompiler(check);
            fallbackPath = fallbackPath || result.path;
            if (result && result.has)
                return { has: check, path: result.path };
        }
        return { has: false, path: fallbackPath };
    });
}
function spawnOneShotCheck(program, args, captureOutput = false, options = undefined) {
    let proc;
    try {
        proc = ChildProcess.spawn(program, args, options);
    }
    catch (err) {
        return Promise.reject(err);
    }
    let result = "";
    if (captureOutput) {
        if (proc.stderr)
            proc.stderr.on("data", (chunk) => result += chunk);
        if (proc.stdout)
            proc.stdout.on("data", (chunk) => result += chunk);
    }
    return new Promise((resolve, reject) => {
        let returned = false;
        proc.on("error", function (e) {
            if (returned)
                return;
            returned = true;
            reject(e);
        }).on("exit", function () {
            if (returned)
                return;
            returned = true;
            resolve(result);
        });
    });
}
function greetNewUsers(context) {
    if (!context.globalState.get("greetedNewCodeDUser", false)) {
        context.globalState.update("greetedNewCodeDUser", true);
        context.globalState.update("lastCheckedCodedVersion", exports.currentVersion);
        vscode.commands.executeCommand("code-d.viewUserGuide");
    }
    else if (exports.currentVersion) {
        let oldVersion = context.globalState.get("lastCheckedCodedVersion", "");
        if (oldVersion != exports.currentVersion) {
            context.globalState.update("lastCheckedCodedVersion", exports.currentVersion);
            if (config(null).get("showUpdateChangelogs", true)) {
                vscode.commands.executeCommand("markdown.showPreview", vscode.Uri.file(context.asAbsolutePath("CHANGELOG.md")), { locked: true });
                let disableChangelog = "Never show changelog";
                let close = "Close";
                vscode.window.showInformationMessage("Welcome to code-d " + exports.currentVersion + "! See what has changed since " + (oldVersion || "last version") + "...", disableChangelog, close).then(action => {
                    if (action == disableChangelog) {
                        config(null).update("showUpdateChangelogs", false, vscode.ConfigurationTarget.Global);
                    }
                });
            }
        }
    }
}
function shortenPath(p) {
    let short = p;
    if (vscode.workspace.workspaceFolders)
        vscode.workspace.workspaceFolders.forEach(element => {
            const dir = element.uri.fsPath;
            if (dir.startsWith(p)) {
                short = path.relative(path.dirname(dir), p);
            }
        });
    return short;
}
//# sourceMappingURL=extension.js.map