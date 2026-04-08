import { memo, useEffect, useMemo, useState } from 'react';
import { Heart } from 'lucide-react';
import type { GameRunModifier } from '../../../shared/types';

type GameHudProps = {
  lives: number;
  level: number;
  totalLevels: number;
  activeIsBoss: boolean;
  unlockedLetters: number;
  highestLevel: number;
  effectiveTargetSpeedDisplay: string;
  currentSpeedDisplay: string;
  accuracy: number;
  speedUnitLabel: string;
  activeModifiers: GameRunModifier[];
  bossTimeLimit: number | null;
  sessionActive: boolean;
  sessionStartTime: number;
  resultElapsedSeconds: number;
};

export const GameHud = memo(function GameHud({
  lives,
  level,
  totalLevels,
  activeIsBoss,
  unlockedLetters,
  highestLevel,
  effectiveTargetSpeedDisplay,
  currentSpeedDisplay,
  accuracy,
  speedUnitLabel,
  activeModifiers,
  bossTimeLimit,
  sessionActive,
  sessionStartTime,
  resultElapsedSeconds,
}: GameHudProps) {
  const [timerTick, setTimerTick] = useState(0);

  useEffect(() => {
    if (!activeIsBoss || !bossTimeLimit || !sessionActive) return;
    const interval = setInterval(() => setTimerTick(tick => tick + 1), 200);
    return () => clearInterval(interval);
  }, [activeIsBoss, bossTimeLimit, sessionActive]);

  const liveElapsedSeconds = useMemo(() => (
    sessionActive ? (performance.now() - sessionStartTime) / 1000 : resultElapsedSeconds
  ), [resultElapsedSeconds, sessionActive, sessionStartTime, timerTick]);

  const bossTimerRatio = useMemo(() => (
    bossTimeLimit ? Math.min(1, liveElapsedSeconds / bossTimeLimit) : 0
  ), [bossTimeLimit, liveElapsedSeconds]);

  return (
    <>
      <div className="stats-bar">
        <div className="metric"><b>{Math.max(lives, 0)}</b> жизни</div>
        <div className="metric"><b>{level}</b> / {totalLevels}</div>
        <div className={`metric${activeIsBoss ? ' metric-negative' : ''}`}><b>{activeIsBoss ? 'Босс' : 'Уровень'}</b></div>
        <div className="metric"><b>{unlockedLetters}</b> букв</div>
        <div className="metric"><b>{highestLevel}</b> рекорд</div>
        <div className="metric"><b>{effectiveTargetSpeedDisplay}</b> <small className="speed-unit">{speedUnitLabel}</small></div>
        <div className="metric"><b>{currentSpeedDisplay}</b> <small className="speed-unit">{speedUnitLabel}</small></div>
        <div className="metric"><b>{Math.round(accuracy)}</b>%</div>
      </div>

      {activeModifiers.length > 0 && (
        <div className="game-modifier-row">
          {activeModifiers.map(modifier => (
            <div key={modifier.id} className="game-modifier-chip">
              <strong>{modifier.name}</strong>
              <small>{modifier.description} · {modifier.remainingLevels} ур.</small>
            </div>
          ))}
        </div>
      )}

      {activeIsBoss && bossTimeLimit && (
        <div className="game-boss-timer">
          <div className="game-boss-timer-row">
            <span>Таймер босса</span>
            <span><b>{liveElapsedSeconds.toFixed(1)}</b> / {bossTimeLimit.toFixed(1)} c</span>
          </div>
          <div className="game-boss-timer-bar">
            <div
              className={`game-boss-timer-fill${bossTimerRatio >= 0.85 ? ' danger' : ''}`}
              style={{ width: `${Math.min(100, bossTimerRatio * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="game-lives-row">
        {Array.from({ length: 3 }, (_, idx) => (
          <span key={idx} className={`game-heart${idx < lives ? ' active' : ' lost'}`}>
            <Heart size={18} fill="currentColor" />
          </span>
        ))}
      </div>
    </>
  );
});
