import type { ResultComparisonSummary } from '../../core/motivation/records';
import {
  buildResultComparisonMetricItems,
  hasResultComparison,
} from '../../core/motivation/resultComparisonViewModel';
import { useI18n } from '../contexts/I18nContext';
import { ResultMetricStrip } from './ResultMetricStrip';

type ResultComparisonPanelProps = {
  comparison: ResultComparisonSummary;
  formatSpeed: (value: number) => string;
  speedLabel: string;
};

export { hasResultComparison };

export function ResultComparisonPanel({
  comparison,
  formatSpeed,
  speedLabel,
}: ResultComparisonPanelProps) {
  const { t, formatDate } = useI18n();
  if (!hasResultComparison(comparison)) return null;

  const formatShortDate = (date: string) => formatDate(date, {
    day: '2-digit',
    month: 'short',
  }, t('home.common.noDate'));
  const metrics = buildResultComparisonMetricItems({
    comparison,
    formatShortDate,
    formatSpeed,
    speedLabel,
    translate: t,
  });

  return (
    <ResultMetricStrip
      className="result-comparison-metrics"
      metrics={metrics}
      variant="secondary"
    />
  );
}
