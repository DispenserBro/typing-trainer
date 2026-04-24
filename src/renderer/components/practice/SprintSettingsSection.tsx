import { Zap } from 'lucide-react';
import { ModeSettingsLayout } from './ModeSettingsLayout';
import type {
  PracticeContentMode,
  PracticeContentPack,
  PracticeContentPackQuickAction,
  PracticeContentPackPreflightSummary,
  PracticeContentPackQualitySummary,
} from '../../../shared/types';
import { SelectInput } from '../ui/SelectInput';

type SprintSettingsSectionProps = {
  actionsDisabled: boolean;
  availableContentPacks: PracticeContentPack[];
  contentMode: PracticeContentMode;
  contentModeLabel: string;
  duration: number;
  durationLabel: string;
  durationOptions: number[];
  durationValueLabel: (value: number) => string;
  bestLabel: string;
  bestValue: string;
  onContentModeChange: (value: PracticeContentMode) => void;
  onContentPackAction: (guidedAction: PracticeContentPackQuickAction) => void;
  onDurationChange: (value: number) => void;
  onSelectedContentPackIdChange: (value: string) => void;
  selectedContentPack: PracticeContentPack | null;
  selectedContentPackId: string;
  selectedContentPackName?: string | null;
  selectedContentPackPreflight: PracticeContentPackPreflightSummary | null;
  selectedContentPackSummary: PracticeContentPackQualitySummary | null;
};

export function SprintSettingsSection({
  actionsDisabled,
  availableContentPacks,
  bestLabel,
  bestValue,
  contentMode,
  contentModeLabel,
  duration,
  durationLabel,
  durationOptions,
  durationValueLabel,
  onContentModeChange,
  onContentPackAction,
  onDurationChange,
  onSelectedContentPackIdChange,
  selectedContentPack,
  selectedContentPackId,
  selectedContentPackName,
  selectedContentPackPreflight,
  selectedContentPackSummary,
}: SprintSettingsSectionProps) {
  return (
    <ModeSettingsLayout
      actionsDisabled={actionsDisabled}
      availableContentPacks={availableContentPacks}
      bestLabel={bestLabel}
      bestValue={bestValue}
      contentMode={contentMode}
      contentModeLabel={contentModeLabel}
      selectedContentPackId={selectedContentPackId}
      selectedContentPack={selectedContentPack}
      selectedContentPackName={selectedContentPackName}
      contentPackSummary={selectedContentPackSummary}
      contentPackPreflight={selectedContentPackPreflight}
      onContentModeChange={onContentModeChange}
      onSelectedContentPackIdChange={onSelectedContentPackIdChange}
      onContentPackAction={onContentPackAction}
      extraControls={(
        <div className="pstat daily-goal-row">
          <Zap size={16} />
          <span className="daily-goal-label">{durationLabel}</span>
          <SelectInput
            value={duration}
            disabled={actionsDisabled}
            onChange={(event) => onDurationChange(Number(event.target.value))}
          >
            {durationOptions.map((value) => (
              <option key={value} value={value}>{durationValueLabel(value)}</option>
            ))}
          </SelectInput>
        </div>
      )}
    />
  );
}
