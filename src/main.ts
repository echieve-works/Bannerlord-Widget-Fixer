import './main.css';
import JSZip from 'jszip';

const dropZoneSpaceElement = document.querySelector<HTMLElement>("#drop-zone-space")!;
const dropZoneSpaceText = "or Drag & Drop";
dropZoneSpaceElement.innerText = dropZoneSpaceText;

const dropZoneElement = document.querySelector<HTMLElement>("#drop-zone")!;
dropZoneElement.addEventListener('dragover', (e: DragEvent) => {
    e.preventDefault();
    dropZoneElement.classList.add('drag-over');
})
dropZoneElement.addEventListener('dragleave', () => {
    dropZoneElement.classList.remove('drag-over');
});
dropZoneElement.addEventListener('drop', async (e: DragEvent) => {
    e.preventDefault();
    dropZoneElement.classList.remove('drag-over');

    if (!e.dataTransfer) return;
    if (!e.dataTransfer.items) return;

    let fileCount = 0;
    const filePathPairs: [File, string][] = [];

    async function traverseEntry(entry: FileSystemEntry, path: string) {
        if (entry.isFile) {
            const fileEntry = entry as FileSystemFileEntry;
            const file = await new Promise<File>((resolve) => fileEntry.file(resolve));
            filePathPairs.push([file, path + file.name]);
            fileCount++;
        } else if (entry.isDirectory) {
            const dirEntry = entry as FileSystemDirectoryEntry;
            const entries = await new Promise<FileSystemEntry[]>((resolve) => dirEntry.createReader().readEntries(resolve));

            for (const child of entries) {
                await traverseEntry(child, path + entry.name + "/");
            }
        }
    }

    for (const item of e.dataTransfer.items) {
        const entry = item.webkitGetAsEntry();
        if (!entry) continue;
        await traverseEntry(entry, "");
    }

    dropZoneSpaceElement.innerText = fileCount + " files";

    FixTool.open();
    for (const [file, path] of filePathPairs) {
        await FixTool.fix(file, path);
    }
});


const moduleUploadElement = document.querySelector<HTMLInputElement>("#module-upload")!;
moduleUploadElement.addEventListener('change', async (e) => {
    const input = e.target as HTMLInputElement;
    if (!input.files) return;

    dropZoneSpaceElement.innerText = input.files.length + " files";

    FixTool.open();
    for (const file of input.files) {
        await FixTool.fix(file, file.webkitRelativePath);
    }
});

const fixListElement = document.querySelector<HTMLElement>("#fix-list")!;
const downloadButtonElement = document.querySelector<HTMLElement>("#download-button")!;
downloadButtonElement.addEventListener('click', () => {
    FixTool.download();
})


class FixTool {
    static readonly LISTPANEL_FIX_REGEX = /(<ListPanel[^>]*?(StackLayout|LayoutImp)\.LayoutMethod\s*=\s*")(VerticalBottomToTop|VerticalTopToBottom)(")/g;
    static readonly VERTICAL_TOP_TO_BOTTOM = "VerticalTopToBottom";
    static readonly VERTICAL_BOTTOM_TO_TOP = "VerticalBottomToTop";

    static zip: JSZip = new JSZip;

    static open()
    {
        this.zip = new JSZip;
        fixListElement.replaceChildren();
        downloadButtonElement.classList.add('hidden');
    }

    static async fix(file: File, fullPath: string) {
        if (!fullPath.startsWith("Prefabs/"))
        {
            alert("The selected file is not in the 'Prefabs' folder.");
            return;
        }

        const parts = fullPath.split('/');

        fullPath = "";
        for (let i = 1; i < parts.length; i++)
        {
            fullPath += parts[i];
            if (i !== parts.length - 1) fullPath += '/';
        }


        const element = document.createElement('div');
        element.classList.add('fix-item');
        element.innerText = fullPath;
        fixListElement.appendChild(element);

        if (!file.name.endsWith('.xml')) {
            this.zip.file(fullPath, await file.arrayBuffer());
            return;
        }

        let fixCount = 0;

        const context: string = await file.text();
        const fixed = context.replaceAll(FixTool.LISTPANEL_FIX_REGEX, (_match, p1, _p2, p3, p4) => {
            const newValue = p3 === FixTool.VERTICAL_BOTTOM_TO_TOP ? FixTool.VERTICAL_TOP_TO_BOTTOM : FixTool.VERTICAL_BOTTOM_TO_TOP;
            fixCount++;
            return p1 + newValue + p4;
        });

        if (fixCount > 0)
        {
            const tagElement = document.createElement('span');
            tagElement.classList.add('fix-item-tag');
            element.appendChild(tagElement);
            
            tagElement.classList.add('tag-modified');
            tagElement.innerText = "[Modified]";

            downloadButtonElement.classList.remove('hidden');
        }

        this.zip.file(fullPath, fixed);
    }

    static async download() {
        const blob = await this.zip.generateAsync({ type: 'blob' });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'Prefabs.zip';

        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}