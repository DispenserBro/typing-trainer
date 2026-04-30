import { useMemo } from 'react';
import type {
  CustomPracticePack,
  PracticeContentMode,
  PracticeContentPack,
  PracticeContentScenarioId,
  TranslationParams,
} from '../../../shared/types';
import {
  buildPracticeContentPackPreflightSummary,
  buildPracticeContentPackQualitySummary,
  resolvePracticeContentPackSelection,
} from '../../../core/engine';

type TranslateFn = (key: string, params?: TranslationParams) => string;

type UsePracticeContentPackSelectionArgs = {
  contentMode: PracticeContentMode;
  currentLanguage: string;
  customPracticePacks?: Record<string, CustomPracticePack>;
  practiceContentPacks: PracticeContentPack[];
  scenarioId: PracticeContentScenarioId;
  selectedContentPackId?: string;
  t: TranslateFn;
};

export function usePracticeContentPackSelection({
  contentMode,
  currentLanguage,
  customPracticePacks,
  practiceContentPacks,
  scenarioId,
  selectedContentPackId,
  t,
}: UsePracticeContentPackSelectionArgs) {
  const {
    availableContentPacks,
    effectiveContentMode,
    selectedContentPack,
  } = useMemo(
    () => resolvePracticeContentPackSelection({
      contentMode,
      currentLanguage,
      customPracticePacks,
      practiceContentPacks,
      selectedContentPackId,
    }),
    [contentMode, currentLanguage, customPracticePacks, practiceContentPacks, selectedContentPackId],
  );

  const selectedContentPackSummary = useMemo(
    () => selectedContentPack
      ? buildPracticeContentPackQualitySummary(selectedContentPack, scenarioId, t)
      : null,
    [scenarioId, selectedContentPack, t],
  );

  const selectedContentPackPreflight = useMemo(
    () => effectiveContentMode === 'custom' && selectedContentPack
      ? buildPracticeContentPackPreflightSummary(selectedContentPack, scenarioId, t)
      : null,
    [effectiveContentMode, scenarioId, selectedContentPack, t],
  );

  return {
    availableContentPacks,
    effectiveContentMode,
    selectedContentPack,
    selectedContentPackPreflight,
    selectedContentPackSummary,
  };
}
