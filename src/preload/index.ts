import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('robloxAI', {
  generateProject: (projectName: string) => ipcRenderer.invoke('project:generate', projectName)
});
