import type { ReactNode } from 'react';
import type {
  PracticeContentMode,
  PracticeContentPack,
  PracticeContentPackPreflightSummary,
  PracticeContentPackQualitySummary,
  PracticeContentPackQuickAction,
} from '../../../shared/types';
import { useI18n } from '../../contexts/I18nContext';
import { usePracticeContentModeLabels } from '../../hooks/practice/usePracticeContentModeLabels';
import { SelectInput } from '../ui/SelectInput';
import {
  getPackFitMessage,
  getPackRecommendedModeLabel,
  getPackRecommendationReason,
  getPackRepetitionRiskLabel,
} from './contentPackSummaryI18n';
import { ContentPackPreflightNotice } from './ContentPackPreflightNotice';

type ModeQuickSettingsProps = {
  contentMode: PracticeContentMode;
  selectedContentPackId: string;
  availableContentPacks: PracticeContentPack[];
  selectedContentPack?: PracticeContentPack | null;
  contentPackSummary?: PracticeContentPackQualitySummary | null;
  contentPackPreflight?: PracticeContentPackPreflightSummary | null;
  onContentModeChange: (value: PracticeContentMode) => void;
  onSelectedContentPackIdChange: (value: string) => void;
  onContentPackAction?: (action: PracticeContentPackQuickAction) => void;
  actionsDisabled?: boolean;
  extraControls?: ReactNode;
};

export function ModeQuickSettings({
  contentMode,
  selectedContentPackId,
  availableContentPacks,
  selectedContentPack,
  contentPackSummary,
  contentPackPreflight,
  onContentModeChange,
  onSelectedContentPackIdChange,
  onContentPackAction,
  actionsDisabled = false,
  extraControls,
}: ModeQuickSettingsProps) {
  const { t } = useI18n();
  const contentModeLabels = usePracticeContentModeLabels({ customLabel: 'short' });
  const repetitionRiskLabel = contentPackSummary && selectedContentPack
    ? getPackRepetitionRiskLabel(t, contentPackSummary.repetitionRisk).toLowerCase()
    : null;
  const recommendedModeLabel = contentPackSummary && selectedContentPack
    ? getPackRecommendedModeLabel(t, selectedContentPack, contentPackSummary)
    : null;
  const fitMessage = contentPackSummary
    ? getPackFitMessage(t, contentPackSummary)
    : null;
  const recommendationReason = contentPackSummary && selectedContentPack
    ? getPackRecommendationReason(t, selectedContentPack, contentPackSummary)
    : null;

  return (
    <>
      <div className="practice-stats-row">
        <div className="pstat daily-goal-row">
          <span className="daily-goal-label">{t('practice.quickSettings.material')}</span>
          <SelectInput
            value={contentMode}
            onChange={(event) => onContentModeChange(event.target.value as PracticeContentMode)}
          >
            {Object.entries(contentModeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </SelectInput>
        </div>
        {contentMode === 'custom' && (
          <div className="pstat daily-goal-row">
            <span className="daily-goal-label">{t('practice.quickSettings.pack')}</span>
            <SelectInput
              value={selectedContentPackId}
              onChange={(event) => onSelectedContentPackIdChange(event.target.value)}
            >
              {availableContentPacks.map((pack) => (
                <option key={pack.id} value={pack.id}>{pack.name}</option>
              ))}
            </SelectInput>
          </div>
        )}
        {extraControls}
      </div>
      {contentMode === 'custom' && selectedContentPack && contentPackSummary && (
        <div className="practice-stats-row">
          <div className="pstat daily-goal-row">
            <span className="daily-goal-label">
              {selectedContentPack.kind} · {contentPackSummary.itemCount} {t('practice.quickSettings.itemsShort')} · ~{contentPackSummary.estimatedWordsPerText} {t('practice.quickSettings.wordsShort')}
            </span>
          </div>
          <div className="pstat daily-goal-row">
            <span className="daily-goal-label">
              {t('practice.quickSettings.repetition')}: {repetitionRiskLabel} · {t('practice.quickSettings.bestFor')}: {recommendedModeLabel}
            </span>
          </div>
        </div>
      )}
      {contentMode === 'custom' && contentPackSummary && (
        <p className="card-desc practice-pack-fit-summary">
          {fitMessage} {recommendationReason}
        </p>
      )}
      {contentMode === 'custom' && contentPackPreflight && (
        <ContentPackPreflightNotice
          preflight={contentPackPreflight}
          actionsDisabled={actionsDisabled}
          onContentPackAction={onContentPackAction}
        />
      )}
    </>
  );
}
