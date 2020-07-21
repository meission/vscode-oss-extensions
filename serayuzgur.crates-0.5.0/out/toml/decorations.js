"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decorate = exports.latestVersion = void 0;
/**
 * Helps to manage decorations for the TOML files.
 */
const vscode_1 = require("vscode");
const commands_1 = require("./commands");
const semver_1 = require("semver");
exports.latestVersion = (text) => vscode_1.window.createTextEditorDecorationType({
    after: {
        margin: "2em",
    },
});
/**
 * Create a decoration for the given crate.
 * @param editor
 * @param crate
 * @param version
 * @param versions
 */
function decoration(editor, item, versions, upToDateDecorator, latestDecorator, errorDecorator, error) {
    // Also handle json valued dependencies
    const start = item.start;
    const endofline = editor.document.lineAt(editor.document.positionAt(item.end)).range.end;
    const decoPosition = editor.document.offsetAt(endofline);
    const end = item.end;
    const currentVersion = item.value;
    const hasLatest = semver_1.satisfies(versions[0], currentVersion || "0.0.0");
    const hoverMessage = error ? new vscode_1.MarkdownString(`**${error}**`) : new vscode_1.MarkdownString(`### Docs`);
    hoverMessage.appendMarkdown(`\n * [Latest](https://docs.rs/crate/${item.key}/${versions[0]})`);
    hoverMessage.appendMarkdown(`\n * [Current](https://docs.rs/crate/${item.key}/${currentVersion}) \n\n`);
    hoverMessage.appendMarkdown("### Available Versions");
    hoverMessage.isTrusted = true;
    if (versions.length > 0) {
        commands_1.status.replaceItems.push({
            item: `"${versions[0]}"`,
            start,
            end,
        });
    }
    for (let i = 0; i < versions.length; i++) {
        const version = versions[i];
        const replaceData = {
            item: `"${version}"`,
            start,
            end,
        };
        const encoded = encodeURI(JSON.stringify(replaceData));
        const command = `[${version}](command:crates.replaceVersion?${encoded}) [   (docs)](https://docs.rs/crate/${item.key}/${version})`;
        hoverMessage.appendMarkdown("\n * ");
        hoverMessage.appendMarkdown(command);
    }
    const latestText = latestDecorator.replace("${version}", versions[0]);
    const contentText = error ? errorDecorator : hasLatest ? upToDateDecorator : latestText;
    const deco = {
        range: new vscode_1.Range(editor.document.positionAt(start), editor.document.positionAt(decoPosition)),
        hoverMessage,
        renderOptions: {
            after: {},
        },
    };
    if (contentText.length > 0) {
        deco.renderOptions.after = { contentText };
    }
    return deco;
}
/**
 *
 * @param editor Takes crate info and editor. Decorates the editor.
 * @param dependencies
 */
function decorate(editor, dependencies) {
    const config = vscode_1.workspace.getConfiguration("", editor.document.uri);
    const upToDateChar = config.get("crates.upToDateDecorator");
    const latestText = config.get("crates.latestDecorator");
    const errorText = config.get("crates.errorDecorator");
    const upToDateDecorator = upToDateChar ? upToDateChar + "" : "";
    const latestDecorator = latestText ? latestText + "" : "";
    const errorDecorator = errorText ? errorText + "" : "";
    const options = [];
    for (let i = dependencies.length - 1; i > -1; i--) {
        const dependency = dependencies[i];
        const decor = decoration(editor, dependency.item, dependency.versions || [], upToDateDecorator, latestDecorator, errorDecorator, dependency.error);
        if (decor) {
            options.push(decor);
        }
    }
    const lastVerDeco = exports.latestVersion("VERSION");
    editor.setDecorations(lastVerDeco, options);
    return lastVerDeco;
}
exports.decorate = decorate;
exports.default = {
    decorate,
};
//# sourceMappingURL=decorations.js.map