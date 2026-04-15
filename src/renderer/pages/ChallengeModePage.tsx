import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Medal, Shield } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useTypingSession } from '../hooks/useTypingSession';
import { TextDisplay } from '../components/TextDisplay';
import { AchievementsModal } from '../components/AchievementsModal';
import { GameAchievementToastStack } from '../components/game/GameAchievementToastStack';
import { ResultComparisonPanel } from '../components/ResultComparisonPanel';
import { ModeQuickSettings } from '../components/practice/ModeQuickSettings';
import type {
  GameAchievementDefinition,
  PracticeContentMode,
  PracticeContentPack,
  PracticeContentPackQuickAction,
  PracticeContentScenarioId,
} from '../../shared/types';
import { checkAchievements, type AchievementEvent } from '../../core/achievements/achievementEngine';
import {
  buildPracticeContentPackPreflightSummary,
  buildPracticeContentPackQualitySummary,
  buildPracticeContentText,
  filterYoKeys,
  filterYoWords,
  getPracticeContentScenario,
  getWorstChar,
} from '../../core/engine';
import {
  getActiveMotivationGoalSnapshots,
  getMotivationStreakSnapshots,
  updateMotivationAfterPractice,
} from '../../core/motivation/progress';
import {
  buildModeResultFollowupRecommendation,
  buildPracticeResultComparison,
} from '../../core/motivation/records';

const CONTENT_MODE_LABELS: Record<PracticeContentMode, string> = {
  'adaptive-words': 'Слова',
  syllables: 'Слоги',
  'pseudo-words': 'Псевдослова',
  sentences: 'Предложения',
  custom: 'Свои наборы',
};

type ChallengeModeConfig = {
  modeId: 'survival' | 'flawless';
  title: string;
  description: string;
  scenarioId: PracticeContentScenarioId;
  allowedErrors: number;
  wordMultiplier: number;
  startLabel: string;
  successTitle: string;
  failureTitle: string;
};

const CHALLENGE_MODE_CONFIGS: Record<ChallengeModeConfig['modeId'], ChallengeModeConfig> = {
  survival: {
    modeId: 'survival',
    title: 'Выживание',
    description: 'Длинная серия с ограничением по ошибкам. Держитесь до конца текста и не растеряйте все жизни.',
    scenarioId: 'survival',
    allowedErrors: 2,
    wordMultiplier: 2.1,
    startLabel: 'Начать выживание',
    successTitle: 'Выдержано',
    failureTitle: 'Жизни закончились',
  },
  flawless: {
    modeId: 'flawless',
    title: 'Безошибочный режим',
    description: 'Один промах завершает попытку. Нужен чистый проход по всему тексту без права на сбой.',
    scenarioId: 'flawless',
    allowedErrors: 0,
    wordMultiplier: 1.5,
    startLabel: 'Начать чистый проход',
    successTitle: 'Чистый проход',
    failureTitle: 'Ошибка завершила попытку',
  },
};

function buildChallengeWordCount(baseWordCount: number, multiplier: number) {
  return Math.max(baseWordCount + 4, Math.ceil(baseWordCount * multiplier));
}

function buildChallengeResultCallout(
  config: ChallengeModeConfig,
  result: { passed: boolean; acc: number; errors: number; livesLeft: number; progressPercent: number },
  comparison: ReturnType<typeof buildPracticeResultComparison> | null,
  totalLives: number,
) {
  if (result.passed && result.errors === 0) {
    return {
      title: config.modeId === 'flawless' ? 'Идеально чистый проход' : 'Серия выдержана без потерь',
      detail: config.modeId === 'flawless'
        ? 'Режим прошёлся без единого сбоя. Это уже не просто успешная попытка, а хороший контроль стабильности.'
        : 'Выживание пройдено без расхода жизней. Значит, темп и дисциплина держались до самого конца текста.',
    };
  }
  if (result.passed && result.livesLeft === 1) {
    return {
      title: 'Финиш на грани',
      detail: 'Попытка успешная, но запас прочности почти закончился. Следующий шаг — сделать такой же проход спокойнее и чище.',
    };
  }
  if (!result.passed && config.modeId === 'flawless') {
    if (result.progressPercent >= 75) {
      return {
        title: 'Срыв в финальной части',
        detail: 'Чистый проход почти сложился, но поздняя ошибка оборвала попытку. Это хороший знак: база уже близка к рабочему flawless-результату.',
      };
    }
    if (result.progressPercent <= 30) {
      return {
        title: 'Срыв на старте',
        detail: 'Ошибки приходят слишком рано, поэтому режим ещё не успевает раскрыться. Лучше слегка снизить темп и пройти старт ровнее.',
      };
    }
    return {
      title: 'Один промах ломает серию',
      detail: 'Режим показывает, что чистота пока нестабильна в середине текста. Полезно добрать ещё несколько аккуратных проходов без гонки за скоростью.',
    };
  }
  if (!result.passed && config.modeId === 'survival') {
    if (result.progressPercent >= 70) {
      return {
        title: 'Не хватило концовки',
        detail: 'Основную дистанцию вы уже держите, но финальная часть текста съедает остаток жизней. Стоит поработать над устойчивостью на длинной серии.',
      };
    }
    if (result.acc < 93 || result.errors >= totalLives) {
      return {
        title: 'Выживание упёрлось в стабильность',
        detail: 'Проблема не в одном провале, а в накоплении ошибок. Здесь важнее ровный проход, чем резкий пик скорости на начале текста.',
      };
    }
  }
  if (comparison?.recentBestDelta?.tone === 'up' && comparison.recentBestDelta.speedDelta > 0) {
    return {
      title: 'Режим прогрессирует',
      detail: 'Даже если проход не идеален, результат уже лучше недавнего ориентира. Значит, текущая стратегия тренировки движется в нужную сторону.',
    };
  }
  return {
    title: 'Режим даёт честный срез',
    detail: config.modeId === 'flawless'
      ? 'Этот результат хорошо показывает текущий запас по чистоте набора. Повтор через несколько спокойных практик даст более ровный сигнал.'
      : 'Попытка уже полезна как проверка длинной дистанции. Ещё несколько проходов покажут, где именно стабильно теряются жизни.',
  };
}

function ChallengeModePage({ config }: { config: ChallengeModeConfig }) {
  const {
    layouts,
    currentLayout,
    currentLanguage,
    allWords,
    ngramModel,
    progress,
    settings,
    practiceSettings,
    switchMode,
    fmtSpeed,
    spdLabel,
    saveHistory,
    savePracticeSetting,
    getModePracticeSettings,
    getLayoutProgress,
    getPracticeState,
    getPracticeInsights,
    saveModePracticeSettings,
    practiceContentPacks,
    gameAchievementCatalog,
    unlockedAchievementIds,
    unlockAchievements,
    motivationProgress,
    updateMotivationProgress,
  } = useApp();
  const useYo = settings.useYo;
  const scenario = getPracticeContentScenario(config.scenarioId);
  const challengeModeSettings = getModePracticeSettings(config.modeId);

  const [showAchievements, setShowAchievements] = useState(false);
  const [achievementToasts, setAchievementToasts] = useState<GameAchievementDefinition[]>([]);
  const [showOverlay, setShowOverlay] = useState(true);
  const [challengeText, setChallengeText] = useState('');
  const [result, setResult] = useState<{
    passed: boolean;
    wpm: number;
    acc: number;
    elapsed: number;
    chars: number;
    errors: number;
    livesLeft: number;
    progressPercent: number;
  } | null>(null);
  const previewKeyRef = useRef('');
  const totalLives = config.allowedErrors + 1;

  const handleAchievementEvent = useCallback((event: AchievementEvent) => {
    const newlyUnlockedIds = checkAchievements(
      gameAchievementCatalog,
      new Set(unlockedAchievementIds),
      event,
    );
    if (newlyUnlockedIds.length === 0) return;

    const unlockedObjects = unlockAchievements(newlyUnlockedIds);
    if (unlockedObjects.length > 0) {
      setAchievementToasts(prev => [...prev, ...unlockedObjects]);
    }
  }, [gameAchievementCatalog, unlockedAchievementIds, unlockAchievements]);

  const handleRemoveToast = useCallback((achievementIndex: number) => {
    setAchievementToasts(prev => prev.filter((_, idx) => idx !== achievementIndex));
  }, []);

  const practiceAchievementCatalog = useMemo(
    () => gameAchievementCatalog.filter(a => (a.category ?? 'game') === 'practice'),
    [gameAchievementCatalog],
  );

  const practiceUnlockedCount = useMemo(
    () => practiceAchievementCatalog.filter(a => unlockedAchievementIds.includes(a.id)).length,
    [practiceAchievementCatalog, unlockedAchievementIds],
  );

  const layout = layouts.layouts[currentLayout];
  const words = useMemo(() => filterYoWords(allWords, useYo), [allWords, useYo]);
  const practiceUnlockOrder = useMemo(
    () => filterYoKeys(layout?.practiceUnlockOrder ?? [], useYo),
    [layout, useYo],
  );
  const layoutProgress = getLayoutProgress();
  const unlockedChars = practiceUnlockOrder.slice(0, layoutProgress.unlocked);
  const weakChar = getWorstChar(progress.keyStats?.[currentLayout], unlockedChars);

  const customPracticePacks = useMemo(
    () => Object.values(progress.customPracticePacks ?? {}).sort((left, right) => right.importedAt.localeCompare(left.importedAt)),
    [progress.customPracticePacks],
  );
  const availableContentPacks = useMemo<PracticeContentPack[]>(() => {
    const builtInAndAddon = practiceContentPacks.filter(pack => pack.language === 'any' || pack.language === currentLanguage);
    return [...builtInAndAddon, ...customPracticePacks];
  }, [practiceContentPacks, customPracticePacks, currentLanguage]);
  const contentMode = challengeModeSettings.contentMode ?? practiceSettings.contentMode;
  const selectedContentPackId = challengeModeSettings.selectedContentPackId || practiceSettings.selectedContentPackId;
  const selectedContentPack = useMemo<PracticeContentPack | null>(() => {
    const selected = availableContentPacks.find(pack => pack.id === selectedContentPackId);
    return selected ?? availableContentPacks[0] ?? null;
  }, [availableContentPacks, selectedContentPackId]);
  const selectedContentPackSummary = useMemo(
    () => selectedContentPack
      ? buildPracticeContentPackQualitySummary(selectedContentPack, config.scenarioId)
      : null,
    [config.scenarioId, selectedContentPack],
  );
  const effectiveContentMode = contentMode === 'custom' && !selectedContentPack ? 'adaptive-words' : contentMode;
  const selectedContentPackPreflight = useMemo(
    () => effectiveContentMode === 'custom' && selectedContentPack
      ? buildPracticeContentPackPreflightSummary(selectedContentPack, config.scenarioId)
      : null,
    [config.scenarioId, effectiveContentMode, selectedContentPack],
  );
  const challengeWordCount = useMemo(
    () => buildChallengeWordCount(scenario.targetWordCount, config.wordMultiplier),
    [config.wordMultiplier, scenario.targetWordCount],
  );
  const practiceInsights = getPracticeInsights();
  const practiceState = getPracticeState();

  const buildChallengeText = useCallback(() => buildPracticeContentText({
    allWords: words,
    unlockedChars,
    weakChar,
    contentMode: effectiveContentMode,
    contentPack: selectedContentPack,
    scenarioId: config.scenarioId,
    wordCountOverride: challengeWordCount,
    ngramModel: ngramModel ?? undefined,
    insights: practiceInsights,
    buildOptions: {
      trainingMode: 'normal',
      smartAdaptationEnabled: practiceSettings.smartAdaptationEnabled ?? true,
      smartAdaptationStrength: practiceSettings.smartAdaptationStrength ?? 'medium',
      smartAdaptationFocus: practiceSettings.smartAdaptationFocus ?? 'balanced',
    },
  }), [
    challengeWordCount,
    config.scenarioId,
    ngramModel,
    practiceInsights,
    effectiveContentMode,
    practiceSettings.smartAdaptationEnabled,
    practiceSettings.smartAdaptationFocus,
    practiceSettings.smartAdaptationStrength,
    selectedContentPack,
    unlockedChars,
    weakChar,
    words,
  ]);

  const onFinish = useCallback((wpm: number, acc: number, elapsed: number, ses: any) => {
    const passed = ses.pos >= ses.text.length;
    const livesLeft = Math.max(0, totalLives - (ses?.errors ?? 0));
    const progressPercent = ses?.text?.length
      ? Math.round((ses.pos / ses.text.length) * 100)
      : 0;
    const today = new Date().toISOString().slice(0, 10);
    if (practiceState.lastDate !== today) {
      practiceState.sessionsToday = 0;
      practiceState.minutesToday = 0;
      practiceState.lastDate = today;
    }
    practiceState.sessionsToday += 1;
    practiceState.sessionsTotal = (practiceState.sessionsTotal || 0) + 1;
    practiceState.minutesToday = (practiceState.minutesToday || 0) + elapsed / 60;

    saveHistory('practice', wpm, acc, {
      contentScenarioId: config.scenarioId,
      trainingMode: 'normal',
      contentMode: effectiveContentMode,
      durationSeconds: elapsed,
      passed,
      charStats: ses?.charStats,
    });
    updateMotivationProgress((current) => updateMotivationAfterPractice(current, {
      elapsedSeconds: elapsed,
      cpm: wpm * 5,
      acc,
      trainingMode: 'normal',
      successfulSession: passed && wpm * 5 >= Math.max(1, practiceSettings.goalSpeedCpm || 150) && acc >= 95,
      flawlessSession: passed && (ses?.errors ?? 0) === 0,
    }));
    setResult({
      passed,
      wpm,
      acc,
      elapsed,
      chars: ses?.totalChars ?? 0,
      errors: ses?.errors ?? 0,
      livesLeft,
      progressPercent,
    });

    handleAchievementEvent({ type: 'practice.sessionCompleted', totalSessions: practiceState.sessionsTotal });
  }, [
    config.scenarioId,
    effectiveContentMode,
    handleAchievementEvent,
    practiceSettings.goalSpeedCpm,
    practiceState,
    saveHistory,
    totalLives,
    updateMotivationProgress,
  ]);

  const { session, start, stop, handleKey, wpm, acc, waitingForSpace } = useTypingSession({
    mode: 'practice',
    noStepBack: practiceSettings.noStepBack,
    maxErrors: config.allowedErrors,
    onFinish,
  });

  const startChallenge = useCallback(() => {
    if (session.active) return;
    const nextText = buildChallengeText();
    previewKeyRef.current = '';
    setChallengeText(nextText);
    setShowOverlay(false);
    setResult(null);
    start(nextText);
  }, [buildChallengeText, session.active, start]);

  const retryChallenge = useCallback(() => {
    stop();
    startChallenge();
  }, [startChallenge, stop]);

  useEffect(() => {
    if (!layout || !words.length) return;
    const previewKey = [
      config.scenarioId,
      currentLayout,
      useYo ? 'yo' : 'no-yo',
      effectiveContentMode,
      selectedContentPack?.id ?? 'no-pack',
      challengeWordCount,
      practiceUnlockOrder.join(''),
      layoutProgress.unlocked,
      practiceSettings.smartAdaptationEnabled ? 'smart-on' : 'smart-off',
      practiceSettings.smartAdaptationStrength,
      practiceSettings.smartAdaptationFocus,
    ].join('|');
    if (previewKeyRef.current === previewKey) return;
    previewKeyRef.current = previewKey;
    setChallengeText(buildChallengeText());
    setShowOverlay(true);
    setResult(null);
  }, [
    buildChallengeText,
    challengeWordCount,
    config.scenarioId,
    currentLayout,
    effectiveContentMode,
    layout,
    layoutProgress.unlocked,
    practiceSettings.smartAdaptationEnabled,
    practiceSettings.smartAdaptationFocus,
    practiceSettings.smartAdaptationStrength,
    practiceUnlockOrder,
    selectedContentPack,
    useYo,
    words.length,
  ]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isPrintable = event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey;
      const isBackspace = event.key === 'Backspace';

      if (!session.active && result && isPrintable) {
        retryChallenge();
        return;
      }

      if (!session.active && showOverlay && challengeText && isPrintable) {
        startChallenge();
        return;
      }

      if (!session.active) return;
      if (isPrintable || isBackspace) handleKey(event);
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [challengeText, handleKey, result, retryChallenge, session.active, showOverlay, startChallenge]);

  const [, setTick] = useState(0);
  useEffect(() => {
    if (!session.active) return;
    const interval = setInterval(() => setTick(current => current + 1), 200);
    return () => clearInterval(interval);
  }, [session.active]);

  useEffect(() => {
    if (!achievementToasts.length) return;
    const timeout = setTimeout(() => {
      setAchievementToasts(prev => prev.slice(1));
    }, 4200);
    return () => clearTimeout(timeout);
  }, [achievementToasts]);

  const historyEntries = progress.history?.[currentLayout] ?? [];
  const scenarioHistory = historyEntries.filter(entry => entry.mode === 'practice' && entry.contentScenarioId === config.scenarioId);
  const resultComparison = useMemo(
    () => result ? buildPracticeResultComparison(historyEntries, {
      wpm: result.wpm,
      acc: result.acc,
      contentScenarioId: config.scenarioId,
      trainingMode: 'normal',
      contentMode: effectiveContentMode,
    }) : null,
    [config.scenarioId, effectiveContentMode, historyEntries, result],
  );
  const activeGoals = useMemo(
    () => getActiveMotivationGoalSnapshots(motivationProgress, 2, [
      'practice-sessions',
      'practice-minutes',
      'target-speed-sessions',
      'high-accuracy-sessions',
    ]),
    [motivationProgress],
  );
  const activeStreaks = useMemo(
    () => getMotivationStreakSnapshots(motivationProgress, [
      'flawless-practice',
      'successful-practice',
    ]),
    [motivationProgress],
  );
  const bestScenarioRun = scenarioHistory.reduce<typeof scenarioHistory[number] | null>((best, entry) => {
    if (!best) return entry;
    if (entry.wpm !== best.wpm) return entry.wpm > best.wpm ? entry : best;
    if (entry.acc !== best.acc) return entry.acc > best.acc ? entry : best;
    return new Date(entry.date).getTime() > new Date(best.date).getTime() ? entry : best;
  }, null);
  const livesLeft = Math.max(0, totalLives - session.errors);
  const challengeCallout = useMemo(
    () => result ? buildChallengeResultCallout(config, result, resultComparison, totalLives) : null,
    [config, result, resultComparison, totalLives],
  );
  const followupRecommendation = useMemo(
    () => result ? buildModeResultFollowupRecommendation({
      mode: config.modeId,
      wpm: result.wpm,
      acc: result.acc,
      passed: result.passed,
      errors: result.errors,
    }) : null,
    [config.modeId, result],
  );

  const handleContentPackAction = useCallback((guidedAction: PracticeContentPackQuickAction) => {
    if (!selectedContentPack) return;
    const { action } = guidedAction;

    const applyCustomPackToMode = (
      targetMode: 'practice' | 'test' | 'survival' | 'flawless',
      options: {
        trainingMode?: 'normal' | 'rhythm';
        sprintDurationSeconds?: number;
      } = {},
    ) => {
      if (targetMode === 'practice') {
        savePracticeSetting('contentMode', 'custom');
        savePracticeSetting('selectedContentPackId', selectedContentPack.id);
        savePracticeSetting('trainingMode', options.trainingMode ?? 'normal');
        switchMode('practice');
        return;
      }

      saveModePracticeSettings(targetMode, {
        contentMode: 'custom',
        selectedContentPackId: selectedContentPack.id,
        ...(options.sprintDurationSeconds ? { sprintDurationSeconds: options.sprintDurationSeconds } : {}),
      });
      if (targetMode !== config.modeId) {
        switchMode(targetMode);
      }
    };

    const applyBaseMaterialToMode = (
      targetMode: 'practice' | 'test' | 'survival' | 'flawless',
      options: {
        trainingMode?: 'normal' | 'rhythm';
        sprintDurationSeconds?: number;
      } = {},
    ) => {
      if (targetMode === 'practice') {
        savePracticeSetting('contentMode', 'adaptive-words');
        savePracticeSetting('selectedContentPackId', '');
        savePracticeSetting('trainingMode', options.trainingMode ?? 'normal');
        switchMode('practice');
        return;
      }

      saveModePracticeSettings(targetMode, {
        contentMode: 'adaptive-words',
        selectedContentPackId: '',
        ...(options.sprintDurationSeconds ? { sprintDurationSeconds: options.sprintDurationSeconds } : {}),
      });
      if (targetMode !== config.modeId) {
        switchMode(targetMode);
      }
    };

    if (action.kind === 'shorten-distance') {
      savePracticeSetting('contentMode', 'custom');
      savePracticeSetting('selectedContentPackId', selectedContentPack.id);
      savePracticeSetting('trainingMode', 'rhythm');
      switchMode('practice');
      return;
    }

    if (action.kind === 'switch-mode') {
      applyCustomPackToMode(action.targetMode, {
        trainingMode: action.trainingMode,
        sprintDurationSeconds: action.sprintDurationSeconds,
      });
      return;
    }

    applyBaseMaterialToMode(action.targetMode, {
      trainingMode: action.trainingMode,
      sprintDurationSeconds: action.sprintDurationSeconds,
    });
  }, [config.modeId, saveModePracticeSettings, savePracticeSetting, selectedContentPack, switchMode]);

  return (
    <section className="mode-panel active">
      <GameAchievementToastStack achievements={achievementToasts} onRemove={handleRemoveToast} />
      <AchievementsModal
        open={showAchievements}
        achievementCatalog={gameAchievementCatalog}
        unlockedAchievementIds={unlockedAchievementIds}
        categoryFilter="practice"
        onClose={() => setShowAchievements(false)}
      />

      <div className="panel-header">
        <div className="game-header-title">
          <div>
            <h1>{config.title}</h1>
            <p className="card-desc">{config.description}</p>
          </div>
          <button
            type="button"
            className="btn-secondary btn-sm game-achievements-button"
            onClick={() => setShowAchievements(true)}
          >
            <Medal size={14} />
            Достижения
            <span className="game-achievements-count">{practiceUnlockedCount}/{practiceAchievementCatalog.length}</span>
          </button>
        </div>
        <div className="header-right">
          <button className="btn-accent" disabled={session.active} onClick={startChallenge}>
            {config.startLabel}
          </button>
        </div>
      </div>

      <ModeQuickSettings
        contentMode={contentMode}
        selectedContentPackId={selectedContentPack?.id ?? ''}
        availableContentPacks={availableContentPacks}
        selectedContentPack={selectedContentPack}
        contentPackSummary={selectedContentPackSummary}
        contentPackPreflight={selectedContentPackPreflight}
        onContentModeChange={(value) => saveModePracticeSettings(config.modeId, { contentMode: value })}
        onSelectedContentPackIdChange={(value) => saveModePracticeSettings(config.modeId, { selectedContentPackId: value })}
        onContentPackAction={handleContentPackAction}
        actionsDisabled={session.active}
      />

      <div className="practice-stats-row">
        <div className="pstat daily-goal-row">
          <Shield size={16} />
          <span className="daily-goal-label">
            Ошибок допустимо: {config.allowedErrors} · жизней сейчас: {session.active ? livesLeft : totalLives}
          </span>
        </div>
        <div className="pstat daily-goal-row">
          <span className="daily-goal-label">
            Материал: {CONTENT_MODE_LABELS[effectiveContentMode]}
            {effectiveContentMode === 'custom' && selectedContentPack ? ` · ${selectedContentPack.name}` : ''}
          </span>
        </div>
        <div className="pstat daily-goal-row">
          <span className="daily-goal-label">
            Лучший результат: {bestScenarioRun ? `${fmtSpeed(bestScenarioRun.wpm)} ${spdLabel} · ${Math.round(bestScenarioRun.acc)}%` : 'ещё нет результатов'}
          </span>
        </div>
      </div>

      {session.active && (
        <div className="stats-bar">
          <div className="metric"><b>{livesLeft}</b> / {totalLives}</div>
          <div className="metric"><b>{fmtSpeed(wpm)}</b> <small className="speed-unit">{spdLabel}</small></div>
          <div className="metric"><b>{Math.round(acc)}</b>%</div>
          <div className="metric"><b>{session.text.length > 0 ? Math.round((session.pos / session.text.length) * 100) : 0}</b>%</div>
        </div>
      )}

      <TextDisplay
        text={session.active ? session.text : challengeText}
        pos={session.active ? session.pos : 0}
        errPositions={session.active ? session.errPositions : new Set()}
        waitingForSpace={waitingForSpace}
        overlay={showOverlay ? `Нажмите здесь или «${config.startLabel}»` : null}
        onOverlayClick={startChallenge}
      />

      {result && (
        <div className="result-card">
          <h3>{result.passed ? config.successTitle : config.failureTitle}</h3>
          <div className="result-big">{fmtSpeed(result.wpm)} {spdLabel}</div>
          <p>
            Точность: <b>{Math.round(result.acc)}%</b> ·
            Время: <b>{Math.round(result.elapsed)} с</b> ·
            Материал: <b>{CONTENT_MODE_LABELS[effectiveContentMode]}</b>
          </p>
          <div className="result-metrics">
            <div className="result-metric">
              <span className={`result-metric-value${result.passed ? ' good' : result.livesLeft > 0 ? ' warn' : ' bad'}`}>
                {result.livesLeft}
              </span>
              <span className="result-metric-label">Жизней осталось</span>
            </div>
            <div className="result-metric">
              <span className={`result-metric-value${result.errors === 0 ? ' good' : result.errors <= config.allowedErrors ? ' warn' : ' bad'}`}>
                {result.errors}
              </span>
              <span className="result-metric-label">Ошибок</span>
            </div>
            <div className="result-metric">
              <span className="result-metric-value">{result.chars}</span>
              <span className="result-metric-label">Символов</span>
            </div>
          </div>
          <div className="result-metrics" style={{ marginTop: 12 }}>
            {activeGoals.map((goal) => (
              <div key={goal.definition.id} className="result-metric">
                <span className="result-metric-value">
                  {goal.nextTarget != null
                    ? `${Math.round(goal.current)} / ${goal.nextTarget}`
                    : `${Math.round(goal.current)}`}
                </span>
                <span className="result-metric-label">{goal.definition.title}</span>
              </div>
            ))}
            {activeStreaks.map((streak) => (
              <div key={streak.definition.id} className="result-metric">
                <span className={`result-metric-value${streak.current > 0 ? ' good' : ''}`}>{streak.current}</span>
                <span className="result-metric-label">{streak.definition.title}</span>
              </div>
            ))}
          </div>
          {resultComparison && (
            <ResultComparisonPanel
              comparison={resultComparison}
              formatSpeed={fmtSpeed}
              speedLabel={spdLabel}
            />
          )}
          {challengeCallout && (
            <p style={{ marginTop: 10 }}>
              <b>{challengeCallout.title}.</b> {challengeCallout.detail}
            </p>
          )}
          <div className="game-actions">
            <button className="btn-accent" onClick={retryChallenge}>Ещё раз</button>
            {followupRecommendation && (
              <button className="btn-secondary" onClick={() => switchMode(followupRecommendation.actionMode)}>
                {followupRecommendation.actionLabel}
              </button>
            )}
            {followupRecommendation?.actionMode !== 'practice' && (
              <button className="btn-secondary" onClick={() => switchMode('practice')}>
                В практику
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export function SurvivalPage() {
  return <ChallengeModePage config={CHALLENGE_MODE_CONFIGS.survival} />;
}

export function FlawlessPage() {
  return <ChallengeModePage config={CHALLENGE_MODE_CONFIGS.flawless} />;
}
