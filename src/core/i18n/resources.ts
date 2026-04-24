import type {
  InterfaceLocaleDefinition,
  InterfaceLocaleLayerDefinition,
  InterfaceLocaleMergeDiagnostic,
  InterfaceTranslationSource,
  PluralTranslation,
  TranslationDictionary,
  TranslationNode,
} from '../../shared/types';
import { loadBuiltInInterfaceLocales } from './builtInLocales';
import { sanitizeTranslationText } from './safe';

export const DEFAULT_INTERFACE_LOCALE = 'ru';

export const BUILT_IN_INTERFACE_LOCALES: InterfaceLocaleDefinition[] = loadBuiltInInterfaceLocales();

const PLURAL_KEYS = new Set(['zero', 'one', 'few', 'many', 'other']);
const INVALID_TRANSLATION_KEY_CHARS = /[\u0000-\u001F\u007F\s.]/;
const SOURCE_PRIORITY: Record<InterfaceTranslationSource, number> = {
  'built-in': 0,
  addon: 1,
  mod: 2,
  imported: 3,
};
let lastInterfaceLocaleMergeDiagnostics: InterfaceLocaleMergeDiagnostic[] = [];

type ExternalInterfaceLocaleInput = Pick<
  InterfaceLocaleDefinition,
  'id' | 'label' | 'nativeLabel' | 'dictionary' | 'sourceName' | 'importedAt'
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPluralTranslationRecord(value: TranslationNode | undefined): value is PluralTranslation {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((key) => PLURAL_KEYS.has(key));
}

function getTranslationNodeKind(node: TranslationNode) {
  if (typeof node === 'string') return 'string';
  if (isPluralTranslationRecord(node)) return 'plural';
  return 'dictionary';
}

function normalizeTranslationDictionaryKey(key: string) {
  const sanitized = sanitizeTranslationText(key);
  if (!sanitized || INVALID_TRANSLATION_KEY_CHARS.test(sanitized)) return null;
  return sanitized;
}

function normalizeLocaleId(localeId: string) {
  const sanitized = sanitizeTranslationText(localeId).replace(/_/g, '-');
  if (!sanitized) return null;

  const parts = sanitized.split('-').map((part) => part.trim()).filter(Boolean);
  if (!parts.length || !/^[A-Za-z]{2,3}$/.test(parts[0]!)) return null;

  return parts
    .map((part, index) => {
      if (index === 0) return part.toLowerCase();
      if (/^[A-Za-z]{2}$/.test(part)) return part.toUpperCase();
      if (/^[A-Za-z]{4}$/.test(part)) {
        return `${part[0]!.toUpperCase()}${part.slice(1).toLowerCase()}`;
      }
      return part;
    })
    .join('-');
}

function buildLocaleLayer(
  source: InterfaceTranslationSource,
  sourceName?: string,
  importedAt?: string,
): InterfaceLocaleLayerDefinition {
  return {
    source,
    ...(sourceName ? { sourceName: sanitizeTranslationText(sourceName) || undefined } : {}),
    ...(importedAt ? { importedAt } : {}),
  };
}

function getLocaleLayers(locale: InterfaceLocaleDefinition) {
  if (locale.layers?.length) {
    return locale.layers.map((layer) => buildLocaleLayer(layer.source, layer.sourceName, layer.importedAt));
  }
  return [buildLocaleLayer(locale.source, locale.sourceName, locale.importedAt)];
}

function mergeLocaleLayers(
  existingLayers: InterfaceLocaleLayerDefinition[],
  nextLayers: InterfaceLocaleLayerDefinition[],
) {
  const seen = new Set<string>();
  const merged: InterfaceLocaleLayerDefinition[] = [];

  const pushLayer = (layer: InterfaceLocaleLayerDefinition) => {
    const normalized = buildLocaleLayer(layer.source, layer.sourceName, layer.importedAt);
    const key = `${normalized.source}|${normalized.sourceName ?? ''}|${normalized.importedAt ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(normalized);
  };

  [...existingLayers, ...nextLayers].forEach(pushLayer);

  return merged.sort((left, right) => {
    const priorityDelta = SOURCE_PRIORITY[left.source] - SOURCE_PRIORITY[right.source];
    if (priorityDelta !== 0) return priorityDelta;
    return (left.sourceName ?? '').localeCompare(right.sourceName ?? '');
  });
}

export function normalizeTranslationNode(node: unknown): TranslationNode | null {
  if (typeof node === 'string') {
    const sanitized = sanitizeTranslationText(node);
    return sanitized || null;
  }

  if (!isRecord(node)) return null;

  if (isPluralTranslationRecord(node as TranslationNode)) {
    const pluralResult: PluralTranslation = {};
    for (const [key, value] of Object.entries(node)) {
      if (typeof value !== 'string') continue;
      const sanitized = sanitizeTranslationText(value);
      if (!sanitized) continue;
      pluralResult[key as keyof PluralTranslation] = sanitized;
    }
    return Object.keys(pluralResult).length ? pluralResult : null;
  }

  const nestedResult: TranslationDictionary = {};
  for (const [key, value] of Object.entries(node)) {
    const normalizedKey = normalizeTranslationDictionaryKey(key);
    if (!normalizedKey) continue;
    const normalizedValue = normalizeTranslationNode(value);
    if (normalizedValue === null) continue;
    nestedResult[normalizedKey] = normalizedValue;
  }

  return Object.keys(nestedResult).length ? nestedResult : null;
}

export function normalizeExternalInterfaceLocaleDefinitions(
  locales: ExternalInterfaceLocaleInput[],
  source: Exclude<InterfaceTranslationSource, 'built-in'>,
): InterfaceLocaleDefinition[] {
  const normalized: InterfaceLocaleDefinition[] = [];

  for (const locale of locales) {
    const id = normalizeLocaleId(locale.id);
    const dictionary = normalizeTranslationNode(locale.dictionary);
    if (!id || !dictionary || typeof dictionary === 'string' || isPluralTranslationRecord(dictionary)) continue;

    const label = sanitizeTranslationText(locale.label || '') || id;
    const nativeLabel = sanitizeTranslationText(locale.nativeLabel || '') || label;

    normalized.push({
      id,
      label,
      nativeLabel,
      source,
      ...(locale.sourceName ? { sourceName: sanitizeTranslationText(locale.sourceName) || undefined } : {}),
      ...(locale.importedAt ? { importedAt: locale.importedAt } : {}),
      layers: [buildLocaleLayer(source, locale.sourceName, locale.importedAt)],
      dictionary,
    });
  }

  return normalized;
}

export function getInterfaceLocaleSourcePriority(source: InterfaceTranslationSource) {
  return SOURCE_PRIORITY[source];
}

export function getLastInterfaceLocaleMergeDiagnostics() {
  return lastInterfaceLocaleMergeDiagnostics;
}

function cloneTranslationNode(node: TranslationNode): TranslationNode {
  if (typeof node === 'string') return node;
  if (!isRecord(node)) return node;
  return Object.fromEntries(
    Object.entries(node).map(([key, value]) => [key, cloneTranslationNode(value as TranslationNode)]),
  );
}

export function mergeTranslationDictionaries(
  base: TranslationDictionary,
  extra: TranslationDictionary,
  diagnostics: InterfaceLocaleMergeDiagnostic[] = [],
  context?: {
    localeId: string;
    previousSource: InterfaceTranslationSource;
    nextSource: InterfaceTranslationSource;
    previousSourceName?: string;
    nextSourceName?: string;
    path?: string;
  },
): TranslationDictionary {
  const result: TranslationDictionary = Object.fromEntries(
    Object.entries(base).map(([key, value]) => [key, cloneTranslationNode(value)]),
  );

  for (const [key, value] of Object.entries(extra)) {
    const existing = result[key];
    const nextPath = context?.path ? `${context.path}.${key}` : key;

    if (existing !== undefined) {
      const existingKind = getTranslationNodeKind(existing);
      const nextKind = getTranslationNodeKind(value);
      if (existingKind !== nextKind) {
        diagnostics.push({
          localeId: context?.localeId ?? 'unknown',
          keyPath: nextPath,
          kind: 'type-mismatch',
          previousSource: context?.previousSource ?? 'built-in',
          nextSource: context?.nextSource ?? 'built-in',
          previousSourceName: context?.previousSourceName,
          nextSourceName: context?.nextSourceName,
        });
      } else if (JSON.stringify(existing) !== JSON.stringify(value)) {
        diagnostics.push({
          localeId: context?.localeId ?? 'unknown',
          keyPath: nextPath,
          kind: 'value-override',
          previousSource: context?.previousSource ?? 'built-in',
          nextSource: context?.nextSource ?? 'built-in',
          previousSourceName: context?.previousSourceName,
          nextSourceName: context?.nextSourceName,
        });
      }
    }

    if (typeof existing === 'string' || typeof value === 'string' || !isRecord(existing) || !isRecord(value)) {
      result[key] = cloneTranslationNode(value);
      continue;
    }

    result[key] = mergeTranslationDictionaries(
      existing as TranslationDictionary,
      value as TranslationDictionary,
      diagnostics,
      {
        localeId: context?.localeId ?? 'unknown',
        previousSource: context?.previousSource ?? 'built-in',
        nextSource: context?.nextSource ?? 'built-in',
        previousSourceName: context?.previousSourceName,
        nextSourceName: context?.nextSourceName,
        path: nextPath,
      },
    );
  }

  return result;
}

export function mergeInterfaceLocaleDefinitions(
  baseLocales: InterfaceLocaleDefinition[],
  extraLocales: InterfaceLocaleDefinition[],
): InterfaceLocaleDefinition[] {
  const diagnostics: InterfaceLocaleMergeDiagnostic[] = [];
  const allLocales = [...baseLocales, ...extraLocales];
  const grouped = new Map<string, Array<{ locale: InterfaceLocaleDefinition; index: number }>>();

  allLocales.forEach((locale, index) => {
    const current = grouped.get(locale.id) ?? [];
    current.push({ locale, index });
    grouped.set(locale.id, current);
  });

  const merged: InterfaceLocaleDefinition[] = [];

  for (const [localeId, variants] of grouped.entries()) {
    const sortedVariants = [...variants].sort((left, right) => {
      const priorityDelta = getInterfaceLocaleSourcePriority(left.locale.source) - getInterfaceLocaleSourcePriority(right.locale.source);
      if (priorityDelta !== 0) return priorityDelta;
      return left.index - right.index;
    });

    let mergedLocale = sortedVariants[0]!.locale;

    for (let index = 1; index < sortedVariants.length; index += 1) {
      const nextLocale = sortedVariants[index]!.locale;
      mergedLocale = {
        ...mergedLocale,
        source: nextLocale.source,
        label: nextLocale.label || mergedLocale.label,
        nativeLabel: nextLocale.nativeLabel || mergedLocale.nativeLabel,
        sourceName: nextLocale.sourceName ?? mergedLocale.sourceName,
        importedAt: nextLocale.importedAt ?? mergedLocale.importedAt,
        layers: mergeLocaleLayers(getLocaleLayers(mergedLocale), getLocaleLayers(nextLocale)),
        dictionary: mergeTranslationDictionaries(
          mergedLocale.dictionary,
          nextLocale.dictionary,
          diagnostics,
          {
            localeId,
            previousSource: mergedLocale.source,
            nextSource: nextLocale.source,
            previousSourceName: mergedLocale.sourceName,
            nextSourceName: nextLocale.sourceName,
          },
        ),
      };
    }

    merged.push(mergedLocale);
  }

  lastInterfaceLocaleMergeDiagnostics = diagnostics;
  return merged.sort((left, right) => left.id.localeCompare(right.id));
}
