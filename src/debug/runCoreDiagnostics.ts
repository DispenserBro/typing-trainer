import fs from 'fs';
import path from 'path';
import type {
  CustomPracticePack,
  GameAchievementDefinition,
  GameGhostRun,
  GameRunResult,
  HistoryEntry,
  Lesson,
  LayoutsData,
  Progress,
  PracticeRhythmSessionEntry,
  PracticeContentPack,
} from '../shared/types';
import {
  getAvailablePracticeContentPacks,
  resolvePracticeContentPackSelection,
} from '../core/practice/contentPackSelection';
import { buildModeBestResultLabelViewModel } from '../core/practice/modeBestResult';
import {
  buildChallengeResultCallout,
  buildSprintResultCallout,
} from '../core/practice/modeResultCallouts';
import {
  buildChallengeResultPrimaryMetrics,
  buildSprintResultPrimaryMetrics,
} from '../core/practice/modeResultMetrics';
import { buildModeResultHistoryModel } from '../core/practice/resultHistory';
import { buildPracticeResultPrimaryMetrics } from '../core/practice/viewModel';
import {
  createEmptyMotivationProgress,
  getMotivationGoalSnapshots,
  getWeeklyMotivationRecommendation,
  normalizeMotivationProgress,
  updateMotivationAfterPractice,
} from '../core/motivation/progress';
import { buildHomeHistoryMetrics } from '../core/home/historyMetrics';
import { buildHomeModeFocusDetailCards } from '../core/home/modeFocusDetails';
import { buildHomePersonalRecordDetailCards } from '../core/home/personalRecordDetails';
import {
  buildHomePersonalRecordCards,
  buildModeFocusSnapshots,
  buildPracticeResultComparison,
  type ResultComparisonSummary,
} from '../core/motivation/records';
import {
  buildResultComparisonMetricItems,
  hasResultComparison,
} from '../core/motivation/resultComparisonViewModel';
import {
  buildResultMetricStripViewModel,
  buildResultProgressMetricItems,
  buildResultProgressMetricStripViewModel,
} from '../core/result/metricStrip';
import { buildStatsHistoryScopeModel } from '../core/stats/historyScope';
import { buildStatsSummaryCardsViewModel } from '../core/stats/summaryCards';
import {
  buildStatsRhythmMetricViewModel,
  buildStatsSessionDetailSummaryViewModel,
  buildStatsSessionHistoryListViewModel,
  buildStatsSessionsViewModel,
  buildStatsWorstKeyCardsViewModel,
} from '../core/stats/sessionsViewModel';
import { buildStatsSessionSelectionViewModel } from '../core/stats/sessionSelectionViewModel';
import { buildGameResultHistoryModel } from '../core/game/resultHistory';
import { buildGameResultMetricItems } from '../core/game/resultMetrics';
import { buildGameResultCardViewModel } from '../core/game/resultPresentation';
import { buildGameRewardChoiceBlockViewModel } from '../core/game/resultRewards';
import {
  buildAchievementsModalViewModel,
  buildGameAchievementsModalViewModel,
} from '../core/achievements/viewModel';
import {
  buildSidebarViewModel,
  getSidebarModeActive,
} from '../core/navigation/sidebar';
import {
  applyLessonExerciseCompletion,
  buildLessonNavigationModel,
  buildLessonsSectionModel,
  isLessonUnlocked,
} from '../core/lessons/viewModel';
import {
  getHistoryModeBucket,
  isBasePracticeHistoryEntry,
  isChallengeHistoryEntry,
  isFlawlessHistoryEntry,
  isSprintHistoryEntry,
  isSurvivalHistoryEntry,
  matchesHistoryModeBucket,
  matchesPracticeScenario,
} from '../core/history/selectors';

type DiagnosticCheck = {
  name: string;
  detail: string;
  passed: boolean;
};

type DiagnosticReport = {
  checks: DiagnosticCheck[];
  failed: number;
  passed: number;
};

type CliOptions = {
  jsonPath?: string;
};

function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--json' && next) {
      options.jsonPath = next;
      index += 1;
    }
  }

  return options;
}

function writeJsonReport(jsonPath: string, payload: unknown) {
  const absolutePath = path.resolve(process.cwd(), jsonPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, JSON.stringify(payload, null, 2), 'utf8');
}

function check(name: string, passed: boolean, detail: string): DiagnosticCheck {
  return { name, passed, detail };
}

function pack(partial: Partial<PracticeContentPack> & Pick<PracticeContentPack, 'id' | 'language'>): PracticeContentPack {
  return {
    name: partial.id,
    kind: 'words',
    items: ['alpha', 'beta', 'gamma'],
    origin: 'built-in',
    ...partial,
  };
}

function customPack(partial: Partial<CustomPracticePack> & Pick<CustomPracticePack, 'id' | 'importedAt'>): CustomPracticePack {
  return {
    ...pack({
      id: partial.id,
      language: partial.language ?? 'any',
      origin: 'custom',
    }),
    ...partial,
    source: 'json',
    importedAt: partial.importedAt,
    origin: 'custom',
  };
}

function historyEntry(
  partial: Partial<HistoryEntry> & Pick<HistoryEntry, 'mode'>,
): HistoryEntry {
  return {
    date: '2026-01-01T00:00:00.000Z',
    wpm: 40,
    acc: 95,
    ...partial,
  };
}

function rhythmSession(partial: Partial<PracticeRhythmSessionEntry> & Pick<PracticeRhythmSessionEntry, 'id' | 'date'>): PracticeRhythmSessionEntry {
  return {
    trainingMode: 'rhythm',
    wpm: 40,
    acc: 95,
    textLength: 120,
    intervals: [180, 190, 200],
    averageInterval: 190,
    averageDeviation: 8,
    rhythmScore: 80,
    worstInterval: 230,
    ...partial,
  };
}

function gameResult(partial: Partial<GameRunResult>): GameRunResult {
  return {
    wpm: 80,
    acc: 95,
    passed: true,
    livesLeft: 2,
    level: 3,
    isBoss: false,
    bossArchetype: null,
    minAccuracy: 90,
    maxErrors: null,
    rhythmDeviation: null,
    maxRhythmDeviation: null,
    timedOut: false,
    elapsed: 24,
    timeLimitSeconds: null,
    victory: false,
    brokenItems: [],
    ...partial,
  };
}

function diagnosticLayouts(): LayoutsData {
  return {
    languages: [{ id: 'en', label: 'English', wordsFile: 'en.json' }],
    layouts: {
      en: {
        label: 'English',
        lang: 'en',
        rows: { top: ['q'], middle: ['a'], bottom: ['z'] },
        fingers: {
          index_left: ['f'],
          index_right: ['j'],
          middle_left: ['d'],
          middle_right: ['k'],
          ring_left: ['s'],
          ring_right: ['l'],
          pinky_left: ['a'],
          pinky_right: [';'],
        },
        lessonOrder: [],
        practiceUnlockOrder: ['a', 's', 'd', 'f', 'j', 'k', 'l'],
      },
    },
  };
}

function diagnosticLessons(): Lesson[] {
  return [
    { id: 'home-a', name: 'Home A', keys: ['a'], section: 'home' },
    { id: 'home-s', name: 'Home S', keys: ['s'], section: 'home' },
    { id: 'top-q', name: 'Top Q', keys: ['q'], section: 'top' },
  ];
}

function diagnosticAchievements(): GameAchievementDefinition[] {
  return [
    { id: 'game-1', name: 'Game 1', description: 'Game achievement', category: 'game' },
    { id: 'lesson-1', name: 'Lesson 1', description: 'Lesson achievement', category: 'lessons' },
    { id: 'custom-1', name: 'Custom 1', description: 'Custom achievement', category: 'modded' },
    { id: 'legacy-game', name: 'Legacy', description: 'Legacy achievement', category: '' },
  ];
}

function runSidebarViewModelChecks(): DiagnosticCheck[] {
  const labels = {
    addons: 'Extensions',
    game: 'Game',
    lessons: 'Lessons',
    practice: 'Practice',
    settings: 'Settings',
    stats: 'Stats',
    survival: 'Survival',
    test: 'Sprint',
  };
  const model = buildSidebarViewModel({
    builtInLabels: labels,
    currentMode: 'flawless',
    disabledSections: ['settings', 'mod:hidden'],
    modModes: [
      { id: 'lab', label: 'Lab', icon: 'flask', group: 'top', html: '<p>Lab</p>' },
      { id: 'hidden', label: 'Hidden', icon: 'box', group: 'bottom', html: '<p>Hidden</p>' },
    ],
  });

  return [
    check(
      'sidebar view model groups built-in and mod modes',
      model.top.map(mode => mode.id).join('|') === 'practice|test|survival|lessons|game|mod:lab'
        && model.bottom.map(mode => mode.id).join('|') === 'stats|addons',
      `Top=${model.top.map(mode => mode.id).join(', ')}, bottom=${model.bottom.map(mode => mode.id).join(', ')}.`,
    ),
    check(
      'sidebar view model filters disabled sections and tracks home state',
      !model.visible.some(mode => mode.id === 'settings' || mode.id === 'mod:hidden')
        && !model.homeActive,
      `Visible=${model.visible.map(mode => mode.id).join(', ')}, home=${model.homeActive}.`,
    ),
    check(
      'sidebar active matcher keeps flawless under survival',
      getSidebarModeActive('flawless', 'survival')
        && getSidebarModeActive('survival', 'survival')
        && !getSidebarModeActive('practice', 'survival'),
      'Survival navigation should stay active for both challenge variants.',
    ),
  ];
}

function runResultMetricStripViewModelChecks(): DiagnosticCheck[] {
  const primaryModel = buildResultMetricStripViewModel({
    className: 'custom-metrics',
    metrics: [
      { id: 'speed', label: 'Speed', value: '72 WPM', tone: 'good', details: ['best'] },
      { id: 'accuracy', label: 'Accuracy', value: '95%', tone: 'neutral' },
    ],
  });
  const secondaryModel = buildResultMetricStripViewModel({
    metrics: [
      { id: 'errors', label: 'Errors', value: 2, tone: 'warn' },
    ],
    variant: 'secondary',
  });
  const emptyModel = buildResultMetricStripViewModel({ metrics: [] });
  const progressItems = buildResultProgressMetricItems([
    { id: 'daily', title: 'Daily', value: '3 / 5', progressPercent: 140 },
    { id: 'streak', title: 'Streak', value: 0, tone: 'neutral', progressPercent: -10 },
  ]);
  const progressModel = buildResultProgressMetricStripViewModel([
    { id: 'weekly', title: 'Weekly', value: '4 / 10', tone: 'good', progressPercent: 42.4 },
  ]);

  return [
    check(
      'result metric strip view model preserves order, tones and classes',
      primaryModel.metrics.map(item => item.id).join('|') === 'speed|accuracy'
        && primaryModel.metrics[0]?.tone === 'good'
        && primaryModel.metrics[1]?.tone === 'neutral'
        && primaryModel.className === 'ui-metric-strip result-metrics custom-metrics'
        && primaryModel.detailClassName === 'ui-metric-strip-detail result-metric-detail',
      `Class=${primaryModel.className}, ids=${primaryModel.metrics.map(item => item.id).join(', ')}.`,
    ),
    check(
      'result metric strip view model handles secondary and empty states',
      secondaryModel.className === 'ui-metric-strip result-metrics result-metrics--secondary'
        && !secondaryModel.hidden
        && emptyModel.hidden,
      `Secondary=${secondaryModel.className}, empty=${emptyModel.hidden}.`,
    ),
    check(
      'result progress metrics map title labels and clamp progress percent',
      progressItems[0]?.label === 'Daily'
        && progressItems[0]?.details?.[0] === '100%'
        && progressItems[1]?.details?.[0] === '0%'
        && progressModel.metrics[0]?.details?.[0] === '42%',
      `Progress details=${progressItems.map(item => item.details?.[0] ?? 'none').join(', ')}; model=${progressModel.metrics[0]?.details?.[0] ?? 'none'}.`,
    ),
  ];
}

function runAchievementsViewModelChecks(): DiagnosticCheck[] {
  const catalog = diagnosticAchievements();
  const allViewModel = buildAchievementsModalViewModel({
    achievementCatalog: catalog,
    unlockedAchievementIds: ['game-1', 'custom-1'],
  });
  const lessonsViewModel = buildAchievementsModalViewModel({
    achievementCatalog: catalog,
    categoryFilter: 'lessons',
    unlockedAchievementIds: ['lesson-1'],
  });
  const customViewModel = buildAchievementsModalViewModel({
    achievementCatalog: catalog,
    activeCategory: 'modded',
    unlockedAchievementIds: ['custom-1'],
  });
  const gameViewModel = buildGameAchievementsModalViewModel({
    achievementCatalog: catalog,
    unlockedAchievementIds: ['game-1', 'legacy-game'],
  });

  return [
    check(
      'achievements modal view model exposes dynamic categories and totals',
      allViewModel.categories.join('|') === 'game|lessons|modded'
        && allViewModel.totalCount === 4
        && allViewModel.unlockedCount === 2,
      `Categories=${allViewModel.categories.join(', ')}, unlocked=${allViewModel.unlockedCount}/${allViewModel.totalCount}.`,
    ),
    check(
      'achievements modal view model applies fixed and active filters',
      lessonsViewModel.items.length === 1
        && lessonsViewModel.items[0]?.achievement.id === 'lesson-1'
        && lessonsViewModel.unlockedCount === 1
        && customViewModel.items[0]?.achievement.id === 'custom-1',
      `Lessons=${lessonsViewModel.items.map(item => item.achievement.id).join(', ')}, custom=${customViewModel.items.map(item => item.achievement.id).join(', ')}.`,
    ),
    check(
      'game achievements view model preserves legacy game fallback category',
      gameViewModel.totalCount === 2
        && gameViewModel.unlockedCount === 2
        && gameViewModel.items.map(item => item.achievement.id).join('|') === 'game-1|legacy-game',
      `Game ids=${gameViewModel.items.map(item => item.achievement.id).join(', ')}.`,
    ),
  ];
}

function runLessonsViewModelChecks(): DiagnosticCheck[] {
  const lessons = diagnosticLessons();
  const sectionLabel = (section?: string) => section ?? 'default';
  const model = buildLessonsSectionModel({
    exerciseCount: 5,
    getSectionLabel: sectionLabel,
    lessons,
    rawProgress: {
      0: true,
      1: 2,
    },
  });
  const navigation = buildLessonNavigationModel({
    activeLesson: 1,
    activeLessonSection: 'home',
    model,
  });
  const completion = applyLessonExerciseCompletion({
    exerciseCount: 5,
    exerciseIndex: 4,
    getSectionLabel: sectionLabel,
    lessonIndex: 1,
    lessons,
    rawProgress: {
      0: 5,
      1: 4,
      2: 5,
    },
  });

  return [
    check(
      'lessons section model normalizes legacy progress and unlocks by section',
      model.lessonsDone[0] === 5
        && model.lessonsDone[1] === 2
        && model.lessonSections.join('|') === 'home|top'
        && isLessonUnlocked(model, 0)
        && isLessonUnlocked(model, 1)
        && isLessonUnlocked(model, 2),
      `Sections=${model.lessonSections.join(', ')}, done=${model.lessonsDone[0]}/${model.lessonsDone[1]}.`,
    ),
    check(
      'lessons navigation resolves sibling and next-section targets',
      navigation.prevLessonInSection === 0
        && navigation.nextLessonInSection === null
        && navigation.nextSectionFirstLesson === 2
        && navigation.nextLessonTarget === 2
        && navigation.canOpenPrevLesson
        && navigation.canOpenNextLesson,
      `Prev=${navigation.prevLessonInSection ?? 'none'}, next=${navigation.nextLessonTarget ?? 'none'}.`,
    ),
    check(
      'lessons completion flags lesson, section and all-lessons events without mutating input',
      completion.updated
        && completion.lessonCompleted
        && completion.sectionCompleted
        && completion.allCompleted
        && completion.doneByLesson[1] === 5,
      `Updated=${completion.updated}, lesson=${completion.lessonCompleted}, section=${completion.sectionCompleted}, all=${completion.allCompleted}.`,
    ),
  ];
}

function runContentPackSelectionChecks(): DiagnosticCheck[] {
  const packs: PracticeContentPack[] = [
    pack({ id: 'builtin-en', language: 'en', origin: 'built-in' }),
    pack({ id: 'builtin-ru', language: 'ru', origin: 'built-in' }),
    pack({ id: 'addon-any', language: 'any', origin: 'addon' }),
  ];
  const customPracticePacks = {
    older: customPack({ id: 'custom-older', importedAt: '2026-01-01T00:00:00.000Z' }),
    newer: customPack({ id: 'custom-newer', importedAt: '2026-01-03T00:00:00.000Z' }),
  };
  const enSelection = resolvePracticeContentPackSelection({
    contentMode: 'custom',
    currentLanguage: 'en',
    customPracticePacks,
    practiceContentPacks: packs,
    selectedContentPackId: 'custom-older',
  });
  const missingSelection = resolvePracticeContentPackSelection({
    contentMode: 'custom',
    currentLanguage: 'ru',
    practiceContentPacks: packs,
    selectedContentPackId: 'builtin-en',
  });
  const emptySelection = resolvePracticeContentPackSelection({
    contentMode: 'custom',
    currentLanguage: 'de',
    practiceContentPacks: [],
    selectedContentPackId: 'missing',
  });
  const availableForEn = getAvailablePracticeContentPacks({
    currentLanguage: 'en',
    customPracticePacks,
    practiceContentPacks: packs,
  });

  return [
    check(
      'selected content pack id wins',
      enSelection.selectedContentPack?.id === 'custom-older',
      `Selected pack: ${enSelection.selectedContentPack?.id ?? 'none'}.`,
    ),
    check(
      'language fallback skips unavailable selected pack',
      missingSelection.selectedContentPack?.id === 'builtin-ru',
      `Fallback pack for ru: ${missingSelection.selectedContentPack?.id ?? 'none'}.`,
    ),
    check(
      'custom mode falls back to adaptive words when no packs exist',
      emptySelection.effectiveContentMode === 'adaptive-words' && emptySelection.selectedContentPack === null,
      `Mode=${emptySelection.effectiveContentMode}, pack=${emptySelection.selectedContentPack?.id ?? 'none'}.`,
    ),
    check(
      'available packs include any-language addon',
      availableForEn.some(item => item.id === 'addon-any'),
      `Available for en: ${availableForEn.map(item => item.id).join(', ')}.`,
    ),
    check(
      'custom packs are sorted by newest import first after base packs',
      availableForEn.slice(-2).map(item => item.id).join('|') === 'custom-newer|custom-older',
      `Custom order: ${availableForEn.slice(-2).map(item => item.id).join(', ')}.`,
    ),
  ];
}

function runHistorySelectorChecks(): DiagnosticCheck[] {
  const practice = historyEntry({
    mode: 'practice',
    contentScenarioId: 'practice-normal',
  });
  const rhythm = historyEntry({
    mode: 'practice',
    contentScenarioId: 'practice-rhythm',
  });
  const sprint = historyEntry({
    mode: 'test',
    contentScenarioId: 'sprint',
  });
  const survival = historyEntry({
    mode: 'practice',
    contentScenarioId: 'survival',
  });
  const flawless = historyEntry({
    mode: 'practice',
    contentScenarioId: 'flawless',
  });
  const lesson = historyEntry({ mode: 'lesson' });
  const game = historyEntry({ mode: 'game' });

  return [
    check(
      'base practice includes normal and rhythm',
      isBasePracticeHistoryEntry(practice) && isBasePracticeHistoryEntry(rhythm),
      `Buckets: ${getHistoryModeBucket(practice)}, ${getHistoryModeBucket(rhythm)}.`,
    ),
    check(
      'sprint keeps legacy test persistence',
      isSprintHistoryEntry(sprint) && getHistoryModeBucket(sprint) === 'sprint',
      `Sprint bucket: ${getHistoryModeBucket(sprint)}.`,
    ),
    check(
      'survival and flawless are challenge entries',
      isChallengeHistoryEntry(survival) && isChallengeHistoryEntry(flawless),
      `Challenge buckets: ${getHistoryModeBucket(survival)}, ${getHistoryModeBucket(flawless)}.`,
    ),
    check(
      'survival and flawless stay distinguishable',
      isSurvivalHistoryEntry(survival) && isFlawlessHistoryEntry(flawless),
      `Distinct buckets: ${getHistoryModeBucket(survival)}, ${getHistoryModeBucket(flawless)}.`,
    ),
    check(
      'practice scenario matcher is strict',
      matchesPracticeScenario(practice, 'practice-normal') && !matchesPracticeScenario(sprint, 'sprint'),
      'Only practice-mode entries should match practice scenarios.',
    ),
    check(
      'mode bucket matcher covers non-practice modes',
      matchesHistoryModeBucket(lesson, 'lesson') && matchesHistoryModeBucket(game, 'game'),
      `Non-practice buckets: ${getHistoryModeBucket(lesson)}, ${getHistoryModeBucket(game)}.`,
    ),
  ];
}

function runHomeHistoryMetricsChecks(): DiagnosticCheck[] {
  const now = new Date('2026-04-24T12:00:00.000Z').getTime();
  const entries: HistoryEntry[] = [
    historyEntry({
      mode: 'practice',
      contentScenarioId: 'practice-normal',
      date: '2026-03-20T12:00:00.000Z',
      wpm: 20,
      acc: 80,
    }),
    historyEntry({
      mode: 'practice',
      contentScenarioId: 'practice-normal',
      date: '2026-04-09T12:00:00.000Z',
      wpm: 30,
      acc: 85,
    }),
    historyEntry({
      mode: 'practice',
      contentScenarioId: 'practice-normal',
      date: '2026-04-15T12:00:00.000Z',
      wpm: 40,
      acc: 90,
    }),
    historyEntry({
      mode: 'practice',
      contentScenarioId: 'practice-rhythm',
      date: '2026-04-16T12:00:00.000Z',
      wpm: 45,
      acc: 91,
    }),
    historyEntry({
      mode: 'practice',
      contentScenarioId: 'practice-rhythm',
      date: '2026-04-18T12:00:00.000Z',
      wpm: 50,
      acc: 92,
    }),
    historyEntry({
      mode: 'practice',
      contentScenarioId: 'practice-normal',
      date: '2026-04-19T12:00:00.000Z',
      wpm: 55,
      acc: 94,
    }),
    historyEntry({
      mode: 'test',
      contentScenarioId: 'sprint',
      date: '2026-04-08T12:00:00.000Z',
      wpm: 60,
      acc: 88,
    }),
    historyEntry({
      mode: 'test',
      contentScenarioId: 'sprint',
      date: '2026-04-12T12:00:00.000Z',
      wpm: 70,
      acc: 90,
    }),
    historyEntry({
      mode: 'test',
      contentScenarioId: 'sprint',
      date: '2026-04-20T12:00:00.000Z',
      wpm: 80,
      acc: 94,
    }),
    historyEntry({
      mode: 'test',
      contentScenarioId: 'sprint',
      date: '2026-04-22T12:00:00.000Z',
      wpm: 90,
      acc: 98,
    }),
    historyEntry({
      mode: 'practice',
      contentScenarioId: 'survival',
      date: '2026-04-21T12:00:00.000Z',
      wpm: 55,
      acc: 88,
      passed: false,
    }),
    historyEntry({
      mode: 'practice',
      contentScenarioId: 'survival',
      date: '2026-04-23T12:00:00.000Z',
      wpm: 62,
      acc: 91,
      passed: true,
    }),
    historyEntry({
      mode: 'practice',
      contentScenarioId: 'flawless',
      date: '2026-04-24T10:00:00.000Z',
      wpm: 45,
      acc: 100,
    }),
  ];
  const metrics = buildHomeHistoryMetrics(entries, now);

  return [
    check(
      'home metrics keep base practice separate from challenges',
      metrics.recentPracticeEntries.length === 6
        && metrics.recentPracticeEntries.every(isBasePracticeHistoryEntry),
      `Base practice entries: ${metrics.recentPracticeEntries.map(entry => entry.contentScenarioId ?? entry.mode).join(', ')}.`,
    ),
    check(
      'home metrics preserve sprint test entries',
      metrics.sprintEntries.length === 4 && metrics.recentSprintCount14d === 3,
      `Sprint total=${metrics.sprintEntries.length}, 14d=${metrics.recentSprintCount14d}.`,
    ),
    check(
      'home metrics count recent mode activity independently',
      metrics.recentPracticeCount14d === 4
        && metrics.recentSurvivalCount14d === 2
        && metrics.recentFlawlessCount14d === 1,
      `14d practice=${metrics.recentPracticeCount14d}, survival=${metrics.recentSurvivalCount14d}, flawless=${metrics.recentFlawlessCount14d}.`,
    ),
    check(
      'home metrics compute survival pass rate',
      metrics.survivalPassRate === 0.5,
      `Survival pass rate=${metrics.survivalPassRate}.`,
    ),
    check(
      'home metrics expose positive trend deltas',
      metrics.practiceSpeedTrend > 0 && metrics.sprintAccuracyTrend > 0,
      `Practice speed trend=${metrics.practiceSpeedTrend}, sprint accuracy trend=${metrics.sprintAccuracyTrend}.`,
    ),
  ];
}

function runHomeModeFocusDetailCardsChecks(): DiagnosticCheck[] {
  const translate = (key: string, params?: Record<string, unknown>) => {
    if (!params) return key;
    return `${key}:${Object.values(params).join('|')}`;
  };
  const populatedCards = buildHomeModeFocusDetailCards({
    formatSpeed: value => Math.round(value).toString(),
    locale: 'en-US',
    modeFocusSnapshots: buildModeFocusSnapshots([
      historyEntry({
        mode: 'practice',
        contentScenarioId: 'practice-normal',
        date: '2026-04-24T10:00:00.000Z',
        wpm: 55,
        acc: 96,
      }),
    ], translate),
    speedLabel: 'WPM',
    translate,
  });
  const emptyCards = buildHomeModeFocusDetailCards({
    formatSpeed: value => Math.round(value).toString(),
    locale: 'en-US',
    modeFocusSnapshots: buildModeFocusSnapshots([], translate),
    speedLabel: 'WPM',
    translate,
  });
  const practiceCard = populatedCards.find(card => card.id === 'practice');
  const emptyTestCard = emptyCards.find(card => card.id === 'test');

  return [
    check(
      'home mode focus detail cards expose UI-ready best attempt',
      practiceCard?.value === '55 WPM'
        && practiceCard.description.startsWith('home.detail.modeFocus.attempts:1|')
        && practiceCard.details.length === 1,
      `Practice card: value=${practiceCard?.value ?? 'none'}, description=${practiceCard?.description ?? 'none'}.`,
    ),
    check(
      'home mode focus detail cards keep empty mode copy UI-ready',
      emptyTestCard?.value === 'home.common.noAttempts'
        && emptyTestCard.description === 'records.modeFocus.test.description',
      `Empty test card: value=${emptyTestCard?.value ?? 'none'}, description=${emptyTestCard?.description ?? 'none'}.`,
    ),
  ];
}

function runHomePersonalRecordDetailCardsChecks(): DiagnosticCheck[] {
  const translate = (key: string, params?: Record<string, unknown>) => {
    if (!params) return key;
    return `${key}:${Object.values(params).join('|')}`;
  };
  const layouts = diagnosticLayouts();
  const progress: Progress = {
    history: {
      en: [
        historyEntry({
          mode: 'practice',
          contentScenarioId: 'practice-normal',
          date: '2026-04-20T10:00:00.000Z',
          wpm: 64,
          acc: 97,
        }),
        historyEntry({
          mode: 'game',
          date: '2026-04-21T10:00:00.000Z',
          wpm: 58,
          acc: 95,
          gameLevel: 4,
          gameStageType: 'normal',
        }),
      ],
    },
  };
  const detailCards = buildHomePersonalRecordDetailCards({
    formatSpeed: value => Math.round(value).toString(),
    personalRecordCards: buildHomePersonalRecordCards(progress, layouts, 'en', translate),
    speedLabel: 'WPM',
    translate,
  });
  const emptyDetailCards = buildHomePersonalRecordDetailCards({
    formatSpeed: value => Math.round(value).toString(),
    personalRecordCards: buildHomePersonalRecordCards({ history: {} }, layouts, 'en', translate),
    speedLabel: 'WPM',
    translate,
  });
  const practiceCard = detailCards.find(card => card.id === 'practice-overall');
  const emptyPracticeCard = emptyDetailCards.find(card => card.id === 'practice-overall');

  return [
    check(
      'home personal record detail cards expose UI-ready record values',
      practiceCard?.hasRecord === true
        && practiceCard.value === '64 WPM'
        && practiceCard.description.startsWith('97% · English · English'),
      `Practice record: value=${practiceCard?.value ?? 'none'}, description=${practiceCard?.description ?? 'none'}.`,
    ),
    check(
      'home personal record detail cards preserve empty fallbacks',
      emptyPracticeCard?.hasRecord === false
        && emptyPracticeCard.value === 'home.common.noData',
      `Empty practice record: value=${emptyPracticeCard?.value ?? 'none'}, hasRecord=${emptyPracticeCard?.hasRecord ?? 'none'}.`,
    ),
  ];
}

function runResultComparisonMetricItemsChecks(): DiagnosticCheck[] {
  const translate = (key: string, params?: Record<string, unknown>) => {
    if (!params) return key;
    return `${key}:${Object.values(params).join('|')}`;
  };
  const comparison = buildPracticeResultComparison([
    historyEntry({
      mode: 'practice',
      contentScenarioId: 'practice-normal',
      contentMode: 'adaptive-words',
      trainingMode: 'normal',
      date: '2026-04-20T10:00:00.000Z',
      wpm: 42,
      acc: 91,
    }),
    historyEntry({
      mode: 'practice',
      contentScenarioId: 'practice-normal',
      contentMode: 'adaptive-words',
      trainingMode: 'normal',
      date: '2026-04-21T10:00:00.000Z',
      wpm: 45,
      acc: 92,
    }),
  ], translate, {
    wpm: 50,
    acc: 94,
    contentScenarioId: 'practice-normal',
    contentMode: 'adaptive-words',
    trainingMode: 'normal',
  });
  const metrics = buildResultComparisonMetricItems({
    comparison,
    formatShortDate: date => `date:${date.slice(0, 10)}`,
    formatSpeed: value => Math.round(value).toString(),
    speedLabel: 'WPM',
    translate,
  });
  const emptyComparison = buildPracticeResultComparison([], translate, {
    wpm: 50,
    acc: 94,
    contentScenarioId: 'practice-normal',
    contentMode: 'adaptive-words',
    trainingMode: 'normal',
  });
  const emptyMetrics = buildResultComparisonMetricItems({
    comparison: emptyComparison,
    formatShortDate: date => date,
    formatSpeed: value => Math.round(value).toString(),
    speedLabel: 'WPM',
    translate,
  });

  return [
    check(
      'result comparison metric items format previous and best entries',
      metrics[0]?.id === 'previous-attempt'
        && metrics[0]?.value === '45 WPM'
        && metrics[0]?.details[0]?.includes('92%')
        && metrics[2]?.id === 'recent-best',
      `Comparison metrics: ${metrics.map(item => `${item.id}:${item.value}`).join(', ')}.`,
    ),
    check(
      'result comparison metric items format delta tones',
      metrics[1]?.id === 'previous-delta'
        && metrics[1]?.tone === 'good'
        && metrics[1]?.details[0] === 'resultComparison.accuracyDelta:+2.0',
      `Delta metric: ${metrics[1]?.id ?? 'none'} tone=${metrics[1]?.tone ?? 'none'} details=${metrics[1]?.details.join(', ') ?? 'none'}.`,
    ),
    check(
      'result comparison metric items preserve empty fallback',
      !hasResultComparison(emptyComparison) && emptyMetrics.length === 0,
      `Empty comparison metrics: ${emptyMetrics.length}.`,
    ),
  ];
}

function runMotivationProgressChecks(): DiagnosticCheck[] {
  const now = new Date('2026-04-22T10:00:00.000Z');
  const translate = (key: string, params?: Record<string, unknown>) => {
    if (!params) return key;
    return `${key}:${Object.values(params).join('|')}`;
  };
  const normalized = normalizeMotivationProgress({
    totals: {
      practiceSessions: -4,
      practiceMinutes: Number.NaN,
      targetSpeedSessions: 2.6,
      highAccuracySessions: -1,
      flawlessPracticeSessions: 1.2,
      successfulPracticeSessions: 2,
      gameVictories: -8,
      cleanGameVictories: 3.8,
    },
    streaks: {
      flawlessPractice: { current: -1, best: 4.4 },
      successfulPractice: { current: Number.NaN, best: -2 },
      cleanGameVictories: { current: 2.2, best: 3.6 },
    },
    weekly: {
      weekKey: 'stale-week',
      startedAt: '2026-01-01T00:00:00.000Z',
      endsAt: '2026-01-08T00:00:00.000Z',
      templateId: 'stale-template',
      activeGoalIds: [],
      goals: {} as never,
    },
    season: {
      cycleKey: 'stale-season',
      startedAt: '2026-01-01T00:00:00.000Z',
      endsAt: '2026-02-01T00:00:00.000Z',
      themeId: 'precision',
      featuredGoalIds: [],
      goals: {} as never,
    },
    lastUpdated: 'kept',
  }, now);
  const updated = updateMotivationAfterPractice(createEmptyMotivationProgress(now), {
    acc: 99,
    cpm: 220,
    elapsedSeconds: 150,
    flawlessSession: true,
    successfulSession: true,
    trainingMode: 'rhythm',
  }, now);
  const weeklyRecommendation = getWeeklyMotivationRecommendation(updated, translate, { now });
  const gameRecommendationProgress = createEmptyMotivationProgress(now);
  gameRecommendationProgress.weekly.goals['practice-sessions'] = {
    current: 8,
    completedAt: now.toISOString(),
  };
  gameRecommendationProgress.weekly.goals['game-levels'] = {
    current: 2,
    completedAt: null,
  };
  const gameWeeklyRecommendation = getWeeklyMotivationRecommendation(gameRecommendationProgress, translate, {
    now,
    todayDailyRunCompleted: true,
  });
  const goals = getMotivationGoalSnapshots(updated, translate, ['practice-sessions', 'practice-minutes']);

  return [
    check(
      'motivation progress normalizes invalid totals and streaks',
      normalized.totals.practiceSessions === 0
        && normalized.totals.practiceMinutes === 0
        && normalized.totals.targetSpeedSessions === 3
        && normalized.streaks.flawlessPractice.current === 0
        && normalized.streaks.cleanGameVictories.best === 4,
      `Totals practice=${normalized.totals.practiceSessions}, minutes=${normalized.totals.practiceMinutes}, target=${normalized.totals.targetSpeedSessions}; streak best=${normalized.streaks.cleanGameVictories.best}.`,
    ),
    check(
      'motivation progress resets stale weekly and season windows',
      normalized.weekly.weekKey !== 'stale-week'
        && normalized.weekly.activeGoalIds.length > 0
        && normalized.season.cycleKey !== 'stale-season'
        && normalized.season.featuredGoalIds.length > 0,
      `Weekly=${normalized.weekly.weekKey}/${normalized.weekly.templateId}, season=${normalized.season.cycleKey}/${normalized.season.themeId}.`,
    ),
    check(
      'practice motivation update increments totals and streaks',
      updated.totals.practiceSessions === 1
        && updated.totals.practiceMinutes === 2.5
        && updated.totals.targetSpeedSessions === 1
        && updated.totals.highAccuracySessions === 1
        && updated.streaks.flawlessPractice.current === 1
        && updated.streaks.successfulPractice.best === 1,
      `Practice totals=${updated.totals.practiceSessions}/${updated.totals.practiceMinutes}, speed=${updated.totals.targetSpeedSessions}, accuracy=${updated.totals.highAccuracySessions}.`,
    ),
    check(
      'weekly motivation recommendation stays actionable after partial progress',
      weeklyRecommendation !== null
        && weeklyRecommendation.actionMode === 'practice'
        && weeklyRecommendation.title.startsWith('motivation.recommendation.'),
      `Recommendation=${weeklyRecommendation?.title ?? 'none'} action=${weeklyRecommendation?.actionMode ?? 'none'}.`,
    ),
    check(
      'weekly motivation recommendation switches to game goals',
      gameWeeklyRecommendation !== null
        && gameWeeklyRecommendation.actionMode === 'game'
        && gameWeeklyRecommendation.title === 'motivation.recommendation.game-levels.titleAfterDaily',
      `Recommendation=${gameWeeklyRecommendation?.title ?? 'none'} action=${gameWeeklyRecommendation?.actionMode ?? 'none'}.`,
    ),
    check(
      'motivation goal snapshots normalize progress percentages',
      goals[0]?.current === 1
        && goals[0]?.progressPercent === 10
        && goals[1]?.current === 2.5
        && goals[1]?.progressPercent === 8,
      `Goal snapshots: ${goals.map(goal => `${goal.definition.id}:${goal.current}:${goal.progressPercent}`).join(', ')}.`,
    ),
  ];
}

function runStatsHistoryScopeChecks(): DiagnosticCheck[] {
  const translate = (key: string) => key;
  const progressHistory = {
    en: [
      historyEntry({
        mode: 'practice',
        date: '2026-04-21T10:00:00.000Z',
        wpm: 45,
        acc: 94,
        trainingMode: 'rhythm',
        charStats: {
          a: { hits: 3, misses: 1, totalTime: 450 },
          b: { hits: 1, misses: 3, totalTime: 500 },
        },
      }),
      historyEntry({
        mode: 'test',
        date: '2026-04-22T10:00:00.000Z',
        wpm: 80,
        acc: 98,
      }),
    ],
    ru: [
      historyEntry({
        mode: 'practice',
        date: '2026-04-23T10:00:00.000Z',
        wpm: 35,
        acc: 90,
      }),
    ],
  };
  const practiceRhythmHistory = {
    en: [
      rhythmSession({
        id: 'rhythm-en',
        date: '2026-04-21T10:00:20.000Z',
        wpm: 45,
        acc: 94,
        rhythmScore: 88,
      }),
    ],
    ru: [
      rhythmSession({
        id: 'rhythm-ru',
        date: '2026-04-23T10:00:00.000Z',
        wpm: 35,
        acc: 90,
        rhythmScore: 99,
      }),
    ],
  };
  const scope = buildStatsHistoryScopeModel({
    currentLayout: 'en',
    currentLayoutLabel: 'English',
    layoutScope: 'current',
    locale: 'en-US',
    practiceRhythmHistory,
    progressHistory,
    statsMode: 'practice',
    statsPeriod: 'all',
    translate,
    unit: 'wpm',
  });

  return [
    check(
      'stats scope filters history by current layout and mode',
      scope.filteredHistory.length === 1 && scope.filteredHistory[0]?.wpm === 45,
      `Filtered entries: ${scope.filteredHistory.map(entry => `${entry.mode}:${entry.wpm}`).join(', ')}.`,
    ),
    check(
      'stats scope filters rhythm sessions with the same layout scope',
      scope.rhythmSessions.length === 1 && scope.bestRhythmSession?.session.id === 'rhythm-en',
      `Rhythm sessions: ${scope.rhythmSessions.map(item => item.session.id).join(', ')}.`,
    ),
    check(
      'stats scope links matching rhythm session to history rows',
      scope.filteredSessionHistory[0]?.rhythm?.session.id === 'rhythm-en',
      `Linked rhythm: ${scope.filteredSessionHistory[0]?.rhythm?.session.id ?? 'none'}.`,
    ),
    check(
      'stats scope aggregates current-layout char stats',
      scope.keyStats.a?.hits === 3 && scope.worstKeys[0]?.ch === 'b',
      `Key a hits=${scope.keyStats.a?.hits ?? 0}, worst=${scope.worstKeys[0]?.ch ?? 'none'}.`,
    ),
  ];
}

function runStatsSummaryCardsChecks(): DiagnosticCheck[] {
  const translate = (key: string, params?: Record<string, unknown>) => {
    if (!params) return key;
    return `${key}:${Object.values(params).join('|')}`;
  };
  const emptySummary = buildStatsSummaryCardsViewModel({
    locale: 'en-US',
    statsViewModel: {
      accuracyTrend: { formattedDelta: '0', label: 'stable', tone: 'flat' },
      bestAccuracyEntry: null,
      bestRhythmSession: null,
      bestSpeedEntry: null,
      filteredHistory: [],
      rowInsights: [],
      speedTrend: { formattedDelta: '0', label: 'stable', tone: 'flat' },
      summaryScopeLabel: 'all · all · English',
      weakestFingers: [],
    },
    translate,
    unit: 'wpm',
  });
  const populatedSummary = buildStatsSummaryCardsViewModel({
    locale: 'en-US',
    statsViewModel: {
      accuracyTrend: { formattedDelta: '+2', label: 'growing', tone: 'up' },
      bestAccuracyEntry: historyEntry({
        mode: 'practice',
        date: '2026-04-20T10:00:00.000Z',
        wpm: 42,
        acc: 99,
      }),
      bestRhythmSession: {
        layoutId: 'en',
        session: rhythmSession({
          id: 'summary-rhythm',
          date: '2026-04-20T10:00:00.000Z',
          rhythmScore: 87,
        }),
      },
      bestSpeedEntry: historyEntry({
        mode: 'test',
        contentScenarioId: 'sprint',
        date: '2026-04-21T10:00:00.000Z',
        wpm: 80,
        acc: 95,
      }),
      filteredHistory: [
        historyEntry({ mode: 'practice', wpm: 30, acc: 90 }),
        historyEntry({ mode: 'practice', wpm: 40, acc: 92 }),
        historyEntry({ mode: 'practice', wpm: 50, acc: 94 }),
        historyEntry({ mode: 'practice', wpm: 60, acc: 96 }),
      ],
      rowInsights: [{ row: 'top', errorRate: 12, avgMs: 180 }],
      speedTrend: { formattedDelta: '+8', label: 'growing', tone: 'up' },
      summaryScopeLabel: 'all · all · English',
      weakestFingers: [{ finger: 'index_left', errorRate: 10, avgMs: 170 }],
    },
    translate,
    unit: 'wpm',
  });

  return [
    check(
      'stats summary cards preserve empty fallbacks',
      emptySummary.cards.every(card => card.value === '—') && emptySummary.trends[0]?.note === 'all · all · English',
      `Empty values: ${emptySummary.cards.map(card => card.value).join(', ')}.`,
    ),
    check(
      'stats summary cards format populated best results',
      populatedSummary.cards[0]?.value === '80 WPM'
        && populatedSummary.cards[1]?.value === '99%'
        && populatedSummary.cards[2]?.value === '87%',
      `Best cards: ${populatedSummary.cards.slice(0, 3).map(card => card.value).join(', ')}.`,
    ),
    check(
      'stats summary cards expose trend notes with enough history',
      populatedSummary.trends[0]?.note === '+8 WPM'
        && populatedSummary.trends[1]?.note === 'stats.summary.accuracyTrendNote:+2',
      `Trend notes: ${populatedSummary.trends.map(item => item.note).join(', ')}.`,
    ),
  ];
}

function runStatsSessionsViewModelChecks(): DiagnosticCheck[] {
  const translate = (key: string, params?: Record<string, unknown>) => {
    if (!params) return key;
    return `${key}:${Object.values(params).join('|')}`;
  };
  const rhythm = {
    layoutId: 'en',
    session: rhythmSession({
      id: 'session-rhythm',
      date: '2026-04-24T10:00:20.000Z',
      wpm: 52,
      acc: 97,
      rhythmScore: 91,
      averageInterval: 175,
      averageDeviation: 12,
      worstInterval: 230,
      textLength: 140,
      intervals: [170, 180, 230, 174],
    }),
  };
  const sessionItem = {
    id: 'session-1',
    layoutId: 'en',
    entry: historyEntry({
      mode: 'practice',
      contentScenarioId: 'practice-rhythm',
      trainingMode: 'rhythm',
      date: '2026-04-24T10:00:00.000Z',
      wpm: 52,
      acc: 97,
      charStats: {
        a: { hits: 5, misses: 1, totalTime: 600 },
        b: { hits: 2, misses: 3, totalTime: 500 },
      },
    }),
    rhythm,
  };
  const historyItems = buildStatsSessionHistoryListViewModel({
    getLayoutLabel: layoutId => `Layout ${layoutId}`,
    items: [sessionItem],
    locale: 'en-US',
    translate,
    unit: 'wpm',
  });
  const selection = buildStatsSessionSelectionViewModel([sessionItem], 'session-1');
  const sessions = buildStatsSessionsViewModel({
    getLayoutLabel: layoutId => `Layout ${layoutId}`,
    locale: 'en-US',
    sessionSelection: selection,
    statsViewModel: { filteredSessionHistory: [sessionItem] },
    translate,
    unit: 'wpm',
  });
  const detailSummary = buildStatsSessionDetailSummaryViewModel({
    displayedRhythmSession: selection.selectedSessionViewModel.displayedRhythmSession,
    getLayoutLabel: layoutId => `Layout ${layoutId}`,
    selectedHistoryRhythm: selection.selectedSessionViewModel.selectedHistoryRhythm,
    selectedHistorySession: sessionItem,
    translate,
    unit: 'wpm',
  });
  const rhythmMetrics = buildStatsRhythmMetricViewModel(rhythm, 2, 230, translate);
  const worstKeyCards = buildStatsWorstKeyCardsViewModel([
    { ch: ' ', errRate: 0.5, avgTime: 240 },
    { ch: 'b', errRate: 0.6, avgTime: 250 },
  ], translate);

  return [
    check(
      'stats sessions history rows format session metadata',
      historyItems[0]?.id === 'session-1'
        && historyItems[0]?.layoutLabel === 'Layout en'
        && historyItems[0]?.speedLabel === '52 WPM'
        && historyItems[0]?.accuracyLabel === '97%',
      `History row: ${historyItems[0]?.layoutLabel ?? 'none'}, ${historyItems[0]?.speedLabel ?? 'none'}, ${historyItems[0]?.accuracyLabel ?? 'none'}.`,
    ),
    check(
      'stats session detail summary keeps selected session metrics',
      detailSummary.map(item => item.id).join('|') === 'mode|scenario|layout|speed|accuracy',
      `Detail ids: ${detailSummary.map(item => item.id).join(', ')}.`,
    ),
    check(
      'stats rhythm metrics expose full rhythm summary',
      rhythmMetrics.length === 6 && rhythmMetrics[0]?.value === '91%',
      `Rhythm metrics: ${rhythmMetrics.map(item => `${item.id}:${item.value}`).join(', ')}.`,
    ),
    check(
      'stats worst key cards preserve special space label',
      worstKeyCards[0]?.charLabel === '␣' && worstKeyCards[1]?.errorLabel === 'stats.keys.errorRateShort:60',
      `Worst key labels: ${worstKeyCards.map(item => `${item.charLabel}/${item.errorLabel}`).join(', ')}.`,
    ),
    check(
      'stats sessions view model wires selected detail and rhythm panel',
      sessions.hasHistory
        && sessions.selectedHistorySessionId === 'session-1'
        && Boolean(sessions.detail.keyboardHeatmap)
        && sessions.rhythmPanel.summaryItems.length === 6,
      `Selected=${sessions.selectedHistorySessionId || 'none'}, heatmap=${Boolean(sessions.detail.keyboardHeatmap)}, rhythmItems=${sessions.rhythmPanel.summaryItems.length}.`,
    ),
  ];
}

function runPracticeResultPrimaryMetricsChecks(): DiagnosticCheck[] {
  const translate = (key: string) => key;
  const normalMetrics = buildPracticeResultPrimaryMetrics({
    layoutProgressUnlocked: 8,
    practicesPerUnlock: 12,
    result: {
      acc: 91.4,
      feedback: {} as never,
      newLetter: false,
      openedLetter: null,
      rhythmDeviation: 0,
      rhythmScore: 0,
      unlockProgress: 7,
      wpm: 52,
      worstChar: 'q',
    },
    trainingMode: 'normal',
    translate,
  });
  const rhythmMetrics = buildPracticeResultPrimaryMetrics({
    layoutProgressUnlocked: 9,
    practicesPerUnlock: 12,
    result: {
      acc: 98.2,
      feedback: {} as never,
      newLetter: true,
      openedLetter: 'j',
      rhythmDeviation: 42,
      rhythmScore: 83,
      unlockProgress: 0,
      wpm: 48,
      worstChar: null,
    },
    trainingMode: 'rhythm',
    translate,
  });
  const emptyMetrics = buildPracticeResultPrimaryMetrics({
    layoutProgressUnlocked: 0,
    practicesPerUnlock: 12,
    result: null,
    trainingMode: 'normal',
    translate,
  });

  return [
    check(
      'practice result primary metrics format normal mode',
      normalMetrics.map(item => item.id).join('|') === 'accuracy|worst-char|letters|until-new'
        && normalMetrics[0]?.value === '91%'
        && normalMetrics[0]?.tone === 'warn'
        && normalMetrics[1]?.value === 'Q'
        && normalMetrics[3]?.value === '7/12',
      `Normal metrics: ${normalMetrics.map(item => `${item.id}:${item.value}`).join(', ')}.`,
    ),
    check(
      'practice result primary metrics include rhythm mode details',
      rhythmMetrics.map(item => item.id).join('|') === 'accuracy|rhythm|rhythm-deviation|worst-char|letters|new-letter'
        && rhythmMetrics[0]?.tone === 'good'
        && rhythmMetrics[1]?.value === '83%'
        && rhythmMetrics[2]?.value === '42 practice.msShort'
        && rhythmMetrics[3]?.value === '—',
      `Rhythm metrics: ${rhythmMetrics.map(item => `${item.id}:${item.value}`).join(', ')}.`,
    ),
    check(
      'practice result primary metrics preserve empty fallback',
      emptyMetrics.length === 0,
      `Empty metrics: ${emptyMetrics.length}.`,
    ),
  ];
}

function runModeResultPrimaryMetricsChecks(): DiagnosticCheck[] {
  const translate = (key: string) => key;
  const cleanSprintMetrics = buildSprintResultPrimaryMetrics({
    chars: 240,
    elapsed: 29.4,
    errors: 0,
  }, translate);
  const roughSprintMetrics = buildSprintResultPrimaryMetrics({
    chars: 180,
    elapsed: 0.2,
    errors: 5,
  }, translate);
  const survivalMetrics = buildChallengeResultPrimaryMetrics({
    allowedErrors: 3,
    attemptReserveLabel: 'attempt reserve',
    livesLeftLabel: 'lives left',
    result: {
      chars: 320,
      errors: 2,
      livesLeft: 1,
      passed: false,
    },
    translate,
  });
  const flawlessMetrics = buildChallengeResultPrimaryMetrics({
    allowedErrors: 0,
    attemptReserveLabel: 'attempt reserve',
    livesLeftLabel: 'lives left',
    result: {
      chars: 360,
      errors: 0,
      livesLeft: 1,
      passed: true,
    },
    translate,
  });

  return [
    check(
      'sprint result primary metrics format duration and error tone',
      cleanSprintMetrics.map(item => item.id).join('|') === 'chars|errors|duration'
        && cleanSprintMetrics[1]?.tone === 'good'
        && cleanSprintMetrics[2]?.value === '29 common.secondsShort'
        && roughSprintMetrics[1]?.tone === 'bad'
        && roughSprintMetrics[2]?.value === '1 common.secondsShort',
      `Sprint metrics: clean=${cleanSprintMetrics.map(item => `${item.id}:${item.value}:${item.tone ?? 'none'}`).join(', ')}, rough=${roughSprintMetrics.map(item => `${item.id}:${item.value}:${item.tone ?? 'none'}`).join(', ')}.`,
    ),
    check(
      'challenge result primary metrics pick labels and tones',
      survivalMetrics.map(item => item.id).join('|') === 'lives|errors|chars'
        && survivalMetrics[0]?.label === 'lives left'
        && survivalMetrics[0]?.tone === 'warn'
        && survivalMetrics[1]?.tone === 'warn'
        && flawlessMetrics[0]?.label === 'attempt reserve'
        && flawlessMetrics[0]?.tone === 'good'
        && flawlessMetrics[1]?.tone === 'good',
      `Challenge metrics: survival=${survivalMetrics.map(item => `${item.id}:${item.label}:${item.tone ?? 'none'}`).join(', ')}, flawless=${flawlessMetrics.map(item => `${item.id}:${item.label}:${item.tone ?? 'none'}`).join(', ')}.`,
    ),
  ];
}

function comparisonWithDeltas(args: {
  previousTone?: 'up' | 'down' | 'flat';
  recentBestSpeedDelta?: number;
  recentBestAccuracyDelta?: number;
}): ResultComparisonSummary {
  const {
    previousTone,
    recentBestAccuracyDelta,
    recentBestSpeedDelta,
  } = args;

  return {
    previousAttempt: null,
    previousDelta: previousTone
      ? {
          accuracyDelta: previousTone === 'down' ? -2 : previousTone === 'up' ? 2 : 0,
          formattedAccuracyDelta: previousTone,
          formattedSpeedDelta: previousTone,
          label: 'previous',
          speedDelta: previousTone === 'down' ? -5 : previousTone === 'up' ? 5 : 0,
          tone: previousTone,
        }
      : null,
    recentBest: null,
    recentBestDelta: recentBestSpeedDelta == null
      ? null
      : {
          accuracyDelta: recentBestAccuracyDelta ?? 0,
          formattedAccuracyDelta: 'best',
          formattedSpeedDelta: 'best',
          label: 'best',
          speedDelta: recentBestSpeedDelta,
          tone: recentBestSpeedDelta > 0 ? 'up' : recentBestSpeedDelta < 0 ? 'down' : 'flat',
        },
  };
}

function runModeResultCalloutChecks(): DiagnosticCheck[] {
  const translate = (key: string) => key;
  const improvedSprint = buildSprintResultCallout(translate, {
    acc: 94,
    errors: 2,
    wpm: 72,
  }, comparisonWithDeltas({ recentBestSpeedDelta: 4, recentBestAccuracyDelta: 0.5 }));
  const cleanSprint = buildSprintResultCallout(translate, {
    acc: 99,
    errors: 0,
    wpm: 68,
  }, null);
  const roughSprint = buildSprintResultCallout(translate, {
    acc: 91,
    errors: 2,
    wpm: 52,
  }, null);
  const belowPreviousSprint = buildSprintResultCallout(translate, {
    acc: 95,
    errors: 2,
    wpm: 60,
  }, comparisonWithDeltas({ previousTone: 'down' }));
  const steadySprint = buildSprintResultCallout(translate, {
    acc: 95,
    errors: 2,
    wpm: 60,
  }, null);
  const flawlessPerfect = buildChallengeResultCallout(translate, 'flawless', {
    acc: 100,
    errors: 0,
    livesLeft: 1,
    passed: true,
    progressPercent: 100,
  }, null, 1);
  const survivalLate = buildChallengeResultCallout(translate, 'survival', {
    acc: 95,
    errors: 2,
    livesLeft: 0,
    passed: false,
    progressPercent: 82,
  }, null, 3);
  const survivalStability = buildChallengeResultCallout(translate, 'survival', {
    acc: 91,
    errors: 3,
    livesLeft: 0,
    passed: false,
    progressPercent: 45,
  }, null, 3);
  const challengeImproving = buildChallengeResultCallout(translate, 'survival', {
    acc: 96,
    errors: 1,
    livesLeft: 2,
    passed: false,
    progressPercent: 55,
  }, comparisonWithDeltas({ recentBestSpeedDelta: 3 }), 3);
  const flawlessNeutral = buildChallengeResultCallout(translate, 'flawless', {
    acc: 96,
    errors: 1,
    livesLeft: 0,
    passed: false,
    progressPercent: 50,
  }, null, 1);

  return [
    check(
      'sprint result callouts cover priority branches',
      improvedSprint.title === 'sprint.callouts.improved.title'
        && cleanSprint.title === 'sprint.callouts.clean.title'
        && roughSprint.title === 'sprint.callouts.errors.title'
        && belowPreviousSprint.title === 'sprint.callouts.belowPrevious.title'
        && steadySprint.title === 'sprint.callouts.steady.title',
      `Sprint callouts: ${[
        improvedSprint.title,
        cleanSprint.title,
        roughSprint.title,
        belowPreviousSprint.title,
        steadySprint.title,
      ].join(', ')}.`,
    ),
    check(
      'challenge result callouts cover outcome branches',
      flawlessPerfect.title === 'survival.callouts.flawlessPerfect.title'
        && survivalLate.title === 'survival.callouts.survivalLate.title'
        && survivalStability.title === 'survival.callouts.survivalStability.title'
        && challengeImproving.title === 'survival.callouts.improving.title'
        && flawlessNeutral.title === 'survival.callouts.flawlessMid.title',
      `Challenge callouts: ${[
        flawlessPerfect.title,
        survivalLate.title,
        survivalStability.title,
        challengeImproving.title,
        flawlessNeutral.title,
      ].join(', ')}.`,
    ),
  ];
}

function runModeResultHistoryChecks(): DiagnosticCheck[] {
  const translate = (key: string) => key;
  const historyByLayout = {
    en: [
      historyEntry({
        mode: 'practice',
        contentScenarioId: 'practice-normal',
        contentMode: 'adaptive-words',
        trainingMode: 'normal',
        date: '2026-04-20T10:00:00.000Z',
        wpm: 42,
        acc: 91,
      }),
      historyEntry({
        mode: 'practice',
        contentScenarioId: 'survival',
        contentMode: 'adaptive-words',
        date: '2026-04-21T10:00:00.000Z',
        wpm: 39,
        acc: 88,
      }),
      historyEntry({
        mode: 'practice',
        contentScenarioId: 'flawless',
        contentMode: 'adaptive-words',
        date: '2026-04-21T11:00:00.000Z',
        wpm: 41,
        acc: 99,
      }),
      historyEntry({
        mode: 'test',
        contentScenarioId: 'sprint',
        contentMode: 'adaptive-words',
        durationSeconds: 30,
        date: '2026-04-22T10:00:00.000Z',
        wpm: 70,
        acc: 94,
      }),
      historyEntry({
        mode: 'test',
        contentScenarioId: 'sprint',
        contentMode: 'adaptive-words',
        durationSeconds: 60,
        date: '2026-04-23T10:00:00.000Z',
        wpm: 60,
        acc: 96,
      }),
    ],
  };
  const practiceModel = buildModeResultHistoryModel({
    contentMode: 'adaptive-words',
    currentLayout: 'en',
    historyByLayout,
    mode: 'practice-scenario',
    result: { wpm: 48, acc: 95 },
    scenarioId: 'practice-normal',
    t: translate,
    trainingMode: 'normal',
  });
  const survivalModel = buildModeResultHistoryModel({
    contentMode: 'adaptive-words',
    currentLayout: 'en',
    historyByLayout,
    mode: 'practice-scenario',
    result: { wpm: 45, acc: 91 },
    scenarioId: 'survival',
    t: translate,
    trainingMode: 'normal',
  });
  const flawlessModel = buildModeResultHistoryModel({
    contentMode: 'adaptive-words',
    currentLayout: 'en',
    historyByLayout,
    mode: 'practice-scenario',
    result: { wpm: 44, acc: 100 },
    scenarioId: 'flawless',
    t: translate,
    trainingMode: 'normal',
  });
  const sprintModel = buildModeResultHistoryModel({
    contentMode: 'adaptive-words',
    currentLayout: 'en',
    historyByLayout,
    mode: 'sprint',
    result: { wpm: 75, acc: 95, elapsed: 30 },
    scenarioId: 'sprint',
    t: translate,
  });
  const emptyModel = buildModeResultHistoryModel({
    contentMode: 'adaptive-words',
    currentLayout: 'missing',
    historyByLayout,
    mode: 'practice-scenario',
    result: null,
    scenarioId: 'practice-normal',
    t: translate,
  });
  const sprintBestLabel = buildModeBestResultLabelViewModel({
    emptyLabel: 'no sprint results',
    entries: sprintModel.bestEntries,
    formatSpeed: value => Math.round(value).toString(),
    speedLabel: 'WPM',
  });
  const survivalBestLabel = buildModeBestResultLabelViewModel({
    emptyLabel: 'no survival results',
    entries: survivalModel.bestEntries,
    formatSpeed: value => Math.round(value).toString(),
    speedLabel: 'WPM',
  });
  const emptyBestLabel = buildModeBestResultLabelViewModel({
    emptyLabel: 'no results',
    entries: [],
    formatSpeed: value => Math.round(value).toString(),
    speedLabel: 'WPM',
  });

  return [
    check(
      'mode result history keeps layout-local entries',
      practiceModel.historyEntries.length === 5 && emptyModel.historyEntries.length === 0,
      `Current=${practiceModel.historyEntries.length}, missing=${emptyModel.historyEntries.length}.`,
    ),
    check(
      'mode result history filters practice best entries by scenario',
      practiceModel.bestEntries.length === 1 && practiceModel.bestEntries[0]?.contentScenarioId === 'practice-normal',
      `Practice best entries: ${practiceModel.bestEntries.map(entry => entry.contentScenarioId ?? entry.mode).join(', ')}.`,
    ),
    check(
      'mode result history filters sprint best entries from test persistence',
      sprintModel.bestEntries.length === 2 && sprintModel.bestEntries.every(isSprintHistoryEntry),
      `Sprint best entries: ${sprintModel.bestEntries.map(entry => `${entry.durationSeconds ?? 'n/a'}s`).join(', ')}.`,
    ),
    check(
      'mode result history filters survival and flawless independently',
      survivalModel.bestEntries.length === 1
        && survivalModel.bestEntries.every(isSurvivalHistoryEntry)
        && flawlessModel.bestEntries.length === 1
        && flawlessModel.bestEntries.every(isFlawlessHistoryEntry),
      `Challenge entries: survival=${survivalModel.bestEntries.map(entry => entry.contentScenarioId ?? entry.mode).join(', ')}, flawless=${flawlessModel.bestEntries.map(entry => entry.contentScenarioId ?? entry.mode).join(', ')}.`,
    ),
    check(
      'mode result history builds comparison only when result exists',
      Boolean(practiceModel.resultComparison?.previousAttempt)
        && Boolean(sprintModel.resultComparison?.previousAttempt)
        && Boolean(survivalModel.resultComparison?.previousAttempt)
        && Boolean(flawlessModel.resultComparison?.previousAttempt)
        && emptyModel.resultComparison === null,
      `Practice comparison=${Boolean(practiceModel.resultComparison)}, sprint comparison=${Boolean(sprintModel.resultComparison)}, survival comparison=${Boolean(survivalModel.resultComparison)}, flawless comparison=${Boolean(flawlessModel.resultComparison)}, empty=${emptyModel.resultComparison}.`,
    ),
    check(
      'mode best result labels are UI-ready',
      sprintBestLabel.bestValue === '70 WPM · 94%'
        && survivalBestLabel.bestValue === '39 WPM · 88%'
        && emptyBestLabel.bestValue === 'no results',
      `Best labels: sprint=${sprintBestLabel.bestValue}, survival=${survivalBestLabel.bestValue}, empty=${emptyBestLabel.bestValue}.`,
    ),
  ];
}

function runGameResultHistoryChecks(): DiagnosticCheck[] {
  const translate = (key: string) => key;
  const layouts = diagnosticLayouts();
  const historyEntries: HistoryEntry[] = [
    historyEntry({
      mode: 'game',
      date: '2026-04-20T10:00:00.000Z',
      wpm: 70,
      acc: 92,
      gameLevel: 3,
      gameStageType: 'normal',
    }),
    historyEntry({
      mode: 'game',
      date: '2026-04-21T10:00:00.000Z',
      wpm: 80,
      acc: 95,
      gameLevel: 3,
      gameStageType: 'normal',
    }),
  ];
  const progress: Progress = {
    history: { en: historyEntries },
    layoutProgress: { en: { unlocked: 7, unlockProgress: 100 } },
  };
  const ghostRun: GameGhostRun = {
    date: '2026-04-18T10:00:00.000Z',
    maxLevel: 3,
    levels: [
      { level: 3, wpm: 72, acc: 93, elapsed: 25, passed: true },
    ],
  };
  const model = buildGameResultHistoryModel({
    currentLayout: 'en',
    ghostRun,
    historyEntries,
    layoutProgressUnlocked: 7,
    layouts,
    progress,
    result: gameResult({ level: 3, wpm: 84, acc: 96 }),
    translate,
  });
  const emptyModel = buildGameResultHistoryModel({
    currentLayout: 'en',
    ghostRun,
    historyEntries,
    layoutProgressUnlocked: 7,
    layouts,
    progress,
    result: null,
    translate,
  });

  return [
    check(
      'game result history builds comparison against game history',
      Boolean(model.comparison?.previousAttempt),
      `Comparison previous=${Boolean(model.comparison?.previousAttempt)}.`,
    ),
    check(
      'game result history builds ghost comparison',
      model.ghostComparison?.ghostWpm === 72 && model.ghostComparison.delta === 12,
      `Ghost=${model.ghostComparison?.ghostWpm ?? 'none'}, delta=${model.ghostComparison?.delta ?? 'none'}.`,
    ),
    check(
      'game result history builds mastery only for real result',
      Boolean(model.masterySummary) && emptyModel.masterySummary === null,
      `Mastery=${Boolean(model.masterySummary)}, empty=${emptyModel.masterySummary}.`,
    ),
  ];
}

function runGameResultMetricItemsChecks(): DiagnosticCheck[] {
  const translate = (key: string) => key;
  const cleanBossMetrics = buildGameResultMetricItems(gameResult({
    acc: 96,
    elapsed: 28.25,
    isBoss: true,
    maxErrors: 2,
    maxRhythmDeviation: 80,
    minAccuracy: 95,
    rhythmDeviation: 42,
    timeLimitSeconds: 30,
  }), translate);
  const roughBossMetrics = buildGameResultMetricItems(gameResult({
    acc: 88,
    elapsed: 31.5,
    isBoss: true,
    maxErrors: 0,
    maxRhythmDeviation: 60,
    minAccuracy: 90,
    rhythmDeviation: 74,
    timeLimitSeconds: 30,
  }), translate);
  const normalMetrics = buildGameResultMetricItems(gameResult({
    acc: 92,
    isBoss: false,
    maxErrors: null,
    maxRhythmDeviation: null,
    minAccuracy: 90,
    rhythmDeviation: null,
    timeLimitSeconds: null,
  }), translate);

  return [
    check(
      'game result metrics format boss timer and rhythm success branches',
      cleanBossMetrics.map(item => item.id).join('|') === 'accuracy|time|rhythm|flawless-limit'
        && cleanBossMetrics[0]?.tone === 'good'
        && cleanBossMetrics[1]?.value === '28.3 common.secondsShort'
        && cleanBossMetrics[1]?.tone === 'good'
        && cleanBossMetrics[2]?.tone === 'good'
        && cleanBossMetrics[3]?.value === 2,
      `Clean boss metrics: ${cleanBossMetrics.map(item => `${item.id}:${item.value}:${item.tone ?? 'none'}`).join(', ')}.`,
    ),
    check(
      'game result metrics flag failed thresholds',
      roughBossMetrics.map(item => item.id).join('|') === 'accuracy|time|rhythm'
        && roughBossMetrics[0]?.tone === 'bad'
        && roughBossMetrics[1]?.tone === 'bad'
        && roughBossMetrics[2]?.tone === 'bad',
      `Rough boss metrics: ${roughBossMetrics.map(item => `${item.id}:${item.tone ?? 'none'}`).join(', ')}.`,
    ),
    check(
      'game result metrics omit optional boss-only metrics for normal levels',
      normalMetrics.map(item => item.id).join('|') === 'accuracy'
        && normalMetrics[0]?.label === 'common.accuracy / 90%+',
      `Normal metrics: ${normalMetrics.map(item => item.id).join(', ')}.`,
    ),
  ];
}

function runGameResultCardViewModelChecks(): DiagnosticCheck[] {
  const translate = (key: string, params?: Record<string, string | number | boolean | null | undefined>) => {
    if (!params) return key;
    return `${key}:${Object.entries(params).map(([name, value]) => `${name}=${value}`).join('|')}`;
  };
  const victoryModel = buildGameResultCardViewModel({
    bossLevelInterval: 5,
    isTerminalDailyRun: true,
    mapSelectionPending: false,
    result: gameResult({ victory: true, passed: true, livesLeft: 1 }),
    rewardPending: false,
    totalLevels: 12,
    translate,
  });
  const bossPassedModel = buildGameResultCardViewModel({
    bossLevelInterval: 5,
    isTerminalDailyRun: false,
    mapSelectionPending: false,
    result: gameResult({ isBoss: true, level: 4, passed: true, victory: false }),
    rewardPending: false,
    totalLevels: 12,
    translate,
  });
  const mapSelectionModel = buildGameResultCardViewModel({
    bossLevelInterval: 5,
    isTerminalDailyRun: false,
    mapSelectionPending: true,
    result: gameResult({ isBoss: false, level: 3, passed: true, victory: false }),
    rewardPending: false,
    totalLevels: 12,
    translate,
  });
  const timeoutRetryModel = buildGameResultCardViewModel({
    bossLevelInterval: 5,
    isTerminalDailyRun: false,
    mapSelectionPending: false,
    result: gameResult({ livesLeft: 1, passed: false, timedOut: true }),
    rewardPending: false,
    totalLevels: 12,
    translate,
  });
  const hpLostRetryModel = buildGameResultCardViewModel({
    bossLevelInterval: 5,
    isTerminalDailyRun: false,
    mapSelectionPending: false,
    result: gameResult({ livesLeft: 1, minAccuracy: 92, passed: false, timedOut: false }),
    rewardPending: false,
    totalLevels: 12,
    translate,
  });
  const gameOverModel = buildGameResultCardViewModel({
    bossLevelInterval: 5,
    isTerminalDailyRun: true,
    mapSelectionPending: false,
    result: gameResult({ livesLeft: 0, passed: false, timedOut: false }),
    rewardPending: false,
    totalLevels: 12,
    translate,
  });
  const rewardPendingModel = buildGameResultCardViewModel({
    bossLevelInterval: 5,
    isTerminalDailyRun: false,
    mapSelectionPending: false,
    result: gameResult({ isBoss: true, passed: true }),
    rewardPending: true,
    totalLevels: 12,
    translate,
  });

  return [
    check(
      'game result card view model covers victory and daily terminal actions',
      victoryModel.title === 'game.result.title.victory'
        && victoryModel.summary === 'game.result.summary.victory:totalLevels=12'
        && victoryModel.actions.map(action => action.id).join('|') === 'restart|return-to-main-game'
        && victoryModel.actions[0]?.focusTarget
        && victoryModel.actions[1]?.variant === 'default',
      `Victory title=${victoryModel.title}, actions=${victoryModel.actions.map(action => action.id).join(', ')}.`,
    ),
    check(
      'game result card view model covers passed branches',
      bossPassedModel.title === 'game.result.title.bossPassed'
        && bossPassedModel.summary === 'game.result.summary.bossReward:level=5'
        && bossPassedModel.actions[0]?.id === 'continue'
        && mapSelectionModel.title === 'game.result.title.levelPassed'
        && mapSelectionModel.summary === 'game.result.summary.mapSelection'
        && mapSelectionModel.actions[0]?.label === 'game.result.actions.toMap',
      `Boss=${bossPassedModel.summary}, map=${mapSelectionModel.summary}/${mapSelectionModel.actions[0]?.label}.`,
    ),
    check(
      'game result card view model covers retryable timeout and hp loss',
      timeoutRetryModel.title === 'game.result.title.timeOut'
        && timeoutRetryModel.summary === 'game.result.summary.timeout:livesLeft=1'
        && timeoutRetryModel.actions[0]?.id === 'retry'
        && hpLostRetryModel.title === 'game.result.title.hpLost'
        && hpLostRetryModel.summary === 'game.result.summary.failure:livesLeft=1|minAccuracy=92'
        && hpLostRetryModel.actions[0]?.id === 'retry',
      `Timeout=${timeoutRetryModel.title}/${timeoutRetryModel.actions[0]?.id}, hp=${hpLostRetryModel.title}/${hpLostRetryModel.actions[0]?.id}.`,
    ),
    check(
      'game result card view model covers game over and reward pending action states',
      gameOverModel.title === 'game.result.title.gameOver'
        && gameOverModel.actions.map(action => action.id).join('|') === 'restart|return-to-main-game'
        && rewardPendingModel.actions.length === 0,
      `Game over actions=${gameOverModel.actions.map(action => action.id).join(', ')}, reward=${rewardPendingModel.actions.length}.`,
    ),
  ];
}

function runGameRewardChoiceBlockViewModelChecks(): DiagnosticCheck[] {
  const translate = (key: string, params?: Record<string, string | number | boolean | null | undefined>) => {
    if (!params) return key;
    return `${key}:${Object.entries(params).map(([name, value]) => `${name}=${value}`).join('|')}`;
  };
  const bossResult = gameResult({ isBoss: true, passed: true, victory: false });
  const rewardChoices = [
    {
      id: 'simple-item',
      kind: 'simple' as const,
      title: 'Simple reward',
      flavor: 'Simple flavor',
      description: 'Simple description',
      itemId: 'steady-gloves',
    },
    {
      id: 'durable-item',
      kind: 'durable' as const,
      title: 'Durable reward',
      flavor: 'Durable flavor',
      description: 'Durable description',
      itemId: 'rift-hourglass',
      disabled: true,
    },
    {
      id: 'letter-reward',
      kind: 'letter' as const,
      title: 'Letter reward',
      flavor: 'Letter flavor',
      description: 'Letter description',
      letter: 'q',
    },
    {
      id: 'event-reward',
      kind: 'event' as const,
      title: 'Event reward',
      flavor: 'Event flavor',
      description: 'Event description',
      effect: { maxLifeDelta: 1 },
    },
  ];
  const block = buildGameRewardChoiceBlockViewModel({
    result: bossResult,
    rewardChoices,
    selectedRewardMessage: null,
    translate,
  });
  const selectedBlock = buildGameRewardChoiceBlockViewModel({
    result: bossResult,
    rewardChoices,
    selectedRewardMessage: 'Reward selected',
    translate,
  });
  const hiddenBlock = buildGameRewardChoiceBlockViewModel({
    result: gameResult({ isBoss: false, passed: true, victory: false }),
    rewardChoices,
    selectedRewardMessage: null,
    translate,
  });
  const simple = block?.choices.find(choice => choice.choiceId === 'simple-item');
  const durable = block?.choices.find(choice => choice.choiceId === 'durable-item');
  const letter = block?.choices.find(choice => choice.choiceId === 'letter-reward');
  const event = block?.choices.find(choice => choice.choiceId === 'event-reward');

  return [
    check(
      'game reward choice view model exposes item rewards',
      block?.title === 'game.result.bossRewardTitle'
        && simple?.badge.kind === 'item'
        && simple.badge.iconKey === 'gauge'
        && simple.actionLabel === 'game.result.reward.actions.takeRelic'
        && simple.cardClassName === 'rarity-1'
        && simple.effects.length > 0
        && !simple.special,
      `Simple badge=${simple?.badge.kind ?? 'none'}, class=${simple?.cardClassName ?? 'none'}, effects=${simple?.effects.length ?? 0}.`,
    ),
    check(
      'game reward choice view model exposes durable and disabled rewards',
      durable?.badge.kind === 'item'
        && durable.badge.iconKey === 'timer'
        && durable.actionLabel === 'game.result.reward.actions.riskTake'
        && durable.disabled
        && durable.cardClassName === 'rarity-3 disabled'
        && durable.durability?.current === durable.durability?.max,
      `Durable class=${durable?.cardClassName ?? 'none'}, disabled=${durable?.disabled ?? false}, durability=${durable?.durability?.current ?? 'none'}.`,
    ),
    check(
      'game reward choice view model exposes letter and event rewards',
      letter?.badge.kind === 'letter'
        && letter.badge.label === 'Q'
        && letter.name === 'game.result.reward.letterName:letter=Q'
        && letter.actionLabel === 'game.result.reward.actions.wakeLetter'
        && event?.badge.kind === 'event'
        && event.badge.label === '\u2726'
        && event.rarity === 'game.result.reward.specialReward'
        && event.actionLabel === 'game.result.reward.actions.accept',
      `Letter=${letter?.name ?? 'none'}, eventBadge=${event?.badge.kind === 'event' ? event.badge.label : 'none'}.`,
    ),
    check(
      'game reward choice block handles selected and hidden states',
      selectedBlock?.selectedRewardMessage === 'Reward selected'
        && selectedBlock.choices.length === 0
        && hiddenBlock === null,
      `Selected=${selectedBlock?.selectedRewardMessage ?? 'none'}, selectedChoices=${selectedBlock?.choices.length ?? 'none'}, hidden=${hiddenBlock === null}.`,
    ),
  ];
}

function runCoreDiagnostics(): DiagnosticReport {
  const checks = [
    ...runSidebarViewModelChecks(),
    ...runResultMetricStripViewModelChecks(),
    ...runAchievementsViewModelChecks(),
    ...runLessonsViewModelChecks(),
    ...runContentPackSelectionChecks(),
    ...runHistorySelectorChecks(),
    ...runHomeHistoryMetricsChecks(),
    ...runHomeModeFocusDetailCardsChecks(),
    ...runHomePersonalRecordDetailCardsChecks(),
    ...runResultComparisonMetricItemsChecks(),
    ...runMotivationProgressChecks(),
    ...runStatsHistoryScopeChecks(),
    ...runStatsSummaryCardsChecks(),
    ...runStatsSessionsViewModelChecks(),
    ...runPracticeResultPrimaryMetricsChecks(),
    ...runModeResultPrimaryMetricsChecks(),
    ...runModeResultCalloutChecks(),
    ...runModeResultHistoryChecks(),
    ...runGameResultHistoryChecks(),
    ...runGameResultMetricItemsChecks(),
    ...runGameResultCardViewModelChecks(),
    ...runGameRewardChoiceBlockViewModelChecks(),
  ];

  return {
    checks,
    failed: checks.filter(item => !item.passed).length,
    passed: checks.filter(item => item.passed).length,
  };
}

function formatReport(report: DiagnosticReport): string {
  const lines = [
    '=== Core diagnostics ===',
    `Passed: ${report.passed}`,
    `Failed: ${report.failed}`,
    '',
  ];

  report.checks.forEach((item) => {
    lines.push(`${item.passed ? 'OK' : 'FAIL'} ${item.name}`);
    lines.push(`- ${item.detail}`);
  });

  return lines.join('\n');
}

function main() {
  const options = parseCliArgs(process.argv.slice(2));
  const report = runCoreDiagnostics();
  process.stdout.write(`${formatReport(report)}\n`);

  if (options.jsonPath) {
    writeJsonReport(options.jsonPath, { generatedAt: new Date().toISOString(), ...report });
    process.stdout.write(`JSON report saved to ${options.jsonPath}\n`);
  }

  if (report.failed > 0) {
    process.exitCode = 1;
  }
}

main();
