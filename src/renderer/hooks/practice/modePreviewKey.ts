import type { PracticeContentMode, PracticeContentPack, PracticeContentScenarioId } from '../../../shared/types';

type BuildModePreviewKeyArgs = {
  buildOptionsKey: string;
  contentMode: PracticeContentMode;
  currentLayout: string;
  materialKey?: string | number | null;
  practiceUnlockOrder: string[];
  scenarioId?: PracticeContentScenarioId;
  selectedContentPackId?: string | null;
  unlockedCount: number;
  useYo: boolean;
  wordCount: number;
};

export function buildModePreviewKey({
  buildOptionsKey,
  contentMode,
  currentLayout,
  materialKey,
  practiceUnlockOrder,
  scenarioId,
  selectedContentPackId,
  unlockedCount,
  useYo,
  wordCount,
}: BuildModePreviewKeyArgs) {
  return [
    scenarioId ?? 'default-scenario',
    currentLayout,
    useYo ? 'yo' : 'no-yo',
    contentMode,
    selectedContentPackId ?? 'no-pack',
    materialKey ?? 'default-material',
    wordCount,
    practiceUnlockOrder.join(''),
    unlockedCount,
    buildOptionsKey,
  ].join('|');
}

type BuildModeMaterialKeyArgs = {
  contentPack?: Pick<PracticeContentPack, 'items'> | null;
  words: readonly string[];
};

function getCollectionEdgeKey(items: readonly string[]) {
  return [
    items.length,
    items[0] ?? '',
    items[items.length - 1] ?? '',
  ];
}

export function buildModeMaterialKey({
  contentPack,
  words,
}: BuildModeMaterialKeyArgs) {
  return JSON.stringify([
    ...getCollectionEdgeKey(words),
    ...getCollectionEdgeKey(contentPack?.items ?? []),
  ]);
}
