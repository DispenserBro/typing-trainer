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
import type { MotivationGoalSnapshot, MotivationStreakSnapshot } from '../../../core/motivation/progress';
import type {
  LayoutMasteryResultSummary,
  ResultComparisonSummary,
} from '../../../core/motivation/records';
import { LayoutMasteryPanel } from '../LayoutMasteryPanel';
import { ResultProgressMetrics } from '../ResultProgressMetrics';
import { ResultComparisonPanel } from '../ResultComparisonPanel';
import { useI18n } from '../../contexts/I18nContext';
import { ActionRow } from '../ui/ActionRow';
import { Button } from '../ui/Button';
import { ResultCardLayout } from '../ui/ResultCardLayout';
import { GameRewardChoiceCard } from './GameRewardChoiceCard';
import { getGameRewardKindLabel } from './gameText';

type GameResultCardProps = {
  result: GameRunResult;
  isDailyRun: boolean;
  speedLabel: string;
  formatSpeed: (value: number) => string;
  targetSpeedDisplay: number;
  effectiveTargetSpeedDisplay: string;
  rewardChoices: GameRunRewardChoice[] | null;
  selectedRewardMessage: string | null;
  rewardPending: boolean;
  mapSelectionPending: boolean;
  isTerminalDailyRun: boolean;
  totalLevels: number;
  bossLevelInterval: number;
  ghostComparison: { ghostWpm: number; delta: number; ahead: boolean } | null;
  comparison: ResultComparisonSummary | null;
  masterySummary: LayoutMasteryResultSummary | null;
  motivationGoals: MotivationGoalSnapshot[];
  motivationStreaks: MotivationStreakSnapshot[];
  resultActionRef: RefObject<HTMLButtonElement | null>;
  rewardChoiceRefs: MutableRefObject<Array<HTMLButtonElement | null>>;
  onContinue: () => void;
  onRetry: () => void;
  onRestart: () => void;
  onReturnToMainGame: () => void;
  onSelectReward: (choice: GameRunRewardChoice) => void;
};

function isKeyboardActivation(event: React.KeyboardEvent<HTMLButtonElement>) {
  return event.key === 'Enter' || event.key === ' ';
}

export function GameResultCard({
  result,
  isDailyRun,
  speedLabel,
  formatSpeed,
  targetSpeedDisplay,
  effectiveTargetSpeedDisplay,
  rewardChoices,
  selectedRewardMessage,
  rewardPending,
  mapSelectionPending,
  isTerminalDailyRun,
  totalLevels,
  bossLevelInterval,
  ghostComparison,
  comparison,
  masterySummary,
  motivationGoals,
  motivationStreaks,
  resultActionRef,
  rewardChoiceRefs,
  onContinue,
  onRetry,
  onRestart,
  onReturnToMainGame,
  onSelectReward,
}: GameResultCardProps) {
  const { t } = useI18n();
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
    <ResultCardLayout
      className="game-result-card"
      title={result.victory
        ? t('game.result.title.victory')
        : result.passed
          ? (result.isBoss ? t('game.result.title.bossPassed') : t('game.result.title.levelPassed'))
          : result.timedOut
            ? (result.livesLeft > 0 ? t('game.result.title.timeOut') : t('game.result.title.gameOver'))
            : (result.livesLeft > 0 ? t('game.result.title.hpLost') : t('game.result.title.gameOver'))}
      headline={<>{formatSpeed(result.wpm)} {speedLabel}</>}
    >
      <p>
        {t('common.accuracy')}: <b>{Math.round(result.acc)}%</b> / {result.minAccuracy}%+
      </p>
      {result.isBoss && result.timeLimitSeconds && (
        <p>{t('common.time')}: <b>{result.elapsed.toFixed(1)} {t('common.secondsShort')}</b> / {result.timeLimitSeconds.toFixed(1)} {t('common.secondsShort')}</p>
      )}
      {result.rhythmDeviation != null && result.maxRhythmDeviation != null && (
        <p>
          {t('game.result.rhythm')}: <b>{Math.round(result.rhythmDeviation)} {t('game.result.msShort')}</b> / {t('game.result.maxRhythm', { count: result.maxRhythmDeviation })}
          {result.rhythmDeviation > result.maxRhythmDeviation
            ? <span className="game-fail-tag"> — {t('game.result.rhythmUnstable')}</span>
            : <span className="game-pass-tag"> — {t('game.result.rhythmStable')}</span>}
        </p>
      )}
      {result.maxErrors != null && result.maxErrors > 0 && (
        <p>
          {t('game.result.flawlessLimit')}: <b>{result.maxErrors}</b> {t('game.result.errorsAllowed')}
        </p>
      )}
      {result.brokenItems.length > 0 && (
        <p className="game-breakage-note">{t('game.result.brokenItems')}: <b>{result.brokenItems.join(', ')}</b></p>
      )}
      <p>{result.victory
        ? t('game.result.summary.victory', { totalLevels })
        : result.passed
          ? result.isBoss
            ? t('game.result.summary.bossReward', { level: result.level + 1 })
            : mapSelectionPending
              ? t('game.result.summary.mapSelection')
              : t('game.result.summary.nextLevel', {
                level: result.level,
                nextLevel: result.level + 1,
                bossSuffix: (result.level + 1) % bossLevelInterval === 0 ? t('game.result.summary.bossSuffix') : '',
              })
          : result.timedOut
            ? t('game.result.summary.timeout', { livesLeft: result.livesLeft })
            : t('game.result.summary.failure', { minAccuracy: result.minAccuracy, livesLeft: result.livesLeft })}
      </p>
      {(result.victory || result.livesLeft <= 0) && (motivationGoals.length > 0 || motivationStreaks.length > 0) && (
        <ResultProgressMetrics
          metrics={[
            ...motivationGoals.map((goal) => ({
              id: goal.definition.id,
              title: goal.definition.title,
              value: `${Math.round(goal.current)}${goal.nextTarget != null ? ` / ${goal.nextTarget}` : ''}`,
            })),
            ...motivationStreaks.map((streak) => ({
              id: streak.definition.id,
              title: streak.definition.title,
              value: streak.current,
              tone: streak.current > 0 ? 'good' as const : 'neutral' as const,
            })),
          ]}
        />
      )}
      {comparison && (
        <ResultComparisonPanel
          comparison={comparison}
          formatSpeed={formatSpeed}
          speedLabel={speedLabel}
        />
      )}
      {masterySummary && (
        <div className="result-mastery-block">
          <LayoutMasteryPanel
            snapshot={masterySummary.current}
            summary={masterySummary}
            formatSpeed={formatSpeed}
            speedLabel={speedLabel}
          />
        </div>
      )}

      {rewardChoices && result.passed && result.isBoss && !result.victory && (
        <div className="game-reward-block">
          <div className="game-reward-title">{t('game.result.bossRewardTitle')}</div>
          {!selectedRewardMessage ? (
            <div className="game-reward-grid">
              {rewardChoices.map((choice, index) => {
                const rewardItem = choice.itemId ? getGameItemById(choice.itemId) : null;
                const RewardIcon = rewardItem ? getGameItemIcon(rewardItem.icon) : null;
                const rewardRarity = rewardItem ? getGameItemRarityStars(rewardItem.rarity) : t('game.result.reward.specialReward');
                const rewardName = rewardItem?.name ?? (choice.letter ? t('game.result.reward.letterName', { letter: choice.letter.toUpperCase() }) : choice.title);
                const rewardKindLabel = getGameRewardKindLabel(choice.kind, t);
                return (
                  <GameRewardChoiceCard
                    key={choice.id}
                    cardClassName={`${rewardItem ? `rarity-${rewardItem.rarity}` : ''}${choice.disabled ? ' disabled' : ''}`.trim()}
                    special={choice.kind === 'letter' || choice.kind === 'event'}
                    badge={choice.kind === 'letter'
                      ? (choice.letter?.toUpperCase() ?? '?')
                      : choice.kind === 'event'
                        ? '✦'
                        : RewardIcon && <RewardIcon size={18} />}
                    rarity={rewardRarity}
                    name={rewardName}
                    kind={rewardKindLabel}
                    description={choice.description}
                    durability={rewardItem?.maxDurability != null ? {
                      current: rewardItem.maxDurability,
                      label: t('game.inventory.durability'),
                      max: rewardItem.maxDurability,
                    } : null}
                    effects={rewardItem?.effects.map(effect => effect.description) ?? []}
                    body={null}
                    action={(
                      <Button
                      ref={node => { rewardChoiceRefs.current[index] = node; }}
                      variant="accent"
                      disabled={choice.disabled}
                      onPointerDown={(event) => handleRewardPointerDown(event, choice)}
                      onKeyDown={(event) => handleRewardKeyDown(event, choice)}
                      onClick={(event) => event.preventDefault()}
                    >
                      {choice.kind === 'letter'
                        ? t('game.result.reward.actions.wakeLetter')
                        : choice.kind === 'event'
                          ? t('game.result.reward.actions.accept')
                          : choice.kind === 'simple'
                            ? t('game.result.reward.actions.takeRelic')
                            : t('game.result.reward.actions.riskTake')}
                    </Button>
                    )}
                  />
                );
              })}
            </div>
          ) : (
            <div className="game-reward-picked">{selectedRewardMessage}</div>
          )}
        </div>
      )}

      <ActionRow align="center" className="result-actions game-actions">
        {rewardPending ? null : result.passed && !result.victory ? (
          <Button ref={resultActionRef} variant="accent" onClick={onContinue}>
            <Swords size={14} className="ui-inline-icon" /> {mapSelectionPending ? t('game.result.actions.toMap') : t('game.result.actions.nextLevel')}
          </Button>
        ) : result.livesLeft > 0 && !result.victory ? (
          <Button ref={resultActionRef} variant="accent" onClick={onRetry}>
            <RotateCcw size={14} className="ui-inline-icon" /> {t('game.result.actions.retryLevel')}
          </Button>
        ) : isTerminalDailyRun ? (
          <>
            <Button ref={resultActionRef} variant="accent" onClick={onRestart}>
              <RotateCcw size={14} className="ui-inline-icon" /> {t('game.result.actions.playAgain')}
            </Button>
            <Button onClick={onReturnToMainGame}>
              <Swords size={14} className="ui-inline-icon" /> {t('game.result.actions.toMainGame')}
            </Button>
          </>
        ) : (
          <Button ref={resultActionRef} variant="accent" onClick={onRestart}>
            <RotateCcw size={14} className="ui-inline-icon" /> {t('game.result.actions.playAgain')}
          </Button>
        )}
      </ActionRow>
    </ResultCardLayout>
  );
}
