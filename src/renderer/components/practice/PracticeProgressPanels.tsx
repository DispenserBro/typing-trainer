import type { CSSProperties } from 'react';
import type { CharStat } from '../../../shared/types';

type PracticeProgressPanelsProps = {
  currentAccuracy: number;
  currentSpeed: number | string;
  dailyGoalType: 'sessions' | 'minutes';
  dailyGoalValue: number;
  goalDisplay: number;
  layoutProgressUnlocked: number;
  practicePerformance: {
    accDelta: number;
    displayedWorstChar: string | null;
    last: { acc: number; wpm: number } | null;
    speedDelta: number;
    weakGlobalCPM: number;
    weakLastCPM: number;
  };
  practiceState: {
    minutesToday: number;
    sessionsToday: number;
  };
  practiceUnlockOrder: string[];
  practiceUnlockProgress: number;
  practicesPerUnlock: number;
  speedLabel: string;
  toDisplaySpeed: (cpm: number) => number;
  translate: (key: string, params?: Record<string, string | number>) => string;
  unlockedKeyStats: Record<string, CharStat>;
};

export function PracticeProgressPanels({
  currentAccuracy,
  currentSpeed,
  dailyGoalType,
  dailyGoalValue,
  goalDisplay,
  layoutProgressUnlocked,
  practicePerformance,
  practiceState,
  practiceUnlockOrder,
  practiceUnlockProgress,
  practicesPerUnlock,
  speedLabel,
  toDisplaySpeed,
  translate,
  unlockedKeyStats,
}: PracticeProgressPanelsProps) {
  const weakLastSpeed = Math.round(toDisplaySpeed(practicePerformance.weakLastCPM));
  const weakGlobalSpeed = Math.round(toDisplaySpeed(practicePerformance.weakGlobalCPM));

  return (
    <>
      <div className="practice-stats-row">
        <div className={`pstat daily-goal-row practice-daily-goal-row${dailyGoalType === 'minutes' ? ' minutes-goal' : ''}`}>
          <div className="practice-daily-goal-meta">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            <span className="daily-goal-label">
              {dailyGoalType === 'sessions'
                ? `${practiceState.sessionsToday} / ${dailyGoalValue}`
                : translate('practice.dailyMinutes', {
                    current: Math.round(practiceState.minutesToday || 0),
                    target: dailyGoalValue,
                  })}
            </span>
          </div>
          {dailyGoalType === 'sessions' ? (
            <div className="daily-goal-bar segments">
              {Array.from({ length: dailyGoalValue }).map((_, i) => (
                <span key={i} className={`daily-seg${i < practiceState.sessionsToday ? ' filled' : ''}`} />
              ))}
            </div>
          ) : (
            <div className="daily-goal-bar smooth">
              <div className="daily-fill" style={{
                width: `${Math.min(100, Math.round((practiceState.minutesToday || 0) / dailyGoalValue * 100))}%`,
              }} />
            </div>
          )}
        </div>
      </div>

      <div className="practice-metrics">
        <div className="metric">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          <span><b>{currentSpeed}</b> <small className="speed-unit">{speedLabel}</small></span>
        </div>
        <div className={`metric ${practicePerformance.speedDelta >= 0 ? 'metric-positive' : 'metric-negative'}`}>
          <span><b>{practicePerformance.speedDelta >= 0 ? '+' : ''}{practicePerformance.speedDelta}</b> <small className="speed-unit">{speedLabel}</small></span>
        </div>
        <div className="metric">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
          </svg>
          <span><b>{currentAccuracy}</b>%</span>
        </div>
        <div className={`metric ${practicePerformance.accDelta >= 0 ? 'metric-positive' : 'metric-negative'}`}>
          <span><b>{practicePerformance.accDelta >= 0 ? '+' : ''}{practicePerformance.accDelta}</b>%</span>
        </div>
      </div>

      <div className="practice-summary-row">
        <div className="summary-badge">
          <span className="badge-label">{practicePerformance.displayedWorstChar ? practicePerformance.displayedWorstChar.toUpperCase() : '—'}</span>
          <span>Last <b>{weakLastSpeed}</b> <small className="speed-unit">{speedLabel}</small></span>
          <span>Top <b>{weakGlobalSpeed}</b> <small className="speed-unit">{speedLabel}</small></span>
          <span>Goal <b>{goalDisplay}</b> <small className="speed-unit">{speedLabel}</small></span>
        </div>
      </div>

      <div className="letters-grid-wrap">
        <div className="letters-grid">
          {practiceUnlockOrder.map((ch, i) => {
            const stat = unlockedKeyStats[ch.toLowerCase()];
            let charCPM = 0;
            if (stat && stat.hits > 0 && stat.totalTime > 0) {
              charCPM = 60000 / (stat.totalTime / stat.hits);
            }
            const hasStats = !!(stat && stat.hits > 0);
            const displayedCharSpeed = toDisplaySpeed(charCPM);
            const ratio = goalDisplay > 0 ? Math.min(1, displayedCharSpeed / goalDisplay) : 1;
            const opacity = hasStats ? (0.4 + ratio * 0.6) : 1;
            const isWeak = ch === practicePerformance.displayedWorstChar;
            const isUnlocked = i < layoutProgressUnlocked;
            const isNext = i === layoutProgressUnlocked;

            let cls = 'letter-chip ';
            const style: CSSProperties = {};
            if (isUnlocked) {
              cls += isWeak ? 'weak' : 'unlocked';
              style.opacity = opacity;
            } else if (isNext) {
              cls += 'locked';
              style.opacity = 0.7;
              style.borderWidth = '1px';
              style.borderStyle = 'dashed';
              style.borderColor = 'var(--accent)';
            } else {
              cls += 'locked';
            }

            return (
              <span
                key={ch}
                className={cls}
                style={style}
                title={isUnlocked
                  ? (isWeak
                    ? translate('practice.weakTooltip', {
                        speed: toDisplaySpeed(charCPM),
                        speedLabel,
                      })
                    : `${toDisplaySpeed(charCPM)} / ${goalDisplay} ${speedLabel}`)
                  : (isNext ? translate('practice.untilUnlock', {
                      current: practiceUnlockProgress,
                      target: practicesPerUnlock,
                    }) : '')}
              >
                {ch.toUpperCase()}
              </span>
            );
          })}
        </div>
      </div>
    </>
  );
}
