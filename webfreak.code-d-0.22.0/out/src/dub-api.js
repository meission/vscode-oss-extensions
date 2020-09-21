"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
function dubAPI() {
    return util_1.reqJson("https://code.dlang.org/");
}
function searchDubPackages(query) {
    return dubAPI().get("/api/packages/search?q=" + encodeURIComponent(query))
        .then((body) => {
        return body.data;
    }).catch((e) => {
        throw e.response ? "No packages found" : e;
    });
}
exports.searchDubPackages = searchDubPackages;
function listPackages() {
    return dubAPI().get("/packages/index.json")
        .then((body) => {
        return body.data;
    }).catch((e) => {
        throw e.response ? "No packages found" : e;
    });
}
exports.listPackages = listPackages;
var packageCache;
var packageCacheDate = new Date(0);
function listPackageOptions() {
    if (new Date().getTime() - packageCacheDate.getTime() < 15 * 60 * 1000)
        return Promise.resolve(packageCache);
    return dubAPI().get("/api/packages/search").then((body) => {
        var ret = [];
        body.data.forEach(element => {
            ret.push({
                label: element.name,
                description: element.version,
                detail: element.description
            });
        });
        packageCache = ret;
        packageCacheDate = new Date();
        return ret;
    }).catch((e) => {
        throw e.response ? "No packages found" : e;
    });
}
exports.listPackageOptions = listPackageOptions;
function getPackageInfo(pkg) {
    return dubAPI().get("/api/packages/" + encodeURIComponent(pkg) + "/info")
        .then((body) => {
        return body.data;
    }).catch((e) => {
        throw e.response ? "No packages found" : e;
    });
}
exports.getPackageInfo = getPackageInfo;
function getLatestPackageInfo(pkg) {
    return dubAPI().get("/api/packages/" + encodeURIComponent(pkg) + "/latest/info")
        .then((body) => {
        var json = body.data;
        var subPackages = [];
        if (json.info.subPackages)
            json.info.subPackages.forEach((pkg) => {
                subPackages.push(pkg.name);
            });
        return {
            version: json.version,
            description: json.info.description,
            subPackages: subPackages
        };
    });
}
exports.getLatestPackageInfo = getLatestPackageInfo;
//# sourceMappingURL=dub-api.js.map