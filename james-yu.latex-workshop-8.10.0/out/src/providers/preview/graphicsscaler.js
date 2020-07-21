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
class GraphicsScaler {
    constructor(extension) {
        this.extension = extension;
        this.pool = workerpool.pool(path.join(__dirname, 'graphicsscaler_worker.js'), { maxWorkers: 1, workerType: 'process' });
        this.proxy = this.pool.proxy();
    }
    async scale(filePath, options) {
        return (await this.proxy).scale(filePath, options).timeout(3000);
    }
}
exports.GraphicsScaler = GraphicsScaler;
//# sourceMappingURL=graphicsscaler.js.map