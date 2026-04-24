import type { GameState } from './game';
import type { MotivationProgress } from './motivation';
import type {
  CharStat,
  CustomPracticePack,
  HistoryEntry,
  LayoutProgressState,
  PracticeInsightsState,
  PracticeRhythmSessionEntry,
  PracticeState,
} from './practice';
import type {
  CustomPresets,
  ModePracticeSettings,
  ModePracticeSettingsId,
  PracticeSettings,
  PresetSettings,
  UserSettings,
} from './settings';
import type { ImportedInterfaceLocaleDefinition } from './i18n';

/** Переопределения настроек для конкретного режима */
export type ModeProfiles = Partial<Record<string, Partial<PresetSettings>>>;

export interface Progress {
  settings?: UserSettings;
  practiceSettings?: PracticeSettings;
  modePracticeSettings?: Partial<Record<ModePracticeSettingsId, ModePracticeSettings>>;
  customPresets?: CustomPresets;
  modeProfiles?: ModeProfiles;
  keyStats?: Record<string, Record<string, CharStat>>;
  practiceInsights?: PracticeInsightsState;
  practiceRhythmHistory?: Record<string, PracticeRhythmSessionEntry[]>;
  history?: Record<string, HistoryEntry[]>;
  lessons?: Record<string, Record<number, number>>;
  layoutProgress?: Record<string, LayoutProgressState>;
  practice?: Record<string, PracticeState>;
  customPracticePacks?: Record<string, CustomPracticePack>;
  importedInterfaceLocales?: Record<string, ImportedInterfaceLocaleDefinition>;
  motivation?: MotivationProgress;
  game?: GameState;
  /** Глобальные разблокированные достижения (все категории). */
  achievements?: string[];
}
