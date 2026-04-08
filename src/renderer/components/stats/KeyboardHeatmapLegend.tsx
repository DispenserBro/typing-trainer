import type { HeatmapMode } from './keyboardHeatmapUtils';

type RowSummary = {
  label: string;
  intensity: number;
  activeKeys: number;
};

type KeyboardHeatmapLegendProps = {
  mode: HeatmapMode;
  rowSummaries: RowSummary[];
};

export function KeyboardHeatmapLegend({ mode, rowSummaries }: KeyboardHeatmapLegendProps) {
  return (
    <>
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
  );
}
