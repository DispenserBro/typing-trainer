import type {
  CustomPracticePack,
  PracticeContentMode,
  PracticeContentPack,
} from '../../shared/types';

export interface PracticeContentPackSelectionInput {
  contentMode: PracticeContentMode;
  currentLanguage: string;
  customPracticePacks?: Record<string, CustomPracticePack>;
  practiceContentPacks: PracticeContentPack[];
  selectedContentPackId?: string;
}

export interface PracticeContentPackSelectionResult {
  availableContentPacks: PracticeContentPack[];
  effectiveContentMode: PracticeContentMode;
  selectedContentPack: PracticeContentPack | null;
}

export function getAvailablePracticeContentPacks({
  currentLanguage,
  customPracticePacks,
  practiceContentPacks,
}: Pick<
  PracticeContentPackSelectionInput,
  'currentLanguage' | 'customPracticePacks' | 'practiceContentPacks'
>): PracticeContentPack[] {
  const customPackList = Object.values(customPracticePacks ?? {})
    .sort((left, right) => right.importedAt.localeCompare(left.importedAt));
  const builtInAndAddon = practiceContentPacks
    .filter(pack => pack.language === 'any' || pack.language === currentLanguage);

  return [...builtInAndAddon, ...customPackList];
}

export function resolvePracticeContentPackSelection({
  contentMode,
  currentLanguage,
  customPracticePacks,
  practiceContentPacks,
  selectedContentPackId,
}: PracticeContentPackSelectionInput): PracticeContentPackSelectionResult {
  const availableContentPacks = getAvailablePracticeContentPacks({
    currentLanguage,
    customPracticePacks,
    practiceContentPacks,
  });
  const selectedContentPack = availableContentPacks.find(pack => pack.id === selectedContentPackId)
    ?? availableContentPacks[0]
    ?? null;
  const effectiveContentMode = contentMode === 'custom' && !selectedContentPack
    ? 'adaptive-words'
    : contentMode;

  return {
    availableContentPacks,
    effectiveContentMode,
    selectedContentPack,
  };
}
