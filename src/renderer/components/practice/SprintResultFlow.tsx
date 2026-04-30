import { ModeResultLayout } from './ModeResultLayout';
import { ModeResultSummaryLine } from './ModeResultSummaryLine';
import type { TranslationParams } from '../../../shared/types';
import type { ResultComparisonSummary, ModeFollowupRecommendation } from '../../../core/motivation/records';
import type { MotivationGoalSnapshot, MotivationStreakSnapshot } from '../../../core/motivation/progress';
import { buildSprintResultPrimaryMetrics } from '../../../core/practice/modeResultMetrics';

type TranslateFn = (key: string, options?: TranslationParams) => string;

type SprintResultFlowProps = {
  activeSprintGoals: MotivationGoalSnapshot[];
  followupRecommendation: ModeFollowupRecommendation | null;
  formatSpeed: (value: number) => string;
  onFollowupAction: (() => void) | null;
  onRetry: () => void;
  onToPractice: () => void;
  result: {
    wpm: number;
    acc: number;
    elapsed: number;
    chars: number;
    errors: number;
  };
  resultCallout: { title: string; detail: string } | null;
  speedLabel: string;
  sprintResultComparison: ResultComparisonSummary | null;
  sprintStreaks: MotivationStreakSnapshot[];
  t: TranslateFn;
  trainingMaterialLabel: string;
};

export function SprintResultFlow({
  activeSprintGoals,
  followupRecommendation,
  formatSpeed,
  onFollowupAction,
  onRetry,
  onToPractice,
  result,
  resultCallout,
  speedLabel,
  sprintResultComparison,
  sprintStreaks,
  t,
  trainingMaterialLabel,
}: SprintResultFlowProps) {
  return (
    <ModeResultLayout
      title={t('sprint.resultTitle')}
      headline={formatSpeed(result.wpm)}
      speedLabel={speedLabel}
      summaryLine={(
        <ModeResultSummaryLine
          accuracy={result.acc}
          elapsed={result.elapsed}
          materialLabel={trainingMaterialLabel}
          materialTitle={t('sprint.material')}
          t={t}
        />
      )}
      primaryMetrics={buildSprintResultPrimaryMetrics(result, t)}
      goals={activeSprintGoals}
      streaks={sprintStreaks}
      comparison={sprintResultComparison}
      formatSpeed={formatSpeed}
      callout={resultCallout}
      followupRecommendation={followupRecommendation}
      onRetry={onRetry}
      onFollowupAction={onFollowupAction}
      onToPractice={onToPractice}
      retryLabel={t('common.retry')}
      toPracticeLabel={t('common.toPractice')}
      showToPractice={followupRecommendation?.actionMode !== 'practice'}
    />
  );
}
