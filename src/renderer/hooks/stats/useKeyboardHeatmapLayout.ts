import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';
import { ROW_OFFSET_UNITS } from '../../components/stats/keyboardHeatmapUtils';

type UseKeyboardHeatmapLayoutParams = {
  responsive: boolean;
  rows: string[][];
  cardRef: RefObject<HTMLDivElement | null>;
  heatmapWrapRef: RefObject<HTMLDivElement | null>;
};

export function useKeyboardHeatmapLayout({
  responsive,
  rows,
  cardRef,
  heatmapWrapRef,
}: UseKeyboardHeatmapLayoutParams) {
  const [responsiveStyle, setResponsiveStyle] = useState<CSSProperties | undefined>(undefined);

  useLayoutEffect(() => {
    if (!responsive) {
      setResponsiveStyle(undefined);
      return undefined;
    }

    const node = heatmapWrapRef.current ?? cardRef.current;
    if (!node) return undefined;

    const applyResponsiveScale = () => {
      const width = node.clientWidth;
      if (!width) return;

      const padding = Math.max(8, Math.min(12, Math.round(width * 0.012)));
      const gap = Math.max(3, Math.min(6, Math.round(width * 0.004)));
      const stackGap = Math.max(6, Math.min(8, Math.round(width * 0.006)));
      const usableWidth = Math.max(220, width - padding * 2);
      const rowUnits = rows.map((row, index) => row.length + (ROW_OFFSET_UNITS[index] ?? 0));
      const maxUnits = Math.max(...rowUnits, 12);
      const keyWidth = Math.max(
        22,
        Math.min(58, Math.floor((usableWidth - gap * (maxUnits - 1)) / maxUnits)),
      );

      setResponsiveStyle({
        ['--keyboard-heatmap-key-w' as string]: `${keyWidth}px`,
        ['--keyboard-heatmap-key-h' as string]: `${Math.round(keyWidth * 0.94)}px`,
        ['--keyboard-heatmap-gap' as string]: `${gap}px`,
        padding: `${padding}px`,
        gap: `${stackGap}px`,
      });
    };

    applyResponsiveScale();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => applyResponsiveScale());
      observer.observe(node);
    } else {
      window.addEventListener('resize', applyResponsiveScale);
    }

    return () => {
      observer?.disconnect();
      if (!observer) window.removeEventListener('resize', applyResponsiveScale);
    };
  }, [responsive, rows, cardRef, heatmapWrapRef]);

  return responsiveStyle;
}
