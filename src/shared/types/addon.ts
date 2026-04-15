import type { Lesson, Layout, LanguageInfo } from './layout';
import type { GameItemDefinition, GameAchievementDefinition } from './game';
import type { CustomThemeColors } from './settings';
import type { CustomPracticePackKind } from './practice';

/* ── Manifest version ───────────────────────────────────── */
export const ADDON_MANIFEST_VERSION = 1;

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

export interface AddonResources {
  words?: AddonWordsResource[];
  lessons?: AddonLessonsResource[];
  layouts?: AddonLayoutResource[];
  languages?: AddonLanguageResource[];
  items?: AddonItemsResource;
  achievements?: AddonAchievementsResource;
  themes?: AddonThemesResource;
  practicePacks?: AddonPracticePacksResource;
}

export interface AddonManifest {
  manifestVersion: number;
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  minAppVersion?: string;
  type: 'content';
  /** IDs of mods that must be installed and enabled for this addon to work. */
  dependencies?: string[];
  resources?: AddonResources;
}

/* ═══════════════════════════════════════════════════════════
   MODS  — JS/TS scripts that interact with the app via API
   ═══════════════════════════════════════════════════════════ */

/**
 * What a mod is allowed to do — declared in manifest so the
 * user can review before enabling.
 */
export type ModPermission =
  | 'sections'       // hide / show sidebar sections
  | 'settings'       // override user settings
  | 'items'          // add / remove / replace game items
  | 'achievements'   // add / remove / replace achievements
  | 'rules'          // override game / practice rules
  | 'ui'             // inject custom UI panels / CSS
  | 'events'         // subscribe to app events (key, session, etc.)
  | 'words'          // add / remove / replace words
  | 'lessons'        // add / remove / replace lessons
  | 'modes';         // register new sidebar modes / pages

export interface ModManifest {
  manifestVersion: number;
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  minAppVersion?: string;
  type: 'mod';
  /** Relative path to the entry JS file (e.g. "index.js") */
  entry: string;
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
