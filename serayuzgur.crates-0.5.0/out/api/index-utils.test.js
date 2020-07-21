"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mocha_1 = require("mocha");
const assert = require("assert");
const index_utils_1 = require("./index-utils");
mocha_1.suite("Index Utils Tests", function () {
    mocha_1.test("decidePath", function () {
        assert.equal(index_utils_1.decidePath("a"), "1/a");
        assert.equal(index_utils_1.decidePath('"a"'), "1/a");
        assert.equal(index_utils_1.decidePath("a1"), "2/a1");
        assert.equal(index_utils_1.decidePath("aac"), "3/a/aac");
        assert.equal(index_utils_1.decidePath("weld"), "we/ld/weld");
        assert.equal(index_utils_1.decidePath("weldmock"), "we/ld/weldmock");
        assert.equal(index_utils_1.decidePath("e2fslibs-sys"), "e2/fs/e2fslibs-sys");
        assert.equal(index_utils_1.decidePath('"e2fslibs-sys"'), "e2/fs/e2fslibs-sys");
        assert.equal(index_utils_1.decidePath('"Inflector"'), "in/fl/inflector");
    });
});
//# sourceMappingURL=index-utils.test.js.map