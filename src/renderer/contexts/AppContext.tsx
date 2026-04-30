import {
  createContext, useContext, useState, useCallback, useEffect, useRef, useMemo,
  type ReactNode,
} from 'react';
import type {
  LayoutsData, Layout, Progress, CustomThemes, CustomPresets, CharStat,
  UserSettings, PracticeSettings, PresetSettings, PracticeState, LayoutProgressState,
  LanguageInfo, GameState, GameItemDefinition,
  GameEquipmentSlot, GameRunState, GameAchievementDefinition,
  PracticeInsightsState, LayoutPracticeInsights, PracticeRhythmSessionEntry, PracticeContentPack,
  MotivationProgress,
  ModeGuideStatus,
  ModePracticeSettings, ModePracticeSettingsId, PracticeContentMode, PracticeTrainingMode, PracticeContentScenarioId, InstalledAddon, InstalledMod, InstalledExtensionSource, AddonInstallResult, ModInstallResult, ExtensionCatalogEntry, ExtensionCatalogInstallResult, ExtensionCatalogKind, ExtensionSourceInput, ExtensionSourceInstallResult, ExtensionSourceSyncResult, ImportedInterfaceLocaleDefinition,
  InterfaceLocaleDefinition,
  InstalledTheme, ThemeDefinitions, ThemeInstallResult,
} from '../../shared/types';
import {
  formatSpeed, speedLabel,
  buildNgramModel, type NgramModel,
} from '../../core/engine';
import { GAME_ITEM_CATALOG } from '../../core/game/items';
import { GAME_ACHIEVEMENT_CATALOG } from '../../core/game/gameAchievements';
import {
  BUILT_IN_THEMES,
  defaultModePracticeSettings,
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
import { createAchievementActions } from './appAchievementActions';
import { commitProgressUpdate } from './progressUpdate';
import { replaceResolvedProgressState, resolveLoadedProgressState } from './appProgressState';
import type { ModModeDefinition, ModPanel } from '../../core/addons/modApi';
import { normalizeMotivationProgress } from '../../core/motivation/progress';
import { importInterfaceLocaleFromPo } from '../../core/i18n';
import { applyThemeDom } from './appThemeDom';
import {
  isInterfaceLocaleAvailableOutsideImports,
  removeImportedInterfaceLocaleFromProgress,
  resolveImportedInterfaceLocales,
} from './appInterfaceLocaleState';
import {
  addCurrentSettingsPreset,
  applyPresetToSettings,
  deleteCustomPreset,
  resolveCustomPresets,
} from './appPresetState';
import {
  clearModeProfileFromProgress,
  resolveModeProfiles,
  saveModeProfileToProgress,
} from './appModeProfileState';
import {
  CONFIG_EXPORT_FILENAME,
  applyImportedConfigProgress,
  buildConfigExportPayload,
  buildThemeExportPayload,
  getThemeExportFilename,
  parseConfigImport,
} from './appConfigTransfer';
import { resolveCurrentLanguageLayoutState } from './appLanguageLayoutState';
import { loadMergedWords } from './appWordsState';
import {
  loadMergedAddonResourceState,
} from './appAddonResourceState';
import { buildAvailableThemeDefinitions } from './appThemeRegistry';
import {
  applyModLessonEffects,
  applyModWordEffects,
  hasModLessonEffects,
  hasModWordEffects,
  resolveModEffectState,
} from './appModEffectState';
import { loadInitialAppBootstrapState } from './appBootstrapState';
import { createExtensionLifecycleActions } from './appExtensionLifecycleActions';

export { BUILT_IN_THEMES } from './appDefaults';

export type SaveHistory = (
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

export interface AppUiContextValue {
  activeChar: string | undefined;
  setActiveChar: (ch: string | undefined) => void;
  keyboardPreviewActive: boolean;
  setKeyboardPreviewActive: (active: boolean) => void;
}

export interface AppNavigationContextValue {
  ready: boolean;
  currentMode: string;
  switchMode: (mode: string) => void;
  disabledSections: string[];
  modCssSnippets: string[];
  modPanels: ModPanel[];
  modModes: ModModeDefinition[];
}

export interface AppPracticeContextValue {
  layouts: LayoutsData;
  allWords: string[];
  ngramModel: NgramModel | null;
  progress: Progress;
  motivationProgress: MotivationProgress;
  practiceInsights: PracticeInsightsState;
  practiceRhythmHistory: Record<string, PracticeRhythmSessionEntry[]>;
  practiceContentPacks: PracticeContentPack[];
  gameAchievementCatalog: GameAchievementDefinition[];
  unlockedAchievementIds: string[];
  fmtSpeed: (wpm: number) => string;
  spdLabel: string;
  switchMode: (mode: string) => void;
  saveProgress: (p: Progress) => void;
  markModeGuideSeen: (mode: string, status: ModeGuideStatus) => void;
  updateMotivationProgress: (updater: (current: MotivationProgress) => MotivationProgress) => MotivationProgress;
  getLayoutProgress: () => LayoutProgressState;
  getPracticeState: () => PracticeState;
  getPracticeInsights: () => LayoutPracticeInsights;
  savePracticeInsights: (insights: LayoutPracticeInsights) => void;
  savePracticeRhythmSession: (entry: Omit<PracticeRhythmSessionEntry, 'id' | 'date'> & { id?: string; date?: string }) => void;
  saveCharStats: (cs: Record<string, CharStat>) => void;
  saveHistory: SaveHistory;
  unlockAchievements: (achievementIds: string[]) => GameAchievementDefinition[];
}

export interface AppStatsContextValue {
  layouts: LayoutsData;
  progress: Progress;
  practiceInsights: PracticeInsightsState;
  practiceRhythmHistory: Record<string, PracticeRhythmSessionEntry[]>;
}

export interface AppGameContextValue {
  layouts: LayoutsData;
  allWords: string[];
  ngramModel: NgramModel | null;
  progress: Progress;
  motivationProgress: MotivationProgress;
  gameState: GameState;
  gameItemCatalog: GameItemDefinition[];
  gameAchievementCatalog: GameAchievementDefinition[];
  unlockedAchievementIds: string[];
  fmtSpeed: (wpm: number) => string;
  spdLabel: string;
  getLayoutProgress: () => LayoutProgressState;
  saveHistory: SaveHistory;
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
  updateMotivationProgress: (updater: (current: MotivationProgress) => MotivationProgress) => MotivationProgress;
  modRuleOverrides: Map<string, unknown>;
}

export interface AppExtensionsContextValue {
  extensionSources: InstalledExtensionSource[];
  extensionCatalogEntries: ExtensionCatalogEntry[];
  installExtensionSource: (input: ExtensionSourceInput) => Promise<ExtensionSourceInstallResult>;
  installExtensionCatalogEntry: (sourceId: string, kind: ExtensionCatalogKind, entryId: string) => Promise<ExtensionCatalogInstallResult>;
  updateExtensionSource: (sourceId: string, input: ExtensionSourceInput) => Promise<ExtensionSourceInstallResult>;
  removeExtensionSource: (id: string) => Promise<boolean>;
  toggleExtensionSource: (id: string, enabled: boolean) => Promise<boolean>;
  syncExtensionSource: (id: string) => Promise<ExtensionSourceSyncResult>;
  refreshSources: () => Promise<void>;
  refreshCatalog: () => Promise<void>;
  installedAddons: InstalledAddon[];
  installAddon: () => Promise<AddonInstallResult>;
  removeAddon: (id: string) => Promise<boolean>;
  toggleAddon: (id: string, enabled: boolean) => Promise<boolean>;
  refreshAddons: () => Promise<void>;
  installedMods: InstalledMod[];
  modInterfaceLocales: InterfaceLocaleDefinition[];
  installMod: () => Promise<ModInstallResult>;
  removeMod: (id: string) => Promise<boolean>;
  toggleMod: (id: string, enabled: boolean) => Promise<boolean>;
  refreshMods: () => Promise<void>;
  installedThemes: InstalledTheme[];
  installTheme: () => Promise<ThemeInstallResult>;
  removeTheme: (themeId: string) => Promise<boolean>;
  refreshThemes: () => Promise<void>;
}

export interface AppSettingsContextValue {
  settings: UserSettings;
  practiceSettings: PracticeSettings;
  importedInterfaceLocales: Record<string, ImportedInterfaceLocaleDefinition>;
  interfaceLanguage: string;
  currentLayout: string;
  currentLanguage: string;
  languages: LanguageInfo[];
  layoutsForLanguage: [string, Layout][];
  setCurrentLayout: (layout: string) => void;
  setCurrentLanguage: (lang: string) => void;
  saveSetting: <K extends keyof UserSettings>(key: K, val: UserSettings[K]) => void;
  savePracticeSetting: <K extends keyof PracticeSettings>(key: K, val: PracticeSettings[K]) => void;
  getModePracticeSettings: (mode: ModePracticeSettingsId) => ModePracticeSettings;
  saveModePracticeSettings: (mode: ModePracticeSettingsId, patch: Partial<ModePracticeSettings>) => ModePracticeSettings;
  customThemes: CustomThemes;
  availableThemes: ThemeDefinitions;
  installedThemes: InstalledTheme[];
  saveCustomThemes: (themes: CustomThemes) => void;
  applyTheme: (name: string) => void;
  installTheme: () => Promise<ThemeInstallResult>;
  removeTheme: (themeId: string) => Promise<boolean>;
  exportTheme: (themeName: string) => Promise<boolean>;
  customPresets: CustomPresets;
  applyPreset: (presetId: string) => void;
  saveCurrentAsPreset: (name: string) => string;
  deletePreset: (presetId: string) => void;
  exportConfig: () => Promise<boolean>;
  importConfig: () => Promise<string | null>;
  importInterfaceLocale: () => Promise<string | null>;
  removeImportedInterfaceLocale: (localeId: string) => void;
  modeProfiles: Partial<Record<string, Partial<PresetSettings>>>;
  saveModeProfile: (mode: string) => void;
  clearModeProfile: (mode: string) => void;
}

const AppUiContext = createContext<AppUiContextValue>(null!);
const AppPracticeContext = createContext<AppPracticeContextValue>(null!);
const AppStatsContext = createContext<AppStatsContextValue>(null!);
const AppGameContext = createContext<AppGameContextValue>(null!);
const AppExtensionsContext = createContext<AppExtensionsContextValue>(null!);
const AppSettingsContext = createContext<AppSettingsContextValue>(null!);
const AppNavigationContext = createContext<AppNavigationContextValue>(null!);
export const useAppUi = () => useContext(AppUiContext);
export const useAppPractice = () => useContext(AppPracticeContext);
export const useAppStats = () => useContext(AppStatsContext);
export const useAppGame = () => useContext(AppGameContext);
export const useAppExtensions = () => useContext(AppExtensionsContext);
export const useAppSettings = () => useContext(AppSettingsContext);
export const useAppNavigation = () => useContext(AppNavigationContext);

function isStringListEqual(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }
  return true;
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
  const [installedThemes, setInstalledThemes] = useState<InstalledTheme[]>([]);
  const [practiceContentPacks, setPracticeContentPacks] = useState<PracticeContentPack[]>([]);
  const [settingsState, setSettingsState] = useState<UserSettings>(() => resolveSettings({}));
  const [practiceSettingsState, setPracticeSettingsState] = useState<PracticeSettings>(() => defaultPracticeSettings());
  const [gameState, setGameState] = useState<GameState>(() => resolveGameState({}));
  const [currentLayout, setCurrentLayoutState] = useState('');
  const [currentLanguage, setCurrentLanguageState] = useState('');
  const [currentMode, setCurrentMode] = useState('home');
  const [activeChar, setActiveChar] = useState<string | undefined>(undefined);
  const [keyboardPreviewActive, setKeyboardPreviewActive] = useState(false);
  const [extensionSources, setExtensionSources] = useState<InstalledExtensionSource[]>([]);
  const [extensionCatalogEntries, setExtensionCatalogEntries] = useState<ExtensionCatalogEntry[]>([]);
  const [installedAddons, setInstalledAddons] = useState<InstalledAddon[]>([]);
  const [installedMods, setInstalledMods] = useState<InstalledMod[]>([]);
  const [modInterfaceLocales, setModInterfaceLocales] = useState<InterfaceLocaleDefinition[]>([]);
  const [mergedItemCatalog, setMergedItemCatalog] = useState<GameItemDefinition[]>(GAME_ITEM_CATALOG);
  const [mergedAchievementCatalog, setMergedAchievementCatalog] = useState<GameAchievementDefinition[]>(GAME_ACHIEVEMENT_CATALOG);
  const [disabledSections, setDisabledSections] = useState<string[]>([]);
  const [modRuleOverrides, setModRuleOverrides] = useState<Map<string, unknown>>(new Map());
  const [modSettingOverrides, setModSettingOverrides] = useState<Map<string, unknown>>(new Map());
  const [modCssSnippets, setModCssSnippets] = useState<string[]>([]);
  const [modPanels, setModPanels] = useState<ModPanel[]>([]);
  const [modModes, setModModes] = useState<ModModeDefinition[]>([]);

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

  const installedThemesRef = useRef(installedThemes);
  installedThemesRef.current = installedThemes;

  const installedAddonsRef = useRef(installedAddons);
  installedAddonsRef.current = installedAddons;

  const installedModsRef = useRef(installedMods);
  installedModsRef.current = installedMods;

  const modInterfaceLocalesRef = useRef(modInterfaceLocales);
  modInterfaceLocalesRef.current = modInterfaceLocales;

  const availableThemes = useMemo(
    () => buildAvailableThemeDefinitions({
      customThemes,
      addons: installedAddons,
      installedThemes,
    }),
    [customThemes, installedAddons, installedThemes],
  );

  const availableThemesRef = useRef<ThemeDefinitions>(availableThemes);
  availableThemesRef.current = availableThemes;

  const applyThemeDOM = useCallback((name: string, themesOverride?: ThemeDefinitions) => {
    applyThemeDom(name, themesOverride ?? availableThemesRef.current);
  }, []);

  /** Run all mod scripts and merge their effects into app state */
  const applyModEffects = useCallback(async (mods: InstalledMod[], addons: InstalledAddon[]) => {
    const modEffects = await resolveModEffectState({
      mods,
      addons,
      settings: settingsRef.current,
      words: allWordsRef.current,
      layouts: layoutsRef.current,
      readModScript: (modId) => window.api.readModScript(modId),
      readModLocaleResources: (modId) => window.api.readModLocaleResources(modId),
    });

    if (modEffects.errors.length > 0) {
      for (const error of modEffects.errors) console.error(`[Mod:${error.modId}] ${error.error}`);
    }

    if (hasModWordEffects(modEffects.state)) {
      setAllWords(prev => applyModWordEffects(prev, modEffects.state));
    }

    if (hasModLessonEffects(modEffects.state)) {
      setLayouts(prev => applyModLessonEffects(prev, modEffects.state));
    }

    setMergedItemCatalog(modEffects.itemCatalog);
    setMergedAchievementCatalog(modEffects.achievementCatalog);
    setDisabledSections(modEffects.disabledSections);
    setModRuleOverrides(modEffects.ruleOverrides);
    setModSettingOverrides(modEffects.settingOverrides);
    setModCssSnippets(modEffects.cssSnippets);
    setModPanels(modEffects.panels);
    setModModes(modEffects.modes);
    setModInterfaceLocales(modEffects.interfaceLocales);
  }, []);

  useEffect(() => {
    (async () => {
      const bootstrap = await loadInitialAppBootstrapState({
        previousGameState: gameStateRef.current,
        readLayouts: () => window.api.getLayouts(),
        readProgress: () => window.api.getProgress(),
        readThemes: () => window.api.getCustomThemes(),
        readPracticeContentPacks: () => window.api.getPracticeContentPacks(),
        readAddons: () => window.api.scanAddons(),
        readMods: () => window.api.scanMods(),
        readInstalledThemes: () => window.api.scanThemes(),
        readWords: window.api.getWords,
      });

      setExtensionSources(await window.api.scanExtensionSources());
      setExtensionCatalogEntries(await window.api.scanExtensionCatalog());
      setInstalledAddons(bootstrap.addons);
      setInstalledMods(bootstrap.mods);
      setInstalledThemes(bootstrap.themes);
      await applyModEffects(bootstrap.mods, bootstrap.addons);

      setLayouts(bootstrap.resources.layouts);
      setPracticeContentPacks(bootstrap.resources.practiceContentPacks);
      setProgress(bootstrap.progressState.nextProgress);
      setSettingsState(bootstrap.progressState.settings);
      setPracticeSettingsState(bootstrap.progressState.practiceSettings);
      setGameState(bootstrap.progressState.gameState);
      setCustomThemes(bootstrap.customThemes);
      setCurrentLanguageState(bootstrap.currentSelection.language);
      setCurrentLayoutState(bootstrap.currentSelection.layout);
      setAllWords(bootstrap.words);

      void window.api.saveProgress(bootstrap.progressState.nextProgress);

      applyThemeDOM(
        bootstrap.progressState.settings.theme ?? 'dark-orange',
        buildAvailableThemeDefinitions({
          customThemes: bootstrap.customThemes,
          addons: bootstrap.addons,
          installedThemes: bootstrap.themes,
        }),
      );
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
  }, [ready, settings.theme, availableThemes]); // eslint-disable-line react-hooks/exhaustive-deps -- applyThemeDOM is stable (reads available themes via ref)

  const syncCurrentLanguageAndLayout = useCallback((nextSettings: UserSettings) => {
    const currentSelection = resolveCurrentLanguageLayoutState(nextSettings, layoutsRef.current);
    setCurrentLanguageState(prev => (prev === currentSelection.language ? prev : currentSelection.language));
    setCurrentLayoutState(prev => (prev === currentSelection.layout ? prev : currentSelection.layout));
  }, []);

  const replaceResolvedProgress = useCallback((nextProgress: Progress) => {
    const resolved = replaceResolvedProgressState({
      nextProgress,
      setProgress,
      setSettingsState,
      setPracticeSettingsState,
      setGameState,
      persistProgress: window.api.saveProgress,
      progressRef,
      settingsRef,
      practiceSettingsRef,
      gameStateRef,
    });
    syncCurrentLanguageAndLayout(resolved.settings);
    return resolved.nextProgress;
  }, [syncCurrentLanguageAndLayout]);

  const commitResolvedProgress = useCallback((updater: (prev: Progress) => Progress) => {
    const nextProgress = updater(progressRef.current);
    if (nextProgress === progressRef.current) return nextProgress;
    return replaceResolvedProgress(nextProgress);
  }, [replaceResolvedProgress]);

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
    const nextSettings = { ...settingsRef.current, layout };
    commitResolvedProgress(prev => ({ ...prev, settings: nextSettings }));
  }, [commitResolvedProgress]);

  const setCurrentLanguage = useCallback((language: string) => {
    const compatibleLayouts = Object.entries(layoutsRef.current.layouts)
      .filter(([, layout]) => layout.lang === language);
    const nextLayout = compatibleLayouts[0]?.[0] ?? '';
    const nextSettings = { ...settingsRef.current, language, layout: nextLayout };
    commitResolvedProgress(prev => ({ ...prev, settings: nextSettings }));
  }, [commitResolvedProgress]);

  const reloadWords = useCallback(async () => {
    setAllWords(await loadMergedWords(currentLanguage, installedAddonsRef.current, window.api.getWords));
  }, [currentLanguage]);

  useEffect(() => {
    if (ready && currentLanguage) reloadWords();
  }, [ready, currentLanguage, reloadWords]);

  const saveSetting = useCallback(<K extends keyof UserSettings>(key: K, val: UserSettings[K]) => {
    if (settingsRef.current[key] === val) return;
    const nextSettings = { ...settingsRef.current, [key]: val };
    commitResolvedProgress(prev => ({ ...prev, settings: nextSettings }));
  }, [commitResolvedProgress]);

  const savePracticeSetting = useCallback(<K extends keyof PracticeSettings>(key: K, val: PracticeSettings[K]) => {
    if (practiceSettingsRef.current[key] === val) return;
    const nextPracticeSettings = { ...practiceSettingsRef.current, [key]: val };
    commitResolvedProgress(prev => ({
      ...prev,
      practiceSettings: nextPracticeSettings,
    }));
  }, [commitResolvedProgress]);

  const getModePracticeSettings = useCallback((mode: ModePracticeSettingsId) => {
    return defaultModePracticeSettings(progressRef.current.modePracticeSettings?.[mode]);
  }, []);

  const saveModePracticeSettings = useCallback((mode: ModePracticeSettingsId, patch: Partial<ModePracticeSettings>) => {
    let nextModeSettings = defaultModePracticeSettings({
      ...progressRef.current.modePracticeSettings?.[mode],
      ...patch,
    });

    commitResolvedProgress(prev => {
      nextModeSettings = defaultModePracticeSettings({
        ...prev.modePracticeSettings?.[mode],
        ...patch,
      });
      return {
        ...prev,
        modePracticeSettings: {
          ...(prev.modePracticeSettings ?? {}),
          [mode]: nextModeSettings,
        },
      };
    });

    return nextModeSettings;
  }, [commitResolvedProgress]);

  const saveProgressCb = useCallback((nextProgress: Progress) => {
    replaceResolvedProgress(nextProgress);
  }, [replaceResolvedProgress]);

  const updateMotivationProgress = useCallback((updater: (current: MotivationProgress) => MotivationProgress) => {
    let nextMotivation = normalizeMotivationProgress(progressRef.current.motivation);
    commitResolvedProgress(prev => {
      const current = normalizeMotivationProgress(prev.motivation);
      nextMotivation = normalizeMotivationProgress(updater(current));
      return { ...prev, motivation: nextMotivation };
    });
    return nextMotivation;
  }, [commitResolvedProgress]);

  const saveCustomThemesCb = useCallback((themes: CustomThemes) => {
    customThemesRef.current = themes;
    setCustomThemes(themes);
    window.api.saveCustomThemes(themes);
  }, []);

  const commitProgress = useCallback((updater: (prev: Progress) => Progress) => {
    commitProgressUpdate({
      setProgress,
      progressRef,
      persistProgress: window.api.saveProgress,
      updater,
    });
  }, []);

  const markModeGuideSeen = useCallback((mode: string, status: ModeGuideStatus) => {
    if (!mode) return;
    commitProgress(prev => {
      if (prev.onboarding?.modeGuides?.[mode] === status) return prev;
      return {
        ...prev,
        onboarding: {
          ...(prev.onboarding ?? {}),
          modeGuides: {
            ...(prev.onboarding?.modeGuides ?? {}),
            [mode]: status,
          },
        },
      };
    });
  }, [commitProgress]);

  const {
    savePracticeInsights,
    savePracticeRhythmSession,
  } = useMemo(() => createPracticeActions({
    commitProgress,
    currentLayout,
  }), [commitProgress, currentLayout]);

  const {
    saveCharStats,
    saveHistory,
  } = useMemo(() => createStatsActions({
    commitProgress,
    currentLayout,
  }), [commitProgress, currentLayout]);

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

  const {
    unlockAchievements,
    unlockGameAchievements,
  } = useMemo(() => createAchievementActions({
    setProgress,
    setGameState,
    persistProgress: window.api.saveProgress,
    progressRef,
    gameStateRef,
    achievementCatalog: mergedAchievementCatalog,
  }), [mergedAchievementCatalog]);

  // ── Presets ──────────────────────────────────────────
  const customPresets = useMemo<CustomPresets>(() => {
    return resolveCustomPresets(progress.customPresets);
  }, [progress.customPresets]);

  const importedInterfaceLocales = useMemo<Record<string, ImportedInterfaceLocaleDefinition>>(
    () => resolveImportedInterfaceLocales(progress),
    [progress.importedInterfaceLocales],
  );

  const applyPreset = useCallback((presetId: string) => {
    const preset = customPresets[presetId];
    if (!preset) return;
    const nextSettings = applyPresetToSettings(settingsRef.current, preset);
    commitResolvedProgress(prev => ({ ...prev, settings: nextSettings }));
  }, [commitResolvedProgress, customPresets]);

  const saveCurrentAsPreset = useCallback((name: string): string => {
    let nextId = '';
    commitProgress(prev => {
      const next = addCurrentSettingsPreset(prev, settingsRef.current, name);
      nextId = next.id;
      return next.progress;
    });
    return nextId;
  }, [commitProgress]);

  const deletePreset = useCallback((presetId: string) => {
    commitProgress(prev => deleteCustomPreset(prev, presetId));
  }, [commitProgress]);

  const fmtSpeed = useCallback((wpm: number) => formatSpeed(wpm, settings.speedUnit), [settings.speedUnit]);
  const spdLabel = speedLabel(settings.speedUnit);

  const getPracticeStateCb = useCallback(() => getPracticeState(progressRef.current, currentLayout), [currentLayout]);
  const getLayoutProgressCb = useCallback(() => getLayoutProgress(progressRef.current, currentLayout), [currentLayout]);
  const getPracticeInsightsCb = useCallback(() => getLayoutPracticeInsights(progressRef.current, currentLayout), [currentLayout]);

  const modeProfiles = useMemo(
    () => resolveModeProfiles(progress.modeProfiles),
    [progress.modeProfiles],
  );

  const saveModeProfile = useCallback((mode: string) => {
    commitProgress(prev => saveModeProfileToProgress(prev, mode, settingsRef.current));
  }, [commitProgress]);

  const clearModeProfile = useCallback((mode: string) => {
    commitProgress(prev => clearModeProfileFromProgress(prev, mode));
  }, [commitProgress]);

  const exportTheme = useCallback(async (themeName: string): Promise<boolean> => {
    const payload = buildThemeExportPayload(themeName, customThemesRef.current);
    if (!payload) return false;
    return window.api.exportFile(getThemeExportFilename(themeName), JSON.stringify(payload, null, 2));
  }, []);

  const exportConfig = useCallback(async (): Promise<boolean> => {
    const payload = buildConfigExportPayload(progressRef.current);
    return window.api.exportFile(CONFIG_EXPORT_FILENAME, JSON.stringify(payload, null, 2));
  }, []);

  const importConfig = useCallback(async (): Promise<string | null> => {
    const imported = await window.api.importFile();
    if (!imported) return null;
    const parsed = parseConfigImport(imported.content);
    if (!parsed.ok) return parsed.error;
    const data = parsed.payload;

    if (data.type === 'theme' && data.theme) {
      const ct = { ...customThemesRef.current, [data.theme.name]: data.theme.colors };
      saveCustomThemesCb(ct);
      applyThemeDOM(data.theme.name, buildAvailableThemeDefinitions({
        customThemes: ct,
        addons: installedAddonsRef.current,
        installedThemes: installedThemesRef.current,
      }));
      const nextSettings = { ...settingsRef.current, theme: data.theme.name };
      commitResolvedProgress(prev => ({
        ...prev,
        settings: nextSettings,
      }));
      return null;
    }

    const importedProgress = applyImportedConfigProgress({
      currentProgress: progressRef.current,
      currentSettings: settingsRef.current,
      payload: data,
    });
    if (importedProgress) {
      commitResolvedProgress(() => importedProgress.progress);
      applyThemeDOM(importedProgress.settings.theme);
      return null;
    }

    return 'Неизвестный тип конфигурации';
  }, [commitResolvedProgress, saveCustomThemesCb, applyThemeDOM]); // eslint-disable-line react-hooks/exhaustive-deps

  const importInterfaceLocale = useCallback(async (): Promise<string | null> => {
    const imported = await window.api.importFile({
      title: 'Импорт перевода интерфейса',
      filters: [
        { name: 'Gettext PO', extensions: ['po'] },
      ],
    });

    if (!imported) return null;

    const result = importInterfaceLocaleFromPo(imported.content, imported.name);
    if (!result.ok) {
      switch (result.error) {
        case 'invalid-format':
          return 'settings.cards.language.poImportErrors.invalidFormat';
        case 'missing-language':
          return 'settings.cards.language.poImportErrors.missingLanguage';
        case 'empty-dictionary':
          return 'settings.cards.language.poImportErrors.emptyDictionary';
        case 'conflicting-keys':
          return 'settings.cards.language.poImportErrors.conflictingKeys';
        case 'invalid-plural-forms':
          return 'settings.cards.language.poImportErrors.invalidPluralForms';
        case 'duplicate-entry':
          return 'settings.cards.language.poImportErrors.duplicateEntry';
        default:
          return 'settings.cards.language.poImportErrors.unknown';
      }
    }

    commitProgress(prev => ({
      ...prev,
      importedInterfaceLocales: {
        ...(prev.importedInterfaceLocales ?? {}),
        [result.locale.id]: result.locale,
      },
    }));

    return null;
  }, [commitProgress]);

  const removeImportedInterfaceLocale = useCallback((localeId: string) => {
    if (!localeId) return;

    const localeStillAvailable = isInterfaceLocaleAvailableOutsideImports({
      installedAddons: installedAddonsRef.current,
      localeId,
      modLocales: modInterfaceLocalesRef.current,
    });
    commitResolvedProgress(prev => {
      return removeImportedInterfaceLocaleFromProgress({
        localeId,
        localeStillAvailable,
        progress: prev,
        settings: settingsRef.current,
      });
    });
  }, [commitResolvedProgress]);

  // ── Addon management ─────────────────────────────────
  const refreshAddons = useCallback(async () => {
    const addons = await window.api.scanAddons();
    setInstalledAddons(addons);
    setExtensionCatalogEntries(await window.api.scanExtensionCatalog());
    await applyModEffects(installedModsRef.current, addons);

    const mergedResources = await loadMergedAddonResourceState({
      addons,
      language: currentLanguage,
      readLayouts: () => window.api.getLayouts(),
      readPracticeContentPacks: () => window.api.getPracticeContentPacks(),
      readWords: window.api.getWords,
    });
    setLayouts(mergedResources.layouts);
    setPracticeContentPacks(mergedResources.practiceContentPacks);
    setAllWords(mergedResources.words);
  }, [currentLanguage, applyModEffects]);

  const refreshSources = useCallback(async () => {
    setExtensionSources(await window.api.scanExtensionSources());
    setExtensionCatalogEntries(await window.api.scanExtensionCatalog());
  }, []);

  const refreshCatalog = useCallback(async () => {
    setExtensionCatalogEntries(await window.api.scanExtensionCatalog());
  }, []);

  const refreshThemes = useCallback(async () => {
    setInstalledThemes(await window.api.scanThemes());
    setExtensionCatalogEntries(await window.api.scanExtensionCatalog());
  }, []);

  const refreshMods = useCallback(async () => {
    const mods = await window.api.scanMods();
    setInstalledMods(mods);
    setExtensionCatalogEntries(await window.api.scanExtensionCatalog());
    await applyModEffects(mods, installedAddonsRef.current);
  }, [applyModEffects]);

  const {
    installExtensionSource: installExtensionSourceCb,
    updateExtensionSource: updateExtensionSourceCb,
    removeExtensionSource: removeExtensionSourceCb,
    toggleExtensionSource: toggleExtensionSourceCb,
    syncExtensionSource: syncExtensionSourceCb,
    installAddon: installAddonCb,
    removeAddon: removeAddonCb,
    toggleAddon: toggleAddonCb,
    installMod: installModCb,
    removeMod: removeModCb,
    toggleMod: toggleModCb,
  } = useMemo(() => createExtensionLifecycleActions({
    installExtensionSource: (input) => window.api.installExtensionSource(input),
    updateExtensionSource: (sourceId, input) => window.api.updateExtensionSource(sourceId, input),
    removeExtensionSource: (id) => window.api.removeExtensionSource(id),
    toggleExtensionSource: (id, enabled) => window.api.toggleExtensionSource(id, enabled),
    syncExtensionSource: (id) => window.api.syncExtensionSource(id),
    refreshSources,
    installAddon: () => window.api.installAddon(),
    removeAddon: (id) => window.api.removeAddon(id),
    toggleAddon: (id, enabled) => window.api.toggleAddon(id, enabled),
    refreshAddons,
    installMod: () => window.api.installMod(),
    removeMod: (id) => window.api.removeMod(id),
    toggleMod: (id, enabled) => window.api.toggleMod(id, enabled),
    refreshMods,
  }), [refreshAddons, refreshMods, refreshSources]);

  const installExtensionCatalogEntryCb = useCallback(async (
    sourceId: string,
    kind: ExtensionCatalogKind,
    entryId: string,
  ) => {
    const preflight = await window.api.validateExtensionCatalogEntry(sourceId, kind, entryId);
    if (preflight.entry) {
      setExtensionCatalogEntries(current => current.map(entry => (
        entry.id === preflight.entry?.id ? preflight.entry : entry
      )));
    }
    if (!preflight.ok || preflight.blocked) {
      return {
        ok: false,
        error: preflight.error ?? 'Catalog entry cannot be installed.',
        entry: preflight.entry,
      };
    }

    const result = await window.api.installExtensionCatalogEntry(sourceId, kind, entryId);
    if (result.ok) {
      if (kind === 'mods') {
        await refreshMods();
      } else if (kind === 'themes') {
        await refreshThemes();
      } else {
        await refreshAddons();
      }
    }
    return result;
  }, [refreshAddons, refreshMods, refreshThemes]);

  const installThemeCb = useCallback(async (): Promise<ThemeInstallResult> => {
    const result = await window.api.installTheme();
    if (result.ok) await refreshThemes();
    return result;
  }, [refreshThemes]);

  const removeThemeCb = useCallback(async (themeId: string): Promise<boolean> => {
    const ok = await window.api.removeTheme(themeId);
    if (!ok) return false;

    await refreshThemes();

    if (settingsRef.current.theme === themeId) {
      const fallbackTheme = BUILT_IN_THEMES[0] ?? 'dark-orange';
      const nextSettings = { ...settingsRef.current, theme: fallbackTheme };
      commitResolvedProgress(prev => ({
        ...prev,
        settings: nextSettings,
      }));
      applyThemeDOM(fallbackTheme);
    }

    return ok;
  }, [applyThemeDOM, commitResolvedProgress, refreshThemes]);

  // Мемоизируем unlockedAchievementIds чтобы оно пересчитывалось при изменении progress
  const unlockedAchievementIds = useMemo(() => {
    return progress.achievements ?? [];
  }, [progress.achievements]);

  const uiValue = useMemo<AppUiContextValue>(() => ({
    activeChar,
    setActiveChar,
    keyboardPreviewActive,
    setKeyboardPreviewActive,
  }), [activeChar, keyboardPreviewActive]);

  const navigationValue = useMemo<AppNavigationContextValue>(() => ({
    ready,
    currentMode,
    switchMode,
    disabledSections,
    modCssSnippets,
    modPanels,
    modModes,
  }), [
    ready,
    currentMode,
    switchMode,
    disabledSections,
    modCssSnippets,
    modPanels,
    modModes,
  ]);

  const practiceValue = useMemo<AppPracticeContextValue>(() => ({
    layouts,
    allWords,
    ngramModel,
    progress,
    motivationProgress,
    practiceInsights,
    practiceRhythmHistory,
    practiceContentPacks,
    gameAchievementCatalog: mergedAchievementCatalog,
    unlockedAchievementIds,
    fmtSpeed,
    spdLabel,
    switchMode,
    saveProgress: saveProgressCb,
    markModeGuideSeen,
    updateMotivationProgress,
    getLayoutProgress: getLayoutProgressCb,
    getPracticeState: getPracticeStateCb,
    getPracticeInsights: getPracticeInsightsCb,
    savePracticeInsights,
    savePracticeRhythmSession,
    saveCharStats,
    saveHistory,
    unlockAchievements,
  }), [
    layouts,
    allWords,
    ngramModel,
    progress,
    motivationProgress,
    practiceInsights,
    practiceRhythmHistory,
    practiceContentPacks,
    mergedAchievementCatalog,
    unlockedAchievementIds,
    fmtSpeed,
    spdLabel,
    switchMode,
    saveProgressCb,
    markModeGuideSeen,
    updateMotivationProgress,
    getLayoutProgressCb,
    getPracticeStateCb,
    getPracticeInsightsCb,
    savePracticeInsights,
    savePracticeRhythmSession,
    saveCharStats,
    saveHistory,
    unlockAchievements,
  ]);

  const statsValue = useMemo<AppStatsContextValue>(() => ({
    layouts,
    progress,
    practiceInsights,
    practiceRhythmHistory,
  }), [layouts, progress, practiceInsights, practiceRhythmHistory]);

  const gameValue = useMemo<AppGameContextValue>(() => ({
    layouts,
    allWords,
    ngramModel,
    progress,
    motivationProgress,
    gameState,
    gameItemCatalog: mergedItemCatalog,
    gameAchievementCatalog: mergedAchievementCatalog,
    unlockedAchievementIds,
    fmtSpeed,
    spdLabel,
    getLayoutProgress: getLayoutProgressCb,
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
    updateMotivationProgress,
    modRuleOverrides,
  }), [
    layouts,
    allWords,
    ngramModel,
    progress,
    motivationProgress,
    gameState,
    mergedItemCatalog,
    mergedAchievementCatalog,
    unlockedAchievementIds,
    fmtSpeed,
    spdLabel,
    getLayoutProgressCb,
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
    updateMotivationProgress,
    modRuleOverrides,
  ]);

  const extensionsValue = useMemo<AppExtensionsContextValue>(() => ({
    extensionSources,
    extensionCatalogEntries,
    installExtensionSource: installExtensionSourceCb,
    installExtensionCatalogEntry: installExtensionCatalogEntryCb,
    updateExtensionSource: updateExtensionSourceCb,
    removeExtensionSource: removeExtensionSourceCb,
    toggleExtensionSource: toggleExtensionSourceCb,
    syncExtensionSource: syncExtensionSourceCb,
    refreshSources,
    refreshCatalog,
    installedAddons,
    installAddon: installAddonCb,
    removeAddon: removeAddonCb,
    toggleAddon: toggleAddonCb,
    refreshAddons,
    installedMods,
    modInterfaceLocales,
    installMod: installModCb,
    removeMod: removeModCb,
    toggleMod: toggleModCb,
    refreshMods,
    installedThemes,
    installTheme: installThemeCb,
    removeTheme: removeThemeCb,
    refreshThemes,
  }), [
    extensionSources,
    extensionCatalogEntries,
    installExtensionSourceCb,
    installExtensionCatalogEntryCb,
    updateExtensionSourceCb,
    removeExtensionSourceCb,
    toggleExtensionSourceCb,
    syncExtensionSourceCb,
    refreshSources,
    refreshCatalog,
    installedAddons,
    installAddonCb,
    removeAddonCb,
    toggleAddonCb,
    refreshAddons,
    installedMods,
    modInterfaceLocales,
    installModCb,
    removeModCb,
    toggleModCb,
    refreshMods,
    installedThemes,
    installThemeCb,
    removeThemeCb,
    refreshThemes,
  ]);

  const settingsValue = useMemo<AppSettingsContextValue>(() => ({
    settings,
    practiceSettings,
    importedInterfaceLocales,
    interfaceLanguage: settings.interfaceLanguage,
    currentLayout,
    currentLanguage,
    languages,
    layoutsForLanguage,
    setCurrentLayout,
    setCurrentLanguage,
    saveSetting,
    savePracticeSetting,
    getModePracticeSettings,
    saveModePracticeSettings,
    customThemes,
    availableThemes,
    installedThemes,
    saveCustomThemes: saveCustomThemesCb,
    applyTheme,
    installTheme: installThemeCb,
    removeTheme: removeThemeCb,
    exportTheme,
    customPresets,
    applyPreset,
    saveCurrentAsPreset,
    deletePreset,
    exportConfig,
    importConfig,
    importInterfaceLocale,
    removeImportedInterfaceLocale,
    modeProfiles,
    saveModeProfile,
    clearModeProfile,
  }), [
    settings,
    practiceSettings,
    importedInterfaceLocales,
    settings.interfaceLanguage,
    currentLayout,
    currentLanguage,
    languages,
    layoutsForLanguage,
    setCurrentLayout,
    setCurrentLanguage,
    saveSetting,
    savePracticeSetting,
    getModePracticeSettings,
    saveModePracticeSettings,
    customThemes,
    availableThemes,
    installedThemes,
    saveCustomThemesCb,
    applyTheme,
    installThemeCb,
    removeThemeCb,
    exportTheme,
    customPresets,
    applyPreset,
    saveCurrentAsPreset,
    deletePreset,
    exportConfig,
    importConfig,
    importInterfaceLocale,
    removeImportedInterfaceLocale,
    modeProfiles,
    saveModeProfile,
    clearModeProfile,
  ]);

  return (
    <AppNavigationContext.Provider value={navigationValue}>
      <AppPracticeContext.Provider value={practiceValue}>
        <AppStatsContext.Provider value={statsValue}>
          <AppGameContext.Provider value={gameValue}>
            <AppUiContext.Provider value={uiValue}>
              <AppExtensionsContext.Provider value={extensionsValue}>
                <AppSettingsContext.Provider value={settingsValue}>{children}</AppSettingsContext.Provider>
              </AppExtensionsContext.Provider>
            </AppUiContext.Provider>
          </AppGameContext.Provider>
        </AppStatsContext.Provider>
      </AppPracticeContext.Provider>
    </AppNavigationContext.Provider>
  );
}
