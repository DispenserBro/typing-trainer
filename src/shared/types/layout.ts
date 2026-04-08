export interface FingerMap {
  index_left: string[];
  index_right: string[];
  middle_left: string[];
  middle_right: string[];
  ring_left: string[];
  ring_right: string[];
  pinky_left: string[];
  pinky_right: string[];
}

export type FingerName = keyof FingerMap;
export type LessonType = 'keys' | 'row' | 'bigrams' | 'transitions' | 'rhythm';
export type LayoutRow = 'top' | 'middle' | 'bottom';

export interface LayoutRows {
  top: string[];
  middle: string[];
  bottom: string[];
}

export interface Lesson {
  id: string;
  name: string;
  keys: string[];
  section?: string;
  description?: string;
  type?: LessonType;
  row?: LayoutRow;
  bigramSet?: string;
  bigrams?: string[];
  transitionRows?: LayoutRow[];
  focusFingers?: FingerName[];
}

export interface Layout {
  label: string;
  lang: string;
  fingers: FingerMap;
  rows: LayoutRows;
  lessonOrder: Lesson[];
  practiceUnlockOrder: string[];
}

export interface LanguageInfo {
  id: string;
  label: string;
  wordsFile: string;
}

export interface LayoutsData {
  languages: LanguageInfo[];
  layouts: Record<string, Layout>;
}
