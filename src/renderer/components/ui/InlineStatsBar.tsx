import type { ReactNode } from 'react';
import {
  buildCompactMetricStripViewModel,
  type CompactMetricStripItemInput,
  type CompactMetricStripViewModel,
} from '../../../core/result/metricStrip';

type InlineStatsBarItem = {
  className?: string;
  content: ReactNode;
  id: string;
};

type InlineStatsBarProps = {
  className?: string;
  compactItems?: CompactMetricStripItemInput[];
  items?: InlineStatsBarItem[];
  viewModel?: CompactMetricStripViewModel;
};

export function InlineStatsBar({
  className,
  compactItems,
  items,
  viewModel,
}: InlineStatsBarProps) {
  const model = viewModel ?? (
    compactItems
      ? buildCompactMetricStripViewModel({ className, items: compactItems })
      : null
  );
  if (model?.hidden) return null;

  if (model) {
    return (
      <div className={model.className}>
        {model.items.map((item) => (
          <div key={item.id} className={item.itemClassName}>
            <b>{item.value}</b>
            {item.label != null ? <> {item.label}</> : null}
            {item.detail != null ? <> <small className="speed-unit">{item.detail}</small></> : null}
          </div>
        ))}
      </div>
    );
  }

  const rootClassName = ['stats-bar', className].filter(Boolean).join(' ');

  return (
    <div className={rootClassName}>
      {(items ?? []).map((item) => (
        <div key={item.id} className={['metric', item.className].filter(Boolean).join(' ')}>
          {item.content}
        </div>
      ))}
    </div>
  );
}
