import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { applyElectronBuilderPatch } from './patch-electron-builder.mjs';

const PLATFORM_FLAGS = new Set(['win', 'linux', 'mac']);

function getTimestamp() {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ];
  return `${parts[0]}${parts[1]}${parts[2]}-${parts[3]}${parts[4]}${parts[5]}`;
}

function getHostPlatformTarget() {
  if (process.platform === 'win32') return 'win';
  if (process.platform === 'darwin') return 'mac';
  return 'linux';
}

function parseArgs(argv) {
  const targets = [];
  let dryRun = false;

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (arg.startsWith('--platform=')) {
      const platform = arg.slice('--platform='.length);
      if (!PLATFORM_FLAGS.has(platform)) {
        throw new Error(`Unsupported platform "${platform}". Use win, linux, or mac.`);
      }
      targets.push(platform);
      continue;
    }

    if (arg.startsWith('--')) {
      const platform = arg.slice(2);
      if (PLATFORM_FLAGS.has(platform)) {
        targets.push(platform);
        continue;
      }
    }

    throw new Error(`Unknown build argument "${arg}".`);
  }

  return {
    dryRun,
    targets: targets.length > 0 ? [...new Set(targets)] : [getHostPlatformTarget()],
  };
}

async function runCommand(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
    });

    child.on('error', reject);

    child.on('close', (code) => {
      if (code && code !== 0) {
        process.exit(code);
      }

      resolve();
    });
  });
}

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

const { dryRun, targets } = parseArgs(process.argv.slice(2));
const outputDir = path.join('dist-build', `${targets.join('-')}-${getTimestamp()}`);
const npmCli = resolveNpmCli();
const electronBuilderCli = path.join('node_modules', 'electron-builder', 'cli.js');
const electronBuilderArgs = [
  electronBuilderCli,
  ...targets.map(target => `--${target}`),
  '--publish',
  'never',
  `--config.directories.output=${outputDir}`,
];

mkdirSync('dist-build', { recursive: true });

console.log(`[build:electron] target: ${targets.join(', ')}`);
console.log(`[build:electron] output directory: ${outputDir}`);

if (dryRun) {
  console.log(`[build:electron] dry run: ${process.execPath} ${npmCli} run build`);
  console.log(`[build:electron] dry run: ${process.execPath} ${electronBuilderArgs.join(' ')}`);
  process.exit(0);
}

await runCommand(process.execPath, [npmCli, 'run', 'build']);
applyElectronBuilderPatch();
await runCommand(process.execPath, electronBuilderArgs);
