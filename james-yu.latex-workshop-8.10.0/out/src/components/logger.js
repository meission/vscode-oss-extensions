"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = __importStar(require("vscode"));
class Logger {
    constructor(extension) {
        this.extension = extension;
        this.logPanel = vscode.window.createOutputChannel('LaTeX Workshop');
        this.compilerLogPanel = vscode.window.createOutputChannel('LaTeX Compiler');
        this.compilerLogPanel.append('Ready');
        this.addLogMessage('Initializing LaTeX Workshop.');
        this.status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -10000);
        this.status.command = 'latex-workshop.actions';
        this.status.show();
        this.displayStatus('check', 'statusBar.foreground');
    }
    addLogMessage(message) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        if (configuration.get('message.log.show')) {
            this.logPanel.append(`[${new Date().toLocaleTimeString('en-US', { hour12: false })}] ${message}\n`);
        }
    }
    addCompilerMessage(message) {
        this.compilerLogPanel.append(message);
    }
    logError(e) {
        this.addLogMessage(e.message);
        if (e.stack) {
            this.addLogMessage(e.stack);
        }
    }
    logOnRejected(e) {
        if (e instanceof Error) {
            this.logError(e);
        }
        else {
            this.addLogMessage(String(e));
        }
    }
    clearCompilerMessage() {
        this.compilerLogPanel.clear();
    }
    displayStatus(icon, color, message = undefined, severity = 'info', build = '') {
        this.status.text = `$(${icon})${build}`;
        this.status.tooltip = message;
        this.status.color = new vscode.ThemeColor(color);
        if (message === undefined) {
            return;
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        switch (severity) {
            case 'info':
                if (configuration.get('message.information.show')) {
                    vscode.window.showInformationMessage(message);
                }
                break;
            case 'warning':
                if (configuration.get('message.warning.show')) {
                    vscode.window.showWarningMessage(message);
                }
                break;
            case 'error':
            default:
                if (configuration.get('message.error.show')) {
                    vscode.window.showErrorMessage(message);
                }
                break;
        }
    }
    showErrorMessage(message, ...args) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        if (configuration.get('message.error.show')) {
            return vscode.window.showErrorMessage(message, ...args);
        }
        else {
            return undefined;
        }
    }
    showLog() {
        this.logPanel.show();
    }
    showCompilerLog() {
        this.compilerLogPanel.show();
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map