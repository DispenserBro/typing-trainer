import type { MutableRefObject } from 'react';
import type { GameState, GameRunState, Progress } from '../../shared/types';
import { createEmptyEquippedState, getSafeCurrentRun, isGameRunEqual, readGameState } from './appGameState';

type GameRunActionsArgs = {
  commitGameState: (nextGame: GameState) => GameState;
  progressRef: MutableRefObject<Progress>;
  gameStateRef: MutableRefObject<GameState>;
};

export function createGameRunActions({
  commitGameState,
  progressRef,
  gameStateRef,
}: GameRunActionsArgs) {
  const saveGameState = (game: GameState) => {
    commitGameState(game);
  };

  const saveCurrentGameRun = (run: GameRunState | null) => {
    const safeRun = getSafeCurrentRun(run);
    const currentGame = gameStateRef.current ?? readGameState(progressRef.current);
    if (isGameRunEqual(currentGame.currentRun ?? null, safeRun)) return;
    commitGameState({
      ...currentGame,
      currentRun: safeRun,
    });
  };

  const clearCurrentGameRun = (destroyItems = false) => {
    const currentGame = gameStateRef.current ?? readGameState(progressRef.current);
    if (!destroyItems && !currentGame.currentRun) return;

    commitGameState(destroyItems
      ? {
        ...currentGame,
        inventory: [],
        discoveredItemIds: [],
        equipped: createEmptyEquippedState(),
        currentRun: null,
      }
      : {
        ...currentGame,
        currentRun: null,
      });
  };

  return {
    saveGameState,
    saveCurrentGameRun,
    clearCurrentGameRun,
  };
}
