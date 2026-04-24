import { useMemo } from 'react';
import type { PracticeContentMode, TranslationParams } from '../../../shared/types';
import { usePracticeContentModeLabels } from './usePracticeContentModeLabels';

type TranslateFn = (key: string, params?: TranslationParams) => string;

export function useModeMaterialLabels(
  contentMode: PracticeContentMode,
  materialLabelKey: string,
  t: TranslateFn,
) {
  const contentModeLabels = usePracticeContentModeLabels();
  const trainingMaterialLabel = contentModeLabels[contentMode];
  const contentModeLabel = useMemo(
    () => `${t(materialLabelKey)}: ${trainingMaterialLabel}`,
    [materialLabelKey, t, trainingMaterialLabel],
  );

  return {
    contentModeLabel,
    trainingMaterialLabel,
  };
}
