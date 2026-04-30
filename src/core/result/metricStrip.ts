export type ResultMetricTone = 'good' | 'warn' | 'bad' | 'neutral';

export type ResultMetricPrimitive = string | number;

export type ResultMetricItemViewModel = {
  details?: ResultMetricPrimitive[];
  id: string;
  label: ResultMetricPrimitive;
  tone?: ResultMetricTone;
  value: ResultMetricPrimitive;
};

export type ResultProgressMetricInput = {
  id: string;
  progressPercent?: number | null;
  title: ResultMetricPrimitive;
  tone?: ResultMetricTone;
  value: ResultMetricPrimitive;
};

export type ResultMetricStripVariant = 'primary' | 'secondary';

export type MetricStripViewModel = {
  className: string;
  detailClassName: string;
  hidden: boolean;
  itemClassName: string;
  labelClassName: string;
  metrics: ResultMetricItemViewModel[];
  valueClassName: string;
};

function joinClassNames(items: Array<string | null | undefined | false>) {
  return items.filter(Boolean).join(' ');
}

function normalizeProgressPercent(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function buildMetricStripViewModel({
  className,
  detailClassName,
  itemClassName,
  labelClassName,
  metrics,
  valueClassName,
}: {
  className?: string;
  detailClassName?: string;
  itemClassName?: string;
  labelClassName?: string;
  metrics: ResultMetricItemViewModel[];
  valueClassName?: string;
}): MetricStripViewModel {
  return {
    className: joinClassNames(['ui-metric-strip', className]),
    detailClassName: joinClassNames(['ui-metric-strip-detail', detailClassName ?? labelClassName]),
    hidden: metrics.length === 0,
    itemClassName: joinClassNames(['ui-metric-strip-item', itemClassName]),
    labelClassName: joinClassNames(['ui-metric-strip-label', labelClassName]),
    metrics,
    valueClassName: joinClassNames(['ui-metric-strip-value', valueClassName]),
  };
}

export function buildResultMetricStripViewModel({
  className,
  metrics,
  variant = 'primary',
}: {
  className?: string;
  metrics: ResultMetricItemViewModel[];
  variant?: ResultMetricStripVariant;
}): MetricStripViewModel {
  return buildMetricStripViewModel({
    className: joinClassNames([
      'result-metrics',
      variant === 'secondary' ? 'result-metrics--secondary' : undefined,
      className,
    ]),
    detailClassName: 'result-metric-detail',
    itemClassName: 'result-metric',
    labelClassName: 'result-metric-label',
    metrics,
    valueClassName: 'result-metric-value',
  });
}

export function buildResultProgressMetricItems(metrics: ResultProgressMetricInput[]): ResultMetricItemViewModel[] {
  return metrics.map((metric) => {
    const progressPercent = normalizeProgressPercent(metric.progressPercent);
    return {
      id: metric.id,
      label: metric.title,
      value: metric.value,
      tone: metric.tone,
      details: progressPercent == null ? undefined : [`${progressPercent}%`],
    };
  });
}

export function buildResultProgressMetricStripViewModel(metrics: ResultProgressMetricInput[]) {
  return buildResultMetricStripViewModel({
    className: 'result-progress-metrics',
    metrics: buildResultProgressMetricItems(metrics),
    variant: 'secondary',
  });
}
