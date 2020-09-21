"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const extension_1 = require("./extension");
class DubTasksProvider {
    constructor(served) {
        this.served = served;
    }
    provideTasks(token) {
        let dubLint = extension_1.config(null).get("enableDubLinting", true);
        return this.served.sendRequest("served/buildTasks").then(tasks => {
            var ret = [];
            tasks.forEach(task => {
                var target;
                let cwd = "";
                if (task.scope == "global")
                    target = vscode.TaskScope.Global;
                else if (task.scope == "workspace")
                    target = vscode.TaskScope.Workspace;
                else {
                    let uri = vscode.Uri.parse(task.scope);
                    cwd = uri.fsPath;
                    target = vscode.workspace.getWorkspaceFolder(uri);
                }
                if (!target)
                    return undefined;
                var proc = task.exec.shift() || "exit";
                var args = task.exec;
                task.source += "-auto";
                // workaround to weird behavior that vscode seems to ignore build tasks if the same as user task definition
                task.definition._generated = true;
                if (!dubLint && !Array.isArray(task.problemMatchers) || task.problemMatchers.length == 0)
                    task.problemMatchers = ["$dmd"];
                var t = new vscode.Task(task.definition, target, task.name, task.source, makeExecutor(proc, args, cwd), task.problemMatchers);
                t.isBackground = task.isBackground;
                t.detail = "dub " + args.join(" ");
                switch (task.group) {
                    case "clean":
                        t.group = vscode.TaskGroup.Clean;
                        break;
                    case "build":
                        t.group = vscode.TaskGroup.Build;
                        break;
                    case "rebuild":
                        t.group = vscode.TaskGroup.Rebuild;
                        break;
                    case "test":
                        t.group = vscode.TaskGroup.Test;
                        break;
                }
                ret.push(t);
            });
            return ret;
        });
    }
    resolveTask(task, token) {
        let dubLint = extension_1.config(null).get("enableDubLinting", true);
        var args = [extension_1.config(null).get("dubPath", "dub")];
        args.push(task.definition.test ? "test" : task.definition.run ? "run" : "build");
        if (task.definition.root)
            args.push("--root=" + task.definition.root);
        if (task.definition.overrides)
            task.definition.overrides.forEach(override => {
                args.push("--override-config=" + override);
            });
        if (task.definition.force)
            args.push("--force");
        if (task.definition.compiler)
            args.push("--compiler=" + task.definition.compiler);
        if (task.definition.archType)
            args.push("--arch=" + task.definition.archType);
        if (task.definition.buildType)
            args.push("--build=" + task.definition.buildType);
        if (task.definition.configuration)
            args.push("--config=" + task.definition.configuration);
        if (Array.isArray(task.definition.args))
            args.push.apply(args, task.definition.args);
        let options = task.scope && task.scope.uri;
        let exec = makeExecutor(args.shift() || "exit", args, (options && options.fsPath) || task.definition.cwd || undefined);
        let ret = new vscode.Task(task.definition, task.scope || vscode.TaskScope.Global, task.name || `dub ${task.definition.test ? "Test" : task.definition.run ? "Run" : "Build"}`, "dub", exec, dubLint ? task.problemMatchers : ["$dmd"]);
        ret.detail = "dub " + args.join(" ");
        return ret;
    }
}
exports.DubTasksProvider = DubTasksProvider;
function makeExecutor(proc, args, cwd) {
    let options = cwd ? { cwd: cwd } : undefined;
    return new vscode.ProcessExecution(proc, args, options);
    // return new vscode.ShellExecution({
    // 	value: proc,
    // 	quoting: vscode.ShellQuoting.Strong
    // }, args.map(arg => <vscode.ShellQuotedString>{
    // 	value: arg,
    // 	quoting: vscode.ShellQuoting.Strong
    // }), options);
}
//# sourceMappingURL=dub-tasks.js.map