import {
  createContext, useContext, useState, useCallback, useEffect, useRef, useMemo,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';
import type {
  LayoutsData, Layout, Progress, CustomThemes, CustomPresets, UserPreset, CharStat,
  UserSettings, PracticeSettings, PresetSettings, PracticeState, LayoutProgressState,
  LanguageInfo, GameState, GameItemDefinition,
  GameEquipmentSlot, GameRunState, GameAchievementDefinition,
  PracticeInsightsState, LayoutPracticeInsights, PracticeRhythmSessionEntry, PracticeContentPack,
  MotivationProgress,
  ModePracticeSettings, ModePracticeSettingsId, PracticeContentMode, PracticeTrainingMode, PracticeContentScenarioId, ExportPayload, InstalledAddon, InstalledMod, AddonInstallResult, ModInstallResult,
} from '../../shared/types';
import {
  formatSpeed, speedLabel,
  buildNgramModel, type NgramModel,
} from '../../core/engine';
import { GAME_ITEM_CATALOG } from '../../core/game/items';
import { GAME_ACHIEVEMENT_CATALOG } from '../../core/game/gameAchievements';
import {
  BUILT_IN_THEMES,
  BUILT_IN_PRESETS,
  defaultModePracticeSettings,
  extractPresetSettings,
  defaultSettings,
  defaultPracticeSettings,
} from './appDefaults';
import {
  resolveGameState,
  resolvePracticeInsights,
  resolvePracticeRhythmHistory,
  resolveSettings,
} from './appResolvers';
import {
  getLayoutPracticeInsights,
  getLayoutProgress,
  getPracticeState,
} from './appProgress';
import { createPracticeActions } from './appActionsPractice';
import { createStatsActions } from './appActionsStats';
import { createGameActions } from './appActionsGame';
import {
  mergeAddonWords,
  mergeAddonLayouts,
  mergeAddonThemes,
  mergeAddonItems,
  mergeAddonAchievements,
  mergeAddonPracticePacks,
} from '../../core/addons/addonMerger';
import { runAllMods } from '../../core/addons/modRunner';
import type { ModAPIState } from '../../core/addons/modApi';
import { normalizeMotivationProgress } from '../../core/motivation/progress';

export { BUILT_IN_THEMES } from './appDefaults';

export interface AppContextValue {
  ready: boolean;
  layouts: LayoutsData;
  allWords: string[];
  ngramModel: NgramModel | null;
  progress: Progress;
  motivationProgress: MotivationProgress;
  practiceInsights: PracticeInsightsState;
  practiceRhythmHistory: Record<string, PracticeRhythmSessionEntry[]>;
  practiceContentPacks: PracticeContentPack[];
  customThemes: CustomThemes;
  gameState: GameState;
  gameItemCatalog: GameItemDefinition[];
  gameAchievementCatalog: GameAchievementDefinition[];

  settings: UserSettings;
  practiceSettings: PracticeSettings;
  currentLayout: string;
  currentLanguage: string;
  currentMode: string;

  languages: LanguageInfo[];
  layoutsForLanguage: [string, Layout][];

  switchMode: (mode: string) => void;
  setCurrentLayout: (layout: string) => void;
  setCurrentLanguage: (lang: string) => void;
  saveSetting: <K extends keyof UserSettings>(key: K, val: UserSettings[K]) => void;
  savePracticeSetting: <K extends keyof PracticeSettings>(key: K, val: PracticeSettings[K]) => void;
  getModePracticeSettings: (mode: ModePracticeSettingsId) => ModePracticeSettings;
  saveModePracticeSettings: (mode: ModePracticeSettingsId, patch: Partial<ModePracticeSettings>) => ModePracticeSettings;
  saveProgress: (p: Progress) => void;
  updateMotivationProgress: (updater: (current: MotivationProgress) => MotivationProgress) => MotivationProgress;
  saveCustomThemes: (t: CustomThemes) => void;
  applyTheme: (name: string) => void;
  reloadWords: () => Promise<void>;

  customPresets: CustomPresets;
  applyPreset: (presetId: string) => void;
  saveCurrentAsPreset: (name: string) => string;
  deletePreset: (presetId: string) => void;

  fmtSpeed: (wpm: number) => string;
  spdLabel: string;
  getLayoutProgress: () => LayoutProgressState;
  getPracticeState: () => PracticeState;
  getPracticeInsights: () => LayoutPracticeInsights;
  savePracticeInsights: (insights: LayoutPracticeInsights) => void;
  savePracticeRhythmSession: (entry: Omit<PracticeRhythmSessionEntry, 'id' | 'date'> & { id?: string; date?: string }) => void;
  saveCharStats: (cs: Record<string, CharStat>) => void;
  saveHistory: (
    mode: 'test' | 'lesson' | 'practice' | 'game',
    wpm: number,
    acc: number,
    extras?: {
      contentScenarioId?: PracticeContentScenarioId;
      trainingMode?: PracticeTrainingMode;
      contentMode?: PracticeContentMode;
      durationSeconds?: number;
      gameLevel?: number;
      gameStageType?: 'normal' | 'boss';
      passed?: boolean;
      victory?: boolean;
      timedOut?: boolean;
      charStats?: Record<string, CharStat>;
    },
  ) => void;
  saveGameState: (game: GameState) => void;
  grantGameItem: (itemId: string) => string | null;
  equipGameItem: (slot: GameEquipmentSlot, inventoryItemId: string) => boolean;
  unequipGameItem: (slot: GameEquipmentSlot) => void;
  repairGameItems: (amount: number, onlyEquipped?: boolean) => string[];
  wearEquippedGameItems: (args: { passed: boolean; isBoss: boolean }) => string[];
  resetGameInventory: () => void;
  resetGameProgress: () => void;
  markGameLevelReached: (level: number) => void;
  peekNextGameLetter: () => string | null;
  unlockNextGameLetter: () => string | null;
  unlockGameAchievements: (achievementIds: string[]) => GameAchievementDefinition[];
  /** Глобальный список разблокированных достижений (все категории). */
  unlockedAchievementIds: string[];
  /** Разблокировать достижения по ID. Возвращает только новые (ранее не открытые). */
  unlockAchievements: (achievementIds: string[]) => GameAchievementDefinition[];
  saveCurrentGameRun: (run: GameRunState | null) => void;
  clearCurrentGameRun: (destroyItems?: boolean) => void;

  exportTheme: (themeName: string) => Promise<boolean>;
  exportConfig: () => Promise<boolean>;
  importConfig: () => Promise<string | null>;

  modeProfiles: Partial<Record<string, Partial<PresetSettings>>>;
  saveModeProfile: (mode: string) => void;
  clearModeProfile: (mode: string) => void;

  installedAddons: InstalledAddon[];
  installAddon: () => Promise<AddonInstallResult>;
  removeAddon: (id: string) => Promise<boolean>;
  toggleAddon: (id: string, enabled: boolean) => Promise<boolean>;
  refreshAddons: () => Promise<void>;

  installedMods: InstalledMod[];
  installMod: () => Promise<ModInstallResult>;
  removeMod: (id: string) => Promise<boolean>;
  toggleMod: (id: string, enabled: boolean) => Promise<boolean>;
  refreshMods: () => Promise<void>;

  /** Sidebar sections disabled by active mods */
  disabledSections: string[];

  /** Rule overrides from active mods (e.g. 'game.baseHp' → 120) */
  modRuleOverrides: Map<string, unknown>;

  /** Setting overrides from active mods */
  modSettingOverrides: Map<string, unknown>;

  /** Custom CSS snippets injected by mods */
  modCssSnippets: string[];

  /** Custom panels injected by mods */
  modPanels: import('../../core/addons/modApi').ModPanel[];

  /** Custom modes/pages registered by mods */
  modModes: import('../../core/addons/modApi').ModModeDefinition[];
}

export interface AppUiContextValue {
  activeChar: string | undefined;
  setActiveChar: (ch: string | undefined) => void;
  keyboardPreviewActive: boolean;
  setKeyboardPreviewActive: (active: boolean) => void;
}

const AppContext = createContext<AppContextValue>(null!);
const AppUiContext = createContext<AppUiContextValue>(null!);
export const useApp = () => useContext(AppContext);
export const useAppUi = () => useContext(AppUiContext);

function isStringListEqual(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}

function isGameInventoryItemEqual(
  left: GameState['inventory'][number],
  right: GameState['inventory'][number],
) {
  return (
    left.id === right.id
    && left.itemId === right.itemId
    && left.durability === right.durability
    && left.maxDurability === right.maxDurability
  );
}

function isInventoryEqual(left: GameState['inventory'], right: GameState['inventory']) {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (!isGameInventoryItemEqual(left[i]!, right[i]!)) return false;
  }
  return true;
}

function isEquipmentEqual(left: GameState['equipped'], right: GameState['equipped']) {
  return (
    left.slotA === right.slotA
    && left.slotB === right.slotB
    && left.slotC === right.slotC
  );
}

function isGameRunEqual(left: GameRunState | null | undefined, right: GameRunState | null | undefined) {
  if (left === right) return true;
  if (!left || !right) return false;
  return JSON.stringify(left) === JSON.stringify(right);
}

function stabilizeGameState(prev: GameState | null, next: GameState) {
  if (!prev) return next;

  const ghostRunEqual = prev.ghostRun === next.ghostRun || JSON.stringify(prev.ghostRun) === JSON.stringify(next.ghostRun);
  const dailyRunEqual = prev.dailyRun === next.dailyRun || JSON.stringify(prev.dailyRun) === JSON.stringify(next.dailyRun);

  if (
    prev.highestLevel === next.highestLevel
    && isInventoryEqual(prev.inventory, next.inventory)
    && isStringListEqual(prev.discoveredItemIds, next.discoveredItemIds)
    && isStringListEqual(prev.achievements, next.achievements)
    && isEquipmentEqual(prev.equipped, next.equipped)
    && isGameRunEqual(prev.currentRun, next.currentRun)
    && ghostRunEqual
    && dailyRunEqual
  ) {
    return prev;
  }

  return {
    highestLevel: next.highestLevel,
    inventory: isInventoryEqual(prev.inventory, next.inventory) ? prev.inventory : next.inventory,
    discoveredItemIds: isStringListEqual(prev.discoveredItemIds, next.discoveredItemIds)
      ? prev.discoveredItemIds
      : next.discoveredItemIds,
    achievements: isStringListEqual(prev.achievements, next.achievements)
      ? prev.achievements
      : next.achievements,
    equipped: isEquipmentEqual(prev.equipped, next.equipped) ? prev.equipped : next.equipped,
    currentRun: isGameRunEqual(prev.currentRun, next.currentRun) ? prev.currentRun : next.currentRun,
    ghostRun: ghostRunEqual ? prev.ghostRun : next.ghostRun,
    dailyRun: dailyRunEqual ? prev.dailyRun : next.dailyRun,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [layouts, setLayouts] = useState<LayoutsData>({ languages: [], layouts: {} });
  const [allWords, setAllWords] = useState<string[]>([]);
  const ngramModel = useMemo<NgramModel | null>(
    () => (allWords.length > 0 ? buildNgramModel(allWords) : null),
    [allWords],
  );

  const [progress, setProgress] = useState<Progress>({});
  const [customThemes, setCustomThemes] = useState<CustomThemes>({});
  const [practiceContentPacks, setPracticeContentPacks] = useState<PracticeContentPack[]>([]);
  const [settingsState, setSettingsState] = useState<UserSettings>(() => resolveSettings({}));
  const [practiceSettingsState, setPracticeSettingsState] = useState<PracticeSettings>(() => defaultPracticeSettings());
  const [gameState, setGameState] = useState<GameState>(() => resolveGameState({}));
  const [currentLayout, setCurrentLayoutState] = useState('');
  const [currentLanguage, setCurrentLanguageState] = useState('');
  const [currentMode, setCurrentMode] = useState('home');
  const [activeChar, setActiveChar] = useState<string | undefined>(undefined);
  const [keyboardPreviewActive, setKeyboardPreviewActive] = useState(false);
  const [installedAddons, setInstalledAddons] = useState<InstalledAddon[]>([]);
  const [installedMods, setInstalledMods] = useState<InstalledMod[]>([]);
  const [mergedItemCatalog, setMergedItemCatalog] = useState<GameItemDefinition[]>(GAME_ITEM_CATALOG);
  const [mergedAchievementCatalog, setMergedAchievementCatalog] = useState<GameAchievementDefinition[]>(GAME_ACHIEVEMENT_CATALOG);
  const [disabledSections, setDisabledSections] = useState<string[]>([]);
  const [modRuleOverrides, setModRuleOverrides] = useState<Map<string, unknown>>(new Map());
  const [modSettingOverrides, setModSettingOverrides] = useState<Map<string, unknown>>(new Map());
  const [modCssSnippets, setModCssSnippets] = useState<string[]>([]);
  const [modPanels, setModPanels] = useState<import('../../core/addons/modApi').ModPanel[]>([]);
  const [modModes, setModModes] = useState<import('../../core/addons/modApi').ModModeDefinition[]>([]);

  const progressRef = useRef(progress);
  progressRef.current = progress;

  const settingsRef = useRef(settingsState);
  settingsRef.current = settingsState;

  const practiceSettingsRef = useRef(practiceSettingsState);
  practiceSettingsRef.current = practiceSettingsState;

  const allWordsRef = useRef(allWords);
  allWordsRef.current = allWords;

  const layoutsRef = useRef(layouts);
  layoutsRef.current = layouts;

  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;

  const settings = settingsState;
  const practiceSettings = practiceSettingsState;
  const practiceInsights = useMemo(
    () => resolvePracticeInsights(progress),
    [progress.practiceInsights],
  );
  const practiceRhythmHistory = useMemo(
    () => resolvePracticeRhythmHistory(progress),
    [progress.practiceRhythmHistory],
  );
  const motivationProgress = useMemo(
    () => normalizeMotivationProgress(progress.motivation),
    [progress.motivation],
  );
  const layoutsForLanguage = useMemo<[string, Layout][]>(() => {
    if (!currentLanguage) return [];
    return Object.entries(layouts.layouts).filter(([, layout]) => layout.lang === currentLanguage);
  }, [layouts.layouts, currentLanguage]);

  const languages = layouts.languages ?? [];

  const customThemesRef = useRef(customThemes);
  customThemesRef.current = customThemes;

  const installedAddonsRef = useRef(installedAddons);
  installedAddonsRef.current = installedAddons;

  const installedModsRef = useRef(installedMods);
  installedModsRef.current = installedMods;

  const applyThemeDOM = useCallback((name: string, themesOverride?: CustomThemes) => {
    const themes = themesOverride ?? customThemesRef.current;
    const extendedVars = ['--font-sans', '--font-mono', '--radius', '--radius-sm', '--transition'] as const;
    if (BUILT_IN_THEMES.includes(name)) {
      document.body.setAttribute('data-theme', name);
      const root = document.documentElement.style;
      ['--bg', '--surface', '--surface2', '--surface3', '--text', '--text-dim', '--subtext',
        '--accent', '--accent-hover', '--accent-dim', '--green', '--red', '--yellow',
        ...extendedVars]
        .forEach(variable => root.removeProperty(variable));
      return;
    }

    if (themes[name]) {
      document.body.setAttribute('data-theme', 'custom');
      const colors = themes[name];
      const root = document.documentElement.style;
      root.setProperty('--bg', colors.bg);
      root.setProperty('--surface', colors.surface);
      root.setProperty('--surface2', colors.surface2);
      root.setProperty('--text', colors.text);
      root.setProperty('--subtext', colors.subtext);
      root.setProperty('--accent', colors.accent);
      root.setProperty('--green', colors.green);
      root.setProperty('--red', colors.red);
      root.setProperty('--yellow', colors.yellow);
      /* Расширенные параметры (шрифты, радиусы, анимация) */
      if (colors.fontSans) root.setProperty('--font-sans', colors.fontSans);
      else root.removeProperty('--font-sans');
      if (colors.fontMono) root.setProperty('--font-mono', colors.fontMono);
      else root.removeProperty('--font-mono');
      if (colors.radius) root.setProperty('--radius', colors.radius);
      else root.removeProperty('--radius');
      if (colors.radiusSm) root.setProperty('--radius-sm', colors.radiusSm);
      else root.removeProperty('--radius-sm');
      if (colors.transitionSpeed) root.setProperty('--transition', `${colors.transitionSpeed} ease`);
      else root.removeProperty('--transition');
    }
  }, []);

  /** Ref to store active mod event handlers from last run */
  const modStateRef = useRef<ModAPIState | null>(null);

  /** Run all mod scripts and merge their effects into app state */
  const applyModEffects = useCallback(async (mods: InstalledMod[], addons: InstalledAddon[]) => {
    // Merge addon items & achievements (content addons — synchronous)
    const items = mergeAddonItems(GAME_ITEM_CATALOG, addons);
    const achievements = mergeAddonAchievements(GAME_ACHIEVEMENT_CATALOG, addons);

    // Run mod scripts (async — reads entry.js via IPC)
    const { state, errors } = await runAllMods(
      mods,
      (modId) => window.api.readModScript(modId),
      () => settingsRef.current,
      () => items,
      () => achievements,
      () => allWordsRef.current,
      (layoutId) => {
        const layout = layoutsRef.current.layouts[layoutId];
        return layout ? layout.lessonOrder : [];
      },
    );

    if (errors.length > 0) {
      for (const e of errors) console.error(`[Mod:${e.modId}] ${e.error}`);
    }

    modStateRef.current = state;

    // ── Items ──
    let finalItems = items.filter(i => !state.removedItemIds.has(i.id));
    for (const [id, replacement] of state.replacedItems) {
      finalItems = finalItems.filter(i => i.id !== id);
      finalItems.push(replacement);
    }
    finalItems.push(...state.addedItems);

    // ── Achievements ──
    let finalAchievements = achievements.filter(a => !state.removedAchievementIds.has(a.id));
    for (const [id, replacement] of state.replacedAchievements) {
      finalAchievements = finalAchievements.filter(a => a.id !== id);
      finalAchievements.push(replacement);
    }
    const normalizedAddedAchievements = state.addedAchievements.map(ach => ({
      ...ach,
      category: ach.category || 'game',
    }));
    finalAchievements.push(...normalizedAddedAchievements);

    // ── Words ──
    if (state.addedWords.length > 0 || state.removedWords.size > 0) {
      setAllWords(prev => {
        let words = state.removedWords.size > 0
          ? prev.filter(w => !state.removedWords.has(w))
          : [...prev];
        if (state.addedWords.length > 0) {
          const set = new Set(words);
          for (const w of state.addedWords) set.add(w);
          words = Array.from(set);
        }
        return words;
      });
    }

    // ── Lessons (mutate layouts) ──
    if (state.addedLessons.size > 0 || state.removedLessonIds.size > 0 || state.replacedLessons.size > 0) {
      setLayouts(prev => {
        const newLayouts = { ...prev.layouts };
        // Remove lessons
        for (const [layoutId, ids] of state.removedLessonIds) {
          if (newLayouts[layoutId]) {
            newLayouts[layoutId] = {
              ...newLayouts[layoutId],
              lessonOrder: newLayouts[layoutId].lessonOrder.filter(l => !ids.has(l.id)),
            };
          }
        }
        // Replace lessons
        for (const [layoutId, replacements] of state.replacedLessons) {
          if (newLayouts[layoutId]) {
            newLayouts[layoutId] = {
              ...newLayouts[layoutId],
              lessonOrder: newLayouts[layoutId].lessonOrder.map(l =>
                replacements.has(l.id) ? replacements.get(l.id)! : l,
              ),
            };
          }
        }
        // Add lessons
        for (const [layoutId, lessons] of state.addedLessons) {
          if (newLayouts[layoutId]) {
            const existingIds = new Set(newLayouts[layoutId].lessonOrder.map(l => l.id));
            const newLessons = lessons.filter(l => !existingIds.has(l.id));
            if (newLessons.length > 0) {
              newLayouts[layoutId] = {
                ...newLayouts[layoutId],
                lessonOrder: [...newLayouts[layoutId].lessonOrder, ...newLessons],
              };
            }
          }
        }
        return { ...prev, layouts: newLayouts };
      });
    }

    setMergedItemCatalog(finalItems);
    setMergedAchievementCatalog(finalAchievements);
    setDisabledSections([...state.disabledSections]);
    setModRuleOverrides(new Map(state.ruleOverrides));
    setModSettingOverrides(new Map(state.settingOverrides));
    setModCssSnippets([...state.cssSnippets]);
    setModPanels(state.panels.filter(p => !state.removedPanelIds.has(p.id)));
    setModModes(state.registeredModes.filter(m => !state.unregisteredModeIds.has(m.id)));
  }, []);

  useEffect(() => {
    (async () => {
      const [loadedLayouts, loadedProgress, loadedThemes, loadedPracticeContentPacks, loadedAddons, loadedMods] = await Promise.all([
        window.api.getLayouts(),
        window.api.getProgress(),
        window.api.getCustomThemes(),
        window.api.getPracticeContentPacks(),
        window.api.scanAddons(),
        window.api.scanMods(),
      ]);

      setInstalledAddons(loadedAddons);
      setInstalledMods(loadedMods);
      await applyModEffects(loadedMods, loadedAddons);

      /* Merge addon resources into base data */
      const mergedLayouts = mergeAddonLayouts(loadedLayouts, loadedAddons);
      const mergedThemes = mergeAddonThemes(loadedThemes, loadedAddons);
      const mergedPracticeContentPacks = mergeAddonPracticePacks(loadedPracticeContentPacks, loadedAddons);

      const normalizedProgress = (() => {
        const base = {
          ...loadedProgress,
          game: resolveGameState(loadedProgress),
        };
        // Миграция: скопировать game.achievements в progress.achievements (глобальное хранилище).
        const gameAchievements = base.game.achievements ?? [];
        const progressAchievements = base.achievements ?? [];
        const merged = Array.from(new Set([...progressAchievements, ...gameAchievements]));
        return { ...base, achievements: merged };
      })();
      const normalizedGameState = stabilizeGameState(gameStateRef.current, normalizedProgress.game);
      const normalizedSettings = resolveSettings(normalizedProgress);
      const normalizedPracticeSettings = defaultPracticeSettings(normalizedProgress.practiceSettings);

      setLayouts(mergedLayouts);
      setPracticeContentPacks(mergedPracticeContentPacks);
      setProgress(normalizedProgress);
      setSettingsState(normalizedSettings);
      setPracticeSettingsState(normalizedPracticeSettings);
      setGameState(normalizedGameState);
      setCustomThemes(mergedThemes);

      let nextLanguage = normalizedSettings.language;
      if (!nextLanguage || !(mergedLayouts.languages ?? []).some((language: LanguageInfo) => language.id === nextLanguage)) {
        nextLanguage = mergedLayouts.languages?.[0]?.id ?? 'en';
      }
      setCurrentLanguageState(nextLanguage);

      let nextLayout = normalizedSettings.layout;
      const compatibleLayouts = Object.entries(mergedLayouts.layouts)
        .filter(([, layout]) => layout.lang === nextLanguage);
      if (!nextLayout || !mergedLayouts.layouts[nextLayout] || mergedLayouts.layouts[nextLayout].lang !== nextLanguage) {
        nextLayout = compatibleLayouts[0]?.[0] ?? Object.keys(mergedLayouts.layouts)[0] ?? '';
      }
      setCurrentLayoutState(nextLayout);

      const baseWords = await window.api.getWords(nextLanguage);
      const mergedWords = mergeAddonWords(baseWords, nextLanguage, loadedAddons);
      setAllWords(mergedWords);

      void window.api.saveProgress(normalizedProgress);

      applyThemeDOM(normalizedSettings.theme ?? 'dark-orange', mergedThemes);
      setReady(true);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- runs once on mount

  /* ─── REMOVED sync effects ───
     saveSetting / savePracticeSetting / commitGameState already set both the
     derived state (settingsState, practiceSettingsState, gameState) AND progress
     in one batch.  Extra useEffects that re-derive state from progress.settings /
     progress.practiceSettings / progress.game used to fire one render later and
     overwrite the freshly-set value with a stale-closure version — causing
     settings, themes, and inventory to revert silently.
     The initial load is handled by the init effect above, and saveProgressCb
     explicitly re-resolves everything, so these effects are not needed.
  ─────────────────────────────── */

  useEffect(() => {
    if (!ready) return;
    applyThemeDOM(settings.theme ?? 'dark-orange');
  }, [ready, settings.theme, customThemes]); // eslint-disable-line react-hooks/exhaustive-deps -- applyThemeDOM is stable (reads customThemes via ref)

  const applyTheme = useCallback((name: string) => {
    applyThemeDOM(name);
  }, [applyThemeDOM]);

  const switchMode = useCallback((mode: string) => {
    setCurrentMode(mode);
    if (mode !== 'settings') setKeyboardPreviewActive(false);
    /* Применить профиль режима, если есть */
    const profile = progressRef.current.modeProfiles?.[mode];
    if (profile && Object.keys(profile).length > 0) {
      const merged = { ...settingsRef.current, ...profile };
      settingsRef.current = merged;
      setSettingsState(merged);
    }
  }, []);

  const setCurrentLayout = useCallback((layout: string) => {
    setCurrentLayoutState(layout);
    const nextSettings = { ...settingsRef.current, layout };
    setSettingsState(nextSettings);
    setProgress(prev => {
      const next = { ...prev, settings: nextSettings };
      window.api.saveProgress(next);
      return next;
    });
  }, []);

  const setCurrentLanguage = useCallback((language: string) => {
    setCurrentLanguageState(language);
    const compatibleLayouts = Object.entries(layouts.layouts)
      .filter(([, layout]) => layout.lang === language);
    const nextLayout = compatibleLayouts[0]?.[0] ?? '';
    setCurrentLayoutState(nextLayout);
    const nextSettings = { ...settingsRef.current, language, layout: nextLayout };
    setSettingsState(nextSettings);
    setProgress(prev => {
      const next = {
        ...prev,
        settings: nextSettings,
      };
      window.api.saveProgress(next);
      return next;
    });
  }, [layouts.layouts]);

  const reloadWords = useCallback(async () => {
    const baseWords = await window.api.getWords(currentLanguage);
    const merged = mergeAddonWords(baseWords, currentLanguage, installedAddonsRef.current);
    setAllWords(merged);
  }, [currentLanguage]);

  useEffect(() => {
    if (ready && currentLanguage) reloadWords();
  }, [ready, currentLanguage, reloadWords]);

  const saveSetting = useCallback(<K extends keyof UserSettings>(key: K, val: UserSettings[K]) => {
    const nextSettings = { ...settingsRef.current, [key]: val };
    setSettingsState(nextSettings);
    setProgress(prev => {
      const next = { ...prev, settings: nextSettings };
      window.api.saveProgress(next);
      return next;
    });
  }, []);

  const savePracticeSetting = useCallback(<K extends keyof PracticeSettings>(key: K, val: PracticeSettings[K]) => {
    const nextPracticeSettings = { ...practiceSettingsRef.current, [key]: val };
    setPracticeSettingsState(nextPracticeSettings);
    setProgress(prev => {
      const next = {
        ...prev,
        practiceSettings: nextPracticeSettings,
      };
      window.api.saveProgress(next);
      return next;
    });
  }, []);

  const getModePracticeSettings = useCallback((mode: ModePracticeSettingsId) => {
    return defaultModePracticeSettings(progressRef.current.modePracticeSettings?.[mode]);
  }, []);

  const saveModePracticeSettings = useCallback((mode: ModePracticeSettingsId, patch: Partial<ModePracticeSettings>) => {
    let nextModeSettings = defaultModePracticeSettings({
      ...progressRef.current.modePracticeSettings?.[mode],
      ...patch,
    });

    setProgress(prev => {
      nextModeSettings = defaultModePracticeSettings({
        ...prev.modePracticeSettings?.[mode],
        ...patch,
      });
      const next = {
        ...prev,
        modePracticeSettings: {
          ...(prev.modePracticeSettings ?? {}),
          [mode]: nextModeSettings,
        },
      };
      progressRef.current = next;
      window.api.saveProgress(next);
      return next;
    });

    return nextModeSettings;
  }, []);

  const saveProgressCb = useCallback((nextProgress: Progress) => {
    setSettingsState(resolveSettings(nextProgress));
    setPracticeSettingsState(defaultPracticeSettings(nextProgress.practiceSettings));
    setGameState(prev => stabilizeGameState(prev, resolveGameState(nextProgress)));
    setProgress(nextProgress);
    window.api.saveProgress(nextProgress);
  }, []);

  const updateMotivationProgress = useCallback((updater: (current: MotivationProgress) => MotivationProgress) => {
    let nextMotivation = normalizeMotivationProgress(progressRef.current.motivation);
    setProgress(prev => {
      const current = normalizeMotivationProgress(prev.motivation);
      nextMotivation = normalizeMotivationProgress(updater(current));
      const next = { ...prev, motivation: nextMotivation };
      progressRef.current = next;
      window.api.saveProgress(next);
      return next;
    });
    return nextMotivation;
  }, []);

  const saveCustomThemesCb = useCallback((themes: CustomThemes) => {
    customThemesRef.current = themes;
    setCustomThemes(themes);
    window.api.saveCustomThemes(themes);
  }, []);

  const {
    savePracticeInsights,
    savePracticeRhythmSession,
  } = useMemo(() => createPracticeActions({
    setProgress,
    persistProgress: window.api.saveProgress,
    currentLayout,
  }), [currentLayout]);

  const {
    saveCharStats,
    saveHistory,
  } = useMemo(() => createStatsActions({
    setProgress,
    persistProgress: window.api.saveProgress,
    currentLayout,
  }), [currentLayout]);

  const {
    saveGameState,
    grantGameItem,
    equipGameItem,
    unequipGameItem,
    wearEquippedGameItems,
    repairGameItems,
    resetGameInventory,
    resetGameProgress,
    saveCurrentGameRun,
    clearCurrentGameRun,
    markGameLevelReached,
    peekNextGameLetter,
    unlockNextGameLetter,
  } = useMemo(() => createGameActions({
    setProgress,
    setGameState,
    persistProgress: window.api.saveProgress,
    progressRef,
    gameStateRef,
    currentLayout,
    layouts,
    achievementCatalog: mergedAchievementCatalog,
  }), [currentLayout, layouts, mergedAchievementCatalog]);

  // Глобальное разблокирование достижений (все категории).
  const unlockAchievements = useCallback((achievementIds: string[]): GameAchievementDefinition[] => {
    const catalog = mergedAchievementCatalog;
    const achievementMap = Object.fromEntries(catalog.map(a => [a.id, a]));
    const current = progressRef.current.achievements ?? [];
    const knownIds = new Set(current);
    const unlocked: GameAchievementDefinition[] = [];

    for (const id of achievementIds) {
      const def = achievementMap[id];
      if (!def || knownIds.has(id)) continue;
      knownIds.add(id);
      unlocked.push(def);
    }
    if (!unlocked.length) return unlocked;

    const next = Array.from(knownIds);
    
    // Обновляем ref НЕМЕДЛЕННО перед setProgress
    const updated = { ...progressRef.current, achievements: next };
    progressRef.current = updated;
    
    // Сохраняем на диск
    window.api.saveProgress(updated);
    
    // Обновляем state СИНХРОННО чтобы избежать batch updates проблемы
    flushSync(() => {
      setProgress(() => updated);
    });
    
    return unlocked;
  }, [mergedAchievementCatalog]);

  /**
   * Разблокировать игровые достижения: пишет в game.achievements (для GamePage)
   * и синхронизирует с глобальным progress.achievements в ОДНОМ setProgress.
   */
  const unlockGameAchievements = useCallback((achievementIds: string[]): GameAchievementDefinition[] => {
    if (!achievementIds.length) return [];
    
    // Шаг 1: Получить достижения, которые должны быть разблокированы в game.achievements
    const catalog = mergedAchievementCatalog;
    const achievementMap = Object.fromEntries(catalog.map(a => [a.id, a]));
    const game = gameStateRef.current;
    
    // Если gameState не инициализирован, обновим только progress.achievements
    if (!game) {
      const currentProgressAchievements = progressRef.current.achievements ?? [];
      const knownGlobalAchievements = new Set(currentProgressAchievements);
      const unlockedGame: GameAchievementDefinition[] = [];
      
      for (const achievementId of achievementIds) {
        const achievement = achievementMap[achievementId];
        if (!achievement || knownGlobalAchievements.has(achievementId)) continue;
        knownGlobalAchievements.add(achievementId);
        unlockedGame.push(achievement);
      }
      
      if (!unlockedGame.length) return unlockedGame;
      
      const nextGlobalAchievements = Array.from(knownGlobalAchievements);
      setProgress(prev => ({
        ...prev,
        achievements: nextGlobalAchievements,
      }));
      
      return unlockedGame;
    }
    
    const knownGameAchievements = new Set(game.achievements);
    const unlockedGame: GameAchievementDefinition[] = [];

    for (const achievementId of achievementIds) {
      const achievement = achievementMap[achievementId];
      if (!achievement || knownGameAchievements.has(achievementId)) continue;
      knownGameAchievements.add(achievementId);
      unlockedGame.push(achievement);
    }

    if (!unlockedGame.length) return unlockedGame;

    // Шаг 2: Подготовить новые значения для обоих game.achievements и progress.achievements
    const nextGameAchievements = Array.from(knownGameAchievements);
    const nextGameState = {
      ...game,
      achievements: nextGameAchievements,
    };

    // Шаг 3: Синхронизировать с progress.achievements в ОДНОМ setProgress
    const unlockedIds = unlockedGame.map(a => a.id);
    const currentProgressAchievements = progressRef.current.achievements ?? [];
    const knownGlobalAchievements = new Set(currentProgressAchievements);
    for (const id of unlockedIds) {
      knownGlobalAchievements.add(id);
    }
    const nextGlobalAchievements = Array.from(knownGlobalAchievements);

    // Один setProgress вызов для обоих - обновляем ref сразу же
    const updated = {
      ...progressRef.current,
      game: nextGameState,
      achievements: nextGlobalAchievements,
    };
    progressRef.current = updated;
    gameStateRef.current = nextGameState;
    
    window.api.saveProgress(updated);
    
    // Обновляем state СИНХРОННО
    flushSync(() => {
      setProgress(() => updated);
      setGameState(() => nextGameState);
    });


    return unlockedGame;
  }, [mergedAchievementCatalog]);

  // ── Presets ──────────────────────────────────────────
  const customPresets = useMemo<CustomPresets>(() => {
    return { ...BUILT_IN_PRESETS, ...(progress.customPresets ?? {}) };
  }, [progress.customPresets]);

  const applyPreset = useCallback((presetId: string) => {
    const preset = customPresets[presetId];
    if (!preset) return;
    const nextSettings = { ...settingsRef.current, ...preset.settings };
    setSettingsState(nextSettings);
    setProgress(prev => {
      const next = { ...prev, settings: nextSettings };
      window.api.saveProgress(next);
      return next;
    });
  }, [customPresets]);

  const saveCurrentAsPreset = useCallback((name: string): string => {
    const id = `custom_${Date.now()}`;
    const preset: UserPreset = { name, settings: extractPresetSettings(settingsRef.current) };
    setProgress(prev => {
      const next = {
        ...prev,
        customPresets: { ...(prev.customPresets ?? {}), [id]: preset },
      };
      window.api.saveProgress(next);
      return next;
    });
    return id;
  }, []);

  const deletePreset = useCallback((presetId: string) => {
    setProgress(prev => {
      const { [presetId]: _, ...rest } = prev.customPresets ?? {};
      const next = { ...prev, customPresets: rest };
      window.api.saveProgress(next);
      return next;
    });
  }, []);

  const fmtSpeed = useCallback((wpm: number) => formatSpeed(wpm, settings.speedUnit), [settings.speedUnit]);
  const spdLabel = speedLabel(settings.speedUnit);

  const getPracticeStateCb = useCallback(() => getPracticeState(progressRef.current, currentLayout), [currentLayout]);
  const getLayoutProgressCb = useCallback(() => getLayoutProgress(progressRef.current, currentLayout), [currentLayout]);
  const getPracticeInsightsCb = useCallback(() => getLayoutPracticeInsights(progressRef.current, currentLayout), [currentLayout]);

  const modeProfiles = useMemo(
    () => progress.modeProfiles ?? {},
    [progress.modeProfiles],
  );

  const saveModeProfile = useCallback((mode: string) => {
    const preset = extractPresetSettings(settingsRef.current);
    setProgress(prev => {
      const next = { ...prev, modeProfiles: { ...(prev.modeProfiles ?? {}), [mode]: preset } };
      window.api.saveProgress(next);
      return next;
    });
  }, []);

  const clearModeProfile = useCallback((mode: string) => {
    setProgress(prev => {
      const profiles = { ...(prev.modeProfiles ?? {}) };
      delete profiles[mode];
      const next = { ...prev, modeProfiles: profiles };
      window.api.saveProgress(next);
      return next;
    });
  }, []);

  const exportTheme = useCallback(async (themeName: string): Promise<boolean> => {
    const colors = customThemesRef.current[themeName];
    if (!colors) return false;
    const payload: ExportPayload = { version: 1, type: 'theme', theme: { name: themeName, colors } };
    return window.api.exportFile(`theme-${themeName}.json`, JSON.stringify(payload, null, 2));
  }, []);

  const exportConfig = useCallback(async (): Promise<boolean> => {
    const p = progressRef.current;
    const payload: ExportPayload = {
      version: 1,
      type: 'full',
      settings: p.settings,
      practiceSettings: p.practiceSettings,
      modePracticeSettings: p.modePracticeSettings,
      customPresets: p.customPresets,
      customPracticePacks: p.customPracticePacks,
    };
    return window.api.exportFile('typing-trainer-config.json', JSON.stringify(payload, null, 2));
  }, []);

  const importConfig = useCallback(async (): Promise<string | null> => {
    const imported = await window.api.importFile();
    if (!imported) return null;
    try {
      const data = JSON.parse(imported.content) as ExportPayload;
      if (!data || data.version !== 1) return 'Неподдерживаемый формат файла';

      if (data.type === 'theme' && data.theme) {
        const ct = { ...customThemesRef.current, [data.theme.name]: data.theme.colors };
        saveCustomThemesCb(ct);
        applyThemeDOM(data.theme.name, ct);
        settingsRef.current = { ...settingsRef.current, theme: data.theme.name };
        setSettingsState(prev => ({ ...prev, theme: data.theme!.name }));
        setProgress(prev => {
          const next = { ...prev, settings: { ...prev.settings, theme: data.theme!.name } as UserSettings };
          window.api.saveProgress(next);
          return next;
        });
        return null;
      }

      if ((data.type === 'config' || data.type === 'full') && data.settings) {
        const merged = defaultSettings({ ...settingsRef.current, ...data.settings });
        settingsRef.current = merged;
        setSettingsState(merged);
        setProgress(prev => {
          const next: Progress = {
            ...prev,
            settings: merged,
            ...(data.practiceSettings ? { practiceSettings: defaultPracticeSettings(data.practiceSettings) } : {}),
            ...(data.modePracticeSettings ? { modePracticeSettings: data.modePracticeSettings } : {}),
            ...(data.customPresets ? { customPresets: { ...(prev.customPresets ?? {}), ...data.customPresets } } : {}),
            ...(data.customPracticePacks ? { customPracticePacks: { ...(prev.customPracticePacks ?? {}), ...data.customPracticePacks } } : {}),
          };
          window.api.saveProgress(next);
          return next;
        });
        applyThemeDOM(merged.theme);
        return null;
      }

      return 'Неизвестный тип конфигурации';
    } catch {
      return 'Ошибка чтения файла';
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Addon management ─────────────────────────────────
  const refreshAddons = useCallback(async () => {
    const addons = await window.api.scanAddons();
    setInstalledAddons(addons);
    await applyModEffects(installedModsRef.current, addons);

    // Re-merge layouts
    const baseLayouts = await window.api.getLayouts();
    const mergedLayouts = mergeAddonLayouts(baseLayouts, addons);
    setLayouts(mergedLayouts);

    // Re-merge themes
    const baseThemes = await window.api.getCustomThemes();
    const mergedThemes = mergeAddonThemes(baseThemes, addons);
    setCustomThemes(mergedThemes);
    customThemesRef.current = mergedThemes;

    const basePracticeContentPacks = await window.api.getPracticeContentPacks();
    setPracticeContentPacks(mergeAddonPracticePacks(basePracticeContentPacks, addons));

    // Re-merge words
    const baseWords = await window.api.getWords(currentLanguage);
    const mergedWords = mergeAddonWords(baseWords, currentLanguage, addons);
    setAllWords(mergedWords);
  }, [currentLanguage, applyModEffects]);

  const refreshMods = useCallback(async () => {
    const mods = await window.api.scanMods();
    setInstalledMods(mods);
    await applyModEffects(mods, installedAddonsRef.current);
  }, [applyModEffects]);

  const installAddonCb = useCallback(async (): Promise<AddonInstallResult> => {
    const result = await window.api.installAddon();
    if (result.ok) await refreshAddons();
    return result;
  }, [refreshAddons]);

  const removeAddonCb = useCallback(async (id: string): Promise<boolean> => {
    const ok = await window.api.removeAddon(id);
    if (ok) await refreshAddons();
    return ok;
  }, [refreshAddons]);

  const toggleAddonCb = useCallback(async (id: string, enabled: boolean): Promise<boolean> => {
    const ok = await window.api.toggleAddon(id, enabled);
    if (ok) await refreshAddons();
    return ok;
  }, [refreshAddons]);

  const installModCb = useCallback(async (): Promise<ModInstallResult> => {
    const result = await window.api.installMod();
    if (result.ok) await refreshMods();
    return result;
  }, [refreshMods]);

  const removeModCb = useCallback(async (id: string): Promise<boolean> => {
    const ok = await window.api.removeMod(id);
    if (ok) await refreshMods();
    return ok;
  }, [refreshMods]);

  const toggleModCb = useCallback(async (id: string, enabled: boolean): Promise<boolean> => {
    const ok = await window.api.toggleMod(id, enabled);
    if (ok) await refreshMods();
    return ok;
  }, [refreshMods]);

  // Мемоизируем unlockedAchievementIds чтобы оно пересчитывалось при изменении progress
  const unlockedAchievementIds = useMemo(() => {
    return progress.achievements ?? [];
  }, [progress.achievements]);

  const value = useMemo<AppContextValue>(() => ({
    ready,
    layouts,
    allWords,
    ngramModel,
    progress,
    motivationProgress,
    practiceInsights,
    practiceRhythmHistory,
    practiceContentPacks,
    customThemes,
    gameState,
    gameItemCatalog: mergedItemCatalog,
    gameAchievementCatalog: mergedAchievementCatalog,
    settings,
    practiceSettings,
    currentLayout,
    currentLanguage,
    currentMode,
    languages,
    layoutsForLanguage,
    switchMode,
    setCurrentLayout,
    setCurrentLanguage,
    saveSetting,
    savePracticeSetting,
    getModePracticeSettings,
    saveModePracticeSettings,
    saveProgress: saveProgressCb,
    updateMotivationProgress,
    saveCustomThemes: saveCustomThemesCb,
    applyTheme,
    reloadWords,
    customPresets,
    applyPreset,
    saveCurrentAsPreset,
    deletePreset,
    fmtSpeed,
    spdLabel,
    getLayoutProgress: getLayoutProgressCb,
    getPracticeState: getPracticeStateCb,
    getPracticeInsights: getPracticeInsightsCb,
    savePracticeInsights,
    savePracticeRhythmSession,
    saveCharStats,
    saveHistory,
    saveGameState,
    grantGameItem,
    equipGameItem,
    unequipGameItem,
    repairGameItems,
    wearEquippedGameItems,
    resetGameInventory,
    resetGameProgress,
    markGameLevelReached,
    peekNextGameLetter,
    unlockNextGameLetter,
    unlockGameAchievements,
    unlockedAchievementIds,
    unlockAchievements,
    saveCurrentGameRun,
    clearCurrentGameRun,
    exportTheme,
    exportConfig,
    importConfig,
    modeProfiles,
    saveModeProfile,
    clearModeProfile,
    installedAddons,
    installAddon: installAddonCb,
    removeAddon: removeAddonCb,
    toggleAddon: toggleAddonCb,
    refreshAddons,
    installedMods,
    installMod: installModCb,
    removeMod: removeModCb,
    toggleMod: toggleModCb,
    refreshMods,
    disabledSections,
    modRuleOverrides,
    modSettingOverrides,
    modCssSnippets,
    modPanels,
    modModes,
  }), [
    ready,
    layouts,
    allWords,
    ngramModel,
    progress,
    motivationProgress,
    practiceInsights,
    practiceRhythmHistory,
    practiceContentPacks,
    customThemes,
    gameState,
    mergedItemCatalog,
    mergedAchievementCatalog,
    settings,
    practiceSettings,
    currentLayout,
    currentLanguage,
    currentMode,
    languages,
    layoutsForLanguage,
    switchMode,
    setCurrentLayout,
    setCurrentLanguage,
    saveSetting,
    savePracticeSetting,
    getModePracticeSettings,
    saveModePracticeSettings,
    saveProgressCb,
    updateMotivationProgress,
    saveCustomThemesCb,
    applyTheme,
    reloadWords,
    customPresets,
    applyPreset,
    saveCurrentAsPreset,
    deletePreset,
    fmtSpeed,
    spdLabel,
    getLayoutProgressCb,
    getPracticeStateCb,
    getPracticeInsightsCb,
    savePracticeInsights,
    savePracticeRhythmSession,
    saveCharStats,
    saveHistory,
    saveGameState,
    grantGameItem,
    equipGameItem,
    unequipGameItem,
    repairGameItems,
    wearEquippedGameItems,
    resetGameInventory,
    resetGameProgress,
    markGameLevelReached,
    peekNextGameLetter,
    unlockNextGameLetter,
    unlockGameAchievements,
    unlockedAchievementIds,
    unlockAchievements,
    saveCurrentGameRun,
    clearCurrentGameRun,
    exportTheme,
    exportConfig,
    importConfig,
    modeProfiles,
    saveModeProfile,
    clearModeProfile,
    installedAddons,
    installAddonCb,
    removeAddonCb,
    toggleAddonCb,
    refreshAddons,
    installedMods,
    installModCb,
    removeModCb,
    toggleModCb,
    refreshMods,
    disabledSections,
    modRuleOverrides,
    modSettingOverrides,
    modCssSnippets,
    modPanels,
    modModes,
  ]);

  const uiValue = useMemo<AppUiContextValue>(() => ({
    activeChar,
    setActiveChar,
    keyboardPreviewActive,
    setKeyboardPreviewActive,
  }), [activeChar, keyboardPreviewActive]);

  return (
    <AppContext.Provider value={value}>
      <AppUiContext.Provider value={uiValue}>{children}</AppUiContext.Provider>
    </AppContext.Provider>
  );
}
