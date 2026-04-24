/**
 * Addon merger — merges enabled addon resources into the base application data.
 * Works only with content addons (InstalledAddon), not mods.
 * Pure functions, no fs access — can run both in main and renderer.
 */
import type {
  LayoutsData, Layout, LanguageInfo, Lesson,
  GameItemDefinition, GameAchievementDefinition,
  CustomThemes, CustomThemeColors,
  PracticeContentPack,
  InterfaceLocaleDefinition,
} from '../../shared/types';
import type {
  AddonInterfaceLocaleDefinition,
  InstalledAddon,
  InstalledMod,
  AddonResources,
} from '../../shared/types/addon';
import {
  mergeTranslationDictionaries,
  normalizeExternalInterfaceLocaleDefinitions,
} from '../i18n/resources';

/** Returns AddonResources if the addon is enabled */
function enabledResources(addon: InstalledAddon): AddonResources | undefined {
  if (!addon.enabled) return undefined;
  return addon.manifest.resources;
}

function getAddonInterfaceLocaleInputs(addon: InstalledAddon): AddonInterfaceLocaleDefinition[] {
  const res = enabledResources(addon);
  return [
    ...(res?.interfaceLocales?.locales ?? []),
    ...(res?.locales ?? []),
    ...(addon.manifest.locales ?? []),
  ];
}

/* ── Merge words ────────────────────────────────────────── */

export function mergeAddonWords(
  baseWords: string[],
  lang: string,
  addons: InstalledAddon[],
): string[] {
  const extra: string[] = [];
  for (const addon of addons) {
    const res = enabledResources(addon);
    if (!res?.words) continue;
    for (const wp of res.words) {
      if (wp.lang === lang) {
        extra.push(...wp.words);
      }
    }
  }
  if (extra.length === 0) return baseWords;

  const set = new Set(baseWords);
  for (const w of extra) set.add(w);
  return Array.from(set);
}

/* ── Merge layouts & languages ──────────────────────────── */

export function mergeAddonLayouts(
  baseLayouts: LayoutsData,
  addons: InstalledAddon[],
): LayoutsData {
  let languages = [...baseLayouts.languages];
  const layouts = { ...baseLayouts.layouts };

  for (const addon of addons) {
    const res = enabledResources(addon);
    if (!res) continue;

    // New languages
    if (res.languages) {
      for (const langRes of res.languages) {
        if (!languages.find(l => l.id === langRes.language.id)) {
          languages.push(langRes.language);
        }
      }
    }

    // New layouts
    if (res.layouts) {
      for (const lr of res.layouts) {
        layouts[lr.id] = lr.layout;
      }
    }

    // Extra lessons for existing layouts — force section = addon name
    if (res.lessons) {
      for (const lr of res.lessons) {
        const existing = layouts[lr.layoutId];
        if (existing) {
          const addonSection = `📦 ${addon.manifest.name}`;
          const newLessons = lr.lessons
            .filter((l: Lesson) => !existing.lessonOrder.some(el => el.id === l.id))
            .map((l: Lesson) => ({ ...l, section: l.section ? `${addonSection}: ${l.section}` : addonSection }));
          layouts[lr.layoutId] = {
            ...existing,
            lessonOrder: [
              ...existing.lessonOrder,
              ...newLessons,
            ],
          };
        }
      }
    }
  }

  return { languages, layouts };
}

/* ── Merge game items ───────────────────────────────────── */

export function mergeAddonItems(
  baseItems: GameItemDefinition[],
  addons: InstalledAddon[],
): GameItemDefinition[] {
  const extra: GameItemDefinition[] = [];
  const baseIds = new Set(baseItems.map(i => i.id));

  for (const addon of addons) {
    const res = enabledResources(addon);
    if (!res?.items?.items) continue;
    for (const item of res.items.items) {
      if (!baseIds.has(item.id)) {
        extra.push(item);
        baseIds.add(item.id);
      }
    }
  }

  return extra.length === 0 ? baseItems : [...baseItems, ...extra];
}

/* ── Merge achievements ─────────────────────────────────── */

export function mergeAddonAchievements(
  baseAchievements: GameAchievementDefinition[],
  addons: InstalledAddon[],
): GameAchievementDefinition[] {
  const extra: GameAchievementDefinition[] = [];
  const baseIds = new Set(baseAchievements.map(a => a.id));

  for (const addon of addons) {
    const res = enabledResources(addon);
    if (!res?.achievements?.achievements) continue;
    
    for (const ach of res.achievements.achievements) {
      if (!baseIds.has(ach.id)) {
        const normalized = {
          ...ach,
          category: ach.category || 'game',
        } as GameAchievementDefinition;
        extra.push(normalized);
        baseIds.add(ach.id);
      }
    }
  }

  return extra.length === 0 ? baseAchievements : [...baseAchievements, ...extra];
}

/* ── Merge themes ───────────────────────────────────────── */

export function mergeAddonThemes(
  baseThemes: CustomThemes,
  addons: InstalledAddon[],
): CustomThemes {
  const merged = { ...baseThemes };
  let changed = false;

  for (const addon of addons) {
    const res = enabledResources(addon);
    if (!res?.themes?.themes) continue;
    for (const [name, colors] of Object.entries(res.themes.themes) as [string, CustomThemeColors][]) {
      if (!merged[name]) {
        merged[name] = colors;
        changed = true;
      }
    }
  }

  return changed ? merged : baseThemes;
}

/* ── Merge practice content packs ──────────────────────── */

export function mergeAddonPracticePacks(
  basePacks: PracticeContentPack[],
  addons: InstalledAddon[],
): PracticeContentPack[] {
  const merged = [...basePacks];
  const knownIds = new Set(basePacks.map(pack => pack.id));

  for (const addon of addons) {
    const res = enabledResources(addon);
    if (!res?.practicePacks?.packs) continue;
    for (const pack of res.practicePacks.packs) {
      if (knownIds.has(pack.id)) continue;
      merged.push({
        ...pack,
        origin: 'addon',
        sourceLabel: addon.manifest.name,
        addonId: addon.id,
      });
      knownIds.add(pack.id);
    }
  }

  return merged;
}

/* ── Collect addon interface locales ───────────────────── */

export function collectAddonInterfaceLocales(
  addons: InstalledAddon[],
): InterfaceLocaleDefinition[] {
  const merged = new Map<string, InterfaceLocaleDefinition>();

  for (const addon of addons) {
    if (!addon.enabled) continue;
    const localeInputs = getAddonInterfaceLocaleInputs(addon);
    if (!localeInputs.length) continue;

    const normalizedLocales = normalizeExternalInterfaceLocaleDefinitions(
      localeInputs.map((locale) => ({
        ...locale,
        sourceName: addon.manifest.name,
      })),
      'addon',
    );

    for (const locale of normalizedLocales) {
      const existing = merged.get(locale.id);
      if (!existing) {
        merged.set(locale.id, locale);
        continue;
      }

      merged.set(locale.id, {
        ...existing,
        label: existing.label || locale.label,
        nativeLabel: existing.nativeLabel || locale.nativeLabel,
        dictionary: mergeTranslationDictionaries(existing.dictionary, locale.dictionary),
      });
    }
  }

  return Array.from(merged.values());
}

/* ── Collect mod interface locales ─────────────────────── */

export function collectModInterfaceLocales(
  _mods: InstalledMod[],
): InterfaceLocaleDefinition[] {
  // Mods register interface locales at runtime through api.i18n or declarative
  // locales/*.json and locales/*.po files. Manifest-level mod locales are ignored.
  return [];
}

/* ── Collect extra words for addon languages ────────────── */

export function getAddonLanguageWords(
  lang: string,
  addons: InstalledAddon[],
): string[] {
  for (const addon of addons) {
    const res = enabledResources(addon);
    if (!res?.languages) continue;
    for (const lr of res.languages) {
      if (lr.language.id === lang) return lr.words;
    }
  }
  return [];
}
