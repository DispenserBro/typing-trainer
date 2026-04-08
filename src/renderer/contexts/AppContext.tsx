import {
  createContext, useContext, useState, useCallback, useEffect, useRef, useMemo,
  type ReactNode,
} from 'react';
import type {
  LayoutsData, Layout, Progress, CustomThemes, Session, CharStat,
  UserSettings, PracticeSettings, PracticeState, LayoutProgressState,
  LanguageInfo, GameState, GameItemDefinition,
  GameEquipmentSlot, GameRunState, GameAchievementDefinition,
  PracticeInsightsState, LayoutPracticeInsights, PracticeRhythmSessionEntry,
  PracticeTrainingMode,
} from '../../shared/types';
import {
  createSession, formatSpeed, speedLabel,
  buildNgramModel, type NgramModel,
} from '../../core/engine';
import { GAME_ITEM_CATALOG } from '../../core/game/items';
import { GAME_ACHIEVEMENT_CATALOG } from '../../core/game/gameAchievements';
import {
  BUILT_IN_THEMES,
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

export { BUILT_IN_THEMES } from './appDefaults';

export interface AppContextValue {
  ready: boolean;
  layouts: LayoutsData;
  allWords: string[];
  ngramModel: NgramModel | null;
  progress: Progress;
  practiceInsights: PracticeInsightsState;
  practiceRhythmHistory: Record<string, PracticeRhythmSessionEntry[]>;
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

  session: Session;
  setSession: (s: Session) => void;
  activeChar: string | undefined;
  setActiveChar: (ch: string | undefined) => void;
  keyboardPreviewActive: boolean;
  setKeyboardPreviewActive: (active: boolean) => void;

  switchMode: (mode: string) => void;
  setCurrentLayout: (layout: string) => void;
  setCurrentLanguage: (lang: string) => void;
  saveSetting: <K extends keyof UserSettings>(key: K, val: UserSettings[K]) => void;
  savePracticeSetting: <K extends keyof PracticeSettings>(key: K, val: PracticeSettings[K]) => void;
  saveProgress: (p: Progress) => void;
  saveCustomThemes: (t: CustomThemes) => void;
  applyTheme: (name: string) => void;
  reloadWords: () => Promise<void>;

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
    extras?: { trainingMode?: PracticeTrainingMode; charStats?: Record<string, CharStat> },
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
  saveCurrentGameRun: (run: GameRunState | null) => void;
  clearCurrentGameRun: (destroyItems?: boolean) => void;
}

const AppContext = createContext<AppContextValue>(null!);
export const useApp = () => useContext(AppContext);

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

  if (
    prev.highestLevel === next.highestLevel
    && isInventoryEqual(prev.inventory, next.inventory)
    && isStringListEqual(prev.discoveredItemIds, next.discoveredItemIds)
    && isStringListEqual(prev.achievements, next.achievements)
    && isEquipmentEqual(prev.equipped, next.equipped)
    && isGameRunEqual(prev.currentRun, next.currentRun)
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
  const [settingsState, setSettingsState] = useState<UserSettings>(() => resolveSettings({}));
  const [practiceSettingsState, setPracticeSettingsState] = useState<PracticeSettings>(() => defaultPracticeSettings());
  const [gameState, setGameState] = useState<GameState>(() => resolveGameState({}));
  const [currentLayout, setCurrentLayoutState] = useState('');
  const [currentLanguage, setCurrentLanguageState] = useState('');
  const [currentMode, setCurrentMode] = useState('practice');
  const [session, setSession] = useState<Session>(createSession('', '', -1));
  const [activeChar, setActiveChar] = useState<string | undefined>(undefined);
  const [keyboardPreviewActive, setKeyboardPreviewActive] = useState(false);

  const progressRef = useRef(progress);
  progressRef.current = progress;

  const settingsRef = useRef(settingsState);
  settingsRef.current = settingsState;

  const practiceSettingsRef = useRef(practiceSettingsState);
  practiceSettingsRef.current = practiceSettingsState;

  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;

  const settings = settingsState;
  const practiceSettings = practiceSettingsState;
  const practiceInsights = resolvePracticeInsights(progress);
  const practiceRhythmHistory = resolvePracticeRhythmHistory(progress);
  const layoutsForLanguage = useMemo<[string, Layout][]>(() => {
    if (!currentLanguage) return [];
    return Object.entries(layouts.layouts).filter(([, layout]) => layout.lang === currentLanguage);
  }, [layouts.layouts, currentLanguage]);

  const languages = layouts.languages ?? [];

  const customThemesRef = useRef(customThemes);
  customThemesRef.current = customThemes;

  const applyThemeDOM = useCallback((name: string, themesOverride?: CustomThemes) => {
    const themes = themesOverride ?? customThemesRef.current;
    if (BUILT_IN_THEMES.includes(name)) {
      document.body.setAttribute('data-theme', name);
      const root = document.documentElement.style;
      ['--bg', '--surface', '--surface2', '--surface3', '--text', '--text-dim', '--subtext',
        '--accent', '--accent-hover', '--accent-dim', '--green', '--red', '--yellow']
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
    }
  }, []);

  useEffect(() => {
    (async () => {
      const [loadedLayouts, loadedProgress, loadedThemes] = await Promise.all([
        window.api.getLayouts(),
        window.api.getProgress(),
        window.api.getCustomThemes(),
      ]);

      const normalizedProgress = {
        ...loadedProgress,
        game: resolveGameState(loadedProgress),
      };
      const normalizedGameState = stabilizeGameState(gameStateRef.current, normalizedProgress.game);
      const normalizedSettings = resolveSettings(normalizedProgress);
      const normalizedPracticeSettings = defaultPracticeSettings(normalizedProgress.practiceSettings);

      setLayouts(loadedLayouts);
      setProgress(normalizedProgress);
      setSettingsState(normalizedSettings);
      setPracticeSettingsState(normalizedPracticeSettings);
      setGameState(normalizedGameState);
      setCustomThemes(loadedThemes);

      let nextLanguage = normalizedSettings.language;
      if (!nextLanguage || !(loadedLayouts.languages ?? []).some((language: LanguageInfo) => language.id === nextLanguage)) {
        nextLanguage = loadedLayouts.languages?.[0]?.id ?? 'en';
      }
      setCurrentLanguageState(nextLanguage);

      let nextLayout = normalizedSettings.layout;
      const compatibleLayouts = Object.entries(loadedLayouts.layouts)
        .filter(([, layout]) => layout.lang === nextLanguage);
      if (!nextLayout || !loadedLayouts.layouts[nextLayout] || loadedLayouts.layouts[nextLayout].lang !== nextLanguage) {
        nextLayout = compatibleLayouts[0]?.[0] ?? Object.keys(loadedLayouts.layouts)[0] ?? '';
      }
      setCurrentLayoutState(nextLayout);

      const words = await window.api.getWords(nextLanguage);
      setAllWords(words);

      void window.api.saveProgress(normalizedProgress);

      applyThemeDOM(normalizedSettings.theme ?? 'dark-orange', loadedThemes);
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
    setSession(prev => {
      if (prev.active && prev.timer) clearInterval(prev.timer);
      return { ...prev, active: false, timer: null };
    });
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
    const words = await window.api.getWords(currentLanguage);
    setAllWords(words);
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

  const saveProgressCb = useCallback((nextProgress: Progress) => {
    setSettingsState(resolveSettings(nextProgress));
    setPracticeSettingsState(defaultPracticeSettings(nextProgress.practiceSettings));
    setGameState(prev => stabilizeGameState(prev, resolveGameState(nextProgress)));
    setProgress(nextProgress);
    window.api.saveProgress(nextProgress);
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
    unlockGameAchievements,
  } = useMemo(() => createGameActions({
    setProgress,
    setGameState,
    persistProgress: window.api.saveProgress,
    progressRef,
    gameStateRef,
    currentLayout,
    layouts,
  }), [currentLayout, layouts]);

  const fmtSpeed = useCallback((wpm: number) => formatSpeed(wpm, settings.speedUnit), [settings.speedUnit]);
  const spdLabel = speedLabel(settings.speedUnit);

  const getPracticeStateCb = useCallback(() => getPracticeState(progressRef.current, currentLayout), [currentLayout]);
  const getLayoutProgressCb = useCallback(() => getLayoutProgress(progressRef.current, currentLayout), [currentLayout]);
  const getPracticeInsightsCb = useCallback(() => getLayoutPracticeInsights(progressRef.current, currentLayout), [currentLayout]);

  const value: AppContextValue = {
    ready,
    layouts,
    allWords,
    ngramModel,
      progress,
      practiceInsights,
      practiceRhythmHistory,
      customThemes,
    gameState,
    gameItemCatalog: GAME_ITEM_CATALOG,
    gameAchievementCatalog: GAME_ACHIEVEMENT_CATALOG,
    settings,
    practiceSettings,
    currentLayout,
    currentLanguage,
    currentMode,
    languages,
    layoutsForLanguage,
    session,
    setSession,
    activeChar,
    setActiveChar,
    keyboardPreviewActive,
    setKeyboardPreviewActive,
    switchMode,
    setCurrentLayout,
    setCurrentLanguage,
    saveSetting,
    savePracticeSetting,
    saveProgress: saveProgressCb,
    saveCustomThemes: saveCustomThemesCb,
    applyTheme,
    reloadWords,
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
    saveCurrentGameRun,
    clearCurrentGameRun,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}



