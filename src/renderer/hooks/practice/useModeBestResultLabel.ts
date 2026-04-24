import { useMemo } from 'react';
import type { HistoryEntry } from '../../../shared/types';
import { pickBestHistoryEntry } from '../../../core/motivation/records';

type UseModeBestResultLabelArgs = {
  emptyLabel: string;
  entries: HistoryEntry[];
  formatSpeed: (value: number) => string;
  speedLabel: string;
};

export function useModeBestResultLabel({
  emptyLabel,
  entries,
  formatSpeed,
  speedLabel,
}: UseModeBestResultLabelArgs) {
  return useMemo(() => {
    const bestEntry = pickBestHistoryEntry(entries);
    return {
      bestEntry,
      bestValue: bestEntry
        ? `${formatSpeed(bestEntry.wpm)} ${speedLabel} · ${Math.round(bestEntry.acc)}%`
        : emptyLabel,
    };
  }, [emptyLabel, entries, formatSpeed, speedLabel]);
}
