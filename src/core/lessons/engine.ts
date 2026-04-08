import type { Layout, Lesson } from '../../shared/types';
import { generateNgramWord, pick, type NgramModel } from '../text/ngramUtils';

export const EXERCISE_NAMES = [
  'Повторения букв',
  'Одиночные буквы',
  'Сочетания по 2',
  'Сочетания по 2–3',
  'Сочетания по 2–4',
] as const;

export const ROW_EXERCISE_NAMES = [
  'Разогрев ряда',
  'Одиночные клавиши',
  'Пары по ряду',
  'Связки по ряду',
  'Закрепление ряда',
] as const;

export const BIGRAM_EXERCISE_NAMES = [
  'Разогрев сочетаний',
  'Чистые пары',
  'Короткие связки',
  'Слоги и фрагменты',
  'Закрепление сочетаний',
] as const;

export const TRANSITION_EXERCISE_NAMES = [
  'Разогрев переходов',
  'Чередование 1–1',
  'Короткие связки',
  'Длинные переходы',
  'Закрепление переходов',
] as const;

export const EXERCISE_COUNT = 5;

export function generateLessonText(keys: string[], count = 50, model?: NgramModel): string {
  if (model && keys.length >= 2) {
    const words: string[] = [];
    for (let i = 0; i < count; i++) {
      words.push(generateNgramWord(model, keys, 2, Math.min(5, keys.length + 1)));
    }
    return words.join(' ');
  }

  const combos: string[] = [];
  for (let i = 0; i < count; i++) {
    const len = 2 + Math.floor(Math.random() * 4);
    let word = '';
    for (let j = 0; j < len; j++) word += keys[Math.floor(Math.random() * keys.length)];
    combos.push(word);
  }
  return combos.join(' ');
}

export function generateExerciseText(
  keys: string[],
  exerciseIdx: number,
  wordCount = 20,
  model?: NgramModel,
): string {
  if (!keys.length) return '';
  const shuffle = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const words: string[] = [];
  switch (exerciseIdx) {
    case 0:
      for (let i = 0; i < wordCount; i++) {
        const ch = keys[i % keys.length];
        const len = 3 + Math.floor(Math.random() * 3);
        words.push(ch.repeat(len));
      }
      break;
    case 1:
      for (let i = 0; i < wordCount; i++) words.push(keys[Math.floor(Math.random() * keys.length)]);
      break;
    case 2:
      for (let i = 0; i < wordCount; i++) words.push(shuffle(keys).slice(0, 2).join(''));
      break;
    case 3:
      if (model && keys.length >= 2) {
        for (let i = 0; i < wordCount; i++) words.push(generateNgramWord(model, keys, 2, 3));
      } else {
        for (let i = 0; i < wordCount; i++) {
          const len = 2 + Math.floor(Math.random() * 2);
          let word = '';
          for (let j = 0; j < len; j++) word += keys[Math.floor(Math.random() * keys.length)];
          words.push(word);
        }
      }
      break;
    case 4:
      if (model && keys.length >= 2) {
        for (let i = 0; i < wordCount; i++) words.push(generateNgramWord(model, keys, 2, 4));
      } else {
        for (let i = 0; i < wordCount; i++) {
          const len = 2 + Math.floor(Math.random() * 3);
          let word = '';
          for (let j = 0; j < len; j++) word += keys[Math.floor(Math.random() * keys.length)];
          words.push(word);
        }
      }
      break;
    default:
      return generateLessonText(keys, wordCount, model);
  }
  return words.join(' ');
}

export function getLessonKeys(lesson: Lesson, layout?: Layout): string[] {
  if (lesson.type === 'row' && lesson.row && layout?.rows?.[lesson.row]?.length) {
    return layout.rows[lesson.row];
  }
  if (lesson.type === 'bigrams' && lesson.bigrams?.length) {
    return Array.from(new Set(lesson.bigrams.join('').split('')));
  }
  if (lesson.type === 'transitions') {
    const rowKeys = lesson.transitionRows?.flatMap((row) => layout?.rows?.[row] ?? []) ?? [];
    const fingerKeys = lesson.focusFingers?.flatMap((finger) => layout?.fingers?.[finger] ?? []) ?? [];
    const combined = [...rowKeys, ...fingerKeys, ...(lesson.keys ?? [])];
    if (combined.length) return Array.from(new Set(combined));
  }
  return lesson.keys ?? [];
}

export function getExerciseNamesForLesson(lesson: Lesson): readonly string[] {
  if (lesson.type === 'row') return ROW_EXERCISE_NAMES;
  if (lesson.type === 'bigrams') return BIGRAM_EXERCISE_NAMES;
  if (lesson.type === 'transitions') return TRANSITION_EXERCISE_NAMES;
  return EXERCISE_NAMES;
}

function resolveTransitionGroups(lesson: Lesson, layout?: Layout): string[][] {
  const rowGroups = lesson.transitionRows?.map((row) => layout?.rows?.[row] ?? []).filter(group => group.length) ?? [];
  const fingerGroups = lesson.focusFingers?.map((finger) => layout?.fingers?.[finger] ?? []).filter(group => group.length) ?? [];
  const groups = [...rowGroups, ...fingerGroups];
  if (groups.length >= 2) return groups;

  const flatKeys = getLessonKeys(lesson, layout);
  if (flatKeys.length >= 2) {
    const midpoint = Math.ceil(flatKeys.length / 2);
    return [flatKeys.slice(0, midpoint), flatKeys.slice(midpoint)];
  }
  return [flatKeys];
}

function generateTransitionWord(groups: string[][], length: number): string {
  const validGroups = groups.filter(group => group.length);
  if (!validGroups.length) return '';
  if (validGroups.length === 1) {
    return Array.from({ length }, () => pick(validGroups[0])).join('');
  }
  const start = Math.floor(Math.random() * validGroups.length);
  let word = '';
  for (let i = 0; i < length; i++) {
    const group = validGroups[(start + i) % validGroups.length];
    word += pick(group);
  }
  return word;
}

function generateTransitionExerciseText(
  lesson: Lesson,
  layout: Layout | undefined,
  exerciseIdx: number,
  wordCount = 20,
): string {
  const groups = resolveTransitionGroups(lesson, layout);
  const words: string[] = [];
  switch (exerciseIdx) {
    case 0:
      for (let i = 0; i < wordCount; i++) words.push(generateTransitionWord(groups, 2));
      break;
    case 1:
      for (let i = 0; i < wordCount; i++) words.push(generateTransitionWord(groups, 3));
      break;
    case 2:
      for (let i = 0; i < wordCount; i++) words.push(generateTransitionWord(groups, 4));
      break;
    case 3:
      for (let i = 0; i < wordCount; i++) words.push(generateTransitionWord(groups, 5));
      break;
    case 4:
      for (let i = 0; i < wordCount; i++) words.push(generateTransitionWord(groups, 4 + (i % 3)));
      break;
    default:
      for (let i = 0; i < wordCount; i++) words.push(generateTransitionWord(groups, 4));
      break;
  }
  return words.join(' ');
}

function generateFocusedBigramWord(
  bigrams: string[],
  allowedChars: string[],
  model?: NgramModel,
  minLen = 2,
  maxLen = 4,
): string {
  const target = pick(bigrams);
  const allowed = Array.from(new Set(allowedChars.filter(Boolean)));
  if (!target || !allowed.length) return target || '';

  if (model && allowed.length >= 2) {
    for (let i = 0; i < 18; i++) {
      const word = generateNgramWord(model, allowed, Math.max(minLen, target.length), Math.max(maxLen, target.length));
      if (bigrams.some(bigram => word.includes(bigram))) return word;
    }
  }

  let word = target;
  const targetLength = Math.max(target.length, Math.min(maxLen, minLen + Math.floor(Math.random() * (maxLen - minLen + 1))));
  while (word.length < targetLength) {
    const ch = pick(allowed);
    word = Math.random() < 0.5 ? `${ch}${word}` : `${word}${ch}`;
  }
  return word;
}

function generateBigramExerciseText(
  bigrams: string[],
  exerciseIdx: number,
  wordCount = 20,
  model?: NgramModel,
): string {
  if (!bigrams.length) return '';
  const allowedChars = Array.from(new Set(bigrams.join('').split('')));
  const words: string[] = [];

  switch (exerciseIdx) {
    case 0:
      for (let i = 0; i < wordCount; i++) words.push(pick(bigrams));
      break;
    case 1:
      for (let i = 0; i < wordCount; i++) {
        const bigram = pick(bigrams);
        words.push(Math.random() < 0.55 ? bigram : bigram.split('').reverse().join(''));
      }
      break;
    case 2:
      for (let i = 0; i < wordCount; i++) words.push(generateFocusedBigramWord(bigrams, allowedChars, model, 2, 3));
      break;
    case 3:
      for (let i = 0; i < wordCount; i++) words.push(generateFocusedBigramWord(bigrams, allowedChars, model, 3, 4));
      break;
    case 4:
      for (let i = 0; i < wordCount; i++) words.push(generateFocusedBigramWord(bigrams, allowedChars, model, 3, 5));
      break;
    default:
      for (let i = 0; i < wordCount; i++) words.push(generateFocusedBigramWord(bigrams, allowedChars, model, 2, 4));
      break;
  }
  return words.join(' ');
}

export function generateLessonExerciseText(
  lesson: Lesson,
  layout: Layout | undefined,
  exerciseIdx: number,
  wordCount = 20,
  model?: NgramModel,
): string {
  const keys = getLessonKeys(lesson, layout);
  if (lesson.type === 'bigrams' && lesson.bigrams?.length) {
    return generateBigramExerciseText(lesson.bigrams, exerciseIdx, wordCount, model);
  }
  if (lesson.type === 'transitions') {
    return generateTransitionExerciseText(lesson, layout, exerciseIdx, wordCount);
  }
  return generateExerciseText(keys, exerciseIdx, wordCount, model);
}

