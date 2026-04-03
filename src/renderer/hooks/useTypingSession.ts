import { useState, useCallback, useRef, useEffect } from 'react';
import type { Session, CharStat } from '../../shared/types';
import { createSession } from '../engine';
import { useApp } from '../contexts/AppContext';

interface UseTypingSessionOptions {
  mode: Session['mode'];
  noStepBack?: boolean;
  onFinish?: (wpm: number, acc: number, elapsed: number, session: Session) => void;
}

export function useTypingSession({ mode, noStepBack, onFinish }: UseTypingSessionOptions) {
  const { settings, setActiveChar, saveCharStats } = useApp();
  const [session, setSession] = useState<Session>(() => {
    const s = createSession('', mode, -1);
    s.active = false;            // idle until start() is called
    return s;
  });
  const [renderTick, setRenderTick] = useState(0);
  const [waitingForSpace, setWaitingForSpace] = useState(false);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const rerender = useCallback(() => setRenderTick(t => t + 1), []);

  const start = useCallback((text: string, lessonIdx = -1) => {
    const s = createSession(text, mode, lessonIdx);
    setSession(s);
    sessionRef.current = s;
    setWaitingForSpace(false);
    if (text.length) setActiveChar(text[0]);
    rerender();
  }, [mode, setActiveChar, rerender]);

  const stop = useCallback(() => {
    setSession(prev => {
      if (prev.timer) clearInterval(prev.timer);
      return { ...prev, active: false, timer: null };
    });
    setWaitingForSpace(false);
    setActiveChar(undefined);
  }, [setActiveChar]);

  const finish = useCallback(() => {
    const s = sessionRef.current;
    if (!s.active) return;
    if (s.timer) clearInterval(s.timer);
    s.active = false;
    s.timer = null;
    setSession({ ...s });
    setWaitingForSpace(false);

    const elapsed = (performance.now() - s.startTime) / 1000;
    const wpm = (s.totalChars / 5) / (elapsed / 60);
    const acc = s.totalChars > 0
      ? (s.totalChars - s.errors) / s.totalChars * 100
      : 100;

    saveCharStats(s.charStats);
    setActiveChar(undefined);
    onFinish?.(wpm, acc, elapsed, s);
  }, [saveCharStats, setActiveChar, onFinish]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    const s = sessionRef.current;
    if (!s.active) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (['Shift', 'CapsLock', 'Tab', 'Escape'].includes(e.key)) return;
    if (e.key.length > 1 && e.key !== 'Backspace') return;
    e.preventDefault();

    const now = performance.now();

    // Waiting for trailing space — only accept space
    if (s.pos >= s.text.length && settings.endWithSpace) {
      if (e.key === ' ') {
        finish();
      }
      return;
    }

    const expected = s.text[s.pos];

    if (e.key === 'Backspace') {
      if (noStepBack) return;
      if (s.pos > 0) {
        s.pos--;
        s.errPositions.delete(s.pos);
        setWaitingForSpace(false);
      }
      setSession({ ...s });
      setActiveChar(s.text[s.pos]);
      rerender();
      return;
    }

    const charTime = s.lastKeyTime ? (now - s.lastKeyTime) : 0;
    s.lastKeyTime = now;
    const ch = expected ? expected.toLowerCase() : '';
    if (!s.charStats[ch]) s.charStats[ch] = { hits: 0, misses: 0, totalTime: 0 };
    const correct = e.key === expected;

    s.keypresses.push({
      position: s.pos,
      expected,
      actual: e.key,
      correct,
      interval: charTime,
      timestamp: now,
    });

    if (correct) {
      s.charStats[ch].hits++;
      s.charStats[ch].totalTime += charTime;
      s.totalChars++;
      s.pos++;
    } else {
      s.charStats[ch].misses++;
      s.errors++;
      s.totalChars++;
      s.errPositions.add(s.pos);
      s.pos++;
    }

    setSession({ ...s });
    if (s.pos < s.text.length) {
      setActiveChar(s.text[s.pos]);
    }
    rerender();

    if (s.pos >= s.text.length) {
      if (settings.endWithSpace) {
        setWaitingForSpace(true);
        setActiveChar(' ');
      } else {
        finish();
      }
    }
  }, [noStepBack, settings.endWithSpace, setActiveChar, finish, rerender]);

  // live stats
  const elapsed = session.active
    ? (performance.now() - session.startTime) / 1000
    : 0;
  const wpm = elapsed > 0.3 ? (session.totalChars / 5) / (elapsed / 60) : 0;
  const acc = session.totalChars > 0
    ? (session.totalChars - session.errors) / session.totalChars * 100
    : 100;

  return {
    session: sessionRef.current,
    start,
    stop,
    finish,
    handleKey,
    wpm,
    acc,
    renderTick,
    waitingForSpace,
  };
}
