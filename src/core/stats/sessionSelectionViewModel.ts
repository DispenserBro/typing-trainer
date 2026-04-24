import {
  getBestStableRun,
  getWorstKeysFromCharStats,
  type SessionHistoryItem,
} from './utils';

export function getPreferredHistorySession(filteredSessionHistory: SessionHistoryItem[]) {
  return filteredSessionHistory.find(item => item.entry.charStats && item.rhythm?.session.intervals.length)
    ?? filteredSessionHistory.find(item => item.entry.charStats)
    ?? filteredSessionHistory[0]
    ?? null;
}

export function getSelectedHistorySession(
  filteredSessionHistory: SessionHistoryItem[],
  selectedHistorySessionId: string,
  preferredHistorySession: SessionHistoryItem | null,
) {
  return filteredSessionHistory.find(item => item.id === selectedHistorySessionId) ?? preferredHistorySession;
}

export function getNextSelectedHistorySessionId(
  filteredSessionHistory: SessionHistoryItem[],
  selectedHistorySessionId: string,
  preferredHistorySession: SessionHistoryItem | null,
) {
  if (!filteredSessionHistory.length) return '';
  if (selectedHistorySessionId && filteredSessionHistory.some(item => item.id === selectedHistorySessionId)) {
    return selectedHistorySessionId;
  }
  return preferredHistorySession?.id ?? filteredSessionHistory[0].id;
}

export function buildDisplayedRhythmSession(selectedHistorySession: SessionHistoryItem | null) {
  return (
    selectedHistorySession?.entry.charStats && selectedHistorySession.rhythm?.session.intervals.length
      ? selectedHistorySession.rhythm
      : null
  );
}

export function buildSelectedSessionViewModel(selectedHistorySession: SessionHistoryItem | null) {
  const displayedRhythmSession = buildDisplayedRhythmSession(selectedHistorySession);
  const rhythmLabels = displayedRhythmSession?.session.intervals.map((_, index) => index + 1) ?? [];
  const rhythmData = displayedRhythmSession?.session.intervals ?? [];
  const rhythmAverageLine = displayedRhythmSession
    ? displayedRhythmSession.session.intervals.map(() => displayedRhythmSession.session.averageInterval)
    : [];
  const rhythmStableRun = displayedRhythmSession ? getBestStableRun(displayedRhythmSession.session) : 0;
  const rhythmWorstPoint = displayedRhythmSession ? Math.max(0, ...displayedRhythmSession.session.intervals) : 0;

  return {
    displayedRhythmSession,
    rhythmAverageLine,
    rhythmData,
    rhythmLabels,
    rhythmStableRun,
    rhythmWorstPoint,
    selectedHistoryRhythm: selectedHistorySession?.rhythm ?? null,
    selectedHistoryWorstKeys: getWorstKeysFromCharStats(selectedHistorySession?.entry.charStats, 5),
  };
}

export type StatsSessionSelectionViewModel = {
  nextSelectedHistorySessionId: string;
  preferredHistorySession: SessionHistoryItem | null;
  selectedHistorySession: SessionHistoryItem | null;
  selectedSessionViewModel: ReturnType<typeof buildSelectedSessionViewModel>;
};

export function buildStatsSessionSelectionViewModel(
  filteredSessionHistory: SessionHistoryItem[],
  selectedHistorySessionId: string,
): StatsSessionSelectionViewModel {
  const preferredHistorySession = getPreferredHistorySession(filteredSessionHistory);
  const selectedHistorySession = getSelectedHistorySession(
    filteredSessionHistory,
    selectedHistorySessionId,
    preferredHistorySession,
  );

  return {
    nextSelectedHistorySessionId: getNextSelectedHistorySessionId(
      filteredSessionHistory,
      selectedHistorySessionId,
      preferredHistorySession,
    ),
    preferredHistorySession,
    selectedHistorySession,
    selectedSessionViewModel: buildSelectedSessionViewModel(selectedHistorySession),
  };
}
