import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { InterfaceLocaleDefinition, TranslationParams } from '../../shared/types';
import { collectAddonInterfaceLocales } from '../../core/addons/addonMerger';
import {
  buildI18nLocaleQualitySummaries,
  ensureI18nInitialized,
  formatLocaleDate,
  formatLocaleDateTime,
  formatLocaleNumber,
  getBuiltInInterfaceLocales,
  type I18nLocaleQualitySummary,
  normalizeInterfaceLocale,
  resolveRuntimeTranslation,
  sanitizeTranslationParams,
  setI18nLanguage,
  syncI18nLocaleDefinitions,
} from '../../core/i18n';
import { mergeInterfaceLocaleDefinitions } from '../../core/i18n/resources';
import { useAppExtensions, useAppSettings } from './AppContext';

export interface I18nContextValue {
  locale: string;
  locales: InterfaceLocaleDefinition[];
  localeQuality: Record<string, I18nLocaleQualitySummary>;
  t: (key: string, params?: TranslationParams) => string;
  formatDate: (value: string | number | Date, options?: Intl.DateTimeFormatOptions, fallback?: string) => string;
  formatDateTime: (value: string | number | Date, options?: Intl.DateTimeFormatOptions, fallback?: string) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
}

const I18nContext = createContext<I18nContextValue>(null!);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { interfaceLanguage, importedInterfaceLocales } = useAppSettings();
  const { installedAddons, modInterfaceLocales } = useAppExtensions();
  const [i18nRevision, setI18nRevision] = useState(0);
  const addonInterfaceLocales = useMemo(
    () => collectAddonInterfaceLocales(installedAddons),
    [installedAddons],
  );
  const externalInterfaceLocales = useMemo(
    () => mergeInterfaceLocaleDefinitions(
      mergeInterfaceLocaleDefinitions(
        addonInterfaceLocales,
        modInterfaceLocales,
      ),
      Object.values(importedInterfaceLocales),
    ),
    [addonInterfaceLocales, importedInterfaceLocales, modInterfaceLocales],
  );
  const locales = useMemo(
    () => mergeInterfaceLocaleDefinitions(getBuiltInInterfaceLocales(), externalInterfaceLocales),
    [externalInterfaceLocales],
  );
  const localeMap = useMemo(
    () => Object.fromEntries(locales.map((entry) => [entry.id, entry])) as Record<string, InterfaceLocaleDefinition>,
    [locales],
  );
  const locale = normalizeInterfaceLocale(interfaceLanguage, localeMap);
  const localeQuality = useMemo(
    () => buildI18nLocaleQualitySummaries(locales),
    [locales],
  );

  useEffect(() => {
    let cancelled = false;

    void ensureI18nInitialized()
      .then(() => syncI18nLocaleDefinitions(externalInterfaceLocales))
      .then(() => setI18nLanguage(normalizeInterfaceLocale(interfaceLanguage, localeMap)))
      .then(() => {
        if (!cancelled) setI18nRevision((revision) => revision + 1);
      });

    return () => {
      cancelled = true;
    };
  }, [externalInterfaceLocales, interfaceLanguage, localeMap]);

  const value = useMemo<I18nContextValue>(() => {
    const translate = (key: string, params?: TranslationParams) => {
      const safeParams = sanitizeTranslationParams(params);
      return resolveRuntimeTranslation(key, safeParams, locale, localeMap);
    };

    return {
      locale,
      locales,
      localeQuality,
      t: translate,
      formatDate: (value, options, fallback) => formatLocaleDate(value, locale, options, fallback),
      formatDateTime: (value, options, fallback) => formatLocaleDateTime(value, locale, options, fallback),
      formatNumber: (value, options) => formatLocaleNumber(value, locale, options),
    };
  }, [i18nRevision, locale, localeMap, localeQuality, locales]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
