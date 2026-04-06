import { useMemo, useRef, useState, useLayoutEffect, type CSSProperties } from 'react';
import type { CharStat } from '../../shared/types';
import { getKeyboardRows } from '../keyboardLayout';

type HeatmapMode = 'errors' | 'slow';

type KeyboardHeatmapProps = {
  layoutId: string;
  keyStats?: Record<string, CharStat>;
  title?: string;
  description?: string;
  showControls?: boolean;
  initialMode?: HeatmapMode;
  className?: string;
  responsive?: boolean;
};

type HeatmapKey = {
  key: string;
  metric: number;
  intensity: number;
  label: string;
  title: string;
  hasData: boolean;
};

const ROW_LABELS = ['Верхний ряд', 'Средний ряд', 'Нижний ряд'] as const;
const ROW_OFFSET_UNITS = [0, 0.55, 1.1] as const;

function normalizeKey(key: string) {
  return key.toLowerCase();
}

function buildHeatmapKeys(rows: string[][], keyStats: Record<string, CharStat> | undefined, mode: HeatmapMode) {
  const metrics: number[] = [];
  const byRow = rows.map(row => row.map((key) => {
    const stat = keyStats?.[normalizeKey(key)];
    const total = (stat?.hits ?? 0) + (stat?.misses ?? 0);
    const avgMs = stat && stat.hits > 0 ? stat.totalTime / stat.hits : 0;
    const errRate = total > 0 ? stat!.misses / total : 0;
    const metric = mode === 'errors' ? errRate : avgMs;
    const hasData = mode === 'errors' ? total > 0 : (stat?.hits ?? 0) > 0;
    if (hasData && metric > 0) metrics.push(metric);
    return {
      key,
      metric,
      avgMs,
      errRate,
      total,
      hasData,
    };
  }));

  const maxMetric = metrics.length ? Math.max(...metrics) : 0;

  return byRow.map((row) => row.map<HeatmapKey>((entry) => {
    const intensity = entry.hasData && maxMetric > 0
      ? Math.max(0, Math.min(1, entry.metric / maxMetric))
      : 0;
    const label = mode === 'errors'
      ? `${Math.round(entry.errRate * 100)}%`
      : `${Math.round(entry.avgMs)}мс`;
    const title = mode === 'errors'
      ? `${entry.key}: ${Math.round(entry.errRate * 100)}% ошибок`
      : `${entry.key}: ${Math.round(entry.avgMs)}мс`;
    return {
      key: entry.key,
      metric: entry.metric,
      intensity,
      label,
      title,
      hasData: entry.hasData,
    };
  }));
}

function buildRowSummaries(rows: HeatmapKey[][]) {
  return rows.map((row, index) => {
    const values = row.filter(key => key.hasData).map(key => key.intensity);
    const avgIntensity = values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 0;
    return {
      label: ROW_LABELS[index] ?? `Ряд ${index + 1}`,
      intensity: avgIntensity,
      activeKeys: values.length,
    };
  });
}

function getKeyStyle(mode: HeatmapMode, intensity: number, hasData: boolean) {
  if (!hasData) {
    return {
      background: 'var(--surface2)',
      borderColor: 'var(--surface3)',
      color: 'var(--subtext)',
    };
  }

  const alpha = 0.14 + intensity * 0.54;
  const borderAlpha = 0.2 + intensity * 0.48;
  const color = mode === 'errors' ? '255, 92, 92' : '232, 117, 26';

  return {
    background: `rgba(${color}, ${alpha})`,
    borderColor: `rgba(${color}, ${borderAlpha})`,
    color: 'var(--text)',
    boxShadow: intensity > 0.75 ? `0 0 0 1px rgba(${color}, 0.12)` : 'none',
  };
}

export function KeyboardHeatmap({
  layoutId,
  keyStats,
  title = 'Heatmap клавиатуры',
  description = 'Цвет показывает, где чаще ошибаешься или теряешь темп.',
  showControls = true,
  initialMode = 'errors',
  className = '',
  responsive = false,
}: KeyboardHeatmapProps) {
  const [mode, setMode] = useState<HeatmapMode>(initialMode);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [responsiveStyle, setResponsiveStyle] = useState<CSSProperties | undefined>(undefined);
  const rows = useMemo(() => getKeyboardRows(layoutId), [layoutId]);
  const heatmapRows = useMemo(
    () => buildHeatmapKeys(rows, keyStats, mode),
    [rows, keyStats, mode],
  );
  const rowSummaries = useMemo(() => buildRowSummaries(heatmapRows), [heatmapRows]);
  const globalMaxIntensity = useMemo(() => {
    const values = heatmapRows.flatMap(row => row.filter(key => key.hasData).map(key => key.metric));
    return values.length ? Math.max(...values) : 0;
  }, [heatmapRows]);
  const hasAnyData = heatmapRows.some(row => row.some(key => key.hasData));

  useLayoutEffect(() => {
    if (!responsive) {
      setResponsiveStyle(undefined);
      return undefined;
    }

    const node = cardRef.current;
    if (!node) return undefined;

    const applyResponsiveScale = () => {
      const width = node.clientWidth;
      if (!width) return;

      const padding = Math.max(8, Math.min(12, Math.round(width * 0.012)));
      const gap = Math.max(3, Math.min(6, Math.round(width * 0.004)));
      const stackGap = Math.max(6, Math.min(8, Math.round(width * 0.006)));
      const usableWidth = Math.max(220, width - padding * 2);
      const keyWidth = Math.max(26, Math.min(58, Math.floor((usableWidth - gap * 11) / 12)));

      setResponsiveStyle({
        ['--keyboard-heatmap-key-w' as string]: `${keyWidth}px`,
        ['--keyboard-heatmap-key-h' as string]: `${Math.round(keyWidth * 0.94)}px`,
        ['--keyboard-heatmap-gap' as string]: `${gap}px`,
        padding: `${padding}px`,
        gap: `${stackGap}px`,
      });
    };

    applyResponsiveScale();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => applyResponsiveScale());
      observer.observe(node);
    } else {
      window.addEventListener('resize', applyResponsiveScale);
    }

    return () => {
      observer?.disconnect();
      if (!observer) window.removeEventListener('resize', applyResponsiveScale);
    };
  }, [responsive]);

  return (
    <div ref={cardRef} className={`keyboard-heatmap-card ${className}`.trim()}>
      <div className="keyboard-heatmap-head">
        <div>
          <h4>{title}</h4>
          <p className="card-desc">{description}</p>
        </div>
        {showControls && (
          <div className="seg-group" role="tablist" aria-label="Режим heatmap клавиатуры">
            <button
              type="button"
              className={`seg-btn${mode === 'errors' ? ' active' : ''}`}
              onClick={() => setMode('errors')}
            >
              Ошибки
            </button>
            <button
              type="button"
              className={`seg-btn${mode === 'slow' ? ' active' : ''}`}
              onClick={() => setMode('slow')}
            >
              Медленные
            </button>
          </div>
        )}
      </div>

      {!hasAnyData ? (
        <p className="keyboard-heatmap-empty">
          Пока недостаточно данных. Заверши несколько практик, чтобы увидеть раскладку по проблемным клавишам.
        </p>
      ) : (
        <>
          <div className="keyboard-heatmap" style={responsiveStyle}>
            {heatmapRows.map((row, rowIndex) => (
              <div
                key={`${layoutId}-${rowIndex}`}
                className="keyboard-heatmap-row"
                style={{ ['--row-offset' as string]: `${ROW_OFFSET_UNITS[rowIndex] ?? 0}` }}
              >
                {row.map((key) => (
                  <div
                    key={key.key}
                    className={`keyboard-heatmap-key${key.hasData ? '' : ' empty'}`}
                    style={getKeyStyle(mode, key.intensity, key.hasData)}
                    title={key.title}
                  >
                    <span className="keyboard-heatmap-keycap">{key.key}</span>
                    <span className="keyboard-heatmap-value">{key.hasData ? key.label : '—'}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="keyboard-heatmap-legend">
            <span>Меньше</span>
            <div className={`keyboard-heatmap-gradient ${mode}`}>
              <span />
            </div>
            <span>Больше</span>
          </div>

          <div className="keyboard-heatmap-zones">
            {rowSummaries.map((row) => (
              <div key={row.label} className="keyboard-heatmap-zone">
                <span>{row.label}</span>
                <div className="keyboard-heatmap-zone-bar">
                  <i style={{ width: `${Math.round(row.intensity * 100)}%` }} />
                </div>
                <b>{row.activeKeys || 0}</b>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
