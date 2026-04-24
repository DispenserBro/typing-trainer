import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { flushSync } from 'react-dom';
import type {
  GameAchievementDefinition,
  GameState,
  Progress,
} from '../../shared/types';

type PersistProgress = (next: Progress) => void;

type AchievementActionsArgs = {
  setProgress: Dispatch<SetStateAction<Progress>>;
  setGameState: Dispatch<SetStateAction<GameState>>;
  persistProgress: PersistProgress;
  progressRef: MutableRefObject<Progress>;
  gameStateRef: MutableRefObject<GameState>;
  achievementCatalog: GameAchievementDefinition[];
};

type AchievementUnlockPlan = {
  achievementIds: string[];
  unlocked: GameAchievementDefinition[];
};

function resolveAchievementUnlockPlan(
  achievementIds: string[],
  achievementCatalog: GameAchievementDefinition[],
  knownAchievementIds: Iterable<string>,
): AchievementUnlockPlan {
  const achievementMap = Object.fromEntries(achievementCatalog.map(achievement => [achievement.id, achievement]));
  const knownIds = new Set(knownAchievementIds);
  const unlocked: GameAchievementDefinition[] = [];

  for (const achievementId of achievementIds) {
    const achievement = achievementMap[achievementId];
    if (!achievement || knownIds.has(achievementId)) continue;
    knownIds.add(achievementId);
    unlocked.push(achievement);
  }

  return {
    achievementIds: Array.from(knownIds),
    unlocked,
  };
}

export function createAchievementActions({
  setProgress,
  setGameState,
  persistProgress,
  progressRef,
  gameStateRef,
  achievementCatalog,
}: AchievementActionsArgs) {
  const persistProgressState = (next: Progress) => {
    progressRef.current = next;
    persistProgress(next);
  };

  const unlockAchievements = (achievementIds: string[]): GameAchievementDefinition[] => {
    const plan = resolveAchievementUnlockPlan(
      achievementIds,
      achievementCatalog,
      progressRef.current.achievements ?? [],
    );
    if (!plan.unlocked.length) return plan.unlocked;

    const updatedProgress = {
      ...progressRef.current,
      achievements: plan.achievementIds,
    };
    persistProgressState(updatedProgress);

    flushSync(() => {
      setProgress(() => updatedProgress);
    });

    return plan.unlocked;
  };

  const unlockGameAchievements = (achievementIds: string[]): GameAchievementDefinition[] => {
    if (!achievementIds.length) return [];

    const game = gameStateRef.current;
    const gamePlan = resolveAchievementUnlockPlan(
      achievementIds,
      achievementCatalog,
      game.achievements,
    );
    if (!gamePlan.unlocked.length) return gamePlan.unlocked;

    const nextGameState = {
      ...game,
      achievements: gamePlan.achievementIds,
    };
    const progressPlan = resolveAchievementUnlockPlan(
      gamePlan.unlocked.map(achievement => achievement.id),
      achievementCatalog,
      progressRef.current.achievements ?? [],
    );
    const updatedProgress = {
      ...progressRef.current,
      game: nextGameState,
      achievements: progressPlan.achievementIds,
    };

    progressRef.current = updatedProgress;
    gameStateRef.current = nextGameState;
    persistProgress(updatedProgress);

    flushSync(() => {
      setProgress(() => updatedProgress);
      setGameState(() => nextGameState);
    });

    return gamePlan.unlocked;
  };

  return {
    unlockAchievements,
    unlockGameAchievements,
  };
}
