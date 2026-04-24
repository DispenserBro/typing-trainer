import type { InterfaceLocaleDefinition } from '../../shared/types';
import { parseInterfaceLocaleDefinitionFromPo } from './po';

declare const require: ((modulePath: string) => unknown) | undefined;

function isNodeRuntime() {
  return typeof window === 'undefined' && typeof process !== 'undefined' && Boolean(process.versions?.node);
}

function normalizePoModule(raw: unknown) {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && 'default' in raw) {
    const value = (raw as { default?: unknown }).default;
    return typeof value === 'string' ? value : '';
  }
  return '';
}

function readBuiltInPoInNode(localeId: 'ru' | 'en') {
  const dynamicRequire = module.require.bind(module) as NodeRequire;
  const fs = dynamicRequire('node:fs') as typeof import('node:fs');
  const path = dynamicRequire('node:path') as typeof import('node:path');
  const filePath = path.resolve(__dirname, '../../../src/core/i18n/locales', `${localeId}.po`);
  return fs.readFileSync(filePath, 'utf8');
}

function readBuiltInPoInRenderer(localeId: 'ru' | 'en') {
  if (typeof require !== 'function') return '';
  if (localeId === 'ru') return normalizePoModule(require('./locales/ru.po'));
  return normalizePoModule(require('./locales/en.po'));
}

function readBuiltInPo(localeId: 'ru' | 'en') {
  return isNodeRuntime()
    ? readBuiltInPoInNode(localeId)
    : readBuiltInPoInRenderer(localeId);
}

function parseBuiltInPo(localeId: 'ru' | 'en') {
  const content = readBuiltInPo(localeId);
  const parsed = parseInterfaceLocaleDefinitionFromPo(content, { source: 'built-in' });
  if (!parsed.ok) {
    throw new Error(`Failed to parse built-in locale "${localeId}" from .po: ${parsed.error}`);
  }
  return parsed.locale;
}

export function loadBuiltInInterfaceLocales(): InterfaceLocaleDefinition[] {
  return [parseBuiltInPo('ru'), parseBuiltInPo('en')];
}
