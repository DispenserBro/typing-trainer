import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Trophy } from 'lucide-react';
import type {
  GameAchievementDefinition,
  GameEquipmentSlot,
  GameRunEventChoice,
  GameRunEventState,
  GameRunMapState,
  GameRunModifier,
  GameRunRewardChoice,
  GameRunResult,
} from '../../shared/types';
import { useApp } from '../contexts/AppContext';
import { useTypingSession } from '../hooks/useTypingSession';
import { TextDisplay } from '../components/TextDisplay';
import { NumberInput } from '../components/NumberInput';
import { GameAchievementsModal } from '../components/game/GameAchievementsModal';
import { GameAchievementToastStack } from '../components/game/GameAchievementToastStack';
import { GameHud } from '../components/game/GameHud';
import { GameInventoryPanel } from '../components/game/GameInventoryPanel';
import { GameEventModal } from '../components/game/GameEventModal';
import { GameRunMap } from '../components/game/GameRunMap';
import { GameResultCard } from '../components/game/GameResultCard';
import { generatePracticeText, getWorstChar, filterYoWords, filterYoKeys } from '../../core/engine';
import {
  GAME_EQUIPMENT_SLOTS,
  getGameItemById,
  getGameItemIcon,
  getGameItemRarityStars,
} from '../../core/game/items';
import { getGameAchievementById } from '../../core/game/gameAchievements';
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
  BOSS_LEVEL_WORDS,
  BOSS_MIN_ACCURACY,
  buildBossRewardChoices,
  formatSpeedFromCpm,
  isBossLevel,
  NORMAL_LEVEL_WORDS,
  NORMAL_MIN_ACCURACY,
  TOTAL_GAME_LEVELS,
} from '../../core/game/runUtils';

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
  } = useApp();

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
  const [lives, setLives] = useState(3);
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
  const finishCauseRef = useRef<'completed' | 'timeout'>('completed');
  const resultActionRef = useRef<HTMLButtonElement | null>(null);
  const rewardChoiceRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const eventChoiceRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const hasHydratedRunRef = useRef(false);
  const previewMap = useMemo(() => createGameRunMap(TOTAL_GAME_LEVELS), []);
  const activeIsBoss = isBossLevel(level);
  const unlockedAchievements = useMemo(
    () => gameState.achievements
      .map(achievementId => getGameAchievementById(achievementId))
      .filter((achievement): achievement is GameAchievementDefinition => Boolean(achievement)),
    [gameState.achievements],
  );
  const itemBonuses = useMemo(
    () => sumItemBonuses(stableEquippedItems, activeIsBoss),
    [activeIsBoss, stableEquippedItems],
  );
  const modifierBonuses = useMemo(
    () => sumModifierBonuses(activeModifiers, activeIsBoss),
    [activeIsBoss, activeModifiers],
  );
  const totalBonuses = useMemo(() => ({
    speedRequirementReductionPercent: itemBonuses.speedRequirementReductionPercent + modifierBonuses.speedRequirementReductionPercent,
    accuracyRequirementReduction: itemBonuses.accuracyRequirementReduction + modifierBonuses.accuracyRequirementReduction,
    bossTimerBonusSeconds: itemBonuses.bossTimerBonusSeconds + modifierBonuses.bossTimerBonusSeconds,
  }), [itemBonuses, modifierBonuses]);
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

  const queueAchievementToasts = useCallback((achievementIds: string[]) => {
    const unlocked = unlockGameAchievements(achievementIds);
    if (!unlocked.length) return;
    setAchievementToasts(prev => [...prev, ...unlocked]);
  }, [unlockGameAchievements]);

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

  const buildLevelText = useCallback((nextLevel: number) => {
    const wordCount = isBossLevel(nextLevel) ? BOSS_LEVEL_WORDS : NORMAL_LEVEL_WORDS;
    return generatePracticeText(words, unlocked, weak, wordCount, ngramModel ?? undefined);
  }, [words, unlocked, weak, ngramModel]);

  const calculateBossTimeLimit = useCallback((text: string) => {
    const requiredChars = text.length + (settings.endWithSpace ? 1 : 0);
    return requiredChars * 60 / targetSpeedCpm + totalBonuses.bossTimerBonusSeconds;
  }, [settings.endWithSpace, targetSpeedCpm, totalBonuses.bossTimerBonusSeconds]);

  const currentBossTimeLimit = useMemo(() => {
    if (!activeIsBoss || !levelText) return null;
    return calculateBossTimeLimit(levelText);
  }, [activeIsBoss, levelText, calculateBossTimeLimit]);

  const generateBossRewardChoices = useCallback((): BossRewardChoice[] => {
    return buildBossRewardChoices(peekNextGameLetter());
  }, [peekNextGameLetter]);

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
    const baseMinAccuracy = boss ? BOSS_MIN_ACCURACY : NORMAL_MIN_ACCURACY;
    const minAccuracy = Math.max(0, baseMinAccuracy - totalBonuses.accuracyRequirementReduction);
    const timeLimitSeconds = boss ? calculateBossTimeLimit(levelText) : null;
    const timedOut = finishCauseRef.current === 'timeout';
    finishCauseRef.current = 'completed';
    const passed = !timedOut && wpm >= effectiveGoalWpm && acc >= minAccuracy;
    const nextLives = passed ? lives : Math.max(0, lives - 1);
    const victory = passed && level >= TOTAL_GAME_LEVELS;

    saveHistory('game', wpm, acc, { charStats: ses?.charStats });
    if (passed) {
      setCompletedLevels(level);
      markGameLevelReached(level);
    }

    const brokenItemIds = wearEquippedGameItems({ passed, isBoss: boss });
    const brokenItems = brokenItemIds
      .map(itemId => stableInventoryItems.find(entry => entry.id === itemId)?.meta.name ?? null)
      .filter((name): name is string => Boolean(name));
    consumeActiveModifiers();

    const nextMapNodeIds = runMap ? getGameRunMapOutgoingIds(runMap, runMap.currentNodeId) : [];

    if (passed && boss && !victory && level < TOTAL_GAME_LEVELS) {
      setRewardChoices(generateBossRewardChoices());
      setSelectedRewardMessage(null);
      resetMapSelection();
      resetEventState();
    } else if (passed && !victory && nextMapNodeIds.length > 0) {
      setRunMap(prev => (prev ? setGameRunMapSelectableNodes(prev, nextMapNodeIds) : prev));
      resetRewardState();
      resetEventState();
    } else {
      resetMapSelection();
      resetRewardState();
      resetEventState();
    }

    if (victory) {
      clearCurrentGameRun(true);
    } else if (!passed && nextLives <= 0) {
      clearCurrentGameRun(true);
    }

    setLives(nextLives);
    setResult({
      wpm,
      acc,
      passed,
      livesLeft: nextLives,
      level,
      isBoss: boss,
      minAccuracy,
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
  }, [
    calculateBossTimeLimit,
    effectiveGoalWpm,
    generateBossRewardChoices,
    hasRepairTargets,
    stableEquippedItems,
    stableInventoryItems,
    level,
    levelText,
    lives,
    markGameLevelReached,
    clearCurrentGameRun,
    consumeActiveModifiers,
    resetEventState,
    resetMapSelection,
    resetRewardState,
    saveHistory,
    totalBonuses.accuracyRequirementReduction,
    wearEquippedGameItems,
    queueAchievementToasts,
    runMap,
  ]);

  const { session, start, stop, finish, handleKey, wpm, acc, waitingForSpace } = useTypingSession({
    mode: 'game',
    onFinish,
  });

  const startLevel = useCallback((nextLevel: number, resetGame = false) => {
    if (!layout || !words.length || !unlocked.length) return;
    finishCauseRef.current = 'completed';
    blurActiveElement();
    const text = buildLevelText(nextLevel);
    setLevel(nextLevel);
    setLevelText(text);
    setResult(null);
    resetMapSelection();
    resetEventState();
    resetRewardState();
    if (resetGame) {
      setLives(3);
      setCompletedLevels(0);
      setActiveModifiers([]);
      setGameStarted(true);
    }
    setShowStartPanel(false);
    start(text);
  }, [layout, words.length, unlocked.length, buildLevelText, resetEventState, resetRewardState, resetMapSelection, start]);

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
      startLevel(nextNode.battleLevel);
      return;
    }

    if (nextNode.kind === 'rest') {
      setPendingEvent(createRestEvent({
        level,
        lives,
        hasRepairTargets: hasRepairTargets || stableEquippedItems.some(entry =>
          Boolean(entry.inventoryItem?.maxDurability != null),
        ),
      }));
    } else if (nextNode.kind === 'treasure') {
      setPendingEvent(createCacheEvent({
        level,
        lives,
        hasRepairTargets: hasRepairTargets || stableEquippedItems.some(entry =>
          Boolean(entry.inventoryItem?.maxDurability != null),
        ),
      }));
    } else if (nextNode.kind === 'shop') {
      setPendingEvent(createShopEvent({
        level,
        lives,
        hasRepairTargets: hasRepairTargets || stableEquippedItems.some(entry =>
          Boolean(entry.inventoryItem?.maxDurability != null),
        ),
      }));
    } else if (nextNode.kind === 'risk') {
      setPendingEvent(createRiskEvent({
        level,
        lives,
        hasRepairTargets: hasRepairTargets || stableEquippedItems.some(entry =>
          Boolean(entry.inventoryItem?.maxDurability != null),
        ),
      }));
    }
    eventChoiceRefs.current = [];
  }, [
    runMap,
    resetEventState,
    resetRewardState,
    stop,
    startLevel,
    level,
    lives,
    hasRepairTargets,
    stableEquippedItems,
  ]);

  const continueFromMap = useCallback(() => {
    if (!runMap?.currentNodeId) return;
    const nextNodeId = getGameRunMapOutgoingIds(runMap, runMap.currentNodeId)[0] ?? null;
    if (!nextNodeId) return;
    enterMapNode(nextNodeId);
  }, [enterMapNode, runMap]);

  const startGame = useCallback(() => {
    blurActiveElement();
    stop();
    clearCurrentGameRun(true);
    setRunMap(createGameRunMap(TOTAL_GAME_LEVELS));
    startLevel(1, true);
  }, [clearCurrentGameRun, startLevel, stop]);

  const openStartPanel = useCallback(() => {
    stop();
    setResult(null);
    resetMapSelection();
    resetEventState();
    resetRewardState();
    setShowStartPanel(true);
  }, [resetEventState, resetRewardState, resetMapSelection, stop]);

  const continueGame = useCallback(() => {
    if (pendingEvent && !pendingEvent.resolvedChoiceId) return;
    if (rewardChoices && !selectedRewardMessage) return;
    if (lives <= 0 || level >= TOTAL_GAME_LEVELS) return;
    if (selectableMapNodeIds.length > 0) {
      setResult(null);
      return;
    }
    continueFromMap();
  }, [continueFromMap, level, lives, pendingEvent, rewardChoices, selectableMapNodeIds.length, selectedRewardMessage]);

  const retryLevel = useCallback(() => {
    if (lives <= 0) return;
    stop();
    startLevel(level);
  }, [level, lives, startLevel, stop]);

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
  }, [grantGameItem, queueAchievementToasts, unlockNextGameLetter]);

  const handleMapNodeSelect = useCallback((nodeId: string) => {
    if (!runMap || !runMap.selectableNodeIds.includes(nodeId)) return;
    enterMapNode(nodeId);
  }, [enterMapNode, runMap]);

  const handleEventChoice = useCallback((choice: GameRunEventChoice) => {
    if (!pendingEvent || pendingEvent.resolvedChoiceId || choice.disabled) return;

    const lines: string[] = [];
    const achievementIds: string[] = [];

    if (choice.effect.lifeDelta) {
      const nextLives = Math.max(0, Math.min(3, lives + choice.effect.lifeDelta));
      setLives(nextLives);
      setResult(prev => prev ? { ...prev, livesLeft: nextLives } : prev);
      if (choice.effect.lifeDelta > 0) {
        lines.push(`Жизни восстановлены: ${nextLives} из 3.`);
      } else {
        lines.push(`Сделка забрала ${Math.abs(choice.effect.lifeDelta)} жизнь.`);
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
  }, [grantGameItem, lives, pendingEvent, queueAchievementToasts, repairGameItems]);

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
  const gameOver = gameStarted && !session.active && !gameWon && lives <= 0;
  const rewardPending = Boolean(result?.passed && result.isBoss && rewardChoices && !selectedRewardMessage);
  const showBattlePanel = gameStarted
    && !showStartPanel
    && !result
    && !pendingEvent
    && selectableMapNodeIds.length === 0
    && Boolean(currentMapNode?.battleLevel)
    && Boolean(levelText);
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
      <button type="submit" className="btn-accent">
        Старт игры
        </button>
      </form>
    ) : null;
  const battleOverlayText = !session.active && !showStartPanel && !result && levelText
    ? `Забег сохранен\nУровень ${level} · ${Math.max(lives, 0)} жизни\nНажмите, чтобы продолжить`
    : null;

  useEffect(() => {
    if (hasHydratedRunRef.current) return;
    hasHydratedRunRef.current = true;

    const savedRun = gameState.currentRun;
    if (!savedRun) return;

    setLevel(savedRun.level);
    setLives(savedRun.lives);
    setCompletedLevels(savedRun.completedLevels);
    setTargetSpeedCpm(savedRun.targetSpeedCpm);
    setLevelText(savedRun.levelText);
    setActiveModifiers(savedRun.activeModifiers ?? []);
    setRunMap(savedRun.map ?? createGameRunMap(TOTAL_GAME_LEVELS));
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
      lives,
      completedLevels,
      targetSpeedCpm,
      levelText,
      activeModifiers,
      map: runMap,
      pendingRoute: null,
      pendingEvent,
      result,
      rewardChoices,
      selectedRewardMessage,
    });
  }, [
    activeModifiers,
    completedLevels,
    gameStarted,
    gameOver,
    gameWon,
    level,
    levelText,
    lives,
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
            <span className="game-achievements-count">{unlockedAchievements.length}/{gameAchievementCatalog.length}</span>
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
        lives={lives}
        level={level}
        totalLevels={TOTAL_GAME_LEVELS}
        activeIsBoss={activeIsBoss}
        unlockedLetters={layoutProgress.unlocked}
        highestLevel={gameState.highestLevel}
        effectiveTargetSpeedDisplay={effectiveTargetSpeedDisplay}
        currentSpeedDisplay={session.active ? fmtSpeed(wpm) : (result ? fmtSpeed(result.wpm) : '0')}
        accuracy={session.active ? acc : (result ? result.acc : 100)}
        speedUnitLabel={spdLabel}
        activeModifiers={activeModifiers}
        bossTimeLimit={currentBossTimeLimit}
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
            />
          </div>
        )}

        {result && !session.active && (
          <div className="game-map-overlay">
            <GameResultCard
              result={result}
              speedLabel={spdLabel}
              formatSpeed={fmtSpeed}
              targetSpeedDisplay={targetSpeedDisplay}
              effectiveTargetSpeedDisplay={effectiveTargetSpeedDisplay}
              rewardChoices={rewardChoices}
              selectedRewardMessage={selectedRewardMessage}
              rewardPending={rewardPending}
              mapSelectionPending={mapSelectionPending}
              totalLevels={TOTAL_GAME_LEVELS}
              bossLevelInterval={BOSS_LEVEL_INTERVAL}
              resultActionRef={resultActionRef}
              rewardChoiceRefs={rewardChoiceRefs}
              onContinue={continueGame}
              onRetry={retryLevel}
              onRestart={startGame}
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
              ? `Пройдены все ${TOTAL_GAME_LEVELS} уровней. Инвентарь забега очищен.`
              : `Пройдено уровней: ${completedLevels}. Максимум: уровень ${Math.max(level, completedLevels)}.`}
          </p>
        </div>
      )}

      <GameAchievementsModal
        open={showAchievementsModal}
        unlockedAchievementIds={gameState.achievements}
        achievementCatalog={gameAchievementCatalog}
        onClose={closeAchievementsModal}
      />

      <GameAchievementToastStack achievements={achievementToasts} />
    </section>
  );
}






