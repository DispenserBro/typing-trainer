import type { HeatmapMode } from './keyboardHeatmapUtils';
import { SegmentedControl } from '../ui/SegmentedControl';

export type KeyboardHeatmapControlsLabels = {
  ariaLabel: string;
  errors: string;
  slow: string;
};

type KeyboardHeatmapControlsProps = {
  labels: KeyboardHeatmapControlsLabels;
  mode: HeatmapMode;
  onChange: (mode: HeatmapMode) => void;
};

export function KeyboardHeatmapControls({ labels, mode, onChange }: KeyboardHeatmapControlsProps) {
  return (
    <SegmentedControl
      ariaLabel={labels.ariaLabel}
      value={mode}
      onChange={onChange}
      options={[
        { value: 'errors', label: labels.errors },
        { value: 'slow', label: labels.slow },
      ]}
    />
  );
}
