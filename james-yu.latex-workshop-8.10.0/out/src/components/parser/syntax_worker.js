"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const latex_utensils_1 = require("latex-utensils");
const workerpool = __importStar(require("workerpool"));
function parseLatex(s, options) {
    return latex_utensils_1.latexParser.parse(s, options);
}
function parseLatexPreamble(s) {
    return latex_utensils_1.latexParser.parsePreamble(s);
}
function parseBibtex(s, options) {
    return latex_utensils_1.bibtexParser.parse(s, options);
}
const workers = {
    parseLatex,
    parseLatexPreamble,
    parseBibtex
};
workerpool.worker(workers);
//# sourceMappingURL=syntax_worker.js.map