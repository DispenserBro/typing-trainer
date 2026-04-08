import { useMemo, useRef, useState } from 'react';
import { getKeyboardRows } from '../../../core/keyboard/layout';
import { useKeyboardHeatmapLayout } from '../../hooks/stats/useKeyboardHeatmapLayout';
import {
  buildHeatmapKeys,
  buildRowSummaries,
  type HeatmapMode,
  type KeyboardHeatmapProps,
} from './keyboardHeatmapUtils';
import { KeyboardHeatmapControls } from './KeyboardHeatmapControls';
import { KeyboardHeatmapGrid } from './KeyboardHeatmapGrid';
import { KeyboardHeatmapLegend } from './KeyboardHeatmapLegend';

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
  const heatmapWrapRef = useRef<HTMLDivElement | null>(null);
  const rows = useMemo(() => getKeyboardRows(layoutId), [layoutId]);
  const heatmapRows = useMemo(
    () => buildHeatmapKeys(rows, keyStats, mode),
    [rows, keyStats, mode],
  );
  const rowSummaries = useMemo(() => buildRowSummaries(heatmapRows), [heatmapRows]);
  const hasAnyData = heatmapRows.some(row => row.some(key => key.hasData));
  const responsiveStyle = useKeyboardHeatmapLayout({
    responsive,
    rows,
    cardRef,
    heatmapWrapRef,
  });

  return (
    <div ref={cardRef} className={`keyboard-heatmap-card ${className}`.trim()}>
      <div className="keyboard-heatmap-head">
        <div>
          <h4>{title}</h4>
          <p className="card-desc">{description}</p>
        </div>
        {showControls && <KeyboardHeatmapControls mode={mode} onChange={setMode} />}
      </div>

      {!hasAnyData ? (
        <p className="keyboard-heatmap-empty">
          Пока недостаточно данных. Заверши несколько практик, чтобы увидеть раскладку по проблемным клавишам.
        </p>
      ) : (
        <>
          <KeyboardHeatmapGrid
            layoutId={layoutId}
            responsive={responsive}
            heatmapWrapRef={heatmapWrapRef}
            responsiveStyle={responsiveStyle}
            heatmapRows={heatmapRows}
            mode={mode}
          />
          <KeyboardHeatmapLegend mode={mode} rowSummaries={rowSummaries} />
        </>
      )}
    </div>
  );
}

