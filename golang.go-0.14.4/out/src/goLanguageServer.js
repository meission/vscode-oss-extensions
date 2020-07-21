/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------*/
'use strict';
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
const cp = require("child_process");
const deepEqual = require("deep-equal");
const moment = require("moment");
const path = require("path");
const semver = require("semver");
const util = require("util");
const vscode = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
const WebRequest = require("web-request");
const goInstallTools_1 = require("./goInstallTools");
const goPath_1 = require("./goPath");
const goTools_1 = require("./goTools");
const util_1 = require("./util");
// Global variables used for management of the language client.
// They are global so that the server can be easily restarted with
// new configurations.
let languageClient;
let languageServerDisposable;
let latestConfig;
let serverOutputChannel;
// startLanguageServer starts the language server (if enabled), returning
// true on success.
function registerLanguageFeatures(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        // Subscribe to notifications for changes to the configuration of the language server.
        ctx.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => watchLanguageServerConfiguration(e)));
        const config = parseLanguageServerConfig();
        if (!config.enabled) {
            return false;
        }
        // Support a command to restart the language server, if it's enabled.
        ctx.subscriptions.push(vscode.commands.registerCommand('go.languageserver.restart', () => {
            return startLanguageServer(ctx, parseLanguageServerConfig());
        }));
        // If the language server is gopls, we can check if the user needs to
        // update their gopls version.
        if (config.serverName === 'gopls') {
            const tool = goTools_1.getTool(config.serverName);
            if (!tool) {
                return false;
            }
            const versionToUpdate = yield shouldUpdateLanguageServer(tool, config.path, config.checkForUpdates);
            if (versionToUpdate) {
                goInstallTools_1.promptForUpdatingTool(tool.name, versionToUpdate);
            }
        }
        // This function handles the case when the server isn't started yet,
        // so we can call it to start the language server.
        return startLanguageServer(ctx, config);
    });
}
exports.registerLanguageFeatures = registerLanguageFeatures;
function startLanguageServer(ctx, config) {
    return __awaiter(this, void 0, void 0, function* () {
        // If the client has already been started, make sure to clear existing
        // diagnostics and stop it.
        if (languageClient) {
            if (languageClient.diagnostics) {
                languageClient.diagnostics.clear();
            }
            yield languageClient.stop();
            if (languageServerDisposable) {
                languageServerDisposable.dispose();
            }
        }
        // Check if we should recreate the language client. This may be necessary
        // if the user has changed settings in their config.
        if (!deepEqual(latestConfig, config)) {
            // Track the latest config used to start the language server.
            latestConfig = config;
            // If the user has not enabled or installed the language server, return.
            if (!config.enabled || !config.path) {
                return false;
            }
            buildLanguageClient(config);
        }
        languageServerDisposable = languageClient.start();
        ctx.subscriptions.push(languageServerDisposable);
        return true;
    });
}
function buildLanguageClient(config) {
    // Reuse the same output channel for each instance of the server.
    if (!serverOutputChannel) {
        serverOutputChannel = vscode.window.createOutputChannel(config.serverName);
    }
    languageClient = new vscode_languageclient_1.LanguageClient(config.serverName, {
        command: config.path,
        args: ['-mode=stdio', ...config.flags],
        options: { env: config.env },
    }, {
        initializationOptions: {},
        documentSelector: ['go', 'go.mod', 'go.sum'],
        uriConverters: {
            // Apply file:/// scheme to all file paths.
            code2Protocol: (uri) => (uri.scheme ? uri : uri.with({ scheme: 'file' })).toString(),
            protocol2Code: (uri) => vscode.Uri.parse(uri)
        },
        outputChannel: serverOutputChannel,
        revealOutputChannelOn: vscode_languageclient_1.RevealOutputChannelOn.Never,
        middleware: {
            handleDiagnostics: (uri, diagnostics, next) => {
                if (!config.features.diagnostics) {
                    return null;
                }
                return next(uri, diagnostics);
            },
            provideDocumentLinks: (document, token, next) => {
                if (!config.features.documentLink) {
                    return null;
                }
                return next(document, token);
            },
            provideCompletionItem: (document, position, context, token, next) => {
                // TODO(hyangah): when v1.42+ api is available, we can simplify
                // language-specific configuration lookup using the new
                // ConfigurationScope.
                //    const paramHintsEnabled = vscode.workspace.getConfiguration(
                //          'editor.parameterHints',
                //          { languageId: 'go', uri: document.uri });
                const editorParamHintsEnabled = vscode.workspace.getConfiguration('editor.parameterHints', document.uri)['enabled'];
                const goParamHintsEnabled = vscode.workspace.getConfiguration('[go]', document.uri)['editor.parameterHints.enabled'];
                let paramHintsEnabled = false;
                if (typeof goParamHintsEnabled === 'undefined') {
                    paramHintsEnabled = editorParamHintsEnabled;
                }
                else {
                    paramHintsEnabled = goParamHintsEnabled;
                }
                let cmd;
                if (paramHintsEnabled) {
                    cmd = { title: 'triggerParameterHints', command: 'editor.action.triggerParameterHints' };
                }
                function configureCommands(r) {
                    if (r) {
                        (Array.isArray(r) ? r : r.items).forEach((i) => {
                            i.command = cmd;
                        });
                    }
                    return r;
                }
                const ret = next(document, position, context, token);
                const isThenable = (obj) => obj && obj['then'];
                if (isThenable(ret)) {
                    return ret.then(configureCommands);
                }
                return configureCommands(ret);
            }
        }
    });
    languageClient.onReady().then(() => {
        const capabilities = languageClient.initializeResult && languageClient.initializeResult.capabilities;
        if (!capabilities) {
            return vscode.window.showErrorMessage('The language server is not able to serve any features at the moment.');
        }
    });
}
function watchLanguageServerConfiguration(e) {
    if (!e.affectsConfiguration('go')) {
        return;
    }
    const config = parseLanguageServerConfig();
    let reloadMessage;
    // If the user has disabled or enabled the language server.
    if (e.affectsConfiguration('go.useLanguageServer')) {
        if (config.enabled) {
            reloadMessage = 'Reload VS Code window to enable the use of language server';
        }
        else {
            reloadMessage = 'Reload VS Code window to disable the use of language server';
        }
    }
    if (e.affectsConfiguration('go.languageServerFlags') ||
        e.affectsConfiguration('go.languageServerExperimentalFeatures')) {
        reloadMessage = 'Reload VS Code window for the changes in language server settings to take effect';
    }
    // If there was a change in the configuration of the language server,
    // then ask the user to reload VS Code.
    if (reloadMessage) {
        vscode.window.showInformationMessage(reloadMessage, 'Reload').then((selected) => {
            if (selected === 'Reload') {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        });
    }
}
function parseLanguageServerConfig() {
    const goConfig = util_1.getGoConfig();
    const toolsEnv = util_1.getToolsEnvVars();
    const languageServerPath = getLanguageServerToolPath();
    const languageServerName = goPath_1.getToolFromToolPath(languageServerPath);
    return {
        serverName: languageServerName,
        path: languageServerPath,
        enabled: goConfig['useLanguageServer'],
        flags: goConfig['languageServerFlags'] || [],
        features: {
            // TODO: We should have configs that match these names.
            // Ultimately, we should have a centralized language server config rather than separate fields.
            diagnostics: goConfig['languageServerExperimentalFeatures']['diagnostics'],
            documentLink: goConfig['languageServerExperimentalFeatures']['documentLink']
        },
        env: toolsEnv,
        checkForUpdates: goConfig['useGoProxyToCheckForToolUpdates']
    };
}
exports.parseLanguageServerConfig = parseLanguageServerConfig;
/**
 *
 * If the user has enabled the language server, return the absolute path to the
 * correct binary. If the required tool is not available, prompt the user to
 * install it. Only gopls is officially supported.
 */
function getLanguageServerToolPath() {
    // If language server is not enabled, return
    const goConfig = util_1.getGoConfig();
    if (!goConfig['useLanguageServer']) {
        return;
    }
    // Check that all workspace folders are configured with the same GOPATH.
    if (!allFoldersHaveSameGopath()) {
        vscode.window.showInformationMessage('The Go language server is currently not supported in a multi-root set-up with different GOPATHs.');
        return;
    }
    // Get the path to gopls (getBinPath checks for alternate tools).
    const goplsBinaryPath = util_1.getBinPath('gopls');
    if (path.isAbsolute(goplsBinaryPath)) {
        return goplsBinaryPath;
    }
    const alternateTools = goConfig['alternateTools'];
    if (alternateTools) {
        // The user's alternate language server was not found.
        const goplsAlternate = alternateTools['gopls'];
        if (goplsAlternate) {
            vscode.window.showErrorMessage(`Cannot find the alternate tool ${goplsAlternate} configured for gopls.
Please install it and reload this VS Code window.`);
            return;
        }
        // Check if the user has the deprecated "go-langserver" setting.
        // Suggest deleting it if the alternate tool is gopls.
        if (alternateTools['go-langserver']) {
            vscode.window.showErrorMessage(`Support for "go-langserver" has been deprecated.
The recommended language server is gopls. Delete the alternate tool setting for "go-langserver" to use gopls, or change "go-langserver" to "gopls" in your settings.json and reload the VS Code window.`);
            return;
        }
    }
    // Prompt the user to install gopls.
    goInstallTools_1.promptForMissingTool('gopls');
}
exports.getLanguageServerToolPath = getLanguageServerToolPath;
function allFoldersHaveSameGopath() {
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length <= 1) {
        return true;
    }
    const tempGopath = util_1.getCurrentGoPath(vscode.workspace.workspaceFolders[0].uri);
    return vscode.workspace.workspaceFolders.find((x) => tempGopath !== util_1.getCurrentGoPath(x.uri)) ? false : true;
}
const acceptGoplsPrerelease = false;
const defaultLatestVersion = semver.coerce('0.4.0');
const defaultLatestVersionTime = moment('2020-04-08', 'YYYY-MM-DD');
function shouldUpdateLanguageServer(tool, languageServerToolPath, makeProxyCall) {
    return __awaiter(this, void 0, void 0, function* () {
        // Only support updating gopls for now.
        if (tool.name !== 'gopls') {
            return null;
        }
        // First, run the "gopls version" command and parse its results.
        const usersVersion = yield goplsVersion(languageServerToolPath);
        // We might have a developer version. Don't make the user update.
        if (usersVersion === '(devel)') {
            return null;
        }
        // Get the latest gopls version.
        let latestVersion = makeProxyCall ? yield latestGopls(tool) : defaultLatestVersion;
        // If we failed to get the gopls version, pick the one we know to be latest at the time of this extension's last update
        if (!latestVersion) {
            latestVersion = defaultLatestVersion;
        }
        // If "gopls" is so old that it doesn't have the "gopls version" command,
        // or its version doesn't match our expectations, usersVersion will be empty.
        // Suggest the latestVersion.
        if (!usersVersion) {
            return latestVersion;
        }
        // The user may have downloaded golang.org/x/tools/gopls@master,
        // which means that they have a pseudoversion.
        const usersTime = parsePseudoversionTimestamp(usersVersion);
        // If the user has a pseudoversion, get the timestamp for the latest gopls version and compare.
        if (usersTime) {
            let latestTime = makeProxyCall ? yield goplsVersionTimestamp(tool, latestVersion) : defaultLatestVersionTime;
            if (!latestTime) {
                latestTime = defaultLatestVersionTime;
            }
            return usersTime.isBefore(latestTime) ? latestVersion : null;
        }
        // If the user's version does not contain a timestamp,
        // default to a semver comparison of the two versions.
        return semver.lt(usersVersion, latestVersion) ? latestVersion : null;
    });
}
// Copied from src/cmd/go/internal/modfetch.
const pseudoVersionRE = /^v[0-9]+\.(0\.0-|\d+\.\d+-([^+]*\.)?0\.)\d{14}-[A-Za-z0-9]+(\+incompatible)?$/;
// parsePseudoVersion reports whether v is a pseudo-version.
// The timestamp is the center component, and it has the format "YYYYMMDDHHmmss".
function parsePseudoversionTimestamp(version) {
    const split = version.split('-');
    if (split.length < 2) {
        return null;
    }
    if (!semver.valid(version)) {
        return null;
    }
    if (!pseudoVersionRE.test(version)) {
        return null;
    }
    const sv = semver.coerce(version);
    if (!sv) {
        return null;
    }
    // Copied from src/cmd/go/internal/modfetch.go.
    const build = sv.build.join('.');
    const buildIndex = version.lastIndexOf(build);
    if (buildIndex >= 0) {
        version = version.substring(0, buildIndex);
    }
    const lastDashIndex = version.lastIndexOf('-');
    version = version.substring(0, lastDashIndex);
    const firstDashIndex = version.lastIndexOf('-');
    const dotIndex = version.lastIndexOf('.');
    let timestamp;
    if (dotIndex > firstDashIndex) {
        // "vX.Y.Z-pre.0" or "vX.Y.(Z+1)-0"
        timestamp = version.substring(dotIndex + 1);
    }
    else {
        // "vX.0.0"
        timestamp = version.substring(firstDashIndex + 1);
    }
    return moment.utc(timestamp, 'YYYYMMDDHHmmss');
}
function goplsVersionTimestamp(tool, version) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = yield goProxyRequest(tool, `v${version.format()}.info`);
        if (!data) {
            return null;
        }
        const time = moment(data['Time']);
        return time;
    });
}
function latestGopls(tool) {
    return __awaiter(this, void 0, void 0, function* () {
        // If the user has a version of gopls that we understand,
        // ask the proxy for the latest version, and if the user's version is older,
        // prompt them to update.
        const data = yield goProxyRequest(tool, 'list');
        if (!data) {
            return null;
        }
        // Coerce the versions into SemVers so that they can be sorted correctly.
        const versions = [];
        for (const version of data.trim().split('\n')) {
            const parsed = semver.parse(version, {
                includePrerelease: true,
                loose: true
            });
            if (parsed) {
                versions.push(parsed);
            }
        }
        if (versions.length === 0) {
            return null;
        }
        versions.sort(semver.rcompare);
        if (acceptGoplsPrerelease) {
            return versions[0]; // The first one (newest one).
        }
        // The first version in the sorted list without a prerelease tag.
        return versions.find((version) => !version.prerelease || !version.prerelease.length);
    });
}
function goplsVersion(goplsPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const env = util_1.getToolsEnvVars();
        const execFile = util.promisify(cp.execFile);
        let output;
        try {
            const { stdout } = yield execFile(goplsPath, ['version'], { env });
            output = stdout;
        }
        catch (e) {
            // The "gopls version" command is not supported, or something else went wrong.
            // TODO: Should we propagate this error?
            return null;
        }
        const lines = output.trim().split('\n');
        switch (lines.length) {
            case 0:
                // No results, should update.
                // Worth doing anything here?
                return null;
            case 1:
                // Built in $GOPATH mode. Should update.
                // TODO: Should we check the Go version here?
                // Do we even allow users to enable gopls if their Go version is too low?
                return null;
            case 2:
                // We might actually have a parseable version.
                break;
            default:
                return null;
        }
        // The second line should be the sum line.
        // It should look something like this:
        //
        //    golang.org/x/tools/gopls@v0.1.3 h1:CB5ECiPysqZrwxcyRjN+exyZpY0gODTZvNiqQi3lpeo=
        //
        // TODO: We should use a regex to match this, but for now, we split on the @ symbol.
        // The reasoning for this is that gopls still has a golang.org/x/tools/cmd/gopls binary,
        // so users may have a developer version that looks like "golang.org/x/tools@(devel)".
        const moduleVersion = lines[1].trim().split(' ')[0];
        // Get the relevant portion, that is:
        //
        //    golang.org/x/tools/gopls@v0.1.3
        //
        const split = moduleVersion.trim().split('@');
        if (split.length < 2) {
            return null;
        }
        // The version comes after the @ symbol:
        //
        //    v0.1.3
        //
        return split[1];
    });
}
function goProxyRequest(tool, endpoint) {
    return __awaiter(this, void 0, void 0, function* () {
        const proxies = goProxy();
        // Try each URL set in the user's GOPROXY environment variable.
        // If none is set, don't make the request.
        for (const proxy of proxies) {
            if (proxy === 'direct') {
                continue;
            }
            const url = `${proxy}/${tool.importPath}/@v/${endpoint}`;
            let data;
            try {
                data = yield WebRequest.json(url, {
                    throwResponseError: true
                });
            }
            catch (e) {
                return null;
            }
            return data;
        }
        return null;
    });
}
function goProxy() {
    const output = process.env['GOPROXY'];
    if (!output || !output.trim()) {
        return [];
    }
    const split = output.trim().split(',');
    return split;
}
//# sourceMappingURL=goLanguageServer.js.map