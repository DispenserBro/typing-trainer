import fs from 'fs';
import path from 'path';
import type {
  CustomPracticePack,
  ExtensionCatalogEntry,
  GameEquipmentState,
  GameAchievementDefinition,
  GameItemDefinition,
  GameGhostRun,
  GameRunEventChoice,
  GameRunResult,
  GameRunModifier,
  HistoryEntry,
  ImportedInterfaceLocaleDefinition,
  InstalledAddon,
  InstalledExtensionSource,
  InstalledMod,
  InstalledTheme,
  Lesson,
  LayoutPracticeInsights,
  LayoutProgressState,
  LayoutsData,
  Progress,
  PracticeState,
  PracticeRhythmSessionEntry,
  PracticeContentPack,
  Session,
  ThemeDefinitions,
} from '../shared/types';
import {
  getAvailablePracticeContentPacks,
  resolvePracticeContentPackSelection,
} from '../core/practice/contentPackSelection';
import { buildModeBestResultLabelViewModel } from '../core/practice/modeBestResult';
import { createEmptyLayoutPracticeInsights } from '../core/practice/insights';
import {
  buildChallengeResultCallout,
  buildSprintResultCallout,
} from '../core/practice/modeResultCallouts';
import { buildPracticeFamilyModeHeaderViewModel } from '../core/practice/modePagePresentation';
import {
  getChallengeModeConfig,
  getChallengeTotalLives,
  resolveChallengeCompletion,
  resolveSprintCompletion,
} from '../core/practice/modeCompletion';
import { resolvePracticeSessionCompletion } from '../core/practice/sessionCompletion';
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
import {
  buildHomeDetailMeta,
  buildHomeModeCardGroups,
  buildHomeProgressCenterCards,
  buildHomeProgressCenterVisibility,
  buildHomeVisibleQuickActions,
  type HomeActionModel,
} from '../core/home/viewModel';
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
  buildCompactMetricStripViewModel,
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
import {
  buildImportedInterfaceLocaleEntries,
  buildSettingsThemeOptions,
} from '../core/settings/viewModel';
import { buildTextDisplayWords } from '../core/text/displayModel';
import { buildGameResultHistoryModel } from '../core/game/resultHistory';
import { buildGameResultMetricItems } from '../core/game/resultMetrics';
import { resolveGameChoiceEffect, resolveGamePostLevelFlow } from '../core/game/runFlow';
import {
  buildGameResultCardViewModel,
  buildGameResultSecondaryBlocksViewModel,
} from '../core/game/resultPresentation';
import { buildGameRewardChoiceBlockViewModel } from '../core/game/resultRewards';
import { buildGameRunMapLayoutViewModel } from '../core/game/routes';
import {
  buildGameAchievementToastViewModels,
  buildGameEventChoiceCardViewModels,
  buildGameHudViewModel,
} from '../core/game/viewModel';
import {
  buildEquippedBySlot,
  buildEquippedEntries,
  buildGamePageBonusViewModel,
  buildGameInventoryPanelViewModel,
  buildInventoryEntries,
} from '../core/game/pageUtils';
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
  applySetupPreferenceSettings,
  normalizeSetupPreferences,
  resolveBundledExtensionSourceManifestPath,
  resolveSetupPreferenceExtensionSourceManifestPaths,
} from '../core/setup/setupPreferences';
import { resolveAppDataPaths } from '../core/setup/appDataPaths';
import {
  CURRENT_PROGRESS_SCHEMA_VERSION,
  migrateProgressData,
  normalizeProgressForSave,
} from '../core/progress/migrations';
import { resolveSafeRegistryFilePath } from '../core/addons/pathSafety';
import {
  countAttentionCatalogEntries,
  filterExtensionCatalogEntries,
  filterExtensionSources,
  filterInstalledAddons,
  filterInstalledMods,
  filterInstalledThemes,
  getAddonContentKinds,
  getAvailableInstalledAddonContentKinds,
  getSourceLocationLabel,
} from '../core/addons/catalogSelectors';
import {
  buildExtensionCatalogEmptyStateViewModel,
  buildExtensionCatalogInstallActionViewModel,
} from '../core/addons/extensionCatalogUi';
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
import { createEmptyModState, createModAPI } from '../core/addons/modApi';
import { runAllMods } from '../core/addons/modRunner';
import {
  ADDON_MANIFEST_TYPE,
  ADDON_MANIFEST_VERSION,
  EXTENSION_CATALOG_ENTRY_STATUSES,
  EXTENSION_CATALOG_DUPLICATE_RECOMMENDATION_REASONS,
  EXTENSION_CATALOG_INSTALL_SUPPORTS,
  EXTENSION_CATALOG_ISSUE_FALLBACKS,
  EXTENSION_CATALOG_ISSUE_SEVERITIES,
  EXTENSION_CATALOG_ISSUE_STAGES,
  EXTENSION_CATALOG_KINDS,
  EXTENSION_SOURCE_MANIFEST_TYPE,
  EXTENSION_SOURCE_MANIFEST_VERSION,
  EXTENSION_SOURCE_SYNC_STATUSES,
  EXTENSION_SOURCE_TYPES,
  canInstallExtensionCatalogEntry,
  getExtensionCatalogEntryBlockReason,
  hasExtensionCatalogAttention,
  isExtensionCatalogEntryStatus,
  isExtensionCatalogInstallSupport,
  isExtensionCatalogIssueFallback,
  isExtensionCatalogIssueSeverity,
  isExtensionCatalogIssueStage,
  isExtensionCatalogKind,
  isExtensionCatalogEntryBlocked,
  isExtensionSourceType,
  isExtensionCatalogDuplicateRecommendationReason,
  isExtensionSourceSyncStatus,
  isModGameAchievementDefinition,
  isModGameItemDefinition,
  isModInterfaceLocaleDefinition,
  isModModeDefinition,
  isModPanel,
  isModPermission,
  isModUserSettingKey,
  isModUserSettingValue,
  hasThemeStyleContent,
  MOD_MANIFEST_TYPE,
  MOD_PERMISSIONS,
  normalizeThemeColors,
  normalizeThemeStringArray,
  normalizeThemeStringRecord,
  normalizeModPermissions,
  THEME_MANIFEST_TYPE,
  THEME_MANIFEST_VERSION,
} from '../shared/types';

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

function diagnosticTypingSession(partial: Partial<Session> = {}): Session {
  return {
    active: false,
    charStats: {
      a: { hits: 4, misses: 0, totalTime: 720 },
      b: { hits: 1, misses: 2, totalTime: 540 },
    },
    errPositions: new Set(),
    errors: 0,
    keypresses: [
      { position: 0, expected: 'a', actual: 'a', correct: true, interval: 180, timestamp: 1 },
      { position: 1, expected: 'b', actual: 'x', correct: false, interval: 220, timestamp: 2 },
      { position: 2, expected: ' ', actual: ' ', correct: true, interval: 180, timestamp: 3 },
      { position: 3, expected: 'a', actual: 'a', correct: true, interval: 190, timestamp: 4 },
    ],
    lastKeyTime: 0,
    lessonIdx: 0,
    mode: 'practice',
    pos: 4,
    startTime: 0,
    text: 'ab a',
    timer: null,
    timerValue: 0,
    totalChars: 4,
    ...partial,
  } as Session;
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
  const compactModel = buildCompactMetricStripViewModel({
    className: 'live-metrics',
    items: [
      { id: 'speed', value: '72', detail: 'WPM' },
      { id: 'accuracy', value: 95, label: '%', tone: 'good' },
      { id: 'boss', value: 'Boss', tone: 'bad' },
    ],
  });
  const emptyCompactModel = buildCompactMetricStripViewModel({ items: [] });

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
    check(
      'compact metric strip view model normalizes live stats classes and empty state',
      compactModel.className === 'stats-bar live-metrics'
        && compactModel.items.map(item => item.id).join('|') === 'speed|accuracy|boss'
        && compactModel.items[1]?.itemClassName === 'metric metric-positive'
        && compactModel.items[2]?.itemClassName === 'metric metric-negative'
        && compactModel.items[0]?.detail === 'WPM'
        && compactModel.items[1]?.label === '%'
        && emptyCompactModel.hidden,
      `Compact=${compactModel.className}, items=${compactModel.items.map(item => item.itemClassName).join(', ')}, empty=${emptyCompactModel.hidden}.`,
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

function runHomeVisibleQuickActionChecks(): DiagnosticCheck[] {
  const actions: HomeActionModel[] = [
    { id: 'continue-run', title: 'Continue', description: '', meta: '', actionMode: 'game' },
    { id: 'start-practice', title: 'Practice', description: '', meta: '', actionMode: 'practice' },
    { id: 'replay-last', title: 'Replay', description: '', meta: '', actionMode: 'test' },
    { id: 'lessons', title: 'Lessons', description: '', meta: '', actionMode: 'lessons' },
  ];
  const activeRunActions = buildHomeVisibleQuickActions({
    actions,
    currentRunActive: true,
    primaryActionMode: 'game',
    showSecondaryHeroAction: true,
  });
  const practicePrimaryActions = buildHomeVisibleQuickActions({
    actions,
    currentRunActive: false,
    primaryActionMode: 'practice',
    showSecondaryHeroAction: false,
  });
  const lessonsPrimaryWithReplayActions = buildHomeVisibleQuickActions({
    actions,
    currentRunActive: false,
    primaryActionMode: 'lessons',
    showSecondaryHeroAction: true,
  });

  return [
    check(
      'home visible quick actions hide active run and secondary replay duplicates',
      activeRunActions.map(action => action.id).join('|') === 'start-practice|lessons',
      `Active run actions=${activeRunActions.map(action => action.id).join(', ')}.`,
    ),
    check(
      'home visible quick actions hide primary practice duplicate',
      practicePrimaryActions.map(action => action.id).join('|') === 'continue-run|replay-last|lessons',
      `Practice primary actions=${practicePrimaryActions.map(action => action.id).join(', ')}.`,
    ),
    check(
      'home visible quick actions hide primary lessons and hero replay duplicates',
      lessonsPrimaryWithReplayActions.map(action => action.id).join('|') === 'continue-run|start-practice',
      `Lessons primary actions=${lessonsPrimaryWithReplayActions.map(action => action.id).join(', ')}.`,
    ),
  ];
}

function runHomeModeCardGroupChecks(): DiagnosticCheck[] {
  const cards = [
    { id: 'game', title: 'Game' },
    { id: 'settings', title: 'Settings' },
    { id: 'practice', title: 'Practice' },
    { id: 'stats', title: 'Stats' },
    { id: 'lessons', title: 'Lessons' },
  ];
  const grouped = buildHomeModeCardGroups(cards);

  return [
    check(
      'home mode card groups keep primary cards in source order',
      grouped.primaryCards.map(card => card.id).join('|') === 'game|practice|lessons',
      `Primary=${grouped.primaryCards.map(card => card.id).join(', ')}.`,
    ),
    check(
      'home mode card groups move stats and settings to utility row',
      grouped.utilityCards.map(card => card.id).join('|') === 'settings|stats',
      `Utility=${grouped.utilityCards.map(card => card.id).join(', ')}.`,
    ),
  ];
}

function runHomeProgressCenterVisibilityChecks(): DiagnosticCheck[] {
  const translate = (key: string, params?: Record<string, unknown>) => {
    if (!params) return key;
    return `${key}:${Object.values(params).join('|')}`;
  };
  const cards = [
    { id: 'season' },
    { id: 'mode-focus' },
    { id: 'records' },
    { id: 'mastery' },
    { id: 'goals' },
  ];
  const collapsed = buildHomeProgressCenterVisibility(cards, false);
  const expanded = buildHomeProgressCenterVisibility(cards, true);
  const shortList = buildHomeProgressCenterVisibility(cards.slice(0, 3), false);
  const zeroLimit = buildHomeProgressCenterVisibility(cards, false, 0);
  const homeViewModel = {
    homeGoals: [{ id: 'goal-1' }, { id: 'goal-2' }],
    homeStreaks: [
      { current: 3, definition: { title: 'Warmup' } },
      { current: 7, definition: { title: 'Daily streak' } },
    ],
    layoutMastery: {
      currentMilestone: { title: 'Stable' },
      currentScore: 62,
    },
    modeFocusSnapshots: [
      { attempts: 0 },
      { attempts: 2 },
      { attempts: 0 },
    ],
    personalRecordDetailCards: [
      { hasRecord: true },
      { hasRecord: false },
      { hasRecord: true },
    ],
    seasonRemainingDays: 4,
    seasonSnapshot: {
      completedCount: 1,
      definition: { title: 'Season arc' },
      goals: [
        { completed: true, definition: { title: 'Done' } },
        { completed: false, definition: { title: 'Next goal' } },
      ],
      totalCount: 3,
    },
  } as unknown as Parameters<typeof buildHomeProgressCenterCards>[0];
  const progressCards = buildHomeProgressCenterCards(homeViewModel, translate);
  const seasonMeta = buildHomeDetailMeta('season', homeViewModel, translate);

  return [
    check(
      'home progress center visibility limits collapsed cards',
      collapsed.canToggle
        && collapsed.visibleCards.map(card => card.id).join('|') === 'season|mode-focus|records',
      `Collapsed=${collapsed.visibleCards.map(card => card.id).join(', ')}, toggle=${collapsed.canToggle}.`,
    ),
    check(
      'home progress center visibility exposes all cards when expanded',
      expanded.canToggle
        && expanded.visibleCards.map(card => card.id).join('|') === 'season|mode-focus|records|mastery|goals',
      `Expanded=${expanded.visibleCards.map(card => card.id).join(', ')}, toggle=${expanded.canToggle}.`,
    ),
    check(
      'home progress center visibility handles short and zero-limit lists',
      !shortList.canToggle
        && shortList.visibleCards.length === 3
        && zeroLimit.canToggle
        && zeroLimit.visibleCards.length === 0,
      `Short=${shortList.visibleCards.length}/${shortList.canToggle}, zero=${zeroLimit.visibleCards.length}/${zeroLimit.canToggle}.`,
    ),
    check(
      'home progress center cards are built in core',
      progressCards.map(card => card.id).join('|') === 'season|mode-focus|records|mastery|goals|streaks'
        && progressCards.find(card => card.id === 'mode-focus')?.summary === 'home.progressCenter.modeFocus.summaryMissing:2'
        && progressCards.find(card => card.id === 'records')?.summary === 'home.progressCenter.records.summary:2|3'
        && progressCards.find(card => card.id === 'streaks')?.summary === 'home.progressCenter.streaks.summaryActive:7',
      `Progress cards: ${progressCards.map(card => `${card.id}:${card.summary}`).join(', ')}.`,
    ),
    check(
      'home detail modal meta is built in core',
      seasonMeta?.title === 'home.detail.season.title'
        && seasonMeta.description === 'home.detail.season.description:Season arc|4',
      `Season meta: ${seasonMeta?.title ?? 'none'} / ${seasonMeta?.description ?? 'none'}.`,
    ),
  ];
}

function runPracticeCompletionFlowChecks(): DiagnosticCheck[] {
  const translate = (key: string) => key;
  const layouts = diagnosticLayouts();
  const layoutFingers = layouts.layouts.en!.fingers;
  const baseInsights = createEmptyLayoutPracticeInsights();
  const baseLayoutProgress: LayoutProgressState = { unlocked: 0, unlockProgress: 2 };
  const basePracticeState: PracticeState = {
    lastDate: '2026-04-20',
    minutesToday: 12,
    sessionsToday: 2,
    sessionsTotal: 5,
    worstChar: null,
  };
  const success = resolvePracticeSessionCompletion({
    acc: 97,
    baseCharStats: {},
    contentMode: 'adaptive-words',
    contentScenarioId: 'practice-normal',
    elapsedSeconds: 120,
    fallbackWorstChar: 'z',
    goalSpeedCpm: 150,
    layoutFingers,
    layoutId: 'en',
    layoutProgress: baseLayoutProgress,
    practiceInsights: baseInsights,
    practiceState: basePracticeState,
    practiceUnlockOrder: ['a', 'b'],
    session: diagnosticTypingSession(),
    today: '2026-04-21',
    trainingMode: 'normal',
    translate,
    unlockedChars: ['a', 'b'],
    wpm: 42,
  });
  const failed = resolvePracticeSessionCompletion({
    acc: 90,
    baseCharStats: {},
    contentMode: 'adaptive-words',
    contentScenarioId: 'practice-normal',
    elapsedSeconds: 60,
    fallbackWorstChar: 'q',
    goalSpeedCpm: 300,
    layoutFingers,
    layoutId: 'en',
    layoutProgress: { unlocked: 0, unlockProgress: 1 },
    practiceInsights: baseInsights,
    practiceState: { ...basePracticeState, lastDate: '2026-04-21' },
    practiceUnlockOrder: ['a', 'b'],
    session: diagnosticTypingSession({ errors: 2 }),
    today: '2026-04-21',
    trainingMode: 'normal',
    translate,
    unlockedChars: ['a', 'b'],
    wpm: 30,
  });
  const sprint = resolveSprintCompletion({
    acc: 96,
    contentMode: 'custom',
    elapsedSeconds: 30,
    goalSpeedCpm: 150,
    session: diagnosticTypingSession({ errors: 0, totalChars: 220 }),
    wpm: 70,
  });
  const survivalConfig = getChallengeModeConfig(false);
  const survival = resolveChallengeCompletion({
    acc: 96,
    config: survivalConfig,
    contentMode: 'custom',
    elapsedSeconds: 100,
    goalSpeedCpm: 150,
    practiceState: basePracticeState,
    session: diagnosticTypingSession({ errors: 1, pos: 10, text: 'abcdefghij', totalChars: 10 }),
    today: '2026-04-21',
    totalLives: getChallengeTotalLives(survivalConfig),
    wpm: 52,
  });
  const flawlessConfig = getChallengeModeConfig(true);
  const flawlessFailure = resolveChallengeCompletion({
    acc: 92,
    config: flawlessConfig,
    contentMode: 'adaptive-words',
    elapsedSeconds: 45,
    goalSpeedCpm: 150,
    practiceState: basePracticeState,
    session: diagnosticTypingSession({ errors: 1, pos: 2, text: 'abcdef', totalChars: 6 }),
    today: '2026-04-21',
    totalLives: getChallengeTotalLives(flawlessConfig),
    wpm: 38,
  });

  return [
    check(
      'practice completion unlocks letters without mutating source state',
      success.result.newLetter
        && success.result.openedLetter === 'a'
        && success.nextLayoutProgress.unlocked === 1
        && success.nextLayoutProgress.unlockProgress === 0
        && baseLayoutProgress.unlocked === 0
        && baseLayoutProgress.unlockProgress === 2,
      `Unlock result=${success.result.openedLetter ?? 'none'}, source=${baseLayoutProgress.unlocked}/${baseLayoutProgress.unlockProgress}.`,
    ),
    check(
      'practice completion handles daily rollover and rhythm payload',
      success.nextPracticeState.sessionsToday === 1
        && success.nextPracticeState.minutesToday === 2
        && success.nextPracticeState.sessionsTotal === 6
        && success.rhythmSession.intervals.join('|') === '180|220|190'
        && success.rhythmSession.worstInterval === 220,
      `State=${success.nextPracticeState.sessionsToday}/${success.nextPracticeState.minutesToday}, intervals=${success.rhythmSession.intervals.join(',')}.`,
    ),
    check(
      'practice completion preserves failed progress and motivation payload',
      !failed.result.newLetter
        && failed.nextLayoutProgress.unlockProgress === 1
        && !failed.motivationEvent.successfulSession
        && !failed.motivationEvent.flawlessSession,
      `Failed progress=${failed.nextLayoutProgress.unlockProgress}, success=${failed.motivationEvent.successfulSession}.`,
    ),
    check(
      'sprint completion builds test history and achievement event',
      sprint.historyEntry.mode === 'test'
        && sprint.historyEntry.contentScenarioId === 'sprint'
        && sprint.historyEntry.durationSeconds === 30
        && sprint.result.chars === 220
        && sprint.result.errors === 0
        && sprint.achievementEvents[0]?.type === 'test.completed',
      `Sprint=${sprint.historyEntry.mode}/${sprint.historyEntry.contentScenarioId}, chars=${sprint.result.chars}.`,
    ),
    check(
      'challenge completion separates survival pass and flawless fail',
      survival.result.passed
        && survival.historyEntry.passed === true
        && survival.result.livesLeft === 2
        && survival.result.progressPercent === 100
        && survival.motivationEvent.successfulSession
        && !flawlessFailure.result.passed
        && flawlessFailure.result.livesLeft === 0
        && flawlessFailure.historyEntry.contentScenarioId === 'flawless',
      `Survival=${survival.result.passed}/${survival.result.livesLeft}, flawless=${flawlessFailure.result.passed}/${flawlessFailure.result.livesLeft}.`,
    ),
  ];
}

function runPracticeFamilyModeHeaderChecks(): DiagnosticCheck[] {
  const translate = (key: string) => key;
  const practice = buildPracticeFamilyModeHeaderViewModel('practice', translate);
  const sprint = buildPracticeFamilyModeHeaderViewModel('sprint', translate);
  const survival = buildPracticeFamilyModeHeaderViewModel('survival', translate);
  const flawless = buildPracticeFamilyModeHeaderViewModel('flawless', translate);

  return [
    check(
      'practice mode header exposes base practice labels',
      practice.title === 'practice.title'
        && practice.achievementsLabel === 'practice.achievements'
        && practice.settingsLabel === 'practice.settings.title'
        && practice.description === null
        && practice.startLabel === null
        && practice.bestLabel === null,
      `Practice header title=${practice.title}, settings=${practice.settingsLabel ?? 'none'}.`,
    ),
    check(
      'sprint mode header exposes shared sprint labels',
      sprint.title === 'sprint.title'
        && sprint.description === 'sprint.description'
        && sprint.achievementsLabel === 'sprint.achievements'
        && sprint.startLabel === 'sprint.start'
        && sprint.bestLabel === 'sprint.best',
      `Sprint header title=${sprint.title}, start=${sprint.startLabel ?? 'none'}.`,
    ),
    check(
      'survival mode header keeps survival terminology consistent',
      survival.title === 'survival.title'
        && survival.description === 'survival.description'
        && survival.extraDescription === 'survival.toggleDescription'
        && survival.achievementsLabel === 'survival.achievements'
        && survival.startLabel === 'survival.start'
        && survival.bestLabel === 'survival.best',
      `Survival header title=${survival.title}, description=${survival.description ?? 'none'}.`,
    ),
    check(
      'flawless mode header reuses survival title with flawless descriptions',
      flawless.title === 'survival.title'
        && flawless.description === 'survival.flawlessDescription'
        && flawless.extraDescription === 'survival.flawlessToggleDescription'
        && flawless.achievementsLabel === 'survival.achievements'
        && flawless.startLabel === 'survival.start'
        && flawless.bestLabel === 'survival.best',
      `Flawless header title=${flawless.title}, description=${flawless.description ?? 'none'}.`,
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
        contentScenarioId: 'sprint',
      }),
      historyEntry({
        mode: 'practice',
        date: '2026-04-22T10:10:00.000Z',
        wpm: 55,
        acc: 96,
        contentScenarioId: 'survival',
        passed: true,
      }),
      historyEntry({
        mode: 'practice',
        date: '2026-04-22T10:20:00.000Z',
        wpm: 52,
        acc: 99,
        contentScenarioId: 'flawless',
        passed: true,
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
  const buildModeScope = (statsMode: 'practice' | 'sprint' | 'survival' | 'flawless') => buildStatsHistoryScopeModel({
    currentLayout: 'en',
    currentLayoutLabel: 'English',
    layoutScope: 'current',
    locale: 'en-US',
    practiceRhythmHistory,
    progressHistory,
    statsMode,
    statsPeriod: 'all',
    translate,
    unit: 'wpm',
  });
  const practiceScope = buildModeScope('practice');
  const sprintScope = buildModeScope('sprint');
  const survivalScope = buildModeScope('survival');
  const flawlessScope = buildModeScope('flawless');

  return [
    check(
      'stats scope filters history by current layout and mode',
      scope.filteredHistory.length === 1 && scope.filteredHistory[0]?.wpm === 45,
      `Filtered entries: ${scope.filteredHistory.map(entry => `${entry.mode}:${entry.wpm}`).join(', ')}.`,
    ),
    check(
      'stats scope keeps persisted challenge buckets separate',
      practiceScope.filteredHistory.map(entry => entry.wpm).join(',') === '45'
        && sprintScope.filteredHistory.map(entry => entry.wpm).join(',') === '80'
        && survivalScope.filteredHistory.map(entry => entry.wpm).join(',') === '55'
        && flawlessScope.filteredHistory.map(entry => entry.wpm).join(',') === '52',
      `Buckets: practice=${practiceScope.filteredHistory.map(entry => entry.wpm).join(',')}; sprint=${sprintScope.filteredHistory.map(entry => entry.wpm).join(',')}; survival=${survivalScope.filteredHistory.map(entry => entry.wpm).join(',')}; flawless=${flawlessScope.filteredHistory.map(entry => entry.wpm).join(',')}.`,
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

function runGameFlowResolverChecks(): DiagnosticCheck[] {
  const bossReward = resolveGamePostLevelFlow({
    passed: true,
    isBoss: true,
    victory: false,
    level: 5,
    totalLevels: 20,
    nextMapNodeIds: ['rest'],
  });
  const mapSelection = resolveGamePostLevelFlow({
    passed: true,
    isBoss: false,
    victory: false,
    level: 3,
    totalLevels: 20,
    nextMapNodeIds: ['battle-a', 'battle-b'],
  });
  const autoAdvance = resolveGamePostLevelFlow({
    passed: true,
    isBoss: false,
    victory: false,
    level: 3,
    totalLevels: 20,
    nextMapNodeIds: [],
  });
  const terminal = resolveGamePostLevelFlow({
    passed: false,
    isBoss: false,
    victory: false,
    level: 3,
    totalLevels: 20,
    nextMapNodeIds: ['battle-a'],
  });
  const modifier: GameRunModifier = {
    id: 'focus',
    name: 'Focus',
    description: 'Focus',
    accuracyRequirementReduction: 2,
    remainingLevels: 2,
  };
  const buffEffect = resolveGameChoiceEffect({
    hp: 6,
    maxHp: 10,
    effect: {
      maxLifeDelta: 2,
      fullHeal: true,
      regenTurns: 3,
      modifier,
    },
  });
  const damageEffect = resolveGameChoiceEffect({
    hp: 4,
    maxHp: 10,
    effect: {
      lifeDelta: -6,
      repairEquippedBy: 1,
      grantItemId: 'tempo-ring',
    },
  });

  return [
    check(
      'game post-level flow routes boss wins to rewards',
      bossReward.kind === 'bossReward',
      `kind=${bossReward.kind}`,
    ),
    check(
      'game post-level flow exposes selectable map nodes',
      mapSelection.kind === 'mapSelection'
        && mapSelection.selectableNodeIds.join(',') === 'battle-a,battle-b',
      `kind=${mapSelection.kind}`,
    ),
    check(
      'game post-level flow auto-advances linear runs',
      autoAdvance.kind === 'autoAdvance' && autoAdvance.nextLevel === 4,
      `kind=${autoAdvance.kind}`,
    ),
    check(
      'game post-level flow resets terminal or failed levels',
      terminal.kind === 'terminalOrFailed',
      `kind=${terminal.kind}`,
    ),
    check(
      'game choice effect resolves max hp heal regen and modifier',
      buffEffect.nextMaxHp === 12
        && buffEffect.nextHp === 12
        && buffEffect.regenTurnsDelta === 3
        && buffEffect.modifier?.id === 'focus'
        && buffEffect.hpChanged,
      JSON.stringify(buffEffect),
    ),
    check(
      'game choice effect resolves damage repair and item grants',
      damageEffect.nextHp === 0
        && damageEffect.runDamageTakenDelta === 6
        && damageEffect.repairEquippedBy === 1
        && damageEffect.grantItemId === 'tempo-ring',
      JSON.stringify(damageEffect),
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

function runGameResultSecondaryBlocksChecks(): DiagnosticCheck[] {
  const visibleRewardBlock = {
    choices: [],
    selectedRewardMessage: null,
    title: 'Reward',
  };
  const terminalModel = buildGameResultSecondaryBlocksViewModel({
    comparison: {} as ResultComparisonSummary,
    masterySummary: {} as any,
    motivationGoals: [{} as any],
    motivationStreaks: [],
    result: gameResult({ livesLeft: 0, passed: false, victory: false }),
    rewardBlock: visibleRewardBlock,
  });
  const nonTerminalModel = buildGameResultSecondaryBlocksViewModel({
    comparison: null,
    masterySummary: null,
    motivationGoals: [{} as any],
    motivationStreaks: [{} as any],
    result: gameResult({ livesLeft: 2, passed: false, victory: false }),
    rewardBlock: null,
  });
  const victoryModel = buildGameResultSecondaryBlocksViewModel({
    comparison: null,
    masterySummary: null,
    motivationGoals: [],
    motivationStreaks: [{} as any],
    result: gameResult({ livesLeft: 2, passed: true, victory: true }),
    rewardBlock: null,
  });

  return [
    check(
      'game result secondary blocks show terminal motivation, comparison, mastery and rewards',
      terminalModel.showMotivationProgress
        && terminalModel.showComparison
        && terminalModel.showMastery
        && terminalModel.showRewardBlock,
      `Terminal blocks=${JSON.stringify(terminalModel)}.`,
    ),
    check(
      'game result secondary blocks hide non-terminal motivation and absent optional blocks',
      !nonTerminalModel.showMotivationProgress
        && !nonTerminalModel.showComparison
        && !nonTerminalModel.showMastery
        && !nonTerminalModel.showRewardBlock,
      `Non-terminal blocks=${JSON.stringify(nonTerminalModel)}.`,
    ),
    check(
      'game result secondary blocks show streak motivation for victory',
      victoryModel.showMotivationProgress,
      `Victory motivation=${victoryModel.showMotivationProgress}.`,
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

function runGameInventoryPanelViewModelChecks(): DiagnosticCheck[] {
  const equipped: GameEquipmentState = {
    slotA: 'item-equipped',
    slotB: null,
    slotC: null,
  };
  const inventoryItems = buildInventoryEntries([
    {
      id: 'item-equipped',
      itemId: 'steady-gloves',
      durability: null,
      maxDurability: null,
    },
    {
      id: 'item-free',
      itemId: 'focus-lens',
      durability: null,
      maxDurability: null,
    },
  ], equipped);
  const equippedItems = buildEquippedEntries(buildEquippedBySlot(equipped), inventoryItems);
  const mixedInventory = buildGameInventoryPanelViewModel(inventoryItems, equippedItems);

  const allEquippedInventoryItems = buildInventoryEntries([
    {
      id: 'item-equipped',
      itemId: 'steady-gloves',
      durability: null,
      maxDurability: null,
    },
  ], equipped);
  const allEquipped = buildGameInventoryPanelViewModel(
    allEquippedInventoryItems,
    buildEquippedEntries(buildEquippedBySlot(equipped), allEquippedInventoryItems),
  );
  const emptyAfterBoss = buildGameInventoryPanelViewModel(
    [],
    buildEquippedEntries(buildEquippedBySlot({ slotA: null, slotB: null, slotC: null }), []),
  );

  return [
    check(
      'game inventory panel view model hides equipped items',
      mixedInventory.visibleInventoryItems.map(item => item.id).join('|') === 'item-free'
        && mixedInventory.emptyReason === null,
      `Visible=${mixedInventory.visibleInventoryItems.map(item => item.id).join('|')}, empty=${mixedInventory.emptyReason}.`,
    ),
    check(
      'game inventory panel view model distinguishes empty reasons',
      allEquipped.emptyReason === 'all-equipped'
        && emptyAfterBoss.emptyReason === 'after-boss',
      `All equipped=${allEquipped.emptyReason}, after boss=${emptyAfterBoss.emptyReason}.`,
    ),
  ];
}

function runGamePageBonusViewModelChecks(): DiagnosticCheck[] {
  const equipped: GameEquipmentState = {
    slotA: 'tempo-a',
    slotB: 'tempo-b',
    slotC: null,
  };
  const tempoInventory = buildInventoryEntries([
    {
      id: 'tempo-a',
      itemId: 'steady-gloves',
      durability: null,
      maxDurability: null,
    },
    {
      id: 'tempo-b',
      itemId: 'whisper-feather',
      durability: null,
      maxDurability: null,
    },
  ], equipped);
  const tempoBonuses = buildGamePageBonusViewModel(
    buildEquippedEntries(buildEquippedBySlot(equipped), tempoInventory),
    [],
    false,
  );

  const brokenTempoInventory = buildInventoryEntries([
    {
      id: 'tempo-a',
      itemId: 'steady-gloves',
      durability: null,
      maxDurability: null,
    },
    {
      id: 'tempo-b',
      itemId: 'whisper-feather',
      durability: 0,
      maxDurability: 1,
    },
  ], equipped);
  const brokenTempoBonuses = buildGamePageBonusViewModel(
    buildEquippedEntries(buildEquippedBySlot(equipped), brokenTempoInventory),
    [],
    false,
  );
  const bossOnlyModifier: GameRunModifier = {
    id: 'boss-focus',
    name: 'Boss focus',
    description: 'Boss-only diagnostic modifier',
    bossOnly: true,
    remainingLevels: 1,
    speedRequirementReductionPercent: 7,
    enemyAttackReduction: 2,
  };
  const nonBossModifierBonuses = buildGamePageBonusViewModel([], [bossOnlyModifier], false);
  const bossModifierBonuses = buildGamePageBonusViewModel([], [bossOnlyModifier], true);

  return [
    check(
      'game page bonus view model combines active set bonuses',
      tempoBonuses.equippedItemIds.join('|') === 'steady-gloves|whisper-feather'
        && tempoBonuses.setBonuses.totalSpeedReduction === 3
        && tempoBonuses.totalBonuses.speedRequirementReductionPercent >= 3,
      `Equipped=${tempoBonuses.equippedItemIds.join('|')}, setSpeed=${tempoBonuses.setBonuses.totalSpeedReduction}, totalSpeed=${tempoBonuses.totalBonuses.speedRequirementReductionPercent}.`,
    ),
    check(
      'game page bonus view model excludes broken equipped items from set bonuses',
      brokenTempoBonuses.equippedItemIds.join('|') === 'steady-gloves'
        && brokenTempoBonuses.setBonuses.totalSpeedReduction === 0,
      `Equipped=${brokenTempoBonuses.equippedItemIds.join('|')}, setSpeed=${brokenTempoBonuses.setBonuses.totalSpeedReduction}.`,
    ),
    check(
      'game page bonus view model applies boss-only modifiers only during boss nodes',
      nonBossModifierBonuses.totalBonuses.speedRequirementReductionPercent === 0
        && nonBossModifierBonuses.battleBonuses.enemyAttackReduction === 0
        && bossModifierBonuses.totalBonuses.speedRequirementReductionPercent === 7
        && bossModifierBonuses.battleBonuses.enemyAttackReduction === 2,
      `NonBoss=${nonBossModifierBonuses.totalBonuses.speedRequirementReductionPercent}/${nonBossModifierBonuses.battleBonuses.enemyAttackReduction}, boss=${bossModifierBonuses.totalBonuses.speedRequirementReductionPercent}/${bossModifierBonuses.battleBonuses.enemyAttackReduction}.`,
    ),
  ];
}

function runGameRunMapLayoutViewModelChecks(): DiagnosticCheck[] {
  const layout = buildGameRunMapLayoutViewModel({
    nodes: [
      {
        id: 'late',
        kind: 'battle',
        title: 'Late',
        flavor: 'Late',
        description: 'Late node',
        column: 2,
        lane: 4,
      },
      {
        id: 'middle-low',
        kind: 'treasure',
        title: 'Middle low',
        flavor: 'Middle low',
        description: 'Middle low node',
        column: 1,
        lane: 3,
      },
      {
        id: 'start',
        kind: 'battle',
        title: 'Start',
        flavor: 'Start',
        description: 'Start node',
        column: 0,
        lane: 2,
      },
      {
        id: 'middle-high',
        kind: 'rest',
        title: 'Middle high',
        flavor: 'Middle high',
        description: 'Middle high node',
        column: 1,
        lane: 1,
      },
    ],
  });
  const columnOrder = layout.columns.map(column => column.column).join('|');
  const middleNodes = layout.columns[1]?.slots.map(slot => slot.node?.id ?? '-').join('|') ?? '';

  return [
    check(
      'game run map layout view model sorts columns and preserves lane slots',
      layout.columnCount === 3
        && columnOrder === '0|1|2'
        && layout.columns.every(column => column.slots.length === 5),
      `Columns=${columnOrder}, count=${layout.columnCount}, slots=${layout.columns.map(column => column.slots.length).join('|')}.`,
    ),
    check(
      'game run map layout view model sorts nodes by lane inside columns',
      middleNodes === '-|middle-high|-|middle-low|-',
      `Middle column=${middleNodes}.`,
    ),
  ];
}

function runGameHudViewModelChecks(): DiagnosticCheck[] {
  const activeBossHud = buildGameHudViewModel({
    bossTimeLimit: 10,
    hp: 24,
    maxHp: 100,
    nowMs: 9000,
    resultElapsedSeconds: 3,
    sessionActive: true,
    sessionStartTime: 0,
  });
  const completedHud = buildGameHudViewModel({
    bossTimeLimit: null,
    hp: 55,
    maxHp: 100,
    nowMs: 2000,
    resultElapsedSeconds: 4.5,
    sessionActive: false,
    sessionStartTime: 1000,
  });
  const invalidHpHud = buildGameHudViewModel({
    bossTimeLimit: 0,
    hp: 10,
    maxHp: 0,
    nowMs: 0,
    resultElapsedSeconds: -1,
    sessionActive: false,
    sessionStartTime: 0,
  });

  return [
    check(
      'game hud view model computes live boss timer danger state',
      activeBossHud.liveElapsedSeconds === 9
        && activeBossHud.bossTimerRatio === 0.9
        && activeBossHud.bossTimerPercent === 90
        && activeBossHud.bossTimerDanger
        && activeBossHud.hpTone === 'danger',
      `Elapsed=${activeBossHud.liveElapsedSeconds}, timer=${activeBossHud.bossTimerPercent}, hpTone=${activeBossHud.hpTone}.`,
    ),
    check(
      'game hud view model preserves completed elapsed and hp warning state',
      completedHud.liveElapsedSeconds === 4.5
        && completedHud.bossTimerPercent === 0
        && Math.abs(completedHud.hpPercent - 55) < 0.001
        && completedHud.hpTone === null,
      `Elapsed=${completedHud.liveElapsedSeconds}, timer=${completedHud.bossTimerPercent}, hp=${completedHud.hpPercent}.`,
    ),
    check(
      'game hud view model clamps invalid timer and hp inputs',
      invalidHpHud.liveElapsedSeconds === 0
        && invalidHpHud.bossTimerRatio === 0
        && invalidHpHud.hpPercent === 0
        && invalidHpHud.hpTone === 'danger',
      `Elapsed=${invalidHpHud.liveElapsedSeconds}, timer=${invalidHpHud.bossTimerRatio}, hp=${invalidHpHud.hpPercent}.`,
    ),
  ];
}

function runGameEventChoiceCardViewModelChecks(): DiagnosticCheck[] {
  const translate = (key: string, params?: Record<string, string | number | boolean | null | undefined>) => {
    if (key === 'game.hud.hpShort') return 'HP';
    if (key === 'game.event.repairBonus') return `repair:${params?.count ?? ''}`;
    if (key === 'game.inventory.durability') return 'Durability';
    return key;
  };
  const modifier: GameRunModifier = {
    description: 'mod bonus',
    enemyAttackReduction: 2,
    id: 'diagnostic-modifier',
    name: 'Diagnostic modifier',
    remainingLevels: 1,
  };
  const choices: GameRunEventChoice[] = [
    {
      description: 'Take a breath.',
      effect: { lifeDelta: 5 },
      flavor: 'Safe',
      id: 'heal',
      title: 'Rest',
    },
    {
      description: 'Patch equipped items.',
      disabled: true,
      effect: {
        lifeDelta: -3,
        modifier,
        repairEquippedBy: 2,
      },
      flavor: 'Risky',
      id: 'risk',
      title: 'Risk',
    },
    {
      description: 'Take an item.',
      effect: { grantItemId: 'focus-lens' },
      flavor: 'Cache',
      id: 'item',
      title: 'Lens',
    },
  ];
  const models = buildGameEventChoiceCardViewModels({
    choices,
    eventKindLabel: 'Risk event',
    translate,
  });
  const healModel = models[0];
  const riskModel = models[1];
  const itemModel = models[2];

  return [
    check(
      'game event choice card view model builds non-item effects and fallback badge',
      healModel?.badgeLabel === 'R'
        && healModel.cardClassName === ''
        && healModel.effects.join('|') === '+5 HP'
        && healModel.rarity === 'Risk event'
        && healModel.special,
      `Heal badge=${healModel?.badgeLabel}, effects=${healModel?.effects.join('|')}.`,
    ),
    check(
      'game event choice card view model preserves disabled state and negative effects',
      riskModel?.cardClassName === 'disabled'
        && riskModel.effects.join('|') === '-3 HP|repair:2|mod bonus'
        && riskModel.choice.disabled === true,
      `Risk class=${riskModel?.cardClassName}, effects=${riskModel?.effects.join('|')}.`,
    ),
    check(
      'game event choice card view model exposes catalog item presentation data',
      itemModel?.cardClassName === 'rarity-1'
        && itemModel.iconKey === 'eye'
        && itemModel.rarity === '★☆☆'
        && itemModel.badgeLabel === null
        && !itemModel.special,
      `Item class=${itemModel?.cardClassName}, icon=${itemModel?.iconKey}, rarity=${itemModel?.rarity}.`,
    ),
  ];
}

function gameAchievementFixture(id: string): GameAchievementDefinition {
  return {
    category: 'game',
    conditions: [{ type: 'manual' }],
    description: `${id} description`,
    id,
    name: `${id} name`,
  };
}

function runGameAchievementToastViewModelChecks(): DiagnosticCheck[] {
  const achievements = [
    gameAchievementFixture('first'),
    gameAchievementFixture('second'),
    gameAchievementFixture('third'),
    gameAchievementFixture('fourth'),
  ];
  const visible = buildGameAchievementToastViewModels(
    achievements,
    new Map([
      [1, { isHiding: true }],
      [3, { isHiding: true }],
    ]),
  );
  const allVisible = buildGameAchievementToastViewModels(achievements, new Map(), 10);
  const zeroVisible = buildGameAchievementToastViewModels(achievements, new Map(), 0);

  return [
    check(
      'game achievement toast view model limits visible toasts',
      visible.map(item => item.achievement.id).join('|') === 'first|second|third',
      `Visible=${visible.map(item => item.achievement.id).join(', ')}.`,
    ),
    check(
      'game achievement toast view model keeps display index and hiding state',
      visible.map(item => `${item.displayIndex}:${item.isHiding ? 'hide' : 'show'}`).join('|') === '0:show|1:hide|2:show',
      `States=${visible.map(item => `${item.displayIndex}:${item.isHiding ? 'hide' : 'show'}`).join(', ')}.`,
    ),
    check(
      'game achievement toast view model supports custom and zero limits',
      allVisible.length === 4 && zeroVisible.length === 0,
      `All=${allVisible.length}, zero=${zeroVisible.length}.`,
    ),
  ];
}

function importedLocaleFixture(
  partial: Pick<ImportedInterfaceLocaleDefinition, 'id' | 'importedAt'> & Partial<ImportedInterfaceLocaleDefinition>,
): ImportedInterfaceLocaleDefinition {
  return {
    dictionary: {},
    label: partial.id,
    nativeLabel: partial.id.toUpperCase(),
    source: 'imported',
    sourceName: `${partial.id}.po`,
    ...partial,
  };
}

function runSettingsViewModelChecks(): DiagnosticCheck[] {
  const importedLocales = {
    older: importedLocaleFixture({
      id: 'older',
      importedAt: '2026-01-01T10:00:00.000Z',
    }),
    newest: importedLocaleFixture({
      id: 'newest',
      importedAt: '2026-01-03T10:00:00.000Z',
    }),
    middle: importedLocaleFixture({
      id: 'middle',
      importedAt: '2026-01-02T10:00:00.000Z',
    }),
  };
  const importedLocaleEntries = buildImportedInterfaceLocaleEntries(importedLocales);
  const availableThemes: ThemeDefinitions = {
    'dark-orange': {
      id: 'dark-orange',
      label: 'Should not duplicate',
      source: 'built-in',
      editable: false,
      deletable: false,
      style: {},
    },
    'custom-ocean': {
      id: 'custom-ocean',
      label: 'Custom Ocean',
      source: 'custom',
      editable: true,
      deletable: true,
      style: {},
    },
    'addon-forest': {
      id: 'addon-forest',
      label: 'Addon Forest',
      source: 'addon',
      editable: false,
      deletable: false,
      style: {},
    },
  };
  const themeOptions = buildSettingsThemeOptions(availableThemes);

  return [
    check(
      'settings view model sorts imported locales by newest import first',
      importedLocaleEntries.map(locale => locale.id).join('|') === 'newest|middle|older',
      `Locales=${importedLocaleEntries.map(locale => locale.id).join(', ')}.`,
    ),
    check(
      'settings view model keeps built-in themes first and appends custom themes',
      themeOptions.slice(0, 5).map(theme => theme.id).join('|') === 'dark-orange|catppuccin|nord|monokai|light'
        && themeOptions.slice(5).map(theme => theme.id).join('|') === 'custom-ocean|addon-forest',
      `Themes=${themeOptions.map(theme => theme.id).join(', ')}.`,
    ),
    check(
      'settings view model avoids duplicate built-in theme options',
      themeOptions.filter(theme => theme.id === 'dark-orange').length === 1,
      `Dark orange count=${themeOptions.filter(theme => theme.id === 'dark-orange').length}.`,
    ),
  ];
}

function runTextDisplayViewModelChecks(): DiagnosticCheck[] {
  const words = buildTextDisplayWords({
    cursorSmooth: 'smooth',
    cursorStyle: 'underline',
    errPositions: new Set([1]),
    highlightCurrentChar: true,
    pos: 2,
    text: 'ab cd',
    waitingForSpace: true,
  });
  const serialized = words
    .map(word => word.map(char => `${char.ch}:${char.cls || '-'}:${char.idx}`).join(','))
    .join('|');
  const noHighlightCursor = buildTextDisplayWords({
    cursorSmooth: 'instant',
    cursorStyle: 'block',
    errPositions: new Set(),
    highlightCurrentChar: false,
    pos: 0,
    text: 'x',
  });

  return [
    check(
      'text display view model groups words and spaces without splitting indexes',
      words.length === 4
        && words[0].map(char => char.ch).join('') === 'ab'
        && words[1][0]?.ch === '\u00A0'
        && words[2].map(char => char.ch).join('') === 'cd'
        && words[3][0]?.idx === 5,
      `Words=${serialized}.`,
    ),
    check(
      'text display view model marks typed errors and current cursor classes',
      words[0][0]?.cls === 'char-ok'
        && words[0][1]?.cls === 'char-err'
        && words[1][0]?.cls === 'char-current cursor-underline cursor-smooth'
        && words[3][0]?.cls === 'char-current cursor-underline cursor-smooth',
      `Classes=${serialized}.`,
    ),
    check(
      'text display view model supports cursor without highlight class',
      noHighlightCursor[0]?.[0]?.cls === 'cursor-block',
      `Cursor=${noHighlightCursor[0]?.[0]?.cls ?? 'none'}.`,
    ),
  ];
}

function runModApiContractChecks(): DiagnosticCheck[] {
  const diagnosticItem: GameItemDefinition = {
    id: 'mod-item',
    name: 'Mod Item',
    shortName: 'MI',
    description: 'Diagnostic item',
    rarity: 1,
    slotType: 'trinket',
    icon: 'sparkles',
    rewardKind: 'simple',
    effects: [{ kind: 'speed', value: 5, unit: 'percent', description: 'Speed bonus' }],
  };
  const replacementItem: GameItemDefinition = {
    ...diagnosticItem,
    id: 'replacement-item',
    name: 'Replacement Item',
    shortName: 'RI',
  };
  const diagnosticAchievement: GameAchievementDefinition = {
    id: 'mod-achievement',
    name: 'Mod Achievement',
    description: 'Diagnostic achievement',
    category: 'game',
    conditions: [{ type: 'sessionCount', count: 1 }],
  };
  const replacementAchievement: GameAchievementDefinition = {
    ...diagnosticAchievement,
    id: 'replacement-achievement',
    name: 'Replacement Achievement',
  };
  const diagnosticLocale = {
    id: 'en-US',
    label: 'English',
    nativeLabel: 'English',
    dictionary: { common: { ok: 'OK' } },
  };

  const state = createEmptyModState();
  const api = createModAPI(
    'diagnostic-mod',
    'Diagnostic Mod',
    ['rules', 'events', 'ui', 'modes', 'words', 'lessons'],
    state,
    () => ({} as any),
    () => [],
    () => [],
    () => [],
    () => [],
  );
  const blockedState = createEmptyModState();
  const blockedApi = createModAPI(
    'blocked-mod',
    'Blocked Mod',
    [],
    blockedState,
    () => ({ theme: 'dark' } as any),
    () => [],
    () => [],
    () => [],
    () => [],
  );
  const payloadState = createEmptyModState();
  const payloadApi = createModAPI(
    'payload-mod',
    'Payload Mod',
    ['settings', 'items', 'achievements', 'i18n'],
    payloadState,
    () => ({ theme: 'dark' } as any),
    () => [],
    () => [],
    () => [],
    () => [],
  );

  const originalWarn = console.warn;
  const sessionFinishHandler = () => undefined;
  console.warn = () => undefined;
  try {
    blockedApi.sections.disable('game');
    blockedApi.settings.override('theme', 'light');
    blockedApi.items.add(diagnosticItem);
    blockedApi.items.remove('mod-item');
    blockedApi.items.replace('mod-item', replacementItem);
    blockedApi.achievements.add(diagnosticAchievement);
    blockedApi.achievements.remove('mod-achievement');
    blockedApi.achievements.replace('mod-achievement', replacementAchievement);
    blockedApi.rules.set('game.baseHp', 3);
    blockedApi.events.on('sessionFinish', sessionFinishHandler);
    blockedApi.words.add(['blocked']);
    blockedApi.lessons.add('en-qwerty', [{ id: 'blocked-lesson', name: 'Blocked Lesson', keys: ['b'] }]);
    blockedApi.ui.registerPanel({ id: 'blocked-panel', location: 'page-top', html: '<p>Blocked</p>' });
    blockedApi.modes.register({ id: 'blocked-mode', label: 'Blocked Mode', icon: 'box', group: 'top', html: '<p>Blocked</p>' });
    blockedApi.i18n.registerLocale(diagnosticLocale);

    api.rules.set('game.baseHp', 3);
    (api.rules.set as any)('game.unknownRule', 9);
    (api.rules.set as any)('game.baseLives', 'two');
    (api.rules.remove as any)('game.unknownRule');
    api.events.on('sessionFinish', sessionFinishHandler);
    (api.events.on as any)('unknownEvent', sessionFinishHandler);
    (api.events.on as any)('sessionStart', 'not-a-function');
    (api.events.off as any)('unknownEvent', sessionFinishHandler);
    api.ui.registerPanel({ id: 'top-panel', location: 'page-top', html: '<p>Panel</p>' });
    (api.ui.registerPanel as any)({ id: 'bad-panel', location: 'sidebar-top', html: '<p>Bad</p>' });
    (api.ui.registerPanel as any)({ id: '', location: 'overlay', html: '<p>Bad</p>' });
    (api.ui.injectCSS as any)(123);
    api.ui.removePanel('top-panel');
    (api.ui.removePanel as any)('');
    api.modes.register({ id: 'diagnostic-page', label: 'Diagnostic Page', icon: 'box', group: 'top', html: '<p>Mode</p>' });
    (api.modes.register as any)({ id: 'bad-page', label: 'Bad Page', icon: 'box', group: 'middle', html: '<p>Bad</p>' });
    (api.modes.register as any)({ id: '', label: 'Bad Page', icon: 'box', group: 'top', html: '<p>Bad</p>' });
    api.modes.unregister('diagnostic-page');
    (api.modes.unregister as any)('');
    (api.words.add as any)(['  focus  ', '', 'focus', 42]);
    (api.words.add as any)('not-an-array');
    api.words.remove(['  easy ', '', 'easy']);
    (api.words.remove as any)([null, '']);
    api.lessons.add('en-qwerty', [
      { id: 'mod-lesson', name: 'Mod Lesson', keys: ['f', 'j'] },
      { id: '', name: 'Broken Lesson', keys: ['x'] },
      { id: 'bad-keys', name: 'Bad Keys', keys: [1] },
    ] as any);
    (api.lessons.add as any)('', [{ id: 'ignored', name: 'Ignored', keys: ['x'] }]);
    api.lessons.remove('en-qwerty', [' old-lesson ', '', 'old-lesson']);
    (api.lessons.remove as any)('', ['ignored']);
    api.lessons.replace('en-qwerty', 'existing-lesson', { id: 'replacement', name: 'Replacement', keys: ['r'] });
    (api.lessons.replace as any)('en-qwerty', 'bad-replacement', { id: '', name: 'Bad', keys: ['b'] });
    (api.lessons.replace as any)('', 'ignored', { id: 'ignored', name: 'Ignored', keys: ['i'] });

    payloadApi.settings.override('theme', 'light');
    (payloadApi.settings.override as any)('unknownSetting', 'value');
    (payloadApi.settings.override as any)('showKeyboard', 'yes');
    (payloadApi.settings.override as any)('handsOpacity', Number.NaN);
    payloadApi.settings.removeOverride('theme');
    (payloadApi.settings.removeOverride as any)('unknownSetting');
    payloadApi.settings.override('showKeyboard', true);
    payloadApi.items.add(diagnosticItem);
    (payloadApi.items.add as any)({ ...diagnosticItem, id: '', effects: [] });
    payloadApi.items.remove('old-item');
    (payloadApi.items.remove as any)('');
    payloadApi.items.replace('old-item', replacementItem);
    (payloadApi.items.replace as any)('', replacementItem);
    (payloadApi.items.replace as any)('old-item', { ...replacementItem, rarity: 5 });
    payloadApi.achievements.add(diagnosticAchievement);
    (payloadApi.achievements.add as any)({ ...diagnosticAchievement, id: '', conditions: [] });
    payloadApi.achievements.remove('old-achievement');
    (payloadApi.achievements.remove as any)('');
    payloadApi.achievements.replace('old-achievement', replacementAchievement);
    (payloadApi.achievements.replace as any)('', replacementAchievement);
    (payloadApi.achievements.replace as any)('old-achievement', { ...replacementAchievement, conditions: [{ broken: true }] });
    payloadApi.i18n.registerLocale(diagnosticLocale);
    (payloadApi.i18n.registerLocale as any)({ ...diagnosticLocale, id: '', dictionary: {} });
    payloadApi.i18n.registerLocales([{ ...diagnosticLocale, id: 'de-DE', label: 'Deutsch', nativeLabel: 'Deutsch' }]);
    (payloadApi.i18n.registerLocales as any)('not-an-array');
    (payloadApi.i18n.registerLocales as any)([{ ...diagnosticLocale, id: '', dictionary: {} }]);
  } finally {
    console.warn = originalWarn;
  }

  const sessionFinishHandlers = state.eventHandlers.get('sessionFinish');
  const addedLessons = state.addedLessons.get('en-qwerty') ?? [];
  const removedLessonIds = state.removedLessonIds.get('en-qwerty');
  const replacedLessons = state.replacedLessons.get('en-qwerty');
  const normalizedPermissions = normalizeModPermissions(['ui', 'ui', 'events', 'unknown', 42]);
  const blockedStateIsEmpty = blockedState.disabledSections.size === 0
    && blockedState.settingOverrides.size === 0
    && blockedState.addedItems.length === 0
    && blockedState.removedItemIds.size === 0
    && blockedState.replacedItems.size === 0
    && blockedState.addedAchievements.length === 0
    && blockedState.removedAchievementIds.size === 0
    && blockedState.replacedAchievements.size === 0
    && blockedState.ruleOverrides.size === 0
    && blockedState.eventHandlers.size === 0
    && blockedState.addedWords.length === 0
    && blockedState.removedWords.size === 0
    && blockedState.addedLessons.size === 0
    && blockedState.removedLessonIds.size === 0
    && blockedState.replacedLessons.size === 0
    && blockedState.panels.length === 0
    && blockedState.removedPanelIds.size === 0
    && blockedState.cssSnippets.length === 0
    && blockedState.registeredModes.length === 0
    && blockedState.unregisteredModeIds.size === 0
    && blockedState.interfaceLocales.length === 0;

  return [
    check(
      'mod api shared validators expose SDK-ready permission contract',
      MOD_PERMISSIONS.includes('ui')
        && isModPermission('events')
        && !isModPermission('unknown')
        && normalizedPermissions.join('|') === 'ui|events',
      `Permissions=${normalizedPermissions.join(',') || 'none'}.`,
    ),
    check(
      'mod api shared validators expose SDK-ready panel and mode contracts',
      isModPanel({ id: 'top-panel', location: 'page-top', html: '<p>Panel</p>' })
        && !isModPanel({ id: 'bad-panel', location: 'sidebar-top', html: '<p>Bad</p>' })
        && isModModeDefinition({ id: 'diagnostic-page', label: 'Diagnostic Page', icon: 'box', group: 'top', html: '<p>Mode</p>' })
        && !isModModeDefinition({ id: 'bad-page', label: 'Bad Page', icon: 'box', group: 'middle', html: '<p>Bad</p>' }),
      'Shared validators should match runtime UI and mode acceptance.',
    ),
    check(
      'mod api shared validators expose SDK-ready settings item achievement and i18n contracts',
      isModUserSettingKey('theme')
        && !isModUserSettingKey('unknownSetting')
        && isModGameItemDefinition(diagnosticItem)
        && !isModGameItemDefinition({ ...diagnosticItem, rarity: 5 })
        && isModGameAchievementDefinition(diagnosticAchievement)
        && !isModGameAchievementDefinition({ ...diagnosticAchievement, conditions: [{ broken: true }] })
        && isModInterfaceLocaleDefinition(diagnosticLocale)
        && !isModInterfaceLocaleDefinition({ ...diagnosticLocale, id: '', dictionary: {} }),
      'Shared validators should match runtime settings, item, achievement and i18n acceptance.',
    ),
    check(
      'mod api shared validators expose SDK-ready settings value contract',
      isModUserSettingValue('showKeyboard', true)
        && !isModUserSettingValue('showKeyboard', 'yes')
        && isModUserSettingValue('handsOpacity', 0.75)
        && !isModUserSettingValue('handsOpacity', Number.NaN)
        && isModUserSettingValue('cursorStyle', 'block')
        && !isModUserSettingValue('cursorStyle', 'beam')
        && isModUserSettingValue('theme', 'dark-orange')
        && !isModUserSettingValue('theme', ''),
      'Shared settings validator should reject invalid known-key values before runtime mutation.',
    ),
    check(
      'mod api blocks all mutating APIs when permissions are missing',
      blockedStateIsEmpty,
      `Blocked state sizes: sections=${blockedState.disabledSections.size}, settings=${blockedState.settingOverrides.size}, items=${blockedState.addedItems.length}, achievements=${blockedState.addedAchievements.length}, locales=${blockedState.interfaceLocales.length}.`,
    ),
    check(
      'mod api accepts only known rule ids and valid rule values',
      state.ruleOverrides.size === 1
        && state.ruleOverrides.get('game.baseHp') === 3
        && !state.ruleOverrides.has('game.baseLives'),
      `Rules=${[...state.ruleOverrides.entries()].map(([key, value]) => `${key}:${value}`).join(',') || 'none'}.`,
    ),
    check(
      'mod api accepts only known event names and function handlers',
      state.eventHandlers.size === 1
        && sessionFinishHandlers?.size === 1
        && sessionFinishHandlers.has(sessionFinishHandler),
      `Events=${[...state.eventHandlers.entries()].map(([key, handlers]) => `${key}:${handlers.size}`).join(',') || 'none'}.`,
    ),
    check(
      'mod api accepts only valid panels, css snippets and mode definitions',
      state.panels.length === 1
        && state.panels[0]?.id === 'top-panel'
        && state.removedPanelIds.has('top-panel')
        && state.cssSnippets.length === 0
        && state.registeredModes.length === 1
        && state.registeredModes[0]?.id === 'diagnostic-page'
        && state.unregisteredModeIds.has('diagnostic-page'),
      `Panels=${state.panels.map(panel => `${panel.id}:${panel.location}`).join(',') || 'none'}, modes=${state.registeredModes.map(mode => `${mode.id}:${mode.group}`).join(',') || 'none'}.`,
    ),
    check(
      'mod api normalizes word and lesson effects',
      state.addedWords.length === 1
        && state.addedWords[0] === 'focus'
        && state.removedWords.size === 1
        && state.removedWords.has('easy')
        && addedLessons.length === 1
        && addedLessons[0]?.id === 'mod-lesson'
        && removedLessonIds?.size === 1
        && removedLessonIds.has('old-lesson')
        && replacedLessons?.size === 1
        && replacedLessons.get('existing-lesson')?.id === 'replacement',
      `Words=${state.addedWords.join(',') || 'none'}, lessons=${addedLessons.map(lesson => lesson.id).join(',') || 'none'}.`,
    ),
    check(
      'mod api validates settings item achievement and i18n payloads before mutating state',
      payloadState.settingOverrides.size === 1
        && payloadState.settingOverrides.get('showKeyboard') === true
        && payloadState.addedItems.length === 1
        && payloadState.addedItems[0]?.id === 'mod-item'
        && payloadState.removedItemIds.size === 1
        && payloadState.removedItemIds.has('old-item')
        && payloadState.replacedItems.size === 1
        && payloadState.replacedItems.get('old-item')?.id === 'replacement-item'
        && payloadState.addedAchievements.length === 1
        && payloadState.addedAchievements[0]?.id === 'mod-achievement'
        && payloadState.removedAchievementIds.size === 1
        && payloadState.removedAchievementIds.has('old-achievement')
        && payloadState.replacedAchievements.size === 1
        && payloadState.replacedAchievements.get('old-achievement')?.id === 'replacement-achievement'
        && payloadState.interfaceLocales.length === 2
        && payloadState.interfaceLocales.map(locale => locale.id).join('|') === 'en-US|de-DE',
      `Settings=${[...payloadState.settingOverrides.keys()].join(',') || 'none'}, items=${payloadState.addedItems.length}/${payloadState.replacedItems.size}, achievements=${payloadState.addedAchievements.length}/${payloadState.replacedAchievements.size}, locales=${payloadState.interfaceLocales.map(locale => locale.id).join(',') || 'none'}.`,
    ),
  ];
}

function runExtensionContractChecks(): DiagnosticCheck[] {
  const themeColors = normalizeThemeColors({
    accent: ' #f97316 ',
    bg: '#111827',
    green: '#22c55e',
    red: '#ef4444',
    subtext: '#9ca3af',
    surface: '#1f2937',
    surface2: '#374151',
    text: '#f9fafb',
    yellow: '#eab308',
    ignored: 42,
  });
  const incompleteThemeColors = normalizeThemeColors({
    bg: '#111827',
    surface: '#1f2937',
  });
  const themeVariables = normalizeThemeStringRecord({
    ' --accent ': ' #f97316 ',
    empty: '',
    numeric: 42,
  });
  const themeClasses = normalizeThemeStringArray([' theme-custom ', '', 42]);
  const installableUpdate = {
    status: 'update-available',
    installSupport: 'direct',
    issues: [],
    duplicateRecommendationReason: undefined,
    duplicateSourceIds: [],
  } as any;
  const installedEntry = {
    ...installableUpdate,
    status: 'installed',
  } as any;
  const manualOnlyEntry = {
    ...installableUpdate,
    status: 'available',
    installSupport: 'manual',
  } as any;
  const blockedFallbackEntry = {
    ...installableUpdate,
    status: 'available',
    issues: [{ stage: 'manifest', severity: 'error', message: 'Blocked', fallback: 'blocked-install' }],
  } as any;
  const sourceErrorEntry = {
    ...installableUpdate,
    status: 'source-error',
    lastError: 'Source failed.',
  } as any;
  const duplicateEntry = {
    ...installableUpdate,
    status: 'available',
    duplicateSourceIds: ['fixture-source'],
  } as any;

  return [
    check(
      'theme shared validators normalize SDK-ready style primitives',
      themeColors?.accent === '#f97316'
        && themeColors.bg === '#111827'
        && incompleteThemeColors === undefined
        && themeVariables?.['--accent'] === '#f97316'
        && themeClasses?.join('|') === 'theme-custom'
        && hasThemeStyleContent({ variables: themeVariables, bodyClasses: themeClasses }),
      `Theme colors=${themeColors?.accent ?? 'none'}, variables=${Object.keys(themeVariables ?? {}).join(',') || 'none'}, classes=${themeClasses?.join(',') ?? 'none'}.`,
    ),
    check(
      'package shared manifest contracts are stable',
      ADDON_MANIFEST_VERSION === 1
        && ADDON_MANIFEST_TYPE === 'content'
        && MOD_MANIFEST_TYPE === 'mod'
        && THEME_MANIFEST_VERSION === 1
        && THEME_MANIFEST_TYPE === 'theme',
      `Addon=${ADDON_MANIFEST_TYPE}@${ADDON_MANIFEST_VERSION}, mod=${MOD_MANIFEST_TYPE}, theme=${THEME_MANIFEST_TYPE}@${THEME_MANIFEST_VERSION}.`,
    ),
    check(
      'extension shared manifest contract is stable',
      EXTENSION_SOURCE_MANIFEST_VERSION === 1
        && EXTENSION_SOURCE_MANIFEST_TYPE === 'extension-source',
      `Version=${EXTENSION_SOURCE_MANIFEST_VERSION}, type=${EXTENSION_SOURCE_MANIFEST_TYPE}.`,
    ),
    check(
      'extension shared source types are closed',
      EXTENSION_SOURCE_TYPES.join(',') === 'local,url,github'
        && isExtensionSourceType('local')
        && isExtensionSourceType('url')
        && isExtensionSourceType('github')
        && !isExtensionSourceType('registry'),
      `Source types=${EXTENSION_SOURCE_TYPES.join(',')}.`,
    ),
    check(
      'extension shared catalog kinds are closed',
      EXTENSION_CATALOG_KINDS.join(',') === 'addons,mods,themes'
        && isExtensionCatalogKind('addons')
        && isExtensionCatalogKind('mods')
        && isExtensionCatalogKind('themes')
        && !isExtensionCatalogKind('plugins'),
      `Kinds=${EXTENSION_CATALOG_KINDS.join(',')}.`,
    ),
    check(
      'extension shared status contracts are closed',
      EXTENSION_CATALOG_ENTRY_STATUSES.join(',') === 'available,installed,update-available,source-disabled,source-error,incompatible,invalid'
        && EXTENSION_CATALOG_INSTALL_SUPPORTS.join(',') === 'direct,manual'
        && EXTENSION_SOURCE_SYNC_STATUSES.join(',') === 'never,ready,error'
        && isExtensionCatalogEntryStatus('available')
        && !isExtensionCatalogEntryStatus('pending')
        && isExtensionCatalogInstallSupport('direct')
        && !isExtensionCatalogInstallSupport('automatic')
        && isExtensionSourceSyncStatus('ready')
        && !isExtensionSourceSyncStatus('syncing'),
      `Statuses=${EXTENSION_CATALOG_ENTRY_STATUSES.length}, support=${EXTENSION_CATALOG_INSTALL_SUPPORTS.join('/')}, sync=${EXTENSION_SOURCE_SYNC_STATUSES.join('/')}.`,
    ),
    check(
      'extension shared issue contracts are closed',
      EXTENSION_CATALOG_ISSUE_STAGES.join(',') === 'manifest,list,card,package'
        && EXTENSION_CATALOG_ISSUE_SEVERITIES.join(',') === 'warning,error'
        && EXTENSION_CATALOG_ISSUE_FALLBACKS.join(',') === 'stale-cache,skipped-card,manual-only,blocked-install'
        && isExtensionCatalogIssueStage('manifest')
        && !isExtensionCatalogIssueStage('runtime')
        && isExtensionCatalogIssueSeverity('warning')
        && !isExtensionCatalogIssueSeverity('notice')
        && isExtensionCatalogIssueFallback('blocked-install')
        && !isExtensionCatalogIssueFallback('retry'),
      `Issue stages=${EXTENSION_CATALOG_ISSUE_STAGES.join(',')}, fallbacks=${EXTENSION_CATALOG_ISSUE_FALLBACKS.join(',')}.`,
    ),
    check(
      'extension shared duplicate recommendation reasons are closed',
      EXTENSION_CATALOG_DUPLICATE_RECOMMENDATION_REASONS.join(',') === 'newer-available,newest-blocked'
        && isExtensionCatalogDuplicateRecommendationReason('newer-available')
        && isExtensionCatalogDuplicateRecommendationReason('newest-blocked')
        && !isExtensionCatalogDuplicateRecommendationReason('same-version'),
      `Duplicate reasons=${EXTENSION_CATALOG_DUPLICATE_RECOMMENDATION_REASONS.join(',')}.`,
    ),
    check(
      'extension catalog entry helpers share install and attention logic',
      !isExtensionCatalogEntryBlocked(installableUpdate)
        && canInstallExtensionCatalogEntry(installableUpdate)
        && !canInstallExtensionCatalogEntry(installedEntry)
        && isExtensionCatalogEntryBlocked(manualOnlyEntry)
        && !canInstallExtensionCatalogEntry(manualOnlyEntry)
        && isExtensionCatalogEntryBlocked(blockedFallbackEntry)
        && hasExtensionCatalogAttention(blockedFallbackEntry)
        && hasExtensionCatalogAttention(duplicateEntry),
      `Installable=${canInstallExtensionCatalogEntry(installableUpdate)}, manualBlocked=${isExtensionCatalogEntryBlocked(manualOnlyEntry)}, duplicateAttention=${hasExtensionCatalogAttention(duplicateEntry)}.`,
    ),
    check(
      'extension catalog entry block reasons are shared',
      getExtensionCatalogEntryBlockReason(blockedFallbackEntry) === 'Blocked'
        && getExtensionCatalogEntryBlockReason(manualOnlyEntry) === 'Catalog entry requires manual installation.'
        && getExtensionCatalogEntryBlockReason(sourceErrorEntry) === 'Source failed.'
        && getExtensionCatalogEntryBlockReason(installableUpdate) === undefined,
      `Blocked=${getExtensionCatalogEntryBlockReason(blockedFallbackEntry) ?? 'none'}, manual=${getExtensionCatalogEntryBlockReason(manualOnlyEntry) ?? 'none'}.`,
    ),
  ];
}

function catalogEntryFixture(patch: Partial<ExtensionCatalogEntry> = {}): ExtensionCatalogEntry {
  return {
    id: 'fixture-source:addons:daily-pack',
    sourceId: 'fixture-source',
    sourceName: 'Fixture Source',
    sourceEnabled: true,
    kind: 'addons',
    entryId: 'daily-pack',
    manifestId: 'daily-pack',
    manifestName: 'Daily Pack',
    manifestVersion: '1.0.0',
    status: 'available',
    installSupport: 'direct',
    dependencies: [],
    packageFiles: ['daily-pack.json'],
    permissions: [],
    duplicateSourceIds: [],
    duplicateSourceNames: [],
    issues: [],
    ...patch,
  };
}

function runExtensionCatalogUiChecks(): DiagnosticCheck[] {
  const translate = (key: string, params?: Record<string, string | number | boolean | null | undefined>) => {
    if (!params) return key;
    return `${key}:${Object.entries(params).map(([name, value]) => `${name}=${value}`).join('|')}`;
  };
  const installable = buildExtensionCatalogInstallActionViewModel(catalogEntryFixture(), translate);
  const installed = buildExtensionCatalogInstallActionViewModel(catalogEntryFixture({
    installedVersion: '1.0.0',
    status: 'installed',
  }), translate);
  const manualOnly = buildExtensionCatalogInstallActionViewModel(catalogEntryFixture({
    installSupport: 'manual',
  }), translate);
  const incompatible = buildExtensionCatalogInstallActionViewModel(catalogEntryFixture({
    status: 'incompatible',
  }), translate);
  const sourceError = buildExtensionCatalogInstallActionViewModel(catalogEntryFixture({
    lastError: 'Source failed.',
    status: 'source-error',
  }), translate);
  const searchEmpty = buildExtensionCatalogEmptyStateViewModel({
    search: 'daily',
    view: 'catalog',
  }, translate);
  const catalogEmpty = buildExtensionCatalogEmptyStateViewModel({
    search: '',
    view: 'catalog',
  }, translate);
  const installedEmpty = buildExtensionCatalogEmptyStateViewModel({
    filter: 'all',
    hasInstalledContent: false,
    search: '',
    view: 'installed',
  }, translate);
  const sourcesEmpty = buildExtensionCatalogEmptyStateViewModel({
    search: '',
    view: 'sources',
  }, translate);

  return [
    check(
      'extension catalog install action exposes installable state',
      installable.canInstall
        && !installable.disabled
        && installable.variant === 'accent'
        && installable.label === 'addons.catalog.actions.installAddon',
      `Installable=${installable.label}/${installable.variant}/${installable.disabled}.`,
    ),
    check(
      'extension catalog install action exposes installed disabled state',
      !installed.canInstall
        && installed.disabled
        && installed.variant === 'secondary'
        && installed.label === 'addons.catalog.actions.installed',
      `Installed=${installed.label}/${installed.variant}/${installed.disabled}.`,
    ),
    check(
      'extension catalog install action exposes blocked reasons',
      !manualOnly.canInstall
        && manualOnly.label === 'addons.catalog.actions.manualOnly'
        && manualOnly.blockReason === 'Catalog entry requires manual installation.'
        && incompatible.blockReason === 'Catalog entry is not compatible with this app version.'
        && sourceError.blockReason === 'Source failed.',
      `Manual=${manualOnly.blockReason ?? 'none'}, incompatible=${incompatible.blockReason ?? 'none'}, source=${sourceError.blockReason ?? 'none'}.`,
    ),
    check(
      'extension catalog empty states distinguish search, catalog, installed and sources',
      searchEmpty.title === 'addons.empty.search'
        && searchEmpty.iconKind === 'catalog'
        && catalogEmpty.title === 'addons.catalog.emptyTitle'
        && catalogEmpty.subtitle === 'addons.catalog.emptySubtitle'
        && installedEmpty.title === 'addons.empty.installedTitle'
        && installedEmpty.subtitle === 'addons.empty.installedSubtitle'
        && sourcesEmpty.title === 'addons.empty.sourcesTitle'
        && sourcesEmpty.iconKind === 'sources',
      `Empty states=${searchEmpty.title}, ${catalogEmpty.title}, ${installedEmpty.title}, ${sourcesEmpty.title}.`,
    ),
  ];
}

function runExtensionCatalogSelectorChecks(): DiagnosticCheck[] {
  const installableAddon = catalogEntryFixture({
    entryId: 'daily-pack',
    kind: 'addons',
    manifestName: 'Daily Pack',
    status: 'available',
  });
  const updateTheme = catalogEntryFixture({
    entryId: 'aurora',
    kind: 'themes',
    manifestName: 'Aurora Theme',
    status: 'update-available',
  });
  const installedMod = catalogEntryFixture({
    entryId: 'hardcore',
    kind: 'mods',
    manifestName: 'Hardcore Mode',
    status: 'installed',
  });
  const attentionEntry = catalogEntryFixture({
    entryId: 'broken',
    issues: [{ stage: 'manifest', severity: 'error', message: 'Broken', fallback: 'blocked-install' }],
    kind: 'mods',
    manifestName: 'Broken Mod',
    status: 'available',
  });
  const catalog = [installedMod, attentionEntry, installableAddon, updateTheme];
  const filteredCatalog = filterExtensionCatalogEntries({
    entries: catalog,
    filter: 'all',
    search: '',
  });
  const attentionCatalog = filterExtensionCatalogEntries({
    entries: catalog,
    filter: 'attention',
    search: '',
  });
  const searchedCatalog = filterExtensionCatalogEntries({
    entries: catalog,
    filter: 'all',
    search: 'aurora',
  });
  const addonWithResources = {
    id: 'lesson-pack',
    enabled: true,
    fileName: 'lesson-pack.json',
    installedAt: '2026-01-01T00:00:00.000Z',
    manifest: {
      manifestVersion: 1,
      id: 'lesson-pack',
      name: 'Lesson Pack',
      version: '1.0.0',
      type: ADDON_MANIFEST_TYPE,
      resources: {
        lessons: [{ layoutId: 'qwerty', lessons: [] }],
        words: [{ lang: 'en', words: ['focus'] }],
      },
    },
  } as InstalledAddon;
  const addonWithoutResources = {
    ...addonWithResources,
    id: 'plain-pack',
    fileName: 'plain-pack.json',
    manifest: {
      ...addonWithResources.manifest,
      id: 'plain-pack',
      name: 'Plain Pack',
      resources: undefined,
    },
  } as InstalledAddon;
  const filteredAddons = filterInstalledAddons({
    addons: [addonWithResources, addonWithoutResources],
    contentFilter: 'lessons',
    search: 'lesson',
  });
  const source = {
    id: 'github-source',
    enabled: true,
    installedAt: '2026-01-01T00:00:00.000Z',
    input: { type: 'github', owner: 'typing', repo: 'packs', branch: 'main', basePath: 'catalog' },
    syncState: {
      manifest: { name: 'GitHub Packs', description: 'Remote packs', author: 'Team' },
      status: 'ready',
    },
  } as InstalledExtensionSource;
  const mod = {
    id: 'hardcore-mode',
    enabled: true,
    dirName: 'hardcore-mode',
    installedAt: '2026-01-01T00:00:00.000Z',
    manifest: {
      manifestVersion: 1,
      id: 'hardcore-mode',
      name: 'Hardcore Mode',
      version: '1.0.0',
      type: MOD_MANIFEST_TYPE,
      entry: 'index.js',
      permissions: [],
    },
  } as InstalledMod;
  const theme = {
    id: 'aurora-theme',
    fileName: 'aurora-theme.json',
    installedAt: '2026-01-01T00:00:00.000Z',
    manifest: {
      manifestVersion: 1,
      id: 'aurora-theme',
      name: 'Aurora Theme',
      version: '1.0.0',
      type: THEME_MANIFEST_TYPE,
      style: { css: 'body { color: red; }' },
    },
  } as InstalledTheme;

  return [
    check(
      'extension catalog selectors sort actionable entries before installed and attention entries',
      filteredCatalog.map(entry => entry.entryId).join('|') === 'aurora|daily-pack|hardcore|broken'
        && attentionCatalog.map(entry => entry.entryId).join('|') === 'broken'
        && searchedCatalog.map(entry => entry.entryId).join('|') === 'aurora'
        && countAttentionCatalogEntries(catalog) === 1,
      `Catalog order=${filteredCatalog.map(entry => entry.entryId).join(',')}.`,
    ),
    check(
      'extension catalog selectors filter installed addons by search and content kind',
      getAddonContentKinds(addonWithResources).join('|') === 'words|lessons'
        && getAvailableInstalledAddonContentKinds([addonWithResources, addonWithoutResources], 'lesson').join('|') === 'words|lessons'
        && filteredAddons.map(addon => addon.id).join('|') === 'lesson-pack',
      `Addon filters=${filteredAddons.map(addon => addon.id).join(',') || 'none'}.`,
    ),
    check(
      'extension catalog selectors filter sources, mods and themes by shared search text',
      getSourceLocationLabel(source) === 'typing/packs#main/catalog'
        && filterExtensionSources([source], 'catalog').length === 1
        && filterInstalledMods([mod], 'hardcore').length === 1
        && filterInstalledThemes([theme], 'aurora').length === 1,
      `Source=${getSourceLocationLabel(source)}.`,
    ),
  ];
}

function runSetupPreferenceChecks(): DiagnosticCheck[] {
  const normalized = normalizeSetupPreferences({
    settings: {
      language: 'ru',
      layout: 'йцукен',
      theme: 'aurora-cascade-theme-pack',
    },
    extensionSources: [
      'data/local-extension-sources/tech-english-source/manifest.json',
      42,
      '../outside/manifest.json',
    ],
  });
  const invalid = normalizeSetupPreferences(null);
  const applied = normalized
    ? applySetupPreferenceSettings({
        settings: {
          language: 'en',
          layout: 'qwerty',
          theme: 'dark-orange',
          showKeyboard: true,
        },
      } as Progress, normalized)
    : null;
  const resolved = resolveBundledExtensionSourceManifestPath(
    'C:/App',
    'data/local-extension-sources/tech-english-source/manifest.json',
  )?.replace(/\\/g, '/');
  const rejectedOutside = resolveBundledExtensionSourceManifestPath('C:/App', '../manifest.json');
  const rejectedTraversal = resolveBundledExtensionSourceManifestPath(
    'C:/App',
    'data/local-extension-sources/../manifest.json',
  );
  const sourceManifestPaths = normalized
    ? resolveSetupPreferenceExtensionSourceManifestPaths('C:/App', normalized).map(item => item.replace(/\\/g, '/'))
    : [];

  return [
    check(
      'setup preferences normalize settings and source refs',
      normalized?.settings?.language === 'ru'
        && normalized?.settings?.layout === 'йцукен'
        && normalized?.settings?.theme === 'aurora-cascade-theme-pack'
        && normalized.extensionSources.length === 2
        && invalid === null,
      `Sources=${normalized?.extensionSources.length ?? 'none'}, invalid=${invalid === null}.`,
    ),
    check(
      'setup preferences merge first-run settings without dropping existing settings',
      applied?.settings?.language === 'ru'
        && applied.settings.layout === 'йцукен'
        && applied.settings.theme === 'aurora-cascade-theme-pack'
        && applied.settings.showKeyboard === true,
      `Language=${applied?.settings?.language ?? 'none'}, layout=${applied?.settings?.layout ?? 'none'}, keyboard=${applied?.settings?.showKeyboard ?? 'none'}.`,
    ),
    check(
      'setup preferences resolve only bundled extension source manifests',
      resolved === 'C:/App/data/local-extension-sources/tech-english-source/manifest.json'
        && rejectedOutside === null
        && rejectedTraversal === null,
      `Resolved=${resolved}, outside=${rejectedOutside ?? 'blocked'}, traversal=${rejectedTraversal ?? 'blocked'}.`,
    ),
    check(
      'setup preferences build installable source manifest list',
      sourceManifestPaths.join('|') === 'C:/App/data/local-extension-sources/tech-english-source/manifest.json',
      `Source manifests=${sourceManifestPaths.join(', ') || 'none'}.`,
    ),
  ];
}

function runAppDataPathChecks(): DiagnosticCheck[] {
  const devPaths = resolveAppDataPaths({
    appPath: 'C:/Projects/TypingTrainer',
    exePath: 'C:/Projects/TypingTrainer/node_modules/electron/electron.exe',
    isPackaged: false,
  });
  const packagedPaths = resolveAppDataPaths({
    appPath: 'C:/Program Files/Typing Trainer/resources/app.asar',
    exePath: 'C:/Program Files/Typing Trainer/Typing Trainer.exe',
    isPackaged: true,
  });

  return [
    check(
      'app data paths keep dev data inside project data directory',
      devPaths.userDataPath.replace(/\\/g, '/') === 'C:/Projects/TypingTrainer/data'
        && devPaths.progressFile.replace(/\\/g, '/') === 'C:/Projects/TypingTrainer/data/progress.json'
        && devPaths.addonsDir.replace(/\\/g, '/') === 'C:/Projects/TypingTrainer/data/addons'
        && devPaths.modsDir.replace(/\\/g, '/') === 'C:/Projects/TypingTrainer/data/mods'
        && devPaths.themesDir.replace(/\\/g, '/') === 'C:/Projects/TypingTrainer/data/themes',
      `Dev data=${devPaths.userDataPath.replace(/\\/g, '/')}.`,
    ),
    check(
      'app data paths keep packaged data beside executable',
      packagedPaths.userDataPath.replace(/\\/g, '/') === 'C:/Program Files/Typing Trainer/data'
        && packagedPaths.progressFile.replace(/\\/g, '/') === 'C:/Program Files/Typing Trainer/data/progress.json'
        && packagedPaths.customThemesFile.replace(/\\/g, '/') === 'C:/Program Files/Typing Trainer/data/custom-themes.json'
        && packagedPaths.installerThemeFile.replace(/\\/g, '/') === 'C:/Program Files/Typing Trainer/data/installer-theme.ini'
        && packagedPaths.setupPreferencesFile.replace(/\\/g, '/') === 'C:/Program Files/Typing Trainer/data/setup-preferences.json',
      `Packaged data=${packagedPaths.userDataPath.replace(/\\/g, '/')}.`,
    ),
  ];
}

function runProgressMigrationChecks(): DiagnosticCheck[] {
  const legacyProgress = {
    settings: { language: 'en', layout: 'qwerty' },
    history: {
      qwerty: [
        {
          mode: 'practice',
          wpm: 42,
          acc: 97,
          date: '2026-01-02T10:00:00.000Z',
        },
      ],
    },
  };
  const migrated = migrateProgressData(legacyProgress, '3.0.0');
  const invalidMigrated = migrateProgressData(null, '3.0.0');
  const futureMigrated = migrateProgressData({ schemaVersion: CURRENT_PROGRESS_SCHEMA_VERSION + 1 }, '3.0.0');
  const normalized = normalizeProgressForSave({
    schemaVersion: 0,
    settings: { language: 'ru' },
  } as Progress, '3.0.0');

  return [
    check(
      'progress migration stamps legacy saves without dropping data',
      migrated.progress.schemaVersion === CURRENT_PROGRESS_SCHEMA_VERSION
        && migrated.progress.appVersion === '3.0.0'
        && migrated.progress.settings?.language === 'en'
        && migrated.progress.history?.qwerty?.[0]?.wpm === 42
        && migrated.diagnostics.length > 0,
      `schema=${migrated.progress.schemaVersion}, app=${migrated.progress.appVersion}.`,
    ),
    check(
      'progress migration normalizes invalid saves to current empty schema',
      invalidMigrated.progress.schemaVersion === CURRENT_PROGRESS_SCHEMA_VERSION
        && invalidMigrated.progress.appVersion === '3.0.0'
        && invalidMigrated.diagnostics.length > 0,
      `schema=${invalidMigrated.progress.schemaVersion}, app=${invalidMigrated.progress.appVersion}.`,
    ),
    check(
      'progress migration gate rejects unsupported future schema',
      !futureMigrated.ok
        && !futureMigrated.migrated
        && futureMigrated.progress.schemaVersion === CURRENT_PROGRESS_SCHEMA_VERSION
        && futureMigrated.progress.appVersion === '3.0.0'
        && futureMigrated.diagnostics.some(item => item.code === 'progress.unsupportedSchemaVersion'),
      `ok=${futureMigrated.ok}, diagnostics=${futureMigrated.diagnostics.map(item => item.code).join(',') || 'none'}.`,
    ),
    check(
      'progress save normalization keeps current schema and app version',
      normalized.schemaVersion === CURRENT_PROGRESS_SCHEMA_VERSION
        && normalized.appVersion === '3.0.0'
        && normalized.settings?.language === 'ru',
      `schema=${normalized.schemaVersion}, app=${normalized.appVersion}.`,
    ),
  ];
}

function runAddonRegistryPathSafetyChecks(): DiagnosticCheck[] {
  const addonsDir = 'C:/App/data/addons';
  const validPath = resolveSafeRegistryFilePath(addonsDir, 'daily-pack.json')?.replace(/\\/g, '/');
  const nestedPath = resolveSafeRegistryFilePath(addonsDir, 'packs/daily-pack.json');
  const outsidePath = resolveSafeRegistryFilePath(addonsDir, '../progress.json');
  const outsideWindowsPath = resolveSafeRegistryFilePath(addonsDir, '..\\progress.json');
  const absolutePath = resolveSafeRegistryFilePath(addonsDir, 'C:/App/data/progress.json');

  return [
    check(
      'addon registry file paths resolve only direct child files',
      validPath === 'C:/App/data/addons/daily-pack.json'
        && nestedPath === null
        && outsidePath === null
        && outsideWindowsPath === null
        && absolutePath === null,
      `Valid=${validPath ?? 'blocked'}, nested=${nestedPath ?? 'blocked'}, outside=${outsidePath ?? 'blocked'}, windowsOutside=${outsideWindowsPath ?? 'blocked'}, absolute=${absolutePath ?? 'blocked'}.`,
    ),
  ];
}

async function runModLocaleResourcePermissionChecks(): Promise<DiagnosticCheck[]> {
  const localeResource = {
    name: 'en.json',
    relativePath: 'locales/en.json',
    extension: 'json' as const,
    content: JSON.stringify({
      id: 'en-US',
      label: 'English',
      nativeLabel: 'English',
      dictionary: { common: { ok: 'OK' } },
    }),
  };
  const mods: InstalledMod[] = [
    {
      id: 'locale-without-permission',
      enabled: true,
      dirName: 'locale-without-permission',
      installedAt: '2026-01-01T00:00:00.000Z',
      manifest: {
        manifestVersion: 1,
        id: 'locale-without-permission',
        name: 'Locale Without Permission',
        version: '1.0.0',
        type: MOD_MANIFEST_TYPE,
        entry: 'index.js',
        permissions: [],
      },
    },
    {
      id: 'locale-with-permission',
      enabled: true,
      dirName: 'locale-with-permission',
      installedAt: '2026-01-01T00:00:00.000Z',
      manifest: {
        manifestVersion: 1,
        id: 'locale-with-permission',
        name: 'Locale With Permission',
        version: '1.0.0',
        type: MOD_MANIFEST_TYPE,
        entry: 'index.js',
        permissions: ['i18n'],
      },
    },
  ];
  const resourceReads: string[] = [];
  const result = await runAllMods(
    mods,
    async () => 'module.exports = function() {};',
    async (modId) => {
      resourceReads.push(modId);
      return [{ ...localeResource }];
    },
    () => ({} as any),
    () => [],
    () => [],
    () => [],
    () => [],
  );

  return [
    check(
      'mod runner gates declarative locale resources behind i18n permission',
      result.state.interfaceLocales.length === 1
        && result.state.interfaceLocales[0]?.id === 'en-US'
        && resourceReads.join('|') === 'locale-with-permission',
      `Locales=${result.state.interfaceLocales.map(locale => `${locale.id}:${locale.source}`).join(',') || 'none'}, reads=${resourceReads.join(',') || 'none'}.`,
    ),
  ];
}

async function runCoreDiagnostics(): Promise<DiagnosticReport> {
  const checks = [
    ...runModApiContractChecks(),
    ...(await runModLocaleResourcePermissionChecks()),
    ...runExtensionContractChecks(),
    ...runExtensionCatalogUiChecks(),
    ...runExtensionCatalogSelectorChecks(),
    ...runSetupPreferenceChecks(),
    ...runProgressMigrationChecks(),
    ...runAppDataPathChecks(),
    ...runAddonRegistryPathSafetyChecks(),
    ...runSettingsViewModelChecks(),
    ...runTextDisplayViewModelChecks(),
    ...runSidebarViewModelChecks(),
    ...runResultMetricStripViewModelChecks(),
    ...runAchievementsViewModelChecks(),
    ...runLessonsViewModelChecks(),
    ...runContentPackSelectionChecks(),
    ...runHistorySelectorChecks(),
    ...runHomeHistoryMetricsChecks(),
    ...runHomeVisibleQuickActionChecks(),
    ...runHomeModeCardGroupChecks(),
    ...runHomeProgressCenterVisibilityChecks(),
    ...runPracticeCompletionFlowChecks(),
    ...runPracticeFamilyModeHeaderChecks(),
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
    ...runGameFlowResolverChecks(),
    ...runGameResultMetricItemsChecks(),
    ...runGameResultCardViewModelChecks(),
    ...runGameResultSecondaryBlocksChecks(),
    ...runGameRewardChoiceBlockViewModelChecks(),
    ...runGameInventoryPanelViewModelChecks(),
    ...runGamePageBonusViewModelChecks(),
    ...runGameRunMapLayoutViewModelChecks(),
    ...runGameHudViewModelChecks(),
    ...runGameEventChoiceCardViewModelChecks(),
    ...runGameAchievementToastViewModelChecks(),
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

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  const report = await runCoreDiagnostics();
  process.stdout.write(`${formatReport(report)}\n`);

  if (options.jsonPath) {
    writeJsonReport(options.jsonPath, { generatedAt: new Date().toISOString(), ...report });
    process.stdout.write(`JSON report saved to ${options.jsonPath}\n`);
  }

  if (report.failed > 0) {
    process.exitCode = 1;
  }
}

void main();
