import type { TranslationParams } from '../../shared/types';

const INLINE_CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const LINE_BREAKS_AND_TABS = /[\r\n\t]+/g;

export function sanitizeTranslationText(value: string) {
  return value
    .replace(INLINE_CONTROL_CHARS, '')
    .replace(LINE_BREAKS_AND_TABS, ' ')
    .trim();
}

export function sanitizeTranslationValue(value: TranslationParams[string]) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return sanitizeTranslationText(value);
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'boolean') return value;
  return String(value);
}

export function sanitizeTranslationParams(params?: TranslationParams) {
  if (!params) return undefined;
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, sanitizeTranslationValue(value)]),
  ) as TranslationParams;
}
