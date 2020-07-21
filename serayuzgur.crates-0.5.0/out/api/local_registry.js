"use strict";
// Please note that the internal structure of the Cargo home is not stabilized and may be subject to change at any time.
//
// Nevertheless, this api depends on there being a headless crates.io-index git repo at:
// CARGO_HOME/registry/index/github.com-1ecc6299db9ec823/.git/
// The repo isn't updated, and is instead assumed to be updated by cargo reasonably recently.
//
// Furthermore, this api depends on 'git' command being in PATH
Object.defineProperty(exports, "__esModule", { value: true });
exports.versions = exports.checkCargoRegistry = void 0;
const os = require("os");
const path = require("path");
const util = require("util");
const fs = require("fs");
const index_utils_1 = require("./index-utils");
const exec = util.promisify(require('child_process').exec);
// check for the crates index. If none found switch to github and show error
const cargoHome = process.env.CARGO_HOME || path.resolve(os.homedir(), ".cargo/");
const gitDir = path.resolve(cargoHome, "registry/index/github.com-1ecc6299db9ec823/.git/");
function checkCargoRegistry() {
    return fs.existsSync(gitDir);
}
exports.checkCargoRegistry = checkCargoRegistry;
exports.versions = (name) => {
    return exec(`git --no-pager --git-dir=${gitDir} show origin/master:${index_utils_1.decidePath(name)}`, { maxBuffer: 8 * 1024 * 1024 } // "8M ought to be enough for anyone."
    )
        .then((buf) => {
        const response = buf.stdout.toString();
        return index_utils_1.parseVersions(response, name);
    })
        .catch((resp) => {
        console.error(resp);
        throw resp;
    });
};
//# sourceMappingURL=local_registry.js.map