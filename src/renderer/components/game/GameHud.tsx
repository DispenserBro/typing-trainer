import { memo, useEffect, useMemo, useState } from 'react';
import type { GameRunModifier } from '../../../shared/types';
import { REGEN_HP_PER_BATTLE } from '../../../core/game/battleSystem';
import type { BossArchetypeConfig } from '../../../core/game/bossArchetypes';
import { useI18n } from '../../contexts/I18nContext';
import { GameInfoChip } from './GameInfoChip';
import { InlineStatsBar } from '../ui/InlineStatsBar';

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
  const { t } = useI18n();
  const [timerTick, setTimerTick] = useState(0);
  const bossName = bossArchetype?.name?.startsWith('game.')
    ? t(bossArchetype.name)
    : bossArchetype?.name;
  const bossSubtitle = bossArchetype?.subtitle?.startsWith('game.')
    ? t(bossArchetype.subtitle)
    : bossArchetype?.subtitle;

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
      <InlineStatsBar
        items={[
          { id: 'hp', content: <><b>{Math.max(hp, 0)}</b> HP</> },
          { id: 'level-progress', content: <><b>{level}</b> / {totalLevels}</> },
          { id: 'level-kind', className: activeIsBoss ? 'metric-negative' : undefined, content: <b>{activeIsBoss ? t('game.hud.boss') : t('game.hud.level')}</b> },
          { id: 'letters', content: <><b>{unlockedLetters}</b> {t('game.hud.letters')}</> },
          { id: 'record', content: <><b>{highestLevel}</b> {t('game.hud.record')}</> },
          { id: 'target-speed', content: <><b>{effectiveTargetSpeedDisplay}</b> <small className="speed-unit">{speedUnitLabel}</small></> },
          { id: 'current-speed', content: <><b>{currentSpeedDisplay}</b> <small className="speed-unit">{speedUnitLabel}</small></> },
          { id: 'accuracy', content: <><b>{Math.round(accuracy)}</b>%</> },
        ]}
      />

      {activeModifiers.length > 0 && (
        <div className="game-modifier-row">
          {activeModifiers.map(modifier => (
            <GameInfoChip
              key={modifier.id}
              className="game-modifier-chip"
              title={modifier.name}
              subtitle={<>{modifier.description} · {t('game.hud.levelsRemaining', { count: modifier.remainingLevels })}</>}
            />
          ))}
        </div>
      )}

      {activeSets.length > 0 && (
        <div className="game-modifier-row">
          {activeSets.map(set => (
            <GameInfoChip
              key={set.setName}
              className="game-modifier-chip game-set-active"
              title={<>⚡ {set.setName}</>}
              subtitle={set.description}
            />
          ))}
        </div>
      )}

      {(dailySeed || (activeIsBoss && bossArchetype) || ghostComparison) && (
        <div className="game-context-row">
          {dailySeed && (
            <span className="game-context-chip daily">🗓 {t('game.hud.dailyRun')}</span>
          )}
          {activeIsBoss && bossArchetype && (
            <span className={`game-context-chip boss-${bossArchetype.accent}`}>
              ⚔ {bossName}: {bossSubtitle}
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
            <span>{t('game.hud.bossTimer')}</span>
            <span><b>{liveElapsedSeconds.toFixed(1)}</b> / {bossTimeLimit.toFixed(1)} {t('common.secondsShort')}</span>
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
          <span className="game-regen-badge" title={t('game.hud.regenTitle', { hp: REGEN_HP_PER_BATTLE, count: regenTurns })}>
            💚 {regenTurns}
          </span>
        )}
      </div>
    </>
  );
});
