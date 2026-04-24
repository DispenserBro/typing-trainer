import type { LayoutsData, UserSettings } from '../../shared/types';

export type CurrentLanguageLayoutState = {
  language: string;
  layout: string;
};

export function resolveCurrentLanguageLayoutState(
  settings: UserSettings,
  layouts: LayoutsData,
): CurrentLanguageLayoutState {
  const availableLanguages = layouts.languages ?? [];
  const language = settings.language && availableLanguages.some(item => item.id === settings.language)
    ? settings.language
    : availableLanguages[0]?.id ?? 'en';

  const compatibleLayouts = Object.entries(layouts.layouts)
    .filter(([, layout]) => layout.lang === language);
  const layout = settings.layout
    && layouts.layouts[settings.layout]
    && layouts.layouts[settings.layout].lang === language
    ? settings.layout
    : compatibleLayouts[0]?.[0] ?? Object.keys(layouts.layouts)[0] ?? '';

  return { language, layout };
}
