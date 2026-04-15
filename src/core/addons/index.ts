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

/* ── Mod loader (script folders) ────────────────────────── */
export {
  validateModManifest,
  loadModRegistry,
  saveModRegistry,
  scanMods,
  installModFromFolder,
  removeMod,
  toggleMod,
  readModScript,
} from './modLoader';
export type { ModValidationResult } from './modLoader';

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
export { createModAPI, createEmptyModState } from './modApi';
export type { ModAPI, ModAPIState, ModEventName, ModEventHandler } from './modApi';

export { runAllMods } from './modRunner';
export type { ModRunnerResult } from './modRunner';
