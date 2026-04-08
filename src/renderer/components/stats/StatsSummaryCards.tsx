type StatsSummaryCardsProps = {
  bestSpeedLabel: string;
  bestSpeedNote: string;
  bestAccuracyLabel: string;
  bestAccuracyNote: string;
  bestRhythmLabel: string;
  bestRhythmNote: string;
  weakestFingerLabel: string;
  weakestFingerNote: string;
  weakestRowLabel: string;
  weakestRowNote: string;
  speedTrendTone: string;
  speedTrendLabel: string;
  speedTrendNote: string;
  accuracyTrendTone: string;
  accuracyTrendLabel: string;
  accuracyTrendNote: string;
};

export function StatsSummaryCards({
  bestSpeedLabel,
  bestSpeedNote,
  bestAccuracyLabel,
  bestAccuracyNote,
  bestRhythmLabel,
  bestRhythmNote,
  weakestFingerLabel,
  weakestFingerNote,
  weakestRowLabel,
  weakestRowNote,
  speedTrendTone,
  speedTrendLabel,
  speedTrendNote,
  accuracyTrendTone,
  accuracyTrendLabel,
  accuracyTrendNote,
}: StatsSummaryCardsProps) {
  return (
    <div className="stats-summary-grid">
      <div className="card stats-summary-card">
        <span className="stats-summary-label">Лучший темп</span>
        <b className="stats-summary-value">{bestSpeedLabel}</b>
        <span className="stats-summary-note">{bestSpeedNote}</span>
      </div>

      <div className="card stats-summary-card">
        <span className="stats-summary-label">Лучшая точность</span>
        <b className="stats-summary-value">{bestAccuracyLabel}</b>
        <span className="stats-summary-note">{bestAccuracyNote}</span>
      </div>

      <div className="card stats-summary-card">
        <span className="stats-summary-label">Самая ровная сессия</span>
        <b className="stats-summary-value">{bestRhythmLabel}</b>
        <span className="stats-summary-note">{bestRhythmNote}</span>
      </div>

      <div className="card stats-summary-card">
        <span className="stats-summary-label">Проблемный палец</span>
        <b className="stats-summary-value stats-summary-value-small">{weakestFingerLabel}</b>
        <span className="stats-summary-note">{weakestFingerNote}</span>
      </div>

      <div className="card stats-summary-card">
        <span className="stats-summary-label">Проблемный ряд</span>
        <b className="stats-summary-value stats-summary-value-small">{weakestRowLabel}</b>
        <span className="stats-summary-note">{weakestRowNote}</span>
      </div>

      <div className="card stats-summary-card">
        <span className="stats-summary-label">Тренд</span>
        <div className="stats-summary-trends">
          <div className={`stats-summary-trend ${speedTrendTone}`}>
            <span>Темп</span>
            <b>{speedTrendLabel}</b>
            <small>{speedTrendNote}</small>
          </div>
          <div className={`stats-summary-trend ${accuracyTrendTone}`}>
            <span>Точность</span>
            <b>{accuracyTrendLabel}</b>
            <small>{accuracyTrendNote}</small>
          </div>
        </div>
      </div>
    </div>
  );
}
