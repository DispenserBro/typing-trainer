import { performance } from 'node:perf_hooks';
import type { HistoryEntry, PracticeRhythmSessionEntry, TranslationParams } from '../shared/types';
import { buildStatsHistoryScopeModel } from '../core/stats/historyScope';
import {
  buildGameResultComparison,
  buildPracticeResultComparison,
  buildSprintResultComparison,
} from '../core/motivation/records';
import { buildModeResultHistoryModel } from '../core/practice/resultHistory';
import { buildGameResultHistoryModel } from '../core/game/resultHistory';

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

const PERF_BUDGET_MS = {
  recordsComparison: 1_800,
  resultHistoryEmpty: 1_200,
  statsHistoryScope: 1_000,
} as const;

const translate = (key: string, params?: TranslationParams) =>
  params ? `${key}:${Object.values(params).join('|')}` : key;

function check(name: string, passed: boolean, detail: string): DiagnosticCheck {
  return { name, passed, detail };
}

function measure<T>(callback: () => T): { durationMs: number; value: T } {
  const start = performance.now();
  const value = callback();
  return {
    durationMs: performance.now() - start,
    value,
  };
}

function historyEntry(index: number, partial: Partial<HistoryEntry>): HistoryEntry {
  const date = new Date(Date.UTC(2026, 0, 1, 10, index * 10, 0)).toISOString();
  return {
    date,
    mode: 'practice',
    wpm: 40 + (index % 60),
    acc: 88 + (index % 12),
    ...partial,
  };
}

function buildMixedHistory(count: number): HistoryEntry[] {
  const modes = ['practice', 'test', 'survival', 'flawless', 'game', 'lesson'] as const;
  return Array.from({ length: count }, (_, index) => {
    const mode = modes[index % modes.length]!;
    if (mode === 'test') {
      return historyEntry(index, {
        mode: 'test',
        contentScenarioId: 'sprint',
        durationSeconds: index % 2 === 0 ? 30 : 60,
      });
    }
    if (mode === 'survival' || mode === 'flawless') {
      return historyEntry(index, {
        mode: 'practice',
        contentScenarioId: mode,
        passed: index % 3 !== 0,
      });
    }
    if (mode === 'game') {
      return historyEntry(index, {
        mode: 'game',
        gameLevel: (index % 12) + 1,
        gameStageType: index % 5 === 0 ? 'boss' : 'normal',
        victory: index % 11 === 0,
      });
    }
    if (mode === 'lesson') {
      return historyEntry(index, { mode: 'lesson' });
    }
    return historyEntry(index, {
      mode: 'practice',
      contentScenarioId: index % 4 === 0 ? 'practice-rhythm' : 'practice-normal',
      trainingMode: index % 4 === 0 ? 'rhythm' : 'normal',
      contentMode: 'adaptive-words',
    });
  });
}

function runStatsHistoryScopePerfChecks(): DiagnosticCheck[] {
  const rhythmReads = {
    acc: 0,
    date: 0,
    trainingMode: 0,
    wpm: 0,
  };
  const layouts = ['en', 'ru', 'de', 'fr'];
  const progressHistory: Record<string, HistoryEntry[]> = {};
  const practiceRhythmHistory: Record<string, PracticeRhythmSessionEntry[]> = {};

  layouts.forEach((layoutId, layoutIndex) => {
    progressHistory[layoutId] = Array.from({ length: 500 }, (_, index) => historyEntry(index + layoutIndex * 1000, {
      mode: index % 2 === 0 ? 'practice' : 'test',
      contentScenarioId: index % 2 === 0 ? 'practice-rhythm' : 'sprint',
      trainingMode: index % 2 === 0 ? 'rhythm' : 'normal',
    }));
    practiceRhythmHistory[layoutId] = Array.from({ length: 500 }, (_, index) => {
      const raw = {
        id: `${layoutId}-${index}`,
        date: progressHistory[layoutId]![index]!.date,
        trainingMode: 'rhythm',
        wpm: progressHistory[layoutId]![index]!.wpm,
        acc: progressHistory[layoutId]![index]!.acc,
        textLength: 120,
        intervals: [180, 190, 200],
        averageInterval: 190,
        averageDeviation: 8,
        rhythmScore: 88,
        worstInterval: 230,
      } satisfies PracticeRhythmSessionEntry;
      return new Proxy(raw, {
        get(target, property, receiver) {
          if (property === 'date') rhythmReads.date += 1;
          if (property === 'trainingMode') rhythmReads.trainingMode += 1;
          if (property === 'wpm') rhythmReads.wpm += 1;
          if (property === 'acc') rhythmReads.acc += 1;
          return Reflect.get(target, property, receiver);
        },
      });
    });
  });

  const measured = measure(() => buildStatsHistoryScopeModel({
      currentLayout: 'en',
      currentLayoutLabel: 'English',
      layoutScope: 'all',
      locale: 'en-US',
      practiceRhythmHistory,
      progressHistory,
      statsMode: 'all',
      statsPeriod: 'all',
      translate,
      unit: 'wpm',
    }));
  const model = measured.value;
  const withinBudget = measured.durationMs <= PERF_BUDGET_MS.statsHistoryScope;
  const totalRhythm = layouts.length * 500;
  const filteredPracticeRows = model.filteredHistoryEntries.filter(item => item.entry.mode === 'practice').length;

  return [
    check(
      'perf stats history scope keeps rhythm matching near linear',
      model.filteredHistoryEntries.length === layouts.length * 500
        && model.filteredSessionHistory.length === model.filteredHistoryEntries.length
        && rhythmReads.date <= totalRhythm * 2
        && rhythmReads.wpm <= filteredPracticeRows * 3
        && rhythmReads.acc <= filteredPracticeRows * 3
        && rhythmReads.trainingMode <= filteredPracticeRows * 3
        && withinBudget,
      `Rows=${model.filteredHistoryEntries.length}, duration=${measured.durationMs.toFixed(1)}ms/${PERF_BUDGET_MS.statsHistoryScope}ms, rhythm date=${rhythmReads.date}/${totalRhythm * 2}, wpm=${rhythmReads.wpm}, acc=${rhythmReads.acc}, training=${rhythmReads.trainingMode}.`,
    ),
  ];
}

function runRecordsPerfChecks(): DiagnosticCheck[] {
  const entries = buildMixedHistory(50_000);
  const measured = measure(() => {
    const practice = buildPracticeResultComparison(entries, translate, {
      wpm: 68,
      acc: 96,
      contentScenarioId: 'practice-normal',
      contentMode: 'adaptive-words',
      trainingMode: 'normal',
    });
    const sprint = buildSprintResultComparison(entries, translate, {
      wpm: 72,
      acc: 97,
      contentScenarioId: 'sprint',
      contentMode: 'adaptive-words',
      durationSeconds: 30,
    });
    const game = buildGameResultComparison(entries, translate, {
      wpm: 70,
      acc: 95,
      gameLevel: 6,
      gameStageType: 'boss',
    });
    return { game, practice, sprint };
  });
  const { game, practice, sprint } = measured.value;
  const withinBudget = measured.durationMs <= PERF_BUDGET_MS.recordsComparison;

  return [
    check(
      'perf records comparisons stay bounded on large histories',
      Boolean(practice.previousAttempt)
        && Boolean(sprint.previousAttempt)
        && Boolean(game.previousAttempt)
        && withinBudget,
      `Duration=${measured.durationMs.toFixed(1)}ms/${PERF_BUDGET_MS.recordsComparison}ms, comparisons: practice=${Boolean(practice.previousAttempt)}, sprint=${Boolean(sprint.previousAttempt)}, game=${Boolean(game.previousAttempt)}.`,
    ),
  ];
}

function runResultHistoryPerfChecks(): DiagnosticCheck[] {
  const entries = buildMixedHistory(50_000);
  const measured = measure(() => {
    const emptyPractice = buildModeResultHistoryModel({
      contentMode: 'adaptive-words',
      currentLayout: 'en',
      historyByLayout: { en: entries },
      mode: 'practice-scenario',
      result: null,
      scenarioId: 'practice-normal',
      t: translate,
      trainingMode: 'normal',
    });
    const emptyGame = buildGameResultHistoryModel({
      currentLayout: 'en',
      ghostRun: null,
      historyEntries: entries,
      layoutProgressUnlocked: 0,
      layouts: {
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
            practiceUnlockOrder: ['a', 's', 'd'],
          },
        },
      },
      progress: { history: { en: entries } },
      result: null,
      translate,
    });
    return { emptyGame, emptyPractice };
  });
  const { emptyGame, emptyPractice } = measured.value;
  const withinBudget = measured.durationMs <= PERF_BUDGET_MS.resultHistoryEmpty;

  return [
    check(
      'perf result history skips comparison work when result is empty',
      emptyPractice.resultComparison === null
        && emptyGame.comparison === null
        && emptyGame.ghostComparison === null
        && emptyGame.masterySummary === null
        && withinBudget,
      `Duration=${measured.durationMs.toFixed(1)}ms/${PERF_BUDGET_MS.resultHistoryEmpty}ms, empty result models: practice=${emptyPractice.resultComparison === null}, game=${emptyGame.comparison === null}.`,
    ),
  ];
}

export function runPerfBudgetDiagnostics(): DiagnosticReport {
  const checks = [
    ...runStatsHistoryScopePerfChecks(),
    ...runRecordsPerfChecks(),
    ...runResultHistoryPerfChecks(),
  ];

  return {
    checks,
    failed: checks.filter(item => !item.passed).length,
    passed: checks.filter(item => item.passed).length,
  };
}

function formatReport(report: DiagnosticReport): string {
  const lines = [
    '=== Perf budget diagnostics ===',
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
  const report = runPerfBudgetDiagnostics();
  process.stdout.write(`${formatReport(report)}\n`);

  if (report.failed > 0) {
    process.exitCode = 1;
  }
}

main();
