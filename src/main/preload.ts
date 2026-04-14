import { contextBridge, ipcRenderer } from 'electron';
import type { Progress, CustomThemes, LayoutsData, ElectronAPI, InstalledAddon, InstalledMod, AddonInstallResult, ModInstallResult } from '../shared/types';

const api: ElectronAPI = {
  getLayouts: () => ipcRenderer.invoke('get-layouts') as Promise<LayoutsData>,
  getWords: (lang: string) => ipcRenderer.invoke('get-words', lang) as Promise<string[]>,
  getLessonBigrams: (lang: string) => ipcRenderer.invoke('get-lesson-bigrams', lang) as Promise<Record<string, string[]>>,
  getProgress: () => ipcRenderer.invoke('get-progress') as Promise<Progress>,
  saveProgress: (data: Progress) => ipcRenderer.invoke('save-progress', data) as Promise<boolean>,
  getCustomThemes: () => ipcRenderer.invoke('get-custom-themes') as Promise<CustomThemes>,
  saveCustomThemes: (data: CustomThemes) =>
    ipcRenderer.invoke('save-custom-themes', data) as Promise<boolean>,
  exportFile: (defaultName: string, content: string) =>
    ipcRenderer.invoke('export-file', defaultName, content) as Promise<boolean>,
  importFile: () =>
    ipcRenderer.invoke('import-file') as Promise<string | null>,

  /* Addons — content JSON files */
  scanAddons: () =>
    ipcRenderer.invoke('scan-addons') as Promise<InstalledAddon[]>,
  installAddon: () =>
    ipcRenderer.invoke('install-addon') as Promise<AddonInstallResult>,
  installAddonFromString: (json: string) =>
    ipcRenderer.invoke('install-addon-from-string', json) as Promise<AddonInstallResult>,
  removeAddon: (addonId: string) =>
    ipcRenderer.invoke('remove-addon', addonId) as Promise<boolean>,
  toggleAddon: (addonId: string, enabled: boolean) =>
    ipcRenderer.invoke('toggle-addon', addonId, enabled) as Promise<boolean>,

  /* Mods — script folders */
  scanMods: () =>
    ipcRenderer.invoke('scan-mods') as Promise<InstalledMod[]>,
  installMod: () =>
    ipcRenderer.invoke('install-mod') as Promise<ModInstallResult>,
  removeMod: (modId: string) =>
    ipcRenderer.invoke('remove-mod', modId) as Promise<boolean>,
  toggleMod: (modId: string, enabled: boolean) =>
    ipcRenderer.invoke('toggle-mod', modId, enabled) as Promise<boolean>,
  readModScript: (modId: string) =>
    ipcRenderer.invoke('read-mod-script', modId) as Promise<string | null>,

  /* Window */
  winMinimize: () => ipcRenderer.send('win-minimize'),
  winMaximize: () => ipcRenderer.send('win-maximize'),
  winClose: () => ipcRenderer.send('win-close'),
};

contextBridge.exposeInMainWorld('api', api);
