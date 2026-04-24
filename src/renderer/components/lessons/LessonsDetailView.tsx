import { ArrowLeft, ArrowRight, Check, Play } from 'lucide-react';
import { EXERCISE_COUNT } from '../../../core/engine';
import { useI18n } from '../../contexts/I18nContext';
import { ActionRow } from '../ui/ActionRow';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';

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
  const { t } = useI18n();
  return (
    <section className="mode-panel active">
      <PageHeader title={t('lessons.title')} />
      <h3 className="lesson-active-title">{title}</h3>
      <p className="lesson-active-subtitle">{subtitle}</p>
      {sectionTitle && sectionCount > 0 && (
        <div className="lesson-section-progress">
          <span className="lesson-section-progress__label">{sectionTitle}</span>
          <span className="lesson-section-progress__value">
            {t('lessons.lessonOf', { current: sectionPosition + 1, total: sectionCount })}
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
                <span className="exercise-name">{exerciseNames?.[i] ?? t('lessons.exerciseFallback', { index: i + 1 })}</span>
                {status === 'done' && <span className="exercise-check"><Check size={16} /></span>}
                {status === 'current' && <span className="exercise-play"><Play size={16} /></span>}
              </div>
              <div className="exercise-progress-bar">
                <div
                  className={`progress-segment${status === 'done' ? ' filled' : ''}${status === 'current' ? ' current' : ''}`}
                />
              </div>
            </div>
          );
        })}
      </div>
      <ActionRow className="lesson-section-nav">
        <Button onClick={onOpenPrevLesson} disabled={!hasPrevLesson}>
          <ArrowLeft size={14} className="ui-inline-icon" /> {t('lessons.previousLesson')}
        </Button>
        <Button onClick={onOpenNextLesson} disabled={!hasNextLesson}>
          {nextLessonTargetLabel} <ArrowRight size={14} className="ui-inline-icon" />
        </Button>
      </ActionRow>
      <Button className="mt-12" onClick={onBack}>
        <ArrowLeft size={14} className="ui-inline-icon" /> {t('lessons.back')}
      </Button>
    </section>
  );
}

