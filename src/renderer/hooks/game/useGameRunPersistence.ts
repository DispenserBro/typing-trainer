import { useEffect, useRef } from 'react';
import type {
  BattleState,
  GameRunEventState,
  GameRunMapState,
  GameRunModifier,
  GameRunResult,
  GameRunRewardChoice,
  GameRunState,
} from '../../../shared/types';
import { createGameRunMap } from '../../../core/game/routes';
import { DAILY_RUN_LEVELS } from '../../../core/game/dailyRun';
import { TOTAL_GAME_LEVELS } from '../../../core/game/runUtils';

type UseGameRunPersistenceArgs = {
  activeModifiers: GameRunModifier[];
  baseHp: number;
  battleState: BattleState | null;
  completedLevels: number;
  currentRun: GameRunState | null | undefined;
  dailySeed: string | null;
  gameOver: boolean;
  gameStarted: boolean;
  gameWon: boolean;
  hp: number;
  level: number;
  levelText: string;
  maxHp: number;
  pendingEvent: GameRunEventState | null;
  regenTurns: number;
  result: GameRunResult | null;
  rewardChoices: GameRunRewardChoice[] | null;
  runDamageTaken: number;
  runMap: GameRunMapState | null;
  saveCurrentGameRun: (run: GameRunState | null) => void;
  selectedRewardMessage: string | null;
  setActiveModifiers: React.Dispatch<React.SetStateAction<GameRunModifier[]>>;
  setBattleState: React.Dispatch<React.SetStateAction<BattleState | null>>;
  setCompletedLevels: React.Dispatch<React.SetStateAction<number>>;
  setGameStarted: React.Dispatch<React.SetStateAction<boolean>>;
  setHp: React.Dispatch<React.SetStateAction<number>>;
  setLevel: React.Dispatch<React.SetStateAction<number>>;
  setLevelText: React.Dispatch<React.SetStateAction<string>>;
  setMaxHp: React.Dispatch<React.SetStateAction<number>>;
  setPendingEvent: React.Dispatch<React.SetStateAction<GameRunEventState | null>>;
  setRegenTurns: React.Dispatch<React.SetStateAction<number>>;
  setResult: React.Dispatch<React.SetStateAction<GameRunResult | null>>;
  setRewardChoices: React.Dispatch<React.SetStateAction<GameRunRewardChoice[] | null>>;
  setRunDamageTaken: React.Dispatch<React.SetStateAction<number>>;
  setRunMap: React.Dispatch<React.SetStateAction<GameRunMapState | null>>;
  setSelectedRewardMessage: React.Dispatch<React.SetStateAction<string | null>>;
  setShowStartPanel: React.Dispatch<React.SetStateAction<boolean>>;
  setTargetSpeedCpm: React.Dispatch<React.SetStateAction<number>>;
  targetSpeedCpm: number;
};

const MAIN_GAME_PREVIEW_MAP_SEED = 'main-game-preview-map';

export function useGameRunPersistence({
  activeModifiers,
  baseHp,
  battleState,
  completedLevels,
  currentRun,
  dailySeed,
  gameOver,
  gameStarted,
  gameWon,
  hp,
  level,
  levelText,
  maxHp,
  pendingEvent,
  regenTurns,
  result,
  rewardChoices,
  runDamageTaken,
  runMap,
  saveCurrentGameRun,
  selectedRewardMessage,
  setActiveModifiers,
  setBattleState,
  setCompletedLevels,
  setGameStarted,
  setHp,
  setLevel,
  setLevelText,
  setMaxHp,
  setPendingEvent,
  setRegenTurns,
  setResult,
  setRewardChoices,
  setRunDamageTaken,
  setRunMap,
  setSelectedRewardMessage,
  setShowStartPanel,
  setTargetSpeedCpm,
  targetSpeedCpm,
}: UseGameRunPersistenceArgs) {
  const hasHydratedRunRef = useRef(false);

  useEffect(() => {
    if (hasHydratedRunRef.current) return;
    hasHydratedRunRef.current = true;

    const savedRun = currentRun;
    if (!savedRun) return;

    setLevel(savedRun.level);
    setHp(savedRun.lives);
    setMaxHp(savedRun.maxLives ?? baseHp);
    setRunDamageTaken(savedRun.damageTaken ?? 0);
    setRegenTurns(savedRun.regenTurns ?? 0);
    setCompletedLevels(savedRun.completedLevels);
    setTargetSpeedCpm(savedRun.targetSpeedCpm);
    setLevelText(savedRun.levelText);
    setActiveModifiers(savedRun.activeModifiers ?? []);
    setRunMap(
      savedRun.map
      ?? createGameRunMap(
        savedRun.dailySeed ? DAILY_RUN_LEVELS : TOTAL_GAME_LEVELS,
        savedRun.dailySeed
          ? `daily-run:${savedRun.dailySeed}`
          : MAIN_GAME_PREVIEW_MAP_SEED,
      ),
    );
    setBattleState(savedRun.battleState ?? null);
    setPendingEvent(savedRun.pendingEvent ?? null);
    setResult(savedRun.result);
    setRewardChoices(savedRun.rewardChoices);
    setSelectedRewardMessage(savedRun.selectedRewardMessage);
    setGameStarted(true);
    setShowStartPanel(false);
  }, [
    baseHp,
    currentRun,
    setActiveModifiers,
    setBattleState,
    setCompletedLevels,
    setGameStarted,
    setHp,
    setLevel,
    setLevelText,
    setMaxHp,
    setPendingEvent,
    setRegenTurns,
    setResult,
    setRewardChoices,
    setRunDamageTaken,
    setRunMap,
    setSelectedRewardMessage,
    setShowStartPanel,
    setTargetSpeedCpm,
  ]);

  useEffect(() => {
    if (!hasHydratedRunRef.current || !gameStarted || gameOver || gameWon) return;

    saveCurrentGameRun({
      level,
      lives: hp,
      maxLives: maxHp,
      damageTaken: runDamageTaken,
      regenTurns,
      completedLevels,
      targetSpeedCpm,
      levelText,
      activeModifiers,
      battleState: battleState ?? null,
      map: runMap,
      pendingRoute: null,
      pendingEvent,
      result,
      rewardChoices,
      selectedRewardMessage,
      dailySeed,
    });
  }, [
    activeModifiers,
    battleState,
    completedLevels,
    dailySeed,
    gameOver,
    gameStarted,
    gameWon,
    hp,
    level,
    levelText,
    maxHp,
    pendingEvent,
    regenTurns,
    result,
    rewardChoices,
    runDamageTaken,
    runMap,
    saveCurrentGameRun,
    selectedRewardMessage,
    targetSpeedCpm,
  ]);
}
