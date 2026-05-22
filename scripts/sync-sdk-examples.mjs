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
const FALLBACK_ADDON_MANIFEST = {
  manifestVersion: 1,
  id: 'tech-english-pack',
  name: 'Технический английский',
  version: '1.0.0',
  description: 'Стартовый словарь IT-терминов и короткие фразы для тренировки английской раскладки.',
  author: 'Typing Trainer',
  minAppVersion: '2.3.0',
  type: 'content',
  resources: {
    words: [
      {
        lang: 'en',
        words: [
          'function',
          'variable',
          'constant',
          'callback',
          'promise',
          'async',
          'await',
          'interface',
          'runtime',
          'pipeline',
        ],
      },
    ],
    practicePacks: {
      packs: [
        {
          id: 'tech-en-snippets',
          name: 'Технические сниппеты',
          description: 'Короткие тематические фразы для практики программирования.',
          language: 'en',
          kind: 'mixed',
          items: [
            'clean architecture',
            'typed event flow',
            'stable render loop',
          ],
        },
      ],
    },
  },
};
const FALLBACK_HARDCORE_MANIFEST = {
  manifestVersion: 1,
  id: 'hardcore-mode',
  name: 'Hardcore Mode',
  version: '1.0.0',
  description: 'Стартовый пример мода: одна жизнь и логирование завершения сессии.',
  author: 'Typing Trainer',
  minAppVersion: '2.3.0',
  type: 'mod',
  entry: 'index.js',
  permissions: ['rules', 'events', 'i18n'],
};
const FALLBACK_HARDCORE_ENTRY = `module.exports = function (api) {
  api.log.info('Hardcore Mode loaded');
  api.rules.set('game.baseLives', 1);
  api.events.on('sessionFinish', function (data) {
    api.log.info('Session finished: ' + data.entry.wpm + ' WPM, ' + data.entry.acc + '% accuracy');
  });
};
`;
const FALLBACK_HARDCORE_LOCALES = {
  de: {
    id: 'de',
    label: 'German',
    nativeLabel: 'Deutsch',
    dictionary: {
      common: {
        close: 'Schliessen',
      },
    },
  },
};

export function syncSdkExamplesToBundledExtensionSources() {
  const examplesRoot = path.join(SDK_ROOT, 'examples');
  const addonTemplatePath = path.join(examplesRoot, 'addon-template.json');
  const hardcoreRoot = path.join(examplesRoot, 'hardcore-mode-example');
  const hardcoreManifestPath = path.join(hardcoreRoot, 'manifest.json');
  const hardcoreEntryPath = path.join(hardcoreRoot, 'index.js');
  const hasSdkExamples = existsSync(addonTemplatePath)
    && existsSync(hardcoreManifestPath)
    && existsSync(hardcoreEntryPath);

  const addonManifest = hasSdkExamples ? readJson(addonTemplatePath) : FALLBACK_ADDON_MANIFEST;
  const hardcoreManifest = hasSdkExamples ? readJson(hardcoreManifestPath) : FALLBACK_HARDCORE_MANIFEST;
  const hardcoreEntrySource = hasSdkExamples ? readFileSync(hardcoreEntryPath, 'utf8') : FALLBACK_HARDCORE_ENTRY;

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
  writeTextFile(
    path.join(TARGET_ROOT, 'hardcore-mode-source', hardcoreManifest.id, 'index.js'),
    hardcoreEntrySource,
  );

  const localesRoot = path.join(hardcoreRoot, 'locales');
  if (hasSdkExamples && existsSync(localesRoot)) {
    cpSync(localesRoot, path.join(TARGET_ROOT, 'hardcore-mode-source', hardcoreManifest.id, 'locales'), {
      recursive: true,
    });
  } else {
    for (const [localeId, localeDefinition] of Object.entries(FALLBACK_HARDCORE_LOCALES)) {
      writeJson(
        path.join(TARGET_ROOT, 'hardcore-mode-source', hardcoreManifest.id, 'locales', `${localeId}.json`),
        localeDefinition,
      );
    }
  }

  console.log(
    hasSdkExamples
      ? `[sync-sdk-examples] bundled extension sources synced from ${examplesRoot}`
      : '[sync-sdk-examples] SDK examples were not found; bundled extension sources synced from app fallbacks',
  );
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  writeTextFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeTextFile(filePath, content) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  syncSdkExamplesToBundledExtensionSources();
}
