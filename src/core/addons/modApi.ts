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
} from '../../shared/types';
import { normalizeExternalInterfaceLocaleDefinitions } from '../i18n/resources';

/* ── Event types ────────────────────────────────────────── */

export type ModEventName =
  | 'sessionStart'
  | 'sessionFinish'
  | 'keyPress'
  | 'modeSwitch'
  | 'settingChange'
  | 'lessonComplete'
  | 'gameStateChange';

export type ModEventHandler = (data: unknown) => void;

/* ── Sub-APIs ───────────────────────────────────────────── */

export interface ModSectionsAPI {
  /** Hide a sidebar section */
  disable(sectionId: string): void;
  /** Re-enable a previously disabled section */
  enable(sectionId: string): void;
  /** Get list of currently disabled sections */
  getDisabled(): string[];
}

export interface ModSettingsAPI {
  /** Override a specific setting while the mod is active */
  override<K extends keyof UserSettings>(key: K, value: UserSettings[K]): void;
  /** Remove a setting override */
  removeOverride(key: string): void;
  /** Read current value of a setting */
  get<K extends keyof UserSettings>(key: K): UserSettings[K];
}

export interface ModItemsAPI {
  /** Add a new item to the catalog */
  add(item: GameItemDefinition): void;
  /** Remove an item from the catalog by id */
  remove(itemId: string): void;
  /** Replace an existing item */
  replace(itemId: string, item: GameItemDefinition): void;
  /** Get current catalog */
  getAll(): GameItemDefinition[];
}

export interface ModAchievementsAPI {
  /** Add a new achievement */
  add(achievement: GameAchievementDefinition): void;
  /** Remove an achievement by id */
  remove(achievementId: string): void;
  /** Replace an existing achievement */
  replace(achievementId: string, achievement: GameAchievementDefinition): void;
  /** Get current catalog */
  getAll(): GameAchievementDefinition[];
}

export interface ModRulesAPI {
  /** Set a rule override (e.g. "game.baseHp", 120) */
  set(ruleId: string, value: unknown): void;
  /** Remove a rule override */
  remove(ruleId: string): void;
  /** Get current value of a rule */
  get(ruleId: string): unknown;
}

export interface ModEventsAPI {
  /** Subscribe to an app event */
  on(event: ModEventName, handler: ModEventHandler): void;
  /** Unsubscribe from an event */
  off(event: ModEventName, handler: ModEventHandler): void;
}

export interface ModWordsAPI {
  /** Add words to the active language pool */
  add(words: string[]): void;
  /** Remove words from the pool by exact match */
  remove(words: string[]): void;
  /** Get current word pool */
  getAll(): string[];
}

export interface ModLessonsAPI {
  /** Add lessons to a layout (layoutId must match an existing layout) */
  add(layoutId: string, lessons: Lesson[]): void;
  /** Remove lessons by id from a layout */
  remove(layoutId: string, lessonIds: string[]): void;
  /** Replace a lesson in a layout */
  replace(layoutId: string, lessonId: string, lesson: Lesson): void;
  /** Get all lessons for a layout */
  getAll(layoutId: string): Lesson[];
}

/** Panel registration for custom UI injection */
export interface ModPanel {
  id: string;
  /** Where to inject: 'sidebar-top' | 'sidebar-bottom' | 'page-top' | 'page-bottom' | 'overlay' */
  location: string;
  /** Raw HTML content (sanitised at render) */
  html: string;
}

export interface ModUIAPI {
  /** Register a custom panel */
  registerPanel(panel: ModPanel): void;
  /** Remove a previously registered panel */
  removePanel(panelId: string): void;
  /** Inject a CSS snippet */
  injectCSS(css: string): void;
}

/** Mode definition for new sidebar modes */
export interface ModModeDefinition {
  /** Unique mode ID (kebab-case) */
  id: string;
  /** Display label */
  label: string;
  /** Lucide icon name or raw SVG string */
  icon: string;
  /** Position: 'top' (with practice/game) or 'bottom' (with settings) */
  group: 'top' | 'bottom';
  /** Raw HTML content for the page */
  html: string;
}

export interface ModModesAPI {
  /** Register a new sidebar mode / page */
  register(mode: ModModeDefinition): void;
  /** Unregister a previously registered mode */
  unregister(modeId: string): void;
}

export interface ModI18nAPI {
  /** Register one interface locale from a mod script */
  registerLocale(locale: AddonInterfaceLocaleDefinition): void;
  /** Register several interface locales from a mod script */
  registerLocales(locales: AddonInterfaceLocaleDefinition[]): void;
}

export interface ModLogAPI {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

/* ── Combined API ───────────────────────────────────────── */

export interface ModAPI {
  /** Mod metadata */
  readonly modId: string;
  readonly modName: string;

  /** Sub-APIs */
  sections: ModSectionsAPI;
  settings: ModSettingsAPI;
  items: ModItemsAPI;
  achievements: ModAchievementsAPI;
  rules: ModRulesAPI;
  events: ModEventsAPI;
  words: ModWordsAPI;
  lessons: ModLessonsAPI;
  ui: ModUIAPI;
  modes: ModModesAPI;
  i18n: ModI18nAPI;
  log: ModLogAPI;
}

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
  ruleOverrides: Map<string, unknown>;
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

/* ── Factory: create a sandboxed ModAPI for one mod ─────── */

export function createModAPI(
  modId: string,
  modName: string,
  permissions: string[],
  state: ModAPIState,
  getCurrentSettings: () => UserSettings,
  getCurrentItems: () => GameItemDefinition[],
  getCurrentAchievements: () => GameAchievementDefinition[],
  getCurrentWords: () => string[],
  getCurrentLessons: (layoutId: string) => Lesson[],
): ModAPI {
  const hasPermission = (p: string) => permissions.includes(p);

  const guard = (p: string, fn: () => void) => {
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
    override(key, value) { guard('settings', () => state.settingOverrides.set(key as string, value)); },
    removeOverride(key) { guard('settings', () => state.settingOverrides.delete(key)); },
    get(key) { return getCurrentSettings()[key]; },
  };

  const items: ModItemsAPI = {
    add(item) { guard('items', () => { state.addedItems.push(item); }); },
    remove(itemId) { guard('items', () => { state.removedItemIds.add(itemId); }); },
    replace(itemId, item) { guard('items', () => { state.replacedItems.set(itemId, item); }); },
    getAll() { return getCurrentItems(); },
  };

  const achievements: ModAchievementsAPI = {
    add(ach) { 
      guard('achievements', () => { 
        state.addedAchievements.push(ach); 
      }); 
    },
    remove(achId) { guard('achievements', () => { state.removedAchievementIds.add(achId); }); },
    replace(achId, ach) { guard('achievements', () => { state.replacedAchievements.set(achId, ach); }); },
    getAll() { return getCurrentAchievements(); },
  };

  const rules: ModRulesAPI = {
    set(ruleId, value) { guard('rules', () => state.ruleOverrides.set(ruleId, value)); },
    remove(ruleId) { guard('rules', () => state.ruleOverrides.delete(ruleId)); },
    get(ruleId) { return state.ruleOverrides.get(ruleId); },
  };

  const events: ModEventsAPI = {
    on(event, handler) {
      guard('events', () => {
        if (!state.eventHandlers.has(event)) state.eventHandlers.set(event, new Set());
        state.eventHandlers.get(event)!.add(handler);
      });
    },
    off(event, handler) {
      guard('events', () => {
        state.eventHandlers.get(event)?.delete(handler);
      });
    },
  };

  const words: ModWordsAPI = {
    add(w) { guard('words', () => { state.addedWords.push(...w); }); },
    remove(w) { guard('words', () => { for (const word of w) state.removedWords.add(word); }); },
    getAll() { return getCurrentWords(); },
  };

  const lessons: ModLessonsAPI = {
    add(layoutId, ls) {
      guard('lessons', () => {
        if (!state.addedLessons.has(layoutId)) state.addedLessons.set(layoutId, []);
        state.addedLessons.get(layoutId)!.push(...ls);
      });
    },
    remove(layoutId, ids) {
      guard('lessons', () => {
        if (!state.removedLessonIds.has(layoutId)) state.removedLessonIds.set(layoutId, new Set());
        for (const id of ids) state.removedLessonIds.get(layoutId)!.add(id);
      });
    },
    replace(layoutId, lessonId, lesson) {
      guard('lessons', () => {
        if (!state.replacedLessons.has(layoutId)) state.replacedLessons.set(layoutId, new Map());
        state.replacedLessons.get(layoutId)!.set(lessonId, lesson);
      });
    },
    getAll(layoutId) { return getCurrentLessons(layoutId); },
  };

  const ui: ModUIAPI = {
    registerPanel(panel) {
      guard('ui', () => { state.panels.push(panel); });
    },
    removePanel(panelId) {
      guard('ui', () => { state.removedPanelIds.add(panelId); });
    },
    injectCSS(css) {
      guard('ui', () => { state.cssSnippets.push(css); });
    },
  };

  const modes: ModModesAPI = {
    register(mode) {
      guard('modes', () => { state.registeredModes.push(mode); });
    },
    unregister(modeId) {
      guard('modes', () => { state.unregisteredModeIds.add(modeId); });
    },
  };

  const i18n: ModI18nAPI = {
    registerLocale(locale) {
      guard('i18n', () => {
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
        state.interfaceLocales.push(...normalizeExternalInterfaceLocaleDefinitions(
          locales.map((locale) => ({
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
