import { formatSpeed, speedLabel } from '../../../core/engine';
import {
  formatModeLabel,
  formatSessionTimestamp,
  type SessionHistoryItem,
} from '../../../core/stats/utils';

type StatsSessionHistoryListProps = {
  unit: 'wpm' | 'cpm' | 'cps';
  filteredSessionHistory: SessionHistoryItem[];
  selectedHistorySessionId: string;
  onSelectSession: (id: string) => void;
  getLayoutLabel: (layoutId: string) => string;
};

export function StatsSessionHistoryList({
  unit,
  filteredSessionHistory,
  selectedHistorySessionId,
  onSelectSession,
  getLayoutLabel,
}: StatsSessionHistoryListProps) {
  if (!filteredSessionHistory.length) {
    return <p style={{ opacity: 0.5 }}>По текущим фильтрам пока нет подходящих сессий.</p>;
  }

  return (
    <div className="stats-session-list">
      {filteredSessionHistory.slice(0, 20).map((item) => {
        const isActive = selectedHistorySessionId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={`stats-session-item${isActive ? ' active' : ''}`}
            onClick={() => onSelectSession(item.id)}
          >
            <div className="stats-session-item-top">
              <strong>{formatModeLabel(item.entry.mode)}</strong>
              <span>{formatSessionTimestamp(item.entry.date)}</span>
            </div>
            <div className="stats-session-item-meta">
              <span>{getLayoutLabel(item.layoutId)}</span>
              {item.entry.trainingMode && (
                <span>{item.entry.trainingMode === 'rhythm' ? 'Ритм' : 'Обычная'}</span>
              )}
            </div>
            <div className="stats-session-item-metrics">
              <b>{formatSpeed(item.entry.wpm, unit)} {speedLabel(unit)}</b>
              <b>{Math.round(item.entry.acc)}%</b>
            </div>
          </button>
        );
      })}
    </div>
  );
}


