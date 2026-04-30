import fs from 'fs';
import path from 'path';
import type { HistoryEntry, LayoutsData, Progress, TranslationParams } from '../shared/types';
import {
  buildModeResultFollowupRecommendation,
  buildGameResultComparison,
  buildHistoryFollowupRecommendation,
  buildHomePersonalRecordCards,
  buildModeFocusSnapshots,
  buildPracticeResultComparison,
  buildSprintResultComparison,
} from '../core/motivation/records';
import { summarizeHomeHistory } from '../core/home/summary';
import {
  getHistoryModeBucket,
  isBasePracticeHistoryEntry,
  isChallengeHistoryEntry,
  isFlawlessHistoryEntry,
  isSprintHistoryEntry,
  isSurvivalHistoryEntry,
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

const translate = (key: string, params?: TranslationParams) =>
  params ? `${key} ${JSON.stringify(params)}` : key;

function entry(partial: Partial<HistoryEntry> & Pick<HistoryEntry, 'date' | 'mode' | 'wpm' | 'acc'>): HistoryEntry {
  return partial;
}

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

function buildLayouts(): LayoutsData {
  const fingers = {
    index_left: [],
    index_right: [],
    middle_left: [],
    middle_right: [],
    ring_left: [],
    ring_right: [],
    pinky_left: [],
    pinky_right: [],
  };
  const rows = {
    top: [],
    middle: [],
    bottom: [],
  };

  return {
    languages: [
      { id: 'en', label: 'English', wordsFile: 'words_en.json' },
      { id: 'ru', label: 'Russian', wordsFile: 'words_ru.json' },
    ],
    layouts: {
      qwerty: {
        lang: 'en',
        label: 'QWERTY',
        rows,
        fingers,
        lessonOrder: [],
        practiceUnlockOrder: [],
      },
      dvorak: {
        lang: 'en',
        label: 'Dvorak',
        rows,
        fingers,
        lessonOrder: [],
        practiceUnlockOrder: [],
      },
      йцукен: {
        lang: 'ru',
        label: 'ЙЦУКЕН',
        rows,
        fingers,
        lessonOrder: [],
        practiceUnlockOrder: [],
      },
    },
  };
}

function buildHistory(): HistoryEntry[] {
  return [
    entry({
      date: '2026-01-01T10:00:00.000Z',
      mode: 'practice',
      wpm: 42,
      acc: 93,
      contentScenarioId: 'practice-normal',
      trainingMode: 'normal',
      contentMode: 'adaptive-words',
    }),
    entry({
      date: '2026-01-02T10:00:00.000Z',
      mode: 'practice',
      wpm: 48,
      acc: 94,
      contentScenarioId: 'practice-normal',
      trainingMode: 'normal',
      contentMode: 'custom',
    }),
    entry({
      date: '2026-01-03T10:00:00.000Z',
      mode: 'practice',
      wpm: 46,
      acc: 95,
      contentScenarioId: 'practice-rhythm',
      trainingMode: 'rhythm',
      contentMode: 'custom',
    }),
    entry({
      date: '2026-01-04T10:00:00.000Z',
      mode: 'test',
      wpm: 58,
      acc: 94,
      contentScenarioId: 'sprint',
      durationSeconds: 15,
      contentMode: 'custom',
    }),
    entry({
      date: '2026-01-05T10:00:00.000Z',
      mode: 'test',
      wpm: 64,
      acc: 95,
      contentScenarioId: 'sprint',
      durationSeconds: 30,
      contentMode: 'custom',
    }),
    entry({
      date: '2026-01-06T10:00:00.000Z',
      mode: 'practice',
      wpm: 51,
      acc: 96,
      contentScenarioId: 'survival',
      trainingMode: 'normal',
      contentMode: 'custom',
      passed: true,
    }),
    entry({
      date: '2026-01-07T10:00:00.000Z',
      mode: 'practice',
      wpm: 49,
      acc: 98,
      contentScenarioId: 'flawless',
      trainingMode: 'normal',
      contentMode: 'custom',
      passed: true,
    }),
    entry({
      date: '2026-01-08T10:00:00.000Z',
      mode: 'game',
      wpm: 55,
      acc: 93,
      gameLevel: 5,
      gameStageType: 'boss',
      victory: true,
    }),
  ];
}

function runHistoryDiagnostics(): DiagnosticReport {
  const entries = buildHistory();
  const emptyPracticeComparison = buildPracticeResultComparison([], translate, {
    wpm: 40,
    acc: 92,
    contentScenarioId: 'practice-normal',
    trainingMode: 'normal',
    contentMode: 'adaptive-words',
  });
  const practiceComparison = buildPracticeResultComparison(entries, translate, {
    wpm: 50,
    acc: 95,
    contentScenarioId: 'practice-normal',
    trainingMode: 'normal',
    contentMode: 'custom',
  });
  const sprintComparison = buildSprintResultComparison(entries, translate, {
    wpm: 66,
    acc: 96,
    contentScenarioId: 'sprint',
    durationSeconds: 30,
    contentMode: 'custom',
  });
  const gameComparison = buildGameResultComparison(entries, translate, {
    wpm: 58,
    acc: 94,
    gameLevel: 5,
    gameStageType: 'boss',
  });
  const homeSummary = summarizeHomeHistory(entries);
  const modeFocus = buildModeFocusSnapshots(entries, translate);
  const emptyModeFocus = buildModeFocusSnapshots([], translate);
  const flawlessReadyModeFocus = buildModeFocusSnapshots([
    entry({
      date: '2026-01-10T10:00:00.000Z',
      mode: 'practice',
      wpm: 60,
      acc: 98,
      contentScenarioId: 'survival',
      trainingMode: 'normal',
      contentMode: 'custom',
      passed: true,
    }),
    entry({
      date: '2026-01-11T10:00:00.000Z',
      mode: 'practice',
      wpm: 52,
      acc: 99,
      contentScenarioId: 'flawless',
      trainingMode: 'normal',
      contentMode: 'custom',
      passed: true,
    }),
  ], translate);
  const followup = buildHistoryFollowupRecommendation(entries[6] ?? null, translate);
  const testSpeedFollowup = buildModeResultFollowupRecommendation({
    mode: 'test',
    wpm: 72,
    acc: 96,
  }, translate);
  const testBaseFollowup = buildModeResultFollowupRecommendation({
    mode: 'test',
    wpm: 68,
    acc: 94,
  }, translate);
  const survivalPassedFollowup = buildModeResultFollowupRecommendation({
    mode: 'survival',
    wpm: 58,
    acc: 97,
    passed: true,
  }, translate);
  const survivalFailedFollowup = buildModeResultFollowupRecommendation({
    mode: 'survival',
    wpm: 58,
    acc: 95,
    passed: false,
  }, translate);
  const flawlessSoftFollowup = buildModeResultFollowupRecommendation({
    mode: 'flawless',
    wpm: 50,
    acc: 94,
    passed: false,
  }, translate);
  const flawlessPracticeFollowup = buildModeResultFollowupRecommendation({
    mode: 'flawless',
    wpm: 50,
    acc: 90,
    passed: false,
  }, translate);
  const layouts = buildLayouts();
  const progress: Progress = {
    history: {
      qwerty: entries,
      dvorak: [
        entry({
          date: '2026-01-09T09:00:00.000Z',
          mode: 'practice',
          wpm: 80,
          acc: 95,
          contentScenarioId: 'practice-normal',
          trainingMode: 'normal',
          contentMode: 'adaptive-words',
        }),
      ],
      йцукен: [
        entry({
          date: '2026-01-09T10:00:00.000Z',
          mode: 'practice',
          wpm: 70,
          acc: 97,
          contentScenarioId: 'practice-normal',
          trainingMode: 'normal',
          contentMode: 'adaptive-words',
        }),
      ],
    },
  };
  const recordCards = buildHomePersonalRecordCards(progress, layouts, 'qwerty', translate);

  const checks = [
    check(
      'empty comparison stays empty',
      !emptyPracticeComparison.previousAttempt && !emptyPracticeComparison.recentBest,
      'Empty history should not invent previous attempts or recent best entries.',
    ),
    check(
      'practice comparison prefers scenario + content mode',
      practiceComparison.previousAttempt?.entry.date === '2026-01-02T10:00:00.000Z',
      `Previous practice attempt: ${practiceComparison.previousAttempt?.entry.date ?? 'none'}.`,
    ),
    check(
      'sprint comparison respects duration',
      sprintComparison.previousAttempt?.entry.durationSeconds === 30,
      `Previous sprint duration: ${sprintComparison.previousAttempt?.entry.durationSeconds ?? 'none'}.`,
    ),
    check(
      'game comparison finds same level',
      gameComparison.previousAttempt?.entry.gameLevel === 5,
      `Previous game level: ${gameComparison.previousAttempt?.entry.gameLevel ?? 'none'}.`,
    ),
    check(
      'home summary buckets survival',
      homeSummary.bestSurvivalSession?.contentScenarioId === 'survival',
      `Best survival scenario: ${homeSummary.bestSurvivalSession?.contentScenarioId ?? 'none'}.`,
    ),
    check(
      'home summary buckets flawless',
      homeSummary.bestFlawlessSession?.contentScenarioId === 'flawless',
      `Best flawless scenario: ${homeSummary.bestFlawlessSession?.contentScenarioId ?? 'none'}.`,
    ),
    check(
      'mode focus groups challenge runs',
      modeFocus.find(snapshot => snapshot.id === 'survival')?.attempts === 2,
      `Survival focus attempts: ${modeFocus.find(snapshot => snapshot.id === 'survival')?.attempts ?? 0}.`,
    ),
    check(
      'mode focus keeps empty modes actionable',
      emptyModeFocus.every(snapshot => snapshot.attempts === 0 && snapshot.emphasis === 'warn'),
      `Empty focus states: ${emptyModeFocus.map(snapshot => `${snapshot.id}:${snapshot.emphasis}`).join(', ')}.`,
    ),
    check(
      'mode focus recognizes flawless-ready challenge state',
      flawlessReadyModeFocus.find(snapshot => snapshot.id === 'survival')?.emphasis === 'good',
      `Survival focus emphasis: ${flawlessReadyModeFocus.find(snapshot => snapshot.id === 'survival')?.emphasis ?? 'none'}.`,
    ),
    check(
      'mode focus keeps best base practice attempt',
      modeFocus.find(snapshot => snapshot.id === 'practice')?.bestEntry?.date === '2026-01-02T10:00:00.000Z',
      `Practice focus best: ${modeFocus.find(snapshot => snapshot.id === 'practice')?.bestEntry?.date ?? 'none'}.`,
    ),
    check(
      'flawless followup routes to survival',
      followup?.actionMode === 'survival',
      `Flawless followup action: ${followup?.actionMode ?? 'none'}.`,
    ),
    check(
      'record cards keep current-layout record scoped',
      recordCards.find(card => card.id === 'current-layout')?.record?.layoutId === 'qwerty',
      `Current-layout record layout: ${recordCards.find(card => card.id === 'current-layout')?.record?.layoutId ?? 'none'}.`,
    ),
    check(
      'record cards read same-language layouts',
      recordCards.find(card => card.id === 'current-language')?.record?.layoutId === 'dvorak',
      `Current-language record layout: ${recordCards.find(card => card.id === 'current-language')?.record?.layoutId ?? 'none'}.`,
    ),
    check(
      'mode result followups cover test branches',
      testSpeedFollowup.actionMode === 'survival'
        && testBaseFollowup.actionMode === 'practice',
      `Test followups: ${testSpeedFollowup.actionMode}, ${testBaseFollowup.actionMode}.`,
    ),
    check(
      'mode result followups cover challenge branches',
      survivalPassedFollowup.actionMode === 'survival'
        && survivalFailedFollowup.actionMode === 'practice'
        && flawlessSoftFollowup.actionMode === 'survival'
        && flawlessPracticeFollowup.actionMode === 'practice',
      `Challenge followups: ${survivalPassedFollowup.actionMode}, ${survivalFailedFollowup.actionMode}, ${flawlessSoftFollowup.actionMode}, ${flawlessPracticeFollowup.actionMode}.`,
    ),
    check(
      'selectors classify persisted modes',
      isBasePracticeHistoryEntry(entries[0]!)
        && isSprintHistoryEntry(entries[3]!)
        && isSurvivalHistoryEntry(entries[5]!)
        && isFlawlessHistoryEntry(entries[6]!)
        && isChallengeHistoryEntry(entries[6]!)
        && getHistoryModeBucket(entries[7]!) === 'game',
      'Shared selectors should classify legacy persisted mode/scenario combinations.',
    ),
  ];

  return {
    checks,
    failed: checks.filter(item => !item.passed).length,
    passed: checks.filter(item => item.passed).length,
  };
}

function formatReport(report: DiagnosticReport): string {
  const lines = [
    '=== History diagnostics ===',
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
  const report = runHistoryDiagnostics();
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
