import { useEffect, useRef } from 'react';
import type { GameRunEventState, GameRunResult } from '../../../shared/types';

type UseGameResultFocusArgs = {
  eventPending: boolean;
  mapSelectionPending: boolean;
  pendingEvent: GameRunEventState | null;
  result: GameRunResult | null;
  rewardPending: boolean;
  selectedRewardMessage: string | null;
  sessionActive: boolean;
};

export function useGameResultFocus({
  eventPending,
  mapSelectionPending,
  pendingEvent,
  result,
  rewardPending,
  selectedRewardMessage,
  sessionActive,
}: UseGameResultFocusArgs) {
  const resultActionRef = useRef<HTMLButtonElement | null>(null);
  const rewardChoiceRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const eventChoiceRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!rewardPending) return;
    const nextButton = rewardChoiceRefs.current.find(Boolean);
    nextButton?.focus({ preventScroll: true });
  }, [rewardPending]);

  useEffect(() => {
    if (!eventPending) return;
    const nextButton = eventChoiceRefs.current.find(Boolean);
    nextButton?.focus({ preventScroll: true });
  }, [eventPending]);

  useEffect(() => {
    if (!pendingEvent || eventPending || result || sessionActive) return;
    resultActionRef.current?.focus({ preventScroll: true });
  }, [eventPending, pendingEvent, result, sessionActive]);

  useEffect(() => {
    if (!result || sessionActive || rewardPending || mapSelectionPending || eventPending) return;
    resultActionRef.current?.focus({ preventScroll: true });
  }, [eventPending, mapSelectionPending, result, rewardPending, selectedRewardMessage, sessionActive]);

  return {
    eventChoiceRefs,
    resultActionRef,
    rewardChoiceRefs,
  };
}
