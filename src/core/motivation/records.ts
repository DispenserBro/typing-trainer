import type {
  HistoryEntry,
  LayoutsData,
  PracticeContentMode,
  PracticeTrainingMode,
  Progress,
  TranslationParams,
} from '../../shared/types';
import { formatDelta } from '../stats/utils';

type ScopedHistoryEntry = {
  layoutId: string;
  layoutLabel: string;
  languageId: string;
  languageLabel: string;
  entry: HistoryEntry;
};

type ResultComparisonInput = {
  wpm: number;
  acc: number;
};

export interface ResultComparisonBenchmark {
  label: string;
  entry: HistoryEntry;
  contextLabel: string;
}

export interface ResultComparisonDelta {
  label: string;
  speedDelta: number;
  accuracyDelta: number;
  formattedSpeedDelta: string;
  formattedAccuracyDelta: string;
  tone: 'up' | 'down' | 'flat';
}

export interface ResultComparisonSummary {
  previousAttempt: ResultComparisonBenchmark | null;
  previousDelta: ResultComparisonDelta | null;
  recentBest: ResultComparisonBenchmark | null;
  recentBestDelta: ResultComparisonDelta | null;
}

export interface HomePersonalRecordCard {
  id: string;
  title: string;
  subtitle: string;
  record: ScopedHistoryEntry | null;
}

export interface ModeFocusSnapshot {
  id: 'practice' | 'test' | 'survival';
  title: string;
  description: string;
  actionMode: string;
  attempts: number;
  bestEntry: HistoryEntry | null;
  lastEntry: HistoryEntry | null;
  emphasis: 'good' | 'warn' | 'neutral';
  recommendation: string;
}

export interface ModeFollowupRecommendation {
  title: string;
  description: string;
  actionMode: string;
  actionLabel: string;
}

type TranslateFn = (key: string, options?: TranslationParams) => string;

export interface LayoutMasteryMilestone {
  id: string;
  title: string;
  threshold: number;
  description: string;
  rewardTitle: string;
  rewardDescription: string;
}

export interface LayoutMasterySnapshot {
  layoutId: string;
  layoutLabel: string;
  currentScore: number;
  currentMilestone: LayoutMasteryMilestone;
  nextMilestone: LayoutMasteryMilestone | null;
  progressPercent: number;
  remainingPoints: number;
  unlockedLetters: number;
  totalLetters: number;
  practiceSessions: number;
  bestPracticeWpm: number;
  bestPracticeAccuracy: number;
  milestones: LayoutMasteryMilestone[];
  unlockedMilestones: LayoutMasteryMilestone[];
  activeRewardTitle: string;
  activeRewardDescription: string;
  nextRewardTitle: string | null;
  nextRewardDescription: string | null;
}

export interface LayoutMasteryResultSummary {
  previous: LayoutMasterySnapshot;
  current: LayoutMasterySnapshot;
  scoreDelta: number;
  unlockedMilestone: LayoutMasteryMilestone | null;
}

type LayoutMasterySnapshotOptions = {
  historyEntriesOverride?: HistoryEntry[];
  unlockedLettersOverride?: number;
};

function getPracticeTrainingModeLabel(mode: PracticeTrainingMode, t: TranslateFn) {
  return t(`records.practiceTrainingModes.${mode}`);
}

function getPracticeContentModeLabel(mode: PracticeContentMode, t: TranslateFn) {
  return t(`records.practiceContentModes.${mode}`);
}

function getPracticeScenarioLabel(
  scenarioId: keyof typeof PRACTICE_SCENARIO_KEYS,
  t: TranslateFn,
) {
  return t(PRACTICE_SCENARIO_KEYS[scenarioId]);
}

const PRACTICE_SCENARIO_KEYS = {
  'practice-normal': 'records.practiceScenarios.practice-normal',
  'practice-rhythm': 'records.practiceScenarios.practice-rhythm',
  sprint: 'records.practiceScenarios.sprint',
  survival: 'records.practiceScenarios.survival',
  flawless: 'records.practiceScenarios.flawless',
} as const;

function getLayoutMasteryMilestones(t: TranslateFn): LayoutMasteryMilestone[] {
  const milestoneIds = [
    'private',
    'corporal',
    'sergeant',
    'lieutenant',
    'captain',
    'major',
    'colonel',
    'colonel-general',
  ] as const;

  const thresholds: Record<(typeof milestoneIds)[number], number> = {
    private: 0,
    corporal: 15,
    sergeant: 30,
    lieutenant: 45,
    captain: 60,
    major: 75,
    colonel: 90,
    'colonel-general': 100,
  };

  return milestoneIds.map((id) => ({
    id,
    threshold: thresholds[id],
    title: t(`mastery.ranks.${id}.title`),
    description: t(`mastery.ranks.${id}.description`),
    rewardTitle: t(`mastery.ranks.${id}.rewardTitle`),
    rewardDescription: t(`mastery.ranks.${id}.rewardDescription`),
  }));
}

function getLanguageLabel(layouts: LayoutsData, languageId: string) {
  return layouts.languages.find(language => language.id === languageId)?.label ?? languageId.toUpperCase();
}

function flattenHistory(progress: Progress, layouts: LayoutsData): ScopedHistoryEntry[] {
  return Object.entries(progress.history ?? {}).flatMap(([layoutId, entries]) => {
    const layout = layouts.layouts[layoutId];
    const layoutLabel = layout?.label ?? layoutId.toUpperCase();
    const languageId = layout?.lang ?? 'unknown';
    const languageLabel = getLanguageLabel(layouts, languageId);

    return entries.map((entry) => ({
      layoutId,
      layoutLabel,
      languageId,
      languageLabel,
      entry,
    }));
  });
}

function compareEntries(left: ScopedHistoryEntry, right: ScopedHistoryEntry) {
  if (left.entry.wpm !== right.entry.wpm) return left.entry.wpm - right.entry.wpm;
  if (left.entry.acc !== right.entry.acc) return left.entry.acc - right.entry.acc;

  const leftTs = new Date(left.entry.date).getTime();
  const rightTs = new Date(right.entry.date).getTime();
  return leftTs - rightTs;
}

function pickBestEntry(entries: ScopedHistoryEntry[]) {
  if (!entries.length) return null;
  return entries.reduce((best, entry) => (compareEntries(entry, best) > 0 ? entry : best));
}

export function pickBestHistoryEntry(entries: HistoryEntry[]) {
  if (!entries.length) return null;
  return entries.reduce<HistoryEntry | null>((best, entry) => {
    if (!best) return entry;
    if (entry.wpm !== best.wpm) return entry.wpm > best.wpm ? entry : best;
    if (entry.acc !== best.acc) return entry.acc > best.acc ? entry : best;
    return new Date(entry.date).getTime() > new Date(best.date).getTime() ? entry : best;
  }, null);
}

function isRoundedMatch(entry: HistoryEntry, current: ResultComparisonInput) {
  return entry.wpm === Math.round(current.wpm)
    && Math.abs(entry.acc - Math.round(current.acc * 10) / 10) <= 0.1;
}

function getTone(speedDelta: number, accuracyDelta: number): ResultComparisonDelta['tone'] {
  if (speedDelta > 0 || (speedDelta === 0 && accuracyDelta > 0)) return 'up';
  if (speedDelta < 0 || (speedDelta === 0 && accuracyDelta < 0)) return 'down';
  return 'flat';
}

function buildDelta(label: string, current: ResultComparisonInput, benchmark: HistoryEntry): ResultComparisonDelta {
  const speedDelta = current.wpm - benchmark.wpm;
  const accuracyDelta = current.acc - benchmark.acc;

  return {
    label,
    speedDelta,
    accuracyDelta,
    formattedSpeedDelta: formatDelta(speedDelta, 0),
    formattedAccuracyDelta: formatDelta(accuracyDelta, 1),
    tone: getTone(speedDelta, accuracyDelta),
  };
}

function buildBenchmark(label: string, entry: HistoryEntry, contextLabel: string): ResultComparisonBenchmark {
  return {
    label,
    entry,
    contextLabel,
  };
}

function buildComparisonSummary(
  entries: HistoryEntry[],
  current: ResultComparisonInput,
  t: TranslateFn,
  contextLabel: (entry: HistoryEntry) => string,
): ResultComparisonSummary {
  const latestEntry = entries.length > 0 ? entries[entries.length - 1]! : null;
  const currentAlreadySaved = latestEntry ? isRoundedMatch(latestEntry, current) : false;
  const historicalEntries = currentAlreadySaved ? entries.slice(0, -1) : entries;
  const previousAttempt = historicalEntries.length > 0 ? historicalEntries[historicalEntries.length - 1]! : null;
  const recentBestEntry = historicalEntries.length > 0
    ? historicalEntries
        .slice(-8)
        .reduce((best, entry) => {
          if (!best) return entry;
          if (entry.wpm !== best.wpm) return entry.wpm > best.wpm ? entry : best;
          if (entry.acc !== best.acc) return entry.acc > best.acc ? entry : best;
          return new Date(entry.date).getTime() > new Date(best.date).getTime() ? entry : best;
        }, historicalEntries[0] ?? null)
    : null;

  return {
    previousAttempt: previousAttempt
      ? buildBenchmark(t('resultComparison.previousAttempt'), previousAttempt, contextLabel(previousAttempt))
      : null,
    previousDelta: previousAttempt ? buildDelta(t('resultComparison.deltaToPrevious'), current, previousAttempt) : null,
    recentBest: recentBestEntry
      ? buildBenchmark(t('resultComparison.recentBest'), recentBestEntry, contextLabel(recentBestEntry))
      : null,
    recentBestDelta: recentBestEntry ? buildDelta(t('resultComparison.deltaToBest'), current, recentBestEntry) : null,
  };
}

function getHistoricalBaselineCount(entries: HistoryEntry[], current: ResultComparisonInput) {
  const latestEntry = entries.length > 0 ? entries[entries.length - 1]! : null;
  const currentAlreadySaved = latestEntry ? isRoundedMatch(latestEntry, current) : false;
  return currentAlreadySaved ? Math.max(0, entries.length - 1) : entries.length;
}

function pickComparisonGroup(groups: HistoryEntry[][], current: ResultComparisonInput) {
  return groups.find(group => getHistoricalBaselineCount(group, current) > 0)
    ?? groups.find(group => group.length > 0)
    ?? [];
}

function describePracticeContext(entry: HistoryEntry, t: TranslateFn) {
  if (entry.contentScenarioId && entry.contentScenarioId !== 'practice-normal' && entry.contentScenarioId !== 'practice-rhythm') {
    const scenarioLabel = getPracticeScenarioLabel(entry.contentScenarioId, t);
    const contentLabel = entry.contentMode
      ? getPracticeContentModeLabel(entry.contentMode, t)
      : t('records.context.contentUnknown');
    return `${scenarioLabel} · ${contentLabel}`;
  }

  const trainingLabel = entry.trainingMode
    ? getPracticeTrainingModeLabel(entry.trainingMode, t)
    : t('records.context.practice');
  const contentLabel = entry.contentMode
    ? getPracticeContentModeLabel(entry.contentMode, t)
    : t('records.context.contentUnknown');
  return `${trainingLabel} · ${contentLabel}`;
}

function describeGameContext(entry: HistoryEntry, t: TranslateFn) {
  const stageLabel = entry.gameStageType === 'boss'
    ? t('records.context.gameStageBoss')
    : t('records.context.gameStageNormal');
  const levelLabel = entry.gameLevel
    ? t('records.context.gameLevel', { level: entry.gameLevel })
    : t('records.context.gameLevelUnknown');
  return `${stageLabel} · ${levelLabel}`;
}

function describeSprintContext(entry: HistoryEntry, t: TranslateFn) {
  const durationLabel = entry.durationSeconds
    ? t('records.context.durationSeconds', { count: Math.max(1, Math.round(entry.durationSeconds)) })
    : t('records.context.durationUnknown');
  const contentLabel = entry.contentMode
    ? getPracticeContentModeLabel(entry.contentMode, t)
    : t('records.context.contentUnknown');
  return `${t('records.context.sprint')} · ${durationLabel} · ${contentLabel}`;
}

export function buildPracticeResultComparison(
  entries: HistoryEntry[],
  t: TranslateFn,
  current: ResultComparisonInput & {
    contentScenarioId?: HistoryEntry['contentScenarioId'];
    trainingMode?: PracticeTrainingMode;
    contentMode?: PracticeContentMode;
  },
): ResultComparisonSummary {
  const candidates = pickComparisonGroup([
    entries.filter(entry => entry.mode === 'practice'
      && entry.contentScenarioId === current.contentScenarioId
      && entry.contentMode === current.contentMode),
    entries.filter(entry => entry.mode === 'practice'
      && entry.trainingMode === current.trainingMode
      && entry.contentMode === current.contentMode),
    entries.filter(entry => entry.mode === 'practice' && entry.trainingMode === current.trainingMode),
    entries.filter(entry => entry.mode === 'practice'),
  ], current);

  return buildComparisonSummary(candidates, current, t, entry => describePracticeContext(entry, t));
}

export function buildGameResultComparison(
  entries: HistoryEntry[],
  t: TranslateFn,
  current: ResultComparisonInput & {
    gameLevel?: number;
    gameStageType?: 'normal' | 'boss';
  },
): ResultComparisonSummary {
  const candidates = pickComparisonGroup([
    entries.filter(entry => entry.mode === 'game' && entry.gameLevel === current.gameLevel),
    entries.filter(entry => entry.mode === 'game' && entry.gameStageType === current.gameStageType),
    entries.filter(entry => entry.mode === 'game'),
  ], current);

  return buildComparisonSummary(candidates, current, t, entry => describeGameContext(entry, t));
}

export function buildSprintResultComparison(
  entries: HistoryEntry[],
  t: TranslateFn,
  current: ResultComparisonInput & {
    contentScenarioId?: HistoryEntry['contentScenarioId'];
    durationSeconds?: number;
    contentMode?: PracticeContentMode;
  },
): ResultComparisonSummary {
  const roundedDuration = current.durationSeconds != null
    ? Math.max(1, Math.round(current.durationSeconds))
    : null;
  const candidates = pickComparisonGroup([
    entries.filter(entry => entry.mode === 'test'
      && entry.contentScenarioId === current.contentScenarioId
      && entry.contentMode === current.contentMode
      && (roundedDuration == null || Math.max(1, Math.round(entry.durationSeconds ?? 0)) === roundedDuration)),
    entries.filter(entry => entry.mode === 'test'
      && (roundedDuration == null || Math.max(1, Math.round(entry.durationSeconds ?? 0)) === roundedDuration)),
    entries.filter(entry => entry.mode === 'test'),
  ], current);

  return buildComparisonSummary(candidates, current, t, entry => describeSprintContext(entry, t));
}

export function buildHomePersonalRecordCards(
  progress: Progress,
  layouts: LayoutsData,
  currentLayout: string,
  t: TranslateFn,
): HomePersonalRecordCard[] {
  const scopedEntries = flattenHistory(progress, layouts);
  const currentLayoutInfo = layouts.layouts[currentLayout];
  const currentLanguage = currentLayoutInfo?.lang ?? '';

  return [
    {
      id: 'practice-overall',
      title: t('records.cards.practice.title'),
      subtitle: t('records.cards.practice.subtitle'),
      record: pickBestEntry(scopedEntries.filter(entry => entry.entry.mode === 'practice')),
    },
    {
      id: 'game-overall',
      title: t('records.cards.game.title'),
      subtitle: t('records.cards.game.subtitle'),
      record: pickBestEntry(scopedEntries.filter(entry => entry.entry.mode === 'game')),
    },
    {
      id: 'sprint-overall',
      title: t('records.cards.sprint.title'),
      subtitle: t('records.cards.sprint.subtitle'),
      record: pickBestEntry(scopedEntries.filter(entry => entry.entry.mode === 'test')),
    },
    {
      id: 'current-layout',
      title: t('records.cards.currentLayout.title'),
      subtitle: currentLayoutInfo?.label ?? currentLayout.toUpperCase(),
      record: pickBestEntry(scopedEntries.filter(entry => entry.layoutId === currentLayout)),
    },
    {
      id: 'current-language',
      title: t('records.cards.currentLanguage.title'),
      subtitle: currentLanguage ? getLanguageLabel(layouts, currentLanguage) : t('records.cards.currentLanguage.none'),
      record: currentLanguage
        ? pickBestEntry(scopedEntries.filter(entry => entry.languageId === currentLanguage))
        : null,
    },
  ];
}

export function buildModeFocusSnapshots(entries: HistoryEntry[], t: TranslateFn): ModeFocusSnapshot[] {
  const basePracticeEntries = entries.filter(entry => entry.mode === 'practice'
    && entry.contentScenarioId !== 'survival'
    && entry.contentScenarioId !== 'flawless');
  const sprintEntries = entries.filter(entry => entry.mode === 'test');
  const survivalEntries = entries.filter(entry => entry.mode === 'practice'
    && (entry.contentScenarioId === 'survival' || entry.contentScenarioId === 'flawless'));
  const flawlessEntries = entries.filter(entry => entry.mode === 'practice' && entry.contentScenarioId === 'flawless');

  const buildSnapshot = (
    id: ModeFocusSnapshot['id'],
    title: string,
    description: string,
    actionMode: string,
    modeEntries: HistoryEntry[],
    recommendation: (attempts: number, best: HistoryEntry | null, last: HistoryEntry | null) => Pick<ModeFocusSnapshot, 'emphasis' | 'recommendation'>,
  ): ModeFocusSnapshot => {
    const attempts = modeEntries.length;
    const bestEntry = pickBestHistoryEntry(modeEntries);
    const lastEntry = attempts > 0 ? modeEntries[attempts - 1]! : null;
    const feedback = recommendation(attempts, bestEntry, lastEntry);

    return {
      id,
      title,
      description,
      actionMode,
      attempts,
      bestEntry,
      lastEntry,
      emphasis: feedback.emphasis,
      recommendation: feedback.recommendation,
    };
  };

  return [
    buildSnapshot(
      'practice',
      t('records.modeFocus.practice.title'),
      t('records.modeFocus.practice.description'),
      'practice',
      basePracticeEntries,
      (attempts, best, last) => {
        if (attempts === 0) {
          return {
            emphasis: 'warn',
            recommendation: t('records.modeFocus.practice.recommendation.empty'),
          };
        }
        if ((last?.acc ?? 0) < 93) {
          return {
            emphasis: 'warn',
            recommendation: t('records.modeFocus.practice.recommendation.lowAccuracy'),
          };
        }
        if ((best?.wpm ?? 0) >= 60 && (best?.acc ?? 0) >= 96) {
          return {
            emphasis: 'good',
            recommendation: t('records.modeFocus.practice.recommendation.ready'),
          };
        }
        return {
          emphasis: 'neutral',
          recommendation: t('records.modeFocus.practice.recommendation.building'),
        };
      },
    ),
    buildSnapshot(
      'test',
      t('records.modeFocus.test.title'),
      t('records.modeFocus.test.description'),
      'test',
      sprintEntries,
      (attempts, best, last) => {
        if (attempts === 0) {
          return {
            emphasis: 'warn',
            recommendation: t('records.modeFocus.test.recommendation.empty'),
          };
        }
        if ((last?.acc ?? best?.acc ?? 0) < 93) {
          return {
            emphasis: 'warn',
            recommendation: t('records.modeFocus.test.recommendation.lowAccuracy'),
          };
        }
        if ((best?.wpm ?? 0) >= 70 && (best?.acc ?? 0) >= 95) {
          return {
            emphasis: 'good',
            recommendation: t('records.modeFocus.test.recommendation.ready'),
          };
        }
        return {
          emphasis: 'neutral',
          recommendation: t('records.modeFocus.test.recommendation.building'),
        };
      },
    ),
    buildSnapshot(
      'survival',
      t('records.modeFocus.survival.title'),
      t('records.modeFocus.survival.description'),
      'survival',
      survivalEntries,
      (attempts, best, last) => {
        if (attempts === 0) {
          return {
            emphasis: 'warn',
            recommendation: t('records.modeFocus.survival.recommendation.empty'),
          };
        }
        if (flawlessEntries.length > 0 && (best?.acc ?? 0) >= 98) {
          return {
            emphasis: 'good',
            recommendation: t('records.modeFocus.survival.recommendation.flawlessReady'),
          };
        }
        if ((last?.acc ?? best?.acc ?? 0) < 94) {
          return {
            emphasis: 'warn',
            recommendation: t('records.modeFocus.survival.recommendation.lowAccuracy'),
          };
        }
        if ((best?.acc ?? 0) >= 96 && (best?.wpm ?? 0) >= 55) {
          return {
            emphasis: 'good',
            recommendation: t('records.modeFocus.survival.recommendation.ready'),
          };
        }
        return {
          emphasis: 'neutral',
          recommendation: flawlessEntries.length > 0
            ? t('records.modeFocus.survival.recommendation.buildingWithFlawless')
            : t('records.modeFocus.survival.recommendation.building'),
        };
      },
    ),
  ];
}

export function buildHistoryFollowupRecommendation(entry: HistoryEntry | null, t: TranslateFn): ModeFollowupRecommendation | null {
  if (!entry) return null;

  if (entry.mode === 'test') {
    if (entry.acc >= 95 && entry.wpm >= 70) {
      return {
        title: t('modeFollowup.test.speedToSurvival.title'),
        description: t('modeFollowup.test.speedToSurvival.description'),
        actionMode: 'survival',
        actionLabel: t('modeFollowup.test.speedToSurvival.action'),
      };
    }
    return {
      title: t('modeFollowup.test.stabilizeBase.title'),
      description: t('modeFollowup.test.stabilizeBase.description'),
      actionMode: 'practice',
      actionLabel: t('modeFollowup.test.stabilizeBase.action'),
    };
  }

  if (entry.mode === 'practice' && entry.contentScenarioId === 'survival') {
    if (entry.passed && entry.acc >= 96) {
      return {
        title: t('modeFollowup.survival.raiseBar.title'),
        description: t('modeFollowup.survival.raiseBar.description'),
        actionMode: 'survival',
        actionLabel: t('modeFollowup.survival.raiseBar.action'),
      };
    }
    return {
      title: t('modeFollowup.survival.returnToPractice.title'),
      description: t('modeFollowup.survival.returnToPractice.description'),
      actionMode: 'practice',
      actionLabel: t('modeFollowup.survival.returnToPractice.action'),
    };
  }

  if (entry.mode === 'practice' && entry.contentScenarioId === 'flawless') {
    if (entry.passed) {
      return {
        title: t('modeFollowup.flawless.cleanControl.title'),
        description: t('modeFollowup.flawless.cleanControl.description'),
        actionMode: 'survival',
        actionLabel: t('modeFollowup.flawless.cleanControl.action'),
      };
    }
    return {
      title: entry.acc >= 94
        ? t('modeFollowup.flawless.softLongRun.title')
        : t('modeFollowup.flawless.releasePressure.title'),
      description: entry.acc >= 94
        ? t('modeFollowup.flawless.softLongRun.description')
        : t('modeFollowup.flawless.releasePressure.description'),
      actionMode: entry.acc >= 94 ? 'survival' : 'practice',
      actionLabel: entry.acc >= 94 ? t('modeFollowup.flawless.softLongRun.action') : t('modeFollowup.flawless.releasePressure.action'),
    };
  }

  return null;
}

export function buildModeResultFollowupRecommendation(args: {
  mode: 'test' | 'survival' | 'flawless';
  wpm: number;
  acc: number;
  passed?: boolean;
  errors?: number;
}, t: TranslateFn): ModeFollowupRecommendation {
  if (args.mode === 'test') {
    if (args.acc >= 95 && args.wpm >= 70) {
      return {
        title: t('modeFollowup.test.speedToSurvival.title'),
        description: t('modeFollowup.test.speedToSurvival.description'),
        actionMode: 'survival',
        actionLabel: t('modeFollowup.test.speedToSurvival.action'),
      };
    }
    return {
      title: t('modeFollowup.test.stabilizeBase.title'),
      description: t('modeFollowup.test.stabilizeBase.description'),
      actionMode: 'practice',
      actionLabel: t('modeFollowup.test.stabilizeBase.action'),
    };
  }

  if (args.mode === 'survival') {
    if (args.passed && args.acc >= 96) {
      return {
        title: t('modeFollowup.survival.raiseBar.title'),
        description: t('modeFollowup.survival.raiseBar.description'),
        actionMode: 'survival',
        actionLabel: t('modeFollowup.survival.raiseBar.action'),
      };
    }
    return {
      title: t('modeFollowup.survival.returnToPractice.title'),
      description: t('modeFollowup.survival.returnToPractice.description'),
      actionMode: 'practice',
      actionLabel: t('modeFollowup.survival.returnToPractice.action'),
    };
  }

  if (args.passed) {
    return {
      title: t('modeFollowup.flawless.cleanControl.title'),
      description: t('modeFollowup.flawless.cleanControl.description'),
      actionMode: 'survival',
      actionLabel: t('modeFollowup.flawless.cleanControl.action'),
    };
  }

  if (args.acc >= 94) {
    return {
      title: t('modeFollowup.flawless.softLongRun.title'),
      description: t('modeFollowup.flawless.softLongRun.description'),
      actionMode: 'survival',
      actionLabel: t('modeFollowup.flawless.softLongRun.action'),
    };
  }

  return {
    title: t('modeFollowup.flawless.releasePressure.title'),
    description: t('modeFollowup.flawless.releasePressure.description'),
    actionMode: 'practice',
    actionLabel: t('modeFollowup.flawless.releasePressure.action'),
  };
}

export function describeHomeRecord(record: ScopedHistoryEntry | null, t: TranslateFn) {
  if (!record) return t('records.homeRecord.noAttempts');
  const detail = record.entry.mode === 'practice'
    ? describePracticeContext(record.entry, t)
    : record.entry.mode === 'game'
      ? describeGameContext(record.entry, t)
      : record.entry.mode === 'test'
        ? describeSprintContext(record.entry, t)
        : t('records.context.lesson');
  return `${record.layoutLabel} · ${record.languageLabel} · ${detail}`;
}

export function buildLayoutMasterySnapshot(
  progress: Progress,
  layouts: LayoutsData,
  currentLayout: string,
  t: TranslateFn,
  options?: LayoutMasterySnapshotOptions,
): LayoutMasterySnapshot {
  const layout = layouts.layouts[currentLayout];
  const layoutLabel = layout?.label ?? currentLayout.toUpperCase();
  const historyEntries = options?.historyEntriesOverride ?? progress.history?.[currentLayout] ?? [];
  const practiceEntries = historyEntries.filter(entry => entry.mode === 'practice');
  const layoutProgress = progress.layoutProgress?.[currentLayout];
  const practiceUnlockOrder = layout?.practiceUnlockOrder ?? [];
  const totalLetters = practiceUnlockOrder.length;
  const unlockedLetters = Math.min(options?.unlockedLettersOverride ?? layoutProgress?.unlocked ?? 0, totalLetters);
  const practiceSessions = practiceEntries.length;
  const bestPractice = practiceEntries.reduce<HistoryEntry | null>((best, entry) => {
    if (!best) return entry;
    if (entry.wpm !== best.wpm) return entry.wpm > best.wpm ? entry : best;
    if (entry.acc !== best.acc) return entry.acc > best.acc ? entry : best;
    return new Date(entry.date).getTime() > new Date(best.date).getTime() ? entry : best;
  }, null);
  const bestPracticeWpm = bestPractice?.wpm ?? 0;
  const bestPracticeAccuracy = bestPractice?.acc ?? 0;

  const unlockPoints = totalLetters > 0 ? (unlockedLetters / totalLetters) * 40 : 0;
  const sessionPoints = Math.min(25, (practiceSessions / 24) * 25);
  const speedPoints = Math.min(20, (bestPracticeWpm / 90) * 20);
  const accuracyPoints = Math.min(15, (bestPracticeAccuracy / 98) * 15);
  const currentScore = Math.max(0, Math.min(100, Math.round(unlockPoints + sessionPoints + speedPoints + accuracyPoints)));

  const milestones = getLayoutMasteryMilestones(t);
  const currentMilestone = milestones.reduce((best, milestone) => (
    currentScore >= milestone.threshold ? milestone : best
  ), milestones[0]!);
  const nextMilestone = milestones.find(milestone => milestone.threshold > currentScore) ?? null;
  const milestoneFloor = currentMilestone.threshold;
  const milestoneCeiling = nextMilestone?.threshold ?? 100;
  const unlockedMilestones = milestones.filter(milestone => currentScore >= milestone.threshold);
  const progressPercent = nextMilestone
    ? Math.max(0, Math.min(100, Math.round(((currentScore - milestoneFloor) / Math.max(1, milestoneCeiling - milestoneFloor)) * 100)))
    : 100;

  return {
    layoutId: currentLayout,
    layoutLabel,
    currentScore,
    currentMilestone,
    nextMilestone,
    progressPercent,
    remainingPoints: nextMilestone ? Math.max(0, nextMilestone.threshold - currentScore) : 0,
    unlockedLetters,
    totalLetters,
    practiceSessions,
    bestPracticeWpm,
    bestPracticeAccuracy,
    milestones,
    unlockedMilestones,
    activeRewardTitle: currentMilestone.rewardTitle,
    activeRewardDescription: currentMilestone.rewardDescription,
    nextRewardTitle: nextMilestone?.rewardTitle ?? null,
    nextRewardDescription: nextMilestone?.rewardDescription ?? null,
  };
}

export function describeLayoutMasterySignals(snapshot: LayoutMasterySnapshot, t: TranslateFn) {
  return t('mastery.signalSummary', {
    unlocked: snapshot.unlockedLetters,
    total: snapshot.totalLetters || 0,
    sessions: snapshot.practiceSessions,
    speed: snapshot.bestPracticeWpm,
  });
}

export function buildLayoutMasteryResultSummary(
  progress: Progress,
  layouts: LayoutsData,
  currentLayout: string,
  t: TranslateFn,
  options?: {
    previousHistoryEntriesOverride?: HistoryEntry[];
    currentHistoryEntriesOverride?: HistoryEntry[];
    previousUnlockedLettersOverride?: number;
    currentUnlockedLettersOverride?: number;
  },
): LayoutMasteryResultSummary {
  const previous = buildLayoutMasterySnapshot(progress, layouts, currentLayout, t, {
    historyEntriesOverride: options?.previousHistoryEntriesOverride,
    unlockedLettersOverride: options?.previousUnlockedLettersOverride,
  });
  const current = buildLayoutMasterySnapshot(progress, layouts, currentLayout, t, {
    historyEntriesOverride: options?.currentHistoryEntriesOverride,
    unlockedLettersOverride: options?.currentUnlockedLettersOverride,
  });
  const unlockedMilestone = current.currentMilestone.id !== previous.currentMilestone.id
    ? current.currentMilestone
    : null;

  return {
    previous,
    current,
    scoreDelta: current.currentScore - previous.currentScore,
    unlockedMilestone,
  };
}
