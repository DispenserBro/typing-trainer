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
import { isPracticeHistoryEntry } from '../history/selectors';

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

export type PracticeResultPrimaryMetricViewModel = {
  id: string;
  value: string | number;
  label: string;
  tone?: 'good' | 'warn' | 'bad' | 'neutral';
};

type BuildPracticeResultViewModelArgs = {
  contentMode: PracticeContentMode;
  contentScenarioId: PracticeContentScenarioId;
  currentLayout: string;
  historyEntries: NonNullable<Progress['history']>[string];
  layoutProgressUnlocked: number;
  layouts: LayoutsData;
  motivationProgress: MotivationProgress;
  practicesPerUnlock: number;
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

export function buildPracticeResultPrimaryMetrics(args: {
  layoutProgressUnlocked: number;
  practicesPerUnlock: number;
  result: PracticeResultState;
  trainingMode: PracticeTrainingMode;
  translate: (key: string, params?: TranslationParams) => string;
}): PracticeResultPrimaryMetricViewModel[] {
  const {
    layoutProgressUnlocked,
    practicesPerUnlock,
    result,
    trainingMode,
    translate,
  } = args;

  if (!result) return [];

  return [
    {
      id: 'accuracy',
      label: translate('common.accuracy'),
      value: `${Math.round(result.acc)}%`,
      tone: result.acc >= 98 ? 'good' : result.acc >= 90 ? 'warn' : 'bad',
    },
    ...(trainingMode === 'rhythm'
      ? [
          {
            id: 'rhythm',
            label: translate('practice.rhythm'),
            value: `${Math.round(result.rhythmScore)}%`,
            tone: result.rhythmScore >= 80 ? 'good' as const : result.rhythmScore >= 50 ? 'warn' as const : 'bad' as const,
          },
          {
            id: 'rhythm-deviation',
            label: translate('practice.rhythmDeviation'),
            value: `${result.rhythmDeviation} ${translate('practice.msShort')}`,
          },
        ]
      : []),
    {
      id: 'worst-char',
      label: translate('practice.problemChar'),
      value: result.worstChar?.toUpperCase() ?? '—',
      tone: result.worstChar ? 'warn' : 'neutral',
    },
    {
      id: 'letters',
      label: translate('practice.letters'),
      value: layoutProgressUnlocked,
    },
    result.newLetter
      ? {
          id: 'new-letter',
          label: translate('practice.newLetter'),
          value: '+1',
          tone: 'good' as const,
        }
      : {
          id: 'until-new',
          label: translate('practice.untilNew'),
          value: `${result.unlockProgress}/${practicesPerUnlock}`,
        },
  ];
}

export function buildPracticePerformanceViewModel({
  fallbackWorstChar,
  formatSpeed,
  historyEntries,
  keyStats,
  lastCharStats,
  result,
}: BuildPracticePerformanceViewModelArgs) {
  const practiceHistory = historyEntries.filter(isPracticeHistoryEntry);
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
  practicesPerUnlock,
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
    primaryMetrics: buildPracticeResultPrimaryMetrics({
      layoutProgressUnlocked,
      practicesPerUnlock,
      result,
      trainingMode,
      translate,
    }),
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
