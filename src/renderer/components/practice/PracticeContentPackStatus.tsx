import type {
  PracticeContentPack,
  PracticeContentPackPreflightSummary,
  PracticeContentPackQualitySummary,
  PracticeContentPackQuickAction,
} from '../../../shared/types';
import { ContentPackPreflightNotice } from './ContentPackPreflightNotice';

type PracticeContentPackStatusProps = {
  contentPackPreflight: PracticeContentPackPreflightSummary | null;
  contentPackRecommendedModeLabel: string | null;
  contentPackRiskLabel: string | null;
  contentPackSummary: PracticeContentPackQualitySummary | null;
  contentScenarioLabel: string;
  contentMode: string;
  onContentPackAction: (action: PracticeContentPackQuickAction) => void;
  selectedContentPack: PracticeContentPack | null;
  sessionActive: boolean;
  translate: (key: string, params?: Record<string, string | number | null | undefined>) => string;
};

export function PracticeContentPackStatus({
  contentPackPreflight,
  contentPackRecommendedModeLabel,
  contentPackRiskLabel,
  contentPackSummary,
  contentScenarioLabel,
  contentMode,
  onContentPackAction,
  selectedContentPack,
  sessionActive,
  translate,
}: PracticeContentPackStatusProps) {
  if (contentMode !== 'custom' || !selectedContentPack || !contentPackSummary) {
    return null;
  }

  return (
    <div className="practice-content-pack-status">
      <div className="practice-stats-row">
        <div className="pstat daily-goal-row">
          <span className="daily-goal-label">
            {translate('practice.packLine', {
              name: selectedContentPack.name,
              kind: selectedContentPack.kind,
              words: contentPackSummary.estimatedWordsPerText,
            })}
          </span>
        </div>
        <div className="pstat daily-goal-row">
          <span className="daily-goal-label">
            {translate('practice.packRiskLine', {
              risk: contentPackRiskLabel,
              mode: contentPackRecommendedModeLabel,
            })}
          </span>
        </div>
      </div>
      {contentPackPreflight && (
        <ContentPackPreflightNotice
          preflight={contentPackPreflight}
          actionsDisabled={sessionActive}
          onContentPackAction={onContentPackAction}
        />
      )}
    </div>
  );
}
