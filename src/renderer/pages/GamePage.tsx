import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Heart, RotateCcw, Swords, Trophy, Medal } from 'lucide-react';
import type {
  GameAchievementDefinition,
  GameEquipmentSlot,
  GameItemDefinition,
  GameInventoryItem,
  GameRunRewardChoice,
  GameRunResult,
} from '../../shared/types';
import { useApp } from '../contexts/AppContext';
import { useTypingSession } from '../hooks/useTypingSession';
import { TextDisplay } from '../components/TextDisplay';
import { generatePracticeText, getWorstChar, filterYoWords, filterYoKeys } from '../engine';
import {
  GAME_EQUIPMENT_SLOTS,
  getGameItemById,
  getGameItemIcon,
  getGameItemRarityStars,
  isBrokenInventoryItem,
  pickRandomGameItem,
} from '../gameItems';
import { getGameAchievementById } from '../gameAchievements';

const TOTAL_GAME_LEVELS = 100;
const BOSS_LEVEL_INTERVAL = 5;
const NORMAL_MIN_ACCURACY = 85;
const BOSS_MIN_ACCURACY = 95;
const NORMAL_LEVEL_WORDS = 25;
const BOSS_LEVEL_WORDS = 35;

type BossRewardChoice = GameRunRewardChoice;
type LevelResult = GameRunResult;

function isBossLevel(level: number) {
  return level % BOSS_LEVEL_INTERVAL === 0;
}

function formatSpeedFromCpm(cpm: number, unit: 'wpm' | 'cpm' | 'cps') {
  if (unit === 'wpm') return `${Math.round(cpm / 5)}`;
  if (unit === 'cps') return `${+(cpm / 60).toFixed(1)}`;
  return `${Math.round(cpm)}`;
}

function formatGameItemMeta(item: GameItemDefinition, equipped = false) {
  return `${getGameItemRarityStars(item.rarity)} · ${item.bossOnly ? 'только на боссах' : 'работает всегда'}${equipped ? ' · экипирован' : ''}`;
}

function getRewardKindLabel(choice: BossRewardChoice) {
  if (choice.kind === 'simple') return 'Тихая реликвия';
  if (choice.kind === 'durable') return 'Нестабильный артефакт';
  return 'Печать мастера';
}

export function GamePage() {
  const {
    layouts, currentLayout, allWords, ngramModel, progress, settings, practiceSettings,
    fmtSpeed, spdLabel, saveHistory, getLayoutProgress,
    gameState, grantGameItem, equipGameItem, unequipGameItem, markGameLevelReached,
    wearEquippedGameItems, resetGameInventory, peekNextGameLetter, unlockNextGameLetter,
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

  const equippedBySlot = useMemo(() => Object.fromEntries(
    GAME_EQUIPMENT_SLOTS.map(slot => [slot.key, gameState.equipped[slot.key]]),
  ) as Record<GameEquipmentSlot, string | null>, [gameState.equipped]);

  const inventoryItems = useMemo(() => gameState.inventory
    .map(entry => {
      const meta = getGameItemById(entry.itemId);
      if (!meta) return null;
      const equippedIn = GAME_EQUIPMENT_SLOTS.find(slot => gameState.equipped[slot.key] === entry.id)?.key ?? null;
      return {
        ...entry,
        meta,
        broken: isBrokenInventoryItem(entry),
        equippedIn,
      };
    })
    .filter((entry): entry is GameInventoryItem & {
      meta: GameItemDefinition;
      broken: boolean;
      equippedIn: GameEquipmentSlot | null;
    } => Boolean(entry)),
  [gameState.equipped, gameState.inventory]);

  const equippedItems = useMemo(() => GAME_EQUIPMENT_SLOTS.map(slot => {
    const inventoryItemId = equippedBySlot[slot.key];
    const inventoryItem = inventoryItems.find(entry => entry.id === inventoryItemId) ?? null;
    return {
      slot,
      inventoryItem,
      meta: inventoryItem?.meta ?? null,
      broken: inventoryItem?.broken ?? false,
    };
  }), [equippedBySlot, inventoryItems]);

  const [targetSpeedCpm, setTargetSpeedCpm] = useState(() => Math.max(1, practiceSettings.goalSpeedCpm || 150));
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [completedLevels, setCompletedLevels] = useState(0);
  const [levelText, setLevelText] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [showStartPanel, setShowStartPanel] = useState(true);
  const [result, setResult] = useState<LevelResult | null>(null);
  const [rewardChoices, setRewardChoices] = useState<BossRewardChoice[] | null>(null);
  const [selectedRewardMessage, setSelectedRewardMessage] = useState<string | null>(null);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [achievementToasts, setAchievementToasts] = useState<GameAchievementDefinition[]>([]);
  const finishCauseRef = useRef<'completed' | 'timeout'>('completed');
  const resultActionRef = useRef<HTMLButtonElement | null>(null);
  const rewardChoiceRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const hasHydratedRunRef = useRef(false);
  const activeIsBoss = isBossLevel(level);
  const unlockedAchievements = useMemo(
    () => gameState.achievements
      .map(achievementId => getGameAchievementById(achievementId))
      .filter((achievement): achievement is GameAchievementDefinition => Boolean(achievement)),
    [gameState.achievements],
  );
  const itemBonuses = useMemo(() => equippedItems.reduce((acc, entry) => {
    if (!entry.inventoryItem || !entry.meta || entry.broken) return acc;
    if (entry.meta.bossOnly && !activeIsBoss) return acc;
    acc.speedRequirementReductionPercent += entry.meta.speedRequirementReductionPercent ?? 0;
    acc.accuracyRequirementReduction += entry.meta.accuracyRequirementReduction ?? 0;
    acc.bossTimerBonusSeconds += entry.meta.bossTimerBonusSeconds ?? 0;
    return acc;
  }, {
    speedRequirementReductionPercent: 0,
    accuracyRequirementReduction: 0,
    bossTimerBonusSeconds: 0,
  }), [activeIsBoss, equippedItems]);

  const goalWpm = targetSpeedCpm / 5;
  const unit = settings.speedUnit;
  const targetSpeedDisplay = unit === 'wpm' ? Math.round(targetSpeedCpm / 5)
    : unit === 'cps' ? +(targetSpeedCpm / 60).toFixed(1)
    : Math.round(targetSpeedCpm);
  const effectiveGoalWpm = goalWpm * (1 - itemBonuses.speedRequirementReductionPercent / 100);
  const effectiveTargetSpeedCpm = targetSpeedCpm * (1 - itemBonuses.speedRequirementReductionPercent / 100);
  const effectiveTargetSpeedDisplay = formatSpeedFromCpm(effectiveTargetSpeedCpm, unit);

  const queueAchievementToasts = useCallback((achievementIds: string[]) => {
    const unlocked = unlockGameAchievements(achievementIds);
    if (!unlocked.length) return;
    setAchievementToasts(prev => [...prev, ...unlocked]);
  }, [unlockGameAchievements]);

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
    return requiredChars * 60 / targetSpeedCpm + itemBonuses.bossTimerBonusSeconds;
  }, [itemBonuses.bossTimerBonusSeconds, settings.endWithSpace, targetSpeedCpm]);

  const currentBossTimeLimit = useMemo(() => {
    if (!activeIsBoss || !levelText) return null;
    return calculateBossTimeLimit(levelText);
  }, [activeIsBoss, levelText, calculateBossTimeLimit]);

  const generateBossRewardChoices = useCallback((): BossRewardChoice[] => {
    const nextLetter = peekNextGameLetter();
    const simpleItem = pickRandomGameItem('simple');
    const durableItem = pickRandomGameItem('durable');

    return [
      {
        id: 'reward-letter',
        kind: 'letter',
        title: 'Печать мастера',
        flavor: nextLetter ? `Пробуждает символ «${nextLetter.toUpperCase()}»` : 'Алфавит уже полностью открыт',
        description: nextLetter
          ? 'Навсегда открывает следующую букву для практики и игры.'
          : 'В этой раскладке больше нет закрытых символов.',
        letter: nextLetter,
        disabled: !nextLetter,
      },
      {
        id: `reward-simple-${simpleItem?.id ?? 'none'}`,
        kind: 'simple',
        title: 'Тихая реликвия',
        flavor: simpleItem?.name ?? 'Реликвии закончились',
        description: simpleItem?.description ?? 'Сейчас этот выбор недоступен.',
        itemId: simpleItem?.id,
        disabled: !simpleItem,
      },
      {
        id: `reward-durable-${durableItem?.id ?? 'none'}`,
        kind: 'durable',
        title: 'Нестабильный артефакт',
        flavor: durableItem?.name ?? 'Артефакты закончились',
        description: durableItem?.description ?? 'Сейчас этот выбор недоступен.',
        itemId: durableItem?.id,
        disabled: !durableItem,
      },
    ];
  }, [peekNextGameLetter]);

  const resetRewardState = useCallback(() => {
    setRewardChoices(null);
    setSelectedRewardMessage(null);
    rewardChoiceRefs.current = [];
  }, []);

  const onFinish = useCallback((wpm: number, acc: number, elapsed: number) => {
    const boss = isBossLevel(level);
    const baseMinAccuracy = boss ? BOSS_MIN_ACCURACY : NORMAL_MIN_ACCURACY;
    const minAccuracy = Math.max(0, baseMinAccuracy - itemBonuses.accuracyRequirementReduction);
    const timeLimitSeconds = boss ? calculateBossTimeLimit(levelText) : null;
    const timedOut = finishCauseRef.current === 'timeout';
    finishCauseRef.current = 'completed';
    const passed = !timedOut && wpm >= effectiveGoalWpm && acc >= minAccuracy;
    const nextLives = passed ? lives : Math.max(0, lives - 1);
    const victory = passed && level >= TOTAL_GAME_LEVELS;

    saveHistory('game', wpm, acc);
    if (passed) {
      setCompletedLevels(level);
      markGameLevelReached(level);
    }

    const brokenItemIds = wearEquippedGameItems({ passed, isBoss: boss });
    const brokenItems = brokenItemIds
      .map(itemId => inventoryItems.find(entry => entry.id === itemId)?.meta.name ?? null)
      .filter((name): name is string => Boolean(name));

    if (passed && boss && !victory && level < TOTAL_GAME_LEVELS) {
      setRewardChoices(generateBossRewardChoices());
      setSelectedRewardMessage(null);
    } else {
      resetRewardState();
    }

    if (victory) {
      resetGameInventory();
      clearCurrentGameRun();
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
    inventoryItems,
    itemBonuses.accuracyRequirementReduction,
    level,
    levelText,
    lives,
    markGameLevelReached,
    clearCurrentGameRun,
    resetGameInventory,
    resetRewardState,
    saveHistory,
    wearEquippedGameItems,
    queueAchievementToasts,
  ]);

  const { session, start, stop, finish, handleKey, wpm, acc, waitingForSpace } = useTypingSession({
    mode: 'game',
    onFinish,
  });

  const startLevel = useCallback((nextLevel: number, resetGame = false) => {
    if (!layout || !words.length || !unlocked.length) return;
    finishCauseRef.current = 'completed';
    const text = buildLevelText(nextLevel);
    setLevel(nextLevel);
    setLevelText(text);
    setResult(null);
    resetRewardState();
    if (resetGame) {
      setLives(3);
      setCompletedLevels(0);
      setGameStarted(true);
    }
    setShowStartPanel(false);
    start(text);
  }, [layout, words.length, unlocked.length, buildLevelText, resetRewardState, start]);

  const startGame = useCallback(() => {
    stop();
    startLevel(1, true);
  }, [startLevel, stop]);

  const openStartPanel = useCallback(() => {
    stop();
    setResult(null);
    resetRewardState();
    setShowStartPanel(true);
  }, [resetRewardState, stop]);

  const continueGame = useCallback(() => {
    if (rewardChoices && !selectedRewardMessage) return;
    if (lives <= 0 || level >= TOTAL_GAME_LEVELS) return;
    stop();
    startLevel(level + 1);
  }, [level, lives, rewardChoices, selectedRewardMessage, startLevel, stop]);

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

  const resumeSavedLevel = useCallback(() => {
    if (session.active || !levelText) return;
    setResult(null);
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

  const [, setTick] = useState(0);
  useEffect(() => {
    if (!session.active) return;
    const interval = setInterval(() => setTick(t => t + 1), 200);
    return () => clearInterval(interval);
  }, [session.active]);

  const liveElapsedSeconds = session.active ? (performance.now() - session.startTime) / 1000 : (result?.elapsed ?? 0);
  const bossTimerRatio = currentBossTimeLimit ? Math.min(1, liveElapsedSeconds / currentBossTimeLimit) : 0;
  const gameWon = Boolean(result?.victory);
  const gameOver = gameStarted && !session.active && !gameWon && lives <= 0;
  const gameLocked = gameStarted && !gameOver && !gameWon;
  const rewardPending = Boolean(result?.passed && result.isBoss && rewardChoices && !selectedRewardMessage);
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
          <input
            type="number"
            className="input-minimal"
            min={1}
            max={9999}
            value={targetSpeedDisplay}
            onChange={e => updateTargetSpeed(parseFloat(e.target.value) || 0)}
          />
          <small>{spdLabel}</small>
        </div>
      </label>
      <button type="submit" className="btn-accent">
        Старт игры
      </button>
    </form>
  ) : null;
  const textDisplayOverlay = !session.active
    ? (showStartPanel
      ? null
      : (!result && levelText ? `Забег сохранен\nУровень ${level} · ${Math.max(lives, 0)} жизни\nНажмите, чтобы продолжить` : null))
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
    setResult(savedRun.result);
    setRewardChoices(savedRun.rewardChoices);
    setSelectedRewardMessage(savedRun.selectedRewardMessage);
    setGameStarted(true);
    setShowStartPanel(false);
  }, [gameState.currentRun]);

  useEffect(() => {
    if (!hasHydratedRunRef.current || !gameStarted) return;

    saveCurrentGameRun({
      level,
      lives,
      completedLevels,
      targetSpeedCpm,
      levelText,
      result,
      rewardChoices,
      selectedRewardMessage,
    });
  }, [
    completedLevels,
    gameStarted,
    level,
    levelText,
    lives,
    result,
    rewardChoices,
    saveCurrentGameRun,
    selectedRewardMessage,
    targetSpeedCpm,
  ]);

  useEffect(() => {
    if (!session.active || !activeIsBoss || !currentBossTimeLimit) return;
    if (liveElapsedSeconds < currentBossTimeLimit) return;
    finishCauseRef.current = 'timeout';
    finish();
  }, [activeIsBoss, currentBossTimeLimit, finish, liveElapsedSeconds, session.active]);

  useEffect(() => {
    if (!rewardPending) return;
    const nextButton = rewardChoiceRefs.current.find(Boolean);
    nextButton?.focus({ preventScroll: true });
  }, [rewardPending]);

  useEffect(() => {
    if (!result || session.active || rewardPending) return;
    resultActionRef.current?.focus({ preventScroll: true });
  }, [result, rewardPending, session.active, selectedRewardMessage]);

  useEffect(() => {
    if (!achievementToasts.length) return;
    const timeout = setTimeout(() => {
      setAchievementToasts(prev => prev.slice(1));
    }, 4200);
    return () => clearTimeout(timeout);
  }, [achievementToasts]);

  useEffect(() => {
    const equippedHighestRarityItems = equippedItems.filter(entry => entry.meta?.rarity === 3 && !entry.broken);
    const allTopRarityFilled = equippedHighestRarityItems.length === GAME_EQUIPMENT_SLOTS.length
      && equippedItems.every(entry => entry.meta?.rarity === 3 && !entry.broken);
    if (!allTopRarityFilled) return;
    queueAchievementToasts(['full-top-rarity-loadout']);
  }, [equippedItems, queueAchievementToasts]);

  return (
    <section className="mode-panel active">
      <div className="panel-header">
        <div className="game-header-title">
          <h1>Игровой режим</h1>
          <button className="btn-secondary btn-sm game-achievements-button" onClick={() => setShowAchievementsModal(true)}>
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

      <div className="stats-bar">
        <div className="metric"><b>{Math.max(lives, 0)}</b> жизни</div>
        <div className="metric"><b>{level}</b> / {TOTAL_GAME_LEVELS}</div>
        <div className={`metric${activeIsBoss ? ' metric-negative' : ''}`}><b>{activeIsBoss ? 'Босс' : 'Уровень'}</b></div>
        <div className="metric"><b>{layoutProgress.unlocked}</b> букв</div>
        <div className="metric"><b>{gameState.highestLevel}</b> рекорд</div>
        <div className="metric"><b>{effectiveTargetSpeedDisplay}</b> <small className="speed-unit">{spdLabel}</small></div>
        <div className="metric"><b>{session.active ? fmtSpeed(wpm) : (result ? fmtSpeed(result.wpm) : '0')}</b> <small className="speed-unit">{spdLabel}</small></div>
        <div className="metric"><b>{session.active ? Math.round(acc) : (result ? Math.round(result.acc) : 100)}</b>%</div>
      </div>

      {activeIsBoss && currentBossTimeLimit && (
        <div className="game-boss-timer">
          <div className="game-boss-timer-row">
            <span>Таймер босса</span>
            <span><b>{liveElapsedSeconds.toFixed(1)}</b> / {currentBossTimeLimit.toFixed(1)} c</span>
          </div>
          <div className="game-boss-timer-bar">
            <div
              className={`game-boss-timer-fill${bossTimerRatio >= 0.85 ? ' danger' : ''}`}
              style={{ width: `${Math.min(100, bossTimerRatio * 100)}%` }}
            />
          </div>
        </div>
      )}

      <details className="card game-items-card">
        <summary className="game-items-summary">
          <span>Инвентарь</span>
          <small>{inventoryItems.length} предметов</small>
        </summary>
        <p className="card-desc">
          Реликвии добываются только после побед над боссами. Хрупкие артефакты дают больше силы, но могут рассыпаться прямо по ходу забега.
        </p>
        {inventoryItems.length ? (
          <div className="game-inventory-grid">
            {inventoryItems.map(item => {
              const Icon = getGameItemIcon(item.meta.icon);

              return (
                <div key={item.id} className={`game-inventory-card rarity-${item.meta.rarity}${item.broken ? ' broken' : ''}`}>
                  <div className="game-inventory-head">
                    <div className="game-item-badge">
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="game-slot-name">{item.meta.name}</div>
                      <div className="game-item-meta">{formatGameItemMeta(item.meta, Boolean(item.equippedIn))}</div>
                    </div>
                  </div>
                  <div className="game-slot-desc">{item.meta.description}</div>
                  {item.maxDurability != null && item.durability != null && (
                    <div className={`game-durability${item.broken ? ' broken' : ''}`}>
                      Прочность: <b>{item.durability}</b> / {item.maxDurability}
                    </div>
                  )}
                  <div className="game-item-effects">
                    {item.meta.effects.map(effect => (
                      <span key={`${item.id}-${effect.kind}-${effect.description}`} className="game-item-effect-chip">
                        {effect.description}
                      </span>
                    ))}
                  </div>
                  <div className="game-item-actions">
                    {GAME_EQUIPMENT_SLOTS.map(slot => (
                      <button
                        key={slot.key}
                        className="btn-secondary btn-sm"
                        disabled={item.broken}
                        onClick={() => {
                          const equipped = equipGameItem(slot.key, item.id);
                          if (equipped) queueAchievementToasts(['equip-item']);
                        }}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="game-items-empty">
            После боссов здесь будут появляться реликвии и артефакты для текущего забега.
          </div>
        )}
      </details>

      <div className="game-status-row">
        <div className="game-lives-row">
          {Array.from({ length: 3 }, (_, idx) => (
            <span key={idx} className={`game-heart${idx < lives ? ' active' : ' lost'}`}>
              <Heart size={18} fill="currentColor" />
            </span>
          ))}
        </div>
        <div className="game-equipped-inline">
          {equippedItems.map(entry => {
            const Icon = entry.meta ? getGameItemIcon(entry.meta.icon) : null;

            return (
              <div key={entry.slot.key} className={`game-inline-slot${entry.meta ? ' filled' : ''}${entry.broken ? ' broken' : ''}`}>
                <div className="game-inline-slot-label">{entry.slot.label}</div>
                {entry.meta && entry.inventoryItem ? (
                  <div className={`game-inline-slot-body rarity-${entry.meta.rarity}`}>
                    <span className="game-item-badge">
                      {Icon && <Icon size={16} />}
                    </span>
                    <div className="game-inline-slot-text">
                      <strong>{entry.meta.shortName}</strong>
                      <small>
                        {getGameItemRarityStars(entry.meta.rarity)}
                        {' · '}
                        {entry.inventoryItem.maxDurability != null && entry.inventoryItem.durability != null
                          ? `${entry.inventoryItem.durability}/${entry.inventoryItem.maxDurability}`
                          : 'без износа'}
                        {entry.meta.bossOnly ? ' · боссы' : ''}
                      </small>
                    </div>
                    <button className="btn-secondary btn-sm" onClick={() => unequipGameItem(entry.slot.key)}>
                      Снять
                    </button>
                  </div>
                ) : (
                  <div className="game-inline-slot-empty">Пусто</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <TextDisplay
        text={session.active ? session.text : levelText}
        pos={session.active ? session.pos : 0}
        errPositions={session.active ? session.errPositions : new Set()}
        waitingForSpace={waitingForSpace}
        overlay={textDisplayOverlay}
        overlayCover
        overlayContent={startOverlayContent}
        onOverlayClick={showStartPanel ? undefined : (!result ? resumeSavedLevel : undefined)}
      />

      {result && !session.active && (
        <div className="result-card game-result-card">
          <h3>{result.victory
            ? 'Игра пройдена'
            : result.passed
              ? (result.isBoss ? 'Босс повержен' : 'Уровень пройден')
              : result.timedOut
                ? (result.livesLeft > 0 ? 'Время вышло' : 'Игра окончена')
                : (result.livesLeft > 0 ? 'Жизнь потеряна' : 'Игра окончена')}
          </h3>
          <div className="result-big">{fmtSpeed(result.wpm)} {spdLabel}</div>
          <p>
            Базовая цель: <b>{targetSpeedDisplay} {spdLabel}</b> ·
            Цель с реликвиями: <b>{effectiveTargetSpeedDisplay} {spdLabel}</b>
          </p>
          <p>
            Точность: <b>{Math.round(result.acc)}%</b> / {result.minAccuracy}%+
          </p>
          {result.isBoss && result.timeLimitSeconds && (
            <p>Время: <b>{result.elapsed.toFixed(1)} c</b> / {result.timeLimitSeconds.toFixed(1)} c</p>
          )}
          {result.brokenItems.length > 0 && (
            <p className="game-breakage-note">Распались предметы: <b>{result.brokenItems.join(', ')}</b></p>
          )}
          <p>{result.victory
            ? `Вы прошли все ${TOTAL_GAME_LEVELS} уровней. Все реликвии этого забега рассеялись.`
            : result.passed
              ? result.isBoss
                ? `Трофей босса ждет выбора. Следующий этап: уровень ${result.level + 1}.`
                : `Уровень ${result.level} завершен. Дальше идет ${result.level + 1}${(result.level + 1) % BOSS_LEVEL_INTERVAL === 0 ? ' — босс' : ''}.`
              : result.timedOut
                ? `Вы не уложились в лимит времени. Осталось жизней: ${result.livesLeft}.`
                : `Нужно держать скорость не ниже цели и точность от ${result.minAccuracy}%. Осталось жизней: ${result.livesLeft}.`}
          </p>

          {rewardChoices && result.passed && result.isBoss && !result.victory && (
            <div className="game-reward-block">
              <div className="game-reward-title">Трофей босса</div>
              {!selectedRewardMessage ? (
                <div className="game-reward-grid">
                  {rewardChoices.map((choice, index) => {
                    const rewardItem = choice.itemId ? getGameItemById(choice.itemId) : null;
                    const RewardIcon = rewardItem ? getGameItemIcon(rewardItem.icon) : null;
                    const rewardRarity = rewardItem ? getGameItemRarityStars(rewardItem.rarity) : '✦ Особая награда';
                    const rewardName = rewardItem?.name ?? (choice.letter ? `Символ «${choice.letter.toUpperCase()}»` : choice.title);
                    const rewardKindLabel = getRewardKindLabel(choice);
                    return (
                      <div
                        key={choice.id}
                        className={`game-reward-card${rewardItem ? ` rarity-${rewardItem.rarity}` : ''}${choice.disabled ? ' disabled' : ''}`}
                      >
                        <div className="game-reward-card-head">
                          <div className={`game-item-badge${choice.kind === 'letter' ? ' letter' : ''}`}>
                            {choice.kind === 'letter'
                              ? (choice.letter?.toUpperCase() ?? '?')
                              : RewardIcon && <RewardIcon size={18} />}
                          </div>
                          <div className="game-reward-copy">
                            <div className={`game-reward-rarity${rewardItem ? '' : ' special'}`}>{rewardRarity}</div>
                            <div className="game-reward-name">{rewardName}</div>
                            <div className="game-reward-kind">{rewardKindLabel}</div>
                          </div>
                        </div>
                        <div className="game-reward-body">
                          <div className="game-slot-desc">{choice.description}</div>
                          {rewardItem?.maxDurability != null && (
                            <div className="game-durability risky">
                              Прочность: <b>{rewardItem.maxDurability}</b> / {rewardItem.maxDurability}
                            </div>
                          )}
                          {rewardItem && (
                            <div className="game-item-effects">
                              {rewardItem.effects.map(effect => (
                                <span key={`${choice.id}-${effect.description}`} className="game-item-effect-chip">
                                  {effect.description}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          ref={node => { rewardChoiceRefs.current[index] = node; }}
                          className="btn-accent"
                          disabled={choice.disabled}
                          onClick={() => handleRewardChoice(choice)}
                        >
                          {choice.kind === 'letter'
                            ? 'Пробудить символ'
                            : choice.kind === 'simple'
                              ? 'Забрать реликвию'
                              : 'Рискнуть и взять'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="game-reward-picked">{selectedRewardMessage}</div>
              )}
            </div>
          )}

          <div className="game-actions">
            {rewardPending ? null : result.passed && !result.victory ? (
              <button ref={resultActionRef} className="btn-accent" onClick={continueGame}>
                <Swords size={14} style={{ verticalAlign: 'middle' }} /> Следующий уровень
              </button>
            ) : result.livesLeft > 0 && !result.victory ? (
              <button ref={resultActionRef} className="btn-accent" onClick={retryLevel}>
                <RotateCcw size={14} style={{ verticalAlign: 'middle' }} /> Повторить уровень
              </button>
            ) : (
              <button ref={resultActionRef} className="btn-accent" onClick={startGame}>
                <RotateCcw size={14} style={{ verticalAlign: 'middle' }} /> Сыграть ещё раз
              </button>
            )}
          </div>
        </div>
      )}

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

      {showAchievementsModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAchievementsModal(false); }}>
          <div className="modal game-achievements-modal">
            <h3>Достижения</h3>
            <p className="card-desc">
              Открыто <b>{unlockedAchievements.length}</b> из {gameAchievementCatalog.length}.
            </p>
            <div className="game-achievements-list">
              {gameAchievementCatalog.map(achievement => {
                const unlocked = gameState.achievements.includes(achievement.id);
                return (
                  <div key={achievement.id} className={`game-achievement-card${unlocked ? ' unlocked' : ''}`}>
                    <div className="game-achievement-icon">
                      <Medal size={16} />
                    </div>
                    <div className="game-achievement-copy">
                      <div className="game-achievement-name">{achievement.name}</div>
                      <div className="game-achievement-description">{achievement.description}</div>
                    </div>
                    <div className="game-achievement-state">{unlocked ? 'Открыто' : 'Закрыто'}</div>
                  </div>
                );
              })}
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAchievementsModal(false)}>Закрыть</button>
            </div>
          </div>
        </div>
      )}

      <div className="game-achievement-toast-stack" aria-live="polite" aria-atomic="true">
        {achievementToasts.slice(0, 3).map(achievement => (
          <div key={`${achievement.id}-${achievementToasts.indexOf(achievement)}`} className="game-achievement-toast">
            <div className="game-achievement-toast-title">Достижение получено</div>
            <div className="game-achievement-toast-name">{achievement.name}</div>
            <div className="game-achievement-toast-description">{achievement.description}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
