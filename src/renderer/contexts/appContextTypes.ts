import type { NgramModel } from '../../core/text/ngramUtils';
import type {
  AddonInstallResult,
  CharStat,
  CustomPresets,
  CustomThemes,
  ExtensionCatalogEntry,
  ExtensionCatalogInstallResult,
  ExtensionCatalogKind,
  ExtensionSourceInput,
  ExtensionSourceInstallResult,
  ExtensionSourceSyncResult,
  GameAchievementDefinition,
  GameEquipmentSlot,
  GameItemDefinition,
  GameRunState,
  GameState,
  ImportedInterfaceLocaleDefinition,
  InstalledAddon,
  InstalledExtensionSource,
  InstalledMod,
  InstalledTheme,
  InterfaceLocaleDefinition,
  LanguageInfo,
  Layout,
  LayoutPracticeInsights,
  LayoutProgressState,
  LayoutsData,
  ModeGuideStatus,
  ModePracticeSettings,
  ModePracticeSettingsId,
  ModEventName,
  ModEventPayloadMap,
  ModInstallResult,
  ModModeDefinition,
  ModPanel,
  ModRuleId,
  ModRuleValue,
  MotivationProgress,
  PracticeContentMode,
  PracticeContentPack,
  PracticeContentScenarioId,
  PracticeInsightsState,
  PracticeRhythmSessionEntry,
  PracticeSettings,
  PracticeState,
  PracticeTrainingMode,
  PresetSettings,
  Progress,
  ThemeDefinitions,
  ThemeInstallResult,
  UserSettings,
} from '../../shared/types';

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
  emitModEvent: <K extends ModEventName>(event: K, payload: ModEventPayloadMap[K]) => void;
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
  modRuleOverrides: Map<ModRuleId, ModRuleValue>;
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
