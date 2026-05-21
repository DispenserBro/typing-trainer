import fs from 'node:fs';
import path from 'node:path';
import {
  getBuiltInInterfaceLocales,
  getI18nLocaleMergeDiagnostics,
} from '../core/i18n';
import {
  mergeInterfaceLocaleDefinitions,
  normalizeExternalInterfaceLocaleDefinitions,
} from '../core/i18n/resources';
import {
  attachI18nMergeDiagnostics,
  formatI18nDiagnosticsReport,
  runI18nDiagnostics,
} from '../core/i18n/diagnostics';
import type { AddonInterfaceLocaleDefinition, AddonManifest, ModManifest } from '../shared/types';

function parseReferenceLocale(argv: string[]) {
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--reference' && argv[index + 1]) {
      return argv[index + 1]!;
    }
  }
  return 'ru';
}

function readJsonFile<T>(filePath: string): T | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function getExternalFixtureLocales() {
  const root = path.resolve(__dirname, '../..');
  const examplesRoot = path.resolve(root, '..', 'SDK', 'examples');
  const locales = [];

  const addonTemplate = readJsonFile<AddonManifest>(path.join(examplesRoot, 'addon-template.json'));
  if (addonTemplate?.resources?.interfaceLocales?.locales) {
    locales.push(...normalizeExternalInterfaceLocaleDefinitions(
      addonTemplate.resources.interfaceLocales.locales.map((locale) => ({
        ...locale,
        sourceName: addonTemplate.name,
      })),
      'addon',
    ));
  }

  const modExample = readJsonFile<ModManifest>(path.join(examplesRoot, 'hardcore-mode-example/manifest.json'));
  const modExampleLocaleFile = readJsonFile<{ locales?: AddonInterfaceLocaleDefinition[] }>(
    path.join(examplesRoot, 'hardcore-mode-example/locales/de.json'),
  );
  if (modExample && modExampleLocaleFile?.locales) {
    locales.push(...normalizeExternalInterfaceLocaleDefinitions(
      modExampleLocaleFile.locales.map((locale) => ({
        ...locale,
        sourceName: modExample.name,
      })),
      'mod',
    ));
  }

  return locales;
}

function main() {
  const referenceLocaleId = parseReferenceLocale(process.argv.slice(2));
  const mergedLocales = mergeInterfaceLocaleDefinitions(
    getBuiltInInterfaceLocales(),
    getExternalFixtureLocales(),
  );
  const report = attachI18nMergeDiagnostics(
    runI18nDiagnostics(mergedLocales, referenceLocaleId),
    getI18nLocaleMergeDiagnostics(),
  );
  process.stdout.write(formatI18nDiagnosticsReport(report));
}

main();
