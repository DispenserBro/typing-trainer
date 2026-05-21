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
import { EMPTY_ERR_POSITIONS } from '../components/TextDisplay';
import { useI18n } from '../contexts/I18nContext';
import type {
  CharStat,
  HistoryEntry,
  Session,
} from '../../shared/types';
import {
  getPracticeContentScenarioForTrainingMode,
  resolvePracticeContentTargetWordCount,
} from '../../core/practice/contentPipeline';
import { PRACTICES_PER_UNLOCK, type PracticeFeedback } from '../../core/practice/feedback';
import {
  buildPracticePerformanceViewModel,
  buildPracticeResultViewModel,
} from '../../core/practice/viewModel';
import { buildPracticeFamilyModeHeaderViewModel } from '../../core/practice/modePagePresentation';
import { resolvePracticeSessionCompletion } from '../../core/practice/sessionCompletion';
import {
  getActiveMotivationGoalSnapshots,
  getMotivationStreakSnapshots,
  updateMotivationAfterPractice,
} from '../../core/motivation/progress';
import { isPrintableKeyboardStartEvent } from '../keyboard/startEvent';

const EMPTY_KEY_STATS: Record<string, CharStat> = {};
const EMPTY_HISTORY: HistoryEntry[] = [];

export function PracticePage() {
  const { t } = useI18n();
  const practiceHeader = buildPracticeFamilyModeHeaderViewModel('practice', t);
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
    const today = new Date().toISOString().slice(0, 10);
    const completion = resolvePracticeSessionCompletion({
      acc,
      baseCharStats: progress.keyStats?.[currentLayout],
      contentMode: effectiveContentMode,
      contentScenarioId: contentScenario.id,
      elapsedSeconds: elapsed,
      fallbackWorstChar,
      goalSpeedCpm: goalCPM,
      layoutFingers: layout.fingers,
      layoutId: currentLayout,
      layoutProgress,
      practiceInsights: getPracticeInsights(),
      practiceState,
      practiceUnlockOrder,
      session: ses as Session,
      today,
      trainingMode,
      translate: t,
      unlockedChars: unlocked,
      wpm,
    });

    Object.assign(layoutProgress, completion.nextLayoutProgress);
    Object.assign(practiceState, completion.nextPracticeState);
    completion.achievementEvents.forEach(handleAchievementEvent);
    updateMotivationProgress(current => updateMotivationAfterPractice(current, completion.motivationEvent));
    savePracticeInsights(completion.nextInsights);
    savePracticeRhythmSession(completion.rhythmSession);
    saveHistory('practice', wpm, acc, {
      contentScenarioId: completion.historyEntry.contentScenarioId,
      trainingMode: completion.historyEntry.trainingMode,
      contentMode: completion.historyEntry.contentMode,
      durationSeconds: completion.historyEntry.durationSeconds,
      charStats: completion.historyEntry.charStats,
    });
    if (completion.lastCharStats) setLastCharStats(completion.lastCharStats);

    if (completion.result.openedLetter) setUnlockModalLetter(completion.result.openedLetter);
    setResult(completion.result);
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
  const startPractice = useCallback((initialEvent?: KeyboardEvent) => {
    if (session.active || !practiceText) return;
    setShowOverlay(false);
    setResult(null);
    setUnlockModalLetter(null);
    start(practiceText);
    if (isPrintableKeyboardStartEvent(initialEvent)) {
      handleKey(initialEvent);
    }
  }, [handleKey, session.active, practiceText, start]);

  // Retry + immediately start (used when typing after result)
  const retryAndStart = useCallback((initialEvent?: KeyboardEvent) => {
    const text = buildPracticePreview();
    previewKeyRef.current = '';
    setPracticeText(text);
    setShowOverlay(false);
    setResult(null);
    setUnlockModalLetter(null);
    stop();
    start(text);
    if (isPrintableKeyboardStartEvent(initialEvent)) {
      handleKey(initialEvent);
    }
  }, [buildPracticePreview, handleKey, stop, start]);

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
        retryAndStart(e);
        return;
      }
      // If overlay is shown (first start) — start practice by typing
      if (!session.active && showOverlay && practiceText && isPrintable) {
        startPractice(e);
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
        achievementsLabel={practiceHeader.achievementsLabel}
        achievementsTotal={practiceAchievementCatalog.length}
        achievementsUnlocked={practiceUnlockedCount}
        onOpenAchievements={() => setShowAchievements(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        settingsLabel={practiceHeader.settingsLabel ?? t('practice.settings.title')}
        title={practiceHeader.title}
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
        errPositions={session.active ? session.errPositions : EMPTY_ERR_POSITIONS}
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
