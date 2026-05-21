import { useEffect, useRef } from 'react';

type UseModeKeyboardStartArgs = {
  handleKey: (event: KeyboardEvent) => void;
  onRetry: (event?: KeyboardEvent) => void;
  onStart: (event?: KeyboardEvent) => void;
  overlayVisible: boolean;
  previewText: string;
  resultVisible: boolean;
  sessionActive: boolean;
};

export function useModeKeyboardStart({
  handleKey,
  onRetry,
  onStart,
  overlayVisible,
  previewText,
  resultVisible,
  sessionActive,
}: UseModeKeyboardStartArgs) {
  const latestRef = useRef({
    handleKey,
    onRetry,
    onStart,
    overlayVisible,
    previewText,
    resultVisible,
    sessionActive,
  });

  latestRef.current = {
    handleKey,
    onRetry,
    onStart,
    overlayVisible,
    previewText,
    resultVisible,
    sessionActive,
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const latest = latestRef.current;
      const isPrintable = event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey;
      const isBackspace = event.key === 'Backspace';

      if (!latest.sessionActive && latest.resultVisible && isPrintable) {
        latest.onRetry(event);
        return;
      }

      if (!latest.sessionActive && latest.overlayVisible && latest.previewText && isPrintable) {
        latest.onStart(event);
        return;
      }

      if (!latest.sessionActive) return;
      if (isPrintable || isBackspace) latest.handleKey(event);
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
}
