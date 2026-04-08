import type { SpeedUnit } from '../shared/types';

export function formatSpeed(wpm: number, unit: SpeedUnit): string {
  if (unit === 'cpm') return String(Math.round(wpm * 5));
  if (unit === 'cps') return (wpm * 5 / 60).toFixed(1);
  return String(Math.round(wpm));
}

export function speedLabel(unit: SpeedUnit): string {
  if (unit === 'cpm') return 'CPM';
  if (unit === 'cps') return 'CPS';
  return 'WPM';
}
