import type {
  StatsSessionDetailViewModel,
} from '../../../core/stats/viewModel';
import { KeyboardHeatmap } from './KeyboardHeatmap';
import { EmptyStateNotice } from '../ui/EmptyStateNotice';

type StatsSessionDetailProps = {
  detail: StatsSessionDetailViewModel;
};

export function StatsSessionDetail({
  detail,
}: StatsSessionDetailProps) {
  if (!detail.hasSelection) {
    return (
      <div className="stats-session-detail">
        <EmptyStateNotice text={detail.selectPromptLabel} />
      </div>
    );
  }

  return (
    <div className="stats-session-detail">
      <div className="stats-session-summary">
        {detail.summaryItems.map(item => (
          <div className="stats-rhythm-metric" key={item.id}>
            <span>{item.label}</span>
            <b>{item.value}</b>
          </div>
        ))}
      </div>

      {detail.keyboardHeatmap ? (
        <>
          <KeyboardHeatmap
            layoutId={detail.keyboardHeatmap.layoutId}
            keyStats={detail.keyboardHeatmap.keyStats}
            labels={detail.keyboardHeatmapLabels}
            showControls={false}
            initialMode="errors"
            className="keyboard-heatmap-compact"
          />

          <div className="card-like stats-session-worst">
            <h5>{detail.worstKeysTitle}</h5>
            {detail.selectedWorstKeyCards.length === 0 ? (
              <EmptyStateNotice className="smart-stats-empty" text={detail.noKeyDataLabel} />
            ) : (
              <div className="worst-keys-grid compact">
                {detail.selectedWorstKeyCards.map(key => (
                  <div className="worst-key-card compact" key={key.id}>
                    <span className="wk-char">{key.charLabel}</span>
                    <span className="wk-err">{key.errorLabel}</span>
                    <span className="wk-time">{key.timeLabel}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <EmptyStateNotice text={detail.noCharStatsLabel} />
      )}
    </div>
  );
}


