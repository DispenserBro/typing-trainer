import type { MutableRefObject, RefObject } from 'react';
import {
  RotateCcw,
  Swords,
} from 'lucide-react';
import type {
  GameRunResult,
  GameRunRewardChoice,
} from '../../../shared/types';
import { getGameItemIcon } from '../../../core/game/items';
import type { MotivationGoalSnapshot, MotivationStreakSnapshot } from '../../../core/motivation/progress';
import type {
  LayoutMasteryResultSummary,
  ResultComparisonSummary,
} from '../../../core/motivation/records';
import { buildGameResultMetricItems } from '../../../core/game/resultMetrics';
import {
  buildGameResultCardViewModel,
  type GameResultActionId,
} from '../../../core/game/resultPresentation';
import {
  buildGameRewardChoiceBlockViewModel,
  type GameRewardChoiceBadgeViewModel,
} from '../../../core/game/resultRewards';
import { LayoutMasteryPanel } from '../LayoutMasteryPanel';
import { ResultMotivationProgressMetrics } from '../ResultMotivationProgressMetrics';
import { ResultComparisonPanel } from '../ResultComparisonPanel';
import { ResultMetricStrip } from '../ResultMetricStrip';
import { useI18n } from '../../contexts/I18nContext';
import { ActionRow } from '../ui/ActionRow';
import { Button } from '../ui/Button';
import { ResultCardLayout } from '../ui/ResultCardLayout';
import { GameRewardChoiceCard } from './GameRewardChoiceCard';

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
  const gameResultMetrics = buildGameResultMetricItems(result, t);
  const resultCard = buildGameResultCardViewModel({
    bossLevelInterval,
    isTerminalDailyRun,
    mapSelectionPending,
    result,
    rewardPending,
    totalLevels,
    translate: t,
  });
  const rewardBlock = buildGameRewardChoiceBlockViewModel({
    result,
    rewardChoices,
    selectedRewardMessage,
    translate: t,
  });
  const rewardChoiceById = new Map((rewardChoices ?? []).map(choice => [choice.id, choice]));

  const actionHandlers: Record<GameResultActionId, () => void> = {
    continue: onContinue,
    restart: onRestart,
    retry: onRetry,
    'return-to-main-game': onReturnToMainGame,
  };

  const renderActionIcon = (actionId: GameResultActionId) => (
    actionId === 'continue' || actionId === 'return-to-main-game'
      ? <Swords size={14} className="ui-inline-icon" />
      : <RotateCcw size={14} className="ui-inline-icon" />
  );
  const renderRewardBadge = (badge: GameRewardChoiceBadgeViewModel) => {
    if (badge.kind === 'item') {
      const RewardIcon = getGameItemIcon(badge.iconKey);
      return <RewardIcon size={18} />;
    }
    return badge.label;
  };

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
      title={resultCard.title}
      headline={<>{formatSpeed(result.wpm)} {speedLabel}</>}
    >
      <ResultMetricStrip metrics={gameResultMetrics} />
      {result.brokenItems.length > 0 && (
        <p className="game-breakage-note">{t('game.result.brokenItems')}: <b>{result.brokenItems.join(', ')}</b></p>
      )}
      <p>{resultCard.summary}</p>
      {(result.victory || result.livesLeft <= 0) && (motivationGoals.length > 0 || motivationStreaks.length > 0) && (
        <ResultMotivationProgressMetrics goals={motivationGoals} streaks={motivationStreaks} />
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

      {rewardBlock && (
        <div className="game-reward-block">
          <div className="game-reward-title">{rewardBlock.title}</div>
          {!rewardBlock.selectedRewardMessage ? (
            <div className="game-reward-grid">
              {rewardBlock.choices.map((choice, index) => {
                const sourceChoice = rewardChoiceById.get(choice.choiceId);
                if (!sourceChoice) return null;
                return (
                  <GameRewardChoiceCard
                    key={choice.choiceId}
                    cardClassName={choice.cardClassName}
                    special={choice.special}
                    badge={renderRewardBadge(choice.badge)}
                    rarity={choice.rarity}
                    name={choice.name}
                    kind={choice.kindLabel}
                    description={choice.description}
                    durability={choice.durability}
                    effects={choice.effects}
                    body={null}
                    action={(
                      <Button
                      ref={node => { rewardChoiceRefs.current[index] = node; }}
                      variant="accent"
                      disabled={choice.disabled}
                      onPointerDown={(event) => handleRewardPointerDown(event, sourceChoice)}
                      onKeyDown={(event) => handleRewardKeyDown(event, sourceChoice)}
                      onClick={(event) => event.preventDefault()}
                    >
                      {choice.actionLabel}
                    </Button>
                    )}
                  />
                );
              })}
            </div>
          ) : (
            <div className="game-reward-picked">{rewardBlock.selectedRewardMessage}</div>
          )}
        </div>
      )}

      <ActionRow align="center" className="result-actions game-actions">
        {resultCard.actions.map(action => (
          <Button
            key={action.id}
            ref={action.focusTarget ? resultActionRef : undefined}
            variant={action.variant === 'accent' ? 'accent' : undefined}
            onClick={actionHandlers[action.id]}
          >
            {renderActionIcon(action.id)} {action.label}
          </Button>
        ))}
      </ActionRow>
    </ResultCardLayout>
  );
}
