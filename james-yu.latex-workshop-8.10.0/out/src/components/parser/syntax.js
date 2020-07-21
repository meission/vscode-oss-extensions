"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const workerpool = __importStar(require("workerpool"));
class UtensilsParser {
    constructor(extension) {
        this.extension = extension;
        this.pool = workerpool.pool(path.join(__dirname, 'syntax_worker.js'), { minWorkers: 1, maxWorkers: 1, workerType: 'process' });
        this.proxy = this.pool.proxy();
    }
    async parseLatex(s, options) {
        return (await this.proxy).parseLatex(s, options).timeout(3000).catch(() => undefined);
    }
    async parseLatexPreamble(s) {
        return (await this.proxy).parseLatexPreamble(s).timeout(500);
    }
    async parseBibtex(s, options) {
        return (await this.proxy).parseBibtex(s, options).timeout(30000);
    }
}
exports.UtensilsParser = UtensilsParser;
//# sourceMappingURL=syntax.js.map