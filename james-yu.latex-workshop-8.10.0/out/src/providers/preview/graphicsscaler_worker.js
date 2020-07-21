"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const workerpool = __importStar(require("workerpool"));
const jimp_1 = __importDefault(require("jimp"));
async function scale(filePath, opts) {
    const image = await jimp_1.default.read(filePath);
    const scl = Math.min(opts.height / image.getHeight(), opts.width / image.getWidth(), 1);
    const dataUrl = await image.scale(scl).getBase64Async(image.getMIME());
    return dataUrl;
}
const workers = { scale };
workerpool.worker(workers);
//# sourceMappingURL=graphicsscaler_worker.js.map