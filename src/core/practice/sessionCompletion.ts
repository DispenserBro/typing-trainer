import type {
  CharStat,
  FingerMap,
  HistoryEntry,
  LayoutPracticeInsights,
  LayoutProgressState,
  PracticeContentMode,
  PracticeContentScenarioId,
  PracticeRhythmSessionEntry,
  PracticeState,
  PracticeTrainingMode,
  Session,
  TranslationParams,
} from '../../shared/types';
import type { AchievementEvent } from '../achievements/achievementEngine';
import { getWorstChar } from '../engine';
import {
  buildPracticeInsightsDelta,
  getRhythmScore,
  mergeLayoutPracticeInsights,
  summarizeSessionRhythm,
} from './insights';
import {
  buildPracticeFeedback,
  mergeCharStats,
  PRACTICES_PER_UNLOCK,
  type PracticeFeedback,
} from './feedback';

type TranslateFn = (key: string, params?: TranslationParams) => string;

export type PracticeCompletionResult = {
  acc: number;
  feedback: PracticeFeedback;
  newLetter: boolean;
  openedLetter: string | null;
  rhythmDeviation: number;
  rhythmScore: number;
  unlockProgress: number;
  wpm: number;
  worstChar: string | null;
};

export type PracticeCompletionResolution = {
  achievementEvents: AchievementEvent[];
  historyEntry: Omit<HistoryEntry, 'date'>;
  lastCharStats: Record<string, CharStat> | null;
  motivationEvent: {
    acc: number;
    cpm: number;
    elapsedSeconds: number;
    flawlessSession: boolean;
    successfulSession: boolean;
    trainingMode: PracticeTrainingMode;
  };
  nextInsights: LayoutPracticeInsights;
  nextLayoutProgress: LayoutProgressState;
  nextPracticeState: PracticeState;
  result: PracticeCompletionResult;
  rhythmSession: Omit<PracticeRhythmSessionEntry, 'id' | 'date'>;
};

function resolveNextPracticeState(
  practiceState: PracticeState,
  elapsedSeconds: number,
  today: string,
): PracticeState {
  const sameDay = practiceState.lastDate === today;
  return {
    ...practiceState,
    lastDate: today,
    minutesToday: (sameDay ? (practiceState.minutesToday || 0) : 0) + elapsedSeconds / 60,
    sessionsToday: (sameDay ? practiceState.sessionsToday : 0) + 1,
    sessionsTotal: (practiceState.sessionsTotal || 0) + 1,
  };
}

function resolveNextLayoutProgress(args: {
  enoughForProgress: boolean;
  layoutProgress: LayoutProgressState;
  practiceUnlockOrder: string[];
}) {
  const { enoughForProgress, layoutProgress, practiceUnlockOrder } = args;
  const nextLayoutProgress: LayoutProgressState = { ...layoutProgress };
  let unlockedNewLetter = false;

  if (nextLayoutProgress.unlocked < practiceUnlockOrder.length) {
    if (enoughForProgress) {
      nextLayoutProgress.unlockProgress += 1;
      if (nextLayoutProgress.unlockProgress >= PRACTICES_PER_UNLOCK) {
        nextLayoutProgress.unlocked += 1;
        nextLayoutProgress.unlockProgress = 0;
        unlockedNewLetter = true;
      }
    }
  } else {
    nextLayoutProgress.unlockProgress = 0;
  }

  return { nextLayoutProgress, unlockedNewLetter };
}

export function resolvePracticeSessionCompletion(args: {
  acc: number;
  baseCharStats: Record<string, CharStat> | undefined;
  contentMode: PracticeContentMode;
  contentScenarioId: PracticeContentScenarioId;
  elapsedSeconds: number;
  fallbackWorstChar: string | null;
  goalSpeedCpm: number;
  layoutFingers: FingerMap;
  layoutId: string;
  layoutProgress: LayoutProgressState;
  practiceInsights: LayoutPracticeInsights;
  practiceState: PracticeState;
  practiceUnlockOrder: string[];
  session: Session;
  today: string;
  trainingMode: PracticeTrainingMode;
  translate: TranslateFn;
  unlockedChars: string[];
  wpm: number;
}): PracticeCompletionResolution {
  const {
    acc,
    baseCharStats,
    contentMode,
    contentScenarioId,
    elapsedSeconds,
    fallbackWorstChar,
    goalSpeedCpm,
    layoutFingers,
    layoutId,
    layoutProgress,
    practiceInsights,
    practiceState,
    practiceUnlockOrder,
    session,
    today,
    trainingMode,
    translate,
    unlockedChars,
    wpm,
  } = args;
  const rhythm = summarizeSessionRhythm(session);
  const rhythmScore = getRhythmScore(rhythm);
  const goalAcc = 95;
  const goalWpm = goalSpeedCpm / 5;
  const enoughForProgress = wpm >= goalWpm && acc >= goalAcc && (trainingMode === 'normal' || rhythmScore >= 75);
  const { nextLayoutProgress, unlockedNewLetter } = resolveNextLayoutProgress({
    enoughForProgress,
    layoutProgress,
    practiceUnlockOrder,
  });
  const nextPracticeState = resolveNextPracticeState(practiceState, elapsedSeconds, today);
  const mergedStats = mergeCharStats(baseCharStats, session.charStats);
  const worstCharAfterFinish = getWorstChar(mergedStats, unlockedChars) ?? fallbackWorstChar;
  const openedLetter = unlockedNewLetter ? (practiceUnlockOrder[nextLayoutProgress.unlocked - 1] ?? null) : null;
  const nextInsights = mergeLayoutPracticeInsights(
    practiceInsights,
    buildPracticeInsightsDelta({
      layoutId,
      layoutFingers,
      session,
    }),
  );
  const sessionIntervals = session.keypresses
    .filter(entry => entry.expected && entry.expected !== ' ' && entry.interval > 0)
    .map(entry => Math.round(entry.interval));
  const feedback = buildPracticeFeedback(nextInsights, worstCharAfterFinish, translate);

  return {
    achievementEvents: [
      { type: 'practice.sessionCompleted', totalSessions: nextPracticeState.sessionsTotal },
      ...(unlockedNewLetter ? [{ type: 'practice.letterUnlocked' }] : []),
    ],
    historyEntry: {
      mode: 'practice',
      wpm,
      acc,
      contentScenarioId,
      trainingMode,
      contentMode,
      durationSeconds: elapsedSeconds,
      charStats: session.charStats,
    },
    lastCharStats: session.charStats ?? null,
    motivationEvent: {
      elapsedSeconds,
      cpm: wpm * 5,
      acc,
      trainingMode,
      successfulSession: enoughForProgress,
      flawlessSession: (session.errors ?? 0) === 0,
    },
    nextInsights,
    nextLayoutProgress,
    nextPracticeState: {
      ...nextPracticeState,
      worstChar: worstCharAfterFinish,
    },
    result: {
      wpm,
      acc,
      newLetter: unlockedNewLetter,
      openedLetter,
      worstChar: worstCharAfterFinish,
      unlockProgress: nextLayoutProgress.unlockProgress,
      rhythmScore,
      rhythmDeviation: Math.round(rhythm.averageDeviation),
      feedback,
    },
    rhythmSession: {
      trainingMode,
      wpm,
      acc,
      textLength: session.text?.length ?? 0,
      intervals: sessionIntervals,
      averageInterval: rhythm.averageInterval,
      averageDeviation: rhythm.averageDeviation,
      rhythmScore,
      worstInterval: Math.max(0, ...(sessionIntervals.length ? sessionIntervals : [0])),
    },
  };
}
