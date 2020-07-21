'use strict';
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
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const os = require("os");
const fs_1 = require("fs");
const node_fetch_1 = require("node-fetch");
const child_process_1 = require("child_process");
const baseUrl = 'https://raw.githubusercontent.com/acharluk/easy-cpp-projects/master';
const customTemplatesFolder = (() => {
    let e = vscode.extensions.getExtension('ACharLuk.easy-cpp-projects');
    if (!e) {
        return '';
    }
    let dir = `${e.extensionPath}\\..\\easycpp_custom_templates`;
    if (os.type() !== 'Windows_NT') {
        dir = `${e.extensionPath}/../easycpp_custom_templates`;
    }
    if (!fs_1.existsSync(dir)) {
        try {
            fs_1.mkdirSync(dir);
            fs_1.writeFileSync(`${dir}/files.json`, `{
    "templates": {
        "Example Custom Template": {
            "directories": [
                "ExampleDirectory"
            ],
            "blankFiles": [
                "HelloWorld.txt"
            ],
            "openFiles": [
                "HelloWorld.txt"
            ]
        }
    }
}`);
        }
        catch (err) {
            console.error(err);
        }
    }
    return dir;
})();
function activate(context) {
    let createProjectCommand = vscode.commands.registerCommand('easycpp.createProject', createProject);
    let createClassCommand = vscode.commands.registerCommand('easycpp.createClass', createClass);
    let createGetterSetterCommand = vscode.commands.registerCommand('easycpp.createGetterSetter', createGetterSetter);
    let createGetterCommand = vscode.commands.registerCommand('easycpp.createGetter', createGetter);
    let createSetterCommand = vscode.commands.registerCommand('easycpp.createSetter', createSetter);
    let openCustomTemplateCommand = vscode.commands.registerCommand('easycpp.openCustomDir', openCustomDir);
    let convertToEasyProjectCommand = vscode.commands.registerCommand('easycpp.convertToEasyProject', convertToEasyProject);
    let buildButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
    buildButton.command = 'workbench.action.tasks.build';
    buildButton.text = '⚙ Build';
    buildButton.tooltip = 'Build C++ Project (make) [Ctrl+F7]';
    buildButton.show();
    let buildAndRunButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
    buildAndRunButton.command = 'workbench.action.tasks.test';
    buildAndRunButton.text = '▶ Build & Run';
    buildAndRunButton.tooltip = 'Build & Run C++ Project (make run) [F7]';
    buildAndRunButton.show();
    context.subscriptions.push(buildButton);
    context.subscriptions.push(buildAndRunButton);
    context.subscriptions.push(createProjectCommand);
    context.subscriptions.push(createClassCommand);
    context.subscriptions.push(createGetterSetterCommand);
    context.subscriptions.push(createGetterCommand);
    context.subscriptions.push(createSetterCommand);
    context.subscriptions.push(openCustomTemplateCommand);
    context.subscriptions.push(convertToEasyProjectCommand);
}
exports.activate = activate;
function deactivate() {
}
exports.deactivate = deactivate;
const convertToEasyProject = () => {
    let wpath = vscode.workspace.workspaceFolders;
    if (!wpath) {
        vscode.window.showErrorMessage(`A directory must be opened to run this command!`);
        return;
    }
    let path = wpath[0].uri.fsPath;
    if (!fs_1.existsSync(`${path}/.vscode`)) {
        fs_1.mkdirSync(`${path}/.vscode`);
    }
    fs_1.writeFileSync(`${path}/.vscode/.easycpp`, 'This file is created by Easy C++ Projects, please ignore and do not delete it');
};
const openCustomDir = () => {
    let dir = customTemplatesFolder;
    const currentOs = os.type();
    if (currentOs === 'Linux') {
        child_process_1.spawn('xdg-open', [`${dir}`]); // /out/templates/custom
    }
    else if (currentOs === 'Darwin') {
        child_process_1.spawn('open', [`${dir}`]); // /out/templates/custom
    }
    else if (currentOs === 'Windows_NT') {
        child_process_1.spawn('explorer', [`${dir}`]); // \\out\\templates\\custom
    }
};
const createClass = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield node_fetch_1.default(`${baseUrl}/templates/classes/files.json`);
        const templates = yield data.json();
        const template_files = [];
        for (let tname in templates) {
            template_files.push(tname);
        }
        const selected = yield vscode.window.showQuickPick(template_files);
        if (!selected) {
            return;
        }
        const val = yield vscode.window.showInputBox({ prompt: `Enter class name` });
        if (!val || !vscode.window.activeTextEditor) {
            return;
        }
        const currentFolderWorkspace = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri);
        if (!currentFolderWorkspace) {
            return;
        }
        const currentFolder = currentFolderWorkspace.uri.fsPath;
        for (let file in templates[selected]) {
            const value = yield node_fetch_1.default(`${baseUrl}/templates/classes/${selected}/${file}`);
            let data = yield value.text();
            data = data.replace(new RegExp('easyclass', 'g'), val);
            fs_1.writeFileSync(`${currentFolder}/${templates[selected][file].folder}/${val}.${templates[selected][file].extension}`, data);
            vscode.workspace.openTextDocument(`${currentFolder}/${templates[selected][file].folder}/${val}.${templates[selected][file].extension}`)
                .then(doc => vscode.window.showTextDocument(doc, { preview: false }));
        }
    }
    catch (err) {
        vscode.window.showErrorMessage(`Easy C++ error: ${err}`);
    }
});
const createProject = (local) => __awaiter(void 0, void 0, void 0, function* () {
    if (!vscode.workspace.workspaceFolders) {
        vscode.window.showErrorMessage("Open a folder or workspace before creating a project!");
        return;
    }
    let templates = [];
    try {
        let data;
        if (local) {
            const res = fs_1.readFileSync(`${__dirname}/templates/project/files.json`);
            data = JSON.parse(res.toString());
        }
        else {
            const res = yield node_fetch_1.default(`${baseUrl}/templates/project/files.json`);
            data = yield res.json();
        }
        for (let tname in data.templates) {
            templates.push(tname);
        }
        templates.push("Custom templates");
        const selected = yield vscode.window.showQuickPick(templates);
        if (selected === "Custom templates") {
            const res = fs_1.readFileSync(`${customTemplatesFolder}/files.json`);
            const data = JSON.parse(res.toString());
            templates = [];
            for (let tname in data.templates) {
                templates.push(tname);
            }
            const selected = yield vscode.window.showQuickPick(templates);
            yield selectFolderAndDownload(data, selected, true, true);
            vscode.workspace.getConfiguration('files').update('associations', { "*.tpp": "cpp" }, vscode.ConfigurationTarget.Workspace);
            vscode.workspace.getConfiguration('terminal.integrated.shell').update('windows', "cmd.exe", vscode.ConfigurationTarget.Workspace);
        }
        else {
            yield selectFolderAndDownload(data, selected, local);
            vscode.workspace.getConfiguration('files').update('associations', { "*.tpp": "cpp" }, vscode.ConfigurationTarget.Workspace);
            vscode.workspace.getConfiguration('terminal.integrated.shell').update('windows', "cmd.exe", vscode.ConfigurationTarget.Workspace);
        }
    }
    catch (error) {
        if (local) {
            vscode.window.showErrorMessage(`Easy C++ Projects error: Could not load 'files.json' locally.\nError: ${error}`);
        }
        else {
            vscode.window.showWarningMessage(`Easy C++ Projects error: Could not fetch 'files.json' from GitHub, using local files.\nError: ${error}`);
            createProject(true);
        }
    }
});
const selectFolderAndDownload = (files, templateName, local, custom) => __awaiter(void 0, void 0, void 0, function* () {
    if (!templateName || !vscode.workspace.workspaceFolders) {
        return;
    }
    if (vscode.workspace.workspaceFolders.length > 1) {
        try {
            const chosen = yield vscode.window.showWorkspaceFolderPick();
            if (!chosen) {
                return;
            }
            let folder = chosen.uri;
            yield downloadTemplate(files, templateName, folder.fsPath, local);
        }
        catch (err) {
            vscode.window.showErrorMessage(`Easy C++ error: ${err}`);
        }
    }
    else {
        downloadTemplate(files, templateName, vscode.workspace.workspaceFolders[0].uri.fsPath, local, custom);
    }
});
const downloadTemplate = (files, templateName, folder, local, custom) => __awaiter(void 0, void 0, void 0, function* () {
    if (files.directories) {
        files.directories.forEach((dir) => {
            if (!fs_1.existsSync(`${folder}/${dir}`)) {
                fs_1.mkdirSync(`${folder}/${dir}`);
            }
        });
    }
    let directories = files.templates[templateName].directories;
    if (directories) {
        directories.forEach((dir) => {
            if (!fs_1.existsSync(`${folder}/${dir}`)) {
                fs_1.mkdirSync(`${folder}/${dir}`);
            }
        });
    }
    let blankFiles = files.templates[templateName].blankFiles;
    if (blankFiles) {
        blankFiles.forEach((file) => {
            if (!fs_1.existsSync(`${folder}/${file}`)) {
                fs_1.writeFileSync(`${folder}/${file}`, '');
            }
        });
    }
    let f = files.templates[templateName].files;
    if (f) {
        for (let file in f) {
            try {
                let data;
                if (local) {
                    if (custom) {
                        data = fs_1.readFileSync(`${customTemplatesFolder}/${file}`).toString();
                    }
                    else {
                        data = fs_1.readFileSync(`${__dirname}/templates/project/${file}`).toString();
                    }
                }
                else {
                    const res = yield node_fetch_1.default(`${baseUrl}/templates/project/${file}`);
                    data = yield res.text();
                }
                fs_1.writeFileSync(`${folder}/${f[file]}`, data);
            }
            catch (error) {
                if (local) {
                    vscode.window.showErrorMessage(`Easy C++ Projects error: Could not load '${file}' locally.\nError: ${error}`);
                }
                else {
                    vscode.window.showWarningMessage(`Easy C++ Projects error: Could not download '${file}' from GitHub, using local files.\nError: ${error}`);
                }
            }
        }
    }
    let openFiles = files.templates[templateName].openFiles;
    if (openFiles) {
        for (let file of openFiles) {
            if (fs_1.existsSync(`${folder}/${file}`)) {
                vscode.workspace.openTextDocument(`${folder}/${file}`)
                    .then(doc => vscode.window.showTextDocument(doc, { preview: false }));
            }
        }
    }
    if (!fs_1.existsSync(`${folder}/.vscode`)) {
        fs_1.mkdirSync(`${folder}/.vscode`);
    }
    fs_1.writeFileSync(`${folder}/.vscode/.easycpp`, 'This file is created by Easy C++ Projects, please ignore and do not delete it');
});
const createGetterSetter = (getter, setter) => {
    if (!getter && !setter) {
        getter = setter = true;
    }
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    const getterSnippet = (variableName, variableType) => {
        return new vscode.SnippetString(`
    ${variableType} get${variableName.charAt(0).toUpperCase() + variableName.substring(1)}() {
        return ${variableName};
    }
    `);
    };
    const setterSnippet = (variableName, variableType) => {
        return new vscode.SnippetString(`
    void set${variableName.charAt(0).toUpperCase() + variableName.substring(1)}(${variableType} ${variableName}) {
        this->${variableName} = ${variableName};
    }
    `);
    };
    let selection = editor.selection;
    let selectedText = editor.document.getText(new vscode.Range(selection.start, selection.end)).trim();
    let lines = selectedText.split('\n');
    let createData = [];
    for (let line of lines) {
        if (!/\s*\w+\s+[*]*\w+\s*(,\s*\w+\s*)*;+/.test(line)) {
            vscode.window.showErrorMessage(`Syntax error, cannot create getter or setter: ${line}`);
            return;
        }
        let type = line.search(/\w+\s+/);
        let firstSpace = line.indexOf(' ', type);
        let vType = line.substring(type, firstSpace).trim();
        line = line.substring(firstSpace).trim();
        let vNames = line.replace(' ', '').replace(';', '').split(',');
        vNames.forEach(e => {
            while (e.includes('*')) {
                e = e.replace('*', '');
                vType += '*';
            }
            createData.push({ type: vType, name: e });
        });
    }
    for (let e of createData) {
        if (getter) {
            editor.insertSnippet(getterSnippet(e.name, e.type), new vscode.Position(selection.end.line + 1, 0));
        }
        if (setter) {
            editor.insertSnippet(setterSnippet(e.name, e.type), new vscode.Position(selection.end.line + 1, 0));
        }
    }
};
const createGetter = () => createGetterSetter(true, false);
const createSetter = () => createGetterSetter(false, true);
//# sourceMappingURL=extension.js.map