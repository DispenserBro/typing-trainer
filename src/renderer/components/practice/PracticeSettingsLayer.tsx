import type {
  PracticeContentMode,
  PracticeContentPack,
  PracticeContentPackPreflightSummary,
  PracticeContentPackQualitySummary,
  PracticeContentPackQuickAction,
} from '../../../shared/types';
import type {
  PracticeAdaptationFocus,
  PracticeAdaptationStrength,
  PracticeTrainingMode,
  SpeedUnit,
} from '../../../shared/types/settings';
import { PracticeSettingsModal } from './PracticeSettingsModal';

type PracticeSettingsLayerProps = {
  availableContentPacks: PracticeContentPack[];
  contentMode: PracticeContentMode;
  contentPackActionsDisabled: boolean;
  contentPackPreflight: PracticeContentPackPreflightSummary | null;
  contentPackSummary: PracticeContentPackQualitySummary | null;
  contentScenarioLabel: string;
  dailyGoalType: 'sessions' | 'minutes';
  dailyGoalValue: number;
  goalDisplay: number;
  importStatus: string | null;
  noStepBack: boolean;
  onClose: () => void;
  onContentModeChange: (value: PracticeContentMode) => void;
  onContentPackAction: (action: PracticeContentPackQuickAction) => void;
  onDailyGoalTypeChange: (value: 'sessions' | 'minutes') => void;
  onDailyGoalValueChange: (value: number) => void;
  onDeleteCustomContent: (packId: string) => void;
  onGoalSpeedChange: (value: number) => void;
  onImportCustomContent: () => void;
  onNoStepBackChange: (value: boolean) => void;
  onSelectedContentPackIdChange: (value: string) => void;
  onSmartAdaptationEnabledChange: (value: boolean) => void;
  onSmartAdaptationFocusChange: (value: PracticeAdaptationFocus) => void;
  onSmartAdaptationStrengthChange: (value: PracticeAdaptationStrength) => void;
  onTrainingModeChange: (value: PracticeTrainingMode) => void;
  open: boolean;
  selectedContentPack: PracticeContentPack | null;
  selectedContentPackId: string;
  smartAdaptationEnabled: boolean;
  smartAdaptationFocus: PracticeAdaptationFocus;
  smartAdaptationStrength: PracticeAdaptationStrength;
  speedLabel: string;
  trainingMode: PracticeTrainingMode;
  unit: SpeedUnit;
};

export function PracticeSettingsLayer(props: PracticeSettingsLayerProps) {
  return (
    <PracticeSettingsModal
      open={props.open}
      onClose={props.onClose}
      dailyGoalType={props.dailyGoalType}
      dailyGoalValue={props.dailyGoalValue}
      onDailyGoalTypeChange={props.onDailyGoalTypeChange}
      onDailyGoalValueChange={props.onDailyGoalValueChange}
      goalDisplay={props.goalDisplay}
      spdLabel={props.speedLabel}
      unit={props.unit}
      onGoalSpeedChange={props.onGoalSpeedChange}
      trainingMode={props.trainingMode}
      onTrainingModeChange={props.onTrainingModeChange}
      contentMode={props.contentMode}
      onContentModeChange={props.onContentModeChange}
      availableContentPacks={props.availableContentPacks}
      selectedContentPack={props.selectedContentPack}
      selectedContentPackId={props.selectedContentPackId}
      onSelectedContentPackIdChange={props.onSelectedContentPackIdChange}
      contentScenarioLabel={props.contentScenarioLabel}
      contentPackSummary={props.contentPackSummary}
      contentPackPreflight={props.contentPackPreflight}
      onContentPackAction={props.onContentPackAction}
      contentPackActionsDisabled={props.contentPackActionsDisabled}
      onImportCustomContent={props.onImportCustomContent}
      onDeleteCustomContent={props.onDeleteCustomContent}
      importStatus={props.importStatus}
      smartAdaptationEnabled={props.smartAdaptationEnabled}
      onSmartAdaptationEnabledChange={props.onSmartAdaptationEnabledChange}
      smartAdaptationStrength={props.smartAdaptationStrength}
      onSmartAdaptationStrengthChange={props.onSmartAdaptationStrengthChange}
      smartAdaptationFocus={props.smartAdaptationFocus}
      onSmartAdaptationFocusChange={props.onSmartAdaptationFocusChange}
      noStepBack={props.noStepBack}
      onNoStepBackChange={props.onNoStepBackChange}
    />
  );
}
