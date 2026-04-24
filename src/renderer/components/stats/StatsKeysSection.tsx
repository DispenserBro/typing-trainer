import type { StatsKeysViewModel } from '../../../core/stats/viewModel';
import { EmptyStateNotice } from '../ui/EmptyStateNotice';
import { ExpandableSectionCard } from '../ui/ExpandableSectionCard';
import { KeyboardHeatmap } from './KeyboardHeatmap';

type StatsKeysSectionProps = {
  expanded: boolean;
  onToggle: () => void;
  keys: StatsKeysViewModel;
};

export function StatsKeysSection({
  expanded,
  onToggle,
  keys,
}: StatsKeysSectionProps) {
  return (
    <ExpandableSectionCard
      title={keys.title}
      description={keys.description}
      expanded={expanded}
      onToggle={onToggle}
    >
        <div className="stats-keys-layout">
          <div className="stats-keys-block">
            <h5>{keys.worstKeysTitle}</h5>
            {keys.worstKeyCards.length === 0 ? (
              <EmptyStateNotice className="smart-stats-empty" text={keys.worstKeysEmptyLabel} />
            ) : (
              <div className="worst-keys-grid">
                {keys.worstKeyCards.map(key => (
                  <div className="worst-key-card" key={key.id}>
                    <span className="wk-char">{key.charLabel}</span>
                    <span className="wk-err">{key.errorLabel}</span>
                    <span className="wk-time">{key.timeLabel}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="stats-keys-column">
            <div className="stats-keys-block">
              <h5>{keys.speedByKeyTitle}</h5>
              <div className="keys-heatmap">
                {keys.heatmap.map(h => (
                  <span key={h.ch} className="hm-key" style={{ background: h.bg }} title={h.titleLabel}>
                    {h.ch}
                  </span>
                ))}
              </div>
            </div>

            <div className="stats-keys-heatmap-wrap">
              <KeyboardHeatmap
                labels={keys.keyboardHeatmapLabels}
                layoutId={keys.currentLayout}
                keyStats={keys.keyStats}
                responsive
              />
            </div>
          </div>
        </div>
    </ExpandableSectionCard>
  );
}
