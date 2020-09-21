"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const axiosLib = require("axios");
const extension_1 = require("./extension");
exports.axios = axiosLib.default;
function reqType(type, baseURL) {
    let proxy = vscode.workspace.getConfiguration("http").get("proxy", "");
    if (proxy)
        process.env["http_proxy"] = proxy;
    return exports.axios.create({
        baseURL,
        responseType: type,
        timeout: 10000,
        headers: {
            "User-Agent": "code-d/" + extension_1.currentVersion + " (github:Pure-D/code-d)"
        }
    });
}
exports.reqType = reqType;
function reqJson(baseURL) {
    return reqType("json", baseURL);
}
exports.reqJson = reqJson;
function reqText(baseURL) {
    return reqType("text", baseURL);
}
exports.reqText = reqText;
//# sourceMappingURL=util.js.map