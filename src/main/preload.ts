import { contextBridge, ipcRenderer } from 'electron';
import type { Progress, CustomThemes, LayoutsData, ElectronAPI } from '../shared/types';

const api: ElectronAPI = {
  getLayouts: () => ipcRenderer.invoke('get-layouts') as Promise<LayoutsData>,
  getWords: (lang: string) => ipcRenderer.invoke('get-words', lang) as Promise<string[]>,
  getProgress: () => ipcRenderer.invoke('get-progress') as Promise<Progress>,
  saveProgress: (data: Progress) => ipcRenderer.invoke('save-progress', data) as Promise<boolean>,
  getCustomThemes: () => ipcRenderer.invoke('get-custom-themes') as Promise<CustomThemes>,
  saveCustomThemes: (data: CustomThemes) =>
    ipcRenderer.invoke('save-custom-themes', data) as Promise<boolean>,
  winMinimize: () => ipcRenderer.send('win-minimize'),
  winMaximize: () => ipcRenderer.send('win-maximize'),
  winClose: () => ipcRenderer.send('win-close'),
};

contextBridge.exposeInMainWorld('api', api);
