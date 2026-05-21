import fs from 'node:fs';
import path from 'node:path';

type Check = {
  details: string;
  name: string;
  passed: boolean;
};

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

function includesAll(text: string, snippets: string[]): boolean {
  return snippets.every(snippet => text.includes(snippet));
}

function makeCheck(name: string, details: string, passed: boolean): Check {
  return { details, name, passed };
}

function buildChecks(): Check[] {
  const practicePage = readProjectFile('src/renderer/pages/PracticePage.tsx');
  const testPage = readProjectFile('src/renderer/pages/TestPage.tsx');
  const lessonsPage = readProjectFile('src/renderer/pages/LessonsPage.tsx');
  const progressMigrations = readProjectFile('src/core/progress/migrations.ts');
  const coreDiagnostics = readProjectFile('src/debug/runCoreDiagnostics.ts');
  const releaseHardening = readProjectFile('scripts/release-hardening.mjs');
  const releaseWorkflow = readProjectFile('.github/workflows/build.yml');
  const enLocale = readProjectFile('src/core/i18n/locales/en.po');
  const ruLocale = readProjectFile('src/core/i18n/locales/ru.po');

  const rewardKeys = [
    'game.core.rewards.simple.title',
    'game.core.rewards.durable.title',
    'game.core.rewards.durable.watchDurability',
    'game.core.rewards.letter.title',
    'game.core.rewards.letter.flavor',
    'game.core.rewards.letter.description',
    'game.core.rewards.buffSpeed.title',
    'game.core.rewards.buffSpeed.flavor',
    'game.core.rewards.buffSpeed.description',
    'game.core.rewards.buffSpeed.modifierTitle',
    'game.core.rewards.buffSpeed.modifierDescription',
    'game.core.rewards.buffDefense.title',
    'game.core.rewards.buffDefense.flavor',
    'game.core.rewards.buffDefense.description',
    'game.core.rewards.buffDefense.modifierTitle',
    'game.core.rewards.buffDefense.modifierDescription',
    'game.core.rewards.extraLife.title',
    'game.core.rewards.extraLife.flavor',
    'game.core.rewards.extraLife.description',
    'game.core.rewards.curseSpeed.title',
    'game.core.rewards.curseSpeed.flavor',
    'game.core.rewards.curseSpeed.description',
    'game.core.rewards.curseSpeed.modifierTitle',
    'game.core.rewards.curseSpeed.modifierDescription',
    'game.core.rewards.curseDefense.title',
    'game.core.rewards.curseDefense.flavor',
    'game.core.rewards.curseDefense.description',
    'game.core.rewards.curseDefense.modifierTitle',
    'game.core.rewards.curseDefense.modifierDescription',
  ];

  return [
    makeCheck(
      'renderer-flow first printable key coverage',
      'Practice, Sprint and Lessons forward the starter KeyboardEvent into handleKey after session start.',
      includesAll(practicePage, ['startPractice = useCallback((initialEvent?: KeyboardEvent)', 'handleKey(initialEvent)'])
        && includesAll(testPage, ['startSprint = useCallback((initialEvent?: KeyboardEvent)', 'handleKey(initialEvent)'])
        && includesAll(lessonsPage, ['startExercise = useCallback((initialEvent?: KeyboardEvent)', 'handleKey(initialEvent)']),
    ),
    makeCheck(
      'progress migration coverage',
      'Progress has schema stamping, save normalization and core diagnostics coverage.',
      includesAll(progressMigrations, [
        'CURRENT_PROGRESS_SCHEMA_VERSION',
        'migrateProgressData',
        'normalizeProgressForSave',
      ]) && includesAll(coreDiagnostics, [
        'progress migration stamps legacy saves',
        'progress migration gate rejects unsupported future schema',
        'progress save normalization keeps current schema and app version',
      ]),
    ),
    makeCheck(
      'release hardening command coverage',
      'Release-hardening runs build, content pipeline, platform smoke, packaging and SDK pack gates.',
      includesAll(releaseHardening, [
        "command: 'diagnostics:content-pipeline'",
        "command: 'diagnostics:platform-smoke'",
        "command: 'diagnostics:packaging'",
        "command: 'sdk:pack'",
      ]),
    ),
    makeCheck(
      'GitHub Actions platform smoke coverage',
      'Windows, Linux and macOS jobs build the app, launch it, and verify writable user data before packaging dry-run.',
      includesAll(releaseWorkflow, [
        'Platform smoke (${{ matrix.target }})',
        'npm run build',
        'npm run diagnostics:platform-smoke',
        'xvfb-run -a npm run diagnostics:platform-smoke',
        'npm run build:electron -- --dry-run --${{ matrix.target }}',
      ]),
    ),
    makeCheck(
      'GitHub Actions Windows signing coverage',
      'Tag releases require Windows signing secrets and verify Authenticode signatures.',
      includesAll(releaseWorkflow, [
        'Require Windows signing material',
        'WINDOWS_CSC_LINK and WINDOWS_CSC_KEY_PASSWORD secrets are required',
        'Verify Windows signatures',
        'Get-AuthenticodeSignature',
      ]),
    ),
    makeCheck(
      'boss reward i18n coverage',
      'All game.core.rewards keys used by runUtils are present in both built-in release locales.',
      rewardKeys.every(key => enLocale.includes(`msgid "${key}"`) && ruLocale.includes(`msgid "${key}"`)),
    ),
  ];
}

function main() {
  const checks = buildChecks();
  const failed = checks.filter(check => !check.passed);

  console.log('=== Release coverage diagnostics ===');
  console.log(`Passed: ${checks.length - failed.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log('');

  for (const check of checks) {
    console.log(`${check.passed ? 'OK' : 'FAIL'} ${check.name}`);
    console.log(`- ${check.details}`);
  }

  if (failed.length > 0) {
    process.exit(1);
  }
}

main();
