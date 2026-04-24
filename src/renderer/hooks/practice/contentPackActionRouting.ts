import type {
  PracticeContentMode,
  PracticeModeRoute,
} from '../../../shared/types';
import type {
  ModePracticeSettings,
  ModePracticeSettingsId,
  PracticeSettings,
  PracticeTrainingMode,
} from '../../../shared/types/settings';

type ModeContentPackTarget = Exclude<PracticeModeRoute, 'practice'>;
type SavePracticeSetting = <K extends keyof PracticeSettings>(key: K, value: PracticeSettings[K]) => void;

type ModeContentPackActionOptions = {
  sprintDurationSeconds?: number;
};

type ModeContentPackPatch = Pick<
  ModePracticeSettings,
  'contentMode' | 'selectedContentPackId' | 'sprintDurationSeconds' | 'flawlessEnabled'
>;

export function buildModeContentPackPatch(
  targetMode: ModeContentPackTarget,
  contentMode: PracticeContentMode,
  selectedContentPackId: string,
  options: ModeContentPackActionOptions = {},
): {
  modeId: ModePracticeSettingsId;
  patch: ModeContentPackPatch;
  routeMode: 'test' | 'survival';
} {
  const patch: ModeContentPackPatch = {
    contentMode,
    selectedContentPackId,
    ...(options.sprintDurationSeconds ? { sprintDurationSeconds: options.sprintDurationSeconds } : {}),
  };

  if (targetMode === 'survival' || targetMode === 'flawless') {
    return {
      modeId: 'survival',
      patch: {
        ...patch,
        flawlessEnabled: targetMode === 'flawless',
      },
      routeMode: 'survival',
    };
  }

  return {
    modeId: targetMode,
    patch,
    routeMode: targetMode,
  };
}

export function applyPracticeContentPackSettings(
  savePracticeSetting: SavePracticeSetting,
  contentMode: PracticeContentMode,
  selectedContentPackId: string,
  trainingMode?: PracticeTrainingMode,
) {
  savePracticeSetting('contentMode', contentMode);
  savePracticeSetting('selectedContentPackId', selectedContentPackId);
  if (trainingMode) {
    savePracticeSetting('trainingMode', trainingMode);
  }
}
