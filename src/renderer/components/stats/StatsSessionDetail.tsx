import type { CharStat } from '../../../shared/types';
import { formatSpeed, speedLabel } from '../../../core/engine';
import {
  formatModeLabel,
  type ScopedRhythmSession,
  type SessionHistoryItem,
} from '../../../core/stats/utils';
import { KeyboardHeatmap } from './KeyboardHeatmap';
import type { WorstKey } from './statsSessionTypes';

type StatsSessionDetailProps = {
  unit: 'wpm' | 'cpm' | 'cps';
  selectedHistorySession: SessionHistoryItem | null;
  selectedHistoryRhythm: ScopedRhythmSession | null;
  displayedRhythmSession: ScopedRhythmSession | null;
  selectedHistoryWorstKeys: WorstKey[];
  getLayoutLabel: (layoutId: string) => string;
};

export function StatsSessionDetail({
  unit,
  selectedHistorySession,
  selectedHistoryRhythm,
  displayedRhythmSession,
  selectedHistoryWorstKeys,
  getLayoutLabel,
}: StatsSessionDetailProps) {
  if (!selectedHistorySession) {
    return (
      <div className="stats-session-detail">
        <p style={{ opacity: 0.5 }}>Выбери сессию слева.</p>
      </div>
    );
  }

  return (
    <div className="stats-session-detail">
      <div className="stats-session-summary">
        <div className="stats-rhythm-metric">
          <span>Режим</span>
          <b>{formatModeLabel(selectedHistorySession.entry.mode)}</b>
        </div>
        <div className="stats-rhythm-metric">
          <span>Раскладка</span>
          <b>{getLayoutLabel(selectedHistorySession.layoutId)}</b>
        </div>
        <div className="stats-rhythm-metric">
          <span>Скорость</span>
          <b>{formatSpeed(selectedHistorySession.entry.wpm, unit)} {speedLabel(unit)}</b>
        </div>
        <div className="stats-rhythm-metric">
          <span>Точность</span>
          <b>{Math.round(selectedHistorySession.entry.acc)}%</b>
        </div>
        {selectedHistoryRhythm && !displayedRhythmSession && (
          <>
            <div className="stats-rhythm-metric">
              <span>Ритм</span>
              <b>{Math.round(selectedHistoryRhythm.session.rhythmScore)}%</b>
            </div>
            <div className="stats-rhythm-metric">
              <span>Худший провал</span>
              <b>{Math.round(selectedHistoryRhythm.session.worstInterval)}мс</b>
            </div>
          </>
        )}
      </div>

      {selectedHistorySession.entry.charStats ? (
        <>
          <KeyboardHeatmap
            layoutId={selectedHistorySession.layoutId}
            keyStats={selectedHistorySession.entry.charStats as Record<string, CharStat>}
            title="Heatmap сессии"
            description="Локальная картина по этой попытке."
            showControls={false}
            initialMode="errors"
            className="keyboard-heatmap-compact"
          />

          <div className="card-like stats-session-worst">
            <h5>Проблемные клавиши сессии</h5>
            {selectedHistoryWorstKeys.length === 0 ? (
              <p className="smart-stats-empty">Для этой попытки пока нет детальных клавишных данных.</p>
            ) : (
              <div className="worst-keys-grid compact">
                {selectedHistoryWorstKeys.map(k => (
                  <div className="worst-key-card compact" key={k.ch}>
                    <span className="wk-char">{k.ch === ' ' ? '␣' : k.ch}</span>
                    <span className="wk-err">ош: {Math.round(k.errRate * 100)}%</span>
                    <span className="wk-time">{k.avgTime}мс</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <p style={{ opacity: 0.5 }}>
          Для этой сессии нет детальных `charStats`, поэтому доступен только общий разбор.
        </p>
      )}
    </div>
  );
}


