"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const extension_1 = require("./extension");
class DubTasksProvider {
    constructor(served) {
        this.served = served;
    }
    provideTasks(token) {
        return this.served.sendRequest("served/buildTasks").then(tasks => {
            var ret = [];
            tasks.forEach(task => {
                var target;
                if (task.scope == "global")
                    target = vscode.TaskScope.Global;
                else if (task.scope == "workspace")
                    target = vscode.TaskScope.Workspace;
                else
                    target = vscode.workspace.getWorkspaceFolder(vscode.Uri.parse(task.scope));
                if (!target)
                    return undefined;
                var proc = "";
                var args = [];
                if (task.exec.length >= 1)
                    proc = task.exec[0];
                if (task.exec.length >= 2) {
                    args = task.exec;
                    args.shift();
                }
                var t = new vscode.Task(task.definition, target, task.name, task.source, new vscode.ProcessExecution(proc, args), task.problemMatchers);
                t.isBackground = task.isBackground;
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
        if (task.execution)
            task.execution.args = args;
        if (args.length > 2)
            vscode.window.showInformationMessage("Congratulation on finding out how to get this working. "
                + "First person who sends in reproduction steps gets 10$ on paypal", {
                modal: true
            }, "Submit Reproduction").then(v => {
                if (v == "Submit Reproduction") {
                    vscode.env.openExternal(vscode.Uri.parse("https://github.com/Pure-D/code-d/issues/new"));
                }
            });
        return task;
    }
}
exports.DubTasksProvider = DubTasksProvider;
//# sourceMappingURL=dub-tasks.js.map