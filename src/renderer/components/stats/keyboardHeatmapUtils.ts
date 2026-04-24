import type { CSSProperties } from 'react';
import type { CharStat } from '../../../shared/types';

export type HeatmapMode = 'errors' | 'slow';

export type KeyboardHeatmapLabels = {
  title: string;
  description: string;
  empty: string;
  controls: {
    ariaLabel: string;
    errors: string;
    slow: string;
  };
  legend: {
    less: string;
    more: string;
  };
  rowLabels: {
    top: string;
    middle: string;
    bottom: string;
  };
  keyTitles: {
    errors: (key: string, value: number) => string;
    slow: (key: string, value: number) => string;
  };
};

export type KeyboardHeatmapProps = {
  layoutId: string;
  keyStats?: Record<string, CharStat>;
  labels: KeyboardHeatmapLabels;
  title?: string;
  description?: string;
  showControls?: boolean;
  initialMode?: HeatmapMode;
  className?: string;
  responsive?: boolean;
};

export type HeatmapKey = {
  key: string;
  metric: number;
  intensity: number;
  label: string;
  title: string;
  hasData: boolean;
};

export const ROW_OFFSET_UNITS = [0, 0.55, 1.1] as const;

export function normalizeKey(key: string) {
  return key.toLowerCase();
}

export function buildHeatmapKeys(
  rows: string[][],
  keyStats: Record<string, CharStat> | undefined,
  mode: HeatmapMode,
  labels: KeyboardHeatmapLabels,
) {
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
      : `${Math.round(entry.avgMs)} ms`;
    const title = mode === 'errors'
      ? labels.keyTitles.errors(entry.key, Math.round(entry.errRate * 100))
      : labels.keyTitles.slow(entry.key, Math.round(entry.avgMs));
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

export function buildRowSummaries(rows: HeatmapKey[][], labels: KeyboardHeatmapLabels) {
  return rows.map((row, index) => {
    const values = row.filter(key => key.hasData).map(key => key.intensity);
    const avgIntensity = values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 0;
    return {
      label: index === 0
        ? labels.rowLabels.top
        : index === 1
          ? labels.rowLabels.middle
          : labels.rowLabels.bottom,
      intensity: avgIntensity,
      activeKeys: values.length,
    };
  });
}

export function getKeyStyle(mode: HeatmapMode, intensity: number, hasData: boolean): CSSProperties {
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
