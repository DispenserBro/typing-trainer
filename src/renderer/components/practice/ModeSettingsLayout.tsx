import type { ReactNode } from 'react';
import { ModeQuickSettings } from './ModeQuickSettings';
import type {
  PracticeContentMode,
  PracticeContentPack,
  PracticeContentPackPreflightSummary,
  PracticeContentPackQualitySummary,
  PracticeContentPackQuickAction,
} from '../../../shared/types';

type ModeSettingsMetaItem = {
  id: string;
  label: string;
  icon?: ReactNode;
};

type ModeSettingsLayoutProps = {
  actionsDisabled: boolean;
  availableContentPacks: PracticeContentPack[];
  bestLabel: string;
  bestValue: string;
  contentMode: PracticeContentMode;
  contentModeLabel: string;
  contentPackPreflight: PracticeContentPackPreflightSummary | null;
  contentPackSummary: PracticeContentPackQualitySummary | null;
  extraControls?: ReactNode;
  leadingMetaItems?: ModeSettingsMetaItem[];
  onContentModeChange: (value: PracticeContentMode) => void;
  onContentPackAction: (guidedAction: PracticeContentPackQuickAction) => void;
  onSelectedContentPackIdChange: (value: string) => void;
  selectedContentPack: PracticeContentPack | null;
  selectedContentPackId: string;
  selectedContentPackName?: string | null;
};

export function ModeSettingsLayout({
  actionsDisabled,
  availableContentPacks,
  bestLabel,
  bestValue,
  contentMode,
  contentModeLabel,
  contentPackPreflight,
  contentPackSummary,
  extraControls,
  leadingMetaItems = [],
  onContentModeChange,
  onContentPackAction,
  onSelectedContentPackIdChange,
  selectedContentPack,
  selectedContentPackId,
  selectedContentPackName,
}: ModeSettingsLayoutProps) {
  const metaItems: ModeSettingsMetaItem[] = [
    ...leadingMetaItems,
    {
      id: 'content-mode',
      label: `${contentModeLabel}${selectedContentPackName ? ` · ${selectedContentPackName}` : ''}`,
    },
    {
      id: 'best',
      label: `${bestLabel}: ${bestValue}`,
    },
  ];

  return (
    <>
      <ModeQuickSettings
        contentMode={contentMode}
        selectedContentPackId={selectedContentPackId}
        availableContentPacks={availableContentPacks}
        selectedContentPack={selectedContentPack}
        contentPackSummary={contentPackSummary}
        contentPackPreflight={contentPackPreflight}
        onContentModeChange={onContentModeChange}
        onSelectedContentPackIdChange={onSelectedContentPackIdChange}
        onContentPackAction={onContentPackAction}
        actionsDisabled={actionsDisabled}
        extraControls={extraControls}
      />

      <div className="practice-stats-row">
        {metaItems.map((item) => (
          <div key={item.id} className="pstat daily-goal-row">
            {item.icon}
            <span className="daily-goal-label">{item.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}
