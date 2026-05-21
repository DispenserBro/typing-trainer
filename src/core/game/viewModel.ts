import type {
  GameAchievementDefinition,
  GameGhostRun,
  GameRunEventChoice,
  GameRunResult,
  GameRunRewardChoice,
  LayoutsData,
  MotivationProgress,
  Progress,
  TranslationParams,
} from '../../shared/types';
import {
  getActiveMotivationGoalSnapshots,
  getMotivationStreakSnapshots,
} from '../motivation/progress';
import { getGameItemById, getGameItemRarityStars } from './items';
import { buildGameResultHistoryModel } from './resultHistory';

type Translate = (key: string, params?: TranslationParams) => string;

type BuildGameResultViewModelArgs = {
  currentLayout: string;
  dailySeed: string | null;
  ghostRun: GameGhostRun | null;
  historyEntries: NonNullable<Progress['history']>[string];
  layoutProgressUnlocked: number;
  layouts: LayoutsData;
  motivationProgress: MotivationProgress;
  progress: Progress;
  result: GameRunResult | null;
  rewardChoices: GameRunRewardChoice[] | null;
  selectableMapNodeIdsLength: number;
  selectedRewardMessage: string | null;
  translate: Translate;
};

type BuildGameTerminalSummaryViewModelArgs = {
  activeTotalLevels: number;
  completedLevels: number;
  gameWon: boolean;
  level: number;
  translate: Translate;
};

type BuildGameHudViewModelArgs = {
  bossTimeLimit: number | null;
  hp: number;
  maxHp: number;
  nowMs: number;
  resultElapsedSeconds: number;
  sessionActive: boolean;
  sessionStartTime: number;
};

type BuildGameEventChoiceCardViewModelsArgs = {
  choices: GameRunEventChoice[];
  eventKindLabel: string;
  translate: Translate;
};

export type GameAchievementToastState = {
  isHiding: boolean;
};

export type GameEventChoiceCardViewModel = {
  badgeLabel: string | null;
  cardClassName: string;
  choice: GameRunEventChoice;
  description: string;
  durability: {
    current: number;
    label: string;
    max: number;
  } | null;
  effects: string[];
  iconKey: string | null;
  kind: string;
  name: string;
  rarity: string;
  special: boolean;
};

export type GameAchievementToastViewModel = {
  achievement: GameAchievementDefinition;
  displayIndex: number;
  isHiding: boolean;
};

export type GameHudBarTone = 'danger' | 'warn' | null;

export type GameHudViewModel = {
  bossTimerDanger: boolean;
  bossTimerPercent: number;
  bossTimerRatio: number;
  hpPercent: number;
  hpRatio: number;
  hpTone: GameHudBarTone;
  liveElapsedSeconds: number;
};

export function buildGameResultViewModel({
  currentLayout,
  dailySeed,
  ghostRun,
  historyEntries,
  layoutProgressUnlocked,
  layouts,
  motivationProgress,
  progress,
  result,
  rewardChoices,
  selectableMapNodeIdsLength,
  selectedRewardMessage,
  translate,
}: BuildGameResultViewModelArgs) {
  const rewardPending = Boolean(result?.passed && result.isBoss && rewardChoices && !selectedRewardMessage);
  const mapSelectionPending = Boolean(result?.passed && selectableMapNodeIdsLength > 0);
  const isTerminalDailyRun = Boolean(dailySeed) && Boolean(result && (result.victory || result.livesLeft <= 0));
  const historyModel = buildGameResultHistoryModel({
    currentLayout,
    ghostRun,
    historyEntries,
    layoutProgressUnlocked,
    layouts,
    progress,
    result,
    translate,
  });

  return {
    comparison: historyModel.comparison,
    ghostComparison: historyModel.ghostComparison,
    isTerminalDailyRun,
    mapSelectionPending,
    masterySummary: historyModel.masterySummary,
    motivationGoals: getActiveMotivationGoalSnapshots(motivationProgress, translate, 1, ['game-victories']),
    motivationStreaks: getMotivationStreakSnapshots(motivationProgress, translate, ['clean-game-victories']),
    rewardPending,
  };
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function clampRatio(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function buildGameHudViewModel({
  bossTimeLimit,
  hp,
  maxHp,
  nowMs,
  resultElapsedSeconds,
  sessionActive,
  sessionStartTime,
}: BuildGameHudViewModelArgs): GameHudViewModel {
  const liveElapsedSeconds = sessionActive
    ? Math.max(0, (nowMs - sessionStartTime) / 1000)
    : Math.max(0, resultElapsedSeconds);
  const bossTimerRatio = bossTimeLimit && bossTimeLimit > 0
    ? clampRatio(liveElapsedSeconds / bossTimeLimit)
    : 0;
  const hpRatio = maxHp > 0 ? clampRatio(hp / maxHp) : 0;

  return {
    bossTimerDanger: bossTimerRatio >= 0.85,
    bossTimerPercent: clampPercent(bossTimerRatio * 100),
    bossTimerRatio,
    hpPercent: clampPercent(hpRatio * 100),
    hpRatio,
    hpTone: hpRatio <= 0.25 ? 'danger' : hpRatio <= 0.5 ? 'warn' : null,
    liveElapsedSeconds,
  };
}

export function buildGameAchievementToastViewModels(
  achievements: GameAchievementDefinition[],
  toastStates: ReadonlyMap<number, GameAchievementToastState>,
  visibleLimit = 3,
): GameAchievementToastViewModel[] {
  const limit = Math.max(0, Math.floor(visibleLimit));
  return achievements.slice(0, limit).map((achievement, displayIndex) => ({
    achievement,
    displayIndex,
    isHiding: toastStates.get(displayIndex)?.isHiding ?? false,
  }));
}

export function buildGameEventChoiceCardViewModels({
  choices,
  eventKindLabel,
  translate,
}: BuildGameEventChoiceCardViewModelsArgs): GameEventChoiceCardViewModel[] {
  return choices.map((choice) => {
    const choiceItem = choice.effect.grantItemId ? getGameItemById(choice.effect.grantItemId) : null;
    const effectDescriptions = [
      choice.effect.lifeDelta
        ? `${choice.effect.lifeDelta > 0 ? '+' : ''}${choice.effect.lifeDelta} ${translate('game.hud.hpShort')}`
        : null,
      choice.effect.repairEquippedBy
        ? translate('game.event.repairBonus', { count: choice.effect.repairEquippedBy })
        : null,
      choice.effect.modifier?.description ?? null,
    ].filter((entry): entry is string => Boolean(entry));

    return {
      badgeLabel: choiceItem ? null : choice.title.slice(0, 1).toUpperCase(),
      cardClassName: `${choiceItem ? `rarity-${choiceItem.rarity}` : ''}${choice.disabled ? ' disabled' : ''}`.trim(),
      choice,
      description: choice.description,
      durability: choiceItem?.maxDurability != null
        ? {
          current: choiceItem.maxDurability,
          label: translate('game.inventory.durability'),
          max: choiceItem.maxDurability,
        }
        : null,
      effects: [
        ...(choiceItem?.effects.map(effect => effect.description) ?? []),
        ...effectDescriptions,
      ],
      iconKey: choiceItem?.icon ?? null,
      kind: choice.flavor,
      name: choice.title,
      rarity: choiceItem ? getGameItemRarityStars(choiceItem.rarity) : eventKindLabel,
      special: !choiceItem,
    };
  });
}

export function buildGameTerminalSummaryViewModel({
  activeTotalLevels,
  completedLevels,
  gameWon,
  level,
  translate,
}: BuildGameTerminalSummaryViewModelArgs) {
  if (!gameWon && completedLevels <= 0 && level <= 0) return null;

  return {
    description: gameWon
      ? translate('game.summary.victory', { totalLevels: activeTotalLevels })
      : translate('game.summary.defeat', { completedLevels, bestLevel: Math.max(level, completedLevels) }),
    title: translate('game.summary.title'),
  };
}
