import type { CSSProperties, RefObject } from 'react';
import {
  ROW_OFFSET_UNITS,
  getKeyStyle,
  type HeatmapKey,
  type HeatmapMode,
} from './keyboardHeatmapUtils';

type KeyboardHeatmapGridProps = {
  layoutId: string;
  responsive: boolean;
  heatmapWrapRef: RefObject<HTMLDivElement | null>;
  responsiveStyle?: CSSProperties;
  heatmapRows: HeatmapKey[][];
  mode: HeatmapMode;
};

export function KeyboardHeatmapGrid({
  layoutId,
  responsive,
  heatmapWrapRef,
  responsiveStyle,
  heatmapRows,
  mode,
}: KeyboardHeatmapGridProps) {
  return (
    <div
      ref={heatmapWrapRef}
      className={`keyboard-heatmap-wrap${responsive ? ' responsive' : ''}`}
    >
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
    </div>
  );
}
