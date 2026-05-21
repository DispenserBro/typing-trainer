import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type {
  GameAchievementDefinition,
  GameState,
  LayoutsData,
  Progress,
} from '../../shared/types';
import { createGameRunActions } from './appActionsGameRun';
import { createGameInventoryActions } from './appActionsGameInventory';
import { createGameProgressionActions } from './appActionsGameProgression';
import { isGameStateEqual, normalizeGameState, readGameState } from './appGameState';

type PersistProgress = (next: Progress) => void;

type GameActionsArgs = {
  setProgress: Dispatch<SetStateAction<Progress>>;
  setGameState: Dispatch<SetStateAction<GameState>>;
  persistProgress: PersistProgress;
  progressRef: MutableRefObject<Progress>;
  gameStateRef: MutableRefObject<GameState>;
  currentLayout: string;
  layouts: LayoutsData;
  achievementCatalog: GameAchievementDefinition[];
  onGameStateChange?: (previousState: GameState, nextState: GameState) => void;
};

export function createGameActions({
  setProgress,
  setGameState,
  persistProgress,
  progressRef,
  gameStateRef,
  currentLayout,
  layouts,
  achievementCatalog,
  onGameStateChange,
}: GameActionsArgs) {
  const persistProgressState = (next: Progress) => {
    progressRef.current = next;
    persistProgress(next);
  };

  const commitGameState = (nextGame: GameState) => {
    const previousGame = gameStateRef.current;
    const normalizedGame = normalizeGameState(nextGame);
    const changed = !isGameStateEqual(previousGame, normalizedGame);
    gameStateRef.current = normalizedGame;
    setGameState(prev => (isGameStateEqual(prev, normalizedGame) ? prev : normalizedGame));
    setProgress(prev => {
      if (isGameStateEqual(readGameState(prev), normalizedGame)) return prev;
      const next = { ...prev, game: normalizedGame };
      persistProgressState(next);
      return next;
    });
    if (changed) onGameStateChange?.(previousGame, normalizedGame);
    return normalizedGame;
  };

  const {
    saveGameState,
    saveCurrentGameRun,
    clearCurrentGameRun,
  } = createGameRunActions({
    commitGameState,
    progressRef,
    gameStateRef,
  });

  const {
    grantGameItem,
    equipGameItem,
    unequipGameItem,
    wearEquippedGameItems,
    repairGameItems,
    resetGameInventory,
  } = createGameInventoryActions({
    commitGameState,
    progressRef,
    gameStateRef,
  });

  const {
    resetGameProgress,
    markGameLevelReached,
    peekNextGameLetter,
    unlockNextGameLetter,
    unlockGameAchievements,
  } = createGameProgressionActions({
    commitGameState,
    setProgress,
    persistProgress,
    progressRef,
    gameStateRef,
    currentLayout,
    layouts,
    achievementCatalog,
  });

  return {
    saveGameState,
    grantGameItem,
    equipGameItem,
    unequipGameItem,
    wearEquippedGameItems,
    repairGameItems,
    resetGameInventory,
    resetGameProgress,
    saveCurrentGameRun,
    clearCurrentGameRun,
    markGameLevelReached,
    peekNextGameLetter,
    unlockNextGameLetter,
    unlockGameAchievements,
  };
}
