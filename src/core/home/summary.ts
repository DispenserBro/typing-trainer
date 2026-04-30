import type {
  GameAchievementDefinition,
  GameDailyRunResult,
  HistoryEntry,
  Lesson,
} from '../../shared/types';
import type { TranslationParams } from '../../shared/types';
import { i18n } from '../i18n';
import {
  getHistoryModeBucket,
  isFlawlessHistoryEntry,
  isSprintHistoryEntry,
  isSurvivalHistoryEntry,
} from '../history/selectors';

export interface HomeHistorySummary {
  lastSession: HistoryEntry | null;
  bestSession: HistoryEntry | null;
  bestSprintSession: HistoryEntry | null;
  bestSurvivalSession: HistoryEntry | null;
  bestFlawlessSession: HistoryEntry | null;
}

export interface HomeLessonSummary {
  completedLessons: number;
  nextLessonNumber: number | null;
}

export interface HomeDailyRunSummary {
  todayDailyRun: GameDailyRunResult | null;
  dailyRunCompleted: boolean;
}

type TranslateFn = (key: string, params?: TranslationParams) => string;

const translateWithI18n: TranslateFn = (key, params) =>
  i18n.t(key, params ?? {}) as string;

function isBetterHistoryEntry(candidate: HistoryEntry, current: HistoryEntry | null) {
  if (!current) return true;
  if (candidate.wpm !== current.wpm) return candidate.wpm > current.wpm;
  if (candidate.acc !== current.acc) return candidate.acc > current.acc;
  return new Date(candidate.date).getTime() > new Date(current.date).getTime();
}

function getScenarioBucket(entry: HistoryEntry) {
  const bucket = getHistoryModeBucket(entry);
  if (bucket === 'sprint' || bucket === 'survival' || bucket === 'flawless') return bucket;
  return null;
}

export function countUnlockedAchievements(
  achievementCatalog: Pick<GameAchievementDefinition, 'id'>[],
  unlockedAchievementIds: string[],
) {
  const knownIds = new Set(achievementCatalog.map(achievement => achievement.id));
  let count = 0;

  for (const achievementId of unlockedAchievementIds) {
    if (knownIds.has(achievementId)) count += 1;
  }

  return count;
}

export function summarizeHomeHistory(entries: HistoryEntry[]): HomeHistorySummary {
  let bestSession: HistoryEntry | null = null;
  let bestSprintSession: HistoryEntry | null = null;
  let bestSurvivalSession: HistoryEntry | null = null;
  let bestFlawlessSession: HistoryEntry | null = null;

  for (const entry of entries) {
    if (isBetterHistoryEntry(entry, bestSession)) {
      bestSession = entry;
    }

    const scenarioBucket = getScenarioBucket(entry);
    if (scenarioBucket === 'sprint' && isBetterHistoryEntry(entry, bestSprintSession)) {
      bestSprintSession = entry;
    }
    if (scenarioBucket === 'survival' && isBetterHistoryEntry(entry, bestSurvivalSession)) {
      bestSurvivalSession = entry;
    }
    if (scenarioBucket === 'flawless' && isBetterHistoryEntry(entry, bestFlawlessSession)) {
      bestFlawlessSession = entry;
    }
  }

  return {
    lastSession: entries.length > 0 ? entries[entries.length - 1] ?? null : null,
    bestSession,
    bestSprintSession,
    bestSurvivalSession,
    bestFlawlessSession,
  };
}

export function summarizeLessonCompletion(
  lessons: Lesson[],
  lessonProgress: Record<number, number> | undefined,
  exerciseCount: number,
): HomeLessonSummary {
  let completedLessons = 0;

  for (let index = 0; index < lessons.length; index += 1) {
    const done = lessonProgress?.[index];
    const doneCount = typeof done === 'number' ? done : (done ? exerciseCount : 0);
    if (doneCount >= exerciseCount) {
      completedLessons += 1;
    }
  }

  return {
    completedLessons,
    nextLessonNumber: completedLessons < lessons.length ? completedLessons + 1 : null,
  };
}

export function summarizeDailyRunState(
  dailyRunHistory: Record<string, GameDailyRunResult> | undefined,
  todayKey: string,
  totalLevels: number,
): HomeDailyRunSummary {
  const todayDailyRun = dailyRunHistory?.[todayKey]
    ?? Object.values(dailyRunHistory ?? {}).find(entry => entry.date === todayKey)
    ?? null;

  return {
    todayDailyRun,
    dailyRunCompleted: Boolean(todayDailyRun && todayDailyRun.maxLevel >= totalLevels),
  };
}

export function getReplayModeFromHistory(entry: HistoryEntry | null) {
  if (entry && isSurvivalHistoryEntry(entry)) return 'survival';
  if (entry && isFlawlessHistoryEntry(entry)) return 'survival';
  if (entry && isSprintHistoryEntry(entry)) return 'test';
  return 'practice';
}

export function getReplayTitleFromHistory(
  entry: HistoryEntry | null,
  t: TranslateFn = translateWithI18n,
) {
  if (!entry) return t('home.summary.replay.openPractice');
  if (isSprintHistoryEntry(entry)) return t('home.summary.replay.retrySprint');
  if (isSurvivalHistoryEntry(entry)) return t('home.summary.replay.retrySurvival');
  if (isFlawlessHistoryEntry(entry)) return t('home.summary.replay.retryFlawless');
  return t('home.summary.replay.backToPractice');
}
