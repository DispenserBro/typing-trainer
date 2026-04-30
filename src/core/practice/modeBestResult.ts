import type { HistoryEntry } from '../../shared/types';
import { pickBestHistoryEntry } from '../motivation/records';

export type ModeBestResultLabelViewModel = {
  bestValue: string;
};

export type BuildModeBestResultLabelViewModelArgs = {
  emptyLabel: string;
  entries: HistoryEntry[];
  formatSpeed: (value: number) => string;
  speedLabel: string;
};

export function buildModeBestResultLabelViewModel({
  emptyLabel,
  entries,
  formatSpeed,
  speedLabel,
}: BuildModeBestResultLabelViewModelArgs): ModeBestResultLabelViewModel {
  const bestEntry = pickBestHistoryEntry(entries);
  return {
    bestValue: bestEntry
      ? `${formatSpeed(bestEntry.wpm)} ${speedLabel} · ${Math.round(bestEntry.acc)}%`
      : emptyLabel,
  };
}
