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
const jsdom_1 = require("jsdom");
const util_1 = require("./util");
const extension_1 = require("./extension");
var DOMParser = require("xmldom").DOMParser;
class WorkState {
    constructor(quickPick, query, fastOpen) {
        this.quickPick = quickPick;
        this.query = query;
        this.fastOpen = fastOpen;
        this.working = 0;
        this.items = [];
        this.depItems = {};
        this.visible = false;
        this.done = false;
        if (fastOpen)
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                cancellable: true
            }, (progress, token) => {
                progress.report({ message: "Looking up documentation" });
                return new Promise((resolve, reject) => {
                    token.onCancellationRequested((e) => {
                        this.done = true;
                        reject();
                    });
                    this.resolve = resolve;
                });
            }).then((result) => {
                // done
            });
    }
    startWork() {
        if (this.done)
            return;
        this.working++;
        this.quickPick.busy = this.working > 0;
    }
    finishWork() {
        if (this.done)
            return;
        this.working--;
        this.quickPick.busy = this.working > 0;
    }
    refreshItems() {
        if (this.done)
            return;
        var ret = this.items.slice();
        for (var key in this.depItems)
            if (this.depItems.hasOwnProperty(key))
                ret.push.apply(ret, this.depItems[key]);
        ret.sort((a, b) => b.score - a.score);
        this.quickPick.items = ret;
        if (!this.visible && this.working <= 0) {
            if (!this.finishQuick()) {
                this.quickPick.show();
                if (this.resolve)
                    this.resolve();
            }
            this.visible = true;
        }
    }
    show() {
        this.quickPick.items = this.items;
        if (this.fastOpen) {
            this.finishQuick();
        }
        else {
            this.quickPick.show();
            this.visible = true;
        }
        this.quickPick.onDidHide((e) => {
            if (this.resolve)
                this.resolve();
            this.done = true;
        });
    }
    finishQuick() {
        if (!this.items || !this.items.length)
            return false;
        let singleItem;
        if (this.items.length == 1) {
            singleItem = this.items[0];
        }
        else if (this.query) {
            let perfect = [];
            let bestScore = 60;
            for (let i = 0; i < this.items.length; i++) {
                const item = this.items[i];
                if (item.label === this.query || item.label.endsWith("/" + this.query)) {
                    perfect.push(item);
                    bestScore = 100;
                }
                else if (item.label.endsWith(this.query) && item.score > bestScore) {
                    singleItem = item;
                    bestScore = item.score;
                }
            }
            if (perfect.length == 1) {
                singleItem = perfect[0];
            }
            else if (perfect.length > 1) {
                singleItem = undefined;
                this.items = perfect;
            }
        }
        if (singleItem) {
            showDocItemUI(singleItem);
            this.quickPick.dispose();
            this.done = true;
        }
        else {
            this.quickPick.show();
        }
        this.visible = true;
        if (this.resolve)
            this.resolve();
        return true;
    }
}
function showDpldocsSearch(query, fastOpen = false) {
    var quickpick = vscode.window.createQuickPick();
    const state = new WorkState(quickpick, query, fastOpen);
    loadDependencyPackageDocumentations(state);
    var timeout;
    function updateSearch(query, delay = 500) {
        timeout = updateRootSearchQuery(timeout, query, state, delay);
    }
    quickpick.onDidChangeValue((value) => updateSearch(value));
    quickpick.placeholder = "Enter search term for symbol...";
    quickpick.onDidAccept(() => {
        var selection = quickpick.selectedItems[0];
        if (selection)
            showDocItemUI(selection);
    });
    state.show();
    if (query) {
        quickpick.value = query;
        updateSearch(query, 0);
    }
}
exports.showDpldocsSearch = showDpldocsSearch;
function fillDplDocs(panel, label, href) {
    return __awaiter(this, void 0, void 0, function* () {
        panel.webview.html = "<h1>" + label + "</h1>";
        if (!href.startsWith("http:") && !href.startsWith("https:"))
            return;
        let body = (yield util_1.reqText().get(href)).data;
        var content = new jsdom_1.JSDOM(body);
        var page = content.window.document.getElementById("page-body");
        if (page) {
            var nonce = Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
            var font = vscode.workspace.getConfiguration("editor").get("fontFamily") || "monospace";
            panel.webview.html = `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>${label}</title>
				<script nonce="${nonce}">
				(function() {
					var vscode = acquireVsCodeApi();
					window.onload = function() {
						var links = document.getElementsByTagName('a');
						for (var i = 0; i < links.length; i++) {
							links[i].onclick = function() {
								var href = this.href || this.getAttribute("href");
								if (href.startsWith("http:") || href.startsWith("https:") || href.startsWith("#"))
									return;
								if (/^\\w+(\\.\\w+)*\\.html$/.test(href))
								{
									vscode.postMessage({ type: "handle-link", href: href, title: this.title });
									return false;
								}
								else if (href.startsWith("source/") && /\\.d\\.html(#L\\d+)?$/.test(href))
								{
									href = href.substr("source/".length);
									var lno = 0;
									if (href.indexOf("L") != -1)
										lno = parseInt(href.substr(href.lastIndexOf("L") + 1));
									var module_ = href.substr(0, href.lastIndexOf(".d.html"));
									vscode.postMessage({ type: "open-module", module_: module_, line: lno });
									return false;
								}
							};
						}
					};
				})();
				</script>
				<style nonce="${nonce}">
					body {
						display: flex;
					}
					pre, code {
						font-family: ${font};
					}
					a {
						text-decoration: none;
					}
					a:hover {
						text-decoration: underline;
					}
					#page-nav {
						box-sizing: border-box;
						width: 16em;
						flex-grow: 0;
						flex-shrink: 0;
						order: 1;
						padding: 1em;
						border-right: 1px solid var(--vscode-editorGroup-border);
					}
					#page-nav a {
						display: block;
					}
					#page-nav a.parent {
						font-weight: bold;
					}
					#page-nav .type-separator {
						text-transform: capitalize;
						display: block;
						margin-top: 1em;
						border-bottom: 1px solid var(--vscode-editorGroup-border);
					}
					#page-nav ul {
						padding: 0;
						list-style: none;
					}
					#page-content {
						box-sizing: border-box;
						flex-grow: 1;
						flex-shrink: 1;
						order: 2;
						padding: 1em;
						padding-left: 2em;
					}
					a.header-anchor {
						text-decoration: none;
						color: var(--vscode-sideBarSectionHeader-foreground);
					}
					.breadcrumbs:empty {
						display: none;
					}
					.breadcrumbs {
						margin: 1em;
						background-color: var(--vscode-editorWidget-background);
						border: 1px solid var(--vscode-editorWidget-border);
						box-shadow: 0 2px 8px var(--vscode-widget-shadow);
					}
					.breadcrumbs a:before {
						content: ' \\00bb\\a0';
					}
					.breadcrumbs a {
						display: inline-block;
						padding: 0.5em;
						color: var(--vscode-breadcrumb-foreground);
						text-decoration: none;
					}
					.breadcrumbs a:hover {
						color: var(--vscode-breadcrumb-focusForeground);
					}
					.function-prototype {
						padding: 2em;
						margin: 1em;
					}
					.inline-code, .d_code, .function-prototype {
						background-color: var(--vscode-editor-background);
						color: var(--vscode-editor-foreground);
						font-family: ${font};
					}
					.d_code {
						padding: 1em;
					}
					.d_code, .function-prototype {
						border: 1px solid var(--vscode-editorGroup-border);
					}
					.toplevel.parameters-list {
						display: table;
					}
					.toplevel.parameters-list > .parameter-item {
						display: table-row;
					}
					.toplevel.parameters-list > .parameter-item > *:first-child {
						padding-left: 2em !important;
					}
					.toplevel.parameters-list > .parameter-item + .comma {
						display: none;
					}
					.toplevel.parameters-list > .parameter-item > *:last-child::after {
						content: ",";
					}
					.toplevel.parameters-list > .parameter-item:last-child > *:last-child::after {
						content: "";
					}
					.toplevel.parameters-list > .parameter-item .parameter-type-holder,
					.toplevel.parameters-list > .parameter-item .parameter-name,
					.toplevel.parameters-list > .parameter-item .parameter-default-value {
						display: table-cell;
						padding: 0px 0.25em;
					}
					.toplevel.parameters-list > .parameter-item:hover {
						background-color: var(--vscode-editor-lineHighlightBackground);
						border: 2px solid var(--vscode-editor-lineHighlightBorder);
					}
					.parameter-attribute {
						padding-left: 1em;
					}
					.aggregate-declaration {
						margin: 1em;
					}
					.aggregate-member {
						padding-left: 2em;
					}
					.template-constraint-expression,
					.parameter-item {
						padding-left: 2em;
					}
					.with-line-wrappers .br {
						-webkit-user-select: none;
						-moz-user-select: none;
						-ms-user-select: none;
						user-select: none;
						width: 3em;
						width: 4ch;
						display: inline-block;
						color: var(--vscode-editorLineNumber-foreground);
						padding: 0px;
						margin: 0px;
						margin-right: 3px;
						padding-right: 3px;
						font-style: normal;
						font-weight: normal;
						background-color: transparent;
						text-align: right;
						white-space: pre;
					}
					.aggregate-members:empty::after {
						content: "This aggregate has no documented members available.";
					}
				</style>
			</head>
			<body>
				${page.innerHTML}
			</body>
			</html>`;
        }
    });
}
exports.fillDplDocs = fillDplDocs;
function loadDependencyPackageDocumentations(state) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!extension_1.served)
            return;
        let deps = yield extension_1.served.getChildren();
        var checked = [];
        deps.forEach(dep => {
            if (dep.info) {
                var strippedVersion = dep.info.version;
                if (strippedVersion.startsWith("~"))
                    strippedVersion = strippedVersion.substr(1);
                var strippedName = dep.info.name;
                var colon = strippedName.indexOf(":");
                if (colon != -1)
                    strippedName = strippedName.substr(0, colon);
                if (checked.indexOf(strippedName) != -1)
                    return;
                checked.push(strippedName);
                if (state.done)
                    return;
                state.startWork();
                loadDependencySymbolsOnline(dep.info, strippedName, strippedVersion).then(docs => {
                    state.finishWork();
                    state.depItems[dep.info.name] = docs;
                    state.refreshItems();
                });
            }
        });
    });
}
function loadDependencySymbolsOnline(dep, strippedDependencyName, strippedDependencyVersion) {
    let url = `https://${encodeURIComponent(strippedDependencyName)}.dpldocs.info/${encodeURIComponent(strippedDependencyVersion)}/search-results.html`;
    let retried = false;
    let doTry = function (url) {
        return util_1.reqText().get(url, { headers: { "Accept-Encoding": "gzip" } }).then((body) => {
            if (body.status == 200) {
                if ((body.headers["content-length"] || body.headers["Content-Length"])) {
                    return parseDependencySearchResult(body.data, dep, strippedDependencyName, strippedDependencyVersion);
                }
                else if (!retried) {
                    retried = true;
                    return doTry(url);
                }
                else {
                    throw body;
                }
            }
            else
                throw body;
        });
    };
    return doTry(url);
}
exports.loadDependencySymbolsOnline = loadDependencySymbolsOnline;
function updateRootSearchQuery(timeout, value, state, delay = 500) {
    if (timeout !== undefined)
        clearTimeout(timeout);
    return setTimeout(() => __awaiter(this, void 0, void 0, function* () {
        if (state.done)
            return;
        state.startWork();
        try {
            let body = (yield util_1.reqText().get("https://dpldocs.info/locate?q=" + encodeURIComponent(value))).data;
            state.finishWork();
            state.items = [];
            let dom = new jsdom_1.JSDOM(body);
            let results = dom.window.document.querySelectorAll("dt.search-result");
            results.forEach(dt => {
                let item = parseDocItem(dt);
                if (item)
                    state.items.push(item);
            });
        }
        catch (e) {
            console.error("Failed searching dpldocs: ", e);
            state.finishWork();
            state.items = [];
        }
        state.refreshItems();
    }), delay);
}
function parseDependencySearchResult(body, dep, strippedDependencyName, strippedDependencyVersion) {
    let start = body.indexOf("<adrdox>");
    if (start == -1)
        return [];
    let end = body.indexOf("</adrdox>", start);
    if (end == -1)
        return [];
    let content = body.substring(start, end + "</adrdox>".length);
    let xml = new DOMParser().parseFromString(content, "text/xml");
    let decls = xml.getElementsByTagName("decl");
    let localItems = [];
    for (let j = 0; j < decls.length; j++) {
        let docEntry = parseDocEntry(decls[j]);
        if (docEntry.name && docEntry.link) {
            let href = docEntry.link;
            let m;
            if (m = /\.(\d+)\.html/.exec(href))
                if (parseInt(m[1]) > 1)
                    continue;
            let obj = {
                dependency: dep,
                label: strippedDependencyName + "/" + docEntry.name,
                href: `https://${encodeURIComponent(strippedDependencyName)}.dpldocs.info/${encodeURIComponent(strippedDependencyVersion)}/${encodeURIComponent(href)}`,
                score: 0
            };
            if (docEntry.desc)
                obj.detail = docEntry.desc;
            localItems.push(obj);
        }
    }
    return localItems;
}
function parseDocEntry(declElem) {
    let name = null;
    let link = null;
    let desc = null;
    for (let i = 0; i < declElem.childNodes.length; i++) {
        let child = declElem.childNodes[i];
        if (child.tagName) {
            if (child.tagName.toLowerCase() == "name")
                name = child;
            else if (child.tagName.toLowerCase() == "link")
                link = child;
            else if (child.tagName.toLowerCase() == "desc")
                desc = child;
        }
    }
    return {
        name: getCleanSimpleTextContent(name),
        link: getCleanSimpleTextContent(link),
        desc: getCleanSimpleTextContent(desc)
    };
}
function parseDocItem(dt) {
    let a = dt.querySelector("a");
    if (!a)
        return;
    let href = a.getAttribute("href");
    if (!href)
        return;
    let score = parseInt(dt.getAttribute("data-score") || "0");
    let obj = {
        label: (a.innerText || a.textContent || "").replace(/[\s\u2000-\u200F]+/g, ""),
        href: href,
        score: score
    };
    if (score > 0)
        obj.description = "Search Score: " + score;
    if (dt.nextElementSibling)
        obj.detail = (dt.nextElementSibling.innerText || dt.nextElementSibling.textContent || "").replace(/[\u2000-\u200F]+/g, "").replace(/([^\S\n]*\n[^\S\n]*\n[^\S\n]*)+/g, "\n\n");
    return obj;
}
function getCleanSimpleTextContent(elem) {
    return elem ? (elem.innerText || elem.textContent || "").replace(/<\/?.*?>/g, "").replace(/[\u2000-\u200F]+/g, "").trim() : elem;
}
function showDocItemUI(docItem) {
    var panel = vscode.window.createWebviewPanel("dpldocs", docItem.label, {
        viewColumn: vscode.ViewColumn.Active
    }, {
        enableCommandUris: false,
        enableFindWidget: true,
        enableScripts: true,
        localResourceRoots: []
    });
    var baseUri = docItem.href;
    panel.webview.onDidReceiveMessage((msg) => {
        switch (msg.type) {
            case "handle-link":
                let href = path.posix.normalize(msg.href);
                let uri = vscode.Uri.parse(baseUri);
                if (href.startsWith("/")) {
                    baseUri = uri.with({
                        path: href
                    }).toString();
                }
                else {
                    let file = uri.path;
                    let slash = file.lastIndexOf("/");
                    file = file.substring(0, slash + 1) + href;
                    baseUri = uri.with({
                        path: file
                    }).toString();
                }
                fillDplDocs(panel, msg.title, baseUri);
                break;
            case "open-module":
                let module_ = msg.module_;
                let line = msg.line;
                focusModule(module_, line);
                break;
        }
    });
    fillDplDocs(panel, docItem.label, docItem.href);
}
function focusModule(module_, line) {
    extension_1.served.findFilesByModule(module_).then(files => {
        if (!files.length) {
            vscode.window.showErrorMessage("Could not find module " + module_);
        }
        else {
            vscode.workspace.openTextDocument(files[0]).then(doc => {
                vscode.window.showTextDocument(doc).then(editor => {
                    if (line > 0) {
                        var pos = new vscode.Position(line - 1, 0);
                        editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
                        editor.selection.active = pos;
                    }
                });
            });
        }
    });
}
//# sourceMappingURL=dpldocs.js.map