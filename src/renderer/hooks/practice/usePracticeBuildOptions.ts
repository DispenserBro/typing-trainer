import { useMemo } from 'react';
import type { PracticeSettings, PracticeTrainingMode } from '../../../shared/types';
import type { PracticeBuildOptions } from '../../../core/text/ngramUtils';

export function buildPracticeBuildOptionsKey(options: PracticeBuildOptions) {
  return [
    options.trainingMode ?? 'normal',
    (options.smartAdaptationEnabled ?? true) ? 'smart-on' : 'smart-off',
    options.smartAdaptationStrength ?? 'medium',
    options.smartAdaptationFocus ?? 'balanced',
  ].join(':');
}

export function usePracticeBuildOptions(
  practiceSettings: PracticeSettings,
  trainingMode: PracticeTrainingMode = 'normal',
): PracticeBuildOptions {
  const smartAdaptationEnabled = practiceSettings.smartAdaptationEnabled ?? true;
  const smartAdaptationStrength = practiceSettings.smartAdaptationStrength ?? 'medium';
  const smartAdaptationFocus = practiceSettings.smartAdaptationFocus ?? 'balanced';

  return useMemo(() => ({
    trainingMode,
    smartAdaptationEnabled,
    smartAdaptationStrength,
    smartAdaptationFocus,
  }), [
    trainingMode,
    smartAdaptationEnabled,
    smartAdaptationStrength,
    smartAdaptationFocus,
  ]);
}
