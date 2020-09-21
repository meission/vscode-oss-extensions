"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Implementation of the code-d API using serve-d
 */
class CodedAPIServedImpl {
    constructor() {
        this.dependencySnippetsToRegister = [];
    }
    registerDependencyBasedSnippet(requiredDependencies, snippet) {
        this.dependencySnippetsToRegister.push([requiredDependencies, snippet]);
        if (this.served) {
            this.served.addDependencySnippet({
                requiredDependencies: requiredDependencies,
                snippet: snippet
            });
        }
    }
    registerDependencyBasedSnippets(requiredDependencies, snippets) {
        snippets.forEach(snippet => {
            this.registerDependencyBasedSnippet(requiredDependencies, snippet);
        });
    }
    started(served) {
        this.served = served;
        let promises = [];
        this.dependencySnippetsToRegister.forEach(snip => {
            promises.push(served.addDependencySnippet({
                requiredDependencies: snip[0],
                snippet: snip[1]
            }));
        });
        Promise.all(promises).then((all) => {
            // done
        });
    }
    static getInstance() {
        if (this.instance)
            return this.instance;
        else
            return this.instance = new CodedAPIServedImpl();
    }
}
exports.CodedAPIServedImpl = CodedAPIServedImpl;
//# sourceMappingURL=api_impl.js.map