import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { Progress } from '../../shared/types';

export type ProgressUpdater = (prev: Progress) => Progress;
export type PersistProgress = (next: Progress) => void;

type CommitProgressUpdateArgs = {
  setProgress: Dispatch<SetStateAction<Progress>>;
  persistProgress: PersistProgress;
  updater: ProgressUpdater;
  progressRef?: MutableRefObject<Progress>;
};

export function commitProgressUpdate({
  setProgress,
  persistProgress,
  updater,
  progressRef,
}: CommitProgressUpdateArgs) {
  setProgress(prev => {
    const next = updater(prev);
    if (next === prev) return prev;
    if (progressRef) progressRef.current = next;
    persistProgress(next);
    return next;
  });
}
