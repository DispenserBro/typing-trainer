import { memo, useEffect, useMemo, useState } from 'react';
import type { GameRunModifier } from '../../../shared/types';
import { REGEN_HP_PER_BATTLE } from '../../../core/game/battleSystem';
import type { BossArchetypeConfig } from '../../../core/game/bossArchetypes';

type GameHudProps = {
  hp: number;
  maxHp: number;
  regenTurns: number;
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
  bossArchetype: BossArchetypeConfig | null;
  dailySeed: string | null;
  ghostComparison: { ghostWpm: number; delta: number; ahead: boolean } | null;
  activeSets: Array<{ setName: string; description: string }>;
  sessionActive: boolean;
  sessionStartTime: number;
  resultElapsedSeconds: number;
};

export const GameHud = memo(function GameHud({
  hp,
  maxHp,
  regenTurns,
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
  bossArchetype,
  dailySeed,
  ghostComparison,
  activeSets,
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
        <div className="metric"><b>{Math.max(hp, 0)}</b> HP</div>
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

      {activeSets.length > 0 && (
        <div className="game-modifier-row">
          {activeSets.map(set => (
            <div key={set.setName} className="game-modifier-chip game-set-active">
              <strong>⚡ {set.setName}</strong>
              <small>{set.description}</small>
            </div>
          ))}
        </div>
      )}

      {(dailySeed || (activeIsBoss && bossArchetype) || ghostComparison) && (
        <div className="game-context-row">
          {dailySeed && (
            <span className="game-context-chip daily">🗓 Ежедневный забег</span>
          )}
          {activeIsBoss && bossArchetype && (
            <span className={`game-context-chip boss-${bossArchetype.accent}`}>
              ⚔ {bossArchetype.name}: {bossArchetype.subtitle}
            </span>
          )}
          {ghostComparison && (
            <span className={`game-context-chip ghost ${ghostComparison.ahead ? 'ahead' : 'behind'}`}>
              👻 {ghostComparison.ahead ? '+' : ''}{Math.round(ghostComparison.delta)} WPM
            </span>
          )}
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
        <div className="game-run-hp">
          <span className="game-run-hp-label">HP</span>
          <div className="game-run-hp-bar">
            <div
              className={`game-run-hp-fill${hp / maxHp <= 0.25 ? ' danger' : hp / maxHp <= 0.5 ? ' warn' : ''}`}
              style={{ width: `${Math.max(0, Math.min(100, (hp / maxHp) * 100))}%` }}
            />
          </div>
          <span className="game-run-hp-value">{Math.max(hp, 0)} / {maxHp}</span>
        </div>
        {regenTurns > 0 && (
          <span className="game-regen-badge" title={`Регенерация: +${REGEN_HP_PER_BATTLE} HP после боя (ещё ${regenTurns})`}>
            💚 {regenTurns}
          </span>
        )}
      </div>
    </>
  );
});
