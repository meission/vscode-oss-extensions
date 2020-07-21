"use strict";
/**
 * copy and modify from lib: chrome-debugging-client
 * add options: clearUserData to control
 */
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
const create_api_client_1 = require("chrome-debugging-client/dist/lib/create-api-client");
const create_debugging_protocol_client_1 = require("chrome-debugging-client/dist/lib//create-debugging-protocol-client");
const create_http_client_1 = require("chrome-debugging-client/dist/lib//create-http-client");
const create_target_connection_1 = require("chrome-debugging-client/dist/lib//create-target-connection");
const create_tmpdir_1 = require("chrome-debugging-client/dist/lib//create-tmpdir");
const disposables_1 = require("chrome-debugging-client/dist/lib//disposables");
const open_web_socket_1 = require("chrome-debugging-client/dist/lib//open-web-socket");
const resolve_browser_1 = require("chrome-debugging-client/dist/lib//resolve-browser");
const spawn_browser_1 = require("chrome-debugging-client/dist/lib//spawn-browser");
const path = require("path");
function createSession(cb) {
    if (cb === undefined) {
        return new Session();
    }
    return usingSession(cb);
}
exports.createSession = createSession;
function usingSession(cb) {
    return __awaiter(this, void 0, void 0, function* () {
        const session = new Session();
        try {
            return yield cb(session);
        }
        finally {
            yield session.dispose();
        }
    });
}
class Session {
    constructor() {
        this.disposables = new disposables_1.default();
    }
    spawnBrowser(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const executablePath = resolve_browser_1.default(options);
            let userDataDir = "";
            if (options.userDataRoot && !options.autoDeleteUseDataDir) {
                userDataDir = path.resolve(options.userDataRoot, "chrome-data");
            }
            else {
                const tmpDir = yield create_tmpdir_1.default(options && options.userDataRoot);
                this.disposables.add(tmpDir);
                userDataDir = tmpDir.path;
            }
            const browserProcess = yield spawn_browser_1.default(executablePath, userDataDir, options);
            this.disposables.add(browserProcess);
            return browserProcess;
        });
    }
    createAPIClient(host, port) {
        return create_api_client_1.default(create_http_client_1.default(host, port));
    }
    openDebuggingProtocol(webSocketDebuggerUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.createDebuggingProtocolClient(this.addDisposable(yield open_web_socket_1.default(webSocketDebuggerUrl)));
        });
    }
    attachToTarget(browserClient, targetId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { sessionId } = yield browserClient.send("Target.attachToTarget", {
                targetId
            });
            return this.createTargetSessionClient(browserClient, sessionId);
        });
    }
    createTargetSessionClient(browserClient, sessionId) {
        const connection = this.addDisposable(create_target_connection_1.default(browserClient, sessionId));
        return this.createDebuggingProtocolClient(connection);
    }
    createSession() {
        return this.addDisposable(new Session());
    }
    dispose() {
        return this.disposables.dispose();
    }
    createDebuggingProtocolClient(connection) {
        return this.addDisposable(create_debugging_protocol_client_1.default(connection));
    }
    addDisposable(disposable) {
        return this.disposables.add(disposable);
    }
}
//# sourceMappingURL=createChromeSession.js.map