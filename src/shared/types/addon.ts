import type { Lesson, Layout, LanguageInfo } from './layout';
import type { GameItemDefinition, GameAchievementDefinition } from './game';
import type { ModPermission } from './modApi';
import type { CustomThemeColors } from './settings';
import type { CustomPracticePackKind } from './practice';
import type { TranslationDictionary } from './i18n';

/* ── Manifest version ───────────────────────────────────── */
export const ADDON_MANIFEST_VERSION = 1;
export const ADDON_MANIFEST_TYPE = 'content';
export const MOD_MANIFEST_TYPE = 'mod';

/* ═══════════════════════════════════════════════════════════
   ADDONS  — content-only packs (words, lessons, items, …)
   ═══════════════════════════════════════════════════════════ */

export interface AddonWordsResource {
  lang: string;
  words: string[];
}

export interface AddonLessonsResource {
  layoutId: string;
  lessons: Lesson[];
}

export interface AddonLayoutResource {
  id: string;
  layout: Layout;
}

export interface AddonLanguageResource {
  language: LanguageInfo;
  words: string[];
}

export interface AddonItemsResource {
  items: GameItemDefinition[];
}

export interface AddonAchievementsResource {
  achievements: GameAchievementDefinition[];
}

export interface AddonThemesResource {
  themes: Record<string, CustomThemeColors>;
}

export interface AddonPracticeContentPack {
  id: string;
  name: string;
  description?: string;
  language: string;
  kind: CustomPracticePackKind;
  items: string[];
}

export interface AddonPracticePacksResource {
  packs: AddonPracticeContentPack[];
}

export interface AddonInterfaceLocaleDefinition {
  id: string;
  label: string;
  nativeLabel: string;
  dictionary: TranslationDictionary;
}

export interface AddonInterfaceLocalesResource {
  locales: AddonInterfaceLocaleDefinition[];
}

export interface AddonResources {
  words?: AddonWordsResource[];
  lessons?: AddonLessonsResource[];
  layouts?: AddonLayoutResource[];
  languages?: AddonLanguageResource[];
  items?: AddonItemsResource;
  achievements?: AddonAchievementsResource;
  themes?: AddonThemesResource;
  practicePacks?: AddonPracticePacksResource;
  interfaceLocales?: AddonInterfaceLocalesResource;
  /** Shorthand for interfaceLocales.locales in simple content addons. */
  locales?: AddonInterfaceLocaleDefinition[];
}

export interface AddonManifest {
  manifestVersion: number;
  id: string;
  name: string;
  version: string;
  icon?: string;
  description?: string;
  author?: string;
  minAppVersion?: string;
  type: typeof ADDON_MANIFEST_TYPE;
  /** IDs of mods that must be installed and enabled for this addon to work. */
  dependencies?: string[];
  resources?: AddonResources;
  /** Shorthand for resources.interfaceLocales.locales in simple content addons. */
  locales?: AddonInterfaceLocaleDefinition[];
}

/* ═══════════════════════════════════════════════════════════
   MODS  — JS/TS scripts that interact with the app via API
   ═══════════════════════════════════════════════════════════ */

export interface ModManifest {
  manifestVersion: number;
  id: string;
  name: string;
  version: string;
  icon?: string;
  description?: string;
  author?: string;
  minAppVersion?: string;
  type: typeof MOD_MANIFEST_TYPE;
  /** Relative path to the entry JS file (e.g. "index.js") */
  entry: string;
  /** Explicit package file list for remote installation from source catalogs. */
  files?: string[];
  /** Permissions the mod requires — shown to the user before activation */
  permissions: ModPermission[];
  /** IDs of other mods that must be installed and enabled for this mod to work. */
  dependencies?: string[];
}

/* ═══════════════════════════════════════════════════════════
   INSTALLED ENTRIES — addons (single JSON file) vs mods (folder)
   ═══════════════════════════════════════════════════════════ */

export type AnyManifest = AddonManifest | ModManifest;

/**
 * Content addon — stored as a single JSON file inside `addons/`.
 * `fileName` is just the file name (e.g. "my-addon.json").
 */
export interface InstalledAddon {
  id: string;
  enabled: boolean;
  manifest: AddonManifest;
  /** File name inside the addons directory (e.g. "my-addon.json") */
  fileName: string;
  installedAt: string;
}

/** Minimal registry entry for addon — stored in addon-registry.json */
export interface AddonRegistryEntry {
  id: string;
  enabled: boolean;
  fileName: string;
  installedAt: string;
}

/**
 * Mod — stored as a folder inside `mods/` with `manifest.json` + entry JS.
 * `dirName` is the folder name.
 */
export interface InstalledMod {
  id: string;
  enabled: boolean;
  manifest: ModManifest;
  /** Folder name inside the mods directory */
  dirName: string;
  installedAt: string;
}

/** Minimal registry entry for mod — stored in mod-registry.json */
export interface ModRegistryEntry {
  id: string;
  enabled: boolean;
  dirName: string;
  installedAt: string;
}

export interface AddonRegistryState {
  addons: AddonRegistryEntry[];
}

export interface ModRegistryState {
  mods: ModRegistryEntry[];
}
