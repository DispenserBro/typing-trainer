import type { Lesson, FingerName, TranslationParams } from '../../../shared/types';

type TranslateFn = (key: string, params?: TranslationParams) => string;

const LESSON_ROW_LABELS: Record<'top' | 'middle' | 'bottom', string> = {
  top: 'lessons.rows.top',
  middle: 'lessons.rows.middle',
  bottom: 'lessons.rows.bottom',
};

const LESSON_FINGER_LABELS: Record<FingerName, string> = {
  index_left: 'lessons.fingers.index_left',
  index_right: 'lessons.fingers.index_right',
  middle_left: 'lessons.fingers.middle_left',
  middle_right: 'lessons.fingers.middle_right',
  ring_left: 'lessons.fingers.ring_left',
  ring_right: 'lessons.fingers.ring_right',
  pinky_left: 'lessons.fingers.pinky_left',
  pinky_right: 'lessons.fingers.pinky_right',
};

function joinLocalized(values: string[], t: TranslateFn) {
  if (values.length <= 1) return values[0] ?? '';
  if (values.length === 2) {
    return `${values[0]} ${t('lessons.and')} ${values[1]}`;
  }
  return `${values.slice(0, -1).join(', ')} ${t('lessons.and')} ${values[values.length - 1]}`;
}

export function getLessonsSectionLabel(section: string | undefined, t: TranslateFn) {
  return section ?? t('lessons.title');
}

export function formatLessonKeys(keys: string[], t: TranslateFn) {
  return joinLocalized(keys.map((key) => key.toUpperCase()), t);
}

export function getLocalizedLessonFocusLabel(
  lesson: Lesson | null,
  fallbackKeys: string[] | undefined,
  t: TranslateFn,
) {
  if (!lesson) return '';
  if (lesson.type === 'bigrams' && lesson.bigrams?.length) {
    return lesson.bigrams.join(' · ');
  }
  if (lesson.type === 'transitions') {
    if (lesson.transitionRows?.length) {
      return lesson.transitionRows
        .map((row) => t(LESSON_ROW_LABELS[row]))
        .join(' ⇄ ');
    }
    if (lesson.focusFingers?.length) {
      return lesson.focusFingers
        .map((finger) => t(LESSON_FINGER_LABELS[finger]))
        .join(' ⇄ ');
    }
  }
  return formatLessonKeys(fallbackKeys ?? lesson.keys, t);
}

export function getLocalizedExerciseNamesForLesson(lesson: Lesson, t: TranslateFn): readonly string[] {
  if (lesson.type === 'row') {
    return [
      t('lessons.exerciseNames.row.warmup'),
      t('lessons.exerciseNames.row.singleKeys'),
      t('lessons.exerciseNames.row.rowPairs'),
      t('lessons.exerciseNames.row.rowChains'),
      t('lessons.exerciseNames.row.rowLockIn'),
    ];
  }
  if (lesson.type === 'bigrams') {
    return [
      t('lessons.exerciseNames.bigrams.warmup'),
      t('lessons.exerciseNames.bigrams.cleanPairs'),
      t('lessons.exerciseNames.bigrams.shortChains'),
      t('lessons.exerciseNames.bigrams.syllables'),
      t('lessons.exerciseNames.bigrams.lockIn'),
    ];
  }
  if (lesson.type === 'transitions') {
    return [
      t('lessons.exerciseNames.transitions.warmup'),
      t('lessons.exerciseNames.transitions.alternation'),
      t('lessons.exerciseNames.transitions.shortChains'),
      t('lessons.exerciseNames.transitions.longTransitions'),
      t('lessons.exerciseNames.transitions.lockIn'),
    ];
  }
  return [
    t('lessons.exerciseNames.generic.repeats'),
    t('lessons.exerciseNames.generic.singleLetters'),
    t('lessons.exerciseNames.generic.pairs2'),
    t('lessons.exerciseNames.generic.pairs23'),
    t('lessons.exerciseNames.generic.pairs24'),
  ];
}
