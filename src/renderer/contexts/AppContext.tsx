import {
  createContext, useContext, useState, useCallback, useEffect, useRef, useMemo,
  type ReactNode,
} from 'react';
import type {
  LayoutsData, Layout, Progress, CustomThemes, Session, CharStat,
  UserSettings, PracticeSettings, PracticeState, LayoutProgressState,
  TextDisplayMode, LanguageInfo, GameState, GameItemDefinition,
  GameEquipmentSlot, GameInventoryItem, GameRunState, GameAchievementDefinition,
} from '../../shared/types';
import {
  createSession, formatSpeed, speedLabel, filterYoKeys,
  buildNgramModel, type NgramModel,
} from '../engine';
import { GAME_ITEM_CATALOG, GAME_ITEM_MAP, isBrokenInventoryItem } from '../gameItems';
import { GAME_ACHIEVEMENT_CATALOG, GAME_ACHIEVEMENT_MAP } from '../gameAchievements';

export const BUILT_IN_THEMES = ['dark-orange', 'catppuccin', 'nord', 'monokai', 'light'];

function normalizeTextFontSize(value?: number): number {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) return 1.125;
  return value > 4 ? value / 16 : value;
}

function defaultSettings(s?: Partial<UserSettings>): UserSettings {
  const legacyTextFontSize = (s as (Partial<UserSettings> & { gameTextFontSize?: number }) | undefined)?.gameTextFontSize;

  return {
    speedUnit: s?.speedUnit ?? 'cpm',
    cursorStyle: s?.cursorStyle ?? 'underline',
    cursorSmooth: s?.cursorSmooth ?? 'smooth',
    highlightCurrentChar: s?.highlightCurrentChar ?? true,
    textDisplay: s?.textDisplay ?? 'block',
    theme: s?.theme ?? 'dark-orange',
    language: s?.language ?? '',
    layout: s?.layout ?? '',
    useYo: s?.useYo ?? false,
    showKeyboard: s?.showKeyboard ?? true,
    showHands: s?.showHands ?? true,
    endWithSpace: s?.endWithSpace ?? true,
    textFontSize: normalizeTextFontSize(s?.textFontSize ?? legacyTextFontSize),
  };
}

function defaultPracticeSettings(p?: Partial<PracticeSettings>): PracticeSettings {
  return {
    dailyGoalType: p?.dailyGoalType ?? 'minutes',
    dailyGoalValue: p?.dailyGoalValue ?? 15,
    goalSpeedCpm: p?.goalSpeedCpm ?? 150,
    noStepBack: p?.noStepBack ?? false,
  };
}

function defaultGameState(game?: Partial<GameState>): GameState {
  return {
    highestLevel: Math.max(1, Math.floor(game?.highestLevel ?? 1)),
    inventory: Array.isArray(game?.inventory) ? game.inventory : [],
    discoveredItemIds: Array.isArray(game?.discoveredItemIds) ? game.discoveredItemIds : [],
    achievements: Array.isArray(game?.achievements) ? game.achievements : [],
    equipped: {
      slotA: game?.equipped?.slotA ?? (game?.equipped as Partial<Record<'active', string | null>> | undefined)?.active ?? null,
      slotB: game?.equipped?.slotB ?? (game?.equipped as Partial<Record<'passiveA', string | null>> | undefined)?.passiveA ?? null,
      slotC: game?.equipped?.slotC ?? (game?.equipped as Partial<Record<'passiveB', string | null>> | undefined)?.passiveB ?? null,
    },
    currentRun: game?.currentRun ?? null,
  };
}

function createInventoryItemId() {
  return `itm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeInventoryItem(entry: unknown): GameInventoryItem[] {
  if (!entry || typeof entry !== 'object') return [];
  const candidate = entry as Partial<GameInventoryItem> & { itemId?: string; count?: number };
  if (!candidate.itemId || !GAME_ITEM_MAP[candidate.itemId]) return [];

  const item = GAME_ITEM_MAP[candidate.itemId];
  const maxDurability = item.maxDurability ?? null;

  if (typeof candidate.id === 'string') {
    const savedMaxDurability = typeof candidate.maxDurability === 'number'
      ? Math.max(0, Math.floor(candidate.maxDurability))
      : maxDurability;
    const savedDurability = typeof candidate.durability === 'number'
      ? Math.max(0, Math.min(Math.floor(candidate.durability), savedMaxDurability ?? Number.MAX_SAFE_INTEGER))
      : savedMaxDurability;

    return [{
      id: candidate.id,
      itemId: candidate.itemId,
      durability: savedMaxDurability == null ? null : savedDurability,
      maxDurability: savedMaxDurability,
    }];
  }

  const count = typeof candidate.count === 'number' ? Math.max(1, Math.floor(candidate.count)) : 1;
  return Array.from({ length: count }, () => ({
    id: createInventoryItemId(),
    itemId: candidate.itemId!,
    durability: maxDurability,
    maxDurability,
  }));
}

function resolveSettings(progress: Progress): UserSettings {
  const base = defaultSettings(progress.settings);
  const legacyTextDisplay = (progress.practiceSettings as (Partial<PracticeSettings> & { textDisplay?: TextDisplayMode }) | undefined)?.textDisplay;

  return {
    ...base,
    textDisplay: progress.settings?.textDisplay ?? legacyTextDisplay ?? base.textDisplay,
  };
}

function resolveGameState(progress: Progress): GameState {
  const base = defaultGameState(progress.game);
  const inventory = base.inventory
    .flatMap(entry => normalizeInventoryItem(entry))
    .filter(entry => GAME_ITEM_MAP[entry.itemId]);

  const discoveredItemIds = Array.from(new Set([
    ...base.discoveredItemIds.filter(itemId => GAME_ITEM_MAP[itemId]),
    ...inventory.map(entry => entry.itemId),
  ]));
  const achievements = Array.from(new Set(
    (base.achievements ?? []).filter(achievementId => GAME_ACHIEVEMENT_MAP[achievementId]),
  ));

  const usedInventoryIds = new Set<string>();
  const normalizeEquippedSlot = (value: string | null | undefined) => {
    if (!value) return null;

    const exactItem = inventory.find(entry => entry.id === value && !isBrokenInventoryItem(entry) && !usedInventoryIds.has(entry.id));
    if (exactItem) {
      usedInventoryIds.add(exactItem.id);
      return exactItem.id;
    }

    const legacyItem = inventory.find(entry => entry.itemId === value && !isBrokenInventoryItem(entry) && !usedInventoryIds.has(entry.id));
    if (legacyItem) {
      usedInventoryIds.add(legacyItem.id);
      return legacyItem.id;
    }

    return null;
  };

  return {
    highestLevel: Math.max(1, Math.floor(base.highestLevel || 1)),
    inventory,
    discoveredItemIds,
    achievements,
    equipped: {
      slotA: normalizeEquippedSlot(base.equipped.slotA),
      slotB: normalizeEquippedSlot(base.equipped.slotB),
      slotC: normalizeEquippedSlot(base.equipped.slotC),
    },
    currentRun: base.currentRun ? {
      level: Math.max(1, Math.floor(base.currentRun.level || 1)),
      lives: Math.max(0, Math.floor(base.currentRun.lives || 0)),
      completedLevels: Math.max(0, Math.floor(base.currentRun.completedLevels || 0)),
      targetSpeedCpm: Math.max(1, Math.floor(base.currentRun.targetSpeedCpm || 1)),
      levelText: typeof base.currentRun.levelText === 'string' ? base.currentRun.levelText : '',
      result: base.currentRun.result ?? null,
      rewardChoices: base.currentRun.rewardChoices ?? null,
      selectedRewardMessage: base.currentRun.selectedRewardMessage ?? null,
    } : null,
  };
}

function getPracticeState(progress: Progress, layout: string): PracticeState {
  if (!progress.practice) progress.practice = {};
  if (!progress.practice[layout]) {
    progress.practice[layout] = {
      worstChar: null,
      sessionsToday: 0,
      minutesToday: 0,
      lastDate: '',
    };
  }

  const practiceState = progress.practice[layout];
  if (typeof practiceState.minutesToday !== 'number') practiceState.minutesToday = 0;

  const today = new Date().toISOString().slice(0, 10);
  if (practiceState.lastDate !== today) {
    practiceState.sessionsToday = 0;
    practiceState.minutesToday = 0;
    practiceState.lastDate = today;
  }

  return practiceState;
}

function getLayoutProgress(progress: Progress, layout: string): LayoutProgressState {
  if (!progress.layoutProgress) progress.layoutProgress = {};
  const legacyUnlocked = (progress.practice?.[layout] as { unlocked?: number } | undefined)?.unlocked;

  if (!progress.layoutProgress[layout]) {
    progress.layoutProgress[layout] = {
      unlocked: typeof legacyUnlocked === 'number' && !Number.isNaN(legacyUnlocked) ? legacyUnlocked : 2,
      unlockProgress: 0,
    };
  }

  const layoutProgress = progress.layoutProgress[layout];
  if (typeof layoutProgress.unlocked !== 'number' || Number.isNaN(layoutProgress.unlocked)) {
    layoutProgress.unlocked = typeof legacyUnlocked === 'number' && !Number.isNaN(legacyUnlocked) ? legacyUnlocked : 2;
  }
  if (typeof layoutProgress.unlockProgress !== 'number' || Number.isNaN(layoutProgress.unlockProgress)) {
    layoutProgress.unlockProgress = 0;
  }

  return layoutProgress;
}

function getNextUnlockableLetter(
  progress: Progress,
  layouts: LayoutsData,
  layoutId: string,
): string | null {
  const currentLayoutData = layouts.layouts[layoutId];
  if (!currentLayoutData) return null;

  const useYo = resolveSettings(progress).useYo;
  const unlockOrder = filterYoKeys(currentLayoutData.practiceUnlockOrder ?? [], useYo);
  const layoutProgress = getLayoutProgress(progress, layoutId);
  return unlockOrder[layoutProgress.unlocked] ?? null;
}

export interface AppContextValue {
  ready: boolean;
  layouts: LayoutsData;
  allWords: string[];
  ngramModel: NgramModel | null;
  progress: Progress;
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
  saveCharStats: (cs: Record<string, CharStat>) => void;
  saveHistory: (mode: 'test' | 'lesson' | 'practice' | 'game', wpm: number, acc: number) => void;
  saveGameState: (game: GameState) => void;
  grantGameItem: (itemId: string) => string | null;
  equipGameItem: (slot: GameEquipmentSlot, inventoryItemId: string) => boolean;
  unequipGameItem: (slot: GameEquipmentSlot) => void;
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
  const [currentLayout, setCurrentLayoutState] = useState('');
  const [currentLanguage, setCurrentLanguageState] = useState('');
  const [currentMode, setCurrentMode] = useState('practice');
  const [session, setSession] = useState<Session>(createSession('', '', -1));
  const [activeChar, setActiveChar] = useState<string | undefined>(undefined);

  const progressRef = useRef(progress);
  progressRef.current = progress;

  const settings = resolveSettings(progress);
  const practiceSettings = defaultPracticeSettings(progress.practiceSettings);
  const gameState = resolveGameState(progress);

  const layoutsForLanguage = useMemo<[string, Layout][]>(() => {
    if (!currentLanguage) return [];
    return Object.entries(layouts.layouts).filter(([, layout]) => layout.lang === currentLanguage);
  }, [layouts.layouts, currentLanguage]);

  const languages = layouts.languages ?? [];

  const applyThemeDOM = useCallback((name: string, themesOverride?: CustomThemes) => {
    const themes = themesOverride ?? customThemes;
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
  }, [customThemes]);

  useEffect(() => {
    (async () => {
      const [loadedLayouts, loadedProgress, loadedThemes] = await Promise.all([
        window.api.getLayouts(),
        window.api.getProgress(),
        window.api.getCustomThemes(),
      ]);

      setLayouts(loadedLayouts);
      setProgress(loadedProgress);
      setCustomThemes(loadedThemes);

      const resolvedSettings = resolveSettings(loadedProgress);

      let nextLanguage = resolvedSettings.language;
      if (!nextLanguage || !(loadedLayouts.languages ?? []).some((language: LanguageInfo) => language.id === nextLanguage)) {
        nextLanguage = loadedLayouts.languages?.[0]?.id ?? 'en';
      }
      setCurrentLanguageState(nextLanguage);

      let nextLayout = resolvedSettings.layout;
      const compatibleLayouts = Object.entries(loadedLayouts.layouts)
        .filter(([, layout]) => layout.lang === nextLanguage);
      if (!nextLayout || !loadedLayouts.layouts[nextLayout] || loadedLayouts.layouts[nextLayout].lang !== nextLanguage) {
        nextLayout = compatibleLayouts[0]?.[0] ?? Object.keys(loadedLayouts.layouts)[0] ?? '';
      }
      setCurrentLayoutState(nextLayout);

      const words = await window.api.getWords(nextLanguage);
      setAllWords(words);

      applyThemeDOM(resolvedSettings.theme ?? 'dark-orange', loadedThemes);
      setReady(true);
    })();
  }, [applyThemeDOM]);

  const applyTheme = useCallback((name: string) => {
    applyThemeDOM(name);
  }, [applyThemeDOM]);

  const switchMode = useCallback((mode: string) => {
    setCurrentMode(mode);
    setSession(prev => {
      if (prev.active && prev.timer) clearInterval(prev.timer);
      return { ...prev, active: false, timer: null };
    });
  }, []);

  const setCurrentLayout = useCallback((layout: string) => {
    setCurrentLayoutState(layout);
    setProgress(prev => {
      const next = { ...prev, settings: { ...resolveSettings(prev), layout } };
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
    setProgress(prev => {
      const next = {
        ...prev,
        settings: { ...resolveSettings(prev), language, layout: nextLayout },
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
    setProgress(prev => {
      const next = { ...prev, settings: { ...resolveSettings(prev), [key]: val } };
      window.api.saveProgress(next);
      return next;
    });
  }, []);

  const savePracticeSetting = useCallback(<K extends keyof PracticeSettings>(key: K, val: PracticeSettings[K]) => {
    setProgress(prev => {
      const next = {
        ...prev,
        practiceSettings: { ...defaultPracticeSettings(prev.practiceSettings), [key]: val },
      };
      window.api.saveProgress(next);
      return next;
    });
  }, []);

  const saveProgressCb = useCallback((nextProgress: Progress) => {
    setProgress(nextProgress);
    window.api.saveProgress(nextProgress);
  }, []);

  const saveCustomThemesCb = useCallback((themes: CustomThemes) => {
    setCustomThemes(themes);
    window.api.saveCustomThemes(themes);
  }, []);

  const saveCharStats = useCallback((charStats: Record<string, CharStat>) => {
    setProgress(prev => {
      const next = { ...prev };
      if (!next.keyStats) next.keyStats = {};
      if (!next.keyStats[currentLayout]) next.keyStats[currentLayout] = {};

      const layoutStats = next.keyStats[currentLayout];
      for (const [char, data] of Object.entries(charStats)) {
        if (!layoutStats[char]) layoutStats[char] = { hits: 0, misses: 0, totalTime: 0 };
        layoutStats[char].hits += data.hits;
        layoutStats[char].misses += data.misses;
        layoutStats[char].totalTime += data.totalTime;
      }

      window.api.saveProgress(next);
      return { ...next };
    });
  }, [currentLayout]);

  const saveHistory = useCallback((mode: 'test' | 'lesson' | 'practice' | 'game', wpm: number, acc: number) => {
    setProgress(prev => {
      const next = { ...prev };
      if (!next.history) next.history = {};
      if (!next.history[currentLayout]) next.history[currentLayout] = [];

      next.history[currentLayout].push({
        date: new Date().toISOString(),
        mode,
        wpm: Math.round(wpm),
        acc: Math.round(acc * 10) / 10,
      });

      if (next.history[currentLayout].length > 500) {
        next.history[currentLayout] = next.history[currentLayout].slice(-500);
      }

      window.api.saveProgress(next);
      return { ...next };
    });
  }, [currentLayout]);

  const saveGameState = useCallback((game: GameState) => {
    setProgress(prev => {
      const next = { ...prev, game: resolveGameState({ ...prev, game }) };
      window.api.saveProgress(next);
      return next;
    });
  }, []);

  const grantGameItem = useCallback((itemId: string) => {
    const item = GAME_ITEM_MAP[itemId];
    if (!item) return null;

    const grantedId = createInventoryItemId();
    setProgress(prev => {
      const game = resolveGameState(prev);
      const next = {
        ...prev,
        game: {
          ...game,
          inventory: [
            ...game.inventory,
            {
              id: grantedId,
              itemId,
              durability: item.maxDurability ?? null,
              maxDurability: item.maxDurability ?? null,
            },
          ],
          discoveredItemIds: Array.from(new Set([...game.discoveredItemIds, itemId])),
        },
      };
      window.api.saveProgress(next);
      return next;
    });

    return grantedId;
  }, []);

  const equipGameItem = useCallback((slot: GameEquipmentSlot, inventoryItemId: string) => {
    let equipped = false;

    setProgress(prev => {
      const game = resolveGameState(prev);
      const inventoryItem = game.inventory.find(entry => entry.id === inventoryItemId);
      if (!inventoryItem || isBrokenInventoryItem(inventoryItem)) return prev;

      const item = GAME_ITEM_MAP[inventoryItem.itemId];
      if (!item) return prev;

      const alreadyEquippedElsewhere = Object.entries(game.equipped)
        .some(([slotKey, entryId]) => slotKey !== slot && entryId === inventoryItemId);
      if (alreadyEquippedElsewhere) return prev;

      equipped = true;
      const next = {
        ...prev,
        game: {
          ...game,
          equipped: { ...game.equipped, [slot]: inventoryItemId },
        },
      };
      window.api.saveProgress(next);
      return next;
    });

    return equipped;
  }, []);

  const unequipGameItem = useCallback((slot: GameEquipmentSlot) => {
    setProgress(prev => {
      const game = resolveGameState(prev);
      if (!game.equipped[slot]) return prev;

      const next = {
        ...prev,
        game: {
          ...game,
          equipped: { ...game.equipped, [slot]: null },
        },
      };
      window.api.saveProgress(next);
      return next;
    });
  }, []);

  const wearEquippedGameItems = useCallback(({ passed, isBoss }: { passed: boolean; isBoss: boolean }) => {
    const brokenItemIds: string[] = [];

    setProgress(prev => {
      const game = resolveGameState(prev);
      const equippedIds = new Set(Object.values(game.equipped).filter((value): value is string => Boolean(value)));
      let changed = false;

      const inventory = game.inventory.map(entry => {
        if (!equippedIds.has(entry.id)) return entry;

        const item = GAME_ITEM_MAP[entry.itemId];
        if (!item?.durabilityRules || entry.maxDurability == null || entry.durability == null) return entry;
        if (item.bossOnly && !isBoss) return entry;

        const wear = isBoss
          ? (passed ? item.durabilityRules.bossPass : item.durabilityRules.bossFail)
          : (passed ? item.durabilityRules.normalPass : item.durabilityRules.normalFail);
        if (wear <= 0) return entry;

        changed = true;
        const nextDurability = Math.max(0, entry.durability - wear);
        if (nextDurability <= 0) brokenItemIds.push(entry.id);
        return { ...entry, durability: nextDurability };
      });

      if (!changed) return prev;

      const next = {
        ...prev,
        game: {
          ...game,
          inventory,
          equipped: {
            slotA: brokenItemIds.includes(game.equipped.slotA ?? '') ? null : game.equipped.slotA,
            slotB: brokenItemIds.includes(game.equipped.slotB ?? '') ? null : game.equipped.slotB,
            slotC: brokenItemIds.includes(game.equipped.slotC ?? '') ? null : game.equipped.slotC,
          },
        },
      };
      window.api.saveProgress(next);
      return next;
    });

    return brokenItemIds;
  }, []);

  const resetGameInventory = useCallback(() => {
    setProgress(prev => {
      const game = resolveGameState(prev);
      const next = {
        ...prev,
        game: {
          ...game,
          inventory: [],
          discoveredItemIds: [],
          equipped: {
            slotA: null,
            slotB: null,
            slotC: null,
          },
          currentRun: null,
        },
      };
      window.api.saveProgress(next);
      return next;
    });
  }, []);

  const resetGameProgress = useCallback(() => {
    setProgress(prev => {
      const game = resolveGameState(prev);
      const next = {
        ...prev,
        game: {
          ...game,
          highestLevel: 1,
          inventory: [],
          discoveredItemIds: [],
          achievements: [],
          equipped: {
            slotA: null,
            slotB: null,
            slotC: null,
          },
          currentRun: null,
        },
      };
      window.api.saveProgress(next);
      return next;
    });
  }, []);

  const saveCurrentGameRun = useCallback((run: GameRunState | null) => {
    setProgress(prev => {
      const game = resolveGameState(prev);
      const next = {
        ...prev,
        game: {
          ...game,
          currentRun: run,
        },
      };
      window.api.saveProgress(next);
      return next;
    });
  }, []);

  const clearCurrentGameRun = useCallback((destroyItems = false) => {
    setProgress(prev => {
      const game = resolveGameState(prev);
      const next = {
        ...prev,
        game: {
          ...game,
          currentRun: null,
          ...(destroyItems ? {
            inventory: [],
            discoveredItemIds: [],
            equipped: {
              slotA: null,
              slotB: null,
              slotC: null,
            },
          } : {}),
        },
      };
      window.api.saveProgress(next);
      return next;
    });
  }, []);

  const markGameLevelReached = useCallback((level: number) => {
    setProgress(prev => {
      const game = resolveGameState(prev);
      const normalizedLevel = Math.max(1, Math.floor(level || 1));
      if (normalizedLevel <= game.highestLevel) return prev;

      const next = {
        ...prev,
        game: {
          ...game,
          highestLevel: normalizedLevel,
        },
      };
      window.api.saveProgress(next);
      return next;
    });
  }, []);

  const peekNextGameLetter = useCallback(() => {
    return getNextUnlockableLetter(progressRef.current, layouts, currentLayout);
  }, [currentLayout, layouts]);

  const unlockNextGameLetter = useCallback(() => {
    const unlockedChar = getNextUnlockableLetter(progressRef.current, layouts, currentLayout);
    if (!unlockedChar) return null;

    setProgress(prev => {
      const next = { ...prev };
      const layoutProgress = getLayoutProgress(next, currentLayout);
      layoutProgress.unlocked += 1;
      layoutProgress.unlockProgress = 0;
      window.api.saveProgress(next);
      return { ...next };
    });

    return unlockedChar;
  }, [currentLayout, layouts]);

  const unlockGameAchievements = useCallback((achievementIds: string[]) => {
    const currentProgress = progressRef.current;
    const game = resolveGameState(currentProgress);
    const knownAchievements = new Set(game.achievements);
    const unlocked: GameAchievementDefinition[] = [];

    for (const achievementId of achievementIds) {
      const achievement = GAME_ACHIEVEMENT_MAP[achievementId];
      if (!achievement || knownAchievements.has(achievementId)) continue;
      knownAchievements.add(achievementId);
      unlocked.push(achievement);
    }

    if (!unlocked.length) return unlocked;

    setProgress(prev => {
      const resolvedGame = resolveGameState(prev);
      const next = {
        ...prev,
        game: {
          ...resolvedGame,
          achievements: Array.from(knownAchievements),
        },
      };
      window.api.saveProgress(next);
      return next;
    });

    return unlocked;
  }, []);

  const fmtSpeed = useCallback((wpm: number) => formatSpeed(wpm, settings.speedUnit), [settings.speedUnit]);
  const spdLabel = speedLabel(settings.speedUnit);

  const getPracticeStateCb = useCallback(() => getPracticeState(progressRef.current, currentLayout), [currentLayout]);
  const getLayoutProgressCb = useCallback(() => getLayoutProgress(progressRef.current, currentLayout), [currentLayout]);

  const value: AppContextValue = {
    ready,
    layouts,
    allWords,
    ngramModel,
    progress,
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
    saveCharStats,
    saveHistory,
    saveGameState,
    grantGameItem,
    equipGameItem,
    unequipGameItem,
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
