import {
  useMemo, useRef, useState, useCallback, useLayoutEffect, type CSSProperties,
} from 'react';
import type { FingerName } from '../../shared/types';
import { useApp } from '../contexts/AppContext';

const KB_ROWS: Record<string, string[][]> = {
  qwerty: [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', '\''],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
  ],
  dvorak: [
    ['\'', ',', '.', 'p', 'y', 'f', 'g', 'c', 'r', 'l', '/', '+'],
    ['a', 'o', 'e', 'u', 'i', 'd', 'h', 't', 'n', 's', '-'],
    [';', 'q', 'j', 'k', 'x', 'b', 'm', 'w', 'v', 'z'],
  ],
  'йцукен': [
    ['й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х', 'ъ'],
    ['ф', 'ы', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'э'],
    ['я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю', '.'],
  ],
  'яверты': [
    ['я', 'ш', 'е', 'р', 'т', 'ы', 'у', 'и', 'о', 'п', 'ъ', 'ь'],
    ['а', 'с', 'д', 'ф', 'г', 'х', 'й', 'к', 'л', 'э', 'ю'],
    ['щ', 'ж', 'ц', 'в', 'б', 'н', 'м', 'ч', 'з', '.'],
  ],
};

const FINGER_COLORS: Record<FingerName, string> = {
  pinky_left: 'var(--red, #f44336)',
  ring_left: 'var(--yellow, #ff9800)',
  middle_left: 'var(--green, #4caf50)',
  index_left: 'var(--accent, #e8751a)',
  index_right: 'var(--accent, #e8751a)',
  middle_right: 'var(--green, #4caf50)',
  ring_right: 'var(--yellow, #ff9800)',
  pinky_right: 'var(--red, #f44336)',
};

const HOME_KEYS: Record<string, Record<FingerName, string>> = {
  qwerty: {
    pinky_left: 'a',
    ring_left: 's',
    middle_left: 'd',
    index_left: 'f',
    index_right: 'j',
    middle_right: 'k',
    ring_right: 'l',
    pinky_right: ';',
  },
  dvorak: {
    pinky_left: 'a',
    ring_left: 'o',
    middle_left: 'e',
    index_left: 'u',
    index_right: 'h',
    middle_right: 't',
    ring_right: 'n',
    pinky_right: 's',
  },
  'йцукен': {
    pinky_left: 'ф',
    ring_left: 'ы',
    middle_left: 'в',
    index_left: 'а',
    index_right: 'о',
    middle_right: 'л',
    ring_right: 'д',
    pinky_right: 'ж',
  },
  'яверты': {
    pinky_left: 'а',
    ring_left: 'с',
    middle_left: 'д',
    index_left: 'ф',
    index_right: 'й',
    middle_right: 'к',
    ring_right: 'л',
    pinky_right: 'э',
  },
};

const LEFT_FINGERS: FingerName[] = ['pinky_left', 'ring_left', 'middle_left', 'index_left'];
const RIGHT_FINGERS: FingerName[] = ['index_right', 'middle_right', 'ring_right', 'pinky_right'];

type KeyPointMap = Record<string, { x: number; y: number }>;
const PALM_RX = 70;
const PALM_RY = 22;
const FINGER_BASE_OFFSETS = [-54, -18, 18, 54] as const;

function averagePoints(points: Array<{ x: number; y: number }>) {
  if (!points.length) return { x: 0, y: 0 };
  return {
    x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
  };
}

function pointOnEllipseTop(center: { x: number; y: number }, offsetX: number) {
  const ratio = Math.max(-1, Math.min(1, offsetX / PALM_RX));
  const yOffset = PALM_RY * Math.sqrt(1 - ratio * ratio);
  return {
    x: center.x + offsetX,
    y: center.y - yOffset,
  };
}

function lerpPoint(a: { x: number; y: number }, b: { x: number; y: number }, t: number) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

function buildFingerStyle(base: { x: number; y: number }, tip: { x: number; y: number }): CSSProperties {
  const dx = tip.x - base.x;
  const dy = tip.y - base.y;
  const length = Math.max(16, Math.sqrt(dx * dx + dy * dy));
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  return {
    left: `${base.x}px`,
    top: `${base.y}px`,
    width: `${length}px`,
    transform: `translateY(-50%) rotate(${angle}deg)`,
  };
}

export function Keyboard() {
  const { currentLayout, layouts, activeChar, currentMode, settings } = useApp();
  const layout = layouts.layouts[currentLayout];
  const stageRef = useRef<HTMLDivElement | null>(null);
  const keyRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const [keyPoints, setKeyPoints] = useState<KeyPointMap>({});

  const hidden = !settings.showKeyboard
    || currentMode === 'stats' || currentMode === 'settings';

  const fingerMap = useMemo(() => {
    if (!layout) return {} as Record<string, FingerName>;
    const map = {} as Record<string, FingerName>;
    for (const [finger, keys] of Object.entries(layout.fingers)) {
      for (const k of keys) map[k.toLowerCase()] = finger as FingerName;
    }
    return map;
  }, [layout]);

  const rows = KB_ROWS[currentLayout] || KB_ROWS.qwerty;
  const target = activeChar === ' ' ? ' ' : activeChar?.toLowerCase();
  const activeFinger = target && target !== ' ' ? fingerMap[target] : undefined;
  const targetUsesThumb = target === ' ';
  const homeKeys = HOME_KEYS[currentLayout] ?? HOME_KEYS.qwerty;

  const measureKeys = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const stageRect = stage.getBoundingClientRect();
    const next: KeyPointMap = {};

    for (const [key, el] of Object.entries(keyRefs.current)) {
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      next[key] = {
        x: rect.left - stageRect.left + rect.width / 2,
        y: rect.top - stageRect.top + rect.height / 2,
      };
    }

    setKeyPoints(next);
  }, []);

  useLayoutEffect(() => {
    measureKeys();
    const stage = stageRef.current;
    if (!stage) return undefined;

    const onResize = () => measureKeys();
    window.addEventListener('resize', onResize);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => measureKeys());
      observer.observe(stage);
    }

    return () => {
      window.removeEventListener('resize', onResize);
      observer?.disconnect();
    };
  }, [measureKeys, currentLayout, rows.length]);

  const handGuides = useMemo(() => {
    const leftHomes = LEFT_FINGERS.map(finger => keyPoints[homeKeys[finger]]).filter(Boolean);
    const rightHomes = RIGHT_FINGERS.map(finger => keyPoints[homeKeys[finger]]).filter(Boolean);
    const spacePoint = keyPoints[' '];

    if (leftHomes.length !== LEFT_FINGERS.length || rightHomes.length !== RIGHT_FINGERS.length || !spacePoint) {
      return null;
    }

    const leftPalm = {
      x: averagePoints(leftHomes).x + 12,
      y: averagePoints(leftHomes).y + 66,
    };
    const rightPalm = {
      x: averagePoints(rightHomes).x - 12,
      y: averagePoints(rightHomes).y + 66,
    };

    const fingerTips = Object.fromEntries(
      Object.entries(homeKeys).map(([finger, key]) => [finger, keyPoints[key]]),
    ) as Record<FingerName, { x: number; y: number }>;

    if (target && target !== ' ' && activeFinger && keyPoints[target]) {
      fingerTips[activeFinger] = keyPoints[target];
    }

    return {
      leftPalm,
      rightPalm,
      fingerTips,
    };
  }, [keyPoints, homeKeys, target, activeFinger]);

  if (hidden) return null;

  return (
    <div id="keyboard-wrap">
      <div className="keyboard-stage static-hands" ref={stageRef}>
        {handGuides && (
          <>
            <div className="keyboard-palms-layer" aria-hidden="true">
              <div
                className="keyboard-palm left"
                style={{
                  left: `${handGuides.leftPalm.x - PALM_RX}px`,
                  top: `${handGuides.leftPalm.y - PALM_RY}px`,
                  width: `${PALM_RX * 2}px`,
                  height: `${PALM_RY * 2}px`,
                }}
              />
              <div
                className="keyboard-palm right"
                style={{
                  left: `${handGuides.rightPalm.x - PALM_RX}px`,
                  top: `${handGuides.rightPalm.y - PALM_RY}px`,
                  width: `${PALM_RX * 2}px`,
                  height: `${PALM_RY * 2}px`,
                }}
              />
            </div>
            <div className="keyboard-finger-guides-layer" aria-hidden="true">
              {LEFT_FINGERS.map((finger, index) => {
                const base = pointOnEllipseTop(handGuides.leftPalm, FINGER_BASE_OFFSETS[index]);
                return (
                  <div
                    key={finger}
                    className={`keyboard-finger-guide${activeFinger === finger ? ' active' : ''}`}
                    style={{
                      ...buildFingerStyle(base, handGuides.fingerTips[finger]),
                      '--finger-color': FINGER_COLORS[finger],
                    } as CSSProperties}
                  >
                    <span className="keyboard-finger-guide-tip" />
                  </div>
                );
              })}
              {RIGHT_FINGERS.map((finger, index) => {
                const base = pointOnEllipseTop(handGuides.rightPalm, FINGER_BASE_OFFSETS[index]);
                return (
                  <div
                    key={finger}
                    className={`keyboard-finger-guide${activeFinger === finger ? ' active' : ''}`}
                    style={{
                      ...buildFingerStyle(base, handGuides.fingerTips[finger]),
                      '--finger-color': FINGER_COLORS[finger],
                    } as CSSProperties}
                  >
                    <span className="keyboard-finger-guide-tip" />
                  </div>
                );
              })}
              {(() => {
                const leftThumbBase = {
                  x: handGuides.leftPalm.x + PALM_RX - 10,
                  y: handGuides.leftPalm.y - 2,
                };
                const rightThumbBase = {
                  x: handGuides.rightPalm.x - PALM_RX + 10,
                  y: handGuides.rightPalm.y - 2,
                };
                const leftThumbTip = {
                  x: keyPoints[' '].x - 28,
                  y: keyPoints[' '].y + 7,
                };
                const rightThumbTip = {
                  x: keyPoints[' '].x + 28,
                  y: keyPoints[' '].y + 7,
                };

                return (
                  <>
                    <div
                      className={`keyboard-thumb-guide left${targetUsesThumb ? ' active' : ''}`}
                      style={buildFingerStyle(leftThumbBase, leftThumbTip)}
                    >
                      <span className="keyboard-finger-guide-tip" />
                    </div>
                    <div
                      className={`keyboard-thumb-guide right${targetUsesThumb ? ' active' : ''}`}
                      style={buildFingerStyle(rightThumbBase, rightThumbTip)}
                    >
                      <span className="keyboard-finger-guide-tip" />
                    </div>
                  </>
                );
              })()}
            </div>
          </>
        )}

        <div id="keyboard">
          {rows.map((row, ri) => (
            <div className="kb-row" key={ri}>
              {row.map(key => {
                const finger = fingerMap[key.toLowerCase()];
                const isActive = key === target;
                const keyStyle = (finger
                  ? { '--finger-color': FINGER_COLORS[finger], borderBottomColor: FINGER_COLORS[finger] }
                  : { '--finger-color': 'transparent', borderBottomColor: 'transparent' }) as CSSProperties;

                return (
                  <span
                    key={key}
                    ref={el => { keyRefs.current[key] = el; }}
                    className={`kb-key${isActive ? ' active' : ''}`}
                    style={keyStyle}
                  >
                    <span className="kb-key-main">{key}</span>
                  </span>
                );
              })}
            </div>
          ))}
          <div className="kb-row">
            <span
              ref={el => { keyRefs.current[' '] = el; }}
              className={`kb-key kb-space${target === ' ' ? ' active' : ''}`}
            >
              <span className="kb-key-main">⎵</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
