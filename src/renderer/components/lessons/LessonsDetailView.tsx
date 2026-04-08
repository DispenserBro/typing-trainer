import { ArrowLeft, ArrowRight, Check, Play } from 'lucide-react';
import { EXERCISE_COUNT } from '../../../core/engine';

type LessonsDetailViewProps = {
  title: string;
  subtitle: string;
  sectionTitle: string | null;
  sectionPosition: number;
  sectionCount: number;
  focusLabel: string;
  exerciseNames: readonly string[] | null;
  done: number;
  nextLessonTargetLabel: string;
  hasPrevLesson: boolean;
  hasNextLesson: boolean;
  onOpenExercise: (index: number) => void;
  onOpenPrevLesson: () => void;
  onOpenNextLesson: () => void;
  onBack: () => void;
};

export function LessonsDetailView({
  title,
  subtitle,
  sectionTitle,
  sectionPosition,
  sectionCount,
  focusLabel,
  exerciseNames,
  done,
  nextLessonTargetLabel,
  hasPrevLesson,
  hasNextLesson,
  onOpenExercise,
  onOpenPrevLesson,
  onOpenNextLesson,
  onBack,
}: LessonsDetailViewProps) {
  return (
    <section className="mode-panel active">
      <div className="panel-header"><h1>Уроки</h1></div>
      <h3 className="lesson-active-title">{title}</h3>
      <p className="lesson-active-subtitle">{subtitle}</p>
      {sectionTitle && sectionCount > 0 && (
        <div className="lesson-section-progress">
          <span className="lesson-section-progress__label">{sectionTitle}</span>
          <span className="lesson-section-progress__value">
            Урок {sectionPosition + 1} из {sectionCount}
          </span>
        </div>
      )}
      <p className="lesson-active-keys">{focusLabel}</p>
      <div className="exercise-list">
        {Array.from({ length: EXERCISE_COUNT }, (_, i) => {
          const status = i < done ? 'done' : i === done ? 'current' : 'locked';
          return (
            <div
              key={i}
              className={`exercise-card ${status}`}
              onClick={() => status !== 'locked' && onOpenExercise(i)}
            >
              <div className="exercise-info">
                <span className="exercise-name">{exerciseNames?.[i] ?? `Упражнение ${i + 1}`}</span>
                {status === 'done' && <span className="exercise-check"><Check size={16} /></span>}
                {status === 'current' && <span className="exercise-play"><Play size={16} /></span>}
              </div>
              <div className="exercise-progress-bar">
                {Array.from({ length: EXERCISE_COUNT }, (_, j) => (
                  <div key={j} className={`progress-segment ${j < done ? 'filled' : ''}`} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="lesson-section-nav">
        <button className="btn-secondary" onClick={onOpenPrevLesson} disabled={!hasPrevLesson}>
          <ArrowLeft size={14} style={{ verticalAlign: 'middle' }} /> Предыдущий урок
        </button>
        <button className="btn-secondary" onClick={onOpenNextLesson} disabled={!hasNextLesson}>
          {nextLessonTargetLabel} <ArrowRight size={14} style={{ verticalAlign: 'middle' }} />
        </button>
      </div>
      <button className="btn-secondary mt-12" onClick={onBack}>
        <ArrowLeft size={14} style={{ verticalAlign: 'middle' }} /> Назад
      </button>
    </section>
  );
}

