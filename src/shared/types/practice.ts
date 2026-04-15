import type { FingerMap } from './layout';
import type { PracticeContentMode, PracticeTrainingMode } from './settings';

export type CustomPracticePackKind = 'words' | 'sentences' | 'mixed';
export type CustomPracticePackSource = 'txt' | 'json';
export type PracticeContentPackOrigin = 'built-in' | 'addon' | 'custom';
export type PracticeContentPackRiskLevel = 'low' | 'medium' | 'high';
export type PracticeContentScenarioId =
  | 'practice-normal'
  | 'practice-rhythm'
  | 'sprint'
  | 'survival'
  | 'flawless';

export interface PracticeContentScenario {
  id: PracticeContentScenarioId;
  label: string;
  description: string;
  trainingMode: PracticeTrainingMode;
  targetWordCount: number;
  targetWordCountByContentMode?: Partial<Record<PracticeContentMode, number>>;
  targetWordCountByCustomKind?: Partial<Record<CustomPracticePackKind, number>>;
  sentenceLengthRange?: {
    min: number;
    max: number;
  };
}

export interface PracticeContentPack {
  id: string;
  name: string;
  description?: string;
  kind: CustomPracticePackKind;
  items: string[];
  language: string;
  origin: PracticeContentPackOrigin;
  sourceLabel?: string;
  addonId?: string;
}

export interface CustomPracticePack extends PracticeContentPack {
  origin: 'custom';
  source: CustomPracticePackSource;
  importedAt: string;
}

export interface PracticeContentPackQualitySummary {
  itemCount: number;
  averageWordsPerItem: number;
  estimatedItemsPerText: number;
  estimatedWordsPerText: number;
  repetitionRisk: PracticeContentPackRiskLevel;
  repetitionRiskLabel: string;
  recommendedModeLabel: string;
  recommendationReason: string;
  fitMessage: string;
  notes: string[];
}

export type PracticeModeRoute = 'practice' | 'test' | 'survival' | 'flawless';

export interface PracticeContentPackQuickAction {
  id: string;
  label: string;
  description: string;
  action:
    | {
      kind: 'switch-mode';
      targetMode: PracticeModeRoute;
      trainingMode?: PracticeTrainingMode;
      sprintDurationSeconds?: number;
    }
    | {
      kind: 'shorten-distance';
    }
    | {
      kind: 'use-base-material';
      targetMode: PracticeModeRoute;
      trainingMode?: PracticeTrainingMode;
      sprintDurationSeconds?: number;
    };
}

export interface PracticeContentPackPreflightSummary {
  severity: 'info' | 'warning';
  title: string;
  detail: string;
  actions: PracticeContentPackQuickAction[];
}

export interface CharStat {
  hits: number;
  misses: number;
  totalTime: number;
}

export interface SessionKeypress {
  position: number;
  expected: string;
  actual: string;
  correct: boolean;
  interval: number;
  timestamp: number;
}

export interface HistoryEntry {
  date: string;
  mode: 'test' | 'lesson' | 'practice' | 'game';
  wpm: number;
  acc: number;
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
}

export interface PracticeRhythmSessionEntry {
  id: string;
  date: string;
  trainingMode: PracticeTrainingMode;
  wpm: number;
  acc: number;
  textLength: number;
  intervals: number[];
  averageInterval: number;
  averageDeviation: number;
  rhythmScore: number;
  worstInterval: number;
}

export interface PracticeState {
  worstChar: string | null;
  sessionsToday: number;
  minutesToday: number;
  lastDate: string;
  sessionsTotal?: number;
}

export interface LayoutProgressState {
  unlocked: number;
  unlockProgress: number;
}

export type PracticeInsightRow = 'top' | 'middle' | 'bottom';

export interface PracticeInsightAggregate {
  hits: number;
  misses: number;
  totalTime: number;
  weakness: number;
}

export interface PracticeBigramInsight {
  hits: number;
  misses: number;
  totalTransitionTime: number;
  weakness: number;
}

export interface PracticeRhythmInsight {
  samples: number;
  averageInterval: number;
  averageDeviation: number;
  weakness: number;
}

export interface LayoutPracticeInsights {
  chars: Record<string, PracticeInsightAggregate>;
  bigrams: Record<string, PracticeBigramInsight>;
  fingers: Partial<Record<keyof FingerMap, PracticeInsightAggregate>>;
  rows: Record<PracticeInsightRow, PracticeInsightAggregate>;
  rhythm: PracticeRhythmInsight;
  lastUpdated: string;
}

export interface PracticeInsightsState {
  byLayout: Record<string, LayoutPracticeInsights>;
}

export interface Session {
  active: boolean;
  text: string;
  pos: number;
  errors: number;
  totalChars: number;
  startTime: number;
  charStats: Record<string, CharStat>;
  lastKeyTime: number;
  timer: ReturnType<typeof setInterval> | null;
  timerValue: number;
  mode: 'test' | 'lesson' | 'practice' | 'game' | '';
  lessonIdx: number;
  errPositions: Set<number>;
  keypresses: SessionKeypress[];
}
