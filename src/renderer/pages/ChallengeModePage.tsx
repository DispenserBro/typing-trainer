import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAppPractice, useAppSettings } from '../contexts/AppContext';
import { useTypingSession } from '../hooks/useTypingSession';
import { AchievementsModal } from '../components/AchievementsModal';
import { GameAchievementToastStack } from '../components/game/GameAchievementToastStack';
import { ChallengeResultFlow } from '../components/practice/ChallengeResultFlow';
import { ChallengeSettingsSection } from '../components/practice/ChallengeSettingsSection';
import { ModePageHeader } from '../components/practice/ModePageHeader';
import { ModeSessionStage } from '../components/practice/ModeSessionStage';
import { EMPTY_ERR_POSITIONS } from '../components/TextDisplay';
import { useI18n } from '../contexts/I18nContext';
import {
  getPracticeContentScenario,
} from '../../core/engine';
import {
  updateMotivationAfterPractice,
} from '../../core/motivation/progress';
import { useModeContentPackActions } from '../hooks/practice/useModeContentPackActions';
import { useModeAchievements } from '../hooks/practice/useModeAchievements';
import { useModeKeyboardStart } from '../hooks/practice/useModeKeyboardStart';
import { useModePreviewState } from '../hooks/practice/useModePreviewState';
import { useModeResultFollowup } from '../hooks/practice/useModeResultFollowup';
import { useModeBestResultLabel } from '../hooks/practice/useModeBestResultLabel';
import { buildChallengeResultCallout } from '../../core/practice/modeResultCallouts';
import {
  buildChallengeWordCount,
  getChallengeModeConfig,
  getChallengeTotalLives,
  resolveChallengeCompletion,
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
import { buildPracticeFamilyModeHeaderViewModel } from '../../core/practice/modePagePresentation';
import {
  buildChallengeModeStatusLabel,
  buildChallengeModeUi,
} from '../hooks/practice/challengeModeConfig';
import { InlineStatsBar } from '../components/ui/InlineStatsBar';
import type { Session } from '../../shared/types';
import { isPrintableKeyboardStartEvent } from '../keyboard/startEvent';

function ChallengeModePage({ initialFlawless = false }: { initialFlawless?: boolean }) {
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
    getPracticeState,
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
  const challengeModeSettings = getModePracticeSettings('survival');
  const flawlessEnabled = challengeModeSettings.flawlessEnabled ?? initialFlawless;
  const config = getChallengeModeConfig(flawlessEnabled);
  const scenario = getPracticeContentScenario(config.scenarioId, t);
  const challengeUi = buildChallengeModeUi(t, config.variant);
  const challengeHeader = buildPracticeFamilyModeHeaderViewModel(config.variant, t);
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
  const totalLives = getChallengeTotalLives(config);

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
    modeSettings: challengeModeSettings,
    practiceContentPacks,
    practiceSettings,
    scenarioId: config.scenarioId,
    t,
  });
  const {
    contentModeLabel: challengeContentModeLabel,
    trainingMaterialLabel: challengeTrainingMaterialLabel,
  } = useModeMaterialLabels(effectiveContentMode, 'survival.material', t);
  const challengeWordCount = useMemo(
    () => buildChallengeWordCount(scenario.targetWordCount, config.wordMultiplier),
    [config.wordMultiplier, scenario.targetWordCount],
  );
  const practiceInsights = getPracticeInsights();
  const practiceState = getPracticeState();
  const practiceBuildOptions = usePracticeBuildOptions(practiceSettings);
  const practiceBuildOptionsKey = buildPracticeBuildOptionsKey(practiceBuildOptions);

  const buildChallengeText = useModeContentTextBuilder({
    allWords: words,
    buildOptions: practiceBuildOptions,
    contentMode: effectiveContentMode,
    contentPack: selectedContentPack,
    insights: practiceInsights,
    ngramModel,
    scenarioId: config.scenarioId,
    unlockedChars,
    weakChar,
    wordCountOverride: challengeWordCount,
  });

  const onFinish = useCallback((wpm: number, acc: number, elapsed: number, ses: any) => {
    const today = new Date().toISOString().slice(0, 10);
    const completion = resolveChallengeCompletion({
      acc,
      config,
      contentMode: effectiveContentMode,
      elapsedSeconds: elapsed,
      goalSpeedCpm: practiceSettings.goalSpeedCpm || 150,
      practiceState,
      session: ses as Session,
      today,
      totalLives,
      wpm,
    });

    saveHistory('practice', wpm, acc, {
      contentScenarioId: completion.historyEntry.contentScenarioId,
      trainingMode: completion.historyEntry.trainingMode,
      contentMode: completion.historyEntry.contentMode,
      durationSeconds: completion.historyEntry.durationSeconds,
      passed: completion.historyEntry.passed,
      charStats: completion.historyEntry.charStats,
    });
    Object.assign(practiceState, completion.nextPracticeState);
    updateMotivationProgress(current => updateMotivationAfterPractice(current, completion.motivationEvent));
    setResult(completion.result);

    completion.achievementEvents.forEach(handleAchievementEvent);
  }, [
    config,
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

  const startChallenge = useCallback((initialEvent?: KeyboardEvent) => {
    if (session.active) return;
    const nextText = buildChallengeText();
    setChallengeText(nextText);
    setShowOverlay(false);
    setResult(null);
    start(nextText);
    if (isPrintableKeyboardStartEvent(initialEvent)) {
      handleKey(initialEvent);
    }
  }, [buildChallengeText, handleKey, session.active, start]);

  const retryChallenge = useCallback((initialEvent?: KeyboardEvent) => {
    stop();
    startChallenge(initialEvent);
  }, [startChallenge, stop]);

  const challengePreviewKey = buildModePreviewKey({
    buildOptionsKey: practiceBuildOptionsKey,
    contentMode: effectiveContentMode,
    currentLayout,
    materialKey: buildModeMaterialKey({ contentPack: selectedContentPack, words }),
    practiceUnlockOrder,
    scenarioId: config.scenarioId,
    selectedContentPackId: selectedContentPack?.id,
    unlockedCount: layoutProgress.unlocked,
    useYo,
    wordCount: challengeWordCount,
  });
  const {
    setText: setChallengeText,
    setShowOverlay,
    showOverlay,
    text: challengeText,
  } = useModePreviewState({
    buildText: buildChallengeText,
    enabled: !!layout && words.length > 0,
    onResultReset: () => setResult(null),
    previewKey: challengePreviewKey,
    sessionActive: session.active,
  });

  useModeKeyboardStart({
    handleKey,
    onRetry: retryChallenge,
    onStart: startChallenge,
    overlayVisible: showOverlay,
    previewText: challengeText,
    resultVisible: !!result,
    sessionActive: session.active,
  });

  const [, setTick] = useState(0);
  useEffect(() => {
    if (!session.active) return;
    const interval = setInterval(() => setTick(current => current + 1), 200);
    return () => clearInterval(interval);
  }, [session.active]);

  const {
    bestEntries: scenarioHistory,
    resultComparison,
  } = useModeResultHistory({
    contentMode: effectiveContentMode,
    currentLayout,
    historyByLayout: progress.history,
    mode: 'practice-scenario',
    result,
    scenarioId: config.scenarioId,
    t,
    trainingMode: 'normal',
  });
  const { activeGoals, activeStreaks } = useModeMotivationSnapshots(motivationProgress, t);
  const scenarioBestResult = useModeBestResultLabel({
    emptyLabel: t('survival.noResults'),
    entries: scenarioHistory,
    formatSpeed: fmtSpeed,
    speedLabel: spdLabel,
  });
  const livesLeft = Math.max(0, totalLives - session.errors);
  const currentLives = session.active ? livesLeft : totalLives;
  const modeStatusLabel = buildChallengeModeStatusLabel(t, config, currentLives);
  const challengeCallout = useMemo(
    () => result ? buildChallengeResultCallout(t, config.variant, result, resultComparison, totalLives) : null,
    [config.variant, result, resultComparison, t, totalLives],
  );
  const challengeFollowupResult = useMemo(() => result ? {
    mode: config.variant,
    wpm: result.wpm,
    acc: result.acc,
    passed: result.passed,
    errors: result.errors,
  } : null, [config.variant, result]);
  const { followupRecommendation, handleFollowupAction } = useModeResultFollowup({
    flawlessEnabledForSurvivalAction: config.variant === 'survival' && !!(result?.passed && result.acc >= 96),
    result: challengeFollowupResult,
    saveModePracticeSettings,
    switchMode,
    syncFlawlessOnSurvivalAction: true,
    t,
  });

  const handleContentPackAction = useModeContentPackActions({
    onShortenDistance: (pack) => {
      savePracticeSetting('contentMode', 'custom');
      savePracticeSetting('selectedContentPackId', pack.id);
      savePracticeSetting('trainingMode', 'rhythm');
      switchMode('practice');
    },
    saveModePracticeSettings,
    savePracticeSetting,
    selfMode: 'survival',
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
        categoryFilter="practice"
        onClose={() => setShowAchievements(false)}
      />

      <ModePageHeader
        title={challengeHeader.title}
        description={challengeHeader.description ?? challengeUi.description}
        extraDescription={challengeHeader.extraDescription ?? challengeUi.toggleDescription}
        achievementsLabel={challengeHeader.achievementsLabel}
        achievementsUnlocked={practiceUnlockedCount}
        achievementsTotal={practiceAchievementCatalog.length}
        onOpenAchievements={() => setShowAchievements(true)}
        onStart={() => startChallenge()}
        startDisabled={session.active}
        startLabel={challengeHeader.startLabel ?? challengeUi.startLabel}
      />

      <ChallengeSettingsSection
        actionsDisabled={session.active}
        availableContentPacks={availableContentPacks}
        bestLabel={challengeHeader.bestLabel ?? t('survival.best')}
        bestValue={scenarioBestResult.bestValue}
        checked={flawlessEnabled}
        contentMode={contentMode}
        contentModeLabel={challengeContentModeLabel}
        flawlessToggleLabel={t('survival.flawlessToggle')}
        modeStatusLabel={modeStatusLabel}
        onCheckedChange={(checked) => saveModePracticeSettings('survival', { flawlessEnabled: checked })}
        onContentModeChange={(value) => saveModePracticeSettings('survival', { contentMode: value })}
        onContentPackAction={handleContentPackAction}
        onSelectedContentPackIdChange={(value) => saveModePracticeSettings('survival', { selectedContentPackId: value })}
        selectedContentPack={selectedContentPack}
        selectedContentPackId={selectedContentPackControlId}
        selectedContentPackName={selectedContentPackDisplayName}
        selectedContentPackPreflight={selectedContentPackPreflight}
        selectedContentPackSummary={selectedContentPackSummary}
      />

      {session.active && (
        <InlineStatsBar
          compactItems={[
            { id: 'lives', value: livesLeft, label: `/ ${totalLives}` },
            { id: 'speed', value: fmtSpeed(wpm), detail: spdLabel },
            { id: 'accuracy', value: Math.round(acc), label: '%' },
            { id: 'progress', value: session.text.length > 0 ? Math.round((session.pos / session.text.length) * 100) : 0, label: '%' },
          ]}
        />
      )}

      <ModeSessionStage
        text={session.active ? session.text : challengeText}
        pos={session.active ? session.pos : 0}
        errPositions={session.active ? session.errPositions : EMPTY_ERR_POSITIONS}
        waitingForSpace={waitingForSpace}
        overlay={showOverlay ? t('survival.overlay', { start: challengeUi.startLabel }) : null}
        onOverlayClick={startChallenge}
      />

      {result ? (
        <ChallengeResultFlow
          activeGoals={activeGoals}
          activeStreaks={activeStreaks}
          allowedErrors={config.allowedErrors}
          attemptReserveLabel={t('survival.attemptReserve')}
          challengeCallout={challengeCallout}
          failureTitle={challengeUi.failureTitle}
          followupRecommendation={followupRecommendation}
          formatSpeed={fmtSpeed}
          livesLeftLabel={t('survival.livesLeft')}
          onFollowupAction={handleFollowupAction}
          onRetry={() => retryChallenge()}
          onToPractice={() => switchMode('practice')}
          result={result}
          resultComparison={resultComparison}
          speedLabel={spdLabel}
          successTitle={challengeUi.successTitle}
          t={t}
          trainingMaterialLabel={challengeTrainingMaterialLabel}
        />
      ) : null}
    </section>
  );
}

export function SurvivalPage({ initialFlawless = false }: { initialFlawless?: boolean }) {
  return <ChallengeModePage initialFlawless={initialFlawless} />;
}
