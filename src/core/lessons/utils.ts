import type { FingerName, Layout, Lesson } from '../../shared/types';
import { filterYoKeys } from '../engine';
import { getLessonKeys } from './engine';

export function keysLabel(keys: string[]): string {
  if (keys.length <= 2) return keys.map(k => k.toUpperCase()).join(' и ');
  return `${keys.slice(0, -1).map(k => k.toUpperCase()).join(', ')} и ${keys[keys.length - 1].toUpperCase()}`;
}

export function sectionLabel(section?: string): string {
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

export function resolveLesson(
  lesson: Lesson | null | undefined,
  bigramSets: Record<string, string[]>,
  layout: Layout | undefined,
  useYo: boolean,
): Lesson | null {
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
}

export function getLessonFocusLabel(lesson: Lesson | null, fallbackKeys?: string[]) {
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
}
