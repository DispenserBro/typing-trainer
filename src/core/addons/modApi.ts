/**
 * Mod API — the interface that mod scripts receive.
 * Each mod gets its own sandboxed ModAPI instance.
 *
 * Usage from a mod entry script:
 *   module.exports = function(api) {
 *     api.sections.disable('game');
 *     api.items.add({ id: 'my-item', ... });
 *     api.events.on('sessionFinish', (data) => { ... });
 *   };
 */
import type {
  AddonInterfaceLocaleDefinition,
  GameItemDefinition,
  GameAchievementDefinition,
  InterfaceLocaleDefinition,
  UserSettings,
  Lesson,
  ModAPI,
  ModEventHandler,
  ModEventName,
  ModEventPayloadMap,
  ModI18nAPI,
  ModModeDefinition,
  ModModesAPI,
  ModPanel,
  ModRuleId,
  ModRulesAPI,
  ModRuleValue,
  ModSectionsAPI,
  ModSettingsAPI,
  ModItemsAPI,
  ModAchievementsAPI,
  ModEventsAPI,
  ModWordsAPI,
  ModLessonsAPI,
  ModUIAPI,
  ModLogAPI,
  ModPermission,
} from '../../shared/types';
import {
  isModEventName,
  isModGameAchievementDefinition,
  isModGameItemDefinition,
  isModInterfaceLocaleDefinition,
  isModLesson,
  isModModeDefinition,
  isModPanel,
  isModRuleId,
  isModRuleValue,
  isModUserSettingKey,
  isModUserSettingValue,
  normalizeModLessons,
  normalizeModWords,
} from '../../shared/types';
import { normalizeExternalInterfaceLocaleDefinitions } from '../i18n/resources';

/* ══════════════════════════════════════════════════════════
   ModAPIState — mutable state shared across all active mods.
   AppContext creates one ModAPIState and passes it to each
   mod's API instance. After all mods run, AppContext reads
   the accumulated state to apply effects.
   ══════════════════════════════════════════════════════════ */

export interface ModAPIState {
  disabledSections: Set<string>;
  settingOverrides: Map<string, unknown>;
  addedItems: GameItemDefinition[];
  removedItemIds: Set<string>;
  replacedItems: Map<string, GameItemDefinition>;
  addedAchievements: GameAchievementDefinition[];
  removedAchievementIds: Set<string>;
  replacedAchievements: Map<string, GameAchievementDefinition>;
  ruleOverrides: Map<ModRuleId, ModRuleValue>;
  eventHandlers: Map<ModEventName, Set<ModEventHandler>>;
  /* ── Words ── */
  addedWords: string[];
  removedWords: Set<string>;
  /* ── Lessons ── */
  addedLessons: Map<string, Lesson[]>;           // layoutId → lessons
  removedLessonIds: Map<string, Set<string>>;     // layoutId → lessonIds
  replacedLessons: Map<string, Map<string, Lesson>>; // layoutId → (lessonId → lesson)
  /* ── UI ── */
  panels: ModPanel[];
  removedPanelIds: Set<string>;
  cssSnippets: string[];
  /* ── Modes ── */
  registeredModes: ModModeDefinition[];
  unregisteredModeIds: Set<string>;
  /* ── Interface translations ── */
  interfaceLocales: InterfaceLocaleDefinition[];
}

export function createEmptyModState(): ModAPIState {
  return {
    disabledSections: new Set(),
    settingOverrides: new Map(),
    addedItems: [],
    removedItemIds: new Set(),
    replacedItems: new Map(),
    addedAchievements: [],
    removedAchievementIds: new Set(),
    replacedAchievements: new Map(),
    ruleOverrides: new Map(),
    eventHandlers: new Map(),
    addedWords: [],
    removedWords: new Set(),
    addedLessons: new Map(),
    removedLessonIds: new Map(),
    replacedLessons: new Map(),
    panels: [],
    removedPanelIds: new Set(),
    cssSnippets: [],
    registeredModes: [],
    unregisteredModeIds: new Set(),
    interfaceLocales: [],
  };
}

export function emitModEvent<K extends ModEventName>(
  state: ModAPIState,
  event: K,
  data: ModEventPayloadMap[K],
) {
  const handlers = state.eventHandlers.get(event);
  if (!handlers || handlers.size === 0) return;

  for (const handler of handlers) {
    try {
      (handler as ModEventHandler<K>)(data);
    } catch (error) {
      console.error(`[ModEvent:${event}] handler failed:`, error);
    }
  }
}

/* ── Factory: create a sandboxed ModAPI for one mod ─────── */

export function createModAPI(
  modId: string,
  modName: string,
  permissions: ModPermission[],
  state: ModAPIState,
  getCurrentSettings: () => UserSettings,
  getCurrentItems: () => GameItemDefinition[],
  getCurrentAchievements: () => GameAchievementDefinition[],
  getCurrentWords: () => string[],
  getCurrentLessons: (layoutId: string) => Lesson[],
): ModAPI {
  const hasPermission = (p: ModPermission) => permissions.includes(p);

  const guard = (p: ModPermission, fn: () => void) => {
    if (!hasPermission(p)) {
      console.warn(`[Mod:${modId}] Permission "${p}" not granted, action blocked.`);
      return;
    }
    fn();
  };

  const sections: ModSectionsAPI = {
    disable(sectionId) { guard('sections', () => state.disabledSections.add(sectionId)); },
    enable(sectionId) { guard('sections', () => state.disabledSections.delete(sectionId)); },
    getDisabled() { return [...state.disabledSections]; },
  };

  const settings: ModSettingsAPI = {
    override(key, value) {
      guard('settings', () => {
        if (!isModUserSettingKey(key)) {
          console.warn(`[Mod:${modId}] Unknown settings key "${String(key)}" ignored.`);
          return;
        }
        if (!isModUserSettingValue(key, value)) {
          console.warn(`[Mod:${modId}] Invalid value for settings key "${String(key)}" ignored.`);
          return;
        }
        state.settingOverrides.set(key as string, value);
      });
    },
    removeOverride(key) {
      guard('settings', () => {
        if (!isModUserSettingKey(key)) {
          console.warn(`[Mod:${modId}] Unknown settings key "${String(key)}" ignored.`);
          return;
        }
        state.settingOverrides.delete(key);
      });
    },
    get(key) { return getCurrentSettings()[key]; },
  };

  const items: ModItemsAPI = {
    add(item) {
      guard('items', () => {
        if (!isModGameItemDefinition(item)) {
          console.warn(`[Mod:${modId}] Invalid item definition ignored.`);
          return;
        }
        state.addedItems.push(item);
      });
    },
    remove(itemId) {
      guard('items', () => {
        if (!isNonEmptyString(itemId)) {
          console.warn(`[Mod:${modId}] Item id must be a non-empty string.`);
          return;
        }
        state.removedItemIds.add(itemId);
      });
    },
    replace(itemId, item) {
      guard('items', () => {
        if (!isNonEmptyString(itemId)) {
          console.warn(`[Mod:${modId}] Item id must be a non-empty string.`);
          return;
        }
        if (!isModGameItemDefinition(item)) {
          console.warn(`[Mod:${modId}] Invalid replacement item definition ignored.`);
          return;
        }
        state.replacedItems.set(itemId, item);
      });
    },
    getAll() { return getCurrentItems(); },
  };

  const achievements: ModAchievementsAPI = {
    add(ach) { 
      guard('achievements', () => { 
        if (!isModGameAchievementDefinition(ach)) {
          console.warn(`[Mod:${modId}] Invalid achievement definition ignored.`);
          return;
        }
        state.addedAchievements.push(ach); 
      }); 
    },
    remove(achId) {
      guard('achievements', () => {
        if (!isNonEmptyString(achId)) {
          console.warn(`[Mod:${modId}] Achievement id must be a non-empty string.`);
          return;
        }
        state.removedAchievementIds.add(achId);
      });
    },
    replace(achId, ach) {
      guard('achievements', () => {
        if (!isNonEmptyString(achId)) {
          console.warn(`[Mod:${modId}] Achievement id must be a non-empty string.`);
          return;
        }
        if (!isModGameAchievementDefinition(ach)) {
          console.warn(`[Mod:${modId}] Invalid replacement achievement definition ignored.`);
          return;
        }
        state.replacedAchievements.set(achId, ach);
      });
    },
    getAll() { return getCurrentAchievements(); },
  };

  const rules: ModRulesAPI = {
    set(ruleId, value) {
      guard('rules', () => {
        if (!isModRuleId(ruleId)) {
          console.warn(`[Mod:${modId}] Unknown rule "${String(ruleId)}" ignored.`);
          return;
        }
        if (!isModRuleValue(ruleId, value)) {
          console.warn(`[Mod:${modId}] Invalid value for rule "${ruleId}" ignored.`);
          return;
        }
        state.ruleOverrides.set(ruleId, value);
      });
    },
    remove(ruleId) {
      guard('rules', () => {
        if (!isModRuleId(ruleId)) {
          console.warn(`[Mod:${modId}] Unknown rule "${String(ruleId)}" ignored.`);
          return;
        }
        state.ruleOverrides.delete(ruleId);
      });
    },
    get(ruleId) {
      return isModRuleId(ruleId) ? state.ruleOverrides.get(ruleId) : undefined;
    },
  };

  const events: ModEventsAPI = {
    on(event, handler) {
      guard('events', () => {
        if (!isModEventName(event)) {
          console.warn(`[Mod:${modId}] Unknown event "${String(event)}" ignored.`);
          return;
        }
        if (typeof handler !== 'function') {
          console.warn(`[Mod:${modId}] Handler for event "${event}" must be a function.`);
          return;
        }
        if (!state.eventHandlers.has(event)) state.eventHandlers.set(event, new Set());
        state.eventHandlers.get(event)!.add(handler as ModEventHandler);
      });
    },
    off(event, handler) {
      guard('events', () => {
        if (!isModEventName(event)) {
          console.warn(`[Mod:${modId}] Unknown event "${String(event)}" ignored.`);
          return;
        }
        state.eventHandlers.get(event)?.delete(handler as ModEventHandler);
      });
    },
  };

  const words: ModWordsAPI = {
    add(w) {
      guard('words', () => {
        const wordsToAdd = normalizeModWords(w);
        if (wordsToAdd.length === 0) {
          console.warn(`[Mod:${modId}] Word add ignored because it did not contain non-empty strings.`);
          return;
        }
        state.addedWords.push(...wordsToAdd);
      });
    },
    remove(w) {
      guard('words', () => {
        const wordsToRemove = normalizeModWords(w);
        if (wordsToRemove.length === 0) {
          console.warn(`[Mod:${modId}] Word remove ignored because it did not contain non-empty strings.`);
          return;
        }
        for (const word of wordsToRemove) state.removedWords.add(word);
      });
    },
    getAll() { return getCurrentWords(); },
  };

  const lessons: ModLessonsAPI = {
    add(layoutId, ls) {
      guard('lessons', () => {
        if (!isNonEmptyString(layoutId)) {
          console.warn(`[Mod:${modId}] Lesson add ignored because layoutId is invalid.`);
          return;
        }
        const lessonsToAdd = normalizeModLessons(ls);
        if (lessonsToAdd.length === 0) {
          console.warn(`[Mod:${modId}] Lesson add ignored because it did not contain valid lessons.`);
          return;
        }
        if (!state.addedLessons.has(layoutId)) state.addedLessons.set(layoutId, []);
        state.addedLessons.get(layoutId)!.push(...lessonsToAdd);
      });
    },
    remove(layoutId, ids) {
      guard('lessons', () => {
        if (!isNonEmptyString(layoutId)) {
          console.warn(`[Mod:${modId}] Lesson remove ignored because layoutId is invalid.`);
          return;
        }
        const lessonIds = normalizeModWords(ids);
        if (lessonIds.length === 0) {
          console.warn(`[Mod:${modId}] Lesson remove ignored because it did not contain valid lesson ids.`);
          return;
        }
        if (!state.removedLessonIds.has(layoutId)) state.removedLessonIds.set(layoutId, new Set());
        for (const id of lessonIds) state.removedLessonIds.get(layoutId)!.add(id);
      });
    },
    replace(layoutId, lessonId, lesson) {
      guard('lessons', () => {
        if (!isNonEmptyString(layoutId) || !isNonEmptyString(lessonId)) {
          console.warn(`[Mod:${modId}] Lesson replace ignored because layoutId or lessonId is invalid.`);
          return;
        }
        if (!isModLesson(lesson)) {
          console.warn(`[Mod:${modId}] Lesson replace ignored because replacement lesson is invalid.`);
          return;
        }
        if (!state.replacedLessons.has(layoutId)) state.replacedLessons.set(layoutId, new Map());
        state.replacedLessons.get(layoutId)!.set(lessonId, lesson);
      });
    },
    getAll(layoutId) { return isNonEmptyString(layoutId) ? getCurrentLessons(layoutId) : []; },
  };

  const ui: ModUIAPI = {
    registerPanel(panel) {
      guard('ui', () => {
        if (!isModPanel(panel)) {
          console.warn(`[Mod:${modId}] Invalid panel registration ignored.`);
          return;
        }
        state.panels.push(panel);
      });
    },
    removePanel(panelId) {
      guard('ui', () => {
        if (!isNonEmptyString(panelId)) {
          console.warn(`[Mod:${modId}] Panel id must be a non-empty string.`);
          return;
        }
        state.removedPanelIds.add(panelId);
      });
    },
    injectCSS(css) {
      guard('ui', () => {
        if (typeof css !== 'string') {
          console.warn(`[Mod:${modId}] CSS snippet must be a string.`);
          return;
        }
        state.cssSnippets.push(css);
      });
    },
  };

  const modes: ModModesAPI = {
    register(mode) {
      guard('modes', () => {
        if (!isModModeDefinition(mode)) {
          console.warn(`[Mod:${modId}] Invalid mode registration ignored.`);
          return;
        }
        state.registeredModes.push(mode);
      });
    },
    unregister(modeId) {
      guard('modes', () => {
        if (!isNonEmptyString(modeId)) {
          console.warn(`[Mod:${modId}] Mode id must be a non-empty string.`);
          return;
        }
        state.unregisteredModeIds.add(modeId);
      });
    },
  };

  const i18n: ModI18nAPI = {
    registerLocale(locale) {
      guard('i18n', () => {
        if (!isModInterfaceLocaleDefinition(locale)) {
          console.warn(`[Mod:${modId}] Invalid interface locale ignored.`);
          return;
        }
        state.interfaceLocales.push(...normalizeExternalInterfaceLocaleDefinitions([
          {
            ...locale,
            sourceName: modName,
          },
        ], 'mod'));
      });
    },
    registerLocales(locales) {
      guard('i18n', () => {
        if (!Array.isArray(locales)) {
          console.warn(`[Mod:${modId}] Interface locales must be an array.`);
          return;
        }
        const validLocales = locales.filter(isModInterfaceLocaleDefinition);
        if (validLocales.length === 0) {
          console.warn(`[Mod:${modId}] Interface locale registration ignored because it did not contain valid locales.`);
          return;
        }
        state.interfaceLocales.push(...normalizeExternalInterfaceLocaleDefinitions(
          validLocales.map((locale) => ({
            ...locale,
            sourceName: modName,
          })),
          'mod',
        ));
      });
    },
  };

  const log: ModLogAPI = {
    info(msg) { console.log(`[Mod:${modId}] ${msg}`); },
    warn(msg) { console.warn(`[Mod:${modId}] ${msg}`); },
    error(msg) { console.error(`[Mod:${modId}] ${msg}`); },
  };

  return {
    modId,
    modName,
    sections,
    settings,
    items,
    achievements,
    rules,
    events,
    words,
    lessons,
    ui,
    modes,
    i18n,
    log,
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
