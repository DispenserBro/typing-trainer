/* ── Addon loader (content JSON files) ──────────────────── */
export {
  validateAddonManifest,
  loadAddonRegistry,
  saveAddonRegistry,
  scanAddons,
  installAddonFromJSON,
  removeAddon,
  toggleAddon,
} from './addonLoader';
export type { AddonValidationResult } from './addonLoader';

/* ── Extension sources ──────────────────────────────────── */
export {
  validateExtensionSourceManifest,
  scanExtensionSources,
  scanExtensionCatalog,
  validateExtensionCatalogEntry,
  installExtensionSource,
  installExtensionCatalogEntry,
  updateExtensionSource,
  removeExtensionSource,
  toggleExtensionSource,
  syncExtensionSource,
  syncAllExtensionSources,
} from './extensionSourceLoader';
export type { ExtensionSourceValidationResult } from './extensionSourceLoader';

/* ── Mod loader (script folders) ────────────────────────── */
export {
  validateModManifest,
  loadModRegistry,
  saveModRegistry,
  scanMods,
  installModFromFolder,
  installModFromPackage,
  removeMod,
  toggleMod,
  readModScript,
  readModLocaleResources,
} from './modLoader';
export type { ModValidationResult } from './modLoader';

/* ── Theme loader (theme JSON files) ────────────────────── */
export {
  validateThemeManifest,
  loadThemeRegistry,
  saveThemeRegistry,
  scanThemes,
  installThemeFromJSON,
  installThemeFromFile,
  removeTheme,
} from './themeLoader';
export type { ThemeValidationResult } from './themeLoader';

/* ── Addon merger (content only) ────────────────────────── */
export {
  mergeAddonWords,
  mergeAddonLayouts,
  mergeAddonItems,
  mergeAddonAchievements,
  mergeAddonThemes,
  mergeAddonPracticePacks,
  getAddonLanguageWords,
} from './addonMerger';

/* ── Mod API & runner ───────────────────────────────────── */
export { createModAPI, createEmptyModState, emitModEvent } from './modApi';
export type {
  ModAPIState,
} from './modApi';
export type {
  ModAPI,
  ModPermission,
  ModEventName,
  ModEventHandler,
  ModEventPayloadMap,
  ModModeDefinition,
  ModPanel,
  ModRuleId,
  ModRuleValue,
  MOD_EVENT_NAMES,
  MOD_PERMISSIONS,
  MOD_RULE_IDS,
} from '../../shared/types';

export { runAllMods } from './modRunner';
export type { ModRunnerResult } from './modRunner';
