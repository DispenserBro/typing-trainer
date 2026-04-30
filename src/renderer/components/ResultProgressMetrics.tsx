import { buildResultProgressMetricStripViewModel } from '../../core/result/metricStrip';
import { MetricStrip } from './ui/MetricStrip';
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
  const viewModel = buildResultProgressMetricStripViewModel(metrics);

  return (
    <MetricStrip
      metrics={viewModel.metrics}
      viewModel={viewModel}
    />
  );
}
