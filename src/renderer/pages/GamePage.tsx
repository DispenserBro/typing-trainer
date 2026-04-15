import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Trophy, Shield, Swords } from 'lucide-react';
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
  BossArchetypeId,
  BattleState,
} from '../../shared/types';
import { useApp } from '../contexts/AppContext';
import { useTypingSession } from '../hooks/useTypingSession';
import { TextDisplay } from '../components/TextDisplay';
import { NumberInput } from '../components/NumberInput';
import { GameAchievementsModal } from '../components/game/GameAchievementsModal';
import { AchievementsModal } from '../components/AchievementsModal';
import { GameAchievementToastStack } from '../components/game/GameAchievementToastStack';
import { GameHud } from '../components/game/GameHud';
import { GameInventoryPanel } from '../components/game/GameInventoryPanel';
import { GameEventModal } from '../components/game/GameEventModal';
import { GameRunMap } from '../components/game/GameRunMap';
import { GameResultCard } from '../components/game/GameResultCard';
import { buildPracticeContentText, getWorstChar, filterYoWords, filterYoKeys } from '../../core/engine';
import {
  GAME_EQUIPMENT_SLOTS,
  getGameItemById,
  getGameItemIcon,
  getGameItemRarityStars,
} from '../../core/game/items';
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
  buildInventoryEntries,
  getHasRepairTargets,
  getTargetSpeedDisplay,
  sumItemBonuses,
  sumModifierBonuses,
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
import { getBossArchetype, computeRhythmDeviation } from '../../core/game/bossArchetypes';
import { computeSetBonuses, ITEM_SET_MEMBERSHIP } from '../../core/game/itemSets';
import {
  createEnemy,
  createBattleState,
  resolveBattleRound,
  getEnemyTier,
  sumBattleBonuses,
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
  getGhostComparison,
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
  getActiveMotivationGoalSnapshots,
  getMotivationStreakSnapshots,
  updateMotivationAfterGame,
} from '../../core/motivation/progress';
import {
  buildGameResultComparison,
  buildLayoutMasteryResultSummary,
} from '../../core/motivation/records';

type BossRewardChoice = GameRunRewardChoice;
type LevelResult = GameRunResult;

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
  const {
    layouts, currentLayout, allWords, ngramModel, progress, settings, practiceSettings,
    fmtSpeed, spdLabel, saveHistory, getLayoutProgress,
    gameState, grantGameItem, equipGameItem, unequipGameItem, repairGameItems, markGameLevelReached,
    wearEquippedGameItems, peekNextGameLetter, unlockNextGameLetter,
    unlockGameAchievements, saveCurrentGameRun, clearCurrentGameRun, gameAchievementCatalog,
    saveGameState, unlockedAchievementIds, modRuleOverrides, motivationProgress, updateMotivationProgress,
  } = useApp();

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
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [achievementToasts, setAchievementToasts] = useState<GameAchievementDefinition[]>([]);
  const [currentGhost, setCurrentGhost] = useState<GameGhostRun>(() => createEmptyGhostRun());
  const [dailySeed, setDailySeed] = useState<string | null>(null);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const activeTotalLevels = dailySeed ? DAILY_RUN_LEVELS : TOTAL_GAME_LEVELS;
  const [autoAdvanceLevel, setAutoAdvanceLevel] = useState<number | null>(null);
  const finishCauseRef = useRef<'completed' | 'timeout'>('completed');
  const resultActionRef = useRef<HTMLButtonElement | null>(null);
  const rewardChoiceRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const eventChoiceRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const hasHydratedRunRef = useRef(false);
  const startSessionRef = useRef<(text: string) => void>(() => {});
  const previewMap = useMemo(() => createGameRunMap(TOTAL_GAME_LEVELS), []);
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
  const itemBonuses = useMemo(
    () => sumItemBonuses(stableEquippedItems, activeIsBoss),
    [activeIsBoss, stableEquippedItems],
  );
  const modifierBonuses = useMemo(
    () => sumModifierBonuses(activeModifiers, activeIsBoss),
    [activeIsBoss, activeModifiers],
  );
  const equippedItemIds = useMemo(
    () => stableEquippedItems
      .filter(entry => entry.meta && !entry.broken)
      .map(entry => entry.meta!.id),
    [stableEquippedItems],
  );
  const setBonuses = useMemo(
    () => computeSetBonuses(equippedItemIds),
    [equippedItemIds],
  );
  const totalBonuses = useMemo(() => ({
    speedRequirementReductionPercent:
      itemBonuses.speedRequirementReductionPercent
      + modifierBonuses.speedRequirementReductionPercent
      + setBonuses.totalSpeedReduction,
    accuracyRequirementReduction:
      itemBonuses.accuracyRequirementReduction
      + modifierBonuses.accuracyRequirementReduction
      + setBonuses.totalAccuracyReduction,
    bossTimerBonusSeconds:
      itemBonuses.bossTimerBonusSeconds
      + modifierBonuses.bossTimerBonusSeconds
      + setBonuses.totalBossTimerBonus,
  }), [itemBonuses, modifierBonuses, setBonuses]);
  const battleBonuses = useMemo(
    () => sumBattleBonuses(itemBonuses, modifierBonuses),
    [itemBonuses, modifierBonuses],
  );
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
  const gameGoalHighlights = useMemo(
    () => getActiveMotivationGoalSnapshots(motivationProgress, 1, ['game-victories']),
    [motivationProgress],
  );
  const gameStreakHighlights = useMemo(
    () => getMotivationStreakSnapshots(motivationProgress, ['clean-game-victories']),
    [motivationProgress],
  );

  const queueAchievementToasts = useCallback((achievementIds: string[]) => {
    const unlocked = unlockGameAchievements(achievementIds);
    if (!unlocked.length) return;
    setAchievementToasts(prev => [...prev, ...unlocked]);
  }, [unlockGameAchievements]);

  const handleRemoveToast = useCallback((achievementIndex: number) => {
    setAchievementToasts(prev => prev.filter((_, idx) => idx !== achievementIndex));
  }, []);

  const handleEquipItem = useCallback((slot: GameEquipmentSlot, itemId: string) => {
    blurActiveElement();
    const equipped = equipGameItem(slot, itemId);
    if (equipped) queueAchievementToasts(['equip-item']);
  }, [equipGameItem, queueAchievementToasts]);

  const handleUnequipItem = useCallback((slot: GameEquipmentSlot) => {
    blurActiveElement();
    unequipGameItem(slot);
  }, [unequipGameItem]);

  const openAchievementsModal = useCallback(() => setShowAchievementsModal(true), []);
  const closeAchievementsModal = useCallback(() => setShowAchievementsModal(false), []);

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

      if (passed && boss && !victory && level < activeTotalLevels) {
        setRewardChoices(generateBossRewardChoices());
        setSelectedRewardMessage(null);
        resetMapSelection();
        resetEventState();
      } else if (passed && !victory && nextMapNodeIds.length > 0) {
        setRunMap(prev => (prev ? setGameRunMapSelectableNodes(prev, nextMapNodeIds) : prev));
        resetRewardState();
        resetEventState();
      } else if (passed && !victory && nextMapNodeIds.length === 0) {
        resetMapSelection();
        resetRewardState();
        resetEventState();
        setAutoAdvanceLevel(level + 1);
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

    if (passed && boss && !victory && level < activeTotalLevels) {
      setRewardChoices(generateBossRewardChoices());
      setSelectedRewardMessage(null);
      resetMapSelection();
      resetEventState();
    } else if (passed && !victory && nextMapNodeIds.length > 0) {
      setRunMap(prev => (prev ? setGameRunMapSelectableNodes(prev, nextMapNodeIds) : prev));
      resetRewardState();
      resetEventState();
    } else if (passed && !victory && nextMapNodeIds.length === 0) {
      resetMapSelection();
      resetRewardState();
      resetEventState();
      setAutoAdvanceLevel(level + 1);
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
    const newMap = createGameRunMap(totalLevels);

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
    setRunMap(createGameRunMap(TOTAL_GAME_LEVELS));
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
        ? `Печать мастера пробудила букву «${unlockedChar.toUpperCase()}».`
        : 'Алфавит уже полностью раскрыт.');
      if (unlockedChar) queueAchievementToasts(['unlock-letter']);
      return;
    }

    if (choice.kind === 'event' && choice.effect) {
      const lines: string[] = [];
      const effectiveMaxHp = maxHp + (choice.effect.maxLifeDelta ?? 0);
      if (choice.effect.maxLifeDelta) {
        setMaxHp(effectiveMaxHp);
        setHp(prev => Math.min(prev + choice.effect!.maxLifeDelta!, effectiveMaxHp));
        lines.push(`Максимальное здоровье: ${effectiveMaxHp}.`);
      }
      if (choice.effect.fullHeal) {
        setHp(effectiveMaxHp);
        lines.push('Здоровье полностью восстановлено.');
      }
      if (choice.effect.regenTurns) {
        setRegenTurns(prev => prev + choice.effect!.regenTurns!);
        lines.push(`Регенерация: +${REGEN_HP_PER_BATTLE} HP после боя на ${choice.effect.regenTurns} боёв.`);
      }
      if (choice.effect.lifeDelta) {
        const lifeDelta = choice.effect.lifeDelta;
        const nextHp = Math.max(0, Math.min(effectiveMaxHp, hp + lifeDelta));
        setHp(nextHp);
        if (lifeDelta < 0) {
          setRunDamageTaken(prev => prev + Math.abs(lifeDelta));
        }
        if (lifeDelta > 0) {
          lines.push(`Здоровье восстановлено: ${nextHp} HP.`);
        } else {
          lines.push(`Потеряно ${Math.abs(lifeDelta)} HP.`);
        }
      }
      if (choice.effect.modifier) {
        setActiveModifiers(prev => [...prev, choice.effect!.modifier!]);
        lines.push(`Эффект: ${choice.effect.modifier.description}.`);
      }
      setSelectedRewardMessage(lines.join(' ') || choice.flavor);
      return;
    }

    if (!choice.itemId) return;
    const item = getGameItemById(choice.itemId);
    const grantedId = grantGameItem(choice.itemId);
    if (!item || !grantedId) return;

    setSelectedRewardMessage(choice.kind === 'durable'
      ? `Вы забрали нестабильный артефакт «${item.name}». Следи за прочностью.`
      : `Вы получили реликвию «${item.name}». Она уже ждет в инвентаре.`);
    queueAchievementToasts([
      'collect-item',
      ...(choice.kind === 'durable' ? ['collect-durable-item'] : []),
      ...(item.rarity === 3 ? ['collect-top-rarity-item'] : []),
    ]);
  }, [grantGameItem, hp, maxHp, queueAchievementToasts, unlockNextGameLetter]);

  const handleMapNodeSelect = useCallback((nodeId: string) => {
    if (!runMap || !runMap.selectableNodeIds.includes(nodeId)) return;
    enterMapNode(nodeId);
  }, [enterMapNode, runMap]);

  const handleEventChoice = useCallback((choice: GameRunEventChoice) => {
    if (!pendingEvent || pendingEvent.resolvedChoiceId || choice.disabled) return;

    const lines: string[] = [];
    const achievementIds: string[] = [];

    const effectiveMaxHp = maxHp + (choice.effect.maxLifeDelta ?? 0);
    if (choice.effect.maxLifeDelta) {
      setMaxHp(effectiveMaxHp);
      setHp(prev => Math.min(prev + choice.effect.maxLifeDelta!, effectiveMaxHp));
      lines.push(`Максимальное здоровье увеличено до ${effectiveMaxHp}.`);
    }

    if (choice.effect.fullHeal) {
      setHp(effectiveMaxHp);
      setResult(prev => prev ? { ...prev, livesLeft: effectiveMaxHp } : prev);
      lines.push(`Здоровье полностью восстановлено: ${effectiveMaxHp} из ${effectiveMaxHp}.`);
    }

    if (choice.effect.regenTurns) {
      setRegenTurns(prev => prev + choice.effect.regenTurns!);
      lines.push(`Регенерация: +${REGEN_HP_PER_BATTLE} HP после каждого боя на ${choice.effect.regenTurns} боёв.`);
    }

    if (choice.effect.lifeDelta) {
      const lifeDelta = choice.effect.lifeDelta;
      const nextHp = Math.max(0, Math.min(effectiveMaxHp, hp + lifeDelta));
      setHp(nextHp);
      if (lifeDelta < 0) {
        setRunDamageTaken(prev => prev + Math.abs(lifeDelta));
      }
      setResult(prev => prev ? { ...prev, livesLeft: nextHp } : prev);
      if (lifeDelta > 0) {
        lines.push(`Здоровье восстановлено: ${nextHp} из ${effectiveMaxHp}.`);
      } else {
        lines.push(`Сделка забрала ${Math.abs(lifeDelta)} HP.`);
      }
    }

    if (choice.effect.repairEquippedBy) {
      const repairedNames = repairGameItems(choice.effect.repairEquippedBy, true);
      lines.push(repairedNames.length
        ? `Починены предметы: ${repairedNames.join(', ')}.`
        : 'Ремонт завершен, но чинить было почти нечего.');
    }

    if (choice.effect.grantItemId) {
      const item = getGameItemById(choice.effect.grantItemId);
      const grantedId = grantGameItem(choice.effect.grantItemId);
      if (item && grantedId) {
        lines.push(`Вы получили «${item.name}».`);
        achievementIds.push(
          'collect-item',
          ...(item.rewardKind === 'durable' ? ['collect-durable-item'] : []),
          ...(item.rarity === 3 ? ['collect-top-rarity-item'] : []),
        );
      }
    }

    if (choice.effect.modifier) {
      setActiveModifiers(prev => [...prev, choice.effect.modifier!]);
      lines.push(`Активирован эффект: ${choice.effect.modifier.description}.`);
    }

    queueAchievementToasts(achievementIds);
    setPendingEvent(prev => prev ? {
      ...prev,
      resolvedChoiceId: choice.id,
      resultText: lines.join(' ') || `${choice.title} приносит свои плоды.`,
    } : prev);
  }, [grantGameItem, hp, maxHp, pendingEvent, queueAchievementToasts, repairGameItems]);

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
  const rewardPending = Boolean(result?.passed && result.isBoss && rewardChoices && !selectedRewardMessage);
  const showBattlePanel = gameStarted
    && !showStartPanel
    && !result
    && !pendingEvent
    && selectableMapNodeIds.length === 0
    && Boolean(currentMapNode?.battleLevel)
    && Boolean(levelText);
  const ghostComparison = useMemo(
    () => result ? getGhostComparison(gameState.ghostRun, result.level, result.wpm) : null,
    [gameState.ghostRun, result],
  );
  const historyEntries = progress.history?.[currentLayout] ?? [];
  const gameResultComparison = useMemo(
    () => result ? buildGameResultComparison(historyEntries, {
      wpm: result.wpm,
      acc: result.acc,
      gameLevel: result.level,
      gameStageType: result.isBoss ? 'boss' : 'normal',
    }) : null,
    [historyEntries, result],
  );
  const gameMasterySummary = useMemo(
    () => result ? buildLayoutMasteryResultSummary(progress, layouts, currentLayout, {
      previousHistoryEntriesOverride: historyEntries.slice(0, -1),
      currentHistoryEntriesOverride: historyEntries,
      previousUnlockedLettersOverride: layoutProgress.unlocked,
      currentUnlockedLettersOverride: layoutProgress.unlocked,
    }) : null,
    [currentLayout, historyEntries, layoutProgress.unlocked, layouts, progress, result],
  );
  const startOverlayContent = showStartPanel ? (
    <form
      className="game-start-panel"
      onSubmit={event => {
        event.preventDefault();
        startGame();
      }}
    >
      <div className="game-start-title">Новый забег</div>
      <div className="game-start-subtitle">Задай цель скорости и начни путь через 100 уровней. Каждый 5-й уровень это босс.</div>
      <label className="game-start-field">
        <span>Целевая скорость</span>
        <div className="game-start-input-row">
          <NumberInput
            value={targetSpeedDisplay}
            min={1}
            max={9999}
            step={unit === 'cps' ? 0.1 : 1}
            className="w112"
            ariaLabel="Целевая скорость игры"
            onChange={(next) => updateTargetSpeed(next)}
          />
          <small>{spdLabel}</small>
        </div>
      </label>
      {setBonuses.activeSets.length > 0 && (
        <div className="game-set-bonuses">
          {setBonuses.activeSets.map(({ set, activeBonus, count }) => (
            <div key={set.id} className="game-set-chip">
              <strong>{set.name}</strong>
              <small>{count} предмета · {activeBonus.description}</small>
            </div>
          ))}
        </div>
      )}
      <div className="game-start-actions">
        <button type="submit" className="btn-accent">
          Старт игры
        </button>
        <button type="button" className="btn-secondary" onClick={() => startGame(true)}>
          Ежедневный забег
        </button>
      </div>
      {gameState.ghostRun && gameState.ghostRun.maxLevel > 0 && (
        <div className="game-ghost-info">
          👻 Призрак лучшего забега: уровень {gameState.ghostRun.maxLevel}
        </div>
      )}
      </form>
    ) : null;
  const battleOverlayText = !session.active && !showStartPanel && !result && levelText
    ? `Забег сохранен\nУровень ${level} · ${Math.max(hp, 0)} HP\nНажмите, чтобы продолжить`
    : null;
  const battleInfoPanel = battleState && !battleState.finished ? (
    <div className="game-battle-info-panel">
      <div className="game-battle-hud">
        ⚔ {battleState.enemy.name} · Раунд {battleState.round} · {battleState.phase === 'attack' ? 'Атака' : 'Защита'}
      </div>
      <div className="game-battle-hp-section">
        <div className="game-hp-bar-row">
          <Swords size={14} />
          <span className="game-hp-label">
            {Math.max(0, battleState.playerHp)} / {battleState.playerMaxHp}
          </span>
          <div className="game-hp-bar">
            <div
              className={`game-hp-bar-fill${battleState.playerHp / battleState.playerMaxHp <= 0.25 ? ' danger' : battleState.playerHp / battleState.playerMaxHp <= 0.5 ? ' warn' : ''}`}
              style={{ width: `${Math.max(0, Math.min(100, (battleState.playerHp / battleState.playerMaxHp) * 100))}%` }}
            />
          </div>
        </div>
        <div className="game-hp-bar-row enemy">
          <Shield size={14} />
          <span className="game-hp-label">
            {Math.max(0, battleState.enemy.hp)} / {battleState.enemy.maxHp}
          </span>
          <div className="game-hp-bar">
            <div
              className="game-hp-bar-fill enemy"
              style={{ width: `${Math.max(0, Math.min(100, (battleState.enemy.hp / battleState.enemy.maxHp) * 100))}%` }}
            />
          </div>
          <span className="game-hp-enemy-name">{battleState.enemy.name}</span>
          {battleState.enemy.debuff && (
            <span className="game-boss-debuff-badge" title={`Дебафф: ${battleState.enemy.debuff}`}>
              ⚡ {battleState.enemy.debuff}
            </span>
          )}
        </div>
      </div>
    </div>
  ) : null;

  useEffect(() => {
    if (hasHydratedRunRef.current) return;
    hasHydratedRunRef.current = true;

    const savedRun = gameState.currentRun;
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
    setRunMap(savedRun.map ?? createGameRunMap(TOTAL_GAME_LEVELS));
    setBattleState(savedRun.battleState ?? null);
    setPendingEvent(savedRun.pendingEvent ?? null);
    setResult(savedRun.result);
    setRewardChoices(savedRun.rewardChoices);
    setSelectedRewardMessage(savedRun.selectedRewardMessage);
    setGameStarted(true);
    setShowStartPanel(false);
  }, [gameState.currentRun]);

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
    completedLevels,
    gameStarted,
    gameOver,
    gameWon,
    level,
    levelText,
    hp,
    runDamageTaken,
    runMap,
    pendingEvent,
    result,
    rewardChoices,
    saveCurrentGameRun,
    selectedRewardMessage,
    targetSpeedCpm,
  ]);

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

  useEffect(() => {
    if (!rewardPending) return;
    const nextButton = rewardChoiceRefs.current.find(Boolean);
    nextButton?.focus({ preventScroll: true });
  }, [rewardPending]);

  const mapSelectionPending = Boolean(result?.passed && selectableMapNodeIds.length > 0);
  const eventPending = Boolean(pendingEvent && !pendingEvent.resolvedChoiceId);

  useEffect(() => {
    if (!eventPending) return;
    const nextButton = eventChoiceRefs.current.find(Boolean);
    nextButton?.focus({ preventScroll: true });
  }, [eventPending]);

  useEffect(() => {
    if (!pendingEvent || eventPending || result || session.active) return;
    resultActionRef.current?.focus({ preventScroll: true });
  }, [eventPending, pendingEvent, result, session.active]);

  useEffect(() => {
    if (!result || session.active || rewardPending || mapSelectionPending || eventPending) return;
    resultActionRef.current?.focus({ preventScroll: true });
  }, [eventPending, mapSelectionPending, result, rewardPending, session.active, selectedRewardMessage]);

  useEffect(() => {
    if (!achievementToasts.length) return;
    const timeout = setTimeout(() => {
      setAchievementToasts(prev => prev.slice(1));
    }, 4200);
    return () => clearTimeout(timeout);
  }, [achievementToasts]);

  useEffect(() => {
    const equippedHighestRarityItems = stableEquippedItems.filter(entry => entry.meta?.rarity === 3 && !entry.broken);
    const allTopRarityFilled = equippedHighestRarityItems.length === GAME_EQUIPMENT_SLOTS.length
      && stableEquippedItems.every(entry => entry.meta?.rarity === 3 && !entry.broken);
    if (!allTopRarityFilled) return;
    queueAchievementToasts(['full-top-rarity-loadout']);
  }, [stableEquippedItems, queueAchievementToasts]);

  return (
    <section className="mode-panel active">
      <div className="panel-header">
        <div className="game-header-title">
          <h1>Игровой режим</h1>
          <button className="btn-secondary btn-sm game-achievements-button" onClick={openAchievementsModal}>
            <Trophy size={14} />
            Достижения
            <span className="game-achievements-count">{unlockedAchievements.length}/{gameAchievementsCatalog.length}</span>
          </button>
        </div>
        {gameStarted && !showStartPanel && (
          <div className="header-right">
            <button className="btn-accent" onClick={openStartPanel}>
              Заново
            </button>
          </div>
        )}
      </div>

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
        ghostComparison={ghostComparison}
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

      <div className="game-map-stage">
        <GameRunMap map={activeMap} onSelectNode={handleMapNodeSelect} />

        {showBattlePanel && (
          <div className="game-map-overlay">
            <div className="game-map-overlay-card game-battle-overlay">
              {battleInfoPanel}
              <TextDisplay
                text={session.active ? session.text : levelText}
                pos={session.active ? session.pos : 0}
                errPositions={session.active ? session.errPositions : new Set()}
                waitingForSpace={waitingForSpace}
                overlay={battleOverlayText}
                overlayCover
                onOverlayClick={!session.active ? resumeSavedLevel : undefined}
              />
            </div>
          </div>
        )}

        {showStartPanel && (
          <div className="game-map-overlay">
            <div className="game-map-overlay-card">
              {startOverlayContent}
            </div>
          </div>
        )}

        {pendingEvent && !result && (
          <div className="game-map-overlay">
            <GameEventModal
              pendingEvent={pendingEvent}
              eventPending={eventPending}
              eventChoiceRefs={eventChoiceRefs}
              resultActionRef={resultActionRef}
              onSelectEventChoice={handleEventChoice}
              onContinue={continueGame}
              onSkip={handleSkipEvent}
            />
          </div>
        )}

        {result && !session.active && (
          <div className="game-map-overlay">
            <GameResultCard
              result={result}
              isDailyRun={Boolean(dailySeed)}
              speedLabel={spdLabel}
              formatSpeed={fmtSpeed}
              targetSpeedDisplay={targetSpeedDisplay}
              effectiveTargetSpeedDisplay={effectiveTargetSpeedDisplay}
              rewardChoices={rewardChoices}
              selectedRewardMessage={selectedRewardMessage}
              rewardPending={rewardPending}
              mapSelectionPending={mapSelectionPending}
              totalLevels={activeTotalLevels}
              bossLevelInterval={BOSS_LEVEL_INTERVAL}
              ghostComparison={ghostComparison}
              comparison={gameResultComparison}
              masterySummary={gameMasterySummary}
              motivationGoals={gameGoalHighlights}
              motivationStreaks={gameStreakHighlights}
              resultActionRef={resultActionRef}
              rewardChoiceRefs={rewardChoiceRefs}
              onContinue={continueGame}
              onRetry={retryLevel}
              onRestart={startGame}
              onReturnToMainGame={returnToMainGame}
              onSelectReward={handleRewardChoice}
            />
          </div>
        )}
      </div>

      {(gameOver || gameWon) && (
        <div className="card mt-16">
          <h4><Trophy size={16} style={{ verticalAlign: 'middle' }} /> Итог игры</h4>
          <p className="card-desc">
            {gameWon
              ? `Пройдены все ${activeTotalLevels} уровней. Инвентарь забега очищен.`
              : `Пройдено уровней: ${completedLevels}. Максимум: уровень ${Math.max(level, completedLevels)}.`}
          </p>
        </div>
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
