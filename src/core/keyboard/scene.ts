import type { CSSProperties } from 'react';
import type { FingerName } from '../../shared/types';
import { hasKeyboardHandPose, type HandPoseSide } from '../../renderer/components/keyboard/KeyboardHands';

export const FINGER_COLORS: Record<FingerName, string> = {
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
const HANDS_WIDTH_RATIO = 2;
const HANDS_HOME_ROW_RATIO = 0.4;
const HANDS_CENTER_SHIFT_IN_KEYS = 1.35;

export function getActiveHand(target: string | undefined, activeFinger?: FingerName): HandPoseSide | undefined {
  if (target === ' ') return 'both';
  if (activeFinger?.endsWith('_left')) return 'left';
  if (activeFinger?.endsWith('_right')) return 'right';
  return undefined;
}

export function getExactSvgPoseKey(layoutName: string, key: string) {
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

export function getKeyboardActivePose(
  currentLayout: string,
  rows: string[][],
  target: string | undefined,
): string {
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
}

export function computeHandsStyle(
  stageRect: DOMRect,
  keyRects: DOMRect[],
  middleRowRects: DOMRect[],
): CSSProperties | undefined {
  if (!middleRowRects.length || !keyRects.length) return undefined;

  const averageKeyWidth = middleRowRects.reduce((sum, rect) => sum + rect.width, 0) / middleRowRects.length;
  const middleRowCenterY = middleRowRects.reduce((sum, rect) => sum + rect.top + rect.height / 2, 0) / middleRowRects.length
    - stageRect.top;
  const keyboardLeft = Math.min(...keyRects.map(rect => rect.left)) - stageRect.left;
  const keyboardRight = Math.max(...keyRects.map(rect => rect.right)) - stageRect.left;
  const keyboardWidth = keyboardRight - keyboardLeft;

  const keyboardCenterX = keyboardLeft + keyboardWidth / 2;
  const handsWidth = keyboardWidth * HANDS_WIDTH_RATIO;
  const handsHeight = handsWidth * (HANDS_VIEWBOX_HEIGHT / HANDS_VIEWBOX_WIDTH);
  const top = middleRowCenterY - handsHeight * HANDS_HOME_ROW_RATIO;
  const left = keyboardCenterX + averageKeyWidth * HANDS_CENTER_SHIFT_IN_KEYS;

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${handsWidth}px`,
    transform: 'translateX(-50%)',
  };
}

