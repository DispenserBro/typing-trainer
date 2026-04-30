import type { ReactNode } from 'react';
import type { ResultComparisonSummary } from '../../core/motivation/records';
import { hasResultComparison, ResultComparisonPanel } from './ResultComparisonPanel';
import { ResultMetricStrip, type ResultMetricItem } from './ResultMetricStrip';
import {
  hasResultMotivationProgressMetrics,
  ResultMotivationProgressMetrics,
  type ResultMotivationGoalMetric,
  type ResultMotivationStreakMetric,
} from './ResultMotivationProgressMetrics';
import { ResultCardLayout } from './ui/ResultCardLayout';

type ResultSummaryPanelProps = {
  children?: ReactNode;
  className?: string;
  comparison?: ResultComparisonSummary | null;
  formatSpeed: (value: number) => string;
  goals: ResultMotivationGoalMetric[];
  headline: ReactNode;
  headlineClassName?: string;
  metrics: ResultMetricItem[];
  metricClassName?: string;
  speedLabel: string;
  streaks: ResultMotivationStreakMetric[];
  summary?: ReactNode;
  summaryAs?: 'div' | 'p';
  summaryClassName?: string;
  title: ReactNode;
};

export function ResultSummaryPanel({
  children,
  className,
  comparison,
  formatSpeed,
  goals,
  headline,
  headlineClassName,
  metrics,
  metricClassName,
  speedLabel,
  streaks,
  summary,
  summaryAs,
  summaryClassName,
  title,
}: ResultSummaryPanelProps) {
  const hasPrimaryMetrics = metrics.length > 0;
  const hasProgressMetrics = hasResultMotivationProgressMetrics(goals, streaks);
  const hasComparisonMetrics = hasResultComparison(comparison);

  return (
    <ResultCardLayout
      className={className}
      headline={headline}
      headlineClassName={headlineClassName}
      summary={summary}
      summaryAs={summaryAs}
      summaryClassName={summaryClassName}
      title={title}
    >
      {hasPrimaryMetrics ? <ResultMetricStrip className={metricClassName} metrics={metrics} /> : null}
      {hasProgressMetrics ? <ResultMotivationProgressMetrics goals={goals} streaks={streaks} /> : null}
      {hasComparisonMetrics && comparison ? (
        <ResultComparisonPanel
          comparison={comparison}
          formatSpeed={formatSpeed}
          speedLabel={speedLabel}
        />
      ) : null}
      {children}
    </ResultCardLayout>
  );
}
