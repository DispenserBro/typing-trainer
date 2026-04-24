import {
  MetricStrip,
  type MetricStripItem,
  type MetricStripTone,
} from './ui/MetricStrip';

export type ResultMetricTone = MetricStripTone;
export type ResultMetricItem = MetricStripItem;

type ResultMetricStripProps = {
  metrics: ResultMetricItem[];
  className?: string;
};

export function ResultMetricStrip({ className, metrics }: ResultMetricStripProps) {
  return (
    <MetricStrip
      className={['result-metrics', className].filter(Boolean).join(' ')}
      itemClassName="result-metric"
      labelClassName="result-metric-label"
      metrics={metrics}
      valueClassName="result-metric-value"
    />
  );
}
