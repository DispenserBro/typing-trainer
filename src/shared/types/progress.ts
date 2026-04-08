import type { GameState } from './game';
import type {
  CharStat,
  HistoryEntry,
  LayoutProgressState,
  PracticeInsightsState,
  PracticeRhythmSessionEntry,
  PracticeState,
} from './practice';
import type { PracticeSettings, UserSettings } from './settings';

export interface Progress {
  settings?: UserSettings;
  practiceSettings?: PracticeSettings;
  keyStats?: Record<string, Record<string, CharStat>>;
  practiceInsights?: PracticeInsightsState;
  practiceRhythmHistory?: Record<string, PracticeRhythmSessionEntry[]>;
  history?: Record<string, HistoryEntry[]>;
  lessons?: Record<string, Record<number, number>>;
  layoutProgress?: Record<string, LayoutProgressState>;
  practice?: Record<string, PracticeState>;
  game?: GameState;
}
