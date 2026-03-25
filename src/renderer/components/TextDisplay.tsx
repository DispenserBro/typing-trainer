import { useRef, useEffect, useMemo, type CSSProperties } from 'react';
import { useApp } from '../contexts/AppContext';

interface Props {
  text: string;
  pos: number;
  errPositions: Set<number>;
  running?: boolean;
  overlay?: string | null;
  onOverlayClick?: () => void;
  waitingForSpace?: boolean;
  fontSizeRem?: number;
}

export function TextDisplay({
  text, pos, errPositions, running, overlay, onOverlayClick, waitingForSpace, fontSizeRem,
}: Props) {
  const { settings } = useApp();
  const textRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const curStyle = settings.cursorStyle;
  const curSmooth = settings.cursorSmooth;
  const highlightCurrentChar = settings.highlightCurrentChar;
  const resolvedRunning = running ?? settings.textDisplay === 'running';
  const resolvedFontSize = fontSizeRem ?? settings.textFontSize;
  const displayStyle = resolvedFontSize ? { fontSize: `${resolvedFontSize}rem` } as CSSProperties : undefined;

  /* Group characters into words so a word never splits across lines */
  const words = useMemo(() => {
    const result: { ch: string; cls: string; idx: number }[][] = [];
    let current: { ch: string; cls: string; idx: number }[] = [];

    for (let i = 0; i < text.length; i++) {
      let cls = '';
      if (i < pos) {
        cls = errPositions.has(i) ? 'char-err' : 'char-ok';
      } else if (i === pos) {
        cls = `${highlightCurrentChar ? 'char-current ' : ''}cursor-${curStyle}`;
        if (curSmooth === 'smooth') cls += ' cursor-smooth';
      }

      if (text[i] === ' ') {
        // push the accumulated word, then start a new group with the space
        if (current.length) { result.push(current); current = []; }
        result.push([{ ch: '\u00A0', cls, idx: i }]);
      } else {
        current.push({ ch: text[i], cls, idx: i });
      }
    }
    if (current.length) result.push(current);

    // Append trailing space cursor when waiting for final space
    if (waitingForSpace) {
      let cls = `${highlightCurrentChar ? 'char-current ' : ''}cursor-${curStyle}`;
      if (curSmooth === 'smooth') cls += ' cursor-smooth';
      result.push([{ ch: '\u00A0', cls, idx: text.length }]);
    }

    return result;
  }, [text, pos, errPositions, curStyle, curSmooth, waitingForSpace, highlightCurrentChar]);

  // Scroll current char into view / running line shift
  useEffect(() => {
    const el = textRef.current;
    const parent = parentRef.current;
    if (!el || !parent) return;

    if (resolvedRunning) {
      const parentW = parent.clientWidth;
      el.style.paddingLeft = `${parentW / 2}px`;
      el.style.paddingRight = `${parentW / 2}px`;
    } else {
      el.style.paddingLeft = '';
      el.style.paddingRight = '';
    }

    const cur = el.querySelector('.char-current, .cursor-underline, .cursor-block, .cursor-line') as HTMLElement | null;
    if (!cur) {
      if (!resolvedRunning) {
        el.style.transform = '';
      }
      return;
    }

    if (resolvedRunning) {
      const parentW = parent.clientWidth;
      const curRect = cur.getBoundingClientRect();
      const textRect = el.getBoundingClientRect();
      const curCenter = (curRect.left - textRect.left) + curRect.width / 2;
      const shift = curCenter - parentW / 2;
      el.style.transform = `translateX(-${shift}px)`;
    } else {
      el.style.transform = '';
      cur.scrollIntoView({ block: 'nearest', behavior: curSmooth === 'smooth' ? 'smooth' : 'auto' });
    }
  }, [text, pos, resolvedRunning, curSmooth]);

  return (
    <div
      ref={parentRef}
      className={`text-display${resolvedRunning ? ' running-line' : ''}`}
      style={displayStyle}
    >
      <div ref={textRef} className="typing-text">
        {words.map((word, wi) => (
          <span key={wi} className="word-wrap">
            {word.map(c => (
              <span key={c.idx} className={c.cls || undefined}>{c.ch}</span>
            ))}
          </span>
        ))}
      </div>
      {overlay && (
        <div className="text-overlay" onClick={onOverlayClick}>
          <span className="start-hint">
            {overlay.split('\n').map((line, i) => (
              <span key={i}>{i > 0 && <br />}{line}</span>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}
