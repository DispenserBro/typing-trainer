import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAppPractice, useAppSettings } from '../contexts/AppContext';
import { useTypingSession } from '../hooks/useTypingSession';
import { AchievementsModal } from '../components/AchievementsModal';
import { GameAchievementToastStack } from '../components/game/GameAchievementToastStack';
import { ModePageHeader } from '../components/practice/ModePageHeader';
import { ModeSessionStage } from '../components/practice/ModeSessionStage';
import { SprintResultFlow } from '../components/practice/SprintResultFlow';
import { SprintSettingsSection } from '../components/practice/SprintSettingsSection';
import { useI18n } from '../contexts/I18nContext';
import {
  buildPracticeContentText,
  getPracticeContentScenario,
} from '../../core/engine';
import {
  updateMotivationAfterPractice,
} from '../../core/motivation/progress';
import { useModeContentPackActions } from '../hooks/practice/useModeContentPackActions';
import { useModeAchievements } from '../hooks/practice/useModeAchievements';
import { useModePreviewState } from '../hooks/practice/useModePreviewState';
import { useModeKeyboardStart } from '../hooks/practice/useModeKeyboardStart';
import { useModeResultFollowup } from '../hooks/practice/useModeResultFollowup';
import { useModeBestResultLabel } from '../hooks/practice/useModeBestResultLabel';
import { buildSprintResultCallout } from '../hooks/practice/modeResultCallouts';
import { buildSprintWordCount } from '../hooks/practice/modeWordCounts';
import {
  buildPracticeBuildOptionsKey,
  usePracticeBuildOptions,
} from '../hooks/practice/usePracticeBuildOptions';
import { useModeContentPackSelection } from '../hooks/practice/useModeContentPackSelection';
import { useModeMotivationSnapshots } from '../hooks/practice/useModeMotivationSnapshots';
import { useModeTextInputs } from '../hooks/practice/useModeTextInputs';
import { buildModePreviewKey } from '../hooks/practice/modePreviewKey';
import { useModeResultHistory } from '../hooks/practice/useModeResultHistory';
import { useModeMaterialLabels } from '../hooks/practice/useModeMaterialLabels';
import { InlineStatsBar } from '../components/ui/InlineStatsBar';

const SPRINT_DURATION_OPTIONS = [15, 30, 45, 60];

export function SprintPage() {
  const { t } = useI18n();
  const {
    layouts,
    allWords,
    ngramModel,
    progress,
    switchMode,
    fmtSpeed,
    spdLabel,
    saveHistory,
    getLayoutProgress,
    getPracticeInsights,
    practiceContentPacks,
    gameAchievementCatalog,
    unlockedAchievementIds,
    unlockAchievements,
    motivationProgress,
    updateMotivationProgress,
  } = useAppPractice();
  const {
    currentLayout,
    currentLanguage,
    settings,
    practiceSettings,
    savePracticeSetting,
    getModePracticeSettings,
    saveModePracticeSettings,
  } = useAppSettings();
  const useYo = settings.useYo;
  const sprintScenario = getPracticeContentScenario('sprint', t);
  const sprintModeSettings = getModePracticeSettings('test');

  const [timerValue, setTimerValue] = useState(sprintModeSettings.sprintDurationSeconds ?? 30);
  const [result, setResult] = useState<{
    wpm: number;
    acc: number;
    elapsed: number;
    chars: number;
    errors: number;
  } | null>(null);
  const {
    achievementCatalog: sprintAchievementCatalog,
    achievementToasts,
    handleAchievementEvent,
    handleRemoveToast,
    setShowAchievements,
    showAchievements,
    unlockedCount: sprintUnlockedCount,
  } = useModeAchievements({
    category: 'test',
    gameAchievementCatalog,
    unlockedAchievementIds,
    unlockAchievements,
  });

  const layout = layouts.layouts[currentLayout];
  const layoutProgress = getLayoutProgress();
  const {
    practiceUnlockOrder,
    unlockedChars,
    weakChar,
    words,
  } = useModeTextInputs({
    allWords,
    keyStats: progress.keyStats?.[currentLayout],
    layout,
    layoutProgress,
    useYo,
  });

  const {
    availableContentPacks,
    contentMode,
    effectiveContentMode,
    selectedContentPack,
    selectedContentPackControlId,
    selectedContentPackDisplayName,
    selectedContentPackPreflight,
    selectedContentPackSummary,
  } = useModeContentPackSelection({
    currentLanguage,
    customPracticePacks: progress.customPracticePacks,
    modeSettings: sprintModeSettings,
    practiceContentPacks,
    practiceSettings,
    scenarioId: 'sprint',
    t,
  });
  const {
    contentModeLabel: sprintContentModeLabel,
    trainingMaterialLabel: sprintTrainingMaterialLabel,
  } = useModeMaterialLabels(effectiveContentMode, 'sprint.material', t);
  const duration = sprintModeSettings.sprintDurationSeconds ?? 30;
  const sprintWordCount = useMemo(
    () => buildSprintWordCount(duration, sprintScenario.targetWordCount),
    [duration, sprintScenario.targetWordCount],
  );
  const practiceInsights = getPracticeInsights();
  const practiceBuildOptions = usePracticeBuildOptions(practiceSettings);
  const practiceBuildOptionsKey = buildPracticeBuildOptionsKey(practiceBuildOptions);

  const buildSprintText = useCallback(() => buildPracticeContentText({
    allWords: words,
    unlockedChars,
    weakChar,
    contentMode: effectiveContentMode,
    contentPack: selectedContentPack,
    scenarioId: 'sprint',
    wordCountOverride: sprintWordCount,
    ngramModel: ngramModel ?? undefined,
    insights: practiceInsights,
    buildOptions: practiceBuildOptions,
  }), [
    words,
    unlockedChars,
    weakChar,
    effectiveContentMode,
    selectedContentPack,
    sprintWordCount,
    ngramModel,
    practiceInsights,
    practiceBuildOptions,
  ]);

  const onFinish = useCallback((wpm: number, acc: number, elapsed: number, ses: any) => {
    saveHistory('test', wpm, acc, {
      contentScenarioId: 'sprint',
      trainingMode: 'normal',
      contentMode: effectiveContentMode,
      durationSeconds: elapsed,
      charStats: ses?.charStats,
    });
    updateMotivationProgress((current) => updateMotivationAfterPractice(current, {
      elapsedSeconds: elapsed,
      cpm: wpm * 5,
      acc,
      trainingMode: 'normal',
      successfulSession: wpm * 5 >= Math.max(1, practiceSettings.goalSpeedCpm || 150) && acc >= 95,
      flawlessSession: (ses?.errors ?? 0) === 0,
    }));
    setResult({
      wpm,
      acc,
      elapsed,
      chars: ses?.totalChars ?? 0,
      errors: ses?.errors ?? 0,
    });

    handleAchievementEvent({ type: 'test.completed', wpm, accuracy: acc });
  }, [
    effectiveContentMode,
    handleAchievementEvent,
    practiceSettings.goalSpeedCpm,
    saveHistory,
    updateMotivationProgress,
  ]);

  const { session, start, stop, finish, handleKey, wpm, acc, waitingForSpace } = useTypingSession({
    mode: 'test',
    noStepBack: practiceSettings.noStepBack,
    onFinish,
  });

  const startSprint = useCallback(() => {
    if (session.active) return;
    const nextText = buildSprintText();
    setSprintText(nextText);
    setShowOverlay(false);
    setResult(null);
    setTimerValue(duration);
    start(nextText);
  }, [buildSprintText, duration, session.active, start]);

  const retrySprint = useCallback(() => {
    stop();
    startSprint();
  }, [startSprint, stop]);

  const sprintPreviewKey = buildModePreviewKey({
    buildOptionsKey: practiceBuildOptionsKey,
    contentMode: effectiveContentMode,
    currentLayout,
    practiceUnlockOrder,
    selectedContentPackId: selectedContentPack?.id,
    unlockedCount: layoutProgress.unlocked,
    useYo,
    wordCount: sprintWordCount,
  });
  const {
    setShowOverlay,
    setText: setSprintText,
    showOverlay,
    text: sprintText,
  } = useModePreviewState({
    buildText: buildSprintText,
    enabled: !!layout && words.length > 0,
    onPreviewReset: () => setTimerValue(duration),
    onResultReset: () => setResult(null),
    previewKey: sprintPreviewKey,
    sessionActive: session.active,
  });

  useEffect(() => {
    if (!session.active) {
      setTimerValue(duration);
      return;
    }

    const tick = () => {
      const elapsedSeconds = (performance.now() - session.startTime) / 1000;
      const remaining = Math.max(0, duration - elapsedSeconds);
      setTimerValue(remaining);
      if (remaining <= 0.05) finish();
    };

    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [duration, finish, session.active, session.startTime]);

  useModeKeyboardStart({
    handleKey,
    onRetry: () => retrySprint(),
    onStart: () => startSprint(),
    overlayVisible: showOverlay,
    previewText: sprintText,
    resultVisible: !!result,
    sessionActive: session.active,
  });

  const {
    bestEntries: sprintHistoryEntries,
    resultComparison: sprintResultComparison,
  } = useModeResultHistory({
    contentMode: effectiveContentMode,
    currentLayout,
    historyByLayout: progress.history,
    mode: 'sprint',
    result,
    scenarioId: 'sprint',
    t,
  });
  const {
    activeGoals: activeSprintGoals,
    activeStreaks: sprintStreaks,
  } = useModeMotivationSnapshots(motivationProgress, t);
  const sprintBestResult = useModeBestResultLabel({
    emptyLabel: t('sprint.noResults'),
    entries: sprintHistoryEntries,
    formatSpeed: fmtSpeed,
    speedLabel: spdLabel,
  });
  const sprintCallout = useMemo(
    () => result ? buildSprintResultCallout(t, result, sprintResultComparison) : null,
    [result, sprintResultComparison, t],
  );
  const { followupRecommendation, handleFollowupAction } = useModeResultFollowup({
    result: result ? {
      mode: 'test',
      wpm: result.wpm,
      acc: result.acc,
      errors: result.errors,
    } : null,
    switchMode,
    t,
  });

  const handleContentPackAction = useModeContentPackActions({
    onShortenDistance: () => saveModePracticeSettings('test', { sprintDurationSeconds: 15 }),
    saveModePracticeSettings,
    savePracticeSetting,
    selfMode: 'test',
    selectedContentPack,
    switchMode,
  });

  return (
    <section className="mode-panel active">
      <GameAchievementToastStack achievements={achievementToasts} onRemove={handleRemoveToast} />
      <AchievementsModal
        open={showAchievements}
        achievementCatalog={gameAchievementCatalog}
        unlockedAchievementIds={unlockedAchievementIds}
        categoryFilter="test"
        onClose={() => setShowAchievements(false)}
      />

      <ModePageHeader
        title={t('sprint.title')}
        description={t('sprint.description')}
        achievementsLabel={t('sprint.achievements')}
        achievementsUnlocked={sprintUnlockedCount}
        achievementsTotal={sprintAchievementCatalog.length}
        onOpenAchievements={() => setShowAchievements(true)}
        onStart={startSprint}
        startDisabled={session.active}
        startLabel={t('sprint.start')}
      />

      <SprintSettingsSection
        actionsDisabled={session.active}
        availableContentPacks={availableContentPacks}
        contentMode={contentMode}
        contentModeLabel={sprintContentModeLabel}
        duration={duration}
        durationLabel={t('sprint.duration')}
        durationOptions={SPRINT_DURATION_OPTIONS}
        durationValueLabel={(value) => t('sprint.durationValue', { value })}
        bestLabel={t('sprint.best')}
        bestValue={sprintBestResult.bestValue}
        onContentModeChange={(value) => saveModePracticeSettings('test', { contentMode: value })}
        onContentPackAction={handleContentPackAction}
        onDurationChange={(value) => saveModePracticeSettings('test', { sprintDurationSeconds: value })}
        onSelectedContentPackIdChange={(value) => saveModePracticeSettings('test', { selectedContentPackId: value })}
        selectedContentPack={selectedContentPack}
        selectedContentPackId={selectedContentPackControlId}
        selectedContentPackName={selectedContentPackDisplayName}
        selectedContentPackPreflight={selectedContentPackPreflight}
        selectedContentPackSummary={selectedContentPackSummary}
      />

      {session.active && (
        <InlineStatsBar
          items={[
            { id: 'timer', content: <><b>{timerValue.toFixed(timerValue >= 10 ? 0 : 1)}</b> {t('common.secondsShort')}</> },
            { id: 'speed', content: <><b>{fmtSpeed(wpm)}</b> <small className="speed-unit">{spdLabel}</small></> },
            { id: 'accuracy', content: <><b>{Math.round(acc)}</b>%</> },
          ]}
        />
      )}

      <ModeSessionStage
        text={session.active ? session.text : sprintText}
        pos={session.active ? session.pos : 0}
        errPositions={session.active ? session.errPositions : new Set()}
        waitingForSpace={waitingForSpace}
        overlay={showOverlay ? t('sprint.overlay', { start: t('sprint.start') }) : null}
        onOverlayClick={startSprint}
      />

      {result ? (
        <SprintResultFlow
          activeSprintGoals={activeSprintGoals}
          followupRecommendation={followupRecommendation}
          formatSpeed={fmtSpeed}
          onFollowupAction={handleFollowupAction}
          onRetry={retrySprint}
          onToPractice={() => switchMode('practice')}
          result={result}
          resultCallout={sprintCallout}
          speedLabel={spdLabel}
          sprintResultComparison={sprintResultComparison}
          sprintStreaks={sprintStreaks}
          t={t}
          trainingMaterialLabel={sprintTrainingMaterialLabel}
        />
      ) : null}
    </section>
  );
}
