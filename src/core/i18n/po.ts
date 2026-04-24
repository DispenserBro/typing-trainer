import type {
  ImportedInterfaceLocaleDefinition,
  InterfaceLocaleDefinition,
  InterfaceTranslationSource,
  PluralTranslation,
  TranslationDictionary,
} from '../../shared/types';
import { sanitizeTranslationText } from './safe';

type PoImportErrorCode =
  | 'invalid-format'
  | 'missing-language'
  | 'empty-dictionary'
  | 'conflicting-keys'
  | 'invalid-plural-forms'
  | 'duplicate-entry';
type PoDictionaryValue = string | PluralTranslation;

type PoImportResult =
  | { ok: true; locale: ImportedInterfaceLocaleDefinition }
  | { ok: false; error: PoImportErrorCode };

type PoLocaleParseResult =
  | { ok: true; locale: InterfaceLocaleDefinition }
  | { ok: false; error: PoImportErrorCode };

type PoEntry = {
  msgctxt?: string;
  msgid: string;
  msgidPlural?: string;
  msgstr: Map<number, string>;
};

type PoParseResult =
  | { ok: true; entries: PoEntry[] }
  | { ok: false; error: PoImportErrorCode };

type PoEntryBuilder = {
  msgctxtParts: string[];
  msgidParts: string[];
  msgidPluralParts: string[];
  msgstrParts: Map<number, string[]>;
  activeField: null | { type: 'msgctxt' | 'msgid' | 'msgidPlural' | 'msgstr'; index?: number };
};

const FIELD_ORDER: Array<keyof PluralTranslation> = ['zero', 'one', 'few', 'many', 'other'];

function normalizeLocaleId(localeId: string) {
  const sanitized = sanitizeTranslationText(localeId).replace(/_/g, '-');
  if (!sanitized) return null;

  const parts = sanitized.split('-').map((part) => part.trim()).filter(Boolean);
  if (!parts.length || !/^[A-Za-z]{2,3}$/.test(parts[0]!)) return null;

  return parts
    .map((part, index) => {
      if (index === 0) return part.toLowerCase();
      if (/^[A-Za-z]{2}$/.test(part)) return part.toUpperCase();
      if (/^[A-Za-z]{4}$/.test(part)) return `${part[0]!.toUpperCase()}${part.slice(1).toLowerCase()}`;
      return part;
    })
    .join('-');
}

function createEntryBuilder(): PoEntryBuilder {
  return {
    msgctxtParts: [],
    msgidParts: [],
    msgidPluralParts: [],
    msgstrParts: new Map(),
    activeField: null,
  };
}

function decodePoString(value: string) {
  return value.replace(/\\(["\\nrt])/g, (_match, token: string) => {
    switch (token) {
      case 'n':
        return '\n';
      case 'r':
        return '\r';
      case 't':
        return '\t';
      default:
        return token;
    }
  });
}

function flushEntry(builder: PoEntryBuilder, target: PoEntry[]) {
  const msgctxt = builder.msgctxtParts.join('');
  const msgid = builder.msgidParts.join('');
  const msgstr = new Map<number, string>();

  for (const [index, parts] of builder.msgstrParts.entries()) {
    msgstr.set(index, parts.join(''));
  }

  if (!msgid && msgstr.size === 0) return;

  target.push({
    ...(msgctxt ? { msgctxt } : {}),
    msgid,
    msgidPlural: builder.msgidPluralParts.length ? builder.msgidPluralParts.join('') : undefined,
    msgstr,
  });
}

function parsePoEntries(content: string): PoParseResult {
  const entries: PoEntry[] = [];
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/);
  let builder = createEntryBuilder();
  let sawField = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      if (sawField) {
        flushEntry(builder, entries);
        builder = createEntryBuilder();
        sawField = false;
      }
      continue;
    }

    if (line.startsWith('#')) continue;

    const msgctxtMatch = line.match(/^msgctxt\s+"(.*)"$/);
    if (msgctxtMatch) {
      builder.activeField = { type: 'msgctxt' };
      builder.msgctxtParts = [decodePoString(msgctxtMatch[1] ?? '')];
      sawField = true;
      continue;
    }

    const msgidMatch = line.match(/^msgid\s+"(.*)"$/);
    if (msgidMatch) {
      builder.activeField = { type: 'msgid' };
      builder.msgidParts = [decodePoString(msgidMatch[1] ?? '')];
      sawField = true;
      continue;
    }

    const msgidPluralMatch = line.match(/^msgid_plural\s+"(.*)"$/);
    if (msgidPluralMatch) {
      builder.activeField = { type: 'msgidPlural' };
      builder.msgidPluralParts = [decodePoString(msgidPluralMatch[1] ?? '')];
      sawField = true;
      continue;
    }

    const msgstrMatch = line.match(/^msgstr(?:\[(\d+)\])?\s+"(.*)"$/);
    if (msgstrMatch) {
      const index = Number(msgstrMatch[1] ?? '0');
      if (builder.msgstrParts.has(index)) {
        return { ok: false, error: 'duplicate-entry' };
      }
      builder.activeField = { type: 'msgstr', index };
      builder.msgstrParts.set(index, [decodePoString(msgstrMatch[2] ?? '')]);
      sawField = true;
      continue;
    }

    const continuationMatch = line.match(/^"(.*)"$/);
    if (continuationMatch && builder.activeField) {
      const decoded = decodePoString(continuationMatch[1] ?? '');
      if (builder.activeField.type === 'msgctxt') {
        builder.msgctxtParts.push(decoded);
      } else if (builder.activeField.type === 'msgid') {
        builder.msgidParts.push(decoded);
      } else if (builder.activeField.type === 'msgidPlural') {
        builder.msgidPluralParts.push(decoded);
      } else {
        const index = builder.activeField.index ?? 0;
        const current = builder.msgstrParts.get(index) ?? [];
        current.push(decoded);
        builder.msgstrParts.set(index, current);
      }
      continue;
    }

    return { ok: false, error: 'invalid-format' };
  }

  if (sawField) {
    flushEntry(builder, entries);
  }

  return { ok: true, entries };
}

function parsePoHeaders(headerText: string) {
  const headers = new Map<string, string>();

  for (const rawLine of headerText.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const separatorIndex = line.indexOf(':');
    if (separatorIndex <= 0) continue;
    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();
    if (!key || !value) continue;
    headers.set(key, value);
  }

  return headers;
}

function areDictionaryValuesEqual(left: PoDictionaryValue, right: PoDictionaryValue) {
  if (typeof left === 'string' || typeof right === 'string') return left === right;
  return JSON.stringify(left) === JSON.stringify(right);
}

function buildDictionaryKey(entry: PoEntry) {
  const msgid = sanitizeTranslationText(entry.msgid);
  if (!msgid) return null;
  const context = sanitizeTranslationText(entry.msgctxt ?? '');
  return context ? `${context}.${msgid}` : msgid;
}

function setDictionaryValue(dictionary: TranslationDictionary, key: string, value: string | PluralTranslation) {
  const parts = key.split('.').map((part) => sanitizeTranslationText(part)).filter(Boolean);
  if (!parts.length) return false;

  let current: TranslationDictionary = dictionary;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index]!;
    const next = current[part];
    if (!next) {
      current[part] = {};
      current = current[part] as TranslationDictionary;
      continue;
    }

    if (typeof next === 'string' || FIELD_ORDER.some((pluralKey) => pluralKey in (next as object))) {
      return false;
    }

    current = next as TranslationDictionary;
  }

  const leafKey = parts[parts.length - 1]!;
  const existingLeaf = current[leafKey];
  if (existingLeaf && typeof existingLeaf !== typeof value) {
    return false;
  }

  current[leafKey] = value;
  return true;
}

function resolvePluralKeys(localeId: string) {
  try {
    const categories = new Intl.PluralRules(localeId).resolvedOptions().pluralCategories;
    return FIELD_ORDER.filter((key) => categories.includes(key));
  } catch {
    return ['one', 'other'] as Array<keyof PluralTranslation>;
  }
}

function resolvePoPluralSlotKeys(localeId: string, expectedCount: number) {
  const primary = resolvePluralKeys(localeId);
  const ordered = [...primary];

  for (const key of FIELD_ORDER) {
    if (ordered.length >= expectedCount) break;
    if (!ordered.includes(key)) ordered.push(key);
  }

  while (ordered.length < expectedCount) {
    ordered.push('other');
  }

  return ordered.slice(0, expectedCount);
}

function resolveExpectedPluralCount(headerValue: string | undefined, fallbackCount: number) {
  if (!headerValue) return fallbackCount;
  const match = headerValue.match(/nplurals\s*=\s*(\d+)/i);
  if (!match) return fallbackCount;
  const count = Number(match[1]);
  return Number.isFinite(count) && count > 0 ? count : fallbackCount;
}

function validatePoPluralEntry(entry: PoEntry, expectedPluralCount: number) {
  if (!entry.msgidPlural) {
    return Array.from(entry.msgstr.keys()).every((index) => index === 0);
  }

  if (!entry.msgstr.size || entry.msgstr.size !== expectedPluralCount) return false;

  for (let index = 0; index < expectedPluralCount; index += 1) {
    const raw = entry.msgstr.get(index);
    const sanitized = sanitizeTranslationText(raw ?? '');
    if (!raw || !sanitized) return false;
  }

  return Array.from(entry.msgstr.keys()).every((index) => index >= 0 && index < expectedPluralCount);
}

function buildLocaleLabels(localeId: string) {
  const englishDisplay = (() => {
    try {
      return new Intl.DisplayNames(['en'], { type: 'language' }).of(localeId);
    } catch {
      return null;
    }
  })();

  const nativeDisplay = (() => {
    try {
      return new Intl.DisplayNames([localeId], { type: 'language' }).of(localeId);
    } catch {
      return null;
    }
  })();

  return {
    label: sanitizeTranslationText(englishDisplay ?? '') || localeId,
    nativeLabel: sanitizeTranslationText(nativeDisplay ?? '') || sanitizeTranslationText(englishDisplay ?? '') || localeId,
  };
}

export function importInterfaceLocaleFromPo(content: string, sourceName: string): PoImportResult {
  const parsed = parseInterfaceLocaleDefinitionFromPo(content, {
    source: 'imported',
    sourceName,
    importedAt: new Date().toISOString(),
  });

  if (!parsed.ok) return parsed;

  return {
    ok: true,
    locale: {
      ...parsed.locale,
      source: 'imported',
      importedAt: parsed.locale.importedAt ?? new Date().toISOString(),
      sourceName: parsed.locale.sourceName ?? (sanitizeTranslationText(sourceName) || 'imported.po'),
    },
  };
}

export function parseInterfaceLocaleDefinitionFromPo(
  content: string,
  options: {
    source: InterfaceTranslationSource;
    sourceName?: string;
    importedAt?: string;
  },
): PoLocaleParseResult {
  const parseResult = parsePoEntries(content);
  if (!parseResult.ok) return { ok: false, error: parseResult.error };
  const entries = parseResult.entries;
  const safeSourceName = sanitizeTranslationText(options.sourceName ?? '') || undefined;
  const importedAt = options.importedAt;

  const dictionary: TranslationDictionary = {};
  const headerEntry = entries.find((entry) => entry.msgid === '');
  const headers = parsePoHeaders(headerEntry?.msgstr.get(0) ?? '');
  const localeId = normalizeLocaleId(headers.get('language') ?? '');
  if (!localeId) return { ok: false, error: 'missing-language' };

  const fallbackPluralKeys = resolvePluralKeys(localeId);
  const expectedPluralCount = resolveExpectedPluralCount(headers.get('plural-forms'), fallbackPluralKeys.length);
  const pluralKeys = resolvePoPluralSlotKeys(localeId, expectedPluralCount);
  const dictionaryEntries = new Map<string, PoDictionaryValue>();

  for (const entry of entries) {
    if (!entry.msgid) continue;
    const key = buildDictionaryKey(entry);
    if (!key) continue;

    if (!validatePoPluralEntry(entry, expectedPluralCount)) {
      return { ok: false, error: 'invalid-plural-forms' };
    }

    const singular = entry.msgstr.get(0);
    if (!entry.msgidPlural) {
      if (!singular) continue;
      const sanitized = sanitizeTranslationText(singular);
      if (!sanitized) continue;
      const existing = dictionaryEntries.get(key);
      if (existing) {
        return { ok: false, error: areDictionaryValuesEqual(existing, sanitized) ? 'duplicate-entry' : 'conflicting-keys' };
      }
      dictionaryEntries.set(key, sanitized);
      continue;
    }

    const pluralValue: PluralTranslation = {};
    for (const [index, text] of entry.msgstr.entries()) {
      const key = pluralKeys[index] ?? pluralKeys[pluralKeys.length - 1] ?? 'other';
      const sanitized = sanitizeTranslationText(text);
      if (!sanitized) continue;
      pluralValue[key] = sanitized;
    }

    if (Object.keys(pluralValue).length) {
      const existing = dictionaryEntries.get(key);
      if (existing) {
        return { ok: false, error: areDictionaryValuesEqual(existing, pluralValue) ? 'duplicate-entry' : 'conflicting-keys' };
      }
      dictionaryEntries.set(key, pluralValue);
    }
  }

  for (const [key, value] of dictionaryEntries.entries()) {
    if (!setDictionaryValue(dictionary, key, value)) {
      return { ok: false, error: 'conflicting-keys' };
    }
  }

  const labels = buildLocaleLabels(localeId);
  if (!Object.keys(dictionary).length) return { ok: false, error: 'empty-dictionary' };

  const label = sanitizeTranslationText(headers.get('x-language-label') ?? '') || labels.label;
  const nativeLabel = sanitizeTranslationText(headers.get('x-language-native-label') ?? '') || labels.nativeLabel;

  return {
    ok: true,
    locale: {
      id: localeId,
      label,
      nativeLabel,
      source: options.source,
      ...(importedAt ? { importedAt } : {}),
      ...(safeSourceName ? { sourceName: safeSourceName } : {}),
      layers: [{
        source: options.source,
        ...(safeSourceName ? { sourceName: safeSourceName } : {}),
        ...(importedAt ? { importedAt } : {}),
      }],
      dictionary,
    },
  };
}
