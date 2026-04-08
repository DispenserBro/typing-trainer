import { ChevronDown, ChevronRight } from 'lucide-react';
import type { CharStat } from '../../../shared/types';
import { KeyboardHeatmap } from './KeyboardHeatmap';

type WorstKey = {
  ch: string;
  errRate: number;
  avgTime: number;
  total: number;
};

type HeatmapEntry = {
  ch: string;
  avg: number;
  bg: string;
};

type StatsKeysSectionProps = {
  expanded: boolean;
  onToggle: () => void;
  currentLayout: string;
  keyStats: Record<string, CharStat>;
  worstKeys: WorstKey[];
  heatmap: HeatmapEntry[];
};

export function StatsKeysSection({
  expanded,
  onToggle,
  currentLayout,
  keyStats,
  worstKeys,
  heatmap,
}: StatsKeysSectionProps) {
  return (
    <div className="card stats-section-card mt-16">
      <button
        type="button"
        className={`stats-section-toggle${expanded ? ' expanded' : ''}`}
        onClick={onToggle}
      >
        <div>
          <h4>Статистика по клавишам</h4>
          <p className="card-desc">Проблемные клавиши, локальная скорость и heatmap по текущей раскладке с учетом выбранных периода и режима.</p>
        </div>
        {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>

      {expanded && (
        <div className="stats-keys-layout">
          <div className="stats-keys-block">
            <h5>Топ-5 проблемных клавиш</h5>
            {worstKeys.length === 0 ? (
              <p className="smart-stats-empty">Пока нет данных</p>
            ) : (
              <div className="worst-keys-grid">
                {worstKeys.map(k => (
                  <div className="worst-key-card" key={k.ch}>
                    <span className="wk-char">{k.ch === ' ' ? '␣' : k.ch}</span>
                    <span className="wk-err">ош: {Math.round(k.errRate * 100)}%</span>
                    <span className="wk-time">{k.avgTime}мс</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="stats-keys-column">
            <div className="stats-keys-block">
              <h5>Скорость по клавишам</h5>
              <div className="keys-heatmap">
                {heatmap.map(h => (
                  <span key={h.ch} className="hm-key" style={{ background: h.bg }} title={`${h.ch}: ${h.avg}мс`}>
                    {h.ch}
                  </span>
                ))}
              </div>
            </div>

            <div className="stats-keys-heatmap-wrap">
              <KeyboardHeatmap layoutId={currentLayout} keyStats={keyStats} responsive />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
