import JSZip from 'jszip';

const moduleInput = document.querySelector<HTMLInputElement>("#moduleInput");
const downloadButton = document.querySelector<HTMLInputElement>("#downloadButton");

const targetRegex = /(<ListPanel[^>]*?(StackLayout|LayoutImp)\.LayoutMethod\s*=\s*")(VerticalBottomToTop|VerticalTopToBottom)(")/g;

let zip: JSZip | null = null;

moduleInput?.addEventListener('change', async (e) => {
    zip = new JSZip();

    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;

    const prefabs = files.filter(file => {
        if (file.name.endsWith('.xml'))
            return true;

        zip!.file(file.webkitRelativePath, file);
        return false;
    })
    if (prefabs.length === 0) return;
    
    for (var prefab of prefabs)
    {
        try {
            const context: string = await prefab.text();
            const fixed = context.replaceAll(targetRegex, (_match, p1, _p2, p3, p4) => {
                const newValue = p3 === 'VerticalBottomToTop' ? 'VerticalTopToBottom' : 'VerticalBottomToTop';
                console.log(prefab.name);
                console.log(p1 + newValue + p4);
                return p1 + newValue + p4;
            });

            zip!.file(prefab.webkitRelativePath, fixed);
        }
        catch (error) {
            alert(error);
            zip = null;
        }
    }
});

downloadButton?.addEventListener('click', async () => {
    if (zip === null) return;

    const blob = await zip.generateAsync({ type: 'blob' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Fixed.zip';

    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
});