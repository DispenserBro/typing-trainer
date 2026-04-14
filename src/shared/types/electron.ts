import type { LayoutsData } from './layout';
import type { Progress } from './progress';
import type { CustomThemes } from './settings';
import type { InstalledAddon, InstalledMod } from './addon';

export interface ExportPayload {
  version: 1;
  type: 'theme' | 'config' | 'full';
  theme?: { name: string; colors: CustomThemes[string] };
  settings?: Progress['settings'];
  practiceSettings?: Progress['practiceSettings'];
  customPresets?: Progress['customPresets'];
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

export interface ElectronAPI {
  getLayouts(): Promise<LayoutsData>;
  getWords(lang: string): Promise<string[]>;
  getLessonBigrams(lang: string): Promise<Record<string, string[]>>;
  getProgress(): Promise<Progress>;
  saveProgress(data: Progress): Promise<boolean>;
  getCustomThemes(): Promise<CustomThemes>;
  saveCustomThemes(data: CustomThemes): Promise<boolean>;
  exportFile(defaultName: string, content: string): Promise<boolean>;
  importFile(): Promise<string | null>;

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
