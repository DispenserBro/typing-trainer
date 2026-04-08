import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { TextDisplay } from '../TextDisplay';

type ExerciseResult = {
  wpm: number;
  acc: number;
  passed: boolean;
};

type LessonsExerciseViewProps = {
  title: string;
  subtitle?: string | null;
  focusLabel: string;
  currentSpeed: string | number;
  speedUnit: string;
  currentAccuracy: number;
  sessionActive: boolean;
  sessionText: string;
  sessionPos: number;
  sessionErrPositions: Set<number>;
  exerciseText: string;
  waitingForSpace: boolean;
  showOverlay: boolean;
  result: ExerciseResult | null;
  hasNextExercise: boolean;
  hasNextLessonTarget: boolean;
  nextLessonTargetLabel: string;
  onOverlayClick: () => void;
  onRetry: () => void;
  onNextExercise: () => void;
  onOpenNextLesson: () => void;
  onDone: () => void;
  onBack: () => void;
};

export function LessonsExerciseView({
  title,
  subtitle,
  focusLabel,
  currentSpeed,
  speedUnit,
  currentAccuracy,
  sessionActive,
  sessionText,
  sessionPos,
  sessionErrPositions,
  exerciseText,
  waitingForSpace,
  showOverlay,
  result,
  hasNextExercise,
  hasNextLessonTarget,
  nextLessonTargetLabel,
  onOverlayClick,
  onRetry,
  onNextExercise,
  onOpenNextLesson,
  onDone,
  onBack,
}: LessonsExerciseViewProps) {
  return (
    <section className="mode-panel active">
      <div className="panel-header"><h1>Уроки</h1></div>
      <h3 className="lesson-active-title">{title}</h3>
      {subtitle && <p className="lesson-active-subtitle">{subtitle}</p>}
      <p className="lesson-active-keys">{focusLabel}</p>
      <div className="stats-bar">
        <div className="metric"><b>{currentSpeed}</b> <small className="speed-unit">{speedUnit}</small></div>
        <div className="metric"><b>{Math.round(currentAccuracy)}</b>%</div>
      </div>
      <TextDisplay
        text={sessionActive ? sessionText : exerciseText}
        pos={sessionActive ? sessionPos : 0}
        errPositions={sessionActive ? sessionErrPositions : new Set()}
        waitingForSpace={waitingForSpace}
        overlay={showOverlay && !sessionActive && !result ? 'Нажмите здесь, чтобы начать' : null}
        onOverlayClick={onOverlayClick}
      />
      {result && (
        <div className="result-card">
          <h3>Упражнение завершено!</h3>
          <div className="result-big">{currentSpeed} {speedUnit}</div>
          <p>Точность: <b>{Math.round(result.acc)}%</b></p>
          <p>{result.passed
            ? <span style={{ color: 'var(--green)' }}><Check size={16} style={{ verticalAlign: 'middle' }} /> Пройдено!</span>
            : 'Нужна точность ≥ 80%'}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn-secondary" onClick={onRetry}>Повторить</button>
            {result.passed && hasNextExercise && (
              <button className="btn-accent" onClick={onNextExercise}>
                Далее <ArrowRight size={14} style={{ verticalAlign: 'middle' }} />
              </button>
            )}
            {result.passed && !hasNextExercise && (
              hasNextLessonTarget ? (
                <button className="btn-accent" onClick={onOpenNextLesson}>
                  {nextLessonTargetLabel} <ArrowRight size={14} style={{ verticalAlign: 'middle' }} />
                </button>
              ) : (
                <button className="btn-accent" onClick={onDone}>
                  Готово <Check size={14} style={{ verticalAlign: 'middle' }} />
                </button>
              )
            )}
          </div>
        </div>
      )}
      <button className="btn-secondary mt-12" onClick={onBack}>
        <ArrowLeft size={14} style={{ verticalAlign: 'middle' }} /> Назад
      </button>
    </section>
  );
}
