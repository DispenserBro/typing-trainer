import type { ReactNode } from 'react';
import { ResultCallout } from '../ResultCallout';
import { ResultFollowupActions } from '../ResultFollowupActions';
import { ResultSummaryPanel } from '../ResultSummaryPanel';
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
    <ResultSummaryPanel
      title={title}
      headline={<>{headline} {speedLabel}</>}
      summary={summaryLine}
      metrics={primaryMetrics}
      goals={goals}
      streaks={streaks}
      comparison={comparison}
      formatSpeed={formatSpeed}
      speedLabel={speedLabel}
    >
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
    </ResultSummaryPanel>
  );
}
