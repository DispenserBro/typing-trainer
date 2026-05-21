import type {
  HistoryEntry,
  PracticeContentMode,
  PracticeContentScenarioId,
  PracticeState,
  Session,
} from '../../shared/types';
import type { AchievementEvent } from '../achievements/achievementEngine';

export type PracticeModeCompletionResult = {
  acc: number;
  chars: number;
  elapsed: number;
  errors: number;
  wpm: number;
};

export type ChallengeModeCompletionResult = PracticeModeCompletionResult & {
  livesLeft: number;
  passed: boolean;
  progressPercent: number;
};

export type PracticeModeMotivationEvent = {
  acc: number;
  cpm: number;
  elapsedSeconds: number;
  flawlessSession: boolean;
  successfulSession: boolean;
  trainingMode: 'normal';
};

export type SprintCompletionResolution = {
  achievementEvents: AchievementEvent[];
  historyEntry: Omit<HistoryEntry, 'date'>;
  motivationEvent: PracticeModeMotivationEvent;
  result: PracticeModeCompletionResult;
};

export type ChallengeCompletionResolution = {
  achievementEvents: AchievementEvent[];
  historyEntry: Omit<HistoryEntry, 'date'>;
  motivationEvent: PracticeModeMotivationEvent;
  nextPracticeState: PracticeState;
  result: ChallengeModeCompletionResult;
};

export type ChallengeModeConfig = {
  modeId: 'survival';
  variant: 'survival' | 'flawless';
  scenarioId: PracticeContentScenarioId;
  allowedErrors: number;
  wordMultiplier: number;
};

const SURVIVAL_CHALLENGE_CONFIG: ChallengeModeConfig = {
  modeId: 'survival',
  variant: 'survival',
  scenarioId: 'survival',
  allowedErrors: 2,
  wordMultiplier: 2.1,
};

const FLAWLESS_CHALLENGE_CONFIG: ChallengeModeConfig = {
  modeId: 'survival',
  variant: 'flawless',
  scenarioId: 'flawless',
  allowedErrors: 0,
  wordMultiplier: 1.5,
};

export function buildSprintWordCount(duration: number, baseWordCount: number) {
  return Math.max(baseWordCount * 4, Math.ceil((duration / 15) * baseWordCount * 4));
}

export function buildChallengeWordCount(baseWordCount: number, multiplier: number) {
  return Math.max(baseWordCount + 4, Math.ceil(baseWordCount * multiplier));
}

export function getChallengeModeConfig(flawlessEnabled: boolean): ChallengeModeConfig {
  return flawlessEnabled ? FLAWLESS_CHALLENGE_CONFIG : SURVIVAL_CHALLENGE_CONFIG;
}

export function getChallengeTotalLives(config: ChallengeModeConfig) {
  return config.allowedErrors + 1;
}

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

export function resolveSprintCompletion(args: {
  acc: number;
  contentMode: PracticeContentMode;
  elapsedSeconds: number;
  goalSpeedCpm: number;
  session: Session;
  wpm: number;
}): SprintCompletionResolution {
  const { acc, contentMode, elapsedSeconds, goalSpeedCpm, session, wpm } = args;
  const errors = session.errors ?? 0;

  return {
    achievementEvents: [{ type: 'test.completed', wpm, accuracy: acc }],
    historyEntry: {
      mode: 'test',
      wpm,
      acc,
      contentScenarioId: 'sprint',
      trainingMode: 'normal',
      contentMode,
      durationSeconds: elapsedSeconds,
      charStats: session.charStats,
    },
    motivationEvent: {
      elapsedSeconds,
      cpm: wpm * 5,
      acc,
      trainingMode: 'normal',
      successfulSession: wpm * 5 >= Math.max(1, goalSpeedCpm || 150) && acc >= 95,
      flawlessSession: errors === 0,
    },
    result: {
      wpm,
      acc,
      elapsed: elapsedSeconds,
      chars: session.totalChars ?? 0,
      errors,
    },
  };
}

export function resolveChallengeCompletion(args: {
  acc: number;
  config: ChallengeModeConfig;
  contentMode: PracticeContentMode;
  elapsedSeconds: number;
  goalSpeedCpm: number;
  practiceState: PracticeState;
  session: Session;
  today: string;
  totalLives: number;
  wpm: number;
}): ChallengeCompletionResolution {
  const {
    acc,
    config,
    contentMode,
    elapsedSeconds,
    goalSpeedCpm,
    practiceState,
    session,
    today,
    totalLives,
    wpm,
  } = args;
  const errors = session.errors ?? 0;
  const textLength = session.text?.length ?? 0;
  const passed = session.pos >= textLength;
  const livesLeft = Math.max(0, totalLives - errors);
  const progressPercent = textLength ? Math.round((session.pos / textLength) * 100) : 0;
  const nextPracticeState = resolveNextPracticeState(practiceState, elapsedSeconds, today);

  return {
    achievementEvents: [{ type: 'practice.sessionCompleted', totalSessions: nextPracticeState.sessionsTotal }],
    historyEntry: {
      mode: 'practice',
      wpm,
      acc,
      contentScenarioId: config.scenarioId,
      trainingMode: 'normal',
      contentMode,
      durationSeconds: elapsedSeconds,
      passed,
      charStats: session.charStats,
    },
    motivationEvent: {
      elapsedSeconds,
      cpm: wpm * 5,
      acc,
      trainingMode: 'normal',
      successfulSession: passed && wpm * 5 >= Math.max(1, goalSpeedCpm || 150) && acc >= 95,
      flawlessSession: passed && errors === 0,
    },
    nextPracticeState,
    result: {
      passed,
      wpm,
      acc,
      elapsed: elapsedSeconds,
      chars: session.totalChars ?? 0,
      errors,
      livesLeft,
      progressPercent,
    },
  };
}
