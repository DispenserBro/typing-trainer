/**
 * Ghost run module – records per-level performance snapshots
 * and provides comparison data for the current run.
 */

import type { GameGhostLevelEntry, GameGhostRun } from '../../shared/types';

/**
 * Create an empty ghost run.
 */
export function createEmptyGhostRun(): GameGhostRun {
  return {
    date: new Date().toISOString(),
    maxLevel: 0,
    levels: [],
  };
}

/**
 * Record a level entry to the ghost being built during the current run.
 */
export function recordGhostLevel(
  ghost: GameGhostRun,
  entry: GameGhostLevelEntry,
): GameGhostRun {
  return {
    ...ghost,
    maxLevel: Math.max(ghost.maxLevel, entry.level),
    levels: [...ghost.levels, entry],
  };
}

/**
 * Finalize a ghost run (called when the run ends).
 */
export function finalizeGhostRun(ghost: GameGhostRun): GameGhostRun {
  return {
    ...ghost,
    date: new Date().toISOString(),
  };
}

/**
 * Get ghost entry for a specific level.
 */
export function getGhostLevelEntry(
  ghost: GameGhostRun | null | undefined,
  level: number,
): GameGhostLevelEntry | null {
  if (!ghost) return null;
  return ghost.levels.find(entry => entry.level === level) ?? null;
}

/**
 * Decide if a new ghost should replace the stored one.
 * The new ghost wins if it reached a higher level, or
 * equal level with better average WPM.
 */
export function shouldReplaceGhost(
  stored: GameGhostRun | null | undefined,
  candidate: GameGhostRun,
): boolean {
  if (!stored) return true;
  if (candidate.maxLevel > stored.maxLevel) return true;
  if (candidate.maxLevel === stored.maxLevel) {
    const candidateAvg = candidate.levels.length
      ? candidate.levels.reduce((s, e) => s + e.wpm, 0) / candidate.levels.length
      : 0;
    const storedAvg = stored.levels.length
      ? stored.levels.reduce((s, e) => s + e.wpm, 0) / stored.levels.length
      : 0;
    return candidateAvg > storedAvg;
  }
  return false;
}

/**
 * Get a comparison summary between current performance and ghost.
 */
export function getGhostComparison(
  ghost: GameGhostRun | null | undefined,
  currentLevel: number,
  currentWpm: number,
): { ghostWpm: number; delta: number; ahead: boolean } | null {
  if (!ghost) return null;
  const ghostEntry = getGhostLevelEntry(ghost, currentLevel);
  if (!ghostEntry) return null;
  const delta = currentWpm - ghostEntry.wpm;
  return {
    ghostWpm: ghostEntry.wpm,
    delta,
    ahead: delta >= 0,
  };
}
