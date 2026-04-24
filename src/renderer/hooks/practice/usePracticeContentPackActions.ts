import { useCallback, useState } from 'react';
import type {
  PracticeContentMode,
  PracticeContentPack,
  PracticeContentPackQuickAction,
  PracticeContentScenarioId,
  Progress,
  TranslationParams,
} from '../../../shared/types';
import type { PracticeSettings, PracticeTrainingMode } from '../../../shared/types/settings';
import {
  buildPracticeContentPackQualitySummary,
  resolveImportedPracticePackPreset,
} from '../../../core/engine';
import { createCustomPracticePackFromFile } from '../../../core/practice/content';
import {
  getImportedPackPresetLabel,
  getPackRecommendedModeLabel,
  localizePackImportError,
} from '../../components/practice/contentPackSummaryI18n';
import {
  applyPracticeContentPackSettings,
  buildModeContentPackPatch,
} from './contentPackActionRouting';

type Translate = (key: string, params?: TranslationParams) => string;

type UsePracticeContentPackActionsArgs = {
  contentScenarioId: PracticeContentScenarioId;
  practiceSettings: PracticeSettings;
  progress: Progress;
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
  saveProgress: (nextProgress: Progress) => void;
  selectedContentPack: PracticeContentPack | null;
  switchMode: (mode: 'practice' | 'test' | 'survival') => void;
  translate: Translate;
};

export function usePracticeContentPackActions({
  contentScenarioId,
  practiceSettings,
  progress,
  saveModePracticeSettings,
  savePracticeSetting,
  saveProgress,
  selectedContentPack,
  switchMode,
  translate,
}: UsePracticeContentPackActionsArgs) {
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleImportCustomContent = useCallback(async () => {
    const imported = await window.api.importFile({
      title: translate('practice.importDialogTitle'),
      filters: [
        { name: 'Text or JSON', extensions: ['txt', 'json'] },
        { name: 'Text', extensions: ['txt'] },
        { name: 'JSON', extensions: ['json'] },
      ],
    });
    if (!imported) return;

    try {
      const pack = createCustomPracticePackFromFile(imported, translate);
      const importedPackSummary = buildPracticeContentPackQualitySummary(pack, contentScenarioId, translate);
      const importPreset = resolveImportedPracticePackPreset(pack, translate);
      const importPresetLabel = getImportedPackPresetLabel(translate, importPreset.trainingMode);
      const recommendedModeLabel = getPackRecommendedModeLabel(translate, pack, importedPackSummary);
      const nextPracticeSettings = {
        ...practiceSettings,
        trainingMode: importPreset.trainingMode,
        contentMode: 'custom' as PracticeContentMode,
        selectedContentPackId: pack.id,
      };
      saveProgress({
        ...progress,
        practiceSettings: nextPracticeSettings,
        customPracticePacks: {
          ...(progress.customPracticePacks ?? {}),
          [pack.id]: pack,
        },
      });
      setImportStatus(translate('practice.importSuccess', {
        name: pack.name,
        words: importedPackSummary.estimatedWordsPerText,
        mode: recommendedModeLabel,
        preset: importPresetLabel,
      }));
    } catch (error) {
      setImportStatus(
        error instanceof Error
          ? localizePackImportError(translate, error.message)
          : translate('practice.importFailed'),
      );
    }
  }, [contentScenarioId, practiceSettings, progress, saveProgress, translate]);

  const handleDeleteCustomContent = useCallback((packId: string) => {
    if (!packId) return;
    const { [packId]: _removed, ...rest } = progress.customPracticePacks ?? {};
    const nextSelectedId = practiceSettings.selectedContentPackId === packId
      ? (Object.keys(rest)[0] ?? '')
      : practiceSettings.selectedContentPackId;
    const nextPracticeSettings = {
      ...practiceSettings,
      selectedContentPackId: nextSelectedId,
      contentMode: Object.keys(rest).length > 0 || practiceSettings.contentMode !== 'custom'
        ? practiceSettings.contentMode
        : ('adaptive-words' as PracticeContentMode),
    };

    saveProgress({
      ...progress,
      practiceSettings: nextPracticeSettings,
      customPracticePacks: rest,
    });
    setImportStatus(translate('practice.importDeleted'));
  }, [practiceSettings, progress, saveProgress, translate]);

  const handleContentPackAction = useCallback((guidedAction: PracticeContentPackQuickAction) => {
    if (!selectedContentPack) return;

    const applyCustomPackToMode = (
      targetMode: 'practice' | 'test' | 'survival' | 'flawless',
      options: {
        trainingMode?: 'normal' | 'rhythm';
        sprintDurationSeconds?: number;
      } = {},
    ) => {
      if (targetMode === 'practice') {
        applyPracticeContentPackSettings(
          savePracticeSetting,
          'custom',
          selectedContentPack.id,
          options.trainingMode,
        );
        switchMode('practice');
        return;
      }

      const { modeId, patch, routeMode } = buildModeContentPackPatch(targetMode, 'custom', selectedContentPack.id, {
        sprintDurationSeconds: options.sprintDurationSeconds,
      });
      saveModePracticeSettings(modeId, patch);
      switchMode(routeMode);
    };

    const applyBaseMaterialToMode = (
      targetMode: 'practice' | 'test' | 'survival' | 'flawless',
      options: {
        trainingMode?: 'normal' | 'rhythm';
        sprintDurationSeconds?: number;
      } = {},
    ) => {
      if (targetMode === 'practice') {
        applyPracticeContentPackSettings(
          savePracticeSetting,
          'adaptive-words',
          '',
          options.trainingMode,
        );
        switchMode('practice');
        return;
      }

      const { modeId, patch, routeMode } = buildModeContentPackPatch(targetMode, 'adaptive-words', '', {
        sprintDurationSeconds: options.sprintDurationSeconds,
      });
      saveModePracticeSettings(modeId, patch);
      switchMode(routeMode);
    };

    const { action } = guidedAction;
    if (action.kind === 'shorten-distance') {
      savePracticeSetting('trainingMode', 'rhythm');
      switchMode('practice');
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
  }, [saveModePracticeSettings, savePracticeSetting, selectedContentPack, switchMode]);

  return {
    handleContentPackAction,
    handleDeleteCustomContent,
    handleImportCustomContent,
    importStatus,
  };
}
