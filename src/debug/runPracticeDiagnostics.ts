import fs from 'fs';
import path from 'path';
import type {
  LayoutsData,
  PracticeAdaptationFocus,
  PracticeAdaptationStrength,
  PracticeTrainingMode,
} from '../shared/types';
import {
  formatPracticeDiagnosticsReport,
  runPracticeDiagnostics,
  type PracticeDiagnosticsScenario,
} from './practiceDiagnostics';

type CliOptions = {
  layout?: string;
  runs: number;
  unlockCount?: number;
  trainingMode?: PracticeTrainingMode;
  smartAdaptationEnabled: boolean;
  smartAdaptationStrength: PracticeAdaptationStrength;
  smartAdaptationFocus: PracticeAdaptationFocus;
  jsonPath?: string;
};

function readJson<T>(relativePath: string): T {
  const absolutePath = path.resolve(process.cwd(), relativePath);
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8')) as T;
}

function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    runs: 250,
    smartAdaptationEnabled: true,
    smartAdaptationStrength: 'medium',
    smartAdaptationFocus: 'balanced',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--layout' && next) {
      options.layout = next;
      index += 1;
    } else if (arg === '--runs' && next) {
      options.runs = Math.max(1, parseInt(next, 10) || options.runs);
      index += 1;
    } else if (arg === '--unlock' && next) {
      options.unlockCount = Math.max(1, parseInt(next, 10) || 0);
      index += 1;
    } else if (arg === '--mode' && next && (next === 'normal' || next === 'rhythm')) {
      options.trainingMode = next;
      index += 1;
    } else if (arg === '--adaptation' && next && (next === 'on' || next === 'off')) {
      options.smartAdaptationEnabled = next === 'on';
      index += 1;
    } else if (arg === '--strength' && next && (next === 'low' || next === 'medium' || next === 'high')) {
      options.smartAdaptationStrength = next;
      index += 1;
    } else if (arg === '--focus' && next && (next === 'balanced' || next === 'chars' || next === 'bigrams' || next === 'rhythm')) {
      options.smartAdaptationFocus = next;
      index += 1;
    } else if (arg === '--json' && next) {
      options.jsonPath = next;
      index += 1;
    }
  }

  return options;
}

function buildScenarios(layouts: LayoutsData, options: CliOptions): PracticeDiagnosticsScenario[] {
  const layoutIds = options.layout
    ? [options.layout]
    : ['qwerty', 'йцукен'].filter((layoutId) => Boolean(layouts.layouts[layoutId]));
  const trainingModes = options.trainingMode ? [options.trainingMode] : ['normal', 'rhythm'] as PracticeTrainingMode[];

  const scenarios: PracticeDiagnosticsScenario[] = [];
  for (const layoutId of layoutIds) {
    for (const trainingMode of trainingModes) {
      scenarios.push({
        label: `${layoutId} / ${trainingMode}`,
        layoutId,
        runs: options.runs,
        unlockCount: options.unlockCount,
        trainingMode,
        smartAdaptationEnabled: options.smartAdaptationEnabled,
        smartAdaptationStrength: options.smartAdaptationStrength,
        smartAdaptationFocus: options.smartAdaptationFocus,
      });
    }
  }
  return scenarios;
}

function writeJsonReport(jsonPath: string, payload: unknown) {
  const absolutePath = path.resolve(process.cwd(), jsonPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, JSON.stringify(payload, null, 2), 'utf8');
}

function main() {
  const options = parseCliArgs(process.argv.slice(2));
  const layouts = readJson<LayoutsData>('data/layouts.json');
  const wordsByLanguage: Record<string, string[]> = {
    en: readJson<string[]>('data/words_en.json'),
    ru: readJson<string[]>('data/words_ru.json'),
  };

  const reports = buildScenarios(layouts, options).map((scenario) =>
    runPracticeDiagnostics(layouts, wordsByLanguage, scenario),
  );

  reports.forEach((report) => {
    process.stdout.write(`${formatPracticeDiagnosticsReport(report)}\n`);
  });

  if (options.jsonPath) {
    writeJsonReport(options.jsonPath, { generatedAt: new Date().toISOString(), reports });
    process.stdout.write(`JSON report saved to ${options.jsonPath}\n`);
  }
}

main();
