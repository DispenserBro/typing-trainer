import type { ResultComparisonSummary } from '../../core/motivation/records';

type ResultComparisonPanelProps = {
  comparison: ResultComparisonSummary;
  formatSpeed: (value: number) => string;
  speedLabel: string;
};

function formatShortDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'нет даты';
  return parsed.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
  });
}

function getToneClass(tone: 'up' | 'down' | 'flat') {
  if (tone === 'up') return ' good';
  if (tone === 'down') return ' bad';
  return '';
}

export function ResultComparisonPanel({
  comparison,
  formatSpeed,
  speedLabel,
}: ResultComparisonPanelProps) {
  if (!comparison.previousAttempt && !comparison.recentBest) return null;

  return (
    <div className="result-metrics" style={{ marginTop: 12 }}>
      {comparison.previousAttempt && (
        <div className="result-metric">
          <span className="result-metric-value">
            {formatSpeed(comparison.previousAttempt.entry.wpm)} {speedLabel}
          </span>
          <span className="result-metric-label">
            {comparison.previousAttempt.label}
          </span>
          <span className="result-metric-label">
            {Math.round(comparison.previousAttempt.entry.acc)}% · {comparison.previousAttempt.contextLabel} · {formatShortDate(comparison.previousAttempt.entry.date)}
          </span>
        </div>
      )}
      {comparison.previousDelta && (
        <div className="result-metric">
          <span className={`result-metric-value${getToneClass(comparison.previousDelta.tone)}`}>
            {comparison.previousDelta.formattedSpeedDelta} {speedLabel}
          </span>
          <span className="result-metric-label">{comparison.previousDelta.label}</span>
          <span className="result-metric-label">Точность {comparison.previousDelta.formattedAccuracyDelta}%</span>
        </div>
      )}
      {comparison.recentBest && (
        <div className="result-metric">
          <span className="result-metric-value">
            {formatSpeed(comparison.recentBest.entry.wpm)} {speedLabel}
          </span>
          <span className="result-metric-label">
            {comparison.recentBest.label}
          </span>
          <span className="result-metric-label">
            {Math.round(comparison.recentBest.entry.acc)}% · {comparison.recentBest.contextLabel} · {formatShortDate(comparison.recentBest.entry.date)}
          </span>
        </div>
      )}
      {comparison.recentBestDelta && (
        <div className="result-metric">
          <span className={`result-metric-value${getToneClass(comparison.recentBestDelta.tone)}`}>
            {comparison.recentBestDelta.formattedSpeedDelta} {speedLabel}
          </span>
          <span className="result-metric-label">{comparison.recentBestDelta.label}</span>
          <span className="result-metric-label">Точность {comparison.recentBestDelta.formattedAccuracyDelta}%</span>
        </div>
      )}
    </div>
  );
}
