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
  const customPackList = useMemo(
    () => Object.values(customPracticePacks ?? {}).sort((left, right) => right.importedAt.localeCompare(left.importedAt)),
    [customPracticePacks],
  );

  const availableContentPacks = useMemo<PracticeContentPack[]>(() => {
    const builtInAndAddon = practiceContentPacks.filter(pack => pack.language === 'any' || pack.language === currentLanguage);
    return [...builtInAndAddon, ...customPackList];
  }, [practiceContentPacks, customPackList, currentLanguage]);

  const selectedContentPack = useMemo<PracticeContentPack | null>(() => {
    const selected = availableContentPacks.find(pack => pack.id === selectedContentPackId);
    return selected ?? availableContentPacks[0] ?? null;
  }, [availableContentPacks, selectedContentPackId]);

  const effectiveContentMode = contentMode === 'custom' && !selectedContentPack
    ? 'adaptive-words'
    : contentMode;

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
