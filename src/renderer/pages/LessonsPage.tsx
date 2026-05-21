import { useState, useCallback, useEffect, useMemo } from 'react';
import { Medal } from 'lucide-react';
import { useAppPractice, useAppSettings } from '../contexts/AppContext';
import { useI18n } from '../contexts/I18nContext';
import { useTypingSession } from '../hooks/useTypingSession';
import {
  generateLessonExerciseText,
  EXERCISE_COUNT,
} from '../../core/lessons/engine';
import type { Lesson } from '../../shared/types';
import { LessonsDetailView } from '../components/lessons/LessonsDetailView';
import { LessonsExerciseView } from '../components/lessons/LessonsExerciseView';
import { LessonsListView } from '../components/lessons/LessonsListView';
import { resolveLesson } from '../../core/lessons/utils';
import {
  applyLessonExerciseCompletion,
  buildLessonNavigationModel,
  buildLessonsSectionModel,
  isLessonUnlocked,
} from '../../core/lessons/viewModel';
import { AchievementsModal } from '../components/AchievementsModal';
import { GameAchievementToastStack } from '../components/game/GameAchievementToastStack';
import { AchievementCounterButton } from '../components/ui/AchievementCounterButton';
import type { GameAchievementDefinition } from '../../shared/types';
import { checkAchievements, type AchievementEvent } from '../../core/achievements/achievementEngine';
import {
  formatLessonKeys,
  getLessonsSectionLabel,
  getLocalizedExerciseNamesForLesson,
  getLocalizedLessonFocusLabel,
} from '../components/lessons/lessonText';
import { isPrintableKeyboardStartEvent } from '../keyboard/startEvent';

/* ═══════════════════════════════════════════════════════ */
export function LessonsPage() {
  const { t } = useI18n();
  const { layouts, ngramModel, progress, fmtSpeed, spdLabel,
    saveHistory, saveProgress, gameAchievementCatalog, unlockedAchievementIds, unlockAchievements, emitModEvent } = useAppPractice();
  const { currentLayout, currentLanguage, settings } = useAppSettings();

  const [showAchievements, setShowAchievements] = useState(false);
  const [achievementToasts, setAchievementToasts] = useState<GameAchievementDefinition[]>([]);

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

  const lessonsAchievementCatalog = useMemo(
    () => gameAchievementCatalog.filter(a => (a.category ?? 'game') === 'lessons'),
    [gameAchievementCatalog],
  );
  const lessonsUnlockedCount = useMemo(
    () => lessonsAchievementCatalog.filter(a => unlockedAchievementIds.includes(a.id)).length,
    [lessonsAchievementCatalog, unlockedAchievementIds],
  );

  const useYo = settings.useYo;
  const layout = layouts.layouts[currentLayout];
  const lessons = layout?.lessonOrder ?? [];
  const lessonsSectionModel = useMemo(() => buildLessonsSectionModel({
    exerciseCount: EXERCISE_COUNT,
    getSectionLabel: (section) => getLessonsSectionLabel(section, t),
    lessons,
    rawProgress: progress.lessons?.[currentLayout],
  }), [currentLayout, lessons, progress.lessons, t]);
  const { lessonsDone } = lessonsSectionModel;
  const getSectionUnlockState = useCallback(
    (lessonIndex: number) => isLessonUnlocked(lessonsSectionModel, lessonIndex),
    [lessonsSectionModel],
  );

  /* ─── State: which lesson & exercise are open ────── */
  const [activeLesson, setActiveLesson] = useState<number | null>(null);
  const [activeExercise, setActiveExercise] = useState<number | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [bigramSets, setBigramSets] = useState<Record<string, string[]>>({});

  /* ─── Exercise typing state ──────────────────────── */
  const [exerciseText, setExerciseText] = useState('');
  const [showOverlay, setShowOverlay] = useState(false);
  const [result, setResult] = useState<{ wpm: number; acc: number; passed: boolean } | null>(null);

  const resolveCurrentLesson = useCallback((lesson: Lesson | null | undefined): Lesson | null => (
    resolveLesson(lesson, bigramSets, layout, useYo)
  ), [bigramSets, layout, useYo]);

  const onFinish = useCallback((wpm: number, _acc: number, _elapsed: number, ses: any) => {
    const acc = _acc;
    if (activeLesson === null || activeExercise === null) return;
    const passed = acc >= 80;
    if (passed) {
      const completion = applyLessonExerciseCompletion({
        exerciseCount: EXERCISE_COUNT,
        exerciseIndex: activeExercise,
        getSectionLabel: (section) => getLessonsSectionLabel(section, t),
        lessonIndex: activeLesson,
        lessons,
        rawProgress: progress.lessons?.[currentLayout],
      });
      if (completion.updated) {
        saveProgress({
          ...progress,
          lessons: {
            ...(progress.lessons ?? {}),
            [currentLayout]: completion.doneByLesson,
          },
        });
      }

      handleAchievementEvent({ type: 'lessons.exerciseCompleted' });

      if (completion.lessonCompleted) {
        handleAchievementEvent({ type: 'lessons.lessonCompleted' });
        const completedLesson = lessons[activeLesson];
        if (completedLesson) {
          emitModEvent('lessonComplete', {
            layoutId: currentLayout,
            lessonId: completedLesson.id,
            lessonName: completedLesson.name,
            lessonIndex: activeLesson,
            section: completedLesson.section ?? null,
            sectionCompleted: completion.sectionCompleted,
            allCompleted: completion.allCompleted,
          });
        }
        if (completion.sectionCompleted) {
          handleAchievementEvent({ type: 'lessons.sectionCompleted' });
        }
        if (completion.allCompleted) {
          handleAchievementEvent({ type: 'lessons.allCompleted' });
        }
      }
    }
    saveHistory('lesson', wpm, acc, { charStats: ses?.charStats });
    setResult({ wpm, acc, passed });
  }, [activeLesson, activeExercise, currentLayout, emitModEvent, progress, saveProgress, saveHistory, handleAchievementEvent, lessons, t]);

  const { session, start, stop, handleKey, wpm, acc, waitingForSpace } = useTypingSession({
    mode: 'lesson', onFinish,
  });

  /* ─── Actions ────────────────────────────────────── */
  const openLesson = useCallback((idx: number) => {
    stop();
    setActiveLesson(idx);
    setActiveExercise(null);
    setResult(null);
    setShowOverlay(false);
  }, [stop]);

  const openExercise = useCallback((exIdx: number) => {
    if (activeLesson === null) return;
    const les = resolveCurrentLesson(lessons[activeLesson]);
    if (!les) return;
    let keys = les.keys;
    if (les.type !== 'row' && les.type !== 'bigrams') {
      // Keep classic cumulative behavior for finger lessons.
      let cumulative: string[] = [];
      for (let i = 0; i <= activeLesson; i++) {
        cumulative.push(...(resolveCurrentLesson(lessons[i])?.keys ?? []));
      }
      keys = cumulative;
    }
    const normalizedLesson: Lesson = {
      ...les,
      keys,
    };
    const text = generateLessonExerciseText(normalizedLesson, layout, exIdx, 20, ngramModel ?? undefined);
    setActiveExercise(exIdx);
    setExerciseText(text);
    setShowOverlay(true);
    setResult(null);
  }, [activeLesson, lessons, layout, ngramModel, resolveCurrentLesson]);

  const startExercise = useCallback((initialEvent?: KeyboardEvent) => {
    if (!exerciseText) return;
    setShowOverlay(false);
    start(exerciseText, activeLesson ?? -1);
    if (isPrintableKeyboardStartEvent(initialEvent)) {
      handleKey(initialEvent);
    }
  }, [exerciseText, activeLesson, handleKey, start]);

  const retryExercise = useCallback(() => {
    if (activeLesson === null || activeExercise === null) return;
    openExercise(activeExercise);
  }, [activeLesson, activeExercise, openExercise]);

  const nextExercise = useCallback(() => {
    if (activeExercise === null) return;
    if (activeExercise + 1 < EXERCISE_COUNT) {
      openExercise(activeExercise + 1);
    } else {
      // all done — back to lesson list
      setActiveLesson(null);
      setActiveExercise(null);
    }
  }, [activeExercise, openExercise]);

  const goBack = useCallback(() => {
    stop();
    if (activeExercise !== null) {
      setActiveExercise(null);
      setResult(null);
      setShowOverlay(false);
    } else {
      setActiveLesson(null);
    }
  }, [stop, activeExercise]);

  const toggleSection = useCallback((section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    window.api.getLessonBigrams(currentLanguage)
      .then((sets) => {
        if (!cancelled) setBigramSets(sets ?? {});
      })
      .catch(() => {
        if (!cancelled) setBigramSets({});
      });
    return () => { cancelled = true; };
  }, [currentLanguage]);

  /* ─── Keyboard ────────────────────────────────────── */
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isPrintable = event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey;
      const isBackspace = event.key === 'Backspace';

      if (!session.active && showOverlay && activeLesson !== null && activeExercise !== null && exerciseText && isPrintable) {
        event.preventDefault();
        startExercise(event);
        return;
      }

      if (!session.active) return;
      if (isPrintable || isBackspace) handleKey(event);
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeExercise, activeLesson, exerciseText, handleKey, session.active, showOverlay, startExercise]);

  // live tick
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!session.active) return;
    const iv = setInterval(() => setTick(t => t + 1), 200);
    return () => clearInterval(iv);
  }, [session.active]);

  const openSiblingLesson = useCallback((lessonIndex: number | null) => {
    if (lessonIndex === null) return;
    stop();
    setActiveLesson(lessonIndex);
    setActiveExercise(null);
    setExerciseText('');
    setShowOverlay(false);
    setResult(null);
  }, [stop]);

  /* ─── Current lesson's keys for header display ──── */
  const lessonKeys = activeLesson !== null
    ? (resolveCurrentLesson(lessons[activeLesson])?.keys ?? [])
    : [];
  const activeLessonData = activeLesson !== null ? resolveCurrentLesson(lessons[activeLesson]) : null;
  const activeLessonExerciseNames = activeLessonData ? getLocalizedExerciseNamesForLesson(activeLessonData, t) : null;
  const activeLessonSection = activeLessonData ? getLessonsSectionLabel(activeLessonData.section, t) : null;
  const lessonNavigation = useMemo(() => buildLessonNavigationModel({
    activeLesson,
    activeLessonSection,
    model: lessonsSectionModel,
  }), [activeLesson, activeLessonSection, lessonsSectionModel]);
  const {
    activeSectionLessonIndexes,
    activeSectionPosition,
    canOpenNextLesson,
    canOpenPrevLesson,
    nextLessonInSection,
    nextLessonTarget,
    nextSectionFirstLesson,
    prevLessonInSection,
  } = lessonNavigation;
  const nextLessonTargetLabel = nextLessonInSection !== null
    ? t('lessons.nextLesson')
    : nextSectionFirstLesson !== null
      ? t('lessons.nextSection')
      : t('lessons.done');

  /* ═══════════════════════════════════════════════════
     VIEW: Active exercise (typing)
     ═══════════════════════════════════════════════════ */
  const renderView = () => {
    if (activeLesson !== null && activeExercise !== null) {
      return (
        <LessonsExerciseView
          title={`${activeLessonData?.name ?? formatLessonKeys(lessonKeys, t)} — ${activeLessonExerciseNames?.[activeExercise] ?? ''}`}
          subtitle={activeLessonData?.description ?? null}
          focusLabel={getLocalizedLessonFocusLabel(activeLessonData, lessonKeys, t)}
          currentSpeed={fmtSpeed(wpm)}
          resultSpeed={result ? fmtSpeed(result.wpm) : fmtSpeed(wpm)}
          speedUnit={spdLabel}
          currentAccuracy={acc}
          sessionActive={session.active}
          sessionText={session.text}
          sessionPos={session.pos}
          sessionErrPositions={session.errPositions}
          exerciseText={exerciseText}
          waitingForSpace={waitingForSpace}
          showOverlay={showOverlay}
          result={result}
          hasNextExercise={activeExercise + 1 < EXERCISE_COUNT}
          hasNextLessonTarget={nextLessonTarget !== null}
          nextLessonTargetLabel={nextLessonTargetLabel}
          onOverlayClick={startExercise}
          onRetry={retryExercise}
          onNextExercise={nextExercise}
          onOpenNextLesson={() => openSiblingLesson(nextLessonTarget)}
          onDone={() => { setActiveLesson(null); setActiveExercise(null); }}
          onBack={goBack}
        />
      );
    }

    if (activeLesson !== null) {
      const done = lessonsDone[activeLesson] ?? 0;
      return (
        <LessonsDetailView
          title={activeLessonData?.name ?? formatLessonKeys(lessonKeys, t)}
          subtitle={activeLessonData?.description ?? getLessonsSectionLabel(activeLessonData?.section, t)}
          sectionTitle={activeLessonSection}
          sectionPosition={activeSectionPosition}
          sectionCount={activeSectionLessonIndexes.length}
          focusLabel={getLocalizedLessonFocusLabel(activeLessonData, lessonKeys, t)}
          exerciseNames={activeLessonExerciseNames}
          done={done}
          nextLessonTargetLabel={nextLessonTargetLabel}
          hasPrevLesson={canOpenPrevLesson}
          hasNextLesson={canOpenNextLesson}
          onOpenExercise={openExercise}
          onOpenPrevLesson={() => openSiblingLesson(prevLessonInSection)}
          onOpenNextLesson={() => openSiblingLesson(nextLessonTarget)}
          onBack={goBack}
        />
      );
    }

    return (
      <LessonsListView
        lessons={lessons}
        lessonsDone={lessonsDone}
        collapsedSections={collapsedSections}
        onToggleSection={toggleSection}
        onOpenLesson={openLesson}
        sectionLabel={(section) => getLessonsSectionLabel(section, t)}
        lessonFocusLabel={(lesson, fallbackKeys) => getLocalizedLessonFocusLabel(lesson, fallbackKeys, t)}
        resolveLessonAtIndex={(index) => resolveCurrentLesson(lessons[index])}
        getSectionUnlockState={getSectionUnlockState}
        exerciseCount={EXERCISE_COUNT}
        headerRight={
          <AchievementCounterButton
            icon={<Medal size={14} />}
            onClick={() => setShowAchievements(true)}
            total={lessonsAchievementCatalog.length}
            unlocked={lessonsUnlockedCount}
          >
            {t('lessons.achievements')}
          </AchievementCounterButton>
        }
      />
    );
  };

  return (
    <>
      {renderView()}
      <GameAchievementToastStack achievements={achievementToasts} onRemove={handleRemoveToast} />
      <AchievementsModal
        open={showAchievements}
        achievementCatalog={gameAchievementCatalog}
        unlockedAchievementIds={unlockedAchievementIds}
        categoryFilter="lessons"
        onClose={() => setShowAchievements(false)}
      />
    </>
  );
}
