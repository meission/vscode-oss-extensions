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
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const cs = __importStar(require("cross-spawn"));
const utils_1 = require("../utils/utils");
const utils_2 = require("../utils/utils");
class Client {
    constructor(viewer, websocket) {
        this.viewer = viewer;
        this.websocket = websocket;
    }
    send(message) {
        this.websocket.send(JSON.stringify(message));
    }
}
class PdfViewerPanel {
    constructor(pdfFilePath, panel) {
        this.pdfFilePath = pdfFilePath;
        this.webviewPanel = panel;
        panel.webview.onDidReceiveMessage((msg) => {
            switch (msg.type) {
                case 'state': {
                    this._state = msg.state;
                    break;
                }
                default: {
                    break;
                }
            }
        });
    }
    get state() {
        return this._state;
    }
}
class PdfViewerPanelSerializer {
    constructor(extension) {
        this.extension = extension;
    }
    deserializeWebviewPanel(panel, state0) {
        const state = state0.state;
        const pdfFilePath = state.path;
        if (!pdfFilePath) {
            this.extension.logger.addLogMessage('Error of restoring PDF viewer: the path of PDF file is undefined.');
            panel.webview.html = '<!DOCTYPE html> <html lang="en"><meta charset="utf-8"/><br>The path of PDF file is undefined.</html>';
            return Promise.resolve();
        }
        if (!fs.existsSync(pdfFilePath)) {
            const s = utils_1.escapeHtml(pdfFilePath);
            this.extension.logger.addLogMessage(`Error of restoring PDF viewer: file not found ${pdfFilePath}.`);
            panel.webview.html = `<!DOCTYPE html> <html lang="en"><meta charset="utf-8"/><br>File not found: ${s}</html>`;
            return Promise.resolve();
        }
        panel.webview.html = this.extension.viewer.getPDFViewerContent(pdfFilePath);
        const pdfPanel = new PdfViewerPanel(pdfFilePath, panel);
        this.extension.viewer.pushPdfViewerPanel(pdfPanel);
        return Promise.resolve();
    }
}
class Viewer {
    constructor(extension) {
        this.clients = {};
        this.webviewPanels = new Map();
        this.stateMessageQueue = new Map();
        this.extension = extension;
        this.pdfViewerPanelSerializer = new PdfViewerPanelSerializer(extension);
    }
    createClients(pdfFilePath) {
        const key = pdfFilePath.toLocaleUpperCase();
        this.clients[key] = this.clients[key] || new Set();
        if (!this.webviewPanels.has(key)) {
            this.webviewPanels.set(key, new Set());
        }
    }
    getClients(pdfFilePath) {
        return this.clients[pdfFilePath.toLocaleUpperCase()];
    }
    getPanelSet(pdfFilePath) {
        return this.webviewPanels.get(pdfFilePath.toLocaleUpperCase());
    }
    refreshExistingViewer(sourceFile, viewer) {
        if (!sourceFile) {
            Object.keys(this.clients).forEach(key => {
                this.clients[key].forEach(client => {
                    client.send({ type: 'refresh' });
                });
            });
            return true;
        }
        const pdfFile = this.extension.manager.tex2pdf(sourceFile, true);
        const clients = this.getClients(pdfFile);
        if (clients !== undefined) {
            let refreshed = false;
            // Check all viewer clients with the same path
            clients.forEach(client => {
                // Refresh only correct type
                if (viewer === undefined || client.viewer === viewer) {
                    this.extension.logger.addLogMessage(`Refresh PDF viewer for ${pdfFile}`);
                    client.send({ type: 'refresh' });
                    refreshed = true;
                }
            });
            // Return if refreshed anyone
            if (refreshed) {
                return true;
            }
        }
        this.extension.logger.addLogMessage(`No PDF viewer connected for ${pdfFile}`);
        return false;
    }
    checkViewer(sourceFile, respectOutDir = true) {
        const pdfFile = this.extension.manager.tex2pdf(sourceFile, respectOutDir);
        if (!fs.existsSync(pdfFile)) {
            this.extension.logger.addLogMessage(`Cannot find PDF file ${pdfFile}`);
            return;
        }
        if (this.extension.server.address === undefined) {
            this.extension.logger.addLogMessage('Cannot establish server connection.');
            return;
        }
        const url = `http://localhost:${this.extension.server.port}/viewer.html?file=${utils_2.encodePathWithPrefix(pdfFile)}`;
        this.extension.logger.addLogMessage(`Serving PDF file at ${url}`);
        this.extension.logger.addLogMessage(`The encoded path is ${pdfFile}`);
        return url;
    }
    openBrowser(sourceFile) {
        const url = this.checkViewer(sourceFile, true);
        if (!url) {
            return;
        }
        const pdfFile = this.extension.manager.tex2pdf(sourceFile);
        this.createClients(pdfFile);
        try {
            vscode.env.openExternal(vscode.Uri.parse(url));
            this.extension.logger.addLogMessage(`Open PDF viewer for ${pdfFile}`);
        }
        catch (e) {
            vscode.window.showInputBox({
                prompt: 'Unable to open browser. Please copy and visit this link.',
                value: url
            });
            this.extension.logger.addLogMessage(`Something bad happened when opening PDF viewer for ${pdfFile}: ${e}`);
        }
    }
    openTab(sourceFile, respectOutDir = true, tabEditorGroup) {
        const url = this.checkViewer(sourceFile, respectOutDir);
        if (!url) {
            return;
        }
        const pdfFile = this.extension.manager.tex2pdf(sourceFile, respectOutDir);
        const editor = vscode.window.activeTextEditor;
        let viewColumn;
        if (tabEditorGroup === 'current') {
            viewColumn = vscode.ViewColumn.Active;
        }
        else {
            // If an editor already exists on the left, use it
            if (tabEditorGroup === 'left' && (editor === null || editor === void 0 ? void 0 : editor.viewColumn) === vscode.ViewColumn.Two) {
                viewColumn = vscode.ViewColumn.One;
            }
            else {
                viewColumn = vscode.ViewColumn.Beside;
            }
        }
        const panel = this.createPdfViewerPanel(pdfFile, viewColumn);
        if (!panel) {
            return;
        }
        if (editor && viewColumn !== vscode.ViewColumn.Active) {
            setTimeout(async () => {
                await vscode.window.showTextDocument(editor.document, editor.viewColumn);
                if (tabEditorGroup === 'left' && viewColumn !== vscode.ViewColumn.One) {
                    await vscode.commands.executeCommand('workbench.action.moveActiveEditorGroupRight');
                }
            }, 500);
        }
        this.extension.logger.addLogMessage(`Open PDF tab for ${pdfFile}`);
    }
    createPdfViewerPanel(pdfFilePath, viewColumn) {
        if (this.extension.server.port === undefined) {
            this.extension.logger.addLogMessage('Server port is undefined');
            return;
        }
        const panel = vscode.window.createWebviewPanel('latex-workshop-pdf', path.basename(pdfFilePath), viewColumn, {
            enableScripts: true,
            retainContextWhenHidden: true,
            portMapping: [{ webviewPort: this.extension.server.port, extensionHostPort: this.extension.server.port }]
        });
        panel.webview.html = this.getPDFViewerContent(pdfFilePath);
        const pdfPanel = new PdfViewerPanel(pdfFilePath, panel);
        this.pushPdfViewerPanel(pdfPanel);
        return pdfPanel;
    }
    pushPdfViewerPanel(pdfPanel) {
        this.createClients(pdfPanel.pdfFilePath);
        const panelSet = this.getPanelSet(pdfPanel.pdfFilePath);
        if (!panelSet) {
            return;
        }
        panelSet.add(pdfPanel);
        pdfPanel.webviewPanel.onDidDispose(() => {
            panelSet.delete(pdfPanel);
        });
    }
    getKeyboardEventConfig() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        const setting = configuration.get('viewer.pdf.internal.keyboardEvent', 'auto');
        if (setting === 'auto') {
            return os.platform() !== 'linux';
        }
        else if (setting === 'force') {
            return true;
        }
        else {
            return false;
        }
    }
    getPDFViewerContent(pdfFile) {
        // viewer/viewer.js automatically requests the file to server.ts, and server.ts decodes the encoded path of PDF file.
        const url = `http://localhost:${this.extension.server.port}/viewer.html?incode=1&file=${utils_2.encodePathWithPrefix(pdfFile)}`;
        const rebroadcast = this.getKeyboardEventConfig();
        return `
            <!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="default-src http://localhost:* http://127.0.0.1:*; script-src 'unsafe-inline'; style-src 'unsafe-inline';"></head>
            <body><iframe id="preview-panel" class="preview-panel" src="${url}" style="position:absolute; border: none; left: 0; top: 0; width: 100%; height: 100%;">
            </iframe>
            <script>
            // when the iframe loads, or when the tab gets focus again later, move the
            // the focus to the iframe so that keyboard navigation works in the pdf.
            //
            // Note: this works on first load, or when navigating between groups, but not when
            //       navigating between tabs of the same group for some reason!
            const iframe = document.getElementById('preview-panel');
            window.onfocus = iframe.onload = function() {
                setTimeout(function() { // doesn't work immediately
                    iframe.contentWindow.focus();
                }, 100);
            }

            const vsStore = acquireVsCodeApi();
            // To enable keyboard shortcuts of VS Code when the iframe is focused,
            // we have to dispatch keyboard events in the parent window.
            // See https://github.com/microsoft/vscode/issues/65452#issuecomment-586036474
            window.addEventListener('message', (e) => {
                if (e.origin !== 'http://localhost:${this.extension.server.port}') {
                    return;
                }
                switch (e.data.type) {
                    case 'initialized': {
                        const state = vsStore.getState();
                        state.type = 'restore_state';
                        iframe.contentWindow.postMessage(state, '*');
                        break;
                    }
                    case 'keyboard_event': {
                        if (${rebroadcast}) {
                            window.dispatchEvent(new KeyboardEvent('keydown', e.data.event));
                        }
                        break;
                    }
                    case 'state': {
                        vsStore.setState(e.data);
                        break;
                    }
                    default:
                        break;
                }
                vsStore.postMessage(e.data)
            });
            </script>
            </body></html>
        `;
    }
    openExternal(sourceFile) {
        const pdfFile = this.extension.manager.tex2pdf(sourceFile);
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        let command = configuration.get('view.pdf.external.viewer.command');
        let args = configuration.get('view.pdf.external.viewer.args');
        if (!command) {
            switch (process.platform) {
                case 'win32':
                    command = 'SumatraPDF.exe';
                    args = ['%PDF%'];
                    break;
                case 'linux':
                    command = 'xdg-open';
                    args = ['%PDF%'];
                    break;
                case 'darwin':
                    command = 'open';
                    args = ['%PDF%'];
                    break;
                default:
                    break;
            }
        }
        if (args) {
            args = args.map(arg => arg.replace('%PDF%', pdfFile));
        }
        this.extension.manager.setEnvVar();
        cs.spawn(command, args, { cwd: path.dirname(sourceFile), detached: true });
        this.extension.logger.addLogMessage(`Open external viewer for ${pdfFile}`);
    }
    handler(websocket, msg) {
        const data = JSON.parse(msg);
        if (data.type !== 'ping') {
            this.extension.logger.addLogMessage(`Handle data type: ${data.type}`);
        }
        switch (data.type) {
            case 'open': {
                const clients = this.getClients(data.path);
                if (clients === undefined) {
                    return;
                }
                const client = new Client(data.viewer, websocket);
                clients.add(client);
                websocket.on('close', () => {
                    clients.delete(client);
                });
                break;
            }
            case 'request_params': {
                const clients = this.getClients(data.path);
                if (!clients) {
                    break;
                }
                for (const client of clients) {
                    if (client.websocket !== websocket) {
                        continue;
                    }
                    const configuration = vscode.workspace.getConfiguration('latex-workshop');
                    client.send({
                        type: 'params',
                        scale: configuration.get('view.pdf.zoom'),
                        trim: configuration.get('view.pdf.trim'),
                        scrollMode: configuration.get('view.pdf.scrollMode'),
                        spreadMode: configuration.get('view.pdf.spreadMode'),
                        hand: configuration.get('view.pdf.hand'),
                        invert: configuration.get('view.pdf.invert'),
                        bgColor: configuration.get('view.pdf.backgroundColor'),
                        keybindings: {
                            synctex: configuration.get('view.pdf.internal.synctex.keybinding')
                        }
                    });
                }
                break;
            }
            case 'loaded': {
                const configuration = vscode.workspace.getConfiguration('latex-workshop');
                if (configuration.get('synctex.afterBuild.enabled')) {
                    this.extension.logger.addLogMessage('SyncTex after build invoked.');
                    this.extension.locator.syncTeX(undefined, undefined, decodeURIComponent(data.path));
                }
                break;
            }
            case 'reverse_synctex': {
                this.extension.locator.locate(data, data.path);
                break;
            }
            case 'external_link': {
                vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(data.url));
                break;
            }
            case 'ping': {
                // nothing to do
                break;
            }
            case 'state': {
                const results = this.stateMessageQueue.get(data.path);
                if (!results) {
                    break;
                }
                results.push({ path: data.path, scrollTop: data.scrollTop });
                break;
            }
            default: {
                this.extension.logger.addLogMessage(`Unknown websocket message: ${msg}`);
                break;
            }
        }
    }
    syncTeX(pdfFile, record) {
        const clients = this.getClients(pdfFile);
        if (clients === undefined) {
            this.extension.logger.addLogMessage(`PDF is not viewed: ${pdfFile}`);
            return;
        }
        const needDelay = this.revealWebviewPanel(pdfFile);
        for (const client of clients) {
            setTimeout(() => {
                client.send({ type: 'synctex', data: record });
            }, needDelay ? 200 : 0);
            this.extension.logger.addLogMessage(`Try to synctex ${pdfFile}`);
        }
    }
    revealWebviewPanel(pdfFilePath) {
        var _a;
        const panelSet = this.getPanelSet(pdfFilePath);
        if (!panelSet) {
            return;
        }
        for (const panel of panelSet.values()) {
            if (panel.webviewPanel.visible) {
                return;
            }
        }
        const activeViewColumn = (_a = vscode.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.viewColumn;
        for (const panel of panelSet.values()) {
            if (panel.webviewPanel.viewColumn !== activeViewColumn) {
                if (!panel.webviewPanel.visible) {
                    panel.webviewPanel.reveal(undefined, true);
                    return true;
                }
                return;
            }
        }
        return;
    }
    async getViewerState(pdfFilePath) {
        const clients = this.getClients(pdfFilePath);
        if (clients === undefined || clients.size === 0) {
            return [];
        }
        this.stateMessageQueue.set(pdfFilePath, []);
        for (const client of clients) {
            client.send({ type: 'request_state' });
        }
        for (let i = 0; i < 30; i++) {
            const results = this.stateMessageQueue.get(pdfFilePath);
            if (results && results.length > 0) {
                this.stateMessageQueue.delete(pdfFilePath);
                return results;
            }
            await utils_1.sleep(100);
        }
        throw new Error('Cannot get viewer state.');
    }
}
exports.Viewer = Viewer;
//# sourceMappingURL=viewer.js.map