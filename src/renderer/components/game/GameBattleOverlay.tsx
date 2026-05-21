import { Shield, Swords } from 'lucide-react';
import type { BattleState } from '../../../shared/types';
import { EMPTY_ERR_POSITIONS, TextDisplay } from '../TextDisplay';
import { useI18n } from '../../contexts/I18nContext';

type GameBattleOverlayProps = {
  battleState: BattleState;
  level: number;
  levelText: string;
  overlayText: string | null;
  onResume?: () => void;
  sessionActive: boolean;
  sessionErrPositions: Set<number>;
  sessionPos: number;
  sessionText: string;
  waitingForSpace: boolean;
};

export function GameBattleOverlay({
  battleState,
  level,
  levelText,
  overlayText,
  onResume,
  sessionActive,
  sessionErrPositions,
  sessionPos,
  sessionText,
  waitingForSpace,
}: GameBattleOverlayProps) {
  const { t } = useI18n();
  const enemyName = battleState.enemy.name.startsWith('game.')
    ? t(battleState.enemy.name)
    : battleState.enemy.name;
  const debuffLabel = battleState.enemy.debuff
    ? t(`game.overlay.debuffs.${battleState.enemy.debuff}`)
    : '';

  return (
    <div className="game-map-overlay">
      <div className="game-map-overlay-card game-battle-overlay">
        <div className="game-battle-info-panel">
          <div className="game-battle-hud">
            ⚔ {t('game.overlay.battleHeader', {
              enemy: enemyName,
              round: battleState.round,
              phase: battleState.phase === 'attack' ? t('game.overlay.phase.attack') : t('game.overlay.phase.defense'),
            })}
          </div>
          <div className="game-battle-hp-section">
            <div className="game-hp-bar-row">
              <Swords size={14} />
              <span className="game-hp-label">
                {Math.max(0, battleState.playerHp)} / {battleState.playerMaxHp}
              </span>
              <div className="game-hp-bar">
                <div
                  className={`game-hp-bar-fill${battleState.playerHp / battleState.playerMaxHp <= 0.25 ? ' danger' : battleState.playerHp / battleState.playerMaxHp <= 0.5 ? ' warn' : ''}`}
                  style={{ width: `${Math.max(0, Math.min(100, (battleState.playerHp / battleState.playerMaxHp) * 100))}%` }}
                />
              </div>
            </div>
            <div className="game-hp-bar-row enemy">
              <Shield size={14} />
              <span className="game-hp-label">
                {Math.max(0, battleState.enemy.hp)} / {battleState.enemy.maxHp}
              </span>
              <div className="game-hp-bar">
                <div
                  className="game-hp-bar-fill enemy"
                  style={{ width: `${Math.max(0, Math.min(100, (battleState.enemy.hp / battleState.enemy.maxHp) * 100))}%` }}
                />
              </div>
              <span className="game-hp-enemy-name">{enemyName}</span>
              {battleState.enemy.debuff && (
                <span className="game-boss-debuff-badge" title={t('game.overlay.debuffTitle', { debuff: debuffLabel })}>
                  ⚡ {debuffLabel}
                </span>
              )}
            </div>
          </div>
        </div>
        <TextDisplay
          text={sessionActive ? sessionText : levelText}
          pos={sessionActive ? sessionPos : 0}
          errPositions={sessionActive ? sessionErrPositions : EMPTY_ERR_POSITIONS}
          waitingForSpace={waitingForSpace}
          overlay={overlayText ?? t('game.overlay.savedRun', { level, hp: Math.max(battleState.playerHp, 0) }).replace(/\\n/g, '\n')}
          overlayCover
          onOverlayClick={!sessionActive ? onResume : undefined}
        />
      </div>
    </div>
  );
}
