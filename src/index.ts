import { FileManager } from "./file-manager";
import { FileDragAndDrop } from "./file-drag-and-drop";

const fileManager = new FileManager();
FileDragAndDrop.init(document.body, "link", "application/xml", fileDropped);

// New button
document.getElementById("file-new-button")!
    .addEventListener("click", () => {
        fileManager.clearCurrentFile();
        updateFileContents("");
        refreshFileName();
    });

// Open button
document.getElementById("file-open-button")!
    .addEventListener("click", async () => {
        const file = await fileManager.tryOpen();
        if (file === null) {
            return;
        }

        const fileContents = await file.text();

        // TODO: validate that it's a valid snippet file.

        fileManager.setCurrentFile(file.name, file.handle ?? null);
        updateFileContents(fileContents);
        refreshFileName();
    });

// Save button
document.getElementById("file-save-button")!
    .addEventListener("click", async () => {
        const defaultFileName = fileManager.currentFileName ?? "snippet.snippet";
        const text = (document.getElementById("file-contents") as HTMLTextAreaElement).value;
        const file = await fileManager.trySave(defaultFileName, text);

        if (file !== null) {
            fileManager.setCurrentFile(file.name, file.handle);
            refreshFileName();
        }
    });

// Save As button
if (fileManager.isSaveAsEnabled) {
    const saveAsButton = document.getElementById("file-save-as-button")!;

    saveAsButton.style.display = "inline-block";

    saveAsButton
        .addEventListener("click", async () => {
            const defaultFileName = fileManager.currentFileName ?? "snippet.snippet";
            const text = (document.getElementById("file-contents") as HTMLTextAreaElement).value;
            const file = await fileManager.trySaveAs(defaultFileName, text);

            if (file !== null) {
                fileManager.setCurrentFile(file.name, file.handle);
                refreshFileName();
            }
        });
}

async function fileDropped(file: { name: string, blob: Blob, handle: FileSystemFileHandle | null }) {
    // TODO: validate that it's a valid snippet file.
    fileManager.setCurrentFile(file.name, file.handle);
    updateFileContents(await file.blob.text());
    refreshFileName();
}

function updateFileContents(text: string) {
    (document.getElementById("file-contents") as HTMLTextAreaElement).value = text;
}

function refreshFileName() {
    document.getElementById("file-name")!.textContent = fileManager.currentFileName;

    if (fileManager.currentFileName !== null) {
        document.title = `${fileManager.currentFileName} - Snippety`;
    } else {
        document.title = "Snippety";
    }
}