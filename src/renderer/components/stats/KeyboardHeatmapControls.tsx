import type { HeatmapMode } from './keyboardHeatmapUtils';

type KeyboardHeatmapControlsProps = {
  mode: HeatmapMode;
  onChange: (mode: HeatmapMode) => void;
};

export function KeyboardHeatmapControls({ mode, onChange }: KeyboardHeatmapControlsProps) {
  return (
    <div className="seg-group" role="tablist" aria-label="Режим heatmap клавиатуры">
      <button
        type="button"
        className={`seg-btn${mode === 'errors' ? ' active' : ''}`}
        onClick={() => onChange('errors')}
      >
        Ошибки
      </button>
      <button
        type="button"
        className={`seg-btn${mode === 'slow' ? ' active' : ''}`}
        onClick={() => onChange('slow')}
      >
        Медленные
      </button>
    </div>
  );
}
