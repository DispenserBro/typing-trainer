import {
  useMemo, useRef, useState, useLayoutEffect, useCallback, type CSSProperties,
} from 'react';
import type { FingerName } from '../../shared/types';
import { useApp } from '../contexts/AppContext';
import { KeyboardHands, hasKeyboardHandPose, type HandPoseSide } from './KeyboardHands';

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

const TOP_ROW_POSES = ['key-1', 'key-2', 'key-3', 'key-4', 'key-5', 'key-6', 'key-7', 'key-8', 'key-9', 'key-0', 'minus', 'equal'] as const;
const SVG_EXACT_LAYOUTS = new Set(['йцукен', 'яверты']);

const HANDS_VIEWBOX_WIDTH = 716.3;
const HANDS_VIEWBOX_HEIGHT = 380;
const HANDS_WIDTH_RATIO = 1.06;
const HANDS_HOME_ROW_RATIO = 0.41;
const HANDS_CENTER_SHIFT_IN_KEYS = 1.2;

function getExactSvgPoseKey(layoutName: string, key: string) {
  if (!SVG_EXACT_LAYOUTS.has(layoutName)) return null;

  if (/^[а-я]$/i.test(key)) {
    const exactKey = `${key}${key.toUpperCase()}`;
    return hasKeyboardHandPose(exactKey) ? exactKey : null;
  }

  if (key === '.') {
    return hasKeyboardHandPose('.,') ? '.,' : null;
  }

  return null;
}

export function Keyboard() {
  const { currentLayout, layouts, activeChar, currentMode, settings } = useApp();
  const layout = layouts.layouts[currentLayout];
  const stageRef = useRef<HTMLDivElement | null>(null);
  const keyboardRef = useRef<HTMLDivElement | null>(null);
  const keyRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const [handsStyle, setHandsStyle] = useState<CSSProperties | undefined>(undefined);

  const hidden = !settings.showKeyboard
    || currentMode === 'stats' || currentMode === 'settings';
  const showHands = settings.showHands;

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
  const activeHand: HandPoseSide | undefined = target === ' '
    ? 'both'
    : activeFinger?.endsWith('_left')
      ? 'left'
      : activeFinger?.endsWith('_right')
        ? 'right'
        : undefined;

  const activePose = useMemo(() => {
    if (!target) return 'neutral';
    if (target === ' ') return 'space';
    if (target === '\\' || target === '|') return 'backslash';
    if (target === '`' || target === '~') return 'tilda';

    const exactPoseKey = getExactSvgPoseKey(currentLayout, target);
    if (exactPoseKey) return exactPoseKey;

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const keyIndex = rows[rowIndex].findIndex(key => key.toLowerCase() === target);
      if (keyIndex === -1) continue;

      if (rowIndex === 0) {
        return TOP_ROW_POSES[keyIndex] ?? 'neutral';
      }

      if (rowIndex === 1) {
        if (keyIndex === 0) return 'tab';
        if (keyIndex === rows[rowIndex].length - 1) return 'enter';
        return 'neutral';
      }

      if (rowIndex === 2) {
        if (keyIndex === 0) return 'shift-left';
        if (keyIndex === rows[rowIndex].length - 1) return 'shift-right';
        return 'neutral';
      }
    }

    return 'neutral';
  }, [currentLayout, rows, target]);

  const measureHandsFrame = useCallback(() => {
    const stage = stageRef.current;
    const keyboard = keyboardRef.current;
    if (!stage || !keyboard || rows.length < 2) return;

    const middleRowKeys = rows[1]
      .map(key => keyRefs.current[key])
      .filter((el): el is HTMLSpanElement => Boolean(el));

    if (!middleRowKeys.length) return;

    const stageRect = stage.getBoundingClientRect();
    const keyboardRect = keyboard.getBoundingClientRect();
    const keyRects = middleRowKeys.map(el => el.getBoundingClientRect());
    const averageKeyWidth = keyRects.reduce((sum, rect) => sum + rect.width, 0) / keyRects.length;
    const middleRowCenterY = keyRects.reduce((sum, rect) => sum + rect.top + rect.height / 2, 0) / keyRects.length
      - stageRect.top;

    const keyboardCenterX = keyboardRect.left - stageRect.left + keyboardRect.width / 2;
    const handsWidth = keyboardRect.width * HANDS_WIDTH_RATIO;
    const handsHeight = handsWidth * (HANDS_VIEWBOX_HEIGHT / HANDS_VIEWBOX_WIDTH);
    const top = middleRowCenterY - handsHeight * HANDS_HOME_ROW_RATIO;
    const left = keyboardCenterX + averageKeyWidth * HANDS_CENTER_SHIFT_IN_KEYS;

    setHandsStyle({
      left: `${left}px`,
      top: `${top}px`,
      width: `${handsWidth}px`,
      transform: 'translateX(-50%)',
    });
  }, [rows]);

  useLayoutEffect(() => {
    measureHandsFrame();

    const stage = stageRef.current;
    const keyboard = keyboardRef.current;
    if (!stage || !keyboard) return undefined;

    const onResize = () => measureHandsFrame();
    window.addEventListener('resize', onResize);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => measureHandsFrame());
      observer.observe(stage);
      observer.observe(keyboard);
      Object.values(keyRefs.current).forEach((el) => {
        if (el) observer?.observe(el);
      });
    }

    return () => {
      window.removeEventListener('resize', onResize);
      observer?.disconnect();
    };
  }, [measureHandsFrame, currentLayout]);

  if (hidden) return null;

  return (
    <div id="keyboard-wrap">
      <div className="keyboard-stage svg-hands" ref={stageRef}>
        {showHands && <KeyboardHands poseKey={activePose} activeHand={activeHand} style={handsStyle} />}

        <div id="keyboard" ref={keyboardRef}>
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
