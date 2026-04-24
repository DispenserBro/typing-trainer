import type { ResultComparisonSummary } from '../../core/motivation/records';
import { useI18n } from '../contexts/I18nContext';
import { ResultMetricStrip } from './ResultMetricStrip';
import type { ResultMetricTone } from './ResultMetricStrip';

type ResultComparisonPanelProps = {
  comparison: ResultComparisonSummary;
  formatSpeed: (value: number) => string;
  speedLabel: string;
};

function getMetricTone(tone: 'up' | 'down' | 'flat'): ResultMetricTone | undefined {
  if (tone === 'up') return 'good';
  if (tone === 'down') return 'bad';
  return undefined;
}

export function ResultComparisonPanel({
  comparison,
  formatSpeed,
  speedLabel,
}: ResultComparisonPanelProps) {
  const { t, formatDate } = useI18n();
  if (!comparison.previousAttempt && !comparison.recentBest) return null;

  const formatShortDate = (date: string) => formatDate(date, {
    day: '2-digit',
    month: 'short',
  }, t('home.common.noDate'));

  return (
    <ResultMetricStrip
      metrics={[
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
          tone: getMetricTone(comparison.previousDelta.tone),
          details: [
            t('resultComparison.accuracyDelta', { value: comparison.previousDelta.formattedAccuracyDelta }),
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
          tone: getMetricTone(comparison.recentBestDelta.tone),
          details: [
            t('resultComparison.accuracyDelta', { value: comparison.recentBestDelta.formattedAccuracyDelta }),
          ],
        }] : []),
      ]}
    />
  );
}
