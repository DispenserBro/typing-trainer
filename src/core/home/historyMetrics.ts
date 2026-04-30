import type { HistoryEntry } from '../../shared/types';
import {
  isBasePracticeHistoryEntry,
  isFlawlessHistoryEntry,
  isSprintHistoryEntry,
  isSurvivalHistoryEntry,
} from '../history/selectors';

type HomeHistoryEntries = HistoryEntry[];
type MetricKey = 'wpm' | 'acc';

export interface HomeHistoryMetrics {
  flawlessEntries: HomeHistoryEntries;
  practiceAccuracyTrend: number;
  practiceSpeedTrend: number;
  recentAvgAccuracy: number;
  recentEntries: HomeHistoryEntries;
  recentFlawlessCount14d: number;
  recentPracticeAvgAccuracy: number;
  recentPracticeAvgSpeed: number;
  recentPracticeCount14d: number;
  recentPracticeEntries: HomeHistoryEntries;
  recentSprintAvgAccuracy: number;
  recentSprintAvgSpeed: number;
  recentSprintCount14d: number;
  recentSprintEntries: HomeHistoryEntries;
  recentSurvivalAvgAccuracy: number;
  recentSurvivalAvgSpeed: number;
  recentSurvivalCount14d: number;
  recentSurvivalEntries: HomeHistoryEntries;
  sprintAccuracyTrend: number;
  sprintEntries: HomeHistoryEntries;
  sprintSpeedTrend: number;
  survivalEntries: HomeHistoryEntries;
  survivalPassRate: number;
}

function takeRecent<T>(entries: T[], count: number) {
  return entries.slice(-count);
}

function averageMetric(entries: HomeHistoryEntries, key: MetricKey) {
  if (!entries.length) return 0;
  return entries.reduce((sum, entry) => sum + entry[key], 0) / entries.length;
}

function getEntryTimestamp(entry: HistoryEntry) {
  return new Date(entry.date).getTime();
}

function countEntriesWithinDays(
  entries: HomeHistoryEntries,
  days: number,
  predicate: (entry: HistoryEntry) => boolean,
  now: number,
) {
  const threshold = now - days * 24 * 60 * 60 * 1000;
  return entries.filter(entry => {
    const timestamp = getEntryTimestamp(entry);
    return !Number.isNaN(timestamp) && timestamp >= threshold && predicate(entry);
  }).length;
}

function buildTrendDelta(entries: HomeHistoryEntries, key: MetricKey, recentCount: number, previousCount = recentCount) {
  const recentEntries = takeRecent(entries, recentCount);
  const previousEntries = entries.slice(
    Math.max(0, entries.length - recentCount - previousCount),
    Math.max(0, entries.length - recentCount),
  );
  if (!recentEntries.length || !previousEntries.length) return 0;
  return averageMetric(recentEntries, key) - averageMetric(previousEntries, key);
}

export function buildHomeHistoryMetrics(
  currentHistory: HomeHistoryEntries,
  now = Date.now(),
): HomeHistoryMetrics {
  const recentEntries = takeRecent(currentHistory, 8);
  const recentPracticeEntries = takeRecent(currentHistory.filter(isBasePracticeHistoryEntry), 6);
  const sprintEntries = currentHistory.filter(isSprintHistoryEntry);
  const recentSprintEntries = takeRecent(sprintEntries, 4);
  const survivalEntries = currentHistory.filter(isSurvivalHistoryEntry);
  const recentSurvivalEntries = takeRecent(survivalEntries, 3);
  const flawlessEntries = currentHistory.filter(isFlawlessHistoryEntry);

  return {
    flawlessEntries,
    practiceAccuracyTrend: buildTrendDelta(recentPracticeEntries, 'acc', 3),
    practiceSpeedTrend: buildTrendDelta(recentPracticeEntries, 'wpm', 3),
    recentAvgAccuracy: averageMetric(recentEntries, 'acc'),
    recentEntries,
    recentFlawlessCount14d: countEntriesWithinDays(currentHistory, 14, isFlawlessHistoryEntry, now),
    recentPracticeAvgAccuracy: averageMetric(recentPracticeEntries, 'acc'),
    recentPracticeAvgSpeed: averageMetric(recentPracticeEntries, 'wpm'),
    recentPracticeCount14d: countEntriesWithinDays(currentHistory, 14, isBasePracticeHistoryEntry, now),
    recentPracticeEntries,
    recentSprintAvgAccuracy: averageMetric(recentSprintEntries, 'acc'),
    recentSprintAvgSpeed: averageMetric(recentSprintEntries, 'wpm'),
    recentSprintCount14d: countEntriesWithinDays(currentHistory, 14, isSprintHistoryEntry, now),
    recentSprintEntries,
    recentSurvivalAvgAccuracy: averageMetric(recentSurvivalEntries, 'acc'),
    recentSurvivalAvgSpeed: averageMetric(recentSurvivalEntries, 'wpm'),
    recentSurvivalCount14d: countEntriesWithinDays(currentHistory, 14, isSurvivalHistoryEntry, now),
    recentSurvivalEntries,
    sprintAccuracyTrend: buildTrendDelta(recentSprintEntries, 'acc', 2),
    sprintEntries,
    sprintSpeedTrend: buildTrendDelta(recentSprintEntries, 'wpm', 2),
    survivalEntries,
    survivalPassRate: survivalEntries.length > 0
      ? survivalEntries.filter(entry => entry.passed).length / survivalEntries.length
      : 0,
  };
}
