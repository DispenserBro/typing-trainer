import {
  buildMetricStripViewModel,
  type MetricStripViewModel,
  type ResultMetricItemViewModel,
  type ResultMetricTone,
} from '../../../core/result/metricStrip';

export type MetricStripTone = ResultMetricTone;
export type MetricStripItem = ResultMetricItemViewModel;

type MetricStripProps = {
  className?: string;
  detailClassName?: string;
  itemClassName?: string;
  labelClassName?: string;
  metrics: MetricStripItem[];
  valueClassName?: string;
  viewModel?: MetricStripViewModel;
};

export function MetricStrip({
  className,
  detailClassName,
  itemClassName,
  labelClassName,
  metrics,
  valueClassName,
  viewModel,
}: MetricStripProps) {
  const model = viewModel ?? buildMetricStripViewModel({
    className,
    detailClassName,
    itemClassName,
    labelClassName,
    metrics,
    valueClassName,
  });
  if (model.hidden) return null;

  return (
    <div className={model.className}>
      {model.metrics.map((metric) => (
        <div key={metric.id} className={model.itemClassName}>
          <span
            className={[
              model.valueClassName,
              metric.tone && metric.tone !== 'neutral' ? metric.tone : undefined,
            ].filter(Boolean).join(' ')}
          >
            {metric.value}
          </span>
          <span className={model.labelClassName}>{metric.label}</span>
          {metric.details?.map((detail, index) => (
            <span key={`${metric.id}-detail-${index}`} className={model.detailClassName}>
              {detail}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
