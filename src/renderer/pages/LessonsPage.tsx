import { useState, useCallback, useEffect, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useTypingSession } from '../hooks/useTypingSession';
import { TextDisplay } from '../components/TextDisplay';
import { generateExerciseText, EXERCISE_NAMES, EXERCISE_COUNT, filterYoKeys } from '../engine';
import { Check, Play, ArrowLeft, ArrowRight } from 'lucide-react';

/* ─── helpers ────────────────────────────────────────── */
function keysLabel(keys: string[]): string {
  if (keys.length <= 2) return keys.map(k => k.toUpperCase()).join(' и ');
  return keys.slice(0, -1).map(k => k.toUpperCase()).join(', ')
    + ' и ' + keys[keys.length - 1].toUpperCase();
}

/* ═══════════════════════════════════════════════════════ */
export function LessonsPage() {
  const { layouts, currentLayout, settings, progress, fmtSpeed, spdLabel,
    saveHistory, saveProgress } = useApp();

  const useYo = settings.useYo;
  const layout = layouts.layouts[currentLayout];
  const lessons = layout?.lessonOrder ?? [];

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

  /* ─── State: which lesson & exercise are open ────── */
  const [activeLesson, setActiveLesson] = useState<number | null>(null);
  const [activeExercise, setActiveExercise] = useState<number | null>(null);

  /* ─── Exercise typing state ──────────────────────── */
  const [exerciseText, setExerciseText] = useState('');
  const [showOverlay, setShowOverlay] = useState(false);
  const [result, setResult] = useState<{ wpm: number; acc: number; passed: boolean } | null>(null);

  const onFinish = useCallback((wpm: number, _acc: number) => {
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
    saveHistory('lesson', wpm, acc);
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
    const les = lessons[activeLesson];
    if (!les) return;
    // accumulate keys up to this lesson
    let keys: string[] = [];
    for (let i = 0; i <= activeLesson; i++) keys.push(...lessons[i].keys);
    keys = filterYoKeys(keys, useYo);
    const text = generateExerciseText(keys, exIdx);
    setActiveExercise(exIdx);
    setExerciseText(text);
    setShowOverlay(true);
    setResult(null);
  }, [activeLesson, lessons, useYo]);

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

  /* ─── Current lesson's keys for header display ──── */
  const lessonKeys = activeLesson !== null
    ? filterYoKeys(lessons[activeLesson]?.keys ?? [], useYo)
    : [];

  /* ═══════════════════════════════════════════════════
     VIEW: Active exercise (typing)
     ═══════════════════════════════════════════════════ */
  if (activeLesson !== null && activeExercise !== null) {
    return (
      <section className="mode-panel active">
        <div className="panel-header"><h1>Уроки</h1></div>
        <h3 className="lesson-active-title">
          {keysLabel(lessonKeys)} — {EXERCISE_NAMES[activeExercise]}
        </h3>
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
                <button className="btn-accent" onClick={() => { setActiveLesson(null); setActiveExercise(null); }}>
                  Готово <Check size={14} style={{ verticalAlign: 'middle' }} />
                </button>
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
          {keysLabel(lessonKeys)}
        </h3>
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
                  <span className="exercise-name">{EXERCISE_NAMES[i]}</span>
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
          return (
            <div
              key={idx}
              className={`lesson-card${allDone ? ' completed' : ''}`}
              onClick={() => openLesson(idx)}
            >
              <span className="lesson-num">{idx + 1}</span>
              <span className="lesson-name">{les.name}</span>
              <span className="lesson-keys">{filterYoKeys(les.keys, useYo).join(' ')}</span>
              <div className="lesson-progress-bar">
                {Array.from({ length: EXERCISE_COUNT }, (_, j) => (
                  <div key={j} className={`progress-segment ${j < done ? 'filled' : ''}`} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
