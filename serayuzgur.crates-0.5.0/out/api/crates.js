"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.versions = void 0;
/**
 * Holds important api calls for the crates.io.
 */
const request_promise_1 = require("request-promise");
const API = "https://crates.io/api/v1";
const data = {};
function cache(key, func, url) {
    if (!data[key] || data[key].isRejected()) {
        console.log("Fetching dependency: ", key);
        data[key] = func(url, {
            headers: {
                "User-Agent": "VSCode.Crates (https://marketplace.visualstudio.com/items?itemName=serayuzgur.crates)",
            },
        })
            .then((response) => {
            try {
                return JSON.parse(response);
            }
            catch (e) {
                console.error(key, e);
                return {};
            }
        })
            .catch((resp) => {
            throw resp;
        });
    }
    return data[key];
}
exports.versions = (name) => cache(name, request_promise_1.get, `${API}/crates/${name}/versions`);
//# sourceMappingURL=crates.js.map