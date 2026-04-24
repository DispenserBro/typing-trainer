import { useMemo } from 'react';
import type { MotivationProgress, TranslationParams } from '../../../shared/types';
import {
  getActiveMotivationGoalSnapshots,
  getMotivationStreakSnapshots,
} from '../../../core/motivation/progress';

type TranslateFn = (key: string, params?: TranslationParams) => string;

export function useModeMotivationSnapshots(
  motivationProgress: MotivationProgress,
  t: TranslateFn,
) {
  const activeGoals = useMemo(
    () => getActiveMotivationGoalSnapshots(motivationProgress, t, 2, [
      'practice-sessions',
      'practice-minutes',
      'target-speed-sessions',
      'high-accuracy-sessions',
    ]),
    [motivationProgress, t],
  );

  const activeStreaks = useMemo(
    () => getMotivationStreakSnapshots(motivationProgress, t, [
      'flawless-practice',
      'successful-practice',
    ]),
    [motivationProgress, t],
  );

  return {
    activeGoals,
    activeStreaks,
  };
}
