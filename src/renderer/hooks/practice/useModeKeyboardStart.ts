import { useEffect } from 'react';

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
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isPrintable = event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey;
      const isBackspace = event.key === 'Backspace';

      if (!sessionActive && resultVisible && isPrintable) {
        onRetry(event);
        return;
      }

      if (!sessionActive && overlayVisible && previewText && isPrintable) {
        onStart(event);
        return;
      }

      if (!sessionActive) return;
      if (isPrintable || isBackspace) handleKey(event);
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handleKey, onRetry, onStart, overlayVisible, previewText, resultVisible, sessionActive]);
}
