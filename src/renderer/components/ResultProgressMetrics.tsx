import { ResultMetricStrip } from './ResultMetricStrip';
import type { ResultMetricTone } from './ResultMetricStrip';

type ResultProgressMetric = {
  id: string;
  title: string;
  value: string | number;
  tone?: ResultMetricTone;
};

type ResultProgressMetricsProps = {
  metrics: ResultProgressMetric[];
};

export function ResultProgressMetrics({ metrics }: ResultProgressMetricsProps) {
  return (
    <ResultMetricStrip
      metrics={metrics.map((metric) => ({
        id: metric.id,
        label: metric.title,
        value: metric.value,
        tone: metric.tone,
      }))}
    />
  );
}
