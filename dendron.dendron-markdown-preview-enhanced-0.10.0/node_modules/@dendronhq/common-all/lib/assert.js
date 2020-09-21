"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assert = exports.assertExists = exports.AssertionError = void 0;
const lodash_1 = __importDefault(require("lodash"));
class AssertionError extends Error {
}
exports.AssertionError = AssertionError;
function assertExists(val, msg) {
    if (lodash_1.default.isNull(val) || lodash_1.default.isUndefined(val)) {
        throw new AssertionError(msg);
    }
    // @ts-ignore
    return val;
}
exports.assertExists = assertExists;
function assert(statement, msg) {
    if (!statement) {
        throw new AssertionError(msg);
    }
    else {
        return true;
    }
}
exports.assert = assert;
//# sourceMappingURL=assert.js.map