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
  const buildTextRef = useRef(buildText);
  const onPreviewResetRef = useRef(onPreviewReset);
  const onResultResetRef = useRef(onResultReset);
  const previewKeyRef = useRef('');
  const sessionActiveRef = useRef(sessionActive);

  buildTextRef.current = buildText;
  onPreviewResetRef.current = onPreviewReset;
  onResultResetRef.current = onResultReset;
  sessionActiveRef.current = sessionActive;

  useEffect(() => {
    if (sessionActive) {
      setShowOverlay(false);
    }
  }, [sessionActive]);

  useEffect(() => {
    if (!enabled) return;
    if (previewKeyRef.current === previewKey) return;
    previewKeyRef.current = previewKey;
    setText(buildTextRef.current());
    if (!sessionActiveRef.current) {
      setShowOverlay(true);
    }
    onResultResetRef.current?.();
    onPreviewResetRef.current?.();
  }, [enabled, previewKey]);

  return {
    setShowOverlay,
    setText,
    showOverlay,
    text,
  };
}
