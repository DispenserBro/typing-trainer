import type { FingerMap } from './layout';
import type { PracticeTrainingMode } from './settings';

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
  trainingMode?: PracticeTrainingMode;
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
