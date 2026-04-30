import type { Lesson } from '../../shared/types';

export type LessonProgressMap = Record<number, number>;

export type LessonsSectionModel = {
  lessonSections: string[];
  lessonsBySection: Map<string, number[]>;
  lessonsDone: LessonProgressMap;
  unlockedLessonIndexes: Set<number>;
};

export type LessonNavigationModel = {
  activeSectionIndex: number;
  activeSectionLessonIndexes: number[];
  activeSectionPosition: number;
  canOpenNextLesson: boolean;
  canOpenPrevLesson: boolean;
  nextLessonInSection: number | null;
  nextLessonTarget: number | null;
  nextSectionFirstLesson: number | null;
  prevLessonInSection: number | null;
};

export type LessonCompletionResult = {
  allCompleted: boolean;
  doneByLesson: LessonProgressMap;
  lessonCompleted: boolean;
  sectionCompleted: boolean;
  updated: boolean;
};

export function normalizeLessonDoneValue(value: unknown, exerciseCount: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.min(exerciseCount, Math.floor(value)));
  }
  return value ? exerciseCount : 0;
}

export function buildLessonsDoneByIndex(
  rawProgress: Record<string, unknown> | undefined,
  exerciseCount: number,
): LessonProgressMap {
  const doneByLesson: LessonProgressMap = {};
  for (const [key, value] of Object.entries(rawProgress ?? {})) {
    const numericKey = Number(key);
    if (!Number.isInteger(numericKey) || numericKey < 0) continue;
    doneByLesson[numericKey] = normalizeLessonDoneValue(value, exerciseCount);
  }
  return doneByLesson;
}

function getLessonSection(
  lesson: Lesson | null | undefined,
  getSectionLabel: (section: string | undefined) => string,
) {
  return getSectionLabel(lesson?.section);
}

export function buildLessonsSectionModel(args: {
  exerciseCount: number;
  getSectionLabel: (section: string | undefined) => string;
  lessons: Lesson[];
  rawProgress?: Record<string, unknown>;
}): LessonsSectionModel {
  const {
    exerciseCount,
    getSectionLabel,
    lessons,
    rawProgress,
  } = args;
  const lessonsDone = buildLessonsDoneByIndex(rawProgress, exerciseCount);
  const lessonsBySection = new Map<string, number[]>();
  const lessonSections: string[] = [];

  lessons.forEach((lesson, index) => {
    const section = getLessonSection(lesson, getSectionLabel);
    const current = lessonsBySection.get(section);
    if (current) {
      current.push(index);
    } else {
      lessonsBySection.set(section, [index]);
      lessonSections.push(section);
    }
  });

  const unlockedLessonIndexes = new Set<number>();
  lessons.forEach((lesson, lessonIndex) => {
    const section = getLessonSection(lesson, getSectionLabel);
    const sectionIndexes = lessonsBySection.get(section) ?? [];
    const sectionPosition = sectionIndexes.indexOf(lessonIndex);
    const previousLessonIndex = sectionIndexes[sectionPosition - 1];
    if (sectionPosition <= 0 || (lessonsDone[previousLessonIndex] ?? 0) >= exerciseCount) {
      unlockedLessonIndexes.add(lessonIndex);
    }
  });

  return {
    lessonSections,
    lessonsBySection,
    lessonsDone,
    unlockedLessonIndexes,
  };
}

export function isLessonUnlocked(model: LessonsSectionModel, lessonIndex: number) {
  return model.unlockedLessonIndexes.has(lessonIndex);
}

export function buildLessonNavigationModel(args: {
  activeLesson: number | null;
  activeLessonSection: string | null;
  model: LessonsSectionModel;
}): LessonNavigationModel {
  const { activeLesson, activeLessonSection, model } = args;
  const activeSectionLessonIndexes = activeLessonSection
    ? [...(model.lessonsBySection.get(activeLessonSection) ?? [])]
    : [];
  const activeSectionPosition = activeLesson !== null
    ? activeSectionLessonIndexes.indexOf(activeLesson)
    : -1;
  const prevLessonInSection = activeSectionPosition > 0
    ? activeSectionLessonIndexes[activeSectionPosition - 1]
    : null;
  const nextLessonInSection = activeSectionPosition >= 0 && activeSectionPosition + 1 < activeSectionLessonIndexes.length
    ? activeSectionLessonIndexes[activeSectionPosition + 1]
    : null;
  const activeSectionIndex = activeLessonSection
    ? model.lessonSections.indexOf(activeLessonSection)
    : -1;
  const nextSection = activeSectionIndex >= 0
    ? model.lessonSections[activeSectionIndex + 1]
    : undefined;
  const nextSectionFirstLesson = nextSection
    ? (model.lessonsBySection.get(nextSection)?.[0] ?? null)
    : null;
  const nextLessonTarget = nextLessonInSection ?? nextSectionFirstLesson;

  return {
    activeSectionIndex,
    activeSectionLessonIndexes,
    activeSectionPosition,
    canOpenNextLesson: nextLessonTarget !== null && isLessonUnlocked(model, nextLessonTarget),
    canOpenPrevLesson: prevLessonInSection !== null && isLessonUnlocked(model, prevLessonInSection),
    nextLessonInSection,
    nextLessonTarget,
    nextSectionFirstLesson,
    prevLessonInSection,
  };
}

export function applyLessonExerciseCompletion(args: {
  exerciseCount: number;
  exerciseIndex: number;
  getSectionLabel: (section: string | undefined) => string;
  lessonIndex: number;
  lessons: Lesson[];
  rawProgress?: Record<string, unknown>;
}): LessonCompletionResult {
  const {
    exerciseCount,
    exerciseIndex,
    getSectionLabel,
    lessonIndex,
    lessons,
    rawProgress,
  } = args;
  const previousDoneByLesson = buildLessonsDoneByIndex(rawProgress, exerciseCount);
  const previousDone = previousDoneByLesson[lessonIndex] ?? 0;
  const nextDone = Math.max(previousDone, Math.min(exerciseCount, exerciseIndex + 1));
  const doneByLesson = {
    ...previousDoneByLesson,
    [lessonIndex]: nextDone,
  };
  const lessonCompleted = nextDone >= exerciseCount && previousDone < exerciseCount;
  const model = buildLessonsSectionModel({
    exerciseCount,
    getSectionLabel,
    lessons,
    rawProgress: doneByLesson,
  });
  const lesson = lessons[lessonIndex];
  const section = getLessonSection(lesson, getSectionLabel);
  const sectionIndexes = model.lessonsBySection.get(section) ?? [];
  const sectionCompleted = lessonCompleted
    && sectionIndexes.length > 0
    && sectionIndexes.every(index => (doneByLesson[index] ?? 0) >= exerciseCount);
  const allCompleted = lessonCompleted
    && lessons.length > 0
    && lessons.every((_, index) => (doneByLesson[index] ?? 0) >= exerciseCount);

  return {
    allCompleted,
    doneByLesson,
    lessonCompleted,
    sectionCompleted,
    updated: nextDone !== previousDone,
  };
}
