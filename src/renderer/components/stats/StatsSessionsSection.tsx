import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  type SessionHistoryItem,
  type ScopedRhythmSession,
} from '../../../core/stats/utils';
import { StatsSessionDetail } from './StatsSessionDetail';
import { StatsSessionHistoryList } from './StatsSessionHistoryList';
import { StatsSessionRhythmPanel } from './StatsSessionRhythmPanel';
import type { WorstKey } from './statsSessionTypes';

type StatsSessionsSectionProps = {
  expanded: boolean;
  onToggle: () => void;
  unit: 'wpm' | 'cpm' | 'cps';
  filteredSessionHistory: SessionHistoryItem[];
  selectedHistorySession: SessionHistoryItem | null;
  selectedHistoryRhythm: ScopedRhythmSession | null;
  displayedRhythmSession: ScopedRhythmSession | null;
  rhythmLabels: number[];
  rhythmData: number[];
  rhythmAverageLine: number[];
  rhythmWorstPoint: number;
  rhythmStableRun: number;
  selectedHistoryWorstKeys: WorstKey[];
  onSelectSession: (id: string) => void;
  getLayoutLabel: (layoutId: string) => string;
};

export function StatsSessionsSection({
  expanded,
  onToggle,
  unit,
  filteredSessionHistory,
  selectedHistorySession,
  selectedHistoryRhythm,
  displayedRhythmSession,
  rhythmLabels,
  rhythmData,
  rhythmAverageLine,
  rhythmWorstPoint,
  rhythmStableRun,
  selectedHistoryWorstKeys,
  onSelectSession,
  getLayoutLabel,
}: StatsSessionsSectionProps) {
  return (
    <div className="card stats-section-card mt-16">
      <button
        type="button"
        className={`stats-section-toggle${expanded ? ' expanded' : ''}`}
        onClick={onToggle}
      >
        <div>
          <h4>Сессии</h4>
          <p className="card-desc">Ритм последней сессии и история попыток с локальным разбором.</p>
        </div>
        {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>

      {expanded && (
        <>
          <StatsSessionRhythmPanel
            displayedRhythmSession={displayedRhythmSession}
            rhythmLabels={rhythmLabels}
            rhythmData={rhythmData}
            rhythmAverageLine={rhythmAverageLine}
            rhythmWorstPoint={rhythmWorstPoint}
            rhythmStableRun={rhythmStableRun}
          />

          <div className="stats-section-divider" />

          <div>
            <div className="stats-session-head">
              <div>
                <h4>История сессий</h4>
                <p className="card-desc">
                  Выбери конкретную попытку, чтобы посмотреть ее локальные проблемы и быстрый разбор.
                </p>
              </div>
            </div>

            {!filteredSessionHistory.length ? (
              <p style={{ opacity: 0.5 }}>По текущим фильтрам пока нет подходящих сессий.</p>
            ) : (
              <div className="stats-session-grid">
                <StatsSessionHistoryList
                  unit={unit}
                  filteredSessionHistory={filteredSessionHistory}
                  selectedHistorySessionId={selectedHistorySession?.id ?? ''}
                  onSelectSession={onSelectSession}
                  getLayoutLabel={getLayoutLabel}
                />

                <StatsSessionDetail
                  unit={unit}
                  selectedHistorySession={selectedHistorySession}
                  selectedHistoryRhythm={selectedHistoryRhythm}
                  displayedRhythmSession={displayedRhythmSession}
                  selectedHistoryWorstKeys={selectedHistoryWorstKeys}
                  getLayoutLabel={getLayoutLabel}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

