import i18n, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import type {
  InterfaceLocaleDefinition,
  PluralTranslation,
  TranslationParams,
  TranslationDictionary,
  TranslationNode,
} from '../../shared/types';
import {
  BUILT_IN_INTERFACE_LOCALES,
  DEFAULT_INTERFACE_LOCALE,
  getLastInterfaceLocaleMergeDiagnostics,
  mergeInterfaceLocaleDefinitions,
} from './resources';
import { sanitizeTranslationParams } from './safe';

const PLURAL_KEYS = new Set(['zero', 'one', 'few', 'many', 'other']);
const LEGACY_TRANSLATION_KEY_PREFIXES: Array<[string, string]> = [
  ['game.core.battle.', 'game.core.events.battle.'],
  ['game.core.bosses.', 'game.core.events.bosses.'],
];
const TRANSLATION_KEY_ALIASES: Record<string, string[]> = {
  'common.close': ['common.actions.close'],
  'game.inventory.title': ['game.hud.inventory'],
  'home.sections.achievements': ['home.cards.achievements.title'],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPluralTranslation(value: TranslationNode | undefined): value is PluralTranslation {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((key) => PLURAL_KEYS.has(key));
}

function flattenDictionary(
  dictionary: TranslationDictionary,
  prefix = '',
  target: Record<string, string> = {},
) {
  for (const [key, value] of Object.entries(dictionary)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      target[nextKey] = value;
      continue;
    }

    if (isPluralTranslation(value)) {
      for (const [pluralKey, pluralValue] of Object.entries(value)) {
        if (pluralValue) target[`${nextKey}_${pluralKey}`] = pluralValue;
      }
      continue;
    }

    if (isRecord(value)) {
      flattenDictionary(value as TranslationDictionary, nextKey, target);
    }
  }

  return target;
}

let activeInterfaceLocales: InterfaceLocaleDefinition[] = [...BUILT_IN_INTERFACE_LOCALES];
let activeLocaleMap = Object.fromEntries(
  activeInterfaceLocales.map((locale) => [locale.id, locale]),
) as Record<string, InterfaceLocaleDefinition>;
let registeredLocaleIds = new Set<string>(activeInterfaceLocales.map((locale) => locale.id));

function buildInterfaceLocaleMap(locales: InterfaceLocaleDefinition[]) {
  return Object.fromEntries(locales.map((locale) => [locale.id, locale])) as Record<string, InterfaceLocaleDefinition>;
}

function buildI18nResources(locales: InterfaceLocaleDefinition[]) {
  return Object.fromEntries(
    locales.map((locale) => [
      locale.id,
      { translation: flattenDictionary(locale.dictionary) },
    ]),
  );
}

export function getBuiltInInterfaceLocales() {
  return BUILT_IN_INTERFACE_LOCALES;
}

export function getInterfaceLocales() {
  return activeInterfaceLocales;
}

export function getBuiltInInterfaceLocaleMap() {
  return buildInterfaceLocaleMap(BUILT_IN_INTERFACE_LOCALES);
}

export function getInterfaceLocaleMap() {
  return activeLocaleMap;
}

export function normalizeInterfaceLocale(
  locale?: string,
  localeMap: Record<string, InterfaceLocaleDefinition> = activeLocaleMap,
) {
  if (locale && localeMap[locale]) return locale;
  return DEFAULT_INTERFACE_LOCALE;
}

export function buildLocaleFallbackChain(
  locale: string,
  localeMap: Record<string, InterfaceLocaleDefinition> = activeLocaleMap,
) {
  const seen = new Set<string>();
  const chain: string[] = [];

  const pushLocale = (localeId: string) => {
    if (!localeId || seen.has(localeId) || !localeMap[localeId]) return;
    seen.add(localeId);
    chain.push(localeId);
  };

  pushLocale(normalizeInterfaceLocale(locale, localeMap));
  pushLocale('en');
  pushLocale('ru');

  Object.keys(localeMap).forEach(pushLocale);

  return chain;
}

function getDictionaryNode(dictionary: TranslationDictionary, key: string): TranslationNode | null {
  const parts = key.split('.').filter(Boolean);
  if (!parts.length) return null;

  let current: TranslationNode | undefined = dictionary;
  for (const part of parts) {
    if (!isRecord(current) || !(part in current)) return null;
    current = current[part] as TranslationNode;
  }

  return current ?? null;
}

function interpolateTranslation(template: string, params?: TranslationParams) {
  if (!params) return template;
  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, key: string) => {
    const value = params[key];
    return value === null || value === undefined ? '' : String(value);
  });
}

export function getTranslationKeyCandidates(key: string) {
  const candidates = [key];

  for (const [legacyPrefix, currentPrefix] of LEGACY_TRANSLATION_KEY_PREFIXES) {
    if (key.startsWith(legacyPrefix)) {
      candidates.push(`${currentPrefix}${key.slice(legacyPrefix.length)}`);
    }
  }

  candidates.push(...(TRANSLATION_KEY_ALIASES[key] ?? []));

  return Array.from(new Set(candidates));
}

export function resolveRuntimeTranslation(
  key: string,
  params?: TranslationParams,
  locale?: string,
  localeMap: Record<string, InterfaceLocaleDefinition> = activeLocaleMap,
) {
  const safeParams = sanitizeTranslationParams(params);
  const chain = buildLocaleFallbackChain(locale ?? i18n.resolvedLanguage ?? i18n.language ?? DEFAULT_INTERFACE_LOCALE, localeMap);

  for (const localeId of chain) {
    for (const candidateKey of getTranslationKeyCandidates(key)) {
      const localeEntry = localeMap[localeId];
      if (!localeEntry) continue;
      const node = getDictionaryNode(localeEntry.dictionary, candidateKey);
      if (typeof node === 'string') {
        return interpolateTranslation(node, safeParams);
      }
    }
  }

  for (const candidateKey of getTranslationKeyCandidates(key)) {
    const translated = i18n.t(candidateKey, safeParams) as string;
    if (translated && translated !== candidateKey) return translated;
  }

  return key;
}

let initPromise: Promise<I18nInstance> | null = null;

export function ensureI18nInitialized() {
  if (!initPromise) {
    const resources = buildI18nResources(activeInterfaceLocales);
    initPromise = i18n
      .use(initReactI18next)
      .init({
        lng: DEFAULT_INTERFACE_LOCALE,
        fallbackLng: (code) => buildLocaleFallbackChain(code ?? DEFAULT_INTERFACE_LOCALE, activeLocaleMap),
        supportedLngs: Object.keys(activeLocaleMap),
        resources,
        defaultNS: 'translation',
        ns: ['translation'],
        interpolation: {
          escapeValue: false,
        },
        returnNull: false,
        returnEmptyString: false,
      })
      .then(() => i18n);
  }

  return initPromise;
}

export function syncI18nLocaleDefinitions(extraLocales: InterfaceLocaleDefinition[] = []) {
  const mergedLocales = mergeInterfaceLocaleDefinitions(BUILT_IN_INTERFACE_LOCALES, extraLocales);
  activeInterfaceLocales = mergedLocales;
  activeLocaleMap = buildInterfaceLocaleMap(mergedLocales);

  if (!initPromise) {
    registeredLocaleIds = new Set(mergedLocales.map((locale) => locale.id));
    return Promise.resolve(mergedLocales);
  }

  return ensureI18nInitialized().then(() => {
    const nextResources = buildI18nResources(mergedLocales);
    const nextLocaleIds = new Set(Object.keys(nextResources));

    for (const localeId of registeredLocaleIds) {
      if (!nextLocaleIds.has(localeId) && i18n.hasResourceBundle(localeId, 'translation')) {
        i18n.removeResourceBundle(localeId, 'translation');
      }
    }

    for (const [localeId, resource] of Object.entries(nextResources)) {
      if (i18n.hasResourceBundle(localeId, 'translation')) {
        i18n.removeResourceBundle(localeId, 'translation');
      }
      i18n.addResourceBundle(localeId, 'translation', resource.translation, true, true);
    }

    registeredLocaleIds = nextLocaleIds;
    i18n.options.supportedLngs = Array.from(nextLocaleIds);
    return mergedLocales;
  });
}

export function setI18nLanguage(locale?: string) {
  return i18n.changeLanguage(normalizeInterfaceLocale(locale, activeLocaleMap));
}

export function getI18nLocaleMergeDiagnostics() {
  return getLastInterfaceLocaleMergeDiagnostics();
}

void ensureI18nInitialized();

export { i18n };
export * from './diagnostics';
export * from './format';
export * from './po';
export * from './safe';
