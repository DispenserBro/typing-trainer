import type { LayoutMasteryResultSummary, LayoutMasterySnapshot } from '../../core/motivation/records';

type LayoutMasteryPanelProps = {
  snapshot: LayoutMasterySnapshot;
  summary?: LayoutMasteryResultSummary | null;
  formatSpeed: (value: number) => string;
  speedLabel: string;
};

export function LayoutMasteryPanel({
  snapshot,
  summary,
  formatSpeed,
  speedLabel,
}: LayoutMasteryPanelProps) {
  return (
    <div className="card home-summary-card">
      <span className="home-summary-label">{snapshot.layoutLabel}</span>
      <strong>{snapshot.currentMilestone.title}</strong>
      <p>{snapshot.currentScore}/100 · {snapshot.currentMilestone.description}</p>
      <div className="home-progress-bar">
        <span style={{ width: `${snapshot.progressPercent}%` }} />
      </div>
      <p>
        {snapshot.nextMilestone
          ? `До «${snapshot.nextMilestone.title}» осталось ${snapshot.remainingPoints} очк.`
          : 'Максимальная mastery-ступень уже достигнута.'}
      </p>
      <p>
        Активный unlock-эффект: <b>{snapshot.activeRewardTitle}</b> — {snapshot.activeRewardDescription}
      </p>
      {snapshot.nextRewardTitle && snapshot.nextRewardDescription && (
        <p>
          Следующая награда: <b>{snapshot.nextRewardTitle}</b> — {snapshot.nextRewardDescription}
        </p>
      )}
      <div className="result-metrics" style={{ marginTop: 12 }}>
        <div className="result-metric">
          <span className="result-metric-value">{snapshot.unlockedMilestones.length}/{snapshot.milestones.length}</span>
          <span className="result-metric-label">Ступеней mastery</span>
        </div>
        <div className="result-metric">
          <span className="result-metric-value">{snapshot.unlockedLetters}/{snapshot.totalLetters || 0}</span>
          <span className="result-metric-label">Символов открыто</span>
        </div>
        <div className="result-metric">
          <span className="result-metric-value">{snapshot.practiceSessions}</span>
          <span className="result-metric-label">Практик</span>
        </div>
        <div className="result-metric">
          <span className="result-metric-value">{formatSpeed(snapshot.bestPracticeWpm)} {speedLabel}</span>
          <span className="result-metric-label">Лучший темп</span>
        </div>
      </div>
      {summary && (
        <div className="result-metrics" style={{ marginTop: 12 }}>
          <div className="result-metric">
            <span className={`result-metric-value${summary.scoreDelta > 0 ? ' good' : ''}`}>
              {summary.scoreDelta >= 0 ? '+' : ''}{summary.scoreDelta}
            </span>
            <span className="result-metric-label">Δ mastery</span>
          </div>
          <div className="result-metric">
            <span className="result-metric-value">{summary.previous.currentMilestone.title}</span>
            <span className="result-metric-label">Было до попытки</span>
          </div>
          <div className="result-metric">
            <span className={`result-metric-value${summary.unlockedMilestone ? ' good' : ''}`}>
              {summary.unlockedMilestone ? summary.unlockedMilestone.title : snapshot.currentMilestone.title}
            </span>
            <span className="result-metric-label">
              {summary.unlockedMilestone ? 'Новая ступень' : 'Текущая ступень'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
