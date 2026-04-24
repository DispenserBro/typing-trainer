import type {
  CustomPracticePack,
  ModePracticeSettings,
  PracticeContentPack,
  PracticeContentScenarioId,
  PracticeSettings,
  TranslationParams,
} from '../../../shared/types';
import { usePracticeContentPackSelection } from './usePracticeContentPackSelection';

type TranslateFn = (key: string, params?: TranslationParams) => string;

type UseModeContentPackSelectionArgs = {
  currentLanguage: string;
  customPracticePacks?: Record<string, CustomPracticePack>;
  modeSettings: ModePracticeSettings;
  practiceContentPacks: PracticeContentPack[];
  practiceSettings: PracticeSettings;
  scenarioId: PracticeContentScenarioId;
  t: TranslateFn;
};

export function useModeContentPackSelection({
  currentLanguage,
  customPracticePacks,
  modeSettings,
  practiceContentPacks,
  practiceSettings,
  scenarioId,
  t,
}: UseModeContentPackSelectionArgs) {
  const contentMode = modeSettings.contentMode ?? practiceSettings.contentMode;
  const selectedContentPackId = modeSettings.selectedContentPackId || practiceSettings.selectedContentPackId;
  const selection = usePracticeContentPackSelection({
    contentMode,
    currentLanguage,
    customPracticePacks,
    practiceContentPacks,
    scenarioId,
    selectedContentPackId,
    t,
  });
  const selectedContentPackControlId = selection.selectedContentPack?.id ?? '';
  const selectedContentPackDisplayName = selection.effectiveContentMode === 'custom' && selection.selectedContentPack
    ? selection.selectedContentPack.name
    : null;

  return {
    ...selection,
    contentMode,
    selectedContentPackId,
    selectedContentPackControlId,
    selectedContentPackDisplayName,
  };
}
