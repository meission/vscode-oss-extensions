"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var SnippetLevel;
(function (SnippetLevel) {
    /** Outside of functions or types, possibly inside templates */
    SnippetLevel[SnippetLevel["global"] = 0] = "global";
    /** Inside interfaces, classes, structs or unions */
    SnippetLevel[SnippetLevel["type"] = 1] = "type";
    /** Inside method body */
    SnippetLevel[SnippetLevel["method"] = 2] = "method";
    /** inside a variable value, argument call, default value or similar */
    SnippetLevel[SnippetLevel["value"] = 3] = "value";
    /** Other scope types (for example outside of braces but after a function definition or some other invalid syntax place) */
    SnippetLevel[SnippetLevel["other"] = 4] = "other";
})(SnippetLevel = exports.SnippetLevel || (exports.SnippetLevel = {}));
//# sourceMappingURL=api.js.map