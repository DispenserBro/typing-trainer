import { useEffect, useRef, useState } from 'react';

type UseModePreviewStateArgs = {
  buildText: () => string;
  enabled: boolean;
  onPreviewReset?: () => void;
  onResultReset?: () => void;
  previewKey: string;
  sessionActive: boolean;
};

export function useModePreviewState({
  buildText,
  enabled,
  onPreviewReset,
  onResultReset,
  previewKey,
  sessionActive,
}: UseModePreviewStateArgs) {
  const [showOverlay, setShowOverlay] = useState(true);
  const [text, setText] = useState('');
  const previewKeyRef = useRef('');

  useEffect(() => {
    if (sessionActive) {
      setShowOverlay(false);
    }
  }, [sessionActive]);

  useEffect(() => {
    if (!enabled) return;
    if (previewKeyRef.current === previewKey) return;
    previewKeyRef.current = previewKey;
    setText(buildText());
    if (!sessionActive) {
      setShowOverlay(true);
    }
    onResultReset?.();
    onPreviewReset?.();
  }, [buildText, enabled, onPreviewReset, onResultReset, previewKey, sessionActive]);

  return {
    setShowOverlay,
    setText,
    showOverlay,
    text,
  };
}
