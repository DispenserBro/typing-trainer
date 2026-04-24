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
import { EmptyStateNotice } from '../ui/EmptyStateNotice';
import { SectionHeader } from '../ui/SectionHeader';

export function KeyboardHeatmap({
  layoutId,
  keyStats,
  labels,
  title,
  description,
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
    () => buildHeatmapKeys(rows, keyStats, mode, labels),
    [rows, keyStats, mode, labels],
  );
  const rowSummaries = useMemo(() => buildRowSummaries(heatmapRows, labels), [heatmapRows, labels]);
  const hasAnyData = heatmapRows.some(row => row.some(key => key.hasData));
  const resolvedTitle = title ?? labels.title;
  const resolvedDescription = description ?? labels.description;
  const responsiveStyle = useKeyboardHeatmapLayout({
    responsive,
    rows,
    cardRef,
    heatmapWrapRef,
  });

  return (
    <div ref={cardRef} className={`keyboard-heatmap-card ${className}`.trim()}>
      <div className="keyboard-heatmap-head">
        <SectionHeader titleTag="h4" title={resolvedTitle} description={resolvedDescription} />
        {showControls && (
          <KeyboardHeatmapControls labels={labels.controls} mode={mode} onChange={setMode} />
        )}
      </div>

      {!hasAnyData ? (
        <EmptyStateNotice className="keyboard-heatmap-empty" text={labels.empty} />
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
          <KeyboardHeatmapLegend labels={labels.legend} mode={mode} rowSummaries={rowSummaries} />
        </>
      )}
    </div>
  );
}

