"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseVersions = exports.decidePath = void 0;
function decidePath(name) {
    name = name.toLowerCase();
    if (name.startsWith('"') && name.endsWith('"')) {
        name = name.substring(1, name.length - 1);
    }
    if (name.length === 1) {
        return `1/${name}`;
    }
    if (name.length === 2) {
        return `2/${name}`;
    }
    if (name.length === 3) {
        return `3/${name.charAt(0)}/${name}`;
    }
    return `${name.substring(0, 2)}/${name.substring(2, 4)}/${name}`;
}
exports.decidePath = decidePath;
function parseVersions(response, name) {
    const conv = response.split("\n");
    console.log("Fetching DONE: ", name, conv.length);
    const versions = [];
    for (const rec of conv) {
        try {
            if (rec.trim().length > 0) {
                const parsed = JSON.parse(rec);
                versions.push({ num: parsed.vers, yanked: parsed.yanked });
            }
        }
        catch (er) {
            console.log(er, rec);
        }
    }
    return { versions: versions.sort().reverse() };
}
exports.parseVersions = parseVersions;
//# sourceMappingURL=index-utils.js.map