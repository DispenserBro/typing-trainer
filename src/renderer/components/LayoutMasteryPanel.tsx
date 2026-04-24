import type { LayoutMasteryResultSummary, LayoutMasterySnapshot } from '../../core/motivation/records';
import { useI18n } from '../contexts/I18nContext';

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
  const { t } = useI18n();
  return (
    <div className="card layout-mastery-panel">
      <div className="layout-mastery-head">
        <div className="layout-mastery-head-copy">
          <span className="layout-mastery-label">{snapshot.layoutLabel}</span>
          <strong className="layout-mastery-title">{snapshot.currentMilestone.title}</strong>
        </div>
        <div className="layout-mastery-score">
          <span className="layout-mastery-score-value">{snapshot.currentScore}/100</span>
          <span className="layout-mastery-score-label">{t('mastery.currentScore')}</span>
        </div>
      </div>
      <p className="layout-mastery-description">{snapshot.currentMilestone.description}</p>

      <div className="layout-mastery-progress-block">
        <div className="layout-mastery-progress-meta">
          <span>{snapshot.currentScore}/100</span>
          <span>
            {snapshot.nextMilestone
              ? t('mastery.remainingPoints', { title: snapshot.nextMilestone.title, count: snapshot.remainingPoints })
              : t('mastery.maxReached')}
          </span>
        </div>
        <div className="home-progress-bar layout-mastery-progress-bar">
          <span style={{ width: `${snapshot.progressPercent}%` }} />
        </div>
      </div>

      <div className="layout-mastery-rewards">
        <div className="layout-mastery-reward-card">
          <span className="layout-mastery-reward-label">{t('mastery.activeReward')}</span>
          <strong className="layout-mastery-reward-title">{snapshot.activeRewardTitle}</strong>
          <p className="layout-mastery-reward-description">{snapshot.activeRewardDescription}</p>
        </div>
        {snapshot.nextRewardTitle && snapshot.nextRewardDescription && (
          <div className="layout-mastery-reward-card next">
            <span className="layout-mastery-reward-label">{t('mastery.nextReward')}</span>
            <strong className="layout-mastery-reward-title">{snapshot.nextRewardTitle}</strong>
            <p className="layout-mastery-reward-description">{snapshot.nextRewardDescription}</p>
          </div>
        )}
      </div>

      <div className="layout-mastery-metrics">
        <div className="layout-mastery-metric-card">
          <span className="layout-mastery-metric-value">{snapshot.unlockedMilestones.length}/{snapshot.milestones.length}</span>
          <span className="layout-mastery-metric-label">{t('mastery.milestones')}</span>
        </div>
        <div className="layout-mastery-metric-card">
          <span className="layout-mastery-metric-value">{snapshot.unlockedLetters}/{snapshot.totalLetters || 0}</span>
          <span className="layout-mastery-metric-label">{t('mastery.symbolsUnlocked')}</span>
        </div>
        <div className="layout-mastery-metric-card">
          <span className="layout-mastery-metric-value">{snapshot.practiceSessions}</span>
          <span className="layout-mastery-metric-label">{t('mastery.practiceSessions')}</span>
        </div>
        <div className="layout-mastery-metric-card">
          <span className="layout-mastery-metric-value">{formatSpeed(snapshot.bestPracticeWpm)} {speedLabel}</span>
          <span className="layout-mastery-metric-label">{t('mastery.bestPace')}</span>
        </div>
      </div>

      {summary && (
        <div className="layout-mastery-delta-grid">
          <div className="layout-mastery-delta-card accent">
            <span className={`layout-mastery-delta-value${summary.scoreDelta > 0 ? ' positive' : ''}`}>
              {summary.scoreDelta >= 0 ? '+' : ''}{summary.scoreDelta}
            </span>
            <span className="layout-mastery-delta-label">{t('mastery.scoreDelta')}</span>
          </div>
          <div className="layout-mastery-delta-card">
            <span className="layout-mastery-delta-value">{summary.previous.currentMilestone.title}</span>
            <span className="layout-mastery-delta-label">{t('mastery.beforeAttempt')}</span>
          </div>
          <div className="layout-mastery-delta-card">
            <span className={`layout-mastery-delta-value${summary.unlockedMilestone ? ' positive' : ''}`}>
              {summary.unlockedMilestone ? summary.unlockedMilestone.title : snapshot.currentMilestone.title}
            </span>
            <span className="layout-mastery-delta-label">
              {summary.unlockedMilestone ? t('mastery.newMilestone') : t('mastery.currentMilestone')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
