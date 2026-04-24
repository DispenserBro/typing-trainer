import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { GameState, PracticeSettings, Progress, UserSettings } from '../../shared/types';
import { defaultPracticeSettings } from './appDefaults';
import { stabilizeGameState } from './appGameState';
import { resolveGameState, resolveSettings } from './appResolvers';
import { readGameState } from './appGameState';

type PersistProgress = (next: Progress) => void;

type ReplaceResolvedProgressStateArgs = {
  nextProgress: Progress;
  setProgress: Dispatch<SetStateAction<Progress>>;
  setSettingsState: Dispatch<SetStateAction<UserSettings>>;
  setPracticeSettingsState: Dispatch<SetStateAction<PracticeSettings>>;
  setGameState: Dispatch<SetStateAction<GameState>>;
  persistProgress: PersistProgress;
  progressRef: MutableRefObject<Progress>;
  settingsRef: MutableRefObject<UserSettings>;
  practiceSettingsRef: MutableRefObject<PracticeSettings>;
  gameStateRef: MutableRefObject<GameState>;
};

export type ResolvedProgressState = {
  nextProgress: Progress;
  settings: UserSettings;
  practiceSettings: PracticeSettings;
  gameState: GameState;
};

const normalizeNextProgressRef = (prevProgress: Progress, nextProgress: Progress): Progress => (
  nextProgress === prevProgress ? { ...nextProgress } : nextProgress
);

export function resolveLoadedProgressState(
  loadedProgress: Progress,
  previousGameState: GameState | null,
): ResolvedProgressState {
  const game = resolveGameState(loadedProgress);
  const gameAchievements = game.achievements ?? [];
  const progressAchievements = loadedProgress.achievements ?? [];
  const nextProgress = {
    ...loadedProgress,
    game,
    achievements: Array.from(new Set([...progressAchievements, ...gameAchievements])),
  };
  const settings = resolveSettings(nextProgress);
  const practiceSettings = defaultPracticeSettings(nextProgress.practiceSettings);
  const gameState = stabilizeGameState(previousGameState, nextProgress.game);

  return {
    nextProgress,
    settings,
    practiceSettings,
    gameState,
  };
}

export function replaceResolvedProgressState({
  nextProgress,
  setProgress,
  setSettingsState,
  setPracticeSettingsState,
  setGameState,
  persistProgress,
  progressRef,
  settingsRef,
  practiceSettingsRef,
  gameStateRef,
}: ReplaceResolvedProgressStateArgs): ResolvedProgressState {
  const normalizedNextProgress = normalizeNextProgressRef(progressRef.current, nextProgress);
  const settings = resolveSettings(normalizedNextProgress);
  const practiceSettings = defaultPracticeSettings(normalizedNextProgress.practiceSettings);
  const nextGameState = readGameState(normalizedNextProgress);
  const gameState = stabilizeGameState(gameStateRef.current, nextGameState);

  progressRef.current = normalizedNextProgress;
  settingsRef.current = settings;
  practiceSettingsRef.current = practiceSettings;
  gameStateRef.current = gameState;

  setSettingsState(() => settings);
  setPracticeSettingsState(() => practiceSettings);
  setGameState(() => gameState);
  setProgress(() => normalizedNextProgress);
  persistProgress(normalizedNextProgress);

  return {
    nextProgress: normalizedNextProgress,
    settings,
    practiceSettings,
    gameState,
  };
}
