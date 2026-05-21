import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAppPractice, useAppSettings } from '../contexts/AppContext';
import { useTypingSession } from '../hooks/useTypingSession';
import { AchievementsModal } from '../components/AchievementsModal';
import { GameAchievementToastStack } from '../components/game/GameAchievementToastStack';
import { ModePageHeader } from '../components/practice/ModePageHeader';
import { ModeSessionStage } from '../components/practice/ModeSessionStage';
import { EMPTY_ERR_POSITIONS } from '../components/TextDisplay';
import { SprintResultFlow } from '../components/practice/SprintResultFlow';
import { SprintSettingsSection } from '../components/practice/SprintSettingsSection';
import { useI18n } from '../contexts/I18nContext';
import {
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
import { buildSprintResultCallout } from '../../core/practice/modeResultCallouts';
import { buildPracticeFamilyModeHeaderViewModel } from '../../core/practice/modePagePresentation';
import {
  buildSprintWordCount,
  resolveSprintCompletion,
} from '../../core/practice/modeCompletion';
import {
  buildPracticeBuildOptionsKey,
  usePracticeBuildOptions,
} from '../hooks/practice/usePracticeBuildOptions';
import { useModeContentPackSelection } from '../hooks/practice/useModeContentPackSelection';
import { useModeContentTextBuilder } from '../hooks/practice/useModeContentTextBuilder';
import { useModeMotivationSnapshots } from '../hooks/practice/useModeMotivationSnapshots';
import { useModeTextInputs } from '../hooks/practice/useModeTextInputs';
import { buildModeMaterialKey, buildModePreviewKey } from '../hooks/practice/modePreviewKey';
import { useModeResultHistory } from '../hooks/practice/useModeResultHistory';
import { useModeMaterialLabels } from '../hooks/practice/useModeMaterialLabels';
import { InlineStatsBar } from '../components/ui/InlineStatsBar';
import type { Session } from '../../shared/types';
import { isPrintableKeyboardStartEvent } from '../keyboard/startEvent';

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
  const sprintHeader = buildPracticeFamilyModeHeaderViewModel('sprint', t);

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

  const buildSprintText = useModeContentTextBuilder({
    allWords: words,
    buildOptions: practiceBuildOptions,
    contentMode: effectiveContentMode,
    contentPack: selectedContentPack,
    insights: practiceInsights,
    ngramModel,
    scenarioId: 'sprint',
    unlockedChars,
    weakChar,
    wordCountOverride: sprintWordCount,
  });

  const onFinish = useCallback((wpm: number, acc: number, elapsed: number, ses: any) => {
    const completion = resolveSprintCompletion({
      acc,
      contentMode: effectiveContentMode,
      elapsedSeconds: elapsed,
      goalSpeedCpm: practiceSettings.goalSpeedCpm || 150,
      session: ses as Session,
      wpm,
    });
    saveHistory('test', wpm, acc, {
      contentScenarioId: completion.historyEntry.contentScenarioId,
      trainingMode: completion.historyEntry.trainingMode,
      contentMode: completion.historyEntry.contentMode,
      durationSeconds: completion.historyEntry.durationSeconds,
      charStats: completion.historyEntry.charStats,
    });
    updateMotivationProgress(current => updateMotivationAfterPractice(current, completion.motivationEvent));
    setResult(completion.result);

    completion.achievementEvents.forEach(handleAchievementEvent);
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

  const startSprint = useCallback((initialEvent?: KeyboardEvent) => {
    if (session.active) return;
    const nextText = buildSprintText();
    setSprintText(nextText);
    setShowOverlay(false);
    setResult(null);
    setTimerValue(duration);
    start(nextText);
    if (isPrintableKeyboardStartEvent(initialEvent)) {
      handleKey(initialEvent);
    }
  }, [buildSprintText, duration, handleKey, session.active, start]);

  const retrySprint = useCallback((initialEvent?: KeyboardEvent) => {
    stop();
    startSprint(initialEvent);
  }, [startSprint, stop]);

  const sprintPreviewKey = buildModePreviewKey({
    buildOptionsKey: practiceBuildOptionsKey,
    contentMode: effectiveContentMode,
    currentLayout,
    materialKey: buildModeMaterialKey({ contentPack: selectedContentPack, words }),
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
    onRetry: retrySprint,
    onStart: startSprint,
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
  const sprintFollowupResult = useMemo(() => result ? {
    mode: 'test' as const,
    wpm: result.wpm,
    acc: result.acc,
    errors: result.errors,
  } : null, [result]);
  const { followupRecommendation, handleFollowupAction } = useModeResultFollowup({
    result: sprintFollowupResult,
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
        title={sprintHeader.title}
        description={sprintHeader.description ?? ''}
        achievementsLabel={sprintHeader.achievementsLabel}
        achievementsUnlocked={sprintUnlockedCount}
        achievementsTotal={sprintAchievementCatalog.length}
        onOpenAchievements={() => setShowAchievements(true)}
        onStart={startSprint}
        startDisabled={session.active}
        startLabel={sprintHeader.startLabel ?? t('sprint.start')}
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
        bestLabel={sprintHeader.bestLabel ?? t('sprint.best')}
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
          compactItems={[
            { id: 'timer', value: timerValue.toFixed(timerValue >= 10 ? 0 : 1), label: t('common.secondsShort') },
            { id: 'speed', value: fmtSpeed(wpm), detail: spdLabel },
            { id: 'accuracy', value: Math.round(acc), label: '%' },
          ]}
        />
      )}

      <ModeSessionStage
        text={session.active ? session.text : sprintText}
        pos={session.active ? session.pos : 0}
        errPositions={session.active ? session.errPositions : EMPTY_ERR_POSITIONS}
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
