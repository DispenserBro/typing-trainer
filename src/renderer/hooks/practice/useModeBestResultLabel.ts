import { useMemo } from 'react';
import {
  buildModeBestResultLabelViewModel,
  type BuildModeBestResultLabelViewModelArgs,
} from '../../../core/practice/modeBestResult';

type UseModeBestResultLabelArgs = BuildModeBestResultLabelViewModelArgs;

export function useModeBestResultLabel({
  emptyLabel,
  entries,
  formatSpeed,
  speedLabel,
}: UseModeBestResultLabelArgs) {
  return useMemo(() => buildModeBestResultLabelViewModel({
    emptyLabel,
    entries,
    formatSpeed,
    speedLabel,
  }), [emptyLabel, entries, formatSpeed, speedLabel]);
}
