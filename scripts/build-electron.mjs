import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { applyElectronBuilderPatch } from './patch-electron-builder.mjs';
import { syncSdkExamplesToBundledExtensionSources } from './sync-sdk-examples.mjs';

const PLATFORM_FLAGS = new Set(['win', 'linux', 'mac']);

const REQUIRED_PACKAGING_FILES = [
  'package.json',
  'scripts/electron-builder-before-build.cjs',
  'build/installer.nsh',
  'data/app-icon.ico',
  'data/app-icon.png',
  'data/layouts.json',
  'data/words_en.json',
  'data/words_ru.json',
  'data/practice-content-packs.json',
  'data/local-extension-sources/tech-english-source/manifest.json',
  'data/local-extension-sources/tech-english-source/addons.json',
  'data/local-extension-sources/tech-english-source/themes.json',
  'data/local-extension-sources/hardcore-mode-source/manifest.json',
  'data/local-extension-sources/hardcore-mode-source/mods.json',
];

const REQUIRED_INSTALLER_SNIPPETS = [
  '!macro customUnWelcomePage',
  'UninstallDeleteUserData',
  '--delete-app-data',
  'Rename "$INSTDIR\\data" "$PLUGINSDIR\\typing-trainer-user-data\\data"',
  'Rename "$PLUGINSDIR\\typing-trainer-user-data\\data" "$INSTDIR\\data"',
];

const REQUIRED_RELEASE_WORKFLOW_SNIPPETS = [
  'platform-smoke:',
  'Platform smoke (${{ matrix.target }})',
  'os: windows-latest',
  'target: win',
  'os: ubuntu-latest',
  'target: linux',
  'os: macos-latest',
  'target: mac',
  'npm run build',
  'npm run diagnostics:platform-smoke',
  'xvfb-run -a npm run diagnostics:platform-smoke',
  'npm run build:electron -- --dry-run --${{ matrix.target }}',
  'release-hardening:',
  'npm run diagnostics:release-hardening',
  'diagnostics:content-pipeline',
  'diagnostics:platform-smoke',
  'diagnostics:release-coverage',
  'TYPING_TRAINER_SDK_DIR: SDK',
  'Verify Windows signatures',
  'Get-AuthenticodeSignature',
  'publish-release:',
  'Verify complete release artifacts',
  'if-no-files-found: error',
  'fail_on_unmatched_files: true',
  'npm run build:electron -- --${{ matrix.target }}',
  'dist-build/**/Typing-Trainer-*.exe',
  'dist-build/**/*.AppImage',
  'dist-build/**/*.deb',
  'dist-build/**/*.rpm',
  'dist-build/**/*.dmg',
  'dist-build/**/*.zip',
  'dist-build/**/latest*.yml',
  'dist-build/**/*.blockmap',
];

const USER_DATA_PRESERVATION_CONTRACT = {
  deleteFlagDefault: 'StrCpy $UninstallDeleteUserData "0"',
  deleteFlagOption: '${GetOptions} $R0 "--delete-app-data" $R1',
  deleteBranch: '${If} $UninstallDeleteUserData == "1"',
  preserveBranch: '${Else}',
  moveDataAside: 'Rename "$INSTDIR\\data" "$PLUGINSDIR\\typing-trainer-user-data\\data"',
  removeInstallDir: 'RMDir /r "$INSTDIR"',
  restoreInstallDir: 'CreateDirectory "$INSTDIR"',
  restoreData: 'Rename "$PLUGINSDIR\\typing-trainer-user-data\\data" "$INSTDIR\\data"',
  checkboxRead: '${NSD_GetState} $UninstallDeleteUserDataCheckbox $0',
};

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

function readJsonFile(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function hasBuildTarget(targetConfig, expectedTarget) {
  if (typeof targetConfig === 'string') return targetConfig === expectedTarget;
  if (!Array.isArray(targetConfig)) return false;
  return targetConfig.some((item) => {
    if (typeof item === 'string') return item === expectedTarget;
    return item && typeof item === 'object' && item.target === expectedTarget;
  });
}

function buildNpmScriptRoutingChecks(scripts) {
  return [
    {
      name: 'npm build:electron routes through packaging wrapper',
      passed: scripts['build:electron'] === 'node scripts/build-electron.mjs',
    },
    {
      name: 'npm platform build scripts route to explicit platform flags',
      passed: scripts['build:win']?.includes('--win')
        && scripts['build:linux']?.includes('--linux')
        && scripts['build:mac']?.includes('--mac'),
    },
    {
      name: 'npm packaging diagnostics routes every platform in dry-run mode',
      passed: scripts['diagnostics:packaging']?.includes('--dry-run')
        && scripts['diagnostics:packaging']?.includes('--win')
        && scripts['diagnostics:packaging']?.includes('--linux')
        && scripts['diagnostics:packaging']?.includes('--mac'),
    },
  ];
}

function appearsInOrder(text, snippets) {
  let cursor = -1;

  return snippets.every((snippet) => {
    const index = text.indexOf(snippet, cursor + 1);
    if (index === -1) return false;
    cursor = index;
    return true;
  });
}

function buildUserDataPreservationChecks(installerScript) {
  const contract = USER_DATA_PRESERVATION_CONTRACT;

  return [
    {
      name: 'uninstaller defaults to preserving user data',
      passed: installerScript.includes(contract.deleteFlagDefault)
        && installerScript.includes(contract.deleteFlagOption)
        && installerScript.includes(contract.checkboxRead),
    },
    {
      name: 'uninstaller delete-data branch removes install directory only after explicit opt-in',
      passed: appearsInOrder(installerScript, [
        contract.deleteBranch,
        contract.removeInstallDir,
        contract.preserveBranch,
      ]),
    },
    {
      name: 'uninstaller preserve-data branch moves data aside before removing app files',
      passed: appearsInOrder(installerScript, [
        contract.preserveBranch,
        contract.moveDataAside,
        contract.removeInstallDir,
      ]),
    },
    {
      name: 'uninstaller preserve-data branch restores user data after app files are removed',
      passed: appearsInOrder(installerScript, [
        contract.moveDataAside,
        contract.removeInstallDir,
        contract.restoreInstallDir,
        contract.restoreData,
      ]),
    },
  ];
}

function assertPackagingReadiness(targets, electronBuilderCli) {
  syncSdkExamplesToBundledExtensionSources();

  const packageJson = readJsonFile('package.json');
  const buildConfig = packageJson.build ?? {};
  const files = Array.isArray(buildConfig.files) ? buildConfig.files : [];
  const scripts = packageJson.scripts ?? {};
  const installerScript = readFileSync('build/installer.nsh', 'utf8');
  const releaseWorkflow = readFileSync('.github/workflows/build.yml', 'utf8');
  const iconPng = readFileSync('data/app-icon.png');
  const iconIsPng = iconPng.length >= 24
    && iconPng.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const checks = [
    {
      name: 'app PNG icon is square and at least 512x512 for macOS packaging',
      passed: iconIsPng && iconPng.readUInt32BE(16) >= 512
        && iconPng.readUInt32BE(16) === iconPng.readUInt32BE(20),
    },
    ...REQUIRED_PACKAGING_FILES.map(filePath => ({
      name: `required file: ${filePath}`,
      passed: existsSync(filePath),
    })),
    {
      name: `electron-builder CLI: ${electronBuilderCli}`,
      passed: existsSync(electronBuilderCli),
    },
    {
      name: 'electron-builder includes built app and bundled data',
      passed: ['dist/core/**', 'dist/main/**', 'dist/renderer/**', 'dist/shared/**', 'data/**']
        .every(pattern => files.includes(pattern)),
    },
    {
      name: 'electron-builder app icon and beforeBuild hook are configured',
      passed: buildConfig.icon === 'data/app-icon.png'
        && buildConfig.artifactName === 'Typing-Trainer-${version}-${os}-${arch}.${ext}'
        && buildConfig.beforeBuild === './scripts/electron-builder-before-build.cjs',
    },
    {
      name: 'electron-builder GitHub auto-update provider is configured',
      passed: Array.isArray(buildConfig.publish)
        && buildConfig.publish.some(publishConfig => publishConfig?.provider === 'github'
          && publishConfig.owner === 'DispenserBro'
          && publishConfig.repo === 'typing-trainer'),
    },
    {
      name: 'NSIS include is configured',
      passed: buildConfig.nsis?.include === 'build/installer.nsh',
    },
    {
      name: 'Windows packaging target is configured',
      passed: buildConfig.win?.target === 'nsis'
        && buildConfig.win?.icon === 'data/app-icon.ico',
    },
    {
      name: 'Linux packaging targets are configured',
      passed: ['AppImage', 'deb', 'rpm'].every(target => hasBuildTarget(buildConfig.linux?.target, target))
        && buildConfig.linux?.icon === 'data/app-icon.png'
        && buildConfig.linux?.category === 'Education',
    },
    {
      name: 'macOS packaging targets are configured for release publishing',
      passed: ['dmg', 'zip'].every(target => hasBuildTarget(buildConfig.mac?.target, target))
        && buildConfig.mac?.identity === null
        && buildConfig.mac?.icon === 'data/app-icon.png'
        && buildConfig.mac?.category === 'public.app-category.education',
    },
    {
      name: 'platform build scripts exist',
      passed: ['build:win', 'build:linux', 'build:mac']
        .every(scriptName => typeof scripts[scriptName] === 'string'),
    },
    ...buildNpmScriptRoutingChecks(scripts),
    ...REQUIRED_INSTALLER_SNIPPETS.map(snippet => ({
      name: `installer contract: ${snippet}`,
      passed: installerScript.includes(snippet),
    })),
    {
      name: 'standard NSIS wizard uses system colors and app onboarding',
      passed: buildConfig.nsis?.oneClick === false
        && buildConfig.nsis?.allowToChangeInstallationDirectory === true
        && !/SetCtlColors|MUI_BGCOLOR|MUI_TEXTCOLOR|InstallerTheme|SetupTheme|customWelcomePage|customInstall|setup-preferences\.json/.test(installerScript),
    },
    {
      name: 'first launch keeps onboarding inside the app',
      passed: readFileSync('src/renderer/App.tsx', 'utf8').includes('!settings.onboardingCompleted')
        && readFileSync('src/renderer/contexts/appDefaults.ts', 'utf8').includes('onboardingCompleted: s?.onboardingCompleted ?? false'),
    },
    ...buildUserDataPreservationChecks(installerScript),
    ...REQUIRED_RELEASE_WORKFLOW_SNIPPETS.map(snippet => ({
      name: `release workflow contract: ${snippet}`,
      passed: releaseWorkflow.includes(snippet),
    })),
  ];

  const failed = checks.filter(check => !check.passed);
  console.log(`[build:electron] packaging readiness: ${checks.length - failed.length}/${checks.length} checks passed`);
  checks.forEach((check) => {
    console.log(`[build:electron] ${check.passed ? 'OK' : 'FAIL'} ${check.name}`);
  });

  if (failed.length > 0) {
    throw new Error(`Packaging readiness failed for ${targets.join(', ')}: ${failed.map(check => check.name).join('; ')}`);
  }
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
assertPackagingReadiness(targets, electronBuilderCli);

if (dryRun) {
  console.log(`[build:electron] dry run: ${process.execPath} ${npmCli} run build`);
  console.log(`[build:electron] dry run: ${process.execPath} ${electronBuilderArgs.join(' ')}`);
  process.exit(0);
}

await runCommand(process.execPath, [npmCli, 'run', 'build']);
applyElectronBuilderPatch();
await runCommand(process.execPath, electronBuilderArgs);
