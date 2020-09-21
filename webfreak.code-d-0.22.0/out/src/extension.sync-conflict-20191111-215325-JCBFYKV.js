"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const vscode_languageclient_1 = require("vscode-languageclient");
const installer_1 = require("./installer");
const events_1 = require("events");
const ChildProcess = require("child_process");
const mode = require("./dmode");
const statusbar = require("./statusbar");
const sdl_contributions_1 = require("./sdl/sdl-contributions");
const json_contributions_1 = require("./json-contributions");
const gcprofiler_1 = require("./gcprofiler");
const coverage_1 = require("./coverage");
const commands_1 = require("./commands");
const dub_view_1 = require("./dub-view");
const expandTilde = require("expand-tilde");
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
        this.client.sendNotification("coded/doDscanner", {
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
    let args = ["--require", "D", "--lang", vscode.env.language, "--provide", "http", "--provide", "implement-snippets"];
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
            fileEvents: vscode.workspace.createFileSystemWatcher("**/*.d")
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
        client.onRequest("coded/interactiveDownload", function (e, token) {
            return new Promise((resolve, reject) => {
                installer_1.downloadFileInteractive(e.url, e.title || "Dependency Download", () => {
                    resolve(false);
                }).pipe(fs.createWriteStream(e.output)).on("finish", () => {
                    resolve(true);
                });
            });
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
    preStartup(context);
    context.subscriptions.push(sdl_contributions_1.addSDLProviders());
    context.subscriptions.push(json_contributions_1.addJSONProviders());
    commands_1.registerCommands(context);
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
}
exports.activate = activate;
function config(resource) {
    return vscode.workspace.getConfiguration("d", resource);
}
exports.config = config;
function preStartup(context) {
    installer_1.setContext(context);
    let env = process.env;
    let proxy = vscode.workspace.getConfiguration("http").get("proxy", "");
    if (proxy)
        env["http_proxy"] = proxy;
    if (context.globalState.get("restorePackageBackup", false)) {
        context.globalState.update("restorePackageBackup", false);
        var pkgPath = path.join(context.extensionPath, "package.json");
        fs.readFile(pkgPath + ".bak", function (err, data) {
            if (err)
                return vscode.window.showErrorMessage("Failed to restore after reload! Please reinstall code-d if problems occur before reporting!");
            return fs.writeFile(pkgPath, data, function (err) {
                if (err)
                    return vscode.window.showErrorMessage("Failed to restore after reload! Please reinstall code-d if problems occur before reporting!");
                return fs.unlink(pkgPath + ".bak", function (err) {
                    console.error(err.toString());
                });
            });
        });
    }
    {
        function checkProgram(configName, defaultPath, name, installFunc, btn, done, outdatedCheck) {
            var version = "";
            var errored = false;
            var proc = ChildProcess.spawn(expandTilde(config(null).get(configName, defaultPath)), ["--version"], { cwd: vscode.workspace.rootPath, env: env });
            if (proc.stderr)
                proc.stderr.on("data", function (chunk) {
                    version += chunk;
                });
            if (proc.stdout)
                proc.stdout.on("data", function (chunk) {
                    version += chunk;
                });
            proc.on("error", function (err) {
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
                        installFunc(env, done || (() => { }));
                };
                errored = true;
                if (err && err.code == "ENOENT") {
                    if (config(null).get("aggressiveUpdate", true)) {
                        installFunc(env, done || (() => { }));
                    }
                    else {
                        var isDirectory = false;
                        try {
                            var testPath = config(null).get(configName, "");
                            isDirectory = path.isAbsolute(testPath) && fs.statSync(testPath).isDirectory();
                        }
                        catch (e) { }
                        if (isDirectory) {
                            vscode.window.showErrorMessage(name + " from setting " + fullConfigName + " points to a directory", reinstallBtn, userSettingsBtn).then(defaultHandler);
                        }
                        else {
                            vscode.window.showErrorMessage(name + " from setting " + fullConfigName + " is not installed or couldn't be found", reinstallBtn, userSettingsBtn).then(defaultHandler);
                        }
                    }
                }
                else if (err && err.code == "EACCES") {
                    vscode.window.showErrorMessage(name + " from setting " + fullConfigName + " is not marked as executable or is in a non-executable directory.", reinstallBtn, userSettingsBtn).then(defaultHandler);
                }
                else if (err && err.code) {
                    vscode.window.showErrorMessage(name + " from setting " + fullConfigName + " failed executing: " + err.code, reinstallBtn, userSettingsBtn).then(defaultHandler);
                }
                else if (err) {
                    vscode.window.showErrorMessage(name + " from setting " + fullConfigName + " failed executing: " + err, reinstallBtn, userSettingsBtn).then(defaultHandler);
                }
            }).on("exit", function () {
                let outdatedResult = outdatedCheck && outdatedCheck(version);
                let isOutdated = typeof outdatedResult == "boolean" ? outdatedResult
                    : typeof outdatedResult == "object" && Array.isArray(outdatedResult) ? outdatedResult[0]
                        : false;
                let msg = typeof outdatedResult == "object" && Array.isArray(outdatedResult) ? outdatedResult[1] : undefined;
                if (isOutdated) {
                    if (config(null).get("aggressiveUpdate", true)) {
                        installFunc(env, done || (() => { }));
                    }
                    else {
                        vscode.window.showErrorMessage(name + " is outdated. " + (msg || ""), btn + " " + name, "Continue Anyway").then(s => {
                            if (s == "Continue Anyway") {
                                if (done)
                                    done(false);
                            }
                            else if (s == btn + " " + name)
                                installFunc(env, done || (() => { }));
                        });
                    }
                    return;
                }
                if (!errored && done)
                    done(false);
            });
        }
        checkProgram("dubPath", "dub", "dub", installer_1.downloadDub, "Download", () => {
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
                        return installed < date;
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
                let userConfig = "Open User Settings";
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
            let targetRelease = installer_1.findLatestServeD(version => {
                checkProgram("servedPath", "serve-d", "serve-d", version ? (version.asset
                    ? installer_1.installServeD([version.asset.browser_download_url], version.name)
                    : installer_1.compileServeD(version ? version.name : undefined))
                    : installer_1.updateAndInstallServeD, version ? (version.asset ? "Download" : "Compile") : "Install", () => {
                    context.globalState.update("serve-d-downloaded-release-channel", channelString).then(() => {
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
                }, isServedOutdated(version));
            }, force, channelString);
        });
        function checkCompiler(compiler, callback) {
            ChildProcess.spawn(compiler, ["--version"]).on("error", function (err) {
                if (err && err.code == "ENOENT") {
                    if (callback)
                        callback(false);
                    callback = undefined;
                }
                else
                    console.error(err);
            }).on("exit", function () {
                if (callback)
                    callback(true);
                callback = undefined;
            });
        }
        if (!context.globalState.get("checkedCompiler", false)) {
            function gotCompiler(compiler) {
                context.globalState.update("checkedCompiler", true);
                if (!compiler)
                    vscode.env.openExternal(vscode.Uri.parse("https://dlang.org/download.html")).then(() => {
                        vscode.window.showInformationMessage("Please install a D compiler from dlang.org and reload the window once done.");
                    });
            }
            console.log("Checking if compiler is present");
            checkCompiler("dmd", (has) => {
                if (has)
                    return gotCompiler("dmd");
                checkCompiler("ldc", (has) => {
                    if (has)
                        return gotCompiler("ldc");
                    checkCompiler("ldc2", (has) => {
                        if (has)
                            return gotCompiler("ldc2");
                        checkCompiler("gdc", (has) => {
                            if (has)
                                return gotCompiler("gdc");
                            else
                                return gotCompiler(false);
                        });
                    });
                });
            });
        }
    }
}
//# sourceMappingURL=extension.js.map