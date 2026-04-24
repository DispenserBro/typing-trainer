import { Shield } from 'lucide-react';
import { ModeSettingsLayout } from './ModeSettingsLayout';
import type {
  PracticeContentMode,
  PracticeContentPack,
  PracticeContentPackQuickAction,
  PracticeContentPackPreflightSummary,
  PracticeContentPackQualitySummary,
} from '../../../shared/types';
import { SettingsToggle } from '../ui/SettingsToggle';

type ChallengeSettingsSectionProps = {
  actionsDisabled: boolean;
  availableContentPacks: PracticeContentPack[];
  bestLabel: string;
  bestValue: string;
  checked: boolean;
  contentMode: PracticeContentMode;
  contentModeLabel: string;
  flawlessToggleLabel: string;
  modeStatusLabel: string;
  onCheckedChange: (checked: boolean) => void;
  onContentModeChange: (value: PracticeContentMode) => void;
  onContentPackAction: (guidedAction: PracticeContentPackQuickAction) => void;
  onSelectedContentPackIdChange: (value: string) => void;
  selectedContentPack: PracticeContentPack | null;
  selectedContentPackId: string;
  selectedContentPackName?: string | null;
  selectedContentPackPreflight: PracticeContentPackPreflightSummary | null;
  selectedContentPackSummary: PracticeContentPackQualitySummary | null;
};

export function ChallengeSettingsSection({
  actionsDisabled,
  availableContentPacks,
  bestLabel,
  bestValue,
  checked,
  contentMode,
  contentModeLabel,
  flawlessToggleLabel,
  modeStatusLabel,
  onCheckedChange,
  onContentModeChange,
  onContentPackAction,
  onSelectedContentPackIdChange,
  selectedContentPack,
  selectedContentPackId,
  selectedContentPackName,
  selectedContentPackPreflight,
  selectedContentPackSummary,
}: ChallengeSettingsSectionProps) {
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
        <SettingsToggle
          className="mode-settings-extra-toggle"
          checked={checked}
          disabled={actionsDisabled}
          onChange={onCheckedChange}
          label={flawlessToggleLabel}
        />
      )}
      leadingMetaItems={[
        {
          id: 'mode-status',
          label: modeStatusLabel,
          icon: <Shield size={16} />,
        },
      ]}
    />
  );
}
