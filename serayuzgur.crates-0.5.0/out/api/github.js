"use strict";
// repo
// https://api.github.com/repos/rust-lang/crates.io-index
// master
// https://api.github.com/repos/rust-lang/crates.io-index/branches/master
//commit.tree.url
// tree , find by path. go in
Object.defineProperty(exports, "__esModule", { value: true });
exports.versions = void 0;
/**
 * Holds important api calls for the crates.io.
 */
const request_promise_1 = require("request-promise");
const index_utils_1 = require("./index-utils");
const API = "https://api.github.com/repos/rust-lang/crates.io-index";
const data = {};
function cache(key, func, url, githubToken) {
    if (!data[key] || data[key].isRejected()) {
        console.log("Fetching dependency: ", key);
        const headers = {
            "User-Agent": "VSCode.Crates (https://marketplace.visualstudio.com/items?itemName=serayuzgur.crates)",
            Accept: "application/vnd.github.VERSION.raw",
        };
        if (githubToken) {
            headers.Authorization = githubToken;
        }
        data[key] = func(url, {
            headers
        })
            .then((response) => index_utils_1.parseVersions(response, key))
            .catch((resp) => {
            console.error(resp);
            throw resp;
        });
    }
    return data[key];
}
exports.versions = (name, githubToken) => {
    return cache(name, request_promise_1.get, `${API}/contents/${index_utils_1.decidePath(name)}`, githubToken);
};
//# sourceMappingURL=github.js.map