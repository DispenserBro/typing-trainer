import type { HistoryEntry, PracticeContentScenarioId } from '../../shared/types';

export type HistoryModeBucket =
  | 'practice'
  | 'sprint'
  | 'survival'
  | 'flawless'
  | 'game'
  | 'lesson'
  | 'other';

export function isPracticeHistoryEntry(entry: HistoryEntry): boolean {
  return entry.mode === 'practice';
}

export function isSprintHistoryEntry(entry: HistoryEntry): boolean {
  return entry.mode === 'test';
}

export function isSurvivalHistoryEntry(entry: HistoryEntry): boolean {
  return entry.mode === 'practice' && entry.contentScenarioId === 'survival';
}

export function isFlawlessHistoryEntry(entry: HistoryEntry): boolean {
  return entry.mode === 'practice' && entry.contentScenarioId === 'flawless';
}

export function isChallengeHistoryEntry(entry: HistoryEntry): boolean {
  return isSurvivalHistoryEntry(entry) || isFlawlessHistoryEntry(entry);
}

export function isBasePracticeHistoryEntry(entry: HistoryEntry): boolean {
  return isPracticeHistoryEntry(entry) && !isChallengeHistoryEntry(entry);
}

export function matchesPracticeScenario(
  entry: HistoryEntry,
  scenarioId: PracticeContentScenarioId,
): boolean {
  return isPracticeHistoryEntry(entry) && entry.contentScenarioId === scenarioId;
}

export function getHistoryModeBucket(entry: HistoryEntry): HistoryModeBucket {
  if (isSprintHistoryEntry(entry)) return 'sprint';
  if (isSurvivalHistoryEntry(entry)) return 'survival';
  if (isFlawlessHistoryEntry(entry)) return 'flawless';
  if (isPracticeHistoryEntry(entry)) return 'practice';
  if (entry.mode === 'game') return 'game';
  if (entry.mode === 'lesson') return 'lesson';
  return 'other';
}

export function matchesHistoryModeBucket(
  entry: HistoryEntry,
  bucket: HistoryModeBucket,
): boolean {
  return getHistoryModeBucket(entry) === bucket;
}
