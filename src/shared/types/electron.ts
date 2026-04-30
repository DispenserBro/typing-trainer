import type { LayoutsData } from './layout';
import type { Progress } from './progress';
import type { PracticeContentPack } from './practice';
import type { CustomThemes } from './settings';
import type { InstalledAddon, InstalledMod } from './addon';
import type { InstalledTheme, ThemeInstallResult } from './theme';
import type {
  ExtensionCatalogEntry,
  ExtensionCatalogKind,
  ExtensionCatalogInstallResult,
  ExtensionCatalogPreflightResult,
  ExtensionSourceInput,
  ExtensionSourceInstallResult,
  ExtensionSourceSyncResult,
  InstalledExtensionSource,
} from './extensionSource';

export interface ImportedFile {
  name: string;
  path: string;
  content: string;
}

export interface ImportFileOptions {
  title?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
}

export interface ExportPayload {
  version: 1;
  type: 'theme' | 'config' | 'full';
  theme?: { name: string; colors: CustomThemes[string] };
  settings?: Progress['settings'];
  practiceSettings?: Progress['practiceSettings'];
  modePracticeSettings?: Progress['modePracticeSettings'];
  customPresets?: Progress['customPresets'];
  customPracticePacks?: Progress['customPracticePacks'];
  importedInterfaceLocales?: Progress['importedInterfaceLocales'];
}

export interface AddonInstallResult {
  ok: boolean;
  error?: string;
  addon?: InstalledAddon;
}

export interface ModInstallResult {
  ok: boolean;
  error?: string;
  mod?: InstalledMod;
}

export interface ModLocaleResourceFile {
  name: string;
  relativePath: string;
  extension: 'json' | 'po';
  content: string;
}

export interface ElectronAPI {
  getLayouts(): Promise<LayoutsData>;
  getWords(lang: string): Promise<string[]>;
  getPracticeContentPacks(): Promise<PracticeContentPack[]>;
  getLessonBigrams(lang: string): Promise<Record<string, string[]>>;
  getProgress(): Promise<Progress>;
  saveProgress(data: Progress): Promise<boolean>;
  getCustomThemes(): Promise<CustomThemes>;
  saveCustomThemes(data: CustomThemes): Promise<boolean>;
  exportFile(defaultName: string, content: string): Promise<boolean>;
  importFile(options?: ImportFileOptions): Promise<ImportedFile | null>;

  /* Addons — content JSON files */
  scanAddons(): Promise<InstalledAddon[]>;
  installAddon(): Promise<AddonInstallResult>;
  installAddonFromString(json: string): Promise<AddonInstallResult>;
  removeAddon(addonId: string): Promise<boolean>;
  toggleAddon(addonId: string, enabled: boolean): Promise<boolean>;

  /* Mods — script folders */
  scanMods(): Promise<InstalledMod[]>;
  installMod(): Promise<ModInstallResult>;
  removeMod(modId: string): Promise<boolean>;
  toggleMod(modId: string, enabled: boolean): Promise<boolean>;
  readModScript(modId: string): Promise<string | null>;
  readModLocaleResources(modId: string): Promise<ModLocaleResourceFile[]>;

  /* Themes — style manifests */
  scanThemes(): Promise<InstalledTheme[]>;
  installTheme(): Promise<ThemeInstallResult>;
  removeTheme(themeId: string): Promise<boolean>;

  /* Extension sources */
  scanExtensionSources(): Promise<InstalledExtensionSource[]>;
  installExtensionSource(input: ExtensionSourceInput): Promise<ExtensionSourceInstallResult>;
  updateExtensionSource(sourceId: string, input: ExtensionSourceInput): Promise<ExtensionSourceInstallResult>;
  removeExtensionSource(sourceId: string): Promise<boolean>;
  toggleExtensionSource(sourceId: string, enabled: boolean): Promise<boolean>;
  syncExtensionSource(sourceId: string): Promise<ExtensionSourceSyncResult>;
  scanExtensionCatalog(): Promise<ExtensionCatalogEntry[]>;
  validateExtensionCatalogEntry(sourceId: string, kind: ExtensionCatalogKind, entryId: string): Promise<ExtensionCatalogPreflightResult>;
  installExtensionCatalogEntry(sourceId: string, kind: ExtensionCatalogKind, entryId: string): Promise<ExtensionCatalogInstallResult>;

  /* Window */
  winMinimize(): void;
  winMaximize(): void;
  winClose(): void;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
