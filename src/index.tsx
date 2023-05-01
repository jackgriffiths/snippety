import { initFileDragAndDrop } from "./file-drag-and-drop";
import * as fileManager from "./file-manager";
import { generateCodePreview, parsePlaceholdersFromCode } from "./snippet-helpers";
import {
    createDefaultSnippet,
    Language,
    languageDescriptions,
    Snippet,
    snippetKindDescriptions,
    SnippetType,
    snippetTypeDescriptions
} from "./snippet-model";
import { parseSnippetFromXml } from "./snippet-parser";
import { writeSnippetToXml } from "./snippet-writer";
import { registerWebComponents } from "./web-components";
import { batch, createEffect, createMemo, createUniqueId, For, Index, Show } from "solid-js";
import { createStore, produce } from "solid-js/store";
import { render } from "solid-js/web";

registerWebComponents();
initFileDragAndDrop(document.body, "link", "application/xml", fileDropped);

const pageTitle = () => fileManager.currentFileName() ?? "New Snippet";
const [snippet, updateSnippet] = createStore<Snippet>(createDefaultSnippet());
const canHaveNamespaces = () => snippet.language === Language.CSharp || snippet.language === Language.VisualBasic;

function App() {
    createEffect(() => document.title = `${pageTitle()} - Snippety`);

    return (
        <div class="container">
            <Toolbar />
            <div id="form-and-preview">
                <Form />
                <Preview />
            </div>
        </div>
    );
}

function Toolbar() {
    return (
        <div id="toolbar">
            <button onClick={newSnippet}>
                New
            </button>

            <button onClick={openSnippet}>
                Open
            </button>

            <button type="submit" form="main-form" data-submit-type="save">
                Save
            </button>

            <Show when={fileManager.isSaveAsEnabled}>
                <button type="submit" form="main-form" data-submit-type="save-as">
                    Save As
                </button>
            </Show>
        </div>
    );
}

function Form() {
    return (
        <div id="inputs">
            <h1 id="page-title">
                {pageTitle()}
            </h1>

            <form id="main-form" action="" onSubmit={saveSnippet}>
                <div>
                    <label for="title">
                        Title
                    </label>

                    <input
                        id="title"
                        type="text"
                        autocomplete="off"
                        required
                        value={snippet.title}
                        onInput={e => updateSnippet("title", e.target.value)} />

                    <p class="help-text">
                        The title appears in IntelliSense when browsing code snippets.
                    </p>
                </div>

                <div>
                    <label for="author">
                        Author
                    </label>

                    <input
                        id="author"
                        type="text"
                        autocomplete="name"
                        value={snippet.author}
                        onInput={e => updateSnippet("author", e.target.value)} />
                </div>

                <div>
                    <label for="description">
                        Description
                    </label>

                    <textarea
                        id="description"
                        rows="5"
                        autocomplete="off"
                        value={snippet.description}
                        onInput={e => updateSnippet("description", e.target.value)} />

                    <p class="help-text">
                        The description appears in IntelliSense when browsing code snippets.
                    </p>
                </div>

                <div>
                    <label for="shortcut">
                        Shortcut
                    </label>

                    <input
                        id="shortcut"
                        type="text"
                        autocomplete="off"
                        pattern="[A-Za-z0-9_]*"
                        value={snippet.shortcut}
                        onInput={e => updateSnippet("shortcut", e.target.value)} />

                    <p class="help-text">
                        Must only contain alphanumeric characters and underscores. Snippets without a shortcut
                        can be inserted using the context menu.
                    </p>
                </div>

                <div>
                    <label for="language">
                        Language
                    </label>

                    <select
                        id="language"
                        required
                        value={snippet.language}
                        onInput={e => updateLanguage(e.target.value as Language | "")}>

                        <option value="">Choose a language...</option>
                        <For each={Array.from(languageDescriptions)}>{([value, description]) =>
                            <option value={value}>{description}</option>
                        }</For>
                    </select>
                </div>

                <div>
                    <label for="code">
                        Code
                    </label>

                    <textarea
                        id="code"
                        rows="5"
                        autocomplete="off"
                        required
                        value={snippet.code}
                        onInput={e => updateSnippetCode(e.target.value)} />

                    <p class="help-text">
                        The code block that should be inserted. Use placeholders like <code>$propertyName$</code> to
                        define parts of the code which will likely be customised after the code is inserted.
                    </p>

                    <p class="help-text">
                        There are two reserved placeholders that you can use in your snippets. <code>$selected$</code> represents
                        text selected in the document that is to be inserted into the snippet when it is invoked. <code>$end$</code> marks
                        the location to place the cursor after the code snippet is inserted.
                    </p>
                </div>

                <div>
                    <label>
                        Placeholders
                    </label>

                    <Show
                        when={snippet.placeholders.length > 0}
                        fallback={<p class="help-text">No placeholders added to the code snippet.</p>}>

                        <ol id="placeholders">
                            <For each={snippet.placeholders}>{(placeholder, index) => {

                                const defaultValueInputId = createUniqueId();
                                const tooltipInputId = createUniqueId();

                                return (
                                    <li>
                                        <p>{`$${placeholder.name}$`}</p>

                                        <div class="flex-horizontal" style={{"gap": "1rem"}}>
                                            <div>
                                                <label for={defaultValueInputId}>
                                                    Default Value
                                                </label>

                                                <input
                                                    id={defaultValueInputId}
                                                    type="text"
                                                    required
                                                    value={placeholder.defaultValue}
                                                    onInput={e => updatePlaceholderDefaultValue(index(), e.target.value)} />
                                            </div>

                                            <div>
                                                <label for={tooltipInputId}>
                                                    Tooltip
                                                </label>

                                                <input
                                                    id={tooltipInputId}
                                                    type="text"
                                                    value={placeholder.tooltip}
                                                    onInput={e => updatePlaceholderTooltip(index(), e.target.value)} />
                                            </div>
                                        </div>
                                    </li>
                                );
                            }}</For>
                        </ol>
                    </Show>
                </div>

                <div>
                    <label for="helpUrl">
                        Help URL
                    </label>

                    <input
                        id="helpUrl"
                        type="url"
                        autocomplete="off"
                        value={snippet.helpUrl}
                        onInput={e => updateSnippet("helpUrl", e.target.value)} />
                </div>

                <Show when={canHaveNamespaces()}>
                    <div>
                        <label>
                            Imports
                        </label>

                        <p class="help-text">
                            The namespaces that need to be imported for this snippet to compile.
                        </p>

                        <div id="imports">
                            <Index each={snippet.namespaces}>{(namespace, index) =>
                                <div class="import">
                                    <input
                                        type="text"
                                        placeholder="e.g. System.Linq"
                                        value={namespace()}
                                        onInput={e => updateNamespace(index, e.target.value)} />

                                    <button type="button" onClick={() => removeNamespace(index)}>
                                        Remove
                                    </button>
                                </div>
                            }</Index>
                        </div>

                        <button type="button" onClick={addNamespace}>
                            Add
                        </button>
                    </div>
                </Show>

                <div>
                    <label>Type</label>
                    <p class="help-text">
                        The type of snippet. If no types are selected, the snippet can be inserted anywhere in the code.
                    </p>

                    <For each={Array.from(snippetTypeDescriptions)}>{([value, description]) => {
                        const checkboxInputId = createUniqueId();

                        return (
                            <Show when={value !== SnippetType.Refactoring || snippet.types.includes(SnippetType.Refactoring)}>
                                <div>
                                    <input
                                        id={checkboxInputId}
                                        type="checkbox"
                                        checked={snippet.types.includes(value)}
                                        onChange={e => toggleType(value, e.target.checked)} />

                                    <label for={checkboxInputId}>
                                        {description}
                                    </label>
                                </div>
                            </Show>
                        );
                    }}</For>
                </div>

                <div>
                    <label>
                        Kind
                    </label>

                    <p>
                        Specifies the kind of code that the snippet contains.
                    </p>

                    <For each={Array.from(snippetKindDescriptions)}>{([value, description]) => {
                        const radioInputId = createUniqueId();

                        return (
                            <div>
                                <input
                                    id={radioInputId}
                                    type="radio"
                                    name="kind"
                                    checked={snippet.kind === value}
                                    onChange={() => updateSnippet("kind", value)} />

                                <label for={radioInputId}>
                                    {description}
                                </label>
                            </div>
                        );
                    }}</For>
                </div>
            </form>
        </div>
    );
}

function Preview() {
    const codePreview = createMemo(() => generateCodePreview(snippet));

    return (
        <div id="preview">
            <h2 class="screen-reader-only">
                Preview
            </h2>

            <highlighted-code-block attr:language={snippet.language} attr:code={codePreview()} />
        </div>
    );
}

function newSnippet() {
    updateSnippet(createDefaultSnippet());
    fileManager.clearCurrentFile();
}

async function openSnippet() {
    const file = await fileManager.tryOpen();
    if (file === null) {
        return;
    }

    // TODO: validate that it's a valid snippet file.
    const xml = await file.text();
    const parsedSnippet = parseSnippetFromXml(xml);
    updateSnippet(parsedSnippet);

    fileManager.setCurrentFile(file.name, file.handle ?? null);
}

async function saveSnippet(e: SubmitEvent) {
    e.preventDefault();

    const xml = writeSnippetToXml(snippet);

    const defaultFileName = snippet.shortcut || snippet.title; // TODO: strip invalid file name chars from the title.
    const defaultFileNameWithExt = `${defaultFileName}.snippet`;
    const useSaveAs = e.submitter?.dataset.submitType === "save-as";

    const file = useSaveAs ?
        await fileManager.trySaveAs(xml, defaultFileNameWithExt) :
        await fileManager.trySave(xml, defaultFileNameWithExt);

    if (file !== null) {
        fileManager.setCurrentFile(file.name, file.handle);
    }
}

async function fileDropped(file: { name: string, blob: Blob, handle: FileSystemFileHandle | null }) {
    // TODO: validate that it's a valid snippet file.
    const xml = await file.blob.text();
    const parsedSnippet = parseSnippetFromXml(xml);
    updateSnippet(parsedSnippet);

    fileManager.setCurrentFile(file.name, file.handle);
}

function updateLanguage(language: Language | "") {
    batch(() => {
        updateSnippet("language", language);

        if (!canHaveNamespaces() && snippet.namespaces.length > 0) {
            updateSnippet("namespaces", []);
        }
    });
}

function updateSnippetCode(code: string) {
    const previousPlaceholderNames = snippet.placeholders.map(i => i.name);
    const currentPlaceholdersNames = parsePlaceholdersFromCode(code);

    const removedPlaceholderNames = Array.from(previousPlaceholderNames).filter(i => !currentPlaceholdersNames.has(i));
    const newPlaceholderNames = Array.from(currentPlaceholdersNames).filter(i => !previousPlaceholderNames.includes(i));

    batch(() => {
        updateSnippet("code", code);

        if (removedPlaceholderNames.length > 0 || newPlaceholderNames.length > 0) {
            const placeholdersToRetain = snippet.placeholders.filter(i => !removedPlaceholderNames.includes(i.name));
            const placeholdersToAdd = newPlaceholderNames.map(i => ({
                name: i,
                defaultValue: "",
                tooltip: "",
                isEditable: true,
            }));

            updateSnippet(produce(s => {
                s.placeholders = placeholdersToRetain;
                s.placeholders.push(...placeholdersToAdd);
                s.placeholders.sort((a, b) => a.name.localeCompare(b.name));
            }));
        }
    });
}

function updatePlaceholderDefaultValue(placeholderIndex: number, value: string) {
    updateSnippet(produce(s => { s.placeholders[placeholderIndex].defaultValue = value; }));
}

function updatePlaceholderTooltip(placeholderIndex: number, value: string) {
    updateSnippet(produce(s => { s.placeholders[placeholderIndex].tooltip = value; }));
}

function addNamespace() {
    updateSnippet(produce(s => { s.namespaces.push(""); }));
}

function updateNamespace(index: number, value: string) {
    updateSnippet(produce(s => { s.namespaces[index] = value; }));
}

function removeNamespace(index: number) {
    updateSnippet(produce(s => { s.namespaces.splice(index, 1); }));
}

function toggleType(type: SnippetType, isSelected: boolean) {
    if (isSelected && !snippet.types.includes(type)) {
        updateSnippet(produce(s => { s.types.push(type); }));
    } else if (!isSelected && snippet.types.includes(type)) {
        updateSnippet(produce(s => { s.types = s.types.filter(t => t !== type); }));
    }
}

render(() => <App />, document.getElementById("app") as HTMLElement);
