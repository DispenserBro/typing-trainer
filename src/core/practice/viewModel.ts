import type {
  CharStat,
  LayoutsData,
  MotivationProgress,
  PracticeContentMode,
  PracticeContentScenarioId,
  PracticeTrainingMode,
  Progress,
  TranslationParams,
} from '../../shared/types';
import type { PracticeFeedback } from './feedback';
import {
  getActiveMotivationGoalSnapshots,
  getMotivationStreakSnapshots,
} from '../motivation/progress';
import {
  buildLayoutMasteryResultSummary,
  buildPracticeResultComparison,
} from '../motivation/records';

type PracticeResultState = {
  wpm: number;
  acc: number;
  newLetter: boolean;
  openedLetter: string | null;
  worstChar: string | null;
  unlockProgress: number;
  rhythmScore: number;
  rhythmDeviation: number;
  feedback: PracticeFeedback;
} | null;

type BuildPracticeResultViewModelArgs = {
  contentMode: PracticeContentMode;
  contentScenarioId: PracticeContentScenarioId;
  currentLayout: string;
  historyEntries: NonNullable<Progress['history']>[string];
  layoutProgressUnlocked: number;
  layouts: LayoutsData;
  motivationProgress: MotivationProgress;
  progress: Progress;
  result: PracticeResultState;
  translate: (key: string, params?: TranslationParams) => string;
  trainingMode: PracticeTrainingMode;
};

type BuildPracticePerformanceViewModelArgs = {
  fallbackWorstChar: string | null;
  formatSpeed: (value: number) => string;
  historyEntries: NonNullable<Progress['history']>[string];
  keyStats: Record<string, CharStat>;
  lastCharStats: Record<string, CharStat>;
  result: PracticeResultState;
};

function calcCPM(stat: CharStat | null): number {
  if (!stat || !stat.hits || !stat.totalTime) return 0;
  return 60000 / (stat.totalTime / stat.hits);
}

export function buildPracticePerformanceViewModel({
  fallbackWorstChar,
  formatSpeed,
  historyEntries,
  keyStats,
  lastCharStats,
  result,
}: BuildPracticePerformanceViewModelArgs) {
  const practiceHistory = historyEntries.filter(entry => entry.mode === 'practice');
  const last = practiceHistory.length ? practiceHistory[practiceHistory.length - 1] ?? null : null;

  let speedDelta = 0;
  let accDelta = 0;
  if (practiceHistory.length >= 2) {
    const previous = practiceHistory[practiceHistory.length - 2]!;
    const current = practiceHistory[practiceHistory.length - 1]!;
    speedDelta = Math.round((Number(formatSpeed(current.wpm)) - Number(formatSpeed(previous.wpm))) * 10) / 10;
    accDelta = Math.round(current.acc - previous.acc);
  }

  const displayedWorstChar = result?.worstChar ?? fallbackWorstChar;
  const displayedWorstLower = displayedWorstChar ? displayedWorstChar.toLowerCase() : null;
  const weakGlobal = displayedWorstLower ? (keyStats[displayedWorstLower] ?? null) : null;
  const weakLast = displayedWorstLower ? (lastCharStats[displayedWorstLower] ?? null) : null;

  return {
    accDelta,
    displayedWorstChar,
    last,
    speedDelta,
    weakGlobalCPM: calcCPM(weakGlobal),
    weakLastCPM: calcCPM(weakLast),
  };
}

export function buildPracticeResultViewModel({
  contentMode,
  contentScenarioId,
  currentLayout,
  historyEntries,
  layoutProgressUnlocked,
  layouts,
  motivationProgress,
  progress,
  result,
  translate,
  trainingMode,
}: BuildPracticeResultViewModelArgs) {
  return {
    activePracticeGoals: getActiveMotivationGoalSnapshots(motivationProgress, translate, 2, [
      'practice-sessions',
      'practice-minutes',
      'target-speed-sessions',
      'high-accuracy-sessions',
    ]),
    masterySummary: result ? buildLayoutMasteryResultSummary(progress, layouts, currentLayout, translate, {
      previousHistoryEntriesOverride: historyEntries.slice(0, -1),
      currentHistoryEntriesOverride: historyEntries,
      previousUnlockedLettersOverride: result.newLetter ? Math.max(0, layoutProgressUnlocked - 1) : layoutProgressUnlocked,
      currentUnlockedLettersOverride: layoutProgressUnlocked,
    }) : null,
    practiceResultComparison: result ? buildPracticeResultComparison(historyEntries, translate, {
      wpm: result.wpm,
      acc: result.acc,
      contentScenarioId,
      trainingMode,
      contentMode,
    }) : null,
    practiceStreaks: getMotivationStreakSnapshots(motivationProgress, translate, [
      'flawless-practice',
      'successful-practice',
    ]),
  };
}
