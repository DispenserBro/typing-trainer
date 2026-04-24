import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type {
  GameAchievementDefinition,
  GameState,
  LayoutsData,
  Progress,
} from '../../shared/types';
import { getLayoutProgress, getNextUnlockableLetter } from './appProgress';
import { createEmptyEquippedState, readGameState } from './appGameState';

type PersistProgress = (next: Progress) => void;

type GameProgressionActionsArgs = {
  commitGameState: (nextGame: GameState) => GameState;
  setProgress: Dispatch<SetStateAction<Progress>>;
  persistProgress: PersistProgress;
  progressRef: MutableRefObject<Progress>;
  gameStateRef: MutableRefObject<GameState>;
  currentLayout: string;
  layouts: LayoutsData;
  achievementCatalog: GameAchievementDefinition[];
};

export function createGameProgressionActions({
  commitGameState,
  setProgress,
  persistProgress,
  progressRef,
  gameStateRef,
  currentLayout,
  layouts,
  achievementCatalog,
}: GameProgressionActionsArgs) {
  const achievementMap = Object.fromEntries(achievementCatalog.map(a => [a.id, a]));

  const persistProgressState = (next: Progress) => {
    progressRef.current = next;
    persistProgress(next);
  };

  const resetGameProgress = () => {
    const game = gameStateRef.current ?? readGameState(progressRef.current);
    commitGameState({
      ...game,
      highestLevel: 1,
      inventory: [],
      discoveredItemIds: [],
      achievements: [],
      equipped: createEmptyEquippedState(),
      currentRun: null,
    });
  };

  const markGameLevelReached = (level: number) => {
    const game = gameStateRef.current ?? readGameState(progressRef.current);
    const normalizedLevel = Math.max(1, Math.floor(level || 1));
    if (normalizedLevel <= game.highestLevel) return;
    commitGameState({ ...game, highestLevel: normalizedLevel });
  };

  const peekNextGameLetter = () => getNextUnlockableLetter(progressRef.current, layouts, currentLayout);

  const unlockNextGameLetter = () => {
    const unlockedChar = getNextUnlockableLetter(progressRef.current, layouts, currentLayout);
    if (!unlockedChar) return null;

    setProgress(prev => {
      const next = { ...prev };
      const layoutProgress = getLayoutProgress(next, currentLayout);
      layoutProgress.unlocked += 1;
      layoutProgress.unlockProgress = 0;
      persistProgressState(next);
      return next;
    });

    return unlockedChar;
  };

  const unlockGameAchievements = (achievementIds: string[]) => {
    const currentProgress = progressRef.current;
    const game = readGameState(currentProgress);
    const knownAchievements = new Set(game.achievements);
    const unlocked: GameAchievementDefinition[] = [];

    for (const achievementId of achievementIds) {
      const achievement = achievementMap[achievementId];
      if (!achievement || knownAchievements.has(achievementId)) continue;
      knownAchievements.add(achievementId);
      unlocked.push(achievement);
    }

    if (!unlocked.length) return unlocked;

    const nextAchievements = Array.from(new Set([...game.achievements, ...unlocked.map(achievement => achievement.id)]));
    commitGameState({
      ...game,
      achievements: nextAchievements,
    });

    return unlocked;
  };

  return {
    resetGameProgress,
    markGameLevelReached,
    peekNextGameLetter,
    unlockNextGameLetter,
    unlockGameAchievements,
  };
}
