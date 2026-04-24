import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { flushSync } from 'react-dom';

const MIN_PANEL_HEIGHT = 22;
const MAX_PANEL_HEIGHT = 520;
export const COLLAPSED_STAGE_HEIGHT = 74;
const MIN_PANEL_SCALE = 0.34;

export function useKeyboardPanel(
  savedHeight: number,
  savedZoom: number,
  hidden: boolean,
  saveHeight: (height: number) => void,
) {
  const dragStartYRef = useRef(0);
  const dragStartHeightRef = useRef(savedHeight);
  const panelHeightRef = useRef(savedHeight);
  const panelZoomRef = useRef(savedZoom);
  const draggingRef = useRef(false);
  const [panelHeight, setPanelHeight] = useState(savedHeight);
  const [panelZoom, setPanelZoom] = useState(savedZoom);

  const showStage = panelHeight > COLLAPSED_STAGE_HEIGHT;
  const autoKeyboardScale = showStage
    ? Math.max(MIN_PANEL_SCALE, Math.min(1, panelHeight / MAX_PANEL_HEIGHT))
    : 1;
  const userKeyboardScale = Math.max(0.1, Math.min(3, panelZoom / 100));
  const keyboardScale = autoKeyboardScale * userKeyboardScale;

  useLayoutEffect(() => {
    if (draggingRef.current) return;
    if (panelHeightRef.current === savedHeight) return;
    setPanelHeight(savedHeight);
    panelHeightRef.current = savedHeight;
  }, [savedHeight]);

  useLayoutEffect(() => {
    if (panelZoomRef.current === savedZoom) return;
    setPanelZoom(savedZoom);
    panelZoomRef.current = savedZoom;
  }, [savedZoom]);

  useEffect(() => {
    if (hidden) return undefined;

    const applyDraggedHeight = (clientY: number) => {
      const deltaY = clientY - dragStartYRef.current;
      const nextHeight = Math.max(
        MIN_PANEL_HEIGHT,
        Math.min(MAX_PANEL_HEIGHT, dragStartHeightRef.current - deltaY),
      );
      panelHeightRef.current = nextHeight;
      setPanelHeight(nextHeight);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!draggingRef.current) return;
      applyDraggedHeight(event.clientY);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!draggingRef.current) return;
      flushSync(() => {
        applyDraggedHeight(event.clientY);
      });
      draggingRef.current = false;
      saveHeight(panelHeightRef.current);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [hidden, saveHeight]);

  const startResize = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    draggingRef.current = true;
    dragStartYRef.current = event.clientY;
    dragStartHeightRef.current = panelHeightRef.current;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);

  return {
    panelHeight,
    keyboardScale,
    showStage,
    startResize,
  };
}
