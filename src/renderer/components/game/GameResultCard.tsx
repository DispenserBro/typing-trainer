import type { MutableRefObject, RefObject } from 'react';
import {
  Gift,
  RotateCcw,
  Swords,
} from 'lucide-react';
import type {
  GameRunResult,
  GameRunRewardChoice,
} from '../../../shared/types';
import { getGameItemById, getGameItemIcon, getGameItemRarityStars } from '../../../core/game/items';
import { getRewardKindLabel } from '../../../core/game/runUtils';

type GameResultCardProps = {
  result: GameRunResult;
  speedLabel: string;
  formatSpeed: (value: number) => string;
  targetSpeedDisplay: number;
  effectiveTargetSpeedDisplay: string;
  rewardChoices: GameRunRewardChoice[] | null;
  selectedRewardMessage: string | null;
  rewardPending: boolean;
  mapSelectionPending: boolean;
  totalLevels: number;
  bossLevelInterval: number;
  resultActionRef: RefObject<HTMLButtonElement | null>;
  rewardChoiceRefs: MutableRefObject<Array<HTMLButtonElement | null>>;
  onContinue: () => void;
  onRetry: () => void;
  onRestart: () => void;
  onSelectReward: (choice: GameRunRewardChoice) => void;
};

function isKeyboardActivation(event: React.KeyboardEvent<HTMLButtonElement>) {
  return event.key === 'Enter' || event.key === ' ';
}

export function GameResultCard({
  result,
  speedLabel,
  formatSpeed,
  targetSpeedDisplay,
  effectiveTargetSpeedDisplay,
  rewardChoices,
  selectedRewardMessage,
  rewardPending,
  mapSelectionPending,
  totalLevels,
  bossLevelInterval,
  resultActionRef,
  rewardChoiceRefs,
  onContinue,
  onRetry,
  onRestart,
  onSelectReward,
}: GameResultCardProps) {
  const handleRewardPointerDown = (event: React.PointerEvent<HTMLButtonElement>, choice: GameRunRewardChoice) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    onSelectReward(choice);
  };

  const handleRewardKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, choice: GameRunRewardChoice) => {
    if (!isKeyboardActivation(event)) return;
    event.preventDefault();
    event.stopPropagation();
    onSelectReward(choice);
  };

  return (
    <div className="result-card game-result-card">
      <h3>{result.victory
        ? 'Игра пройдена'
        : result.passed
          ? (result.isBoss ? 'Босс повержен' : 'Уровень пройден')
          : result.timedOut
            ? (result.livesLeft > 0 ? 'Время вышло' : 'Игра окончена')
            : (result.livesLeft > 0 ? 'Жизнь потеряна' : 'Игра окончена')}
      </h3>
      <div className="result-big">{formatSpeed(result.wpm)} {speedLabel}</div>
      <p>
        Базовая цель: <b>{targetSpeedDisplay} {speedLabel}</b> ·
        Цель с реликвиями: <b>{effectiveTargetSpeedDisplay} {speedLabel}</b>
      </p>
      <p>
        Точность: <b>{Math.round(result.acc)}%</b> / {result.minAccuracy}%+
      </p>
      {result.isBoss && result.timeLimitSeconds && (
        <p>Время: <b>{result.elapsed.toFixed(1)} c</b> / {result.timeLimitSeconds.toFixed(1)} c</p>
      )}
      {result.brokenItems.length > 0 && (
        <p className="game-breakage-note">Распались предметы: <b>{result.brokenItems.join(', ')}</b></p>
      )}
      <p>{result.victory
        ? `Вы прошли все ${totalLevels} уровней. Все реликвии этого забега рассеялись.`
        : result.passed
          ? result.isBoss
            ? `Трофей босса ждет выбора. Следующий этап: уровень ${result.level + 1}.`
            : mapSelectionPending
              ? 'Уровень пройден. Теперь выбери следующую точку прямо на карте забега.'
              : `Уровень ${result.level} завершен. Дальше идет ${result.level + 1}${(result.level + 1) % bossLevelInterval === 0 ? ' — босс' : ''}.`
          : result.timedOut
            ? `Вы не уложились в лимит времени. Осталось жизней: ${result.livesLeft}.`
            : `Нужно держать скорость не ниже цели и точность от ${result.minAccuracy}%. Осталось жизней: ${result.livesLeft}.`}
      </p>

      {rewardChoices && result.passed && result.isBoss && !result.victory && (
        <div className="game-reward-block">
          <div className="game-reward-title">Трофей босса</div>
          {!selectedRewardMessage ? (
            <div className="game-reward-grid">
              {rewardChoices.map((choice, index) => {
                const rewardItem = choice.itemId ? getGameItemById(choice.itemId) : null;
                const RewardIcon = rewardItem ? getGameItemIcon(rewardItem.icon) : null;
                const rewardRarity = rewardItem ? getGameItemRarityStars(rewardItem.rarity) : '✦ Особая награда';
                const rewardName = rewardItem?.name ?? (choice.letter ? `Символ «${choice.letter.toUpperCase()}»` : choice.title);
                const rewardKindLabel = getRewardKindLabel(choice);
                return (
                  <div
                    key={choice.id}
                    className={`game-reward-card${rewardItem ? ` rarity-${rewardItem.rarity}` : ''}${choice.disabled ? ' disabled' : ''}`}
                  >
                    <div className="game-reward-card-head">
                      <div className={`game-item-badge${choice.kind === 'letter' ? ' letter' : ''}`}>
                        {choice.kind === 'letter'
                          ? (choice.letter?.toUpperCase() ?? '?')
                          : RewardIcon && <RewardIcon size={18} />}
                      </div>
                      <div className="game-reward-copy">
                        <div className={`game-reward-rarity${rewardItem ? '' : ' special'}`}>{rewardRarity}</div>
                        <div className="game-reward-name">{rewardName}</div>
                        <div className="game-reward-kind">{rewardKindLabel}</div>
                      </div>
                    </div>
                    <div className="game-reward-body">
                      <div className="game-slot-desc">{choice.description}</div>
                      {rewardItem?.maxDurability != null && (
                        <div className="game-durability risky">
                          Прочность: <b>{rewardItem.maxDurability}</b> / {rewardItem.maxDurability}
                        </div>
                      )}
                      {rewardItem && (
                        <div className="game-item-effects">
                          {rewardItem.effects.map(effect => (
                            <span key={`${choice.id}-${effect.description}`} className="game-item-effect-chip">
                              {effect.description}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      ref={node => { rewardChoiceRefs.current[index] = node; }}
                      className="btn-accent"
                      disabled={choice.disabled}
                      onPointerDown={(event) => handleRewardPointerDown(event, choice)}
                      onKeyDown={(event) => handleRewardKeyDown(event, choice)}
                      onClick={(event) => event.preventDefault()}
                    >
                      {choice.kind === 'letter'
                        ? 'Пробудить символ'
                        : choice.kind === 'simple'
                          ? 'Забрать реликвию'
                          : 'Рискнуть и взять'}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="game-reward-picked">{selectedRewardMessage}</div>
          )}
        </div>
      )}

      <div className="game-actions">
        {rewardPending ? null : result.passed && !result.victory ? (
          <button ref={resultActionRef} className="btn-accent" onClick={onContinue}>
            <Swords size={14} style={{ verticalAlign: 'middle' }} /> {mapSelectionPending ? 'К карте' : 'Следующий уровень'}
          </button>
        ) : result.livesLeft > 0 && !result.victory ? (
          <button ref={resultActionRef} className="btn-accent" onClick={onRetry}>
            <RotateCcw size={14} style={{ verticalAlign: 'middle' }} /> Повторить уровень
          </button>
        ) : (
          <button ref={resultActionRef} className="btn-accent" onClick={onRestart}>
            <RotateCcw size={14} style={{ verticalAlign: 'middle' }} /> Сыграть ещё раз
          </button>
        )}
      </div>
    </div>
  );
}


