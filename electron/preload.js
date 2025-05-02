const {contextBridge,ipcRenderer} = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    saveFile:(data) => ipcRenderer.send('save-file',data),
    openFile:() => ipcRenderer.invoke('open-file'),
    onSaveFileResponse:(callback) => ipcRenderer.on('save-file-response',callback),
    quitApp:()=> ipcRenderer.invoke('quit-app'),
})