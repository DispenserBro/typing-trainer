import type {
  InterfaceLocaleDefinition,
  InterfaceLocaleLayerDefinition,
  InterfaceLocaleMergeDiagnostic,
  PluralTranslation,
  TranslationNode,
} from '../../shared/types';

type TranslationLeaf = string | PluralTranslation;

const ALLOWED_SHARED_TRANSLATIONS = new Set([
  'game.hud.hpShort',
  'home.hero.kicker',
  'settings.cards.about.appNameValue',
]);

export type I18nLocaleDiagnostics = {
  localeId: string;
  label: string;
  referenceLeafCount: number;
  translatedLeafCount: number;
  coveragePercent: number;
  fallbackRiskKeys: string[];
  missingKeys: string[];
  typeMismatchKeys: string[];
  extraKeys: string[];
  suspiciousUntranslatedKeys: string[];
  missingPluralKeys: string[];
};

export type I18nDiagnosticsReport = {
  referenceLocaleId: string;
  localeIds: string[];
  diagnostics: I18nLocaleDiagnostics[];
  glossaryIssues: I18nGlossaryIssue[];
  externalLocales: Array<{
    localeId: string;
    label: string;
    layers: InterfaceLocaleLayerDefinition[];
  }>;
  mergeDiagnostics: InterfaceLocaleMergeDiagnostic[];
};

export type I18nLocaleQualitySummary = {
  localeId: string;
  label: string;
  translatedLeafCount: number;
  referenceLeafCount: number;
  coveragePercent: number;
  fallbackRiskCount: number;
  missingKeysCount: number;
  typeMismatchCount: number;
  missingPluralCount: number;
  extraKeysCount: number;
  suspiciousUntranslatedCount: number;
  isReference: boolean;
};

export type I18nGlossaryIssue = {
  localeId: string;
  label: string;
  ruleId: string;
  ruleLabel: string;
  expectedValue: string;
  mismatches: Array<{
    keyPath: string;
    value: string;
  }>;
};

type I18nGlossaryRule = {
  id: string;
  label: string;
  keyPaths: string[];
};

const GLOSSARY_RULES: I18nGlossaryRule[] = [
  {
    id: 'achievements-label',
    label: 'Achievements label',
    keyPaths: [
      'achievements.title',
      'home.sections.achievements',
      'practice.achievements',
      'sprint.achievements',
      'survival.achievements',
      'lessons.achievements',
      'game.achievements',
    ],
  },
  {
    id: 'practice-label',
    label: 'Practice mode label',
    keyPaths: [
      'achievements.categories.practice',
      'home.modeFocus.practice.title',
      'records.context.practice',
      'stats.filters.modeOptions.practice',
      'stats.modes.practice',
      'practice.title',
    ],
  },
  {
    id: 'sprint-label',
    label: 'Sprint mode label',
    keyPaths: [
      'achievements.categories.test',
      'home.modeFocus.sprint.title',
      'records.context.sprint',
      'stats.filters.modeOptions.test',
      'stats.modes.test',
      'sprint.title',
    ],
  },
  {
    id: 'survival-label',
    label: 'Survival mode label',
    keyPaths: [
      'home.modeFocus.survival.title',
      'records.practiceScenarios.survival',
      'practice.scenarios.survival',
      'practice.packSummary.recommended.survival',
      'survival.title',
    ],
  },
  {
    id: 'lessons-label',
    label: 'Lessons label',
    keyPaths: [
      'achievements.categories.lessons',
      'home.modeFocus.lessons.title',
      'stats.filters.modeOptions.lesson',
      'lessons.title',
    ],
  },
  {
    id: 'current-layout-label',
    label: 'Current layout label',
    keyPaths: [
      'home.summary.layout.label',
      'records.cards.currentLayout.title',
      'stats.filters.layoutOptions.current',
    ],
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPluralTranslation(value: TranslationNode | undefined): value is PluralTranslation {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((key) => ['zero', 'one', 'few', 'many', 'other'].includes(key));
}

function flattenTranslationLeaves(
  node: Record<string, TranslationNode>,
  prefix = '',
  target = new Map<string, TranslationLeaf>(),
): Map<string, TranslationLeaf> {
  for (const [key, value] of Object.entries(node)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string' || isPluralTranslation(value)) {
      target.set(nextKey, value);
      continue;
    }

    if (isRecord(value)) {
      flattenTranslationLeaves(value as Record<string, TranslationNode>, nextKey, target);
    }
  }

  return target;
}

function arePluralTranslationsEqual(left: PluralTranslation, right: PluralTranslation) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function getRequiredPluralKeys(localeId: string) {
  try {
    const categories = new Intl.PluralRules(localeId).resolvedOptions().pluralCategories;
    return Array.from(new Set([...categories, 'other']));
  } catch {
    return ['one', 'other'];
  }
}

function collectMissingPluralKeys(
  localeId: string,
  reference: PluralTranslation,
  locale: PluralTranslation,
) {
  const requiredKeys = getRequiredPluralKeys(localeId);
  return requiredKeys.filter((key) => reference[key as keyof PluralTranslation] && !locale[key as keyof PluralTranslation]);
}

function getFlattenedString(localeMap: Map<string, TranslationLeaf>, keyPath: string) {
  const value = localeMap.get(keyPath);
  return typeof value === 'string' ? value : null;
}

function collectGlossaryIssues(
  localeId: string,
  label: string,
  localeMap: Map<string, TranslationLeaf>,
): I18nGlossaryIssue[] {
  const issues: I18nGlossaryIssue[] = [];

  for (const rule of GLOSSARY_RULES) {
    const entries = rule.keyPaths
      .map((keyPath) => ({
        keyPath,
        value: getFlattenedString(localeMap, keyPath),
      }))
      .filter((entry): entry is { keyPath: string; value: string } => Boolean(entry.value));

    if (entries.length < 2) continue;

    const expectedValue = entries[0]!.value;
    const mismatches = entries.filter((entry) => entry.value !== expectedValue);
    if (!mismatches.length) continue;

    issues.push({
      localeId,
      label,
      ruleId: rule.id,
      ruleLabel: rule.label,
      expectedValue,
      mismatches,
    });
  }

  return issues;
}

export function runI18nDiagnostics(
  locales: InterfaceLocaleDefinition[],
  referenceLocaleId = 'ru',
): I18nDiagnosticsReport {
  const referenceLocale = locales.find((locale) => locale.id === referenceLocaleId) ?? locales[0];
  if (!referenceLocale) {
    return {
      referenceLocaleId,
      localeIds: [],
      diagnostics: [],
      glossaryIssues: [],
      externalLocales: [],
      mergeDiagnostics: [],
    };
  }

  const referenceMap = flattenTranslationLeaves(referenceLocale.dictionary);
  const glossaryIssues: I18nGlossaryIssue[] = [];
  const diagnostics = locales
    .filter((locale) => locale.id !== referenceLocale.id)
    .map<I18nLocaleDiagnostics>((locale) => {
      const localeMap = flattenTranslationLeaves(locale.dictionary);
      glossaryIssues.push(...collectGlossaryIssues(locale.id, locale.nativeLabel, localeMap));
      const missingKeys: string[] = [];
      const typeMismatchKeys: string[] = [];
      const suspiciousUntranslatedKeys: string[] = [];
      const missingPluralKeys: string[] = [];
      let translatedLeafCount = 0;

      for (const [key, referenceValue] of referenceMap.entries()) {
        const localeValue = localeMap.get(key);
        if (!localeValue) {
          missingKeys.push(key);
          continue;
        }

        const referenceIsPlural = typeof referenceValue !== 'string';
        const localeIsPlural = typeof localeValue !== 'string';
        if (referenceIsPlural !== localeIsPlural) {
          typeMismatchKeys.push(key);
          continue;
        }

        if (typeof referenceValue === 'string' && typeof localeValue === 'string') {
          translatedLeafCount += 1;
          if (referenceValue === localeValue && !ALLOWED_SHARED_TRANSLATIONS.has(key)) {
            suspiciousUntranslatedKeys.push(key);
          }
          continue;
        }

        const pluralReference = referenceValue as PluralTranslation;
        const pluralLocale = localeValue as PluralTranslation;
        const pluralMissing = collectMissingPluralKeys(locale.id, pluralReference, pluralLocale);
        if (pluralMissing.length) {
          missingPluralKeys.push(...pluralMissing.map((pluralKey) => `${key}.${pluralKey}`));
        } else {
          translatedLeafCount += 1;
        }
        if (arePluralTranslationsEqual(pluralReference, pluralLocale) && !ALLOWED_SHARED_TRANSLATIONS.has(key)) {
          suspiciousUntranslatedKeys.push(key);
        }
      }

      const extraKeys = Array.from(localeMap.keys()).filter((key) => !referenceMap.has(key)).sort();
      const fallbackRiskKeys = [...missingKeys, ...typeMismatchKeys, ...missingPluralKeys].sort();

      return {
        localeId: locale.id,
        label: locale.nativeLabel,
        referenceLeafCount: referenceMap.size,
        translatedLeafCount,
        coveragePercent: referenceMap.size ? Math.round((translatedLeafCount / referenceMap.size) * 1000) / 10 : 100,
        fallbackRiskKeys,
        missingKeys: missingKeys.sort(),
        typeMismatchKeys: typeMismatchKeys.sort(),
        extraKeys,
        suspiciousUntranslatedKeys: suspiciousUntranslatedKeys.sort(),
        missingPluralKeys: missingPluralKeys.sort(),
      };
    });

  return {
    referenceLocaleId: referenceLocale.id,
    localeIds: locales.map((locale) => locale.id),
    diagnostics,
    glossaryIssues: glossaryIssues.sort((left, right) => (
      left.localeId.localeCompare(right.localeId)
      || left.ruleId.localeCompare(right.ruleId)
    )),
    externalLocales: locales
      .filter((locale) => locale.layers?.some((layer) => layer.source !== 'built-in'))
      .map((locale) => ({
        localeId: locale.id,
        label: locale.nativeLabel,
        layers: locale.layers ?? [],
      })),
    mergeDiagnostics: [],
  };
}

export function buildI18nLocaleQualitySummaries(
  locales: InterfaceLocaleDefinition[],
  referenceLocaleId = 'ru',
): Record<string, I18nLocaleQualitySummary> {
  const report = runI18nDiagnostics(locales, referenceLocaleId);
  const referenceLocale = locales.find((locale) => locale.id === report.referenceLocaleId) ?? locales[0];
  const summaries: Record<string, I18nLocaleQualitySummary> = {};

  if (referenceLocale) {
    const referenceLeafCount = flattenTranslationLeaves(referenceLocale.dictionary).size;
    summaries[referenceLocale.id] = {
      localeId: referenceLocale.id,
      label: referenceLocale.nativeLabel,
      translatedLeafCount: referenceLeafCount,
      referenceLeafCount,
      coveragePercent: 100,
      fallbackRiskCount: 0,
      missingKeysCount: 0,
      typeMismatchCount: 0,
      missingPluralCount: 0,
      extraKeysCount: 0,
      suspiciousUntranslatedCount: 0,
      isReference: true,
    };
  }

  for (const locale of report.diagnostics) {
    summaries[locale.localeId] = {
      localeId: locale.localeId,
      label: locale.label,
      translatedLeafCount: locale.translatedLeafCount,
      referenceLeafCount: locale.referenceLeafCount,
      coveragePercent: locale.coveragePercent,
      fallbackRiskCount: locale.fallbackRiskKeys.length,
      missingKeysCount: locale.missingKeys.length,
      typeMismatchCount: locale.typeMismatchKeys.length,
      missingPluralCount: locale.missingPluralKeys.length,
      extraKeysCount: locale.extraKeys.length,
      suspiciousUntranslatedCount: locale.suspiciousUntranslatedKeys.length,
      isReference: false,
    };
  }

  return summaries;
}

export function attachI18nMergeDiagnostics(
  report: I18nDiagnosticsReport,
  mergeDiagnostics: InterfaceLocaleMergeDiagnostic[],
): I18nDiagnosticsReport {
  return {
    ...report,
    mergeDiagnostics: [...mergeDiagnostics].sort((left, right) => (
      left.localeId.localeCompare(right.localeId)
      || left.keyPath.localeCompare(right.keyPath)
      || left.kind.localeCompare(right.kind)
    )),
  };
}

function formatSampleList(keys: string[], limit = 8) {
  if (!keys.length) return 'none';
  const sample = keys.slice(0, limit).join(', ');
  return keys.length > limit ? `${sample}, … (+${keys.length - limit})` : sample;
}

function formatGlossarySample(issues: I18nGlossaryIssue[], limit = 5) {
  if (!issues.length) return 'none';
  const sample = issues.slice(0, limit).map((issue) => (
    `${issue.localeId}:${issue.ruleId} -> ${issue.mismatches.map((entry) => `${entry.keyPath}=${entry.value}`).join('; ')}`
  )).join(' | ');
  return issues.length > limit ? `${sample} … (+${issues.length - limit})` : sample;
}

export function formatI18nDiagnosticsReport(report: I18nDiagnosticsReport) {
  const lines: string[] = [
    `=== I18N diagnostics (reference: ${report.referenceLocaleId}) ===`,
    `Locales: ${report.localeIds.join(', ')}`,
    '',
  ];

  for (const locale of report.diagnostics) {
    lines.push(`[${locale.localeId}] ${locale.label}`);
    lines.push(`  Coverage: ${locale.translatedLeafCount}/${locale.referenceLeafCount} (${locale.coveragePercent}%)`);
    lines.push(`  Fallback risk: ${locale.fallbackRiskKeys.length}`);
    lines.push(`    ${formatSampleList(locale.fallbackRiskKeys)}`);
    lines.push(`  Missing keys: ${locale.missingKeys.length}`);
    lines.push(`    ${formatSampleList(locale.missingKeys)}`);
    lines.push(`  Type mismatch: ${locale.typeMismatchKeys.length}`);
    lines.push(`    ${formatSampleList(locale.typeMismatchKeys)}`);
    lines.push(`  Missing plural forms: ${locale.missingPluralKeys.length}`);
    lines.push(`    ${formatSampleList(locale.missingPluralKeys)}`);
    lines.push(`  Suspicious untranslated: ${locale.suspiciousUntranslatedKeys.length}`);
    lines.push(`    ${formatSampleList(locale.suspiciousUntranslatedKeys)}`);
    lines.push(`  Extra keys: ${locale.extraKeys.length}`);
    lines.push(`    ${formatSampleList(locale.extraKeys)}`);
    lines.push('');
  }

  lines.push('=== External locale layers ===');
  if (!report.externalLocales.length) {
    lines.push('none');
  } else {
    for (const locale of report.externalLocales) {
      lines.push(`[${locale.localeId}] ${locale.label}`);
      if (!locale.layers.length) {
        lines.push('  layers: none');
        continue;
      }
      for (const layer of locale.layers) {
        const suffix = [
          layer.sourceName ? `source=${layer.sourceName}` : null,
          layer.importedAt ? `importedAt=${layer.importedAt}` : null,
        ].filter(Boolean).join(', ');
        lines.push(`  - ${layer.source}${suffix ? ` (${suffix})` : ''}`);
      }
    }
  }
  lines.push('');

  lines.push('=== Glossary consistency ===');
  lines.push(`Total issues: ${report.glossaryIssues.length}`);
  lines.push(`  Sample: ${formatGlossarySample(report.glossaryIssues)}`);
  lines.push('');

  const valueOverrides = report.mergeDiagnostics.filter((entry) => entry.kind === 'value-override');
  const typeMismatches = report.mergeDiagnostics.filter((entry) => entry.kind === 'type-mismatch');
  lines.push('=== Merge diagnostics ===');
  lines.push(`Total conflicts: ${report.mergeDiagnostics.length}`);
  lines.push(`  Value overrides: ${valueOverrides.length}`);
  lines.push(`  Type mismatches: ${typeMismatches.length}`);
  lines.push(`  Sample: ${formatSampleList(report.mergeDiagnostics.map((entry) => (
    `${entry.localeId}:${entry.keyPath}:${entry.kind}`
  )))}`);

  return `${lines.join('\n').trimEnd()}\n`;
}
