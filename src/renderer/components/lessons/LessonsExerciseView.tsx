import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { EMPTY_ERR_POSITIONS, TextDisplay } from '../TextDisplay';
import { useI18n } from '../../contexts/I18nContext';
import { ActionRow } from '../ui/ActionRow';
import { Button } from '../ui/Button';
import { InlineStatsBar } from '../ui/InlineStatsBar';
import { PageHeader } from '../ui/PageHeader';
import { ResultCardLayout } from '../ui/ResultCardLayout';

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
  resultSpeed: string | number;
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
  resultSpeed,
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
  const { t } = useI18n();
  const displayedSpeed = result ? resultSpeed : currentSpeed;
  const displayedAccuracy = result ? result.acc : currentAccuracy;

  return (
    <section className="mode-panel active">
      <PageHeader title={t('lessons.title')} />
      <h3 className="lesson-active-title">{title}</h3>
      {subtitle && <p className="lesson-active-subtitle">{subtitle}</p>}
      <p className="lesson-active-keys">{focusLabel}</p>
      <InlineStatsBar
        compactItems={[
          { id: 'speed', value: displayedSpeed, detail: speedUnit },
          { id: 'accuracy', value: Math.round(displayedAccuracy), label: '%' },
        ]}
      />
      <TextDisplay
        text={sessionActive ? sessionText : exerciseText}
        pos={sessionActive ? sessionPos : 0}
        errPositions={sessionActive ? sessionErrPositions : EMPTY_ERR_POSITIONS}
        waitingForSpace={waitingForSpace}
        overlay={showOverlay && !sessionActive && !result ? t('lessons.overlay') : null}
        onOverlayClick={onOverlayClick}
      />
      {result && (
        <ResultCardLayout
          title={t('lessons.exerciseCompleted')}
          headline={<>{resultSpeed} {speedUnit}</>}
          summary={<>{t('common.accuracy')}: <b>{Math.round(result.acc)}%</b></>}
        >
          <p>{result.passed
            ? <span className="text-success"><Check size={16} className="ui-inline-icon" /> {t('lessons.passed')}</span>
            : t('lessons.needAccuracy')}
          </p>
          <ActionRow align="center" className="result-actions game-actions lesson-result-actions">
            <Button onClick={onRetry}>{t('lessons.retry')}</Button>
            {result.passed && hasNextExercise && (
              <Button variant="accent" onClick={onNextExercise}>
                {t('lessons.next')} <ArrowRight size={14} className="ui-inline-icon" />
              </Button>
            )}
            {result.passed && !hasNextExercise && (
              hasNextLessonTarget ? (
                <Button variant="accent" onClick={onOpenNextLesson}>
                  {nextLessonTargetLabel} <ArrowRight size={14} className="ui-inline-icon" />
                </Button>
              ) : (
                <Button variant="accent" onClick={onDone}>
                  {t('lessons.done')} <Check size={14} className="ui-inline-icon" />
                </Button>
              )
            )}
          </ActionRow>
        </ResultCardLayout>
      )}
      <Button className="mt-12" onClick={onBack}>
        <ArrowLeft size={14} className="ui-inline-icon" /> {t('lessons.back')}
      </Button>
    </section>
  );
}
