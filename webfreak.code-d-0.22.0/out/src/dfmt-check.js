"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
function getMatchIndices(regex, str) {
    let result = [];
    let match;
    while (match = regex.exec(str))
        result.push(match.index);
    return result;
}
let validDfmt = /\/\/dfmt (off|on)(\n|\s+|$)/;
function lintDfmt(doc, code = doc ? doc.getText() : "") {
    let locations = getMatchIndices(/\/\/dfmt/g, code);
    let issues = [];
    let isOn = true;
    locations.forEach(location => {
        let part = code.substr(location, 11);
        let match = validDfmt.exec(part);
        if (!match) {
            let pos = doc ? doc.positionAt(location) : new vscode.Position(0, 0);
            issues.push(new vscode.Diagnostic(new vscode.Range(pos, pos.translate(0, 100)), "Not a valid dfmt command (try //dfmt off or //dfmt on instead)", vscode.DiagnosticSeverity.Warning));
        }
        else {
            if (match[1] == "off") {
                if (!isOn) {
                    let pos = doc ? doc.positionAt(location) : new vscode.Position(0, 0);
                    issues.push(new vscode.Diagnostic(new vscode.Range(pos, pos.translate(0, 10)), "Redundant //dfmt off", vscode.DiagnosticSeverity.Information));
                }
                isOn = false;
            }
            else {
                if (isOn) {
                    let pos = doc ? doc.positionAt(location) : new vscode.Position(0, 0);
                    issues.push(new vscode.Diagnostic(new vscode.Range(pos, pos.translate(0, 9)), "Redundant //dfmt on", vscode.DiagnosticSeverity.Information));
                }
                isOn = true;
            }
        }
    });
    return issues;
}
exports.lintDfmt = lintDfmt;
//# sourceMappingURL=dfmt-check.js.map