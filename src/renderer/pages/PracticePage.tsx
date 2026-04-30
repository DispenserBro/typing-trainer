import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAppPractice, useAppSettings } from '../contexts/AppContext';
import { useTypingSession } from '../hooks/useTypingSession';
import { usePracticeContentPackActions } from '../hooks/practice/usePracticeContentPackActions';
import { useModeContentPackSelection } from '../hooks/practice/useModeContentPackSelection';
import {
  buildPracticeBuildOptionsKey,
  usePracticeBuildOptions,
} from '../hooks/practice/usePracticeBuildOptions';
import { buildModeMaterialKey, buildModePreviewKey } from '../hooks/practice/modePreviewKey';
import { useModeContentTextBuilder } from '../hooks/practice/useModeContentTextBuilder';
import { useModeAchievements } from '../hooks/practice/useModeAchievements';
import { useModeTextInputs } from '../hooks/practice/useModeTextInputs';
import { GameAchievementToastStack } from '../components/game/GameAchievementToastStack';
import { PracticeContentPackStatus } from '../components/practice/PracticeContentPackStatus';
import { PracticeHeader } from '../components/practice/PracticeHeader';
import { PracticeProgressPanels } from '../components/practice/PracticeProgressPanels';
import { PracticeResultFlow } from '../components/practice/PracticeResultFlow';
import { PracticeSessionStage } from '../components/practice/PracticeSessionStage';
import { PracticeSettingsLayer } from '../components/practice/PracticeSettingsLayer';
import { PracticeUnlockModal } from '../components/practice/PracticeUnlockModal';
import {
  getPackRecommendedModeLabel,
  getPackRepetitionRiskLabel,
} from '../components/practice/contentPackSummaryI18n';
import { AchievementsModal } from '../components/AchievementsModal';
import { useI18n } from '../contexts/I18nContext';
import type {
  CharStat,
  HistoryEntry,
} from '../../shared/types';
import {
  getPracticeContentScenarioForTrainingMode,
  getWorstChar,
  resolvePracticeContentTargetWordCount,
} from '../../core/engine';
import { buildPracticeInsightsDelta, getRhythmScore, mergeLayoutPracticeInsights, summarizeSessionRhythm } from '../../core/practice/insights';
import { buildPracticeFeedback, mergeCharStats, PRACTICES_PER_UNLOCK, type PracticeFeedback } from '../../core/practice/feedback';
import {
  buildPracticePerformanceViewModel,
  buildPracticeResultViewModel,
} from '../../core/practice/viewModel';
import {
  getActiveMotivationGoalSnapshots,
  getMotivationStreakSnapshots,
  updateMotivationAfterPractice,
} from '../../core/motivation/progress';

const EMPTY_KEY_STATS: Record<string, CharStat> = {};
const EMPTY_HISTORY: HistoryEntry[] = [];

export function PracticePage() {
  const { t } = useI18n();
  const app = useAppPractice();
  const { layouts, allWords, ngramModel, progress, fmtSpeed, spdLabel, switchMode,
    saveHistory, saveProgress, getLayoutProgress, getPracticeState,
    getPracticeInsights, savePracticeInsights, savePracticeRhythmSession,
    gameAchievementCatalog, unlockedAchievementIds, unlockAchievements,
    practiceContentPacks, motivationProgress, updateMotivationProgress } = app;
  const {
    currentLayout,
    currentLanguage,
    settings,
    practiceSettings,
    savePracticeSetting,
    saveModePracticeSettings,
  } = useAppSettings();

  const {
    achievementCatalog: practiceAchievementCatalog,
    achievementToasts,
    handleAchievementEvent,
    handleRemoveToast,
    setShowAchievements,
    showAchievements,
    unlockedCount: practiceUnlockedCount,
  } = useModeAchievements({
    category: 'practice',
    gameAchievementCatalog,
    unlockedAchievementIds,
    unlockAchievements,
  });

  const layout = layouts.layouts[currentLayout];
  const useYo = settings.useYo;
  const layoutProgress = getLayoutProgress();
  const {
    practiceUnlockOrder,
    unlockedChars: unlocked,
    weakChar: weak,
    words,
  } = useModeTextInputs({
    allWords,
    keyStats: progress.keyStats?.[currentLayout],
    layout,
    layoutProgress,
    useYo,
  });
  const practiceState = getPracticeState();
  const practiceInsights = getPracticeInsights();
  if (weak) practiceState.worstChar = weak;
  const fallbackWorstChar = weak ?? practiceState.worstChar ?? unlocked[0] ?? null;

  const [showOverlay, setShowOverlay] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [result, setResult] = useState<{
    wpm: number;
    acc: number;
    newLetter: boolean;
    openedLetter: string | null;
    worstChar: string | null;
    unlockProgress: number;
    rhythmScore: number;
    rhythmDeviation: number;
    feedback: PracticeFeedback;
  } | null>(null);
  const [lastCharStats, setLastCharStats] = useState<Record<string, CharStat>>({});
  const [unlockModalLetter, setUnlockModalLetter] = useState<string | null>(null);

  const [practiceText, setPracticeText] = useState('');
  const previewKeyRef = useRef<string>('');
  const goalCPM = Math.max(1, practiceSettings.goalSpeedCpm || 150);
  const trainingMode = practiceSettings.trainingMode ?? 'normal';
  const contentMode = practiceSettings.contentMode ?? 'adaptive-words';
  const contentScenario = useMemo(
    () => getPracticeContentScenarioForTrainingMode(trainingMode, t),
    [t, trainingMode],
  );
  const {
    availableContentPacks,
    effectiveContentMode,
    selectedContentPackControlId,
    selectedContentPack,
    selectedContentPackPreflight,
    selectedContentPackSummary,
  } = useModeContentPackSelection({
    currentLanguage,
    customPracticePacks: progress.customPracticePacks,
    practiceSettings,
    practiceContentPacks,
    scenarioId: contentScenario.id,
    t,
  });
  const practiceWordCount = useMemo(
    () => resolvePracticeContentTargetWordCount(contentScenario, effectiveContentMode, selectedContentPack),
    [effectiveContentMode, contentScenario, selectedContentPack],
  );
  const selectedContentPackRiskLabel = useMemo(
    () => selectedContentPackSummary
      ? getPackRepetitionRiskLabel(t, selectedContentPackSummary.repetitionRisk).toLowerCase()
      : null,
    [selectedContentPackSummary, t],
  );
  const selectedContentPackRecommendedModeLabel = useMemo(
    () => selectedContentPackSummary && selectedContentPack
      ? getPackRecommendedModeLabel(t, selectedContentPack, selectedContentPackSummary)
      : null,
    [selectedContentPack, selectedContentPackSummary, t],
  );
  const smartAdaptationEnabled = practiceSettings.smartAdaptationEnabled ?? true;
  const smartAdaptationStrength = practiceSettings.smartAdaptationStrength ?? 'medium';
  const smartAdaptationFocus = practiceSettings.smartAdaptationFocus ?? 'balanced';
  const practiceBuildOptions = usePracticeBuildOptions(practiceSettings, trainingMode);
  const practiceBuildOptionsKey = buildPracticeBuildOptionsKey(practiceBuildOptions);
  const buildPracticeMaterialText = useModeContentTextBuilder({
    allWords: words,
    buildOptions: practiceBuildOptions,
    contentMode: effectiveContentMode,
    contentPack: selectedContentPack,
    insights: practiceInsights,
    ngramModel,
    scenarioId: contentScenario.id,
    unlockedChars: unlocked,
    weakChar: weak,
    wordCountOverride: practiceWordCount,
  });

  // Convert CPM to display unit and back
  const unit = settings.speedUnit;
  const cpmToDisplay = (cpm: number) =>
    unit === 'wpm' ? Math.round(cpm / 5)
    : unit === 'cps' ? +(cpm / 60).toFixed(1)
    : Math.round(cpm);
  const displayToCpm = (val: number) =>
    unit === 'wpm' ? val * 5
    : unit === 'cps' ? val * 60
    : val;
  const goalDisplay = cpmToDisplay(goalCPM);

  const buildPracticePreview = useCallback(() => {
    return buildPracticeMaterialText();
  }, [buildPracticeMaterialText]);
  const practicePreviewKey = buildModePreviewKey({
    buildOptionsKey: practiceBuildOptionsKey,
    contentMode: effectiveContentMode,
    currentLayout,
    materialKey: buildModeMaterialKey({ contentPack: selectedContentPack, words }),
    practiceUnlockOrder,
    scenarioId: contentScenario.id,
    selectedContentPackId: selectedContentPack?.id,
    unlockedCount: layoutProgress.unlocked,
    useYo,
    wordCount: practiceWordCount,
  });

  // Generate / regenerate text only when preview conditions actually change
  useEffect(() => {
    if (!layout || !words.length) return;
    if (previewKeyRef.current === practicePreviewKey) return;
    previewKeyRef.current = practicePreviewKey;
    setPracticeText(buildPracticePreview());
    setShowOverlay(true);
    setResult(null);
    setUnlockModalLetter(null);
  }, [
    layout,
    words.length,
    buildPracticePreview,
    practicePreviewKey,
  ]);

  const {
    handleContentPackAction,
    handleDeleteCustomContent,
    handleImportCustomContent,
    importStatus,
  } = usePracticeContentPackActions({
    contentScenarioId: contentScenario.id,
    practiceSettings,
    progress,
    saveModePracticeSettings,
    savePracticeSetting,
    saveProgress,
    selectedContentPack,
    switchMode,
    translate: t,
  });

  const onFinish = useCallback((wpm: number, acc: number, elapsed: number, ses: any) => {
    const goalAcc = 95;
    const goalWpm = goalCPM / 5;
    const rhythm = summarizeSessionRhythm(ses);
    const rhythmScore = getRhythmScore(rhythm);
    const enoughForProgress = wpm >= goalWpm && acc >= goalAcc && (trainingMode === 'normal' || rhythmScore >= 75);
    let unlockedNewLetter = false;

    if (layoutProgress.unlocked < practiceUnlockOrder.length) {
      if (enoughForProgress) {
        layoutProgress.unlockProgress += 1;
        if (layoutProgress.unlockProgress >= PRACTICES_PER_UNLOCK) {
          layoutProgress.unlocked++;
          layoutProgress.unlockProgress = 0;
          unlockedNewLetter = true;
        }
      }
    } else {
      layoutProgress.unlockProgress = 0;
    }

    const today = new Date().toISOString().slice(0, 10);
    if (practiceState.lastDate !== today) {
      practiceState.sessionsToday = 0;
      practiceState.minutesToday = 0;
      practiceState.lastDate = today;
    }
    practiceState.sessionsToday++;
    practiceState.sessionsTotal = (practiceState.sessionsTotal || 0) + 1;
    practiceState.minutesToday = (practiceState.minutesToday || 0) + elapsed / 60;

    handleAchievementEvent({ type: 'practice.sessionCompleted', totalSessions: practiceState.sessionsTotal });

    const mergedStats = mergeCharStats(progress.keyStats?.[currentLayout], ses?.charStats);
    const worstCharAfterFinish = getWorstChar(mergedStats, unlocked) ?? fallbackWorstChar;
    const openedLetter = unlockedNewLetter ? (practiceUnlockOrder[layoutProgress.unlocked - 1] ?? null) : null;
    const nextPracticeInsights = mergeLayoutPracticeInsights(
      getPracticeInsights(),
      buildPracticeInsightsDelta({
        layoutId: currentLayout,
        layoutFingers: layout.fingers,
        session: ses,
      }),
    );
    const sessionIntervals = ses?.keypresses
      ?.filter((entry: { expected: string; interval: number }) => entry.expected && entry.expected !== ' ' && entry.interval > 0)
      .map((entry: { interval: number }) => Math.round(entry.interval)) ?? [];
    const feedback = buildPracticeFeedback(nextPracticeInsights, worstCharAfterFinish, t);
    practiceState.worstChar = worstCharAfterFinish;
    updateMotivationProgress((current) => updateMotivationAfterPractice(current, {
      elapsedSeconds: elapsed,
      cpm: wpm * 5,
      acc,
      trainingMode,
      successfulSession: enoughForProgress,
      flawlessSession: (ses?.errors ?? 0) === 0,
    }));
    savePracticeInsights(nextPracticeInsights);
    savePracticeRhythmSession({
      trainingMode,
      wpm,
      acc,
      textLength: ses?.text?.length ?? 0,
      intervals: sessionIntervals,
      averageInterval: rhythm.averageInterval,
      averageDeviation: rhythm.averageDeviation,
      rhythmScore,
      worstInterval: Math.max(0, ...(sessionIntervals.length ? sessionIntervals : [0])),
    });
    saveHistory('practice', wpm, acc, {
      contentScenarioId: contentScenario.id,
      trainingMode,
      contentMode: effectiveContentMode,
      durationSeconds: elapsed,
      charStats: ses?.charStats,
    });
    if (ses?.charStats) setLastCharStats(ses.charStats);

    if (unlockedNewLetter) {
        handleAchievementEvent({ type: 'practice.letterUnlocked' });
    }

    if (openedLetter) setUnlockModalLetter(openedLetter);
    setResult({
      wpm,
      acc,
      newLetter: unlockedNewLetter,
      openedLetter,
      worstChar: worstCharAfterFinish,
      unlockProgress: layoutProgress.unlockProgress,
      rhythmScore,
      rhythmDeviation: Math.round(rhythm.averageDeviation),
      feedback,
    });
  }, [
    contentScenario.id,
    currentLayout,
    effectiveContentMode,
    fallbackWorstChar,
    getPracticeInsights,
    goalCPM,
    handleAchievementEvent,
    layout,
    layoutProgress,
    practiceState,
    practiceUnlockOrder,
    progress,
    saveHistory,
    savePracticeInsights,
    savePracticeRhythmSession,
    t,
    trainingMode,
    unlocked,
    updateMotivationProgress,
  ]);

  const { session, start, stop, handleKey, wpm, acc, renderTick, waitingForSpace } = useTypingSession({
    mode: 'practice',
    noStepBack: practiceSettings.noStepBack,
    onFinish,
  });

  // Click on text overlay to start
  const startPractice = useCallback(() => {
    if (session.active || !practiceText) return;
    setShowOverlay(false);
    setResult(null);
    setUnlockModalLetter(null);
    start(practiceText);
  }, [session.active, practiceText, start]);

  // Retry + immediately start (used when typing after result)
  const retryAndStart = useCallback(() => {
    const text = buildPracticePreview();
    previewKeyRef.current = '';
    setPracticeText(text);
    setShowOverlay(false);
    setResult(null);
    setUnlockModalLetter(null);
    stop();
    start(text);
  }, [buildPracticePreview, stop, start]);

  // keydown listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isPrintable = e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey;
      const isBackspace = e.key === 'Backspace';
      if (showSettingsModal) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowSettingsModal(false);
        }
        return;
      }
      if (unlockModalLetter) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          e.preventDefault();
          setUnlockModalLetter(null);
        }
        return;
      }
      // If result is shown — start new practice on printable key
      if (!session.active && result && isPrintable) {
        retryAndStart();
        return;
      }
      // If overlay is shown (first start) — start practice by typing
      if (!session.active && showOverlay && practiceText && isPrintable) {
        startPractice();
        return;
      }
      if (!session.active) return;
      if (isPrintable || isBackspace) handleKey(e);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [session.active, result, showOverlay, practiceText, handleKey, retryAndStart, startPractice, unlockModalLetter, showSettingsModal]);

  // Live stats update interval
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!session.active) return;
    const iv = setInterval(() => setTick(t => t + 1), 200);
    return () => clearInterval(iv);
  }, [session.active]);

  const retry = () => {
    const text = buildPracticePreview();
    previewKeyRef.current = '';
    setPracticeText(text);
    setShowOverlay(true);
    setResult(null);
    setUnlockModalLetter(null);
    stop();
  };

  // Letter grid + goal
  const ks = progress.keyStats?.[currentLayout] ?? EMPTY_KEY_STATS;

  const hist = progress.history?.[currentLayout] ?? EMPTY_HISTORY;
  const practicePerformance = useMemo(() => buildPracticePerformanceViewModel({
    fallbackWorstChar,
    formatSpeed: fmtSpeed,
    historyEntries: hist,
    keyStats: ks,
    lastCharStats,
    result,
  }), [fallbackWorstChar, fmtSpeed, hist, ks, lastCharStats, result]);

  const practiceResultViewModel = useMemo(() => buildPracticeResultViewModel({
    contentMode: effectiveContentMode,
    contentScenarioId: contentScenario.id,
    currentLayout,
    historyEntries: hist,
    layoutProgressUnlocked: layoutProgress.unlocked,
    layouts,
    motivationProgress,
    practicesPerUnlock: PRACTICES_PER_UNLOCK,
    progress,
    result,
    translate: t,
    trainingMode,
  }), [
    effectiveContentMode,
    contentScenario.id,
    currentLayout,
    hist,
    layoutProgress.unlocked,
    layouts,
    motivationProgress,
    progress,
    result,
    t,
    trainingMode,
  ]);

  const goalVal = practiceSettings.dailyGoalValue || 15;

  return (
    <section className={`mode-panel active${settings.focusMode && session.active ? ' focus-active' : ''}`}>
      <GameAchievementToastStack achievements={achievementToasts} onRemove={handleRemoveToast} />
      <AchievementsModal
        open={showAchievements}
        achievementCatalog={gameAchievementCatalog}
        unlockedAchievementIds={unlockedAchievementIds}
        categoryFilter="practice"
        onClose={() => setShowAchievements(false)}
      />
      <PracticeHeader
        achievementsLabel={t('practice.achievements')}
        achievementsTotal={practiceAchievementCatalog.length}
        achievementsUnlocked={practiceUnlockedCount}
        onOpenAchievements={() => setShowAchievements(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        settingsLabel={t('practice.settings.title')}
        title={t('practice.title')}
      />

      <PracticeProgressPanels
        currentAccuracy={session.active ? Math.round(acc) : (practicePerformance.last ? Math.round(practicePerformance.last.acc) : 100)}
        currentSpeed={session.active ? fmtSpeed(wpm) : (practicePerformance.last ? fmtSpeed(practicePerformance.last.wpm) : '0')}
        dailyGoalType={practiceSettings.dailyGoalType}
        dailyGoalValue={goalVal}
        goalDisplay={goalDisplay}
        layoutProgressUnlocked={layoutProgress.unlocked}
        practicePerformance={practicePerformance}
        practiceState={practiceState}
        practiceUnlockOrder={practiceUnlockOrder}
        practiceUnlockProgress={layoutProgress.unlockProgress}
        practicesPerUnlock={PRACTICES_PER_UNLOCK}
        speedLabel={spdLabel}
        toDisplaySpeed={cpmToDisplay}
        translate={t}
        unlockedKeyStats={ks}
      />

      <PracticeContentPackStatus
        contentMode={contentMode}
        contentPackPreflight={selectedContentPackPreflight}
        contentPackRecommendedModeLabel={selectedContentPackRecommendedModeLabel}
        contentPackRiskLabel={selectedContentPackRiskLabel}
        contentPackSummary={selectedContentPackSummary}
        contentScenarioLabel={contentScenario.label}
        onContentPackAction={handleContentPackAction}
        selectedContentPack={selectedContentPack}
        sessionActive={session.active}
        translate={t}
      />

      {/* Text display */}
      <PracticeSessionStage
        text={session.active ? session.text : practiceText}
        pos={session.active ? session.pos : 0}
        errPositions={session.active ? session.errPositions : new Set()}
        waitingForSpace={waitingForSpace}
        overlay={!session.active ? (
          result
            ? null
            : (showOverlay ? t('practice.overlay') : null)
        ) : null}
        onOverlayClick={result ? retryAndStart : startPractice}
      />

      <PracticeResultFlow
        formatSpeed={fmtSpeed}
        practiceResultViewModel={practiceResultViewModel}
        result={result}
        retryAndStart={retryAndStart}
        speedLabel={spdLabel}
        translate={t}
      />

      <PracticeSettingsLayer
        open={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        dailyGoalType={practiceSettings.dailyGoalType}
        dailyGoalValue={practiceSettings.dailyGoalValue}
        onDailyGoalTypeChange={(value) => savePracticeSetting('dailyGoalType', value)}
        onDailyGoalValueChange={(value) => savePracticeSetting('dailyGoalValue', value)}
        goalDisplay={goalDisplay}
        speedLabel={spdLabel}
        unit={unit}
        onGoalSpeedChange={(value) => savePracticeSetting('goalSpeedCpm', Math.round(displayToCpm(value)))}
        trainingMode={trainingMode}
        onTrainingModeChange={(value) => savePracticeSetting('trainingMode', value)}
        contentMode={contentMode}
        onContentModeChange={(value) => savePracticeSetting('contentMode', value)}
        availableContentPacks={availableContentPacks}
        selectedContentPack={selectedContentPack}
        selectedContentPackId={selectedContentPackControlId}
        onSelectedContentPackIdChange={(value) => savePracticeSetting('selectedContentPackId', value)}
        contentScenarioLabel={contentScenario.label}
        contentPackSummary={selectedContentPackSummary}
        contentPackPreflight={selectedContentPackPreflight}
        onContentPackAction={handleContentPackAction}
        contentPackActionsDisabled={session.active}
        onImportCustomContent={handleImportCustomContent}
        onDeleteCustomContent={handleDeleteCustomContent}
        importStatus={importStatus}
        smartAdaptationEnabled={smartAdaptationEnabled}
        onSmartAdaptationEnabledChange={(value) => savePracticeSetting('smartAdaptationEnabled', value)}
        smartAdaptationStrength={smartAdaptationStrength}
        onSmartAdaptationStrengthChange={(value) => savePracticeSetting('smartAdaptationStrength', value)}
        smartAdaptationFocus={smartAdaptationFocus}
        onSmartAdaptationFocusChange={(value) => savePracticeSetting('smartAdaptationFocus', value)}
        noStepBack={practiceSettings.noStepBack}
        onNoStepBackChange={(value) => savePracticeSetting('noStepBack', value)}
      />

      <PracticeUnlockModal
        letter={unlockModalLetter}
        onClose={() => setUnlockModalLetter(null)}
        translate={t}
      />

      {settings.focusMode && <div className="focus-hint">{t('practice.focusMode')}</div>}
    </section>
  );
}
