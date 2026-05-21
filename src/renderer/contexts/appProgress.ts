import type {
  LayoutPracticeInsights,
  LayoutProgressState,
  LayoutsData,
  PracticeState,
  Progress,
} from '../../shared/types';
import { filterYoKeys } from '../../core/textFilters';
import { createEmptyLayoutPracticeInsights } from '../../core/practice/insights';
import {
  normalizeLayoutPracticeInsights,
  resolvePracticeInsights,
  resolveSettings,
} from './appResolvers';

export function getPracticeState(progress: Progress, layout: string): PracticeState {
  if (!progress.practice) progress.practice = {};
  if (!progress.practice[layout]) {
    progress.practice[layout] = {
      worstChar: null,
      sessionsToday: 0,
      minutesToday: 0,
      lastDate: '',
    };
  }

  const practiceState = progress.practice[layout];
  if (typeof practiceState.minutesToday !== 'number') practiceState.minutesToday = 0;

  const today = new Date().toISOString().slice(0, 10);
  if (practiceState.lastDate !== today) {
    practiceState.sessionsToday = 0;
    practiceState.minutesToday = 0;
    practiceState.lastDate = today;
  }

  return practiceState;
}

export function getLayoutProgress(progress: Progress, layout: string): LayoutProgressState {
  if (!progress.layoutProgress) progress.layoutProgress = {};
  const legacyUnlocked = (progress.practice?.[layout] as { unlocked?: number } | undefined)?.unlocked;

  if (!progress.layoutProgress[layout]) {
    progress.layoutProgress[layout] = {
      unlocked: typeof legacyUnlocked === 'number' && !Number.isNaN(legacyUnlocked) ? legacyUnlocked : 2,
      unlockProgress: 0,
    };
  }

  const layoutProgress = progress.layoutProgress[layout];
  if (typeof layoutProgress.unlocked !== 'number' || Number.isNaN(layoutProgress.unlocked)) {
    layoutProgress.unlocked = typeof legacyUnlocked === 'number' && !Number.isNaN(legacyUnlocked) ? legacyUnlocked : 2;
  }
  if (typeof layoutProgress.unlockProgress !== 'number' || Number.isNaN(layoutProgress.unlockProgress)) {
    layoutProgress.unlockProgress = 0;
  }

  return layoutProgress;
}

export function getNextUnlockableLetter(
  progress: Progress,
  layouts: LayoutsData,
  layoutId: string,
): string | null {
  const currentLayoutData = layouts.layouts[layoutId];
  if (!currentLayoutData) return null;

  const useYo = resolveSettings(progress).useYo;
  const unlockOrder = filterYoKeys(currentLayoutData.practiceUnlockOrder ?? [], useYo);
  const layoutProgress = getLayoutProgress(progress, layoutId);
  return unlockOrder[layoutProgress.unlocked] ?? null;
}

export function getLayoutPracticeInsights(progress: Progress, layoutId: string): LayoutPracticeInsights {
  if (!progress.practiceInsights) {
    progress.practiceInsights = resolvePracticeInsights(progress);
  }
  if (!progress.practiceInsights.byLayout[layoutId]) {
    progress.practiceInsights.byLayout[layoutId] = createEmptyLayoutPracticeInsights();
  }
  return normalizeLayoutPracticeInsights(progress.practiceInsights.byLayout[layoutId]);
}


