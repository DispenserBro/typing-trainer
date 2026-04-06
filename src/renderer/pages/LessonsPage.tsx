import { Fragment, useState, useCallback, useEffect, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useTypingSession } from '../hooks/useTypingSession';
import { TextDisplay } from '../components/TextDisplay';
import {
  generateLessonExerciseText,
  getExerciseNamesForLesson,
  getLessonKeys,
  EXERCISE_COUNT,
  filterYoKeys,
} from '../engine';
import { Check, Play, ArrowLeft, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import type { FingerName, Lesson } from '../../shared/types';

/* ─── helpers ────────────────────────────────────────── */
function keysLabel(keys: string[]): string {
  if (keys.length <= 2) return keys.map(k => k.toUpperCase()).join(' и ');
  return keys.slice(0, -1).map(k => k.toUpperCase()).join(', ')
    + ' и ' + keys[keys.length - 1].toUpperCase();
}

function sectionLabel(section?: string): string {
  return section ?? 'Уроки';
}

const LESSON_ROW_LABELS = {
  top: 'верхний ряд',
  middle: 'домашний ряд',
  bottom: 'нижний ряд',
} as const;

const LESSON_FINGER_LABELS: Record<FingerName, string> = {
  index_left: 'левый указательный',
  index_right: 'правый указательный',
  middle_left: 'левый средний',
  middle_right: 'правый средний',
  ring_left: 'левый безымянный',
  ring_right: 'правый безымянный',
  pinky_left: 'левый мизинец',
  pinky_right: 'правый мизинец',
};

/* ═══════════════════════════════════════════════════════ */
export function LessonsPage() {
  const { layouts, currentLayout, ngramModel, settings, progress, fmtSpeed, spdLabel,
    saveHistory, saveProgress, currentLanguage } = useApp();

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

  const resolveLesson = useCallback((lesson: Lesson | null | undefined): Lesson | null => {
    if (!lesson) return null;
    const resolvedBigrams = lesson.bigramSet
      ? (bigramSets[lesson.bigramSet] ?? lesson.bigrams ?? [])
      : (lesson.bigrams ?? []);
    const withBigrams: Lesson = {
      ...lesson,
      bigrams: resolvedBigrams,
    };
    return {
      ...withBigrams,
      keys: filterYoKeys(getLessonKeys(withBigrams, layout), useYo),
    };
  }, [bigramSets, layout, useYo]);

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
    }
    saveHistory('lesson', wpm, acc, { charStats: ses?.charStats });
    setResult({ wpm, acc, passed });
  }, [activeLesson, activeExercise, currentLayout, progress, saveProgress, saveHistory]);

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
    const les = resolveLesson(lessons[activeLesson]);
    if (!les) return;
    let keys = les.keys;
    if (les.type !== 'row' && les.type !== 'bigrams') {
      // Keep classic cumulative behavior for finger lessons.
      let cumulative: string[] = [];
      for (let i = 0; i <= activeLesson; i++) {
        cumulative.push(...(resolveLesson(lessons[i])?.keys ?? []));
      }
      keys = cumulative;
    }
    const normalizedLesson: Lesson = {
      ...les,
      keys: filterYoKeys(keys, useYo),
    };
    const text = generateLessonExerciseText(normalizedLesson, layout, exIdx, 20, ngramModel ?? undefined);
    setActiveExercise(exIdx);
    setExerciseText(text);
    setShowOverlay(true);
    setResult(null);
  }, [activeLesson, lessons, useYo, layout, ngramModel, resolveLesson]);

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

  const lessonFocusLabel = useCallback((lesson: Lesson | null, fallbackKeys?: string[]) => {
    if (!lesson) return '';
    if (lesson.type === 'bigrams' && lesson.bigrams?.length) {
      return lesson.bigrams.join(' · ');
    }
    if (lesson.type === 'transitions') {
      if (lesson.transitionRows?.length) {
        return lesson.transitionRows.map(row => LESSON_ROW_LABELS[row]).join(' ⇄ ');
      }
      if (lesson.focusFingers?.length) {
        return lesson.focusFingers.map(finger => LESSON_FINGER_LABELS[finger]).join(' ⇄ ');
      }
    }
    return keysLabel(fallbackKeys ?? lesson.keys);
  }, []);

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
    ? (resolveLesson(lessons[activeLesson])?.keys ?? [])
    : [];
  const activeLessonData = activeLesson !== null ? resolveLesson(lessons[activeLesson]) : null;
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
  if (activeLesson !== null && activeExercise !== null) {
    return (
      <section className="mode-panel active">
        <div className="panel-header"><h1>Уроки</h1></div>
        <h3 className="lesson-active-title">
          {activeLessonData?.name ?? keysLabel(lessonKeys)} — {activeLessonExerciseNames?.[activeExercise] ?? ''}
        </h3>
        {activeLessonData?.description && (
          <p className="lesson-active-subtitle">
            {activeLessonData.description}
          </p>
        )}
        <p className="lesson-active-keys">{lessonFocusLabel(activeLessonData, lessonKeys)}</p>
        <div className="stats-bar">
          <div className="metric"><b>{fmtSpeed(wpm)}</b> <small className="speed-unit">{spdLabel}</small></div>
          <div className="metric"><b>{Math.round(acc)}</b>%</div>
        </div>
        <TextDisplay
          text={session.active ? session.text : exerciseText}
          pos={session.active ? session.pos : 0}
          errPositions={session.active ? session.errPositions : new Set()}
          waitingForSpace={waitingForSpace}
          overlay={showOverlay && !session.active && !result ? 'Нажмите здесь, чтобы начать' : null}
          onOverlayClick={startExercise}
        />
        {result && (
          <div className="result-card">
            <h3>Упражнение завершено!</h3>
            <div className="result-big">{fmtSpeed(result.wpm)} {spdLabel}</div>
            <p>Точность: <b>{Math.round(result.acc)}%</b></p>
            <p>{result.passed
              ? <span style={{ color: 'var(--green)' }}><Check size={16} style={{ verticalAlign: 'middle' }} /> Пройдено!</span>
              : 'Нужна точность ≥ 80%'}
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn-secondary" onClick={retryExercise}>Повторить</button>
              {result.passed && activeExercise + 1 < EXERCISE_COUNT && (
                <button className="btn-accent" onClick={nextExercise}>Далее <ArrowRight size={14} style={{ verticalAlign: 'middle' }} /></button>
              )}
              {result.passed && activeExercise + 1 >= EXERCISE_COUNT && (
                nextLessonTarget !== null ? (
                  <button className="btn-accent" onClick={() => openSiblingLesson(nextLessonTarget)}>
                    {nextLessonTargetLabel} <ArrowRight size={14} style={{ verticalAlign: 'middle' }} />
                  </button>
                ) : (
                  <button className="btn-accent" onClick={() => { setActiveLesson(null); setActiveExercise(null); }}>
                    Готово <Check size={14} style={{ verticalAlign: 'middle' }} />
                  </button>
                )
              )}
            </div>
          </div>
        )}
        <button className="btn-secondary mt-12" onClick={goBack}><ArrowLeft size={14} style={{ verticalAlign: 'middle' }} /> Назад</button>
      </section>
    );
  }

  /* ═══════════════════════════════════════════════════
     VIEW: Lesson detail — 5 exercises
     ═══════════════════════════════════════════════════ */
  if (activeLesson !== null) {
    const done = lessonsDone[activeLesson] ?? 0;

    return (
      <section className="mode-panel active">
        <div className="panel-header"><h1>Уроки</h1></div>
        <h3 className="lesson-active-title">
          {activeLessonData?.name ?? keysLabel(lessonKeys)}
        </h3>
        <p className="lesson-active-subtitle">
          {activeLessonData?.description ?? sectionLabel(activeLessonData?.section)}
        </p>
        {activeLessonSection && activeSectionLessonIndexes.length > 0 && (
          <div className="lesson-section-progress">
            <span className="lesson-section-progress__label">{activeLessonSection}</span>
            <span className="lesson-section-progress__value">
              Урок {activeSectionPosition + 1} из {activeSectionLessonIndexes.length}
            </span>
          </div>
        )}
        <p className="lesson-active-keys">{lessonFocusLabel(activeLessonData, lessonKeys)}</p>
        <div className="exercise-list">
          {Array.from({ length: EXERCISE_COUNT }, (_, i) => {
            const status = i < done ? 'done' : i === done ? 'current' : 'locked';
            return (
              <div
                key={i}
                className={`exercise-card ${status}`}
                onClick={() => status !== 'locked' && openExercise(i)}
              >
                <div className="exercise-info">
                  <span className="exercise-name">{activeLessonExerciseNames?.[i] ?? `Упражнение ${i + 1}`}</span>
                  {status === 'done' && <span className="exercise-check"><Check size={16} /></span>}
                  {status === 'current' && <span className="exercise-play"><Play size={16} /></span>}
                </div>
                <div className="exercise-progress-bar">
                  {Array.from({ length: EXERCISE_COUNT }, (_, j) => (
                    <div
                      key={j}
                      className={`progress-segment ${j < done ? 'filled' : ''}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="lesson-section-nav">
          <button
            className="btn-secondary"
            onClick={() => openSiblingLesson(prevLessonInSection)}
            disabled={prevLessonInSection === null}
          >
            <ArrowLeft size={14} style={{ verticalAlign: 'middle' }} /> Предыдущий урок
          </button>
          <button
            className="btn-secondary"
            onClick={() => openSiblingLesson(nextLessonTarget)}
            disabled={nextLessonTarget === null}
          >
            {nextLessonTargetLabel} <ArrowRight size={14} style={{ verticalAlign: 'middle' }} />
          </button>
        </div>
        <button className="btn-secondary mt-12" onClick={goBack}><ArrowLeft size={14} style={{ verticalAlign: 'middle' }} /> Назад</button>
      </section>
    );
  }

  /* ═══════════════════════════════════════════════════
     VIEW: Lesson list (cards)
     ═══════════════════════════════════════════════════ */
  return (
    <section className="mode-panel active">
      <div className="panel-header"><h1>Уроки</h1></div>
      <div className="lesson-grid">
        {lessons.map((les, idx) => {
          const done = lessonsDone[idx] ?? 0;
          const allDone = done >= EXERCISE_COUNT;
          const resolvedLesson = resolveLesson(les);
          const keys = resolvedLesson?.keys ?? [];
          const currentSection = sectionLabel(les.section);
          const prevSection = idx > 0 ? sectionLabel(lessons[idx - 1]?.section) : null;
          const showSection = idx === 0 || prevSection !== currentSection;
          const isCollapsed = !!collapsedSections[currentSection];
          const unlocked = getSectionUnlockState(idx);
          return (
            <Fragment key={les.id}>
              {showSection && (
                <button
                  type="button"
                  className={`lesson-section-title${isCollapsed ? ' collapsed' : ''}`}
                  onClick={() => toggleSection(currentSection)}
                >
                  {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  <span>{currentSection}</span>
                </button>
              )}
              {!isCollapsed && (
                <div
                  className={`lesson-card${allDone ? ' completed' : ''}${!unlocked ? ' locked' : ''}`}
                  onClick={() => unlocked && openLesson(idx)}
                >
                  <div className="lesson-card-top">
                    <span className="lesson-num">{idx + 1}</span>
                    <span className="lesson-name">{les.name}</span>
                  </div>
                  {les.description && <span className="lesson-desc">{les.description}</span>}
                  <span className="lesson-keys">{lessonFocusLabel(resolvedLesson, keys)}</span>
                  {!unlocked && (
                    <span className="lesson-locked-note">
                      Сначала заверши предыдущий урок в этой секции
                    </span>
                  )}
                  <div className="lesson-progress-bar">
                    {Array.from({ length: EXERCISE_COUNT }, (_, j) => (
                      <div key={j} className={`progress-segment ${j < done ? 'filled' : ''}`} />
                    ))}
                  </div>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}
