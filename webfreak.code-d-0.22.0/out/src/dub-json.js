"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const dub_api_1 = require("./dub-api");
var semverRegex = /(\d+)\.(\d+)\.(\d+)/;
function pad3(n) {
    if (n >= 100)
        return n.toString();
    if (n >= 10)
        return "0" + n.toString();
    return "00" + n.toString();
}
class DubJSONContribution {
    getDocumentSelector() {
        return [{ language: "json", pattern: "**/dub.json", scheme: "file" }];
    }
    getInfoContribution(fileName, location) {
        if (location.path.length < 2 || location.path[location.path.length - 2] != "dependencies")
            return Promise.resolve([]);
        let pack = location.path[location.path.length - 1];
        if (typeof pack === "string") {
            return dub_api_1.getLatestPackageInfo(pack).then(info => {
                let htmlContent = [];
                htmlContent.push("Package " + pack);
                if (info.description) {
                    htmlContent.push(info.description);
                }
                if (info.version) {
                    htmlContent.push("Latest version: " + info.version);
                }
                return htmlContent;
            });
        }
        return Promise.resolve([]);
    }
    collectPropertySuggestions(fileName, location, currentWord, addValue, isLast, result) {
        if (location.path[location.path.length - 1] != "dependencies" && location.path[location.path.length - 2] != "dependencies")
            return Promise.resolve(null);
        return new Promise((resolve, reject) => {
            if (currentWord.length > 0) {
                var colonIdx = currentWord.indexOf(":");
                if (colonIdx == -1) {
                    dub_api_1.searchDubPackages(currentWord).then(json => {
                        json.forEach(element => {
                            var item = new vscode.CompletionItem(element.name);
                            var insertText = new vscode.SnippetString().appendText(JSON.stringify(element.name));
                            if (addValue) {
                                insertText.appendText(': "').appendPlaceholder(element.version).appendText('"');
                                if (!isLast)
                                    insertText.appendText(",");
                            }
                            item.insertText = insertText;
                            item.kind = vscode.CompletionItemKind.Property;
                            item.documentation = element.description;
                            result.add(item);
                        });
                        resolve();
                    }, err => {
                        console.log("Error searching for packages");
                        console.log(err);
                        resolve();
                    });
                }
                else {
                    var pkgName = currentWord.substr(0, colonIdx);
                    dub_api_1.getLatestPackageInfo(pkgName).then(info => {
                        if (info.subPackages)
                            info.subPackages.forEach(subPkgName => {
                                var completionName = pkgName + ":" + subPkgName;
                                var item = new vscode.CompletionItem(completionName);
                                var insertText = new vscode.SnippetString().appendText(JSON.stringify(completionName));
                                if (addValue) {
                                    insertText.appendText(': "').appendPlaceholder(info.version || "").appendText('"');
                                    if (!isLast)
                                        insertText.appendText(",");
                                }
                                item.insertText = insertText;
                                item.kind = vscode.CompletionItemKind.Property;
                                item.documentation = info.description;
                                result.add(item);
                            });
                        resolve();
                    }, err => {
                        result.error("Package not found");
                        resolve();
                    });
                }
            }
            else {
                dub_api_1.listPackages().then(json => {
                    json.forEach(element => {
                        var item = new vscode.CompletionItem(element);
                        item.kind = vscode.CompletionItemKind.Property;
                        var insertText = new vscode.SnippetString().appendText(JSON.stringify(element));
                        if (addValue) {
                            insertText.appendText(': "').appendPlaceholder("").appendText('"');
                            if (!isLast)
                                insertText.appendText(",");
                        }
                        item.insertText = insertText;
                        result.add(item);
                    });
                    resolve();
                }, err => {
                    console.log("Error searching for packages");
                    console.log(err);
                    resolve();
                });
            }
        });
    }
    collectValueSuggestions(fileName, location, result) {
        let currentKey = undefined;
        if (location.path[location.path.length - 2] == "dependencies")
            currentKey = location.path[location.path.length - 1];
        else if (location.path[location.path.length - 3] == "dependencies" && location.path[location.path.length - 1] == "version")
            currentKey = location.path[location.path.length - 2];
        else
            return Promise.resolve(null);
        if (typeof currentKey === "string") {
            return new Promise((resolve, reject) => {
                dub_api_1.getPackageInfo(currentKey).then(json => {
                    var versions = json.versions;
                    if (!versions || !versions.length) {
                        result.error("No versions found");
                        return resolve();
                    }
                    for (var i = versions.length - 1; i >= 0; i--) {
                        var item = new vscode.CompletionItem(versions[i].version);
                        item.detail = "Released on " + new Date(versions[i].date).toLocaleDateString();
                        item.kind = vscode.CompletionItemKind.Class;
                        item.insertText = new vscode.SnippetString().appendPlaceholder("").appendText(versions[i].version);
                        var sortText = "999999999";
                        var semverMatch = semverRegex.exec(versions[i].version);
                        if (semverMatch) {
                            sortText = pad3(999 - parseInt(semverMatch[1])) + pad3(999 - parseInt(semverMatch[2])) + pad3(999 - parseInt(semverMatch[3]));
                        }
                        item.sortText = sortText;
                        result.add(item);
                    }
                    resolve();
                }, error => {
                    result.error(error.toString());
                    resolve();
                });
            });
        }
        return Promise.resolve(null);
    }
    resolveSuggestion(item) {
        if (item.kind === vscode.CompletionItemKind.Property) {
            let pack = item.label;
            return dub_api_1.getLatestPackageInfo(pack).then((info) => {
                if (info.description) {
                    item.documentation = info.description;
                }
                if (info.version) {
                    item.detail = info.version;
                    item.insertText = new vscode.SnippetString(item.insertText.value.replace(/\{\{\}\}/, "{{" + info.version + "}}"));
                }
                return item;
            }, err => {
                return undefined;
            });
        }
        return Promise.resolve(undefined);
    }
}
exports.DubJSONContribution = DubJSONContribution;
//# sourceMappingURL=dub-json.js.map