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
const project_1 = require("./project");
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        const project = new project_1.Project(context);
        const createCProjectCommand = vscode.commands.registerCommand('extension.createCProject', () => {
            project.createProject('c')
                .catch(error => console.log(error));
        });
        const createCppProjectCommand = vscode.commands.registerCommand('extension.createCppProject', () => {
            project.createProject('cpp')
                .catch(error => console.log(error));
        });
        context.subscriptions.push(createCProjectCommand, createCppProjectCommand);
    });
}
exports.activate = activate;
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map