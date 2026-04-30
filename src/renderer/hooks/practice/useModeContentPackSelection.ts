import type {
  CustomPracticePack,
  ModePracticeSettings,
  PracticeContentMode,
  PracticeContentPack,
  PracticeContentPackPreflightSummary,
  PracticeContentPackQualitySummary,
  PracticeContentScenarioId,
  PracticeSettings,
  TranslationParams,
} from '../../../shared/types';
import { usePracticeContentPackSelection } from './usePracticeContentPackSelection';

type TranslateFn = (key: string, params?: TranslationParams) => string;

type UseModeContentPackSelectionArgs = {
  currentLanguage: string;
  customPracticePacks?: Record<string, CustomPracticePack>;
  modeSettings?: ModePracticeSettings;
  practiceContentPacks: PracticeContentPack[];
  practiceSettings: PracticeSettings;
  scenarioId: PracticeContentScenarioId;
  t: TranslateFn;
};

export type ModeContentPackSelection = {
  availableContentPacks: PracticeContentPack[];
  contentMode: PracticeContentMode;
  effectiveContentMode: PracticeContentMode;
  selectedContentPack: PracticeContentPack | null;
  selectedContentPackControlId: string;
  selectedContentPackDisplayName: string | null;
  selectedContentPackId: string;
  selectedContentPackPreflight: PracticeContentPackPreflightSummary | null;
  selectedContentPackSummary: PracticeContentPackQualitySummary | null;
};

export function resolveModeContentPackSettings(
  practiceSettings: PracticeSettings,
  modeSettings?: ModePracticeSettings,
): Pick<ModeContentPackSelection, 'contentMode' | 'selectedContentPackId'> {
  return {
    contentMode: modeSettings?.contentMode ?? practiceSettings.contentMode,
    selectedContentPackId: modeSettings?.selectedContentPackId || practiceSettings.selectedContentPackId,
  };
}

export function useModeContentPackSelection({
  currentLanguage,
  customPracticePacks,
  modeSettings,
  practiceContentPacks,
  practiceSettings,
  scenarioId,
  t,
}: UseModeContentPackSelectionArgs): ModeContentPackSelection {
  const {
    contentMode,
    selectedContentPackId,
  } = resolveModeContentPackSettings(practiceSettings, modeSettings);
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
