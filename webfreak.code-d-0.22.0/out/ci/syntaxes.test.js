"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const fs = require("fs");
const paths = require("path");
const vsctm = require("vscode-textmate");
const mocha_1 = require("mocha");
function res(path) {
    return paths.join(__dirname, "../../ci", path);
}
function readFile(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(res(path), (error, data) => error ? reject(error) : resolve(data));
    });
}
const registry = new vsctm.Registry({
    loadGrammar: (scopeName) => __awaiter(void 0, void 0, void 0, function* () {
        if (scopeName === 'source.diet') {
            const data = yield readFile('../syntaxes/diet.json');
            return vsctm.parseRawGrammar(data.toString(), '../syntaxes/diet.json');
        }
        else if (scopeName === 'source.d') {
            const data = yield readFile('../syntaxes/d.json');
            return vsctm.parseRawGrammar(data.toString(), '../syntaxes/d.json');
        }
        else if (scopeName === 'source.dml') {
            const data = yield readFile('../syntaxes/dml.json');
            return vsctm.parseRawGrammar(data.toString(), '../syntaxes/dml.json');
        }
        else if (scopeName === 'source.sdl') {
            const data = yield readFile('../syntaxes/sdl.json');
            return vsctm.parseRawGrammar(data.toString(), '../syntaxes/sdl.json');
        }
        console.error(`Unknown scope name: ${scopeName}`);
        return null;
    })
});
function testSyntaxes(grammar, folder, ext) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(res(folder)))
            return resolve(null);
        fs.readdir(res(folder), (err, files) => __awaiter(this, void 0, void 0, function* () {
            if (err)
                return reject(err);
            try {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    if (!file.endsWith(ext))
                        continue;
                    let ruleStack = vsctm.INITIAL;
                    const text = yield readFile(paths.join(folder, file));
                    const lines = text.toString().split(/\r?\n/g);
                    const tokens = lines.map(line => grammar.tokenizeLine(line, ruleStack).tokens.map(a => {
                        return {
                            start: a.startIndex,
                            end: a.endIndex,
                            scope: a.scopes[a.scopes.length - 1]
                        };
                    }));
                    const actual = tokens.map(line => JSON.stringify(line)).join("\n");
                    fs.writeFileSync(res(paths.join(folder, file) + ".actual"), actual);
                    const expectedText = yield readFile(paths.join(folder, file) + ".expected");
                    const expectedLines = expectedText.toString().split(/\r?\n/g);
                    const expectedTokens = expectedLines.map(line => JSON.parse(line));
                    assert.deepStrictEqual(tokens, expectedTokens);
                }
                resolve();
            }
            catch (e) {
                reject(e);
            }
        }));
    });
}
mocha_1.suite("syntax tests", () => {
    mocha_1.test("diet", () => {
        return registry.loadGrammar('source.diet').then(grammar => {
            return testSyntaxes(grammar, "syntax/diet", ".dt");
        });
    });
    mocha_1.test("d", () => {
        return registry.loadGrammar('source.d').then(grammar => {
            return testSyntaxes(grammar, "syntax/d", ".d");
        });
    });
    mocha_1.test("dml", () => {
        return registry.loadGrammar('source.dml').then(grammar => {
            return testSyntaxes(grammar, "syntax/dml", ".dml");
        });
    });
});
//# sourceMappingURL=syntaxes.test.js.map