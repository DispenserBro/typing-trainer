import {
  useMemo, useRef, useState, useLayoutEffect, useCallback,
  type CSSProperties,
} from 'react';
import type { FingerName } from '../../../shared/types';
import { useApp, useAppUi } from '../../contexts/AppContext';
import { KeyboardHands } from './KeyboardHands';
import { getKeyboardRows } from '../../../core/keyboard/layout';
import { useKeyboardPanel } from '../../hooks/keyboard/useKeyboardPanel';
import { computeHandsStyle, FINGER_COLORS, getActiveHand, getKeyboardActivePose } from '../../../core/keyboard/scene';

export function Keyboard() {
  const {
    currentLayout, layouts, currentMode, settings, saveSetting,
  } = useApp();
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

  const rows = getKeyboardRows(currentLayout);
  const target = activeChar === ' ' ? ' ' : activeChar?.toLowerCase();
  const activeFinger = target && target !== ' ' ? fingerMap[target] : undefined;
  const activeHand = getActiveHand(target, activeFinger);

  const activePose = useMemo(
    () => getKeyboardActivePose(currentLayout, rows, target),
    [currentLayout, rows, target],
  );

  const measureHandsFrame = useCallback(() => {
    const stage = stageRef.current;
    const keyboard = keyboardRef.current;
    if (!stage || !keyboard || rows.length < 2 || !showStage) return;

    const middleRowKeys = rows[1]
      .map(key => keyRefs.current[key])
      .filter((el): el is HTMLSpanElement => Boolean(el));

    if (!middleRowKeys.length) return;

    const nextHandsStyle = computeHandsStyle(
      stage.getBoundingClientRect(),
      keyboard.getBoundingClientRect(),
      middleRowKeys.map(el => el.getBoundingClientRect()),
    );

    setHandsStyle(nextHandsStyle);
  }, [rows, showStage, keyboardScale]);

  useLayoutEffect(() => {
    if (!showStage) {
      setHandsStyle(undefined);
      return undefined;
    }

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
  }, [measureHandsFrame, currentLayout, showStage, keyboardScale]);

  if (hidden) return null;

  const wrapStyle = {
    height: `${panelHeight}px`,
    ['--kb-panel-scale' as string]: `${keyboardScale}`,
    ['--kb-panel-offset' as string]: `${settings.keyboardPanelOffset}`,
    ['--kb-hands-opacity' as string]: `${settings.handsOpacity / 100}`,
    ['--kb-key-stroke' as string]: `${settings.keyStrokeWidth}px`,
  } as CSSProperties;

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
        )}
      </div>
    </div>
  );
}

