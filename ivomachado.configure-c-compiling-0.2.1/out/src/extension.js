'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require('vscode');
/// <reference path="node.d.ts" />
var fs = require('fs');
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "configure-c-compiling" is now active!');
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    var launch_json_content = {
        "version": "0.2.0",
        "configurations": [
            {
                "name": "C++ Launch (GDB)",
                "type": "cppdbg",
                "request": "launch",
                "launchOptionType": "Local",
                "targetArchitecture": "x64",
                "program": "${workspaceRoot}/a",
                "args": [],
                "preLaunchTask": "make",
                "stopAtEntry": false,
                "cwd": "${workspaceRoot}",
                "environment": [],
                "externalConsole": true
            },
            {
                "name": "C++ Attach (GDB)",
                "type": "cppdbg",
                "request": "launch",
                "launchOptionType": "Local",
                "targetArchitecture": "x64",
                "program": "enter program name, for example ${workspaceRoot}/a.out",
                "args": [],
                "stopAtEntry": false,
                "cwd": "\${workspaceRoot}",
                "environment": [],
                "processId": "enter program's process ID",
                "externalConsole": false
            }
        ]
    };
    var tasks_json_content = {
        "version": "0.1.0",
        "command": "make",
        "isShellCommand": true,
        "args": [],
        "showOutput": "always"
    };
    var c_settings = {
        "configurations": [
            {
                "name": "Mac",
                "includePath": ["/usr/include"]
            },
            {
                "name": "Linux",
                "includePath": ["/usr/include"]
            },
            {
                "name": "Win32",
                "includePath": [
                    "/x86_64-w64-mingw32/include",
                    "/x86_64-w64-mingw32/include/sys"
                ]
            }
        ],
        "clang_format": {
            "style": "file",
            "fallback-style": "WebKit",
            "sort-includes": true
        }
    };
    if (process.platform == 'win32') {
        launch_json_content.configurations[0].program += '.exe';
        launch_json_content.configurations[0].preLaunchTask = tasks_json_content.command = "mingw32-make";
    }
    var makefile_content = 'CFLAGS = -Wall -g\nSRC=$(wildcard *.c)\nHEADERS=$(wildcard *.h)\na: $(HEADERS) $(SRC) ; gcc -o $@ $^ $(CFLAGS)';
    var disposable = vscode.commands.registerCommand('configure-c-compiling.generateConfigurations', function () {
        fs.writeFile(vscode.workspace.rootPath + '/makefile', makefile_content);
        var new_c_settings = null;
        if (process.platform == 'win32') {
            new_c_settings = {};
            Object.assign(new_c_settings, c_settings);
            new_c_settings.valid = true;
            var includePath = new_c_settings.configurations[2].includePath;
            var mingw_path = vscode.workspace.getConfiguration('configure-c-compiling')['mingwPath'];
            if (mingw_path.endsWith('/'))
                mingw_path = mingw_path.substring(0, mingw_path.length - 1);
            launch_json_content.configurations[0].miDebuggerPath = mingw_path + '/bin/gdb.exe';
            for (var i = 0; i < includePath.length; i++) {
                includePath[i] = mingw_path + includePath[i];
            }
        }
        fs.mkdir(vscode.workspace.rootPath + '/.vscode/', function (e) {
            fs.writeFile(vscode.workspace.rootPath + '/.vscode/launch.json', JSON.stringify(launch_json_content));
            fs.writeFile(vscode.workspace.rootPath + '/.vscode/tasks.json', JSON.stringify(tasks_json_content));
            if (new_c_settings.valid) {
                delete new_c_settings.valid;
                fs.writeFile(vscode.workspace.rootPath + '/.vscode/c_cpp_properties.json', JSON.stringify(new_c_settings));
            }
        });
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map