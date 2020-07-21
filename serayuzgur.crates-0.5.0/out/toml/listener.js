"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Listener for TOML files.
 * Filters active editor files according to the extension.
 */
const vscode_1 = require("vscode");
const compareVersions = require("compare-versions");
const parser_1 = require("../toml/parser");
const indicators_1 = require("../ui/indicators");
const decorations_1 = require("./decorations");
const commands_1 = require("./commands");
const local_registry_1 = require("../api/local_registry");
const github_1 = require("../api/github");
let decoration;
function parseToml(text) {
    console.log("Parsing...");
    const toml = parser_1.parse(text);
    const tomlDependencies = parser_1.filterCrates(toml.values);
    console.log("Parsed");
    indicators_1.statusBarItem.setText("Cargo.toml parsed");
    return tomlDependencies;
}
function fetchCrateVersions(dependencies, shouldListPreRels, githubToken, isLocalRegistry) {
    indicators_1.statusBarItem.setText("👀 Fetching crates.io");
    const responses = dependencies.map((item) => {
        // Check settings and if local registry enabled control cargo home. Fallback is the github index.
        const isLocalRegistryAvailable = isLocalRegistry && local_registry_1.checkCargoRegistry();
        const versions = isLocalRegistryAvailable ? local_registry_1.versions : github_1.versions;
        return versions(item.key, githubToken)
            .then((json) => {
            return {
                item,
                versions: json.versions
                    .reduce((result, item) => {
                    const isPreRelease = !shouldListPreRels && item.num.indexOf("-") !== -1;
                    if (!item.yanked && !isPreRelease) {
                        result.push(item.num);
                    }
                    return result;
                }, [])
                    .sort(compareVersions)
                    .reverse(),
            };
        })
            .catch((error) => {
            console.error(error);
            return {
                item,
                error: item.key + ": " + error
            };
        });
    });
    return Promise.all(responses);
}
function decorateVersions(editor, dependencies) {
    if (decoration) {
        decoration.dispose();
    }
    const errors = [];
    const filtered = dependencies.filter((dep) => {
        if (dep && !dep.error && (dep.versions && dep.versions.length)) {
            return dep;
        }
        else if (!dep.error) {
            dep.error = dep.item.key + ": " + "No versions found";
        }
        errors.push(`${dep.error}`);
        return dep;
    });
    decoration = decorations_1.decorate(editor, filtered);
    if (errors.length) {
        indicators_1.statusBarItem.setText("⚠️ Completed with errors");
    }
    else {
        indicators_1.statusBarItem.setText("OK");
    }
}
function parseAndDecorate(editor) {
    const text = editor.document.getText();
    const config = vscode_1.workspace.getConfiguration("", editor.document.uri);
    const shouldListPreRels = config.get("crates.listPreReleases");
    const basicAuth = config.get("crates.githubAuthBasic");
    const isLocalRegistery = config.get("crates.useLocalCargoIndex");
    const githubToken = basicAuth ? `Basic ${Buffer.from(basicAuth).toString("base64")}` : undefined;
    try {
        // Parse
        const dependencies = parseToml(text);
        // Fetch Versions
        fetchCrateVersions(dependencies, !!shouldListPreRels, githubToken, isLocalRegistery)
            .then(decorateVersions.bind(undefined, editor));
    }
    catch (e) {
        console.error(e);
        indicators_1.statusBarItem.setText("Cargo.toml is not valid!");
        if (decoration) {
            decoration.dispose();
        }
    }
}
function default_1(editor) {
    if (editor) {
        const { fileName } = editor.document;
        if (fileName.toLocaleLowerCase().endsWith("cargo.toml")) {
            commands_1.status.inProgress = true;
            commands_1.status.replaceItems = [];
            indicators_1.statusBarItem.show();
            parseAndDecorate(editor);
        }
        else {
            indicators_1.statusBarItem.hide();
        }
        commands_1.status.inProgress = false;
    }
    else {
        console.log("No active editor found.");
    }
}
exports.default = default_1;
//# sourceMappingURL=listener.js.map