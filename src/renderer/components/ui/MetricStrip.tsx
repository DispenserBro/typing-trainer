import type { ReactNode } from 'react';

export type MetricStripTone = 'good' | 'warn' | 'bad' | 'neutral';

export type MetricStripItem = {
  id: string;
  label: ReactNode;
  value: ReactNode;
  tone?: MetricStripTone;
  details?: ReactNode[];
};

type MetricStripProps = {
  className?: string;
  itemClassName?: string;
  labelClassName?: string;
  metrics: MetricStripItem[];
  valueClassName?: string;
};

export function MetricStrip({
  className,
  itemClassName,
  labelClassName,
  metrics,
  valueClassName,
}: MetricStripProps) {
  if (!metrics.length) return null;

  const rootClassName = ['ui-metric-strip', className].filter(Boolean).join(' ');
  const resolvedItemClassName = ['ui-metric-strip-item', itemClassName].filter(Boolean).join(' ');
  const resolvedLabelClassName = ['ui-metric-strip-label', labelClassName].filter(Boolean).join(' ');

  return (
    <div className={rootClassName}>
      {metrics.map((metric) => (
        <div key={metric.id} className={resolvedItemClassName}>
          <span
            className={[
              'ui-metric-strip-value',
              valueClassName,
              metric.tone && metric.tone !== 'neutral' ? metric.tone : undefined,
            ].filter(Boolean).join(' ')}
          >
            {metric.value}
          </span>
          <span className={resolvedLabelClassName}>{metric.label}</span>
          {metric.details?.map((detail, index) => (
            <span key={`${metric.id}-detail-${index}`} className={resolvedLabelClassName}>
              {detail}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
