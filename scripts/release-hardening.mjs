import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const APP_ROOT = process.cwd();
const SDK_ROOT = path.resolve(process.env.TYPING_TRAINER_SDK_DIR ?? path.join('..', 'SDK'));

const RELEASE_HARDENING_STEPS = [
  {
    args: ['run', 'build'],
    command: 'build',
    cwd: APP_ROOT,
    description: 'Production TypeScript/Webpack build',
    kind: 'npm',
  },
  {
    args: ['run', 'build:debug-tools'],
    command: 'build:debug-tools',
    cwd: APP_ROOT,
    description: 'Debug diagnostics TypeScript build',
    kind: 'npm',
  },
  {
    args: ['dist-debug/debug/runCoreDiagnostics.js'],
    command: 'diagnostics:core',
    cwd: APP_ROOT,
    description: 'Core regression diagnostics',
    kind: 'node',
  },
  {
    args: ['dist-debug/debug/runPracticeDiagnostics.js'],
    command: 'diagnostics:practice',
    cwd: APP_ROOT,
    description: 'Practice modes and result-flow diagnostics',
    kind: 'node',
  },
  {
    args: ['dist-debug/debug/runPracticeDiagnostics.js', '--focused-pipeline'],
    command: 'diagnostics:content-pipeline',
    cwd: APP_ROOT,
    description: 'Focused generated text and content pipeline diagnostics',
    kind: 'node',
  },
  {
    args: ['dist-debug/debug/runGameBalanceDiagnostics.js'],
    command: 'diagnostics:game-balance',
    cwd: APP_ROOT,
    description: 'Game balance and route diagnostics',
    kind: 'node',
  },
  {
    args: ['dist-debug/debug/runHistoryDiagnostics.js'],
    command: 'diagnostics:history',
    cwd: APP_ROOT,
    description: 'History regression diagnostics',
    kind: 'node',
  },
  {
    args: ['dist-debug/debug/runI18nDiagnostics.js'],
    command: 'diagnostics:i18n',
    cwd: APP_ROOT,
    description: 'Built-in locale and translation diagnostics',
    kind: 'node',
  },
  {
    args: ['dist-debug/debug/runExtensionSourceDiagnostics.js'],
    command: 'diagnostics:extensions',
    cwd: APP_ROOT,
    description: 'Extension source and install/remove diagnostics',
    kind: 'node',
  },
  {
    args: ['dist-debug/debug/runPerfBudgetDiagnostics.js'],
    command: 'diagnostics:perf-budget',
    cwd: APP_ROOT,
    description: 'Renderer hotpath and performance budget diagnostics',
    kind: 'node',
  },
  {
    args: ['run', 'diagnostics:platform-smoke'],
    command: 'diagnostics:platform-smoke',
    cwd: APP_ROOT,
    description: 'Electron app startup and writable data path smoke check',
    kind: 'npm',
  },
  {
    args: ['dist-debug/debug/runReleaseCoverageDiagnostics.js'],
    command: 'diagnostics:release-coverage',
    cwd: APP_ROOT,
    description: 'Critical release blocker coverage gate',
    kind: 'node',
  },
  {
    args: ['run', 'diagnostics:packaging'],
    command: 'diagnostics:packaging',
    cwd: APP_ROOT,
    description: 'Windows/Linux/macOS packaging dry-run readiness',
    kind: 'npm',
  },
  {
    args: ['ci'],
    command: 'sdk:npm-ci',
    cwd: SDK_ROOT,
    description: 'SDK dependency lockfile installation',
    kind: 'npm',
    requiresSdk: true,
  },
  {
    args: ['run', 'smoke'],
    command: 'sdk:smoke',
    cwd: SDK_ROOT,
    description: 'SDK autonomous build and import smoke gate',
    kind: 'npm',
    requiresSdk: true,
  },
  {
    args: ['pack', '--dry-run'],
    command: 'sdk:pack',
    cwd: SDK_ROOT,
    description: 'SDK package contents dry-run gate',
    kind: 'npm',
    requiresSdk: true,
  },
];

function resolveNpmCli() {
  const bundledNpmCli = path.join(
    path.dirname(process.execPath),
    'node_modules',
    'npm',
    'bin',
    'npm-cli.js',
  );
  const npmCli = process.env.npm_execpath ?? (existsSync(bundledNpmCli) ? bundledNpmCli : null);

  if (!npmCli) {
    throw new Error('npm_execpath is not set. Run this script through npm.');
  }

  return npmCli;
}

async function runStep(npmCli, step) {
  const executable = step.kind === 'npm' ? process.execPath : process.execPath;
  const args = step.kind === 'npm' ? [npmCli, ...step.args] : step.args;

  if (step.requiresSdk && !existsSync(path.join(step.cwd, 'package.json'))) {
    throw new Error(`SDK gate requires package.json at ${step.cwd}. Set TYPING_TRAINER_SDK_DIR when the SDK checkout is not at ../SDK.`);
  }

  console.log(`[release-hardening] start: ${step.command} (${step.description})`);

  await new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: step.cwd,
      shell: false,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (signal) {
        reject(new Error(`${step.command} terminated by ${signal}`));
        return;
      }

      if (code && code !== 0) {
        reject(new Error(`${step.command} failed with exit code ${code}`));
        return;
      }

      resolve();
    });
  });

  console.log(`[release-hardening] ok: ${step.command}`);
}

async function main() {
  const npmCli = resolveNpmCli();

  console.log('[release-hardening] local release-hardening suite started');
  console.log(`[release-hardening] app root: ${APP_ROOT}`);
  console.log(`[release-hardening] SDK root: ${SDK_ROOT}`);

  for (const step of RELEASE_HARDENING_STEPS) {
    await runStep(npmCli, step);
  }

  console.log('[release-hardening] all local release-hardening checks passed');
}

main().catch((error) => {
  console.error(`[release-hardening] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
