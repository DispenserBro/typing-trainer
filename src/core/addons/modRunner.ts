/**
 * Mod Runner — loads and executes mod entry scripts in a controlled sandbox.
 * Runs in the renderer process.
 *
 * Each mod entry script is a CommonJS module that exports a single function:
 *   module.exports = function(api) { ... };
 *
 * The runner wraps the script in a Function constructor, injects the ModAPI,
 * and catches any errors.
 */
import type { InstalledMod } from '../../shared/types/addon';
import type { ModAPI, ModAPIState } from './modApi';
import { createModAPI, createEmptyModState } from './modApi';
import type { GameItemDefinition, GameAchievementDefinition, UserSettings, Lesson } from '../../shared/types';

export interface ModRunnerResult {
  state: ModAPIState;
  errors: Array<{ modId: string; error: string }>;
}

/**
 * Execute all enabled mods and return the accumulated state.
 *
 * @param mods — all installed mods (only enabled will run)
 * @param readModScript — async function that reads a mod's entry JS from disk (via IPC)
 * @param getCurrentSettings — read current UserSettings
 * @param getCurrentItems — read current item catalog
 * @param getCurrentAchievements — read current achievement catalog
 * @param getCurrentWords — read current word pool
 * @param getCurrentLessons — read lessons for a layout
 */
export async function runAllMods(
  mods: InstalledMod[],
  readModScript: (modId: string) => Promise<string | null>,
  getCurrentSettings: () => UserSettings,
  getCurrentItems: () => GameItemDefinition[],
  getCurrentAchievements: () => GameAchievementDefinition[],
  getCurrentWords: () => string[],
  getCurrentLessons: (layoutId: string) => Lesson[],
): Promise<ModRunnerResult> {
  const state = createEmptyModState();
  const errors: Array<{ modId: string; error: string }> = [];

  const enabledMods = mods.filter(m => m.enabled);

  for (const mod of enabledMods) {
    const manifest = mod.manifest;
    const scriptSource = await readModScript(mod.id);

    if (!scriptSource) {
      errors.push({ modId: mod.id, error: `Entry script "${manifest.entry}" not found or empty.` });
      continue;
    }

    const api: ModAPI = createModAPI(
      manifest.id,
      manifest.name,
      manifest.permissions ?? [],
      state,
      getCurrentSettings,
      getCurrentItems,
      getCurrentAchievements,
      getCurrentWords,
      getCurrentLessons,
    );

    try {
      // Wrap in a function scope with limited globals.
      // The script sees: module, exports, api, console.
      const wrappedCode = `
        "use strict";
        var module = { exports: {} };
        var exports = module.exports;
        ${scriptSource}
        ;
        if (typeof module.exports === 'function') {
          module.exports(api);
        }
      `;

      // eslint-disable-next-line no-new-func
      const executor = new Function('api', 'console', wrappedCode);
      executor(api, {
        log: (...args: unknown[]) => console.log(`[Mod:${mod.id}]`, ...args),
        warn: (...args: unknown[]) => console.warn(`[Mod:${mod.id}]`, ...args),
        error: (...args: unknown[]) => console.error(`[Mod:${mod.id}]`, ...args),
        info: (...args: unknown[]) => console.info(`[Mod:${mod.id}]`, ...args),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ modId: mod.id, error: msg });
      console.error(`[ModRunner] Error in mod "${mod.id}":`, err);
    }
  }

  return { state, errors };
}
