"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsonc_parser_1 = require("jsonc-parser");
const dub_json_1 = require("./dub-json");
const vscode = require("vscode");
function addJSONProviders() {
    let subscriptions = [];
    // register completion and hove providers for JSON setting file(s)
    let contributions = [new dub_json_1.DubJSONContribution()];
    contributions.forEach(contribution => {
        var provider = new JSONProvider(contribution);
        let selector = contribution.getDocumentSelector();
        subscriptions.push(vscode.languages.registerCompletionItemProvider(selector, provider, '"', ':'));
        subscriptions.push(vscode.languages.registerHoverProvider(selector, provider));
    });
    return vscode.Disposable.from(...subscriptions);
}
exports.addJSONProviders = addJSONProviders;
class JSONProvider {
    constructor(jsonContribution) {
        this.jsonContribution = jsonContribution;
    }
    provideHover(document, position, token) {
        let offset = document.offsetAt(position);
        let location = jsonc_parser_1.getLocation(document.getText(), offset);
        let node = location.previousNode;
        if (node && node.offset <= offset && offset <= node.offset + node.length) {
            let promise = this.jsonContribution.getInfoContribution(document.fileName, location);
            if (promise) {
                return promise.then(htmlContent => {
                    let range = new vscode.Range(document.positionAt(node.offset), document.positionAt(node.offset + node.length));
                    let result = {
                        contents: htmlContent,
                        range: range
                    };
                    return result;
                });
            }
        }
        return null;
    }
    resolveCompletionItem(item, token) {
        if (this.jsonContribution.resolveSuggestion) {
            let resolver = this.jsonContribution.resolveSuggestion(item);
            if (resolver) {
                return resolver;
            }
        }
        return Promise.resolve(item);
    }
    provideCompletionItems(document, position, token) {
        let currentWord = this.getCurrentWord(document, position);
        let overwriteRange = null;
        let items = [];
        let offset = document.offsetAt(position);
        let location = jsonc_parser_1.getLocation(document.getText(), offset);
        let node = location.previousNode;
        if (node && node.offset <= offset && offset <= node.offset + node.length && (node.type === 'property' || node.type === 'string' || node.type === 'number' || node.type === 'boolean' || node.type === 'null')) {
            overwriteRange = new vscode.Range(document.positionAt(node.offset), document.positionAt(node.offset + node.length));
        }
        else {
            overwriteRange = new vscode.Range(document.positionAt(offset - currentWord.length), position);
        }
        let proposed = {};
        let collector = {
            add: (suggestion) => {
                if (!proposed[suggestion.label]) {
                    proposed[suggestion.label] = true;
                    if (overwriteRange) {
                        suggestion.range = overwriteRange;
                    }
                    items.push(suggestion);
                }
            },
            error: (message) => console.error(message),
            log: (message) => console.log(message)
        };
        let collectPromise = null;
        if (location.isAtPropertyKey) {
            let addValue = !location.previousNode || !location.previousNode.colonOffset && (offset == (location.previousNode.offset + location.previousNode.length));
            let scanner = jsonc_parser_1.createScanner(document.getText(), true);
            scanner.setPosition(offset);
            scanner.scan();
            let isLast = scanner.getToken() === 2 /* CloseBraceToken */ || scanner.getToken() === 17 /* EOF */;
            collectPromise = this.jsonContribution.collectPropertySuggestions(document.fileName, location, currentWord, addValue, isLast, collector);
        }
        else if (location.path.length !== 0)
            collectPromise = this.jsonContribution.collectValueSuggestions(document.fileName, location, collector);
        if (collectPromise) {
            return collectPromise.then(() => {
                if (items.length > 0)
                    return new vscode.CompletionList(items);
                else
                    return null;
            });
        }
        return null;
    }
    getCurrentWord(document, position) {
        var i = position.character - 1;
        var text = document.lineAt(position.line).text;
        while (i >= 0 && ' \t\n\r\v"{[,'.indexOf(text.charAt(i)) === -1) {
            i--;
        }
        return text.substring(i + 1, position.character);
    }
}
exports.JSONProvider = JSONProvider;
//# sourceMappingURL=json-contributions.js.map