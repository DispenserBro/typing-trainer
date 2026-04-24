import { mergeAddonThemes } from '../../core/addons/addonMerger';
import type {
  CustomThemes,
  InstalledAddon,
  InstalledTheme,
  ThemeDefinition,
  ThemeDefinitions,
} from '../../shared/types';

function createLegacyThemeDefinition(
  id: string,
  source: ThemeDefinition['source'],
  colors: CustomThemes[string],
): ThemeDefinition {
  return {
    id,
    label: id,
    source,
    editable: source === 'custom',
    deletable: source === 'custom',
    preview: colors,
    style: { colors },
  };
}

export function buildAvailableThemeDefinitions({
  customThemes,
  addons,
  installedThemes,
}: {
  customThemes: CustomThemes;
  addons: InstalledAddon[];
  installedThemes: InstalledTheme[];
}): ThemeDefinitions {
  const definitions: ThemeDefinitions = {};

  for (const [id, colors] of Object.entries(customThemes)) {
    definitions[id] = createLegacyThemeDefinition(id, 'custom', colors);
  }

  const addonThemes = mergeAddonThemes({}, addons);
  for (const [id, colors] of Object.entries(addonThemes)) {
    if (definitions[id]) continue;
    definitions[id] = createLegacyThemeDefinition(id, 'addon', colors);
  }

  for (const theme of installedThemes) {
    if (definitions[theme.id]) continue;
    definitions[theme.id] = {
      id: theme.id,
      label: theme.manifest.name,
      source: 'package',
      editable: false,
      deletable: true,
      icon: theme.manifest.icon,
      description: theme.manifest.description,
      version: theme.manifest.version,
      preview: theme.manifest.preview ?? theme.manifest.style.colors,
      style: theme.manifest.style,
    };
  }

  return definitions;
}
