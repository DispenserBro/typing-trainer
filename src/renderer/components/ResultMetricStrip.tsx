import {
  buildResultMetricStripViewModel,
  type ResultMetricItemViewModel,
  type ResultMetricStripVariant,
  type ResultMetricTone,
} from '../../core/result/metricStrip';
import {
  MetricStrip,
} from './ui/MetricStrip';

export type { ResultMetricTone };
export type ResultMetricItem = ResultMetricItemViewModel;

type ResultMetricStripProps = {
  metrics: ResultMetricItem[];
  className?: string;
  variant?: ResultMetricStripVariant;
};

export function ResultMetricStrip({
  className,
  metrics,
  variant = 'primary',
}: ResultMetricStripProps) {
  const viewModel = buildResultMetricStripViewModel({
    className,
    metrics,
    variant,
  });

  return (
    <MetricStrip
      metrics={viewModel.metrics}
      viewModel={viewModel}
    />
  );
}
