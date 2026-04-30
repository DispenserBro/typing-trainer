import type { TranslationParams } from '../../shared/types';
import type { ResultComparisonSummary } from './records';

type TranslateFn = (key: string, params?: TranslationParams) => string;

export type ResultComparisonMetricTone = 'good' | 'bad' | 'neutral';

export type ResultComparisonMetricItemViewModel = {
  id: string;
  label: string;
  value: string;
  tone?: ResultComparisonMetricTone;
  details: string[];
};

function getComparisonMetricTone(tone: 'up' | 'down' | 'flat'): ResultComparisonMetricTone | undefined {
  if (tone === 'up') return 'good';
  if (tone === 'down') return 'bad';
  return undefined;
}

export function hasResultComparison(comparison: ResultComparisonSummary | null | undefined) {
  return Boolean(comparison?.previousAttempt || comparison?.recentBest);
}

export function buildResultComparisonMetricItems({
  comparison,
  formatShortDate,
  formatSpeed,
  speedLabel,
  translate,
}: {
  comparison: ResultComparisonSummary;
  formatShortDate: (date: string) => string;
  formatSpeed: (value: number) => string;
  speedLabel: string;
  translate: TranslateFn;
}): ResultComparisonMetricItemViewModel[] {
  if (!hasResultComparison(comparison)) return [];

  return [
    ...(comparison.previousAttempt ? [{
      id: 'previous-attempt',
      label: comparison.previousAttempt.label,
      value: `${formatSpeed(comparison.previousAttempt.entry.wpm)} ${speedLabel}`,
      details: [
        `${Math.round(comparison.previousAttempt.entry.acc)}% · ${comparison.previousAttempt.contextLabel} · ${formatShortDate(comparison.previousAttempt.entry.date)}`,
      ],
    }] : []),
    ...(comparison.previousDelta ? [{
      id: 'previous-delta',
      label: comparison.previousDelta.label,
      value: `${comparison.previousDelta.formattedSpeedDelta} ${speedLabel}`,
      tone: getComparisonMetricTone(comparison.previousDelta.tone),
      details: [
        translate('resultComparison.accuracyDelta', { value: comparison.previousDelta.formattedAccuracyDelta }),
      ],
    }] : []),
    ...(comparison.recentBest ? [{
      id: 'recent-best',
      label: comparison.recentBest.label,
      value: `${formatSpeed(comparison.recentBest.entry.wpm)} ${speedLabel}`,
      details: [
        `${Math.round(comparison.recentBest.entry.acc)}% · ${comparison.recentBest.contextLabel} · ${formatShortDate(comparison.recentBest.entry.date)}`,
      ],
    }] : []),
    ...(comparison.recentBestDelta ? [{
      id: 'recent-best-delta',
      label: comparison.recentBestDelta.label,
      value: `${comparison.recentBestDelta.formattedSpeedDelta} ${speedLabel}`,
      tone: getComparisonMetricTone(comparison.recentBestDelta.tone),
      details: [
        translate('resultComparison.accuracyDelta', { value: comparison.recentBestDelta.formattedAccuracyDelta }),
      ],
    }] : []),
  ];
}
