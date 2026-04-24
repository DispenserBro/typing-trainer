import { contextBridge, ipcRenderer } from 'electron';
import type {
  Progress,
  CustomThemes,
  LayoutsData,
  ElectronAPI,
  InstalledAddon,
  InstalledMod,
  InstalledTheme,
  ExtensionCatalogEntry,
  ExtensionCatalogInstallResult,
  ExtensionSourceInput,
  ExtensionSourceInstallResult,
  ExtensionSourceSyncResult,
  InstalledExtensionSource,
  AddonInstallResult,
  ModInstallResult,
  ThemeInstallResult,
  ImportFileOptions,
  ImportedFile,
} from '../shared/types';

const api: ElectronAPI = {
  getLayouts: () => ipcRenderer.invoke('get-layouts') as Promise<LayoutsData>,
  getWords: (lang: string) => ipcRenderer.invoke('get-words', lang) as Promise<string[]>,
  getPracticeContentPacks: () => ipcRenderer.invoke('get-practice-content-packs') as Promise<import('../shared/types').PracticeContentPack[]>,
  getLessonBigrams: (lang: string) => ipcRenderer.invoke('get-lesson-bigrams', lang) as Promise<Record<string, string[]>>,
  getProgress: () => ipcRenderer.invoke('get-progress') as Promise<Progress>,
  saveProgress: (data: Progress) => ipcRenderer.invoke('save-progress', data) as Promise<boolean>,
  getCustomThemes: () => ipcRenderer.invoke('get-custom-themes') as Promise<CustomThemes>,
  saveCustomThemes: (data: CustomThemes) =>
    ipcRenderer.invoke('save-custom-themes', data) as Promise<boolean>,
  exportFile: (defaultName: string, content: string) =>
    ipcRenderer.invoke('export-file', defaultName, content) as Promise<boolean>,
  importFile: (options?: ImportFileOptions) =>
    ipcRenderer.invoke('import-file', options) as Promise<ImportedFile | null>,

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
  readModLocaleResources: (modId: string) =>
    ipcRenderer.invoke('read-mod-locale-resources', modId) as Promise<import('../shared/types').ModLocaleResourceFile[]>,

  /* Themes — style manifests */
  scanThemes: () =>
    ipcRenderer.invoke('scan-themes') as Promise<InstalledTheme[]>,
  installTheme: () =>
    ipcRenderer.invoke('install-theme') as Promise<ThemeInstallResult>,
  removeTheme: (themeId: string) =>
    ipcRenderer.invoke('remove-theme', themeId) as Promise<boolean>,

  /* Extension sources */
  scanExtensionSources: () =>
    ipcRenderer.invoke('scan-extension-sources') as Promise<InstalledExtensionSource[]>,
  scanExtensionCatalog: () =>
    ipcRenderer.invoke('scan-extension-catalog') as Promise<ExtensionCatalogEntry[]>,
  installExtensionSource: (input: ExtensionSourceInput) =>
    ipcRenderer.invoke('install-extension-source', input) as Promise<ExtensionSourceInstallResult>,
  installExtensionCatalogEntry: (sourceId: string, kind: 'addons' | 'mods' | 'themes', entryId: string) =>
    ipcRenderer.invoke('install-extension-catalog-entry', sourceId, kind, entryId) as Promise<ExtensionCatalogInstallResult>,
  updateExtensionSource: (sourceId: string, input: ExtensionSourceInput) =>
    ipcRenderer.invoke('update-extension-source', sourceId, input) as Promise<ExtensionSourceInstallResult>,
  removeExtensionSource: (sourceId: string) =>
    ipcRenderer.invoke('remove-extension-source', sourceId) as Promise<boolean>,
  toggleExtensionSource: (sourceId: string, enabled: boolean) =>
    ipcRenderer.invoke('toggle-extension-source', sourceId, enabled) as Promise<boolean>,
  syncExtensionSource: (sourceId: string) =>
    ipcRenderer.invoke('sync-extension-source', sourceId) as Promise<ExtensionSourceSyncResult>,

  /* Window */
  winMinimize: () => ipcRenderer.send('win-minimize'),
  winMaximize: () => ipcRenderer.send('win-maximize'),
  winClose: () => ipcRenderer.send('win-close'),
};

contextBridge.exposeInMainWorld('api', api);
