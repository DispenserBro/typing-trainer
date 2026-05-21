import fs from 'fs';
import path from 'path';
import type {
  AddonManifest,
  InstalledAddon,
  LayoutsData,
  PracticeAdaptationFocus,
  PracticeAdaptationStrength,
  PracticeContentMode,
  PracticeContentPack,
  PracticeContentScenarioId,
  PracticeTrainingMode,
} from '../shared/types';
import { getPracticeContentScenario } from '../core/engine';
import { mergeAddonPracticePacks } from '../core/addons/addonMerger';
import {
  buildPracticeDiagnosticsBundle,
  formatPracticeDiagnosticsReport,
  formatPracticeDiagnosticsBundle,
  runPracticeDiagnostics,
  type PracticeDiagnosticsScenario,
} from './practiceDiagnostics';

type CliOptions = {
  layout?: string;
  runs: number;
  unlockCount?: number;
  trainingMode?: PracticeTrainingMode;
  contentMode?: PracticeContentMode;
  contentScenarioId?: PracticeContentScenarioId;
  contentPackId?: string;
  smartAdaptationEnabled: boolean;
  smartAdaptationStrength: PracticeAdaptationStrength;
  smartAdaptationFocus: PracticeAdaptationFocus;
  focusedPipeline: boolean;
  jsonPath?: string;
};

function readJson<T>(relativePath: string): T {
  const absolutePath = path.resolve(process.cwd(), relativePath);
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8')) as T;
}

function readSdkExampleJson<T>(relativePath: string): T {
  const appRoot = path.resolve(__dirname, '../..');
  const absolutePath = path.resolve(appRoot, '..', 'SDK', 'examples', relativePath);
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8')) as T;
}

function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    runs: 250,
    smartAdaptationEnabled: true,
    smartAdaptationStrength: 'medium',
    smartAdaptationFocus: 'balanced',
    focusedPipeline: false,
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
    } else if (arg === '--content-mode' && next && ['adaptive-words', 'syllables', 'pseudo-words', 'sentences', 'custom'].includes(next)) {
      options.contentMode = next as PracticeContentMode;
      index += 1;
    } else if (arg === '--scenario' && next && ['practice-normal', 'practice-rhythm', 'sprint', 'survival', 'flawless'].includes(next)) {
      options.contentScenarioId = next as PracticeContentScenarioId;
      index += 1;
    } else if (arg === '--pack' && next) {
      options.contentPackId = next;
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
    } else if (arg === '--focused-pipeline') {
      options.focusedPipeline = true;
    } else if (arg === '--json' && next) {
      options.jsonPath = next;
      index += 1;
    }
  }

  if (options.contentScenarioId && !options.trainingMode) {
    options.trainingMode = getPracticeContentScenario(options.contentScenarioId).trainingMode;
  }

  return options;
}

function createFocusedCustomPack(language: string): PracticeContentPack {
  return {
    id: `diagnostic-custom-${language}`,
    name: `Diagnostic custom ${language}`,
    description: 'Synthetic custom pack used by focused content-pipeline diagnostics.',
    kind: 'mixed',
    language,
    origin: 'custom',
    sourceLabel: 'Focused diagnostics',
    items: [
      'stable content pipeline',
      'custom material fallback',
      'preview key refresh',
      'Mode selection keeps text generation predictable.',
      'Shared helpers protect every practice scenario.',
      'Diagnostics should catch drift before users do.',
    ],
  };
}

function createFocusedAddon(
  manifest: AddonManifest,
  language: string,
): InstalledAddon {
  const practicePacks = manifest.resources?.practicePacks?.packs ?? [];

  return {
    id: `${manifest.id}-diagnostic`,
    enabled: true,
    fileName: 'addon-template.json',
    installedAt: '2026-01-01T00:00:00.000Z',
    manifest: {
      ...manifest,
      id: `${manifest.id}-diagnostic`,
      resources: {
        ...manifest.resources,
        practicePacks: {
          packs: practicePacks.map((pack) => ({
            ...pack,
            id: `${pack.id}-diagnostic`,
            language,
          })),
        },
      },
    },
  };
}

function buildFocusedPracticeContentPacks(
  basePracticeContentPacks: PracticeContentPack[],
  language: string,
): PracticeContentPack[] {
  const customPack = createFocusedCustomPack(language);
  const addonManifest = readSdkExampleJson<AddonManifest>('addon-template.json');
  const focusedAddon = createFocusedAddon(addonManifest, language);

  return mergeAddonPracticePacks([...basePracticeContentPacks, customPack], [focusedAddon]);
}

function findPackByOrigin(
  packs: PracticeContentPack[],
  language: string,
  origin: PracticeContentPack['origin'],
): PracticeContentPack {
  const pack = packs.find(candidate =>
    candidate.origin === origin && (candidate.language === 'any' || candidate.language === language),
  );
  if (!pack) {
    throw new Error(`No ${origin} content pack is available for language '${language}'.`);
  }
  return pack;
}

function buildFocusedContentPipelineScenarios(
  layouts: LayoutsData,
  practiceContentPacks: PracticeContentPack[],
  options: CliOptions,
): PracticeDiagnosticsScenario[] {
  const layoutId = options.layout ?? 'qwerty';
  const languageId = layouts.layouts[layoutId]?.lang;
  if (!languageId) {
    throw new Error(`Unknown layout: ${layoutId}`);
  }

  const scenarioIds: PracticeContentScenarioId[] = options.contentScenarioId
    ? [options.contentScenarioId]
    : ['practice-normal', 'practice-rhythm', 'sprint', 'survival', 'flawless'];
  const materialPacks = [
    findPackByOrigin(practiceContentPacks, languageId, 'built-in'),
    findPackByOrigin(practiceContentPacks, languageId, 'custom'),
    findPackByOrigin(practiceContentPacks, languageId, 'addon'),
  ];

  return scenarioIds.flatMap((contentScenarioId) => {
    const scenario = getPracticeContentScenario(contentScenarioId);

    return materialPacks.map((pack) => ({
      label: `${layoutId} / ${contentScenarioId} / ${pack.origin} pack / ${pack.id}`,
      layoutId,
      runs: options.runs,
      unlockCount: options.unlockCount,
      trainingMode: scenario.trainingMode,
      contentMode: 'custom' as const,
      contentScenarioId,
      contentPackId: pack.id,
      smartAdaptationEnabled: options.smartAdaptationEnabled,
      smartAdaptationStrength: options.smartAdaptationStrength,
      smartAdaptationFocus: options.smartAdaptationFocus,
    }));
  });
}

function buildScenarios(
  layouts: LayoutsData,
  practiceContentPacks: PracticeContentPack[],
  options: CliOptions,
): PracticeDiagnosticsScenario[] {
  const layoutIds = options.layout
    ? [options.layout]
    : ['qwerty', 'йцукен'].filter((layoutId) => Boolean(layouts.layouts[layoutId]));
  const trainingModes = options.trainingMode ? [options.trainingMode] : ['normal', 'rhythm'] as PracticeTrainingMode[];

  const scenarios: PracticeDiagnosticsScenario[] = [];
  for (const layoutId of layoutIds) {
    const languageId = layouts.layouts[layoutId]?.lang;
    const defaultPack = practiceContentPacks.find((pack) => pack.language === 'any' || pack.language === languageId) ?? null;
    const contentModes = options.contentMode
      ? [options.contentMode]
      : ([
        'adaptive-words',
        'syllables',
        'pseudo-words',
        'sentences',
        ...(defaultPack ? ['custom'] : []),
      ] as PracticeContentMode[]);

    for (const trainingMode of trainingModes) {
      for (const contentMode of contentModes) {
        const scenarioIds: PracticeContentScenarioId[] = options.contentScenarioId
          ? [options.contentScenarioId]
          : trainingMode === 'rhythm'
            ? ['practice-rhythm']
            : ['practice-normal', 'sprint', 'survival', 'flawless'];

        for (const contentScenarioId of scenarioIds) {
          const contentPackId = contentMode === 'custom'
            ? (options.contentPackId ?? defaultPack?.id ?? '')
            : '';
          const packSuffix = contentMode === 'custom' && contentPackId
            ? ` / ${contentPackId}`
            : '';
          const scenario = getPracticeContentScenario(contentScenarioId);

          scenarios.push({
            label: `${layoutId} / ${contentScenarioId} / ${contentMode}${packSuffix}`,
            layoutId,
            runs: options.runs,
            unlockCount: options.unlockCount,
            trainingMode: scenario.trainingMode,
            contentMode,
            contentScenarioId,
            contentPackId,
            smartAdaptationEnabled: options.smartAdaptationEnabled,
            smartAdaptationStrength: options.smartAdaptationStrength,
            smartAdaptationFocus: options.smartAdaptationFocus,
          });
        }
      }
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
  const practiceContentPacks = readJson<PracticeContentPack[]>('data/practice-content-packs.json');
  const diagnosticPracticeContentPacks = options.focusedPipeline
    ? buildFocusedPracticeContentPacks(practiceContentPacks, layouts.layouts[options.layout ?? 'qwerty']?.lang ?? 'en')
    : practiceContentPacks;
  const scenarios = options.focusedPipeline
    ? buildFocusedContentPipelineScenarios(layouts, diagnosticPracticeContentPacks, options)
    : buildScenarios(layouts, diagnosticPracticeContentPacks, options);

  const reports = scenarios.map((scenario) =>
    runPracticeDiagnostics(layouts, wordsByLanguage, diagnosticPracticeContentPacks, scenario),
  );
  const bundle = buildPracticeDiagnosticsBundle(reports);

  reports.forEach((report) => {
    process.stdout.write(`${formatPracticeDiagnosticsReport(report)}\n`);
  });
  process.stdout.write(`${formatPracticeDiagnosticsBundle(bundle)}\n`);

  if (options.jsonPath) {
    writeJsonReport(options.jsonPath, { generatedAt: new Date().toISOString(), ...bundle });
    process.stdout.write(`JSON report saved to ${options.jsonPath}\n`);
  }
}

main();
