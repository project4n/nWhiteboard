import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';
import fs from 'fs';
import { tmpdir } from 'os';
import { JSDOM } from 'jsdom';

// 获取当前模块的文件路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    if (app.isPackaged) {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    } else {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform!== 'darwin') app.quit();
});

ipcMain.handle('quit-app',function(){
    app.quit();
})

ipcMain.handle('open-file', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        filters: [
            { name: 'NWB Files', extensions: ['nwb'] }
        ]
    });

    if (!canceled && filePaths.length > 0) {
        const filePath = filePaths[0];
        try {
            const zip = new AdmZip(filePath);
            const manifestEntry = zip.getEntry('manifest.xml');
            if (!manifestEntry) {
                console.error('未找到 manifest.xml 文件');
                return null;
            }
            const manifestXml = manifestEntry.getData().toString('utf8');
            const dom = new JSDOM();
            const parser = new dom.window.DOMParser();
            const manifestDoc = parser.parseFromString(manifestXml, 'text/xml');
            const pageNodes = manifestDoc.getElementsByTagName('page');
            const pages = [];
            for (let i = 0; i < pageNodes.length; i++) {
                const pageNode = pageNodes[i];
                const pageId = pageNode.getAttribute('id');
                const pageEntry = zip.getEntry(`${pageId}.xml`);
                if (pageEntry) {
                    const xmlContent = pageEntry.getData().toString('utf8');
                    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
                    const drawings = [];
                    const drawingNodes = xmlDoc.getElementsByTagName('drawing');
                    for (let j = 0; j < drawingNodes.length; j++) {
                        const node = drawingNodes[j];
                        const type = node.getAttribute('type');
                        const x1 = parseInt(node.getAttribute('x1'));
                        const y1 = parseInt(node.getAttribute('y1'));
                        const x2 = parseInt(node.getAttribute('x2'));
                        const y2 = parseInt(node.getAttribute('y2'));
                        const color = node.getAttribute('color');
                        const size = parseInt(node.getAttribute('size'));
                        drawings.push({ type, x1, y1, x2, y2, color, size });
                    }
                    pages.push({ id: parseInt(pageId), drawings });
                }
            }
            return pages;
        } catch (error) {
            console.error('打开文件时出错:', error);
            return null;
        }
    }
    return null;
});

ipcMain.on('save-file', (event, data) => {
    const filePath = dialog.showSaveDialogSync({
        filters: [
            { name: 'NWB Files', extensions: ['nwb'] }
        ]
    });

    console.log("\n filepaths:"+filePath)

    if (filePath !=undefined || filePath !=null) {
        try {
            const tempDir = path.join(tmpdir(), 'nwhiteboard');
            fs.mkdirSync(tempDir, { recursive: true });

            // 生成 manifest.xml
            const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest>
${data.pages.map((page) => `  <page id="${page.id}" />`).join('\n')}
</manifest>`;
            fs.writeFileSync(path.join(tempDir, 'manifest.xml'), manifestXml);

            // 生成每一页的 xml 文件
            data.pages.forEach((page) => {
                const xml = `<?xml version="1.0" encoding="UTF-8"?>
<drawings>
${page.drawings.map((drawing) => `  <drawing type="${drawing.type}" x1="${drawing.x1}" y1="${drawing.y1}" x2="${drawing.x2}" y2="${drawing.y2}" color="${drawing.color}" size="${drawing.size}" />`).join('\n')}
</drawings>`;
                fs.writeFileSync(path.join(tempDir, `${page.id}.xml`), xml);
            });

            // 打包成 zip 文件
            const zip = new AdmZip();
            const files = fs.readdirSync(tempDir);
            files.forEach((file) => {
                const fullPath = path.join(tempDir, file);
                zip.addLocalFile(fullPath);
            });
            zip.writeZip(filePath);

            // 删除临时文件夹
            fs.rmSync(tempDir, { recursive: true, force: true });

            event.sender.send('save-file-response', '文件保存成功');
        } catch (error) {
            console.error('保存文件时出错:', error);
            event.sender.send('save-file-response', '文件保存失败');
        }
    }
});
    
    