import type {
  GameDailyRunState,
  GameGhostRun,
  GameRunModifier,
  GameRunState,
} from '../../shared/types';
import { PLAYER_BASE_HP } from '../../core/game/battleSystem';
import {
  normalizeGameRunEventState,
  normalizeGameRunMapState,
  normalizeGameRunModifier,
  normalizeGameRunRouteState,
} from './appGameRunResolvers';

export function normalizeSavedGameRunState(run?: Partial<GameRunState> | null): GameRunState | null {
  if (!run) return null;
  return {
    level: Math.max(1, Math.floor(run.level || 1)),
    lives: Math.max(0, Math.floor(run.lives || 0)),
    maxLives: Math.max(1, Math.floor((run as any).maxLives || PLAYER_BASE_HP)),
    damageTaken: Math.max(0, Math.floor((run as any).damageTaken || 0)),
    regenTurns: Math.max(0, Math.floor((run as any).regenTurns || 0)),
    completedLevels: Math.max(0, Math.floor(run.completedLevels || 0)),
    targetSpeedCpm: Math.max(1, Math.floor(run.targetSpeedCpm || 1)),
    levelText: typeof run.levelText === 'string' ? run.levelText : '',
    activeModifiers: Array.isArray(run.activeModifiers)
      ? run.activeModifiers
        .map(modifier => normalizeGameRunModifier(modifier))
        .filter((modifier): modifier is GameRunModifier => Boolean(modifier && modifier.remainingLevels > 0))
      : [],
    map: normalizeGameRunMapState(run.map),
    pendingRoute: normalizeGameRunRouteState(run.pendingRoute),
    pendingEvent: normalizeGameRunEventState(run.pendingEvent),
    result: run.result ?? null,
    rewardChoices: run.rewardChoices ?? null,
    selectedRewardMessage: run.selectedRewardMessage ?? null,
    battleState: (run as any).battleState ?? null,
    dailySeed: typeof run.dailySeed === 'string' ? run.dailySeed : null,
  };
}

export function normalizeGameGhostRun(ghostRun?: Partial<GameGhostRun> | null): GameGhostRun | null {
  if (!ghostRun) return null;
  return {
    date: typeof ghostRun.date === 'string' ? ghostRun.date : new Date().toISOString(),
    maxLevel: Math.max(0, Math.floor(ghostRun.maxLevel || 0)),
    levels: Array.isArray(ghostRun.levels) ? ghostRun.levels.map(level => ({
      level: Math.max(1, Math.floor(level.level || 1)),
      wpm: Math.max(0, level.wpm || 0),
      acc: Math.max(0, Math.min(100, level.acc || 0)),
      elapsed: Math.max(0, level.elapsed || 0),
      passed: Boolean(level.passed),
    })) : [],
  };
}

export function normalizeGameDailyRunState(dailyRun?: Partial<GameDailyRunState> | null): GameDailyRunState | null {
  if (!dailyRun) return null;
  return {
    history: typeof dailyRun.history === 'object' && dailyRun.history
      ? Object.fromEntries(
        Object.entries(dailyRun.history)
          .filter(([key, val]) => /^\d{4}-\d{2}-\d{2}$/.test(key) && val && typeof val === 'object')
          .map(([key, val]) => [key, {
            date: val.date ?? key,
            maxLevel: Math.max(0, Math.floor(val.maxLevel || 0)),
            completedLevels: Math.max(0, Math.floor(val.completedLevels || 0)),
            bestWpm: Math.max(0, val.bestWpm || 0),
            avgAcc: Math.max(0, Math.min(100, val.avgAcc || 0)),
            totalTime: Math.max(0, val.totalTime || 0),
            attempts: Math.max(0, Math.floor(val.attempts || 0)),
          }]),
      )
      : {},
  };
}
