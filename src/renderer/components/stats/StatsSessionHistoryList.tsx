import type { StatsSessionHistoryListItemViewModel } from '../../../core/stats/viewModel';
import { EmptyStateNotice } from '../ui/EmptyStateNotice';

type StatsSessionHistoryListProps = {
  emptyLabel: string;
  items: StatsSessionHistoryListItemViewModel[];
  selectedHistorySessionId: string;
  onSelectSession: (id: string) => void;
};

export function StatsSessionHistoryList({
  emptyLabel,
  items,
  selectedHistorySessionId,
  onSelectSession,
}: StatsSessionHistoryListProps) {
  if (!items.length) {
    return <EmptyStateNotice text={emptyLabel} />;
  }

  return (
    <div className="stats-session-list">
      {items.map((item) => {
        const isActive = selectedHistorySessionId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={`stats-session-item${isActive ? ' active' : ''}`}
            onClick={() => onSelectSession(item.id)}
          >
            <div className="stats-session-item-top">
              <strong>{item.modeLabel}</strong>
              <span>{item.timestampLabel}</span>
            </div>
            <div className="stats-session-item-meta">
              <span>{item.layoutLabel}</span>
              {item.contentLabel && <span>{item.contentLabel}</span>}
            </div>
            <div className="stats-session-item-metrics">
              <b>{item.speedLabel}</b>
              <b>{item.accuracyLabel}</b>
            </div>
          </button>
        );
      })}
    </div>
  );
}


