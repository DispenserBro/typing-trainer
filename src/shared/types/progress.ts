import type { GameState } from './game';
import type {
  CharStat,
  HistoryEntry,
  LayoutProgressState,
  PracticeInsightsState,
  PracticeRhythmSessionEntry,
  PracticeState,
} from './practice';
import type { CustomPresets, PracticeSettings, PresetSettings, UserSettings } from './settings';

/** Переопределения настроек для конкретного режима */
export type ModeProfiles = Partial<Record<string, Partial<PresetSettings>>>;

export interface Progress {
  settings?: UserSettings;
  practiceSettings?: PracticeSettings;
  customPresets?: CustomPresets;
  modeProfiles?: ModeProfiles;
  keyStats?: Record<string, Record<string, CharStat>>;
  practiceInsights?: PracticeInsightsState;
  practiceRhythmHistory?: Record<string, PracticeRhythmSessionEntry[]>;
  history?: Record<string, HistoryEntry[]>;
  lessons?: Record<string, Record<number, number>>;
  layoutProgress?: Record<string, LayoutProgressState>;
  practice?: Record<string, PracticeState>;
  game?: GameState;
  /** Глобальные разблокированные достижения (все категории). */
  achievements?: string[];
}
