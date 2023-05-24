import { createPlaceholderRegex, parsePlaceholdersFromCode } from "./snippet-helpers";
import { defaultDelimiter, Language, Snippet, SnippetKind, SnippetType } from "./snippet-model";
import { batch, createMemo } from "solid-js";
import { createStore, produce } from "solid-js/store";

export default function createSnippetStore(createDefault: () => Snippet) {
    const [snippet, set] = createStore<Snippet>(createDefault());
    const setWith = (func: (snippet: Snippet) => void) => set(produce(func));

    const canHaveNamespaces = () => snippet.language === Language.CSharp || snippet.language === Language.VisualBasic;
    const placeholderRegex = createMemo(() => createPlaceholderRegex(snippet.delimiter || defaultDelimiter));

    const updatePlaceholders = () => {
        const [added, removed] = reparsePlaceholders(snippet, placeholderRegex());

        if (added.size === 0 && removed.size === 0) {
            // No change, nothing to do.
            return;
        }

        setWith(s => {
            const toRetain = s.placeholders.filter(i => !removed.has(i.name));
            const toAdd = Array.from(added).map(i => ({
                name: i,
                defaultValue: "",
                function: "",
                tooltip: "",
                isEditable: true,
            }));

            s.placeholders = toRetain;
            s.placeholders.push(...toAdd);
            s.placeholders.sort((a, b) => a.name.localeCompare(b.name));
        });
    };

    return {
        snippet,
        canHaveNamespaces,
        snippetOps: {
            new: () => set(createDefault()),
            replace: (snippet: Snippet) => set(snippet),
            updateTitle: (title: string) =>
                set("title", title),
            updateDescription: (description: string) =>
                set("description", description),
            updateShortcut: (shortcut: string) =>
                set("shortcut", shortcut),
            updateKind: (kind: SnippetKind) =>
                set("kind", kind),
            updateAuthor: (author: string) =>
                set("author", author),
            updateHelpUrl: (url: string) =>
                set("helpUrl", url),
            updateLanguage: (language: Language | "") =>
                batch(() => {
                    set("language", language);
                    if (!canHaveNamespaces() && snippet.namespaces.length > 0) {
                        set("namespaces", []);
                    }
                }),
            updateCode: (code: string) =>
                batch(() => {
                    set("code", code);
                    updatePlaceholders();
                }),
            updateDelimiter: (delimiter: string) =>
                batch(() => {
                    set("delimiter", delimiter);
                    updatePlaceholders();
                }),
            types: {
                add: (type: SnippetType) => {
                    if (!snippet.types.includes(type)) {
                        setWith(s => { s.types.push(type); });
                    }
                },
                remove: (type: SnippetType) => {
                    if (snippet.types.includes(type)) {
                        setWith(s => { s.types = s.types.filter(t => t !== type); });
                    }
                },
            },
            placeholders: {
                updateDefaultValue: (index: number, value: string) =>
                    setWith(s => { s.placeholders[index].defaultValue = value; }),
                updateEditable: (index: number, isEditable: boolean) =>
                    setWith(s => { s.placeholders[index].isEditable = isEditable; }),
                updateTooltip: (index: number, value: string) =>
                    setWith(s => { s.placeholders[index].tooltip = value; }),
            },
            namespaces: {
                add: () =>
                    setWith(s => { s.namespaces.push(""); }),
                update: (index: number, value: string) =>
                    setWith(s => { s.namespaces[index] = value; }),
                remove: (index: number) =>
                    setWith(s => { s.namespaces.splice(index, 1); }),
            }
        }
    };
}

function reparsePlaceholders(snippet: Snippet, placeholderRegex: RegExp): [added: Set<string>, removed: Set<string>] {
    const previous = snippet.placeholders.map(i => i.name);
    const current = parsePlaceholdersFromCode(snippet.code, placeholderRegex);

    const added = Array.from(current).filter(i => !previous.includes(i));
    const removed = Array.from(previous).filter(i => !current.has(i));

    return [new Set(added), new Set(removed)];
}
