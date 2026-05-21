import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Trophy } from 'lucide-react';
import type {
  GameAchievementDefinition,
  GameEquipmentSlot,
  GameGhostRun,
  GameRunEventChoice,
  GameRunEventState,
  GameRunMapState,
  GameRunModifier,
  GameRunRewardChoice,
  GameRunResult,
  HistoryEntry,
  BossArchetypeId,
  BattleState,
} from '../../shared/types';
import { useAppGame, useAppSettings } from '../contexts/AppContext';
import { useI18n } from '../contexts/I18nContext';
import { useGameAchievementsState } from '../hooks/game/useGameAchievementsState';
import { useGameResultFocus } from '../hooks/game/useGameResultFocus';
import { useGameRunPersistence } from '../hooks/game/useGameRunPersistence';
import { useTypingSession } from '../hooks/useTypingSession';
import { TextDisplay } from '../components/TextDisplay';
import { AchievementsModal } from '../components/AchievementsModal';
import { GameAchievementToastStack } from '../components/game/GameAchievementToastStack';
import { GameHud } from '../components/game/GameHud';
import { GameInventoryPanel } from '../components/game/GameInventoryPanel';
import { GameEventModal } from '../components/game/GameEventModal';
import { GameRunMap } from '../components/game/GameRunMap';
import { GameResultCard } from '../components/game/GameResultCard';
import { GameStartPanel } from '../components/game/GameStartPanel';
import { GameBattleOverlay } from '../components/game/GameBattleOverlay';
import { GameTerminalSummaryCard } from '../components/game/GameTerminalSummaryCard';
import { GameMapStage } from '../components/game/GameMapStage';
import { AchievementCounterButton } from '../components/ui/AchievementCounterButton';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { buildPracticeContentText, getWorstChar, filterYoWords, filterYoKeys } from '../../core/engine';
import { getGameItemById } from '../../core/game/items';
import {
  createCacheEvent,
  createRestEvent,
  createRiskEvent,
  createShopEvent,
} from '../../core/game/gameEvents';
import {
  createGameRunMap,
  getGameRunMapNode,
  getGameRunMapOutgoingIds,
  selectGameRunMapNode,
  setGameRunMapSelectableNodes,
} from '../../core/game/routes';
import {
  buildEquippedBySlot,
  buildEquippedEntries,
  buildGamePageBonusViewModel,
  buildInventoryEntries,
  getHasRepairTargets,
  getTargetSpeedDisplay,
} from '../../core/game/pageUtils';
import type { EquippedEntry, InventoryEntry } from '../../core/game/viewTypes';
import {
  BOSS_LEVEL_INTERVAL,
  BOSS_MIN_ACCURACY,
  buildBossRewardChoices,
  formatSpeedFromCpm,
  getBossMinAccuracy,
  getBossWordCount,
  isBossLevel,
  NORMAL_LEVEL_WORDS,
  NORMAL_MIN_ACCURACY,
  TOTAL_GAME_LEVELS,
} from '../../core/game/runUtils';
import { resolveGameChoiceEffect, resolveGamePostLevelFlow } from '../../core/game/runFlow';
import { getBossArchetype, computeRhythmDeviation } from '../../core/game/bossArchetypes';
import {
  createEnemy,
  createBattleState,
  resolveBattleRound,
  getEnemyTier,
  BATTLE_ROUND_WORDS,
  BOSS_BATTLE_ROUND_WORDS,
  PLAYER_BASE_HP,
  REGEN_HP_PER_BATTLE,
} from '../../core/game/battleSystem';
import {
  createEmptyGhostRun,
  recordGhostLevel,
  finalizeGhostRun,
  shouldReplaceGhost,
} from '../../core/game/ghostRun';
import {
  DAILY_RUN_LEVELS,
  getDailySeedString,
  getDailyDateKey,
  createDailyRng,
  recordDailyRunAttempt,
  getTodayDailyResult,
  getRecentDailyResults,
  resolveInitialDailyRunState,
} from '../../core/game/dailyRun';
import {
  updateMotivationAfterGame,
} from '../../core/motivation/progress';
import { buildGameResultViewModel, buildGameTerminalSummaryViewModel } from '../../core/game/viewModel';

type BossRewardChoice = GameRunRewardChoice;
type LevelResult = GameRunResult;

const EMPTY_HISTORY: HistoryEntry[] = [];

function isInventoryEntryEqual(left: InventoryEntry, right: InventoryEntry) {
  return left.id === right.id
    && left.itemId === right.itemId
    && left.durability === right.durability
    && left.maxDurability === right.maxDurability
    && left.equippedIn === right.equippedIn
    && left.broken === right.broken
    && (left.meta?.id ?? null) === (right.meta?.id ?? null);
}

function areInventoryEntriesEqual(left: InventoryEntry[], right: InventoryEntry[]) {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (!isInventoryEntryEqual(left[i]!, right[i]!)) return false;
  }
  return true;
}

function isEquippedEntryEqual(left: EquippedEntry, right: EquippedEntry) {
  return left.slot.key === right.slot.key
    && left.broken === right.broken
    && (left.meta?.id ?? null) === (right.meta?.id ?? null)
    && (left.inventoryItem?.id ?? null) === (right.inventoryItem?.id ?? null)
    && (left.inventoryItem?.durability ?? null) === (right.inventoryItem?.durability ?? null)
    && (left.inventoryItem?.maxDurability ?? null) === (right.inventoryItem?.maxDurability ?? null);
}

function areEquippedEntriesEqual(left: EquippedEntry[], right: EquippedEntry[]) {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (!isEquippedEntryEqual(left[i]!, right[i]!)) return false;
  }
  return true;
}

function blurActiveElement() {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}

export function GamePage() {
  const { t } = useI18n();
  const {
    layouts, allWords, ngramModel, progress,
    fmtSpeed, spdLabel, saveHistory, getLayoutProgress,
    gameState, grantGameItem, equipGameItem, unequipGameItem, repairGameItems, markGameLevelReached,
    wearEquippedGameItems, peekNextGameLetter, unlockNextGameLetter,
    unlockGameAchievements, saveCurrentGameRun, clearCurrentGameRun, gameAchievementCatalog,
    saveGameState, unlockedAchievementIds, modRuleOverrides, motivationProgress, updateMotivationProgress,
  } = useAppGame();
  const { currentLayout, settings, practiceSettings } = useAppSettings();

  /** Base HP — can be overridden by mods via rules.set('game.baseHp', N) */
  const baseHp = typeof modRuleOverrides.get('game.baseHp') === 'number'
    ? (modRuleOverrides.get('game.baseHp') as number)
    : (typeof modRuleOverrides.get('game.baseLives') === 'number'
      ? (modRuleOverrides.get('game.baseLives') as number)
      : PLAYER_BASE_HP);

  const useYo = settings.useYo;
  const layout = layouts.layouts[currentLayout];
  const words = useMemo(() => filterYoWords(allWords, useYo), [allWords, useYo]);
  const practiceUnlockOrder = useMemo(
    () => filterYoKeys(layout?.practiceUnlockOrder ?? [], useYo),
    [layout, useYo],
  );
  const layoutProgress = getLayoutProgress();
  const unlocked = practiceUnlockOrder.slice(0, layoutProgress.unlocked);
  const weak = getWorstChar(progress.keyStats?.[currentLayout], unlocked);

  const equippedBySlot = useMemo(
    () => buildEquippedBySlot(gameState.equipped),
    [gameState.equipped],
  );

  const inventoryItems = useMemo(
    () => buildInventoryEntries(gameState.inventory, gameState.equipped),
    [gameState.equipped, gameState.inventory],
  );

  const equippedItems = useMemo(
    () => buildEquippedEntries(equippedBySlot, inventoryItems),
    [equippedBySlot, inventoryItems],
  );
  const stableInventoryItemsRef = useRef<InventoryEntry[]>([]);
  const stableEquippedItemsRef = useRef<EquippedEntry[]>([]);

  if (!areInventoryEntriesEqual(stableInventoryItemsRef.current, inventoryItems)) {
    stableInventoryItemsRef.current = inventoryItems;
  }

  if (!areEquippedEntriesEqual(stableEquippedItemsRef.current, equippedItems)) {
    stableEquippedItemsRef.current = equippedItems;
  }

  const stableInventoryItems = stableInventoryItemsRef.current;
  const stableEquippedItems = stableEquippedItemsRef.current;
  const hasRepairTargets = useMemo(() => getHasRepairTargets(stableEquippedItems), [stableEquippedItems]);

  const [targetSpeedCpm, setTargetSpeedCpm] = useState(() => Math.max(1, practiceSettings.goalSpeedCpm || 150));
  const [hp, setHp] = useState(baseHp);
  const [maxHp, setMaxHp] = useState(baseHp);
  const [runDamageTaken, setRunDamageTaken] = useState(0);
  const [regenTurns, setRegenTurns] = useState(0);
  const [level, setLevel] = useState(1);
  const [completedLevels, setCompletedLevels] = useState(0);
  const [levelText, setLevelText] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [showStartPanel, setShowStartPanel] = useState(true);
  const [result, setResult] = useState<LevelResult | null>(null);
  const [activeModifiers, setActiveModifiers] = useState<GameRunModifier[]>([]);
  const [runMap, setRunMap] = useState<GameRunMapState | null>(null);
  const [pendingEvent, setPendingEvent] = useState<GameRunEventState | null>(null);
  const [rewardChoices, setRewardChoices] = useState<BossRewardChoice[] | null>(null);
  const [selectedRewardMessage, setSelectedRewardMessage] = useState<string | null>(null);
  const [currentGhost, setCurrentGhost] = useState<GameGhostRun>(() => createEmptyGhostRun());
  const [dailySeed, setDailySeed] = useState<string | null>(null);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const activeTotalLevels = dailySeed ? DAILY_RUN_LEVELS : TOTAL_GAME_LEVELS;
  const [autoAdvanceLevel, setAutoAdvanceLevel] = useState<number | null>(null);
  const finishCauseRef = useRef<'completed' | 'timeout'>('completed');
  const startSessionRef = useRef<(text: string) => void>(() => {});
  const previewMap = useMemo(
    () => createGameRunMap(TOTAL_GAME_LEVELS, 'main-game-preview-map'),
    [],
  );
  const activeIsBoss = isBossLevel(level);
  const achievementMap = useMemo(
    () => Object.fromEntries(gameAchievementCatalog.map(a => [a.id, a])),
    [gameAchievementCatalog],
  );
  const unlockedAchievements = useMemo(
    () => gameState.achievements
      .map(achievementId => achievementMap[achievementId])
      .filter((achievement): achievement is GameAchievementDefinition => Boolean(achievement)),
    [gameState.achievements, achievementMap],
  );
  const gameAchievementsCatalog = useMemo(
    () => gameAchievementCatalog.filter(a => (a.category ?? 'game') === 'game'),
    [gameAchievementCatalog],
  );
  const gameBonusViewModel = useMemo(
    () => buildGamePageBonusViewModel(stableEquippedItems, activeModifiers, activeIsBoss),
    [activeIsBoss, activeModifiers, stableEquippedItems],
  );
  const {
    setBonuses,
    totalBonuses,
    battleBonuses,
  } = gameBonusViewModel;
  const activeMap = runMap ?? previewMap;
  const currentMapNode = useMemo(
    () => getGameRunMapNode(activeMap, activeMap.currentNodeId),
    [activeMap],
  );
  const selectableMapNodeIds = activeMap.selectableNodeIds;

  const goalWpm = targetSpeedCpm / 5;
  const unit = settings.speedUnit;
  const targetSpeedDisplay = getTargetSpeedDisplay(targetSpeedCpm, unit);
  const effectiveGoalWpm = goalWpm * (1 - totalBonuses.speedRequirementReductionPercent / 100);
  const effectiveTargetSpeedCpm = targetSpeedCpm * (1 - totalBonuses.speedRequirementReductionPercent / 100);
  const effectiveTargetSpeedDisplay = formatSpeedFromCpm(effectiveTargetSpeedCpm, unit);
  const {
    achievementToasts,
    closeAchievementsModal,
    handleRemoveToast,
    openAchievementsModal,
    queueAchievementToasts,
    showAchievementsModal,
  } = useGameAchievementsState({
    stableEquippedItems,
    unlockGameAchievements,
  });

  const handleEquipItem = useCallback((slot: GameEquipmentSlot, itemId: string) => {
    blurActiveElement();
    const equipped = equipGameItem(slot, itemId);
    if (equipped) queueAchievementToasts(['equip-item']);
  }, [equipGameItem, queueAchievementToasts]);

  const handleUnequipItem = useCallback((slot: GameEquipmentSlot) => {
    blurActiveElement();
    unequipGameItem(slot);
  }, [unequipGameItem]);

  const updateTargetSpeed = (value: number) => {
    const normalized = Math.max(1, Number.isFinite(value) ? value : 1);
    const cpm = unit === 'wpm' ? normalized * 5
      : unit === 'cps' ? normalized * 60
      : normalized;
    setTargetSpeedCpm(Math.round(cpm));
  };

  const buildLevelText = useCallback((nextLevel: number, wordCount?: number) => {
    const count = wordCount ?? (isBossLevel(nextLevel) ? getBossWordCount(nextLevel) : NORMAL_LEVEL_WORDS);
    return buildPracticeContentText({
      allWords: words,
      unlockedChars: unlocked,
      weakChar: weak,
      contentMode: 'adaptive-words',
      scenarioId: isBossLevel(nextLevel) ? 'flawless' : 'survival',
      wordCountOverride: count,
      ngramModel: ngramModel ?? undefined,
    });
  }, [words, unlocked, weak, ngramModel]);

  const calculateBossTimeLimit = useCallback((text: string) => {
    const requiredChars = text.length + (settings.endWithSpace ? 1 : 0);
    return requiredChars * 60 / targetSpeedCpm + totalBonuses.bossTimerBonusSeconds;
  }, [settings.endWithSpace, targetSpeedCpm, totalBonuses.bossTimerBonusSeconds]);

  const currentBossTimeLimit = useMemo(() => {
    if (!activeIsBoss || !levelText) return null;
    const archetype = getBossArchetype(level);
    return calculateBossTimeLimit(levelText) * archetype.timerMultiplier;
  }, [activeIsBoss, level, levelText, calculateBossTimeLimit]);

  const currentBossArchetype = useMemo(
    () => activeIsBoss ? getBossArchetype(level) : null,
    [activeIsBoss, level],
  );

  const generateBossRewardChoices = useCallback((): BossRewardChoice[] => {
    return buildBossRewardChoices(peekNextGameLetter(), level);
  }, [peekNextGameLetter, level]);

  const resetRewardState = useCallback(() => {
    setRewardChoices(null);
    setSelectedRewardMessage(null);
    rewardChoiceRefs.current = [];
  }, []);

  const resetMapSelection = useCallback(() => {
    setRunMap(prev => (prev ? setGameRunMapSelectableNodes(prev, []) : prev));
  }, []);

  const resetEventState = useCallback(() => {
    setPendingEvent(null);
    eventChoiceRefs.current = [];
  }, []);

  const consumeActiveModifiers = useCallback(() => {
    setActiveModifiers(prev => prev
      .map(modifier => ({ ...modifier, remainingLevels: modifier.remainingLevels - 1 }))
      .filter(modifier => modifier.remainingLevels > 0),
    );
  }, []);

  const onFinish = useCallback((wpm: number, acc: number, elapsed: number, ses: any) => {
    const boss = isBossLevel(level);
    const archetype = boss ? getBossArchetype(level) : null;
    const baseMinAccuracy = boss ? getBossMinAccuracy(level) : NORMAL_MIN_ACCURACY;
    const minAccuracy = Math.max(0, baseMinAccuracy - totalBonuses.accuracyRequirementReduction);
    const timedOut = finishCauseRef.current === 'timeout';
    finishCauseRef.current = 'completed';

    // ── Battle round resolution ──
    if (battleState && !battleState.finished) {
      const currentCpm = wpm * 5;
      const keypressesForRhythm = ses?.keypresses ?? [];
      const rhythmIntervals = keypressesForRhythm
        .filter((kp: any) => kp.interval > 0)
        .map((kp: any) => kp.interval);
      const updatedBattle = resolveBattleRound(
        battleState, acc, currentCpm, targetSpeedCpm, rhythmIntervals, battleBonuses,
      );
      const damageTakenThisRound = Math.max(0, hp - updatedBattle.playerHp);
      setBattleState(updatedBattle);
      setHp(Math.max(0, updatedBattle.playerHp));
      if (damageTakenThisRound > 0) {
        setRunDamageTaken(prev => prev + damageTakenThisRound);
      }

      if (!updatedBattle.finished) {
        // Battle continues — generate text for next round and start it
        const nextText = buildLevelText(level, boss ? BOSS_BATTLE_ROUND_WORDS : BATTLE_ROUND_WORDS);
        setLevelText(nextText);
        setTimeout(() => startSessionRef.current(nextText), 300);
        return;
      }

      // Battle finished — determine pass/fail based on whether player won
      const passed = updatedBattle.won;
      let nextHp = updatedBattle.playerHp;

      // Regen: if player won and regenTurns > 0, heal after battle
      if (passed && regenTurns > 0) {
        nextHp = Math.min(maxHp, nextHp + REGEN_HP_PER_BATTLE);
        setRegenTurns(prev => prev - 1);
      }

      setHp(nextHp);
      const hpAfterRegen = nextHp;
      const victory = passed && level >= activeTotalLevels;

      if (passed) {
        setCompletedLevels(level);
        markGameLevelReached(level);
      }

      const brokenItemIds = wearEquippedGameItems({ passed, isBoss: boss });
      const brokenItems = brokenItemIds
        .map(itemId => stableInventoryItems.find(entry => entry.id === itemId)?.meta.name ?? null)
        .filter((name): name is string => Boolean(name));
      consumeActiveModifiers();

      // Record ghost
      setCurrentGhost(prev => recordGhostLevel(prev, {
        level,
        wpm,
        acc,
        elapsed,
        passed,
      }));

      const nextMapNodeIds = runMap ? getGameRunMapOutgoingIds(runMap, runMap.currentNodeId) : [];
      const postLevelFlow = resolveGamePostLevelFlow({
        passed,
        isBoss: boss,
        victory,
        level,
        totalLevels: activeTotalLevels,
        nextMapNodeIds,
      });

      if (postLevelFlow.kind === 'bossReward') {
        setRewardChoices(generateBossRewardChoices());
        setSelectedRewardMessage(null);
        resetMapSelection();
        resetEventState();
      } else if (postLevelFlow.kind === 'mapSelection') {
        setRunMap(prev => (prev ? setGameRunMapSelectableNodes(prev, postLevelFlow.selectableNodeIds) : prev));
        resetRewardState();
        resetEventState();
      } else if (postLevelFlow.kind === 'autoAdvance') {
        resetMapSelection();
        resetRewardState();
        resetEventState();
        setAutoAdvanceLevel(postLevelFlow.nextLevel);
      } else {
        resetMapSelection();
        resetRewardState();
        resetEventState();
      }

      const runCompleted = victory || (!passed && hpAfterRegen <= 0);
      updateMotivationProgress((current) => updateMotivationAfterGame(current, {
        passedLevel: passed,
        runCompleted,
        victory,
        cleanVictory: victory && (runDamageTaken + damageTakenThisRound) <= 0,
      }));

      if (runCompleted) {
        const finalized = finalizeGhostRun(currentGhost);
        const replaceGhost = shouldReplaceGhost(gameState.ghostRun, finalized);
        const updatedDailyRun = dailySeed
          ? recordDailyRunAttempt(
              gameState.dailyRun ?? { history: {} },
              level, level - 1, wpm, acc, elapsed,
            )
          : gameState.dailyRun;
        saveGameState({
          ...gameState,
          ghostRun: replaceGhost ? finalized : gameState.ghostRun,
          dailyRun: updatedDailyRun,
        });
        clearCurrentGameRun(true);
      }

      // Rhythm check for boss archetype
      const keypresses = ses?.keypresses ?? [];
      const intervals = keypresses
        .filter((kp: any) => kp.interval > 0)
        .map((kp: any) => kp.interval);
      const rhythmDev = archetype?.checkRhythm ? computeRhythmDeviation(intervals) : null;
      const maxRhythmDev = archetype?.checkRhythm ? archetype.maxRhythmDeviation : null;
      const errorCount = ses?.errors ?? 0;
      const maxErrors = archetype?.maxErrors ? archetype.maxErrors : null;
      const timeLimitSeconds = boss && archetype
        ? calculateBossTimeLimit(levelText) * archetype.timerMultiplier
        : null;
      saveHistory('game', wpm, acc, {
        durationSeconds: elapsed,
        gameLevel: level,
        gameStageType: boss ? 'boss' : 'normal',
        passed,
        victory,
        timedOut,
        charStats: ses?.charStats,
      });

      setResult({
        wpm,
        acc,
        passed,
        livesLeft: hpAfterRegen,
        level,
        isBoss: boss,
        bossArchetype: archetype?.id ?? null,
        minAccuracy,
        maxErrors,
        rhythmDeviation: rhythmDev,
        maxRhythmDeviation: maxRhythmDev,
        timedOut,
        elapsed,
        timeLimitSeconds,
        victory,
        brokenItems,
      });

      if (passed) {
        const achievementIds: string[] = [];
        if (level === 1) achievementIds.push('first-level');
        if (boss && level === 5) achievementIds.push('first-boss');
        if (boss && level === 25) achievementIds.push('boss-25');
        if (boss && level === 50) achievementIds.push('boss-50');
        if (boss && level === 75) achievementIds.push('boss-75');
        if (victory) achievementIds.push('game-complete');
        queueAchievementToasts(achievementIds);
      }

      setBattleState(null);
      return;
    }

    // ── Fallback: no battle state (should not normally happen) ──
    const passed = !timedOut && wpm >= effectiveGoalWpm && acc >= minAccuracy;
    const failPenalty = Math.max(10, Math.round(maxHp * 0.15));
    const nextHp = passed ? hp : Math.max(0, hp - failPenalty);
    const nextRunDamageTaken = passed ? runDamageTaken : runDamageTaken + failPenalty;
    const victory = passed && level >= activeTotalLevels;
    saveHistory('game', wpm, acc, {
      durationSeconds: elapsed,
      gameLevel: level,
      gameStageType: boss ? 'boss' : 'normal',
      passed,
      victory,
      timedOut,
      charStats: ses?.charStats,
    });

    if (passed) {
      setCompletedLevels(level);
      markGameLevelReached(level);
    }

    const brokenItemIds = wearEquippedGameItems({ passed, isBoss: boss });
    const brokenItems = brokenItemIds
      .map(itemId => stableInventoryItems.find(entry => entry.id === itemId)?.meta.name ?? null)
      .filter((name): name is string => Boolean(name));
    consumeActiveModifiers();

    setCurrentGhost(prev => recordGhostLevel(prev, { level, wpm, acc, elapsed, passed }));

    const nextMapNodeIds = runMap ? getGameRunMapOutgoingIds(runMap, runMap.currentNodeId) : [];
    const postLevelFlow = resolveGamePostLevelFlow({
      passed,
      isBoss: boss,
      victory,
      level,
      totalLevels: activeTotalLevels,
      nextMapNodeIds,
    });

    if (postLevelFlow.kind === 'bossReward') {
      setRewardChoices(generateBossRewardChoices());
      setSelectedRewardMessage(null);
      resetMapSelection();
      resetEventState();
    } else if (postLevelFlow.kind === 'mapSelection') {
      setRunMap(prev => (prev ? setGameRunMapSelectableNodes(prev, postLevelFlow.selectableNodeIds) : prev));
      resetRewardState();
      resetEventState();
    } else if (postLevelFlow.kind === 'autoAdvance') {
      resetMapSelection();
      resetRewardState();
      resetEventState();
      setAutoAdvanceLevel(postLevelFlow.nextLevel);
    } else {
      resetMapSelection();
      resetRewardState();
      resetEventState();
    }

    const runCompleted = victory || (!passed && nextHp <= 0);
    updateMotivationProgress((current) => updateMotivationAfterGame(current, {
      passedLevel: passed,
      runCompleted,
      victory,
      cleanVictory: victory && nextRunDamageTaken <= 0,
    }));

    if (runCompleted) {
      const finalized = finalizeGhostRun(currentGhost);
      const replaceGhost = shouldReplaceGhost(gameState.ghostRun, finalized);
      const updatedDailyRun = dailySeed
        ? recordDailyRunAttempt(
            gameState.dailyRun ?? { history: {} },
            level, level - 1, wpm, acc, elapsed,
          )
        : gameState.dailyRun;
      saveGameState({
        ...gameState,
        ghostRun: replaceGhost ? finalized : gameState.ghostRun,
        dailyRun: updatedDailyRun,
      });
      clearCurrentGameRun(true);
    }

    setHp(nextHp);
    setRunDamageTaken(nextRunDamageTaken);
    setResult({
      wpm,
      acc,
      passed,
      livesLeft: nextHp,
      level,
      isBoss: boss,
      bossArchetype: archetype?.id ?? null,
      minAccuracy,
      maxErrors: null,
      rhythmDeviation: null,
      maxRhythmDeviation: null,
      timedOut,
      elapsed,
      timeLimitSeconds: null,
      victory,
      brokenItems,
    });
  }, [
    battleState,
    battleBonuses,
    buildLevelText,
    calculateBossTimeLimit,
    effectiveGoalWpm,
    generateBossRewardChoices,
    hasRepairTargets,
    stableEquippedItems,
    stableInventoryItems,
    level,
    levelText,
    hp,
    maxHp,
    runDamageTaken,
    regenTurns,
    markGameLevelReached,
    clearCurrentGameRun,
    consumeActiveModifiers,
    updateMotivationProgress,
    resetEventState,
    resetMapSelection,
    resetRewardState,
    saveHistory,
    totalBonuses.accuracyRequirementReduction,
    wearEquippedGameItems,
    queueAchievementToasts,
    runMap,
    saveGameState,
    gameState,
    currentGhost,
    dailySeed,
    activeTotalLevels,
  ]);

  const { session, start, stop, finish, handleKey, wpm, acc, waitingForSpace } = useTypingSession({
    mode: 'game',
    onFinish,
  });

  // Keep ref in sync so onFinish can start next round without circular dep
  useEffect(() => { startSessionRef.current = start; }, [start]);

  const startLevel = useCallback((nextLevel: number, resetGame = false, nodeKind?: string) => {
    if (!layout || !words.length || !unlocked.length) return;
    finishCauseRef.current = 'completed';
    blurActiveElement();

    // Determine if this is a battle with an enemy
    const boss = isBossLevel(nextLevel);
    const combatKind = nodeKind ?? (boss ? 'boss' : 'battle');
    const tier = getEnemyTier(combatKind);
    const enemy = createEnemy(tier, nextLevel);
    const bs = createBattleState(enemy, hp, maxHp);
    setBattleState(bs);

    // First round: short text for attack phase
    const text = boss ? buildLevelText(nextLevel) : buildLevelText(nextLevel, BATTLE_ROUND_WORDS);
    setLevel(nextLevel);
    setLevelText(text);
    setResult(null);
    resetMapSelection();
    resetEventState();
    resetRewardState();
    if (resetGame) {
      setHp(baseHp);
      setMaxHp(baseHp);
      setRunDamageTaken(0);
      setRegenTurns(0);
      setCompletedLevels(0);
      setActiveModifiers([]);
      setGameStarted(true);
      // Re-create battle state with base HP for fresh game
      const freshBs = createBattleState(enemy, baseHp, baseHp);
      setBattleState(freshBs);
    }
    setShowStartPanel(false);
    start(text);
  }, [layout, words.length, unlocked.length, buildLevelText, resetEventState, resetRewardState, resetMapSelection, start, hp, maxHp, baseHp]);

  // Auto-advance to next level when map has no outgoing nodes (dead-end fallback)
  useEffect(() => {
    if (autoAdvanceLevel != null) {
      setAutoAdvanceLevel(null);
      startLevel(autoAdvanceLevel);
    }
  }, [autoAdvanceLevel, startLevel]);

  const enterMapNode = useCallback((nodeId: string, clearResult = true) => {
    if (!runMap) return;

    const selectedNode = getGameRunMapNode(runMap, nodeId);
    if (!selectedNode) return;

    let nextMap = selectGameRunMapNode(runMap, nodeId);
    let nextNode = selectedNode;

    if (selectedNode.kind === 'battle' && selectedNode.battleLevel == null) {
      const outgoingBattleId = getGameRunMapOutgoingIds(nextMap, selectedNode.id)[0] ?? null;
      const outgoingBattleNode = getGameRunMapNode(nextMap, outgoingBattleId);
      if (outgoingBattleId && outgoingBattleNode) {
        nextMap = selectGameRunMapNode(nextMap, outgoingBattleId);
        nextNode = outgoingBattleNode;
      }
    }

    setRunMap(nextMap);
    if (clearResult) setResult(null);
    resetRewardState();

    if (nextNode.battleLevel != null) {
      resetEventState();
      stop();
      startLevel(nextNode.battleLevel, false, nextNode.kind);
      return;
    }

    if (nextNode.kind === 'rest') {
      setPendingEvent(createRestEvent({
        level,
        lives: hp,
        maxLives: maxHp,
        hasRepairTargets: hasRepairTargets || stableEquippedItems.some(entry =>
          Boolean(entry.inventoryItem?.maxDurability != null),
        ),
      }));
    } else if (nextNode.kind === 'treasure') {
      setPendingEvent(createCacheEvent({
        level,
        lives: hp,
        hasRepairTargets: hasRepairTargets || stableEquippedItems.some(entry =>
          Boolean(entry.inventoryItem?.maxDurability != null),
        ),
      }));
    } else if (nextNode.kind === 'shop') {
      setPendingEvent(createShopEvent({
        level,
        lives: hp,
        hasRepairTargets: hasRepairTargets || stableEquippedItems.some(entry =>
          Boolean(entry.inventoryItem?.maxDurability != null),
        ),
      }));
    } else if (nextNode.kind === 'risk') {
      setPendingEvent(createRiskEvent({
        level,
        lives: hp,
        maxLives: maxHp,
        hasRepairTargets: hasRepairTargets || stableEquippedItems.some(entry =>
          Boolean(entry.inventoryItem?.maxDurability != null),
        ),
      }));
    } else if (nextNode.kind === 'elite' || nextNode.kind === 'miniboss') {
      // Elite and miniboss nodes are combat encounters
      resetEventState();
      stop();
      startLevel(level, false, nextNode.kind);
      return;
    }
    eventChoiceRefs.current = [];
  }, [
    runMap,
    resetEventState,
    resetRewardState,
    stop,
    startLevel,
    level,
    hp,
    maxHp,
    hasRepairTargets,
    stableEquippedItems,
  ]);

  const continueFromMap = useCallback(() => {
    if (!runMap?.currentNodeId) return;
    const nextNodeId = getGameRunMapOutgoingIds(runMap, runMap.currentNodeId)[0] ?? null;
    if (!nextNodeId) return;
    enterMapNode(nextNodeId);
  }, [enterMapNode, runMap]);

  const startGame = useCallback((isDaily = false) => {
    blurActiveElement();
    stop();
    clearCurrentGameRun(true);
    setCurrentGhost(createEmptyGhostRun());
    const seed = isDaily ? getDailySeedString() : null;
    setDailySeed(seed);
    const totalLevels = isDaily ? DAILY_RUN_LEVELS : TOTAL_GAME_LEVELS;
    const mapSeed = isDaily && seed
      ? `daily-run:${seed}`
      : `run:${Date.now().toString(36)}`;
    const newMap = createGameRunMap(totalLevels, mapSeed);

    // Reset all game state manually (no startLevel — we show the map first)
    setHp(baseHp);
    setMaxHp(baseHp);
    setRunDamageTaken(0);
    setRegenTurns(0);
    setCompletedLevels(0);
    setActiveModifiers([]);
    setLevel(1);
    setLevelText('');
    setResult(null);
    setPendingEvent(null);
    setBattleState(null);
    setRewardChoices(null);
    setSelectedRewardMessage(null);
    setShowStartPanel(false);
    setGameStarted(true);

    // Show the map with the first node selectable
    const firstNodeId = newMap.currentNodeId;
    const mapWithSelectable = firstNodeId
      ? setGameRunMapSelectableNodes(newMap, [firstNodeId])
      : newMap;
    setRunMap(mapWithSelectable);
  }, [clearCurrentGameRun, stop, baseHp]);

  const openStartPanel = useCallback(() => {
    stop();
    setResult(null);
    resetMapSelection();
    resetEventState();
    resetRewardState();
    setRunMap(null);
    setShowStartPanel(true);
  }, [resetEventState, resetRewardState, resetMapSelection, stop]);

  const returnToMainGame = useCallback(() => {
    stop();
    setDailySeed(null);
    setResult(null);
    setPendingEvent(null);
    setBattleState(null);
    resetMapSelection();
    resetEventState();
    resetRewardState();
    setRunMap(null);
    setLevel(1);
    setHp(baseHp);
    setMaxHp(baseHp);
    setRunDamageTaken(0);
    setRegenTurns(0);
    setCompletedLevels(0);
    setLevelText('');
    setActiveModifiers([]);
    setGameStarted(false);
    setShowStartPanel(true);
  }, [resetEventState, resetRewardState, resetMapSelection, stop, baseHp]);

  const continueGame = useCallback(() => {
    if (pendingEvent && !pendingEvent.resolvedChoiceId) return;
    if (rewardChoices && !selectedRewardMessage) return;
    if (hp <= 0 || level >= activeTotalLevels) return;
    if (selectableMapNodeIds.length > 0) {
      setResult(null);
      return;
    }

    // After event/reward resolved — show map with selectable outgoing nodes instead of auto-advancing
    if (runMap?.currentNodeId) {
      const nextNodeIds = getGameRunMapOutgoingIds(runMap, runMap.currentNodeId);
      if (nextNodeIds.length > 0) {
        setRunMap(prev => (prev ? setGameRunMapSelectableNodes(prev, nextNodeIds) : prev));
        setPendingEvent(null);
        setResult(null);
        return;
      }
    }
    continueFromMap();
  }, [activeTotalLevels, continueFromMap, level, hp, pendingEvent, rewardChoices, runMap, selectableMapNodeIds.length, selectedRewardMessage]);

  const retryLevel = useCallback(() => {
    if (hp <= 0) return;
    stop();
    startLevel(level, false, currentMapNode?.kind);
  }, [currentMapNode?.kind, level, hp, startLevel, stop]);

  const handleRewardChoice = useCallback((choice: BossRewardChoice) => {
    if (choice.disabled) return;

    if (choice.kind === 'letter') {
      const unlockedChar = unlockNextGameLetter();
      setSelectedRewardMessage(unlockedChar
        ? t('game.system.reward.unlockLetter', { letter: unlockedChar.toUpperCase() })
        : t('game.system.reward.alphabetComplete'));
      if (unlockedChar) queueAchievementToasts(['unlock-letter']);
      return;
    }

    if (choice.kind === 'event' && choice.effect) {
      const lines: string[] = [];
      const effectResolution = resolveGameChoiceEffect({ effect: choice.effect, hp, maxHp });
      const effectiveMaxHp = effectResolution.nextMaxHp;
      if (choice.effect.maxLifeDelta) {
        setMaxHp(effectResolution.nextMaxHp);
        lines.push(t('game.system.reward.maxHealth', { hp: effectiveMaxHp }));
      }
      if (choice.effect.fullHeal) {
        lines.push(t('game.system.reward.fullHeal'));
      }
      if (effectResolution.regenTurnsDelta) {
        setRegenTurns(prev => prev + effectResolution.regenTurnsDelta);
        lines.push(t('game.system.reward.regenAfterBattle', { hp: REGEN_HP_PER_BATTLE, count: effectResolution.regenTurnsDelta }));
      }
      if (choice.effect.lifeDelta) {
        const lifeDelta = choice.effect.lifeDelta;
        if (effectResolution.runDamageTakenDelta > 0) {
          setRunDamageTaken(prev => prev + effectResolution.runDamageTakenDelta);
        }
        if (lifeDelta > 0) {
          lines.push(t('game.system.reward.healedTo', { hp: effectResolution.nextHp }));
        } else {
          lines.push(t('game.system.reward.lostHp', { hp: Math.abs(lifeDelta) }));
        }
      }
      if (effectResolution.hpChanged) {
        setHp(effectResolution.nextHp);
      }
      if (effectResolution.modifier) {
        setActiveModifiers(prev => [...prev, effectResolution.modifier!]);
        lines.push(t('game.system.reward.effect', { description: effectResolution.modifier.description }));
      }
      setSelectedRewardMessage(lines.join(' ') || choice.flavor);
      return;
    }

    if (!choice.itemId) return;
    const item = getGameItemById(choice.itemId);
    const grantedId = grantGameItem(choice.itemId);
    if (!item || !grantedId) return;

    setSelectedRewardMessage(choice.kind === 'durable'
      ? t('game.system.reward.gotDurableArtifact', { item: item.name })
      : t('game.system.reward.gotRelic', { item: item.name }));
    queueAchievementToasts([
      'collect-item',
      ...(choice.kind === 'durable' ? ['collect-durable-item'] : []),
      ...(item.rarity === 3 ? ['collect-top-rarity-item'] : []),
    ]);
  }, [grantGameItem, hp, maxHp, queueAchievementToasts, t, unlockNextGameLetter]);

  const handleMapNodeSelect = useCallback((nodeId: string) => {
    if (!runMap || !runMap.selectableNodeIds.includes(nodeId)) return;
    enterMapNode(nodeId);
  }, [enterMapNode, runMap]);

  const handleEventChoice = useCallback((choice: GameRunEventChoice) => {
    if (!pendingEvent || pendingEvent.resolvedChoiceId || choice.disabled) return;

    const lines: string[] = [];
    const achievementIds: string[] = [];

    const effectResolution = resolveGameChoiceEffect({ effect: choice.effect, hp, maxHp });
    const effectiveMaxHp = effectResolution.nextMaxHp;
    if (choice.effect.maxLifeDelta) {
      setMaxHp(effectResolution.nextMaxHp);
      lines.push(t('game.system.event.maxHealthIncreased', { hp: effectiveMaxHp }));
    }

    if (choice.effect.fullHeal) {
      setResult(prev => prev ? { ...prev, livesLeft: effectiveMaxHp } : prev);
      lines.push(t('game.system.event.fullHealTo', { hp: effectiveMaxHp }));
    }

    if (effectResolution.regenTurnsDelta) {
      setRegenTurns(prev => prev + effectResolution.regenTurnsDelta);
      lines.push(t('game.system.event.regenEachBattle', { hp: REGEN_HP_PER_BATTLE, count: effectResolution.regenTurnsDelta }));
    }

    if (choice.effect.lifeDelta) {
      const lifeDelta = choice.effect.lifeDelta;
      if (effectResolution.runDamageTakenDelta > 0) {
        setRunDamageTaken(prev => prev + effectResolution.runDamageTakenDelta);
      }
      setResult(prev => prev ? { ...prev, livesLeft: effectResolution.nextHp } : prev);
      if (lifeDelta > 0) {
        lines.push(t('game.system.event.healedTo', { hp: effectResolution.nextHp, maxHp: effectiveMaxHp }));
      } else {
        lines.push(t('game.system.event.dealLostHp', { hp: Math.abs(lifeDelta) }));
      }
    }

    if (effectResolution.hpChanged) {
      setHp(effectResolution.nextHp);
    }

    if (effectResolution.repairEquippedBy) {
      const repairedNames = repairGameItems(effectResolution.repairEquippedBy, true);
      lines.push(repairedNames.length
        ? t('game.system.event.repairedItems', { items: repairedNames.join(', ') })
        : t('game.system.event.repairNoTargets'));
    }

    if (effectResolution.grantItemId) {
      const item = getGameItemById(effectResolution.grantItemId);
      const grantedId = grantGameItem(effectResolution.grantItemId);
      if (item && grantedId) {
        lines.push(t('game.system.event.gotItem', { item: item.name }));
        achievementIds.push(
          'collect-item',
          ...(item.rewardKind === 'durable' ? ['collect-durable-item'] : []),
          ...(item.rarity === 3 ? ['collect-top-rarity-item'] : []),
        );
      }
    }

    if (effectResolution.modifier) {
      setActiveModifiers(prev => [...prev, effectResolution.modifier!]);
      lines.push(t('game.system.event.effectActivated', { description: effectResolution.modifier.description }));
    }

    queueAchievementToasts(achievementIds);
    setPendingEvent(prev => prev ? {
      ...prev,
      resolvedChoiceId: choice.id,
      resultText: lines.join(' ') || t('game.system.event.choiceOutcomeFallback', { title: choice.title }),
    } : prev);
  }, [grantGameItem, hp, maxHp, pendingEvent, queueAchievementToasts, repairGameItems, t]);

  const handleSkipEvent = useCallback(() => {
    if (!pendingEvent || pendingEvent.resolvedChoiceId) return;
    resetEventState();
    // Show map with outgoing nodes so the player can continue
    if (runMap?.currentNodeId) {
      const nextNodeIds = getGameRunMapOutgoingIds(runMap, runMap.currentNodeId);
      if (nextNodeIds.length > 0) {
        setRunMap(prev => (prev ? setGameRunMapSelectableNodes(prev, nextNodeIds) : prev));
        return;
      }
    }
    continueFromMap();
  }, [continueFromMap, pendingEvent, resetEventState, runMap]);

  const resumeSavedLevel = useCallback(() => {
    if (session.active || !levelText) return;
    blurActiveElement();
    setResult(null);
    setPendingEvent(null);
    setRewardChoices(null);
    setSelectedRewardMessage(null);
    start(levelText);
  }, [levelText, session.active, start]);

  useEffect(() => {
    if (!session.active) return;
    const handler = (event: KeyboardEvent) => handleKey(event);
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [session.active, handleKey]);

  const gameWon = Boolean(result?.victory);
  const gameOver = gameStarted && !session.active && !gameWon && hp <= 0;
  const showBattlePanel = gameStarted
    && !showStartPanel
    && !result
    && !pendingEvent
    && selectableMapNodeIds.length === 0
    && Boolean(currentMapNode?.battleLevel)
    && Boolean(levelText);
  const historyEntries = progress.history?.[currentLayout] ?? EMPTY_HISTORY;
  const gameResultViewModel = useMemo(
    () => buildGameResultViewModel({
      currentLayout,
      dailySeed,
      ghostRun: gameState.ghostRun ?? null,
      historyEntries,
      layoutProgressUnlocked: layoutProgress.unlocked,
      layouts,
      motivationProgress,
      progress,
      result,
      rewardChoices,
      selectableMapNodeIdsLength: selectableMapNodeIds.length,
      selectedRewardMessage,
      translate: t,
    }),
    [
      currentLayout,
      dailySeed,
      gameState.ghostRun,
      historyEntries,
      layoutProgress.unlocked,
      layouts,
      motivationProgress,
      progress,
      result,
      rewardChoices,
      selectableMapNodeIds.length,
      selectedRewardMessage,
      t,
    ],
  );
  const terminalSummary = useMemo(
    () => buildGameTerminalSummaryViewModel({
      activeTotalLevels,
      completedLevels,
      gameWon,
      level,
      translate: t,
    }),
    [activeTotalLevels, completedLevels, gameWon, level, t],
  );
  const battleOverlayText = !session.active && !showStartPanel && !result && levelText
    ? t('game.overlay.savedRun', { level, hp: Math.max(hp, 0) }).replace(/\\n/g, '\n')
    : null;

  useEffect(() => {
    if (!session.active || !activeIsBoss || !currentBossTimeLimit) return;
    const elapsedMs = performance.now() - session.startTime;
    const timeoutMs = Math.max(0, currentBossTimeLimit * 1000 - elapsedMs);
    const timeout = setTimeout(() => {
      finishCauseRef.current = 'timeout';
      finish();
    }, timeoutMs);
    return () => clearTimeout(timeout);
  }, [activeIsBoss, currentBossTimeLimit, finish, session.active, session.startTime]);

  const mapSelectionPending = gameResultViewModel.mapSelectionPending;
  const eventPending = Boolean(pendingEvent && !pendingEvent.resolvedChoiceId);
  const {
    eventChoiceRefs,
    resultActionRef,
    rewardChoiceRefs,
  } = useGameResultFocus({
    eventPending,
    mapSelectionPending,
    pendingEvent,
    result,
    rewardPending: gameResultViewModel.rewardPending,
    selectedRewardMessage,
    sessionActive: session.active,
  });

  useGameRunPersistence({
    activeModifiers,
    baseHp,
    battleState,
    completedLevels,
    currentRun: gameState.currentRun,
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
  });

  return (
    <section className="mode-panel active game-page">
      <PageHeader
        title={t('game.header.title')}
        inlineActions={(
          <AchievementCounterButton
            icon={<Trophy size={14} />}
            onClick={openAchievementsModal}
            total={gameAchievementsCatalog.length}
            unlocked={unlockedAchievements.length}
          >
            {t('achievements.title')}
          </AchievementCounterButton>
        )}
        actions={gameStarted && !showStartPanel ? (
            <Button variant="accent" onClick={openStartPanel}>
              {t('game.header.restart')}
            </Button>
        ) : null}
      />

      <GameHud
        hp={hp}
        maxHp={maxHp}
        regenTurns={regenTurns}
        level={level}
        totalLevels={activeTotalLevels}
        activeIsBoss={activeIsBoss}
        unlockedLetters={layoutProgress.unlocked}
        highestLevel={gameState.highestLevel}
        effectiveTargetSpeedDisplay={effectiveTargetSpeedDisplay}
        currentSpeedDisplay={session.active ? fmtSpeed(wpm) : (result ? fmtSpeed(result.wpm) : '0')}
        accuracy={session.active ? acc : (result ? result.acc : 100)}
        speedUnitLabel={spdLabel}
        activeModifiers={activeModifiers}
        bossTimeLimit={currentBossTimeLimit}
        bossArchetype={currentBossArchetype}
        dailySeed={dailySeed}
        ghostComparison={gameResultViewModel.ghostComparison}
        activeSets={setBonuses.activeSets.map(({ set, activeBonus }) => ({
          setName: set.name,
          description: activeBonus.description,
        }))}
        sessionActive={session.active}
        sessionStartTime={session.startTime}
        resultElapsedSeconds={result?.elapsed ?? 0}
      />

      <GameInventoryPanel
        inventoryItems={stableInventoryItems}
        equippedItems={stableEquippedItems}
        onEquip={handleEquipItem}
        onUnequip={handleUnequipItem}
      />

      <GameMapStage
        activeMap={activeMap}
        activeTotalLevels={activeTotalLevels}
        battleOverlayText={battleOverlayText}
        battleState={battleState}
        bossLevelInterval={BOSS_LEVEL_INTERVAL}
        currentBossArchetype={currentBossArchetype}
        currentBossTimeLimit={currentBossTimeLimit}
        dailySeed={dailySeed}
        effectiveTargetSpeedDisplay={effectiveTargetSpeedDisplay}
        eventChoiceRefs={eventChoiceRefs}
        eventPending={eventPending}
        fmtSpeed={fmtSpeed}
        gameAchievementCatalog={gameAchievementCatalog}
        gameGoalHighlights={gameResultViewModel.motivationGoals}
        gameResultComparison={gameResultViewModel.comparison}
        gameResultViewModel={gameResultViewModel}
        gameStreakHighlights={gameResultViewModel.motivationStreaks}
        ghostRun={gameState.ghostRun ?? null}
        hp={hp}
        layoutProgressUnlocked={layoutProgress.unlocked}
        level={level}
        levelText={levelText}
        mapSelectionPending={mapSelectionPending}
        onChangeTargetSpeed={updateTargetSpeed}
        onContinue={continueGame}
        onRestart={startGame}
        onResumeSavedLevel={resumeSavedLevel}
        onRetry={retryLevel}
        onReturnToMainGame={returnToMainGame}
        onSelectEventChoice={handleEventChoice}
        onSelectMapNode={handleMapNodeSelect}
        onSelectReward={handleRewardChoice}
        onSkipEvent={handleSkipEvent}
        onStartDailyRun={() => startGame(true)}
        onStartRun={() => startGame()}
        pendingEvent={pendingEvent}
        result={result}
        resultActionRef={resultActionRef}
        rewardChoiceRefs={rewardChoiceRefs}
        rewardChoices={rewardChoices}
        selectableMapNodeIdsLength={selectableMapNodeIds.length}
        selectedRewardMessage={selectedRewardMessage}
        sessionActive={session.active}
        sessionErrPositions={session.errPositions}
        sessionPos={session.pos}
        sessionStartTime={session.startTime}
        sessionText={session.text}
        sessionWpm={session.active ? fmtSpeed(wpm) : (result ? fmtSpeed(result.wpm) : '0')}
        setBonuses={setBonuses.activeSets.map(({ set, activeBonus, count }) => ({
          count,
          description: activeBonus.description,
          id: set.id,
          name: set.name,
        }))}
        showBattlePanel={showBattlePanel}
        showStartPanel={showStartPanel}
        speedLabel={spdLabel}
        speedUnit={unit}
        targetSpeedDisplay={targetSpeedDisplay}
        terminalGhostComparison={gameResultViewModel.ghostComparison}
        waitingForSpace={waitingForSpace}
      />

      {(gameOver || gameWon) && terminalSummary && (
        <GameTerminalSummaryCard
          title={terminalSummary.title}
          description={terminalSummary.description}
        />
      )}

      <AchievementsModal
        open={showAchievementsModal}
        unlockedAchievementIds={unlockedAchievementIds}
        achievementCatalog={gameAchievementCatalog}
        categoryFilter="game"
        onClose={closeAchievementsModal}
      />

      <GameAchievementToastStack achievements={achievementToasts} onRemove={handleRemoveToast} />
    </section>
  );
}
