import {
  useMemo, useRef, useState, useLayoutEffect, useCallback,
  type CSSProperties,
} from 'react';
import type { FingerName } from '../../../shared/types';
import {
  useAppNavigation,
  useAppPractice,
  useAppSettings,
  useAppUi,
} from '../../contexts/AppContext';
import { KeyboardHands } from './KeyboardHands';
import { getKeyboardRows } from '../../../core/keyboard/layout';
import { useKeyboardPanel } from '../../hooks/keyboard/useKeyboardPanel';
import { computeHandsStyle, FINGER_COLORS, getActiveHand, getKeyboardActivePose } from '../../../core/keyboard/scene';

export function Keyboard() {
  const { currentMode } = useAppNavigation();
  const { layouts } = useAppPractice();
  const { currentLayout, settings, saveSetting } = useAppSettings();
  const { activeChar, keyboardPreviewActive } = useAppUi();
  const layout = layouts.layouts[currentLayout];
  const stageRef = useRef<HTMLDivElement | null>(null);
  const keyboardRef = useRef<HTMLDivElement | null>(null);
  const keyRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const [handsStyle, setHandsStyle] = useState<CSSProperties | undefined>(undefined);

  const hidden = !settings.showKeyboard
    || currentMode === 'home'
    || currentMode === 'stats' || (currentMode === 'settings' && !keyboardPreviewActive);
  const showHands = settings.showHands;
  const {
    panelHeight,
    keyboardScale,
    showStage,
    startResize,
  } = useKeyboardPanel(settings.keyboardPanelHeight, settings.keyboardPanelZoom, hidden, (height) => {
    saveSetting('keyboardPanelHeight', height);
  });

  const fingerMap = useMemo(() => {
    if (!layout) return {} as Record<string, FingerName>;
    const map = {} as Record<string, FingerName>;
    for (const [finger, keys] of Object.entries(layout.fingers)) {
      for (const k of keys) map[k.toLowerCase()] = finger as FingerName;
    }
    return map;
  }, [layout]);

  const rows = useMemo(() => getKeyboardRows(currentLayout), [currentLayout]);
  const target = activeChar === ' ' ? ' ' : activeChar?.toLowerCase();
  const activeFinger = target && target !== ' ' ? fingerMap[target] : undefined;
  const activeHand = getActiveHand(target, activeFinger);
  const keyStyleByFinger = useMemo(() => {
    const styles: Partial<Record<FingerName, CSSProperties>> = {};
    for (const finger of Object.keys(FINGER_COLORS) as FingerName[]) {
      styles[finger] = {
        '--finger-color': FINGER_COLORS[finger],
        borderBottomColor: FINGER_COLORS[finger],
      } as CSSProperties;
    }
    return styles;
  }, []);
  const transparentKeyStyle = useMemo(() => ({
    '--finger-color': 'transparent',
    borderBottomColor: 'transparent',
  }) as CSSProperties, []);

  const activePose = useMemo(
    () => getKeyboardActivePose(currentLayout, rows, target),
    [currentLayout, rows, target],
  );

  const measureHandsFrame = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || rows.length < 2 || !showStage || hidden) return;

    const keyRects = rows
      .flatMap(row => row)
      .map(key => keyRefs.current[key])
      .filter((el): el is HTMLSpanElement => Boolean(el))
      .map(el => el.getBoundingClientRect());

    const spaceKey = keyRefs.current[' '];
    if (spaceKey) {
      keyRects.push(spaceKey.getBoundingClientRect());
    }

    const middleRowKeys = rows[1]
      .map(key => keyRefs.current[key])
      .filter((el): el is HTMLSpanElement => Boolean(el));

    if (!middleRowKeys.length || !keyRects.length) return;

    const nextHandsStyle = computeHandsStyle(
      stage.getBoundingClientRect(),
      keyRects,
      middleRowKeys.map(el => el.getBoundingClientRect()),
    );

    setHandsStyle(nextHandsStyle);
  }, [rows, showStage, keyboardScale, hidden]);

  useLayoutEffect(() => {
    if (!showStage || hidden) {
      setHandsStyle(undefined);
      return undefined;
    }

    measureHandsFrame();

    const stage = stageRef.current;
    const keyboard = keyboardRef.current;
    if (!stage || !keyboard) return undefined;

    const frameIds: number[] = [];
    const timeoutIds: number[] = [];

    const scheduleMeasure = (delayMs?: number) => {
      if (typeof delayMs === 'number') {
        const timeoutId = window.setTimeout(() => measureHandsFrame(), delayMs);
        timeoutIds.push(timeoutId);
        return;
      }

      const frameId = window.requestAnimationFrame(() => measureHandsFrame());
      frameIds.push(frameId);
    };

    // A few late passes make the hand layer robust against first-paint layout shifts,
    // responsive CSS variable application, and late font metrics settling.
    scheduleMeasure();
    const secondFrameId = window.requestAnimationFrame(() => {
      measureHandsFrame();
      const nestedFrameId = window.requestAnimationFrame(() => measureHandsFrame());
      frameIds.push(nestedFrameId);
    });
    frameIds.push(secondFrameId);
    scheduleMeasure(80);

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

    const fonts = 'fonts' in document ? document.fonts : null;
    fonts?.ready.then(() => {
      measureHandsFrame();
    }).catch(() => {
      // Ignore font readiness failures; fallback passes above already cover layout recovery.
    });

    return () => {
      window.removeEventListener('resize', onResize);
      observer?.disconnect();
      frameIds.forEach(id => window.cancelAnimationFrame(id));
      timeoutIds.forEach(id => window.clearTimeout(id));
    };
  }, [measureHandsFrame, currentLayout, showStage, keyboardScale, hidden]);

  const wrapStyle = useMemo(() => ({
    height: `${panelHeight}px`,
    ['--kb-panel-scale' as string]: `${keyboardScale}`,
    ['--kb-panel-offset' as string]: `${settings.keyboardPanelOffset}`,
    ['--kb-hands-opacity' as string]: `${settings.handsOpacity / 100}`,
    ['--kb-key-stroke' as string]: `${settings.keyStrokeWidth}px`,
  }) as CSSProperties, [
    keyboardScale,
    panelHeight,
    settings.handsOpacity,
    settings.keyStrokeWidth,
    settings.keyboardPanelOffset,
  ]);

  if (hidden) return null;

  return (
    <div id="keyboard-wrap" style={wrapStyle}>
      <button
        type="button"
        className="keyboard-resize-handle"
        aria-label="Изменить высоту блока клавиатуры"
        onPointerDown={startResize}
      >
        <span />
      </button>
      <div className={`keyboard-wrap-body${showStage ? '' : ' collapsed'}`}>
        {showStage && (
          <div className="keyboard-stage svg-hands" ref={stageRef}>
            {showHands && <KeyboardHands poseKey={activePose} activeHand={activeHand} style={handsStyle} />}

            <div id="keyboard" ref={keyboardRef}>
              {rows.map((row, ri) => (
                <div className="kb-row" key={ri}>
                  {row.map(key => {
                    const finger = fingerMap[key.toLowerCase()];
                    const isActive = key === target;
                    const keyStyle = finger ? keyStyleByFinger[finger] : transparentKeyStyle;

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
        )}
      </div>
    </div>
  );
}
