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
class MathJaxPool {
    constructor(extension) {
        this.extension = extension;
        this.pool = workerpool.pool(path.join(__dirname, 'mathjaxpool_worker.js'), { minWorkers: 1, maxWorkers: 1, workerType: 'process' });
        this.proxy = this.pool.proxy();
    }
    async typeset(arg, opts) {
        return (await this.proxy).typeset(arg, opts).timeout(3000);
    }
}
exports.MathJaxPool = MathJaxPool;
//# sourceMappingURL=mathjaxpool.js.map