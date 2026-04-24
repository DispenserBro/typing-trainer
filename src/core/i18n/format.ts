export function resolveIntlLocale(locale: string) {
  return locale === 'en' ? 'en-US' : 'ru-RU';
}

function parseDateValue(value: string | number | Date) {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatLocaleDate(
  value: string | number | Date,
  locale: string,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
  },
  fallback = '',
) {
  const parsed = parseDateValue(value);
  if (!parsed) return fallback || String(value);

  try {
    return new Intl.DateTimeFormat(resolveIntlLocale(locale), options).format(parsed);
  } catch {
    return fallback || String(value);
  }
}

export function formatLocaleDateTime(
  value: string | number | Date,
  locale: string,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  },
  fallback = '',
) {
  const parsed = parseDateValue(value);
  if (!parsed) return fallback || String(value);

  try {
    return new Intl.DateTimeFormat(resolveIntlLocale(locale), options).format(parsed);
  } catch {
    return fallback || String(value);
  }
}

export function formatLocaleNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
) {
  try {
    return new Intl.NumberFormat(resolveIntlLocale(locale), options).format(value);
  } catch {
    return String(value);
  }
}
