import { useState, useCallback, useEffect, useMemo } from 'react';
import { Medal } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useTypingSession } from '../hooks/useTypingSession';
import {
  generateLessonExerciseText,
  getExerciseNamesForLesson,
  EXERCISE_COUNT,
} from '../../core/engine';
import type { Lesson } from '../../shared/types';
import { LessonsDetailView } from '../components/lessons/LessonsDetailView';
import { LessonsExerciseView } from '../components/lessons/LessonsExerciseView';
import { LessonsListView } from '../components/lessons/LessonsListView';
import { getLessonFocusLabel, keysLabel, resolveLesson, sectionLabel } from '../../core/lessons/utils';
import { AchievementsModal } from '../components/AchievementsModal';
import { GameAchievementToastStack } from '../components/game/GameAchievementToastStack';
import type { GameAchievementDefinition } from '../../shared/types';
import { checkAchievements, type AchievementEvent } from '../../core/achievements/achievementEngine';

/* ═══════════════════════════════════════════════════════ */
export function LessonsPage() {
  const { layouts, currentLayout, ngramModel, settings, progress, fmtSpeed, spdLabel,
    saveHistory, saveProgress, currentLanguage, gameAchievementCatalog, unlockedAchievementIds, unlockAchievements } = useApp();

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
  const lessonsBySection = useMemo(() => {
    const groups = new Map<string, number[]>();
    lessons.forEach((lesson, index) => {
      const section = sectionLabel(lesson.section);
      const current = groups.get(section) ?? [];
      current.push(index);
      groups.set(section, current);
    });
    return groups;
  }, [lessons]);
  const lessonSections = useMemo(
    () => Array.from(new Set(lessons.map(lesson => sectionLabel(lesson.section)))),
    [lessons],
  );

  /* lesson progress: number of completed exercises per lesson (0..5) */
  const lessonsDone: Record<number, number> = useMemo(() => {
    const raw = progress.lessons?.[currentLayout] || {};
    const out: Record<number, number> = {};
    for (const [k, v] of Object.entries(raw)) {
      // Back-compat: old boolean true → treat as all 5 done
      out[Number(k)] = typeof v === 'number' ? v : (v ? EXERCISE_COUNT : 0);
    }
    return out;
  }, [progress, currentLayout]);
  const getSectionUnlockState = useCallback((lessonIndex: number) => {
    const lesson = lessons[lessonIndex];
    const section = sectionLabel(lesson?.section);
    const sectionIndexes = lessonsBySection.get(section) ?? [];
    const sectionPosition = sectionIndexes.indexOf(lessonIndex);
    if (sectionPosition <= 0) return true;
    const previousLessonIndex = sectionIndexes[sectionPosition - 1];
    return (lessonsDone[previousLessonIndex] ?? 0) >= EXERCISE_COUNT;
  }, [lessons, lessonsBySection, lessonsDone]);

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
      if (!progress.lessons) progress.lessons = {};
      if (!progress.lessons[currentLayout]) progress.lessons[currentLayout] = {};
      const prev = progress.lessons[currentLayout][activeLesson] ?? 0;
      const prevNum = typeof prev === 'number' ? prev : (prev ? EXERCISE_COUNT : 0);
      if (activeExercise + 1 > prevNum) {
        progress.lessons[currentLayout][activeLesson] = activeExercise + 1;
      }
      saveProgress(progress);
      
      handleAchievementEvent({ type: 'lessons.exerciseCompleted' });

      // check if lesson completed
      if (activeExercise + 1 >= EXERCISE_COUNT && (prevNum < EXERCISE_COUNT)) {
         handleAchievementEvent({ type: 'lessons.lessonCompleted' });

         // check if current section is fully completed
         const lesson = lessons[activeLesson];
         if (lesson) {
           const section = sectionLabel(lesson.section);
           const sectionIndexes = lessonsBySection.get(section) ?? [];
           const sectionDone = sectionIndexes.every(idx => {
             if (idx === activeLesson) return true; // just completed
             const done = progress.lessons?.[currentLayout]?.[idx];
             const count = typeof done === 'number' ? done : (done ? EXERCISE_COUNT : 0);
             return count >= EXERCISE_COUNT;
           });
           if (sectionDone) {
             handleAchievementEvent({ type: 'lessons.sectionCompleted' });
           }
         }
         
         // check if all lessons completed
         const currentDoneCount = Object.values(progress.lessons[currentLayout]).filter(done => {
           const count = typeof done === 'number' ? done : (done ? EXERCISE_COUNT : 0);
           return count >= EXERCISE_COUNT;
         }).length;
         if (currentDoneCount >= lessons.length) {
            handleAchievementEvent({ type: 'lessons.allCompleted' });
         }
      }
    }
    saveHistory('lesson', wpm, acc, { charStats: ses?.charStats });
    setResult({ wpm, acc, passed });
  }, [activeLesson, activeExercise, currentLayout, progress, saveProgress, saveHistory, handleAchievementEvent, lessons, lessonsBySection]);

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

  const startExercise = useCallback(() => {
    if (!exerciseText) return;
    setShowOverlay(false);
    start(exerciseText, activeLesson ?? -1);
  }, [exerciseText, activeLesson, start]);

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
    if (!session.active) return;
    const handler = (e: KeyboardEvent) => handleKey(e);
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [session.active, handleKey]);

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
  const activeLessonExerciseNames = activeLessonData ? getExerciseNamesForLesson(activeLessonData) : null;
  const activeLessonSection = activeLessonData ? sectionLabel(activeLessonData.section) : null;
  const activeSectionLessonIndexes = useMemo(
    () => (activeLessonSection ? (lessonsBySection.get(activeLessonSection) ?? []) : []),
    [activeLessonSection, lessonsBySection],
  );
  const activeSectionPosition = useMemo(
    () => (activeLesson !== null ? activeSectionLessonIndexes.indexOf(activeLesson) : -1),
    [activeLesson, activeSectionLessonIndexes],
  );
  const prevLessonInSection = activeSectionPosition > 0 ? activeSectionLessonIndexes[activeSectionPosition - 1] : null;
  const nextLessonInSection = activeSectionPosition >= 0 && activeSectionPosition + 1 < activeSectionLessonIndexes.length
    ? activeSectionLessonIndexes[activeSectionPosition + 1]
    : null;
  const activeSectionIndex = useMemo(
    () => (activeLessonSection ? lessonSections.indexOf(activeLessonSection) : -1),
    [activeLessonSection, lessonSections],
  );
  const nextSectionFirstLesson = useMemo(() => {
    if (activeSectionIndex < 0 || activeSectionIndex + 1 >= lessonSections.length) return null;
    const nextSection = lessonSections[activeSectionIndex + 1];
    const nextSectionLessons = lessonsBySection.get(nextSection) ?? [];
    return nextSectionLessons[0] ?? null;
  }, [activeSectionIndex, lessonSections, lessonsBySection]);
  const nextLessonTarget = nextLessonInSection ?? nextSectionFirstLesson;
  const nextLessonTargetLabel = nextLessonInSection !== null
    ? 'Следующий урок'
    : nextSectionFirstLesson !== null
      ? 'Следующая секция'
      : 'Готово';

  /* ═══════════════════════════════════════════════════
     VIEW: Active exercise (typing)
     ═══════════════════════════════════════════════════ */
  const renderView = () => {
    if (activeLesson !== null && activeExercise !== null) {
      return (
        <LessonsExerciseView
          title={`${activeLessonData?.name ?? keysLabel(lessonKeys)} — ${activeLessonExerciseNames?.[activeExercise] ?? ''}`}
          subtitle={activeLessonData?.description ?? null}
          focusLabel={getLessonFocusLabel(activeLessonData, lessonKeys)}
          currentSpeed={fmtSpeed(wpm)}
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
          title={activeLessonData?.name ?? keysLabel(lessonKeys)}
          subtitle={activeLessonData?.description ?? sectionLabel(activeLessonData?.section)}
          sectionTitle={activeLessonSection}
          sectionPosition={activeSectionPosition}
          sectionCount={activeSectionLessonIndexes.length}
          focusLabel={getLessonFocusLabel(activeLessonData, lessonKeys)}
          exerciseNames={activeLessonExerciseNames}
          done={done}
          nextLessonTargetLabel={nextLessonTargetLabel}
          hasPrevLesson={prevLessonInSection !== null}
          hasNextLesson={nextLessonTarget !== null}
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
        sectionLabel={sectionLabel}
        lessonFocusLabel={getLessonFocusLabel}
        resolveLessonAtIndex={(index) => resolveCurrentLesson(lessons[index])}
        getSectionUnlockState={getSectionUnlockState}
        exerciseCount={EXERCISE_COUNT}
        headerRight={
          <button
            type="button"
            className="btn-secondary btn-sm game-achievements-button"
            onClick={() => setShowAchievements(true)}
          >
            <Medal size={14} />
            Достижения
            <span className="game-achievements-count">{lessonsUnlockedCount}/{lessonsAchievementCatalog.length}</span>
          </button>
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


