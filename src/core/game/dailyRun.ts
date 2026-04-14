/**
 * Daily run module – provides deterministic generation for
 * daily challenge runs with fixed seed per day.
 */

import type { GameDailyRunResult, GameDailyRunState } from '../../shared/types';
import { getTodayDateKey, getTodaySeed, hashSeed, createSeededRng, seededShuffle, seededPick } from './seededRng';
import { TOTAL_GAME_LEVELS } from './runUtils';

export const DAILY_RUN_LEVELS = 5;

export function getDailySeedString(): string {
  return getTodaySeed();
}

export function getDailyDateKey(): string {
  return getTodayDateKey();
}

/**
 * Create a seeded RNG for today's daily run.
 */
export function createDailyRng() {
  const seed = hashSeed(getTodaySeed());
  return createSeededRng(seed);
}

/**
 * Resolve the initial daily run state if none exists.
 */
export function resolveInitialDailyRunState(): GameDailyRunState {
  return { history: {} };
}

/**
 * Record a daily run attempt result.
 */
export function recordDailyRunAttempt(
  state: GameDailyRunState,
  maxLevel: number,
  completedLevels: number,
  bestWpm: number,
  avgAcc: number,
  totalTime: number,
): GameDailyRunState {
  const dateKey = getTodayDateKey();
  const existing = state.history[dateKey];

  const updated: GameDailyRunResult = {
    date: dateKey,
    maxLevel: Math.max(existing?.maxLevel ?? 0, maxLevel),
    completedLevels: Math.max(existing?.completedLevels ?? 0, completedLevels),
    bestWpm: Math.max(existing?.bestWpm ?? 0, bestWpm),
    avgAcc: existing
      ? (existing.avgAcc * existing.attempts + avgAcc) / (existing.attempts + 1)
      : avgAcc,
    totalTime: (existing?.totalTime ?? 0) + totalTime,
    attempts: (existing?.attempts ?? 0) + 1,
  };

  return {
    ...state,
    history: {
      ...state.history,
      [dateKey]: updated,
    },
  };
}

/**
 * Get the last N days of daily run results.
 */
export function getRecentDailyResults(
  state: GameDailyRunState,
  days = 7,
): GameDailyRunResult[] {
  const entries = Object.values(state.history)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, days);
  return entries;
}

/**
 * Get today's daily run result, or null if none.
 */
export function getTodayDailyResult(state: GameDailyRunState): GameDailyRunResult | null {
  return state.history[getTodayDateKey()] ?? null;
}
