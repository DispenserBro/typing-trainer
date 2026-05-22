import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_ROOT = process.cwd();
const SDK_ROOT = path.resolve(process.env.TYPING_TRAINER_SDK_DIR ?? path.join('..', 'SDK'));
const TARGET_ROOT = path.join(APP_ROOT, 'data', 'local-extension-sources');

const TECH_SOURCE_ID = 'local-tech-english-source';
const HARDCORE_SOURCE_ID = 'local-hardcore-mode-source';

export function syncSdkExamplesToBundledExtensionSources() {
  const examplesRoot = path.join(SDK_ROOT, 'examples');
  const addonTemplatePath = path.join(examplesRoot, 'addon-template.json');
  const hardcoreRoot = path.join(examplesRoot, 'hardcore-mode-example');
  const hardcoreManifestPath = path.join(hardcoreRoot, 'manifest.json');
  const hardcoreEntryPath = path.join(hardcoreRoot, 'index.js');

  assertRequiredSdkExample(addonTemplatePath);
  assertRequiredSdkExample(hardcoreManifestPath);
  assertRequiredSdkExample(hardcoreEntryPath);

  const addonManifest = readJson(addonTemplatePath);
  const hardcoreManifest = readJson(hardcoreManifestPath);

  rmSync(TARGET_ROOT, { recursive: true, force: true });

  writeJson(path.join(TARGET_ROOT, 'tech-english-source', 'manifest.json'), {
    manifestVersion: 1,
    id: TECH_SOURCE_ID,
    name: 'Local Tech English Source',
    version: '1.0.0',
    type: 'extension-source',
    description: 'Локальный источник с примером контентного аддона.',
    lists: {
      addons: 'addons.json',
      themes: 'themes.json',
    },
  });
  writeJson(path.join(TARGET_ROOT, 'tech-english-source', 'addons.json'), [addonManifest.id]);
  writeJson(path.join(TARGET_ROOT, 'tech-english-source', 'themes.json'), []);
  writeJson(path.join(TARGET_ROOT, 'tech-english-source', addonManifest.id, 'manifest.json'), addonManifest);

  writeJson(path.join(TARGET_ROOT, 'hardcore-mode-source', 'manifest.json'), {
    manifestVersion: 1,
    id: HARDCORE_SOURCE_ID,
    name: 'Local Hardcore Mode Source',
    icon: 'shield',
    version: '1.0.0',
    type: 'extension-source',
    description: 'Локальный источник с примером мода.',
    lists: {
      mods: 'mods.json',
    },
  });
  writeJson(path.join(TARGET_ROOT, 'hardcore-mode-source', 'mods.json'), [hardcoreManifest.id]);
  writeJson(path.join(TARGET_ROOT, 'hardcore-mode-source', hardcoreManifest.id, 'manifest.json'), hardcoreManifest);
  copyTextFile(
    hardcoreEntryPath,
    path.join(TARGET_ROOT, 'hardcore-mode-source', hardcoreManifest.id, 'index.js'),
  );

  const localesRoot = path.join(hardcoreRoot, 'locales');
  if (existsSync(localesRoot)) {
    cpSync(localesRoot, path.join(TARGET_ROOT, 'hardcore-mode-source', hardcoreManifest.id, 'locales'), {
      recursive: true,
    });
  }

  console.log(`[sync-sdk-examples] bundled extension sources synced from ${examplesRoot}`);
}

function assertRequiredSdkExample(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`SDK example file is required for bundled extension sources: ${filePath}`);
  }
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  writeTextFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function copyTextFile(sourcePath, targetPath) {
  writeTextFile(targetPath, readFileSync(sourcePath, 'utf8'));
}

function writeTextFile(filePath, content) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  syncSdkExamplesToBundledExtensionSources();
}
