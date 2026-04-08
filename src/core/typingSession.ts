import type { Session } from '../shared/types';

export function createSession(text: string, mode: Session['mode'], prevLessonIdx: number): Session {
  return {
    active: true,
    text,
    pos: 0,
    errors: 0,
    totalChars: 0,
    startTime: performance.now(),
    charStats: {},
    lastKeyTime: 0,
    timer: null,
    timerValue: 0,
    mode,
    lessonIdx: prevLessonIdx,
    errPositions: new Set(),
    keypresses: [],
  };
}
