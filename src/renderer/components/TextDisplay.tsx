import { useRef, useEffect, useMemo, type CSSProperties, type ReactNode } from 'react';
import { buildTextDisplayWords } from '../../core/text/displayModel';
import { useAppSettings } from '../contexts/AppContext';

export const EMPTY_ERR_POSITIONS = new Set<number>();

interface Props {
  text: string;
  pos: number;
  errPositions: Set<number>;
  running?: boolean;
  overlay?: string | null;
  onOverlayClick?: () => void;
  waitingForSpace?: boolean;
  fontSizeRem?: number;
  overlayCover?: boolean;
  overlayContent?: ReactNode;
}

export function TextDisplay({
  text, pos, errPositions, running, overlay, onOverlayClick, waitingForSpace, fontSizeRem, overlayCover, overlayContent,
}: Props) {
  const { settings } = useAppSettings();
  const textRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const curStyle = settings.cursorStyle;
  const curSmooth = settings.cursorSmooth;
  const highlightCurrentChar = settings.highlightCurrentChar;
  const resolvedRunning = running ?? settings.textDisplay === 'running';
  const resolvedFontSize = fontSizeRem ?? settings.textFontSize;
  const displayStyle = resolvedFontSize ? { fontSize: `${resolvedFontSize}rem` } as CSSProperties : undefined;

  /* Group characters into words so a word never splits across lines */
  const words = useMemo(() => buildTextDisplayWords({
    cursorSmooth: curSmooth,
    cursorStyle: curStyle,
    errPositions,
    highlightCurrentChar,
    pos,
    text,
    waitingForSpace,
  }), [text, pos, errPositions, curStyle, curSmooth, waitingForSpace, highlightCurrentChar]);

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
      className={`text-display${resolvedRunning ? ' running-line' : ''}${(overlay || overlayContent) && overlayCover ? ' overlay-cover' : ''}${overlayContent ? ' overlay-content' : ''}`}
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
      {(overlay || overlayContent) && (
        <div
          className={`text-overlay${overlayCover ? ' cover' : ''}`}
          onClick={overlayContent ? undefined : onOverlayClick}
        >
          {overlayContent ?? (
            <div className={`start-hint${overlayCover ? ' cover' : ''}`}>
              {overlay?.split('\n').map((line, i) => (
                <span key={i} className="start-hint-line">{line}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
