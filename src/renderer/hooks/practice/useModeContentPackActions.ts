import { useCallback } from 'react';
import type { PracticeContentMode, PracticeContentPack, PracticeContentPackQuickAction } from '../../../shared/types';
import type { PracticeSettings, PracticeTrainingMode } from '../../../shared/types/settings';
import {
  applyPracticeContentPackSettings,
  buildModeContentPackPatch,
} from './contentPackActionRouting';

type UseModeContentPackActionsArgs = {
  onShortenDistance: (pack: PracticeContentPack) => void;
  saveModePracticeSettings: (
    modeId: 'test' | 'survival' | 'flawless',
    patch: {
      contentMode?: PracticeContentMode;
      selectedContentPackId?: string;
      sprintDurationSeconds?: number;
      flawlessEnabled?: boolean;
    },
  ) => void;
  savePracticeSetting: <K extends keyof PracticeSettings>(key: K, value: PracticeSettings[K]) => void;
  selfMode: 'test' | 'survival';
  selectedContentPack: PracticeContentPack | null;
  switchMode: (mode: 'practice' | 'test' | 'survival') => void;
};

export function useModeContentPackActions({
  onShortenDistance,
  saveModePracticeSettings,
  savePracticeSetting,
  selfMode,
  selectedContentPack,
  switchMode,
}: UseModeContentPackActionsArgs) {
  return useCallback((guidedAction: PracticeContentPackQuickAction) => {
    if (!selectedContentPack) return;
    const { action } = guidedAction;

    const applyCustomPackToMode = (
      targetMode: 'practice' | 'test' | 'survival' | 'flawless',
      options: {
        trainingMode?: PracticeTrainingMode;
        sprintDurationSeconds?: number;
      } = {},
    ) => {
      if (targetMode === 'practice') {
        applyPracticeContentPackSettings(
          savePracticeSetting,
          'custom',
          selectedContentPack.id,
          options.trainingMode ?? 'normal',
        );
        switchMode('practice');
        return;
      }

      const { modeId, patch, routeMode } = buildModeContentPackPatch(targetMode, 'custom', selectedContentPack.id, {
        sprintDurationSeconds: options.sprintDurationSeconds,
      });
      saveModePracticeSettings(modeId, patch);
      if (routeMode !== selfMode) switchMode(routeMode);
    };

    const applyBaseMaterialToMode = (
      targetMode: 'practice' | 'test' | 'survival' | 'flawless',
      options: {
        trainingMode?: PracticeTrainingMode;
        sprintDurationSeconds?: number;
      } = {},
    ) => {
      if (targetMode === 'practice') {
        applyPracticeContentPackSettings(
          savePracticeSetting,
          'adaptive-words',
          '',
          options.trainingMode ?? 'normal',
        );
        switchMode('practice');
        return;
      }

      const { modeId, patch, routeMode } = buildModeContentPackPatch(targetMode, 'adaptive-words', '', {
        sprintDurationSeconds: options.sprintDurationSeconds,
      });
      saveModePracticeSettings(modeId, patch);
      if (routeMode !== selfMode) switchMode(routeMode);
    };

    if (action.kind === 'shorten-distance') {
      onShortenDistance(selectedContentPack);
      return;
    }

    if (action.kind === 'switch-mode') {
      applyCustomPackToMode(action.targetMode, {
        trainingMode: action.trainingMode,
        sprintDurationSeconds: action.sprintDurationSeconds,
      });
      return;
    }

    applyBaseMaterialToMode(action.targetMode, {
      trainingMode: action.trainingMode,
      sprintDurationSeconds: action.sprintDurationSeconds,
    });
  }, [onShortenDistance, saveModePracticeSettings, savePracticeSetting, selectedContentPack, selfMode, switchMode]);
}
