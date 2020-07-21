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
const createChromeSession_1 = require("./createChromeSession");
const tot_1 = require("chrome-debugging-client/dist/protocol/tot");
const vscode = require("vscode");
const os = require("os");
const fs = require("fs");
const path = require("path");
class DrawioTab {
    constructor(debugClient) { }
}
/**
 * 管理draw.io的chrome实例
 */
class DrawioChrome {
    constructor(mdFilePath) {
        console.log("open drawio chrome for", this._mdFilePath);
        // 加载assets目录的所有文件到localstorage
        this._initChromeWorkDir();
        this._initAssetsDir(mdFilePath);
    }
    _initChromeWorkDir() {
        console.log("-----!", vscode.workspace.workspaceFolders);
        if (vscode.workspace.workspaceFolders &&
            vscode.workspace.workspaceFolders.length > 0) {
            this._chromeWorkDir = path.resolve(vscode.workspace.workspaceFolders[0].uri.fsPath, ".drawio-chrome");
        }
        else {
            this._chromeWorkDir = path.resolve(os.tmpdir(), "drawio-chrome");
        }
        if (!fs.existsSync(this._chromeWorkDir)) {
            console.log("make assets dir:", this._chromeWorkDir);
            fs.mkdirSync(this._chromeWorkDir);
        }
    }
    _initAssetsDir(mdFile) {
        this._mdFilePath = mdFile;
        const assetsDirName = vscode.workspace
            .getConfiguration("drawio")
            .get("assetsDirName");
        this._assetsPath = path.resolve(mdFile, assetsDirName);
        if (!fs.existsSync(this._assetsPath)) {
            console.log("make assets dir:", this._assetsPath);
            fs.mkdirSync(this._assetsPath);
        }
    }
    /**
     * 初始化并加载assets
     */
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            // 创建新的chrome session
            this._session = yield createChromeSession_1.createSession();
            this._process = yield this._session.spawnBrowser({
                additionalArguments: [
                    "--mute-audio",
                    "--disable-infobars",
                    "--enable-automation",
                ],
                windowSize: { width: 1024, height: 720 },
                userDataRoot: this._chromeWorkDir,
                autoDeleteUseDataDir: false,
                stdio: "inherit",
            });
            // 连接apiclient
            console.log("spawnBrowser:port=", this._process.remoteDebuggingPort);
            this._apiClient = yield this._session.createAPIClient("localhost", this._process.remoteDebuggingPort);
            console.log("apiClient connected");
            // 连接到新打开的tab
            this._tab = (yield this._apiClient.listTabs())[0];
            // 创建debugclient
            this._debugClient = yield this._session.openDebuggingProtocol(this._tab.webSocketDebuggerUrl);
            // 当用户关闭当前debug连接的tab时，关掉整个浏览器
            this._debugClient.on("close", (ev) => __awaiter(this, void 0, void 0, function* () {
                yield this.close();
            }));
            console.log("debugClient connected:", this._tab.webSocketDebuggerUrl);
            // 打开page
            this._page = new tot_1.Page(this._debugClient);
            yield this._page.enable();
            // 打开drawio
            yield this._page.navigate({ url: this._drawioUrl() });
            // 打开storage
            this._domstorage = new tot_1.DOMStorage(this._debugClient);
            yield this._domstorage.enable();
            // dom保存事件
            this._domstorage.domStorageItemUpdated = (params) => __awaiter(this, void 0, void 0, function* () {
                if (params.key.match(".+.svg")) {
                    fs.writeFileSync(path.join(this._assetsPath, params.key), params.newValue);
                    vscode.window.showInformationMessage(`save drawio svg:${params.key}`);
                }
            });
            // 加载所有的assets到浏览器
            yield this._loadAllAssetsToChrome();
        });
    }
    isClosed() {
        return !this._session;
    }
    _drawioUrl(fileName) {
        const offline = vscode.workspace
            .getConfiguration("drawio")
            .get("offline");
        const f = fileName ? `L${fileName}` : "";
        return offline
            ? `https://www.draw.io?offline=1#${f}`
            : `https://www.draw.io#${f}`;
    }
    _loadAllAssetsToChrome() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._domstorage) {
                console.log("domstorage not opened!");
                return;
            }
            const files = fs.readdirSync(this._assetsPath);
            console.log("----readdirSync:", files, this._assetsPath);
            let count = 0;
            for (const f of files) {
                console.log("----dir:", f);
                if (f.startsWith("."))
                    continue;
                if (!fs.statSync(path.join(this._assetsPath, f)).isFile()) {
                    continue;
                }
                if (path.parse(f).ext !== ".svg") {
                    continue;
                }
                yield this._domstorage.setDOMStorageItem({
                    storageId: {
                        isLocalStorage: true,
                        securityOrigin: "https://www.draw.io",
                    },
                    key: f,
                    value: fs.readFileSync(path.join(this._assetsPath, f), {
                        encoding: "utf8",
                    }),
                });
                count++;
                console.log(`${count} load asset to chrome: ${f}`);
            }
            console.log(`${count} file loaded`);
        });
    }
    /**
     * 在第一个tab页面中打开
     * @param svgFile
     */
    active(svgFile) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("active:", svgFile);
            yield this._page.navigate({ url: this._drawioUrl(svgFile) });
            yield this._apiClient.activateTab(this._tab.id);
            // await this._page.navigate()
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            this._domstorage = null;
            if (this._debugClient) {
                yield this._debugClient.dispose();
                this._debugClient = null;
            }
            if (this._page) {
                this._page = null;
            }
            this._apiClient = null;
            if (this._process) {
                yield this._process.dispose();
                this._process = null;
            }
            if (this._session) {
                yield this._session.dispose();
                this._session = null;
            }
            console.log("close chrome for:", this._mdFilePath);
        });
    }
}
exports.DrawioChrome = DrawioChrome;
//# sourceMappingURL=DrawioChrome.js.map