import type { PracticeContentMode, PracticeContentScenarioId } from '../../../shared/types';

type BuildModePreviewKeyArgs = {
  buildOptionsKey: string;
  contentMode: PracticeContentMode;
  currentLayout: string;
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
    wordCount,
    practiceUnlockOrder.join(''),
    unlockedCount,
    buildOptionsKey,
  ].join('|');
}
