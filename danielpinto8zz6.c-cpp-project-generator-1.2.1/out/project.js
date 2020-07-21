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
const vscode = require("vscode");
const fs = require("fs-extra");
const path = require("path");
const vscode_ui_1 = require("./vscode-ui");
class Project {
    constructor(context) {
        this.directories = new Array('.vscode', 'bin', 'include', 'lib', 'src');
        this.context = context;
    }
    createFiles({ type, location }) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const tasksPath = path.join(this.context.extensionPath, 'templates', 'tasks.json');
                const launchPath = path.join(this.context.extensionPath, 'templates', 'launch.json');
                const mainPath = path.join(this.context.extensionPath, 'templates', type, `main.${type}`);
                const makefilePath = path.join(this.context.extensionPath, 'templates', type, 'Makefile');
                fs.writeFileSync(path.join(location, '.vscode', 'tasks.json'), fs.readFileSync(tasksPath, 'utf-8'));
                fs.writeFileSync(path.join(location, '.vscode', 'launch.json'), fs.readFileSync(launchPath, 'utf-8'));
                fs.writeFileSync(path.join(location, 'src', `main.${type}`), fs.readFileSync(mainPath, 'utf-8'));
                fs.writeFileSync(path.join(location, 'Makefile'), fs.readFileSync(makefilePath, 'utf-8'));
                vscode.workspace.openTextDocument(path.join(location, 'src', 'main.cpp'))
                    .then(doc => vscode.window.showTextDocument(doc, { preview: false }));
            }
            catch (err) {
                console.error(err);
            }
        });
    }
    createFolders(location) {
        return __awaiter(this, void 0, void 0, function* () {
            this.directories.forEach((dir) => {
                try {
                    fs.ensureDirSync(path.join(location, dir));
                }
                catch (err) {
                    console.error(err);
                }
            });
        });
    }
    createProject(type) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield vscode_ui_1.VSCodeUI.openDialogForFolder();
            if (result && result.fsPath) {
                yield vscode.commands.executeCommand('vscode.openFolder', result);
                yield this.createFolders(result.fsPath);
                yield this.createFiles({ type, location: result.fsPath });
            }
        });
    }
}
exports.Project = Project;
//# sourceMappingURL=project.js.map