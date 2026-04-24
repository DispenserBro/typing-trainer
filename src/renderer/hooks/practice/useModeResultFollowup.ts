import { useCallback, useMemo } from 'react';
import type { ModePracticeSettings, ModePracticeSettingsId } from '../../../shared/types/settings';
import type { TranslationParams } from '../../../shared/types';
import {
  buildModeResultFollowupRecommendation,
  type ModeFollowupRecommendation,
} from '../../../core/motivation/records';

type TranslateFn = (key: string, options?: TranslationParams) => string;
type ModeRoute = 'practice' | 'test' | 'survival';

type ModeResultFollowupInput = {
  mode: 'test' | 'survival' | 'flawless';
  wpm: number;
  acc: number;
  passed?: boolean;
  errors?: number;
} | null;

type UseModeResultFollowupArgs = {
  flawlessEnabledForSurvivalAction?: boolean;
  result: ModeResultFollowupInput;
  saveModePracticeSettings?: (mode: ModePracticeSettingsId, patch: Partial<ModePracticeSettings>) => ModePracticeSettings;
  switchMode: (mode: ModeRoute) => void;
  syncFlawlessOnSurvivalAction?: boolean;
  t: TranslateFn;
};

function isModeRoute(value: string): value is ModeRoute {
  return value === 'practice' || value === 'test' || value === 'survival';
}

export function useModeResultFollowup({
  flawlessEnabledForSurvivalAction = false,
  result,
  saveModePracticeSettings,
  switchMode,
  syncFlawlessOnSurvivalAction = false,
  t,
}: UseModeResultFollowupArgs): {
  followupRecommendation: ModeFollowupRecommendation | null;
  handleFollowupAction: (() => void) | null;
} {
  const followupRecommendation = useMemo(
    () => result ? buildModeResultFollowupRecommendation(result, t) : null,
    [result, t],
  );

  const handleFollowupAction = useCallback(() => {
    if (!followupRecommendation || !isModeRoute(followupRecommendation.actionMode)) return;

    if (
      followupRecommendation.actionMode === 'survival'
      && syncFlawlessOnSurvivalAction
      && saveModePracticeSettings
    ) {
      saveModePracticeSettings('survival', { flawlessEnabled: flawlessEnabledForSurvivalAction });
    }

    switchMode(followupRecommendation.actionMode);
  }, [
    flawlessEnabledForSurvivalAction,
    followupRecommendation,
    saveModePracticeSettings,
    switchMode,
    syncFlawlessOnSurvivalAction,
  ]);

  return {
    followupRecommendation,
    handleFollowupAction: followupRecommendation ? handleFollowupAction : null,
  };
}
