import { ModeResultLayout } from './ModeResultLayout';
import { ModeResultSummaryLine } from './ModeResultSummaryLine';
import type { TranslationParams } from '../../../shared/types';
import type { ResultComparisonSummary, ModeFollowupRecommendation } from '../../../core/motivation/records';
import type { MotivationGoalSnapshot, MotivationStreakSnapshot } from '../../../core/motivation/progress';
import { buildChallengeResultPrimaryMetrics } from '../../../core/practice/modeResultMetrics';

type TranslateFn = (key: string, options?: TranslationParams) => string;

type ChallengeResultFlowProps = {
  activeGoals: MotivationGoalSnapshot[];
  activeStreaks: MotivationStreakSnapshot[];
  allowedErrors: number;
  attemptReserveLabel: string;
  challengeCallout: { title: string; detail: string } | null;
  failureTitle: string;
  followupRecommendation: ModeFollowupRecommendation | null;
  formatSpeed: (value: number) => string;
  livesLeftLabel: string;
  onFollowupAction: (() => void) | null;
  onRetry: () => void;
  onToPractice: () => void;
  result: {
    passed: boolean;
    wpm: number;
    acc: number;
    elapsed: number;
    chars: number;
    errors: number;
    livesLeft: number;
  };
  resultComparison: ResultComparisonSummary | null;
  speedLabel: string;
  successTitle: string;
  t: TranslateFn;
  trainingMaterialLabel: string;
};

export function ChallengeResultFlow({
  activeGoals,
  activeStreaks,
  allowedErrors,
  attemptReserveLabel,
  challengeCallout,
  failureTitle,
  followupRecommendation,
  formatSpeed,
  livesLeftLabel,
  onFollowupAction,
  onRetry,
  onToPractice,
  result,
  resultComparison,
  speedLabel,
  successTitle,
  t,
  trainingMaterialLabel,
}: ChallengeResultFlowProps) {
  return (
    <ModeResultLayout
      title={result.passed ? successTitle : failureTitle}
      headline={formatSpeed(result.wpm)}
      speedLabel={speedLabel}
      summaryLine={(
        <ModeResultSummaryLine
          accuracy={result.acc}
          elapsed={result.elapsed}
          materialLabel={trainingMaterialLabel}
          materialTitle={t('survival.material')}
          t={t}
        />
      )}
      primaryMetrics={buildChallengeResultPrimaryMetrics({
        allowedErrors,
        attemptReserveLabel,
        livesLeftLabel,
        result,
        translate: t,
      })}
      goals={activeGoals}
      streaks={activeStreaks}
      comparison={resultComparison}
      formatSpeed={formatSpeed}
      callout={challengeCallout}
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
