import type { ReactNode } from 'react';
import { ResultComparisonPanel } from '../ResultComparisonPanel';
import { ResultCallout } from '../ResultCallout';
import { ResultFollowupActions } from '../ResultFollowupActions';
import { ResultMetricStrip } from '../ResultMetricStrip';
import { ResultProgressMetrics } from '../ResultProgressMetrics';
import { ResultCardLayout } from '../ui/ResultCardLayout';
import type { ResultComparisonSummary, ModeFollowupRecommendation } from '../../../core/motivation/records';
import type { MotivationGoalSnapshot, MotivationStreakSnapshot } from '../../../core/motivation/progress';

type ModeResultMetric = {
  id: string;
  value: string | number;
  label: string;
  tone?: 'good' | 'warn' | 'bad' | 'neutral';
};

type ModeResultLayoutProps = {
  title: string;
  headline: string;
  speedLabel: string;
  summaryLine: ReactNode;
  primaryMetrics: ModeResultMetric[];
  goals: MotivationGoalSnapshot[];
  streaks: MotivationStreakSnapshot[];
  comparison: ResultComparisonSummary | null;
  formatSpeed: (value: number) => string;
  callout: { title: string; detail: string } | null;
  followupRecommendation: ModeFollowupRecommendation | null;
  onRetry: () => void;
  onFollowupAction: (() => void) | null;
  onToPractice: () => void;
  retryLabel: string;
  toPracticeLabel: string;
  showToPractice: boolean;
};

export function ModeResultLayout({
  callout,
  comparison,
  followupRecommendation,
  formatSpeed,
  goals,
  headline,
  onFollowupAction,
  onRetry,
  onToPractice,
  primaryMetrics,
  retryLabel,
  showToPractice,
  speedLabel,
  streaks,
  summaryLine,
  title,
  toPracticeLabel,
}: ModeResultLayoutProps) {
  return (
    <ResultCardLayout
      title={title}
      headline={<>{headline} {speedLabel}</>}
      summary={summaryLine}
    >
      <ResultMetricStrip metrics={primaryMetrics} />
      <ResultProgressMetrics
        metrics={[
          ...goals.map((goal) => ({
            id: goal.definition.id,
            title: goal.definition.title,
            value: goal.nextTarget != null
              ? `${Math.round(goal.current)} / ${goal.nextTarget}`
              : `${Math.round(goal.current)}`,
          })),
          ...streaks.map((streak) => ({
            id: streak.definition.id,
            title: streak.definition.title,
            value: streak.current,
            tone: streak.current > 0 ? 'good' as const : 'neutral' as const,
          })),
        ]}
      />
      {comparison ? (
        <ResultComparisonPanel
          comparison={comparison}
          formatSpeed={formatSpeed}
          speedLabel={speedLabel}
        />
      ) : null}
      {callout ? <ResultCallout title={callout.title} detail={callout.detail} /> : null}
      <ResultFollowupActions
        retryLabel={retryLabel}
        onRetry={onRetry}
        followupActionLabel={followupRecommendation?.actionLabel ?? null}
        onFollowupAction={onFollowupAction}
        showToPractice={showToPractice}
        onToPractice={onToPractice}
        toPracticeLabel={toPracticeLabel}
      />
    </ResultCardLayout>
  );
}
