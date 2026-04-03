import { useMemo, type CSSProperties } from 'react';
import handsSvgRaw from '../../../data/hands.svg';

export type HandPoseSide = 'left' | 'right' | 'both';

interface KeyboardHandsProps {
  poseKey: string;
  activeHand?: HandPoseSide;
  style?: CSSProperties;
}

interface ParsedHandsSvg {
  attrs: string;
  groups: Record<string, Partial<Record<'left' | 'right', string>>>;
}

function parseHandsSvg(): ParsedHandsSvg {
  const parser = new DOMParser();
  const doc = parser.parseFromString(handsSvgRaw, 'image/svg+xml');
  const svg = doc.documentElement;
  const attrs = Array.from(svg.attributes)
    .map(attr => `${attr.name}="${attr.value}"`)
    .join(' ');

  const groups: ParsedHandsSvg['groups'] = {};

  for (const child of Array.from(svg.children)) {
    if (!(child instanceof SVGGElement)) continue;
    if (!child.classList.contains('hands_svg__hand')) continue;

    const key = child.getAttribute('data-key');
    if (!key) continue;

    const side = child.classList.contains('hands_svg__left')
      ? 'left'
      : child.classList.contains('hands_svg__right')
        ? 'right'
        : null;

    if (!side) continue;

    groups[key] ??= {};
    groups[key][side] = child.outerHTML;
  }

  return { attrs, groups };
}

const PARSED_HANDS = parseHandsSvg();

export function hasKeyboardHandPose(poseKey: string) {
  return Boolean(PARSED_HANDS.groups[poseKey]);
}

function resolveVisibleGroups(poseKey: string, activeHand?: HandPoseSide) {
  const neutralLeft = PARSED_HANDS.groups.neutral?.left ?? '';
  const neutralRight = PARSED_HANDS.groups.neutral?.right ?? '';
  const poseLeft = PARSED_HANDS.groups[poseKey]?.left ?? neutralLeft;
  const poseRight = PARSED_HANDS.groups[poseKey]?.right ?? neutralRight;

  if (activeHand === 'both') {
    return [poseLeft, poseRight].filter(Boolean);
  }

  if (activeHand === 'left') {
    return [poseLeft, neutralRight].filter(Boolean);
  }

  if (activeHand === 'right') {
    return [neutralLeft, poseRight].filter(Boolean);
  }

  return [neutralLeft, neutralRight].filter(Boolean);
}

export function KeyboardHands({ poseKey, activeHand, style }: KeyboardHandsProps) {
  const markup = useMemo(() => {
    const groups = resolveVisibleGroups(poseKey, activeHand).join('');

    return `<svg class="keyboard-hands-svg" ${PARSED_HANDS.attrs} preserveAspectRatio="xMidYMid meet">${groups}</svg>`;
  }, [poseKey, activeHand]);

  return (
    <div
      className="keyboard-svg-hands-layer"
      style={style}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
