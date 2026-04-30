import type {
  GameRunResult,
  GameRunRewardChoice,
  TranslationParams,
} from '../../shared/types';
import {
  getGameItemById,
  getGameItemRarityStars,
} from './items';

type TranslateFn = (key: string, params?: TranslationParams) => string;

export type GameRewardChoiceBadgeViewModel =
  | { kind: 'event'; label: string }
  | { kind: 'item'; iconKey: string }
  | { kind: 'letter'; label: string };

export type GameRewardChoiceViewModel = {
  actionLabel: string;
  badge: GameRewardChoiceBadgeViewModel;
  cardClassName: string;
  choiceId: string;
  description: string;
  disabled: boolean;
  durability: {
    current: number;
    label: string;
    max: number;
  } | null;
  effects: string[];
  kindLabel: string;
  name: string;
  rarity: string;
  special: boolean;
};

export type GameRewardChoiceBlockViewModel = {
  choices: GameRewardChoiceViewModel[];
  selectedRewardMessage: string | null;
  title: string;
};

function getGameRewardKindLabel(kind: GameRunRewardChoice['kind'], translate: TranslateFn) {
  if (kind === 'simple') return translate('game.reward.kind.simple');
  if (kind === 'durable') return translate('game.reward.kind.durable');
  if (kind === 'event') return translate('game.reward.kind.event');
  return translate('game.reward.kind.letter');
}

function getGameRewardActionLabel(kind: GameRunRewardChoice['kind'], translate: TranslateFn) {
  if (kind === 'letter') return translate('game.result.reward.actions.wakeLetter');
  if (kind === 'event') return translate('game.result.reward.actions.accept');
  if (kind === 'simple') return translate('game.result.reward.actions.takeRelic');
  return translate('game.result.reward.actions.riskTake');
}

function buildGameRewardBadge(choice: GameRunRewardChoice, iconKey: string | null): GameRewardChoiceBadgeViewModel {
  if (choice.kind === 'letter') {
    return { kind: 'letter', label: choice.letter?.toUpperCase() ?? '?' };
  }
  if (choice.kind === 'event') {
    return { kind: 'event', label: '\u2726' };
  }
  return { kind: 'item', iconKey: iconKey ?? 'gem' };
}

function buildGameRewardChoiceViewModel(
  choice: GameRunRewardChoice,
  translate: TranslateFn,
): GameRewardChoiceViewModel {
  const rewardItem = choice.itemId ? getGameItemById(choice.itemId) : null;
  const special = choice.kind === 'letter' || choice.kind === 'event';
  const cardClassName = `${rewardItem ? `rarity-${rewardItem.rarity}` : ''}${choice.disabled ? ' disabled' : ''}`.trim();

  return {
    actionLabel: getGameRewardActionLabel(choice.kind, translate),
    badge: buildGameRewardBadge(choice, rewardItem?.icon ?? null),
    cardClassName,
    choiceId: choice.id,
    description: choice.description,
    disabled: Boolean(choice.disabled),
    durability: rewardItem?.maxDurability != null
      ? {
          current: rewardItem.maxDurability,
          label: translate('game.inventory.durability'),
          max: rewardItem.maxDurability,
        }
      : null,
    effects: rewardItem?.effects.map(effect => effect.description) ?? [],
    kindLabel: getGameRewardKindLabel(choice.kind, translate),
    name: rewardItem?.name
      ?? (choice.letter
        ? translate('game.result.reward.letterName', { letter: choice.letter.toUpperCase() })
        : choice.title),
    rarity: rewardItem ? getGameItemRarityStars(rewardItem.rarity) : translate('game.result.reward.specialReward'),
    special,
  };
}

export function buildGameRewardChoiceBlockViewModel({
  result,
  rewardChoices,
  selectedRewardMessage,
  translate,
}: {
  result: GameRunResult;
  rewardChoices: GameRunRewardChoice[] | null;
  selectedRewardMessage: string | null;
  translate: TranslateFn;
}): GameRewardChoiceBlockViewModel | null {
  if (!rewardChoices || !result.passed || !result.isBoss || result.victory) {
    return null;
  }

  return {
    choices: selectedRewardMessage
      ? []
      : rewardChoices.map(choice => buildGameRewardChoiceViewModel(choice, translate)),
    selectedRewardMessage,
    title: translate('game.result.bossRewardTitle'),
  };
}
