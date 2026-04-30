import type { ModModeDefinition } from '../addons/modApi';

export type SidebarGroup = 'top' | 'bottom';

export type SidebarModeDescriptor = {
  group: SidebarGroup;
  icon: string;
  id: string;
  label: string;
};

export type BuiltInSidebarLabels = {
  addons: string;
  game: string;
  lessons: string;
  practice: string;
  settings: string;
  stats: string;
  survival: string;
  test: string;
};

export type SidebarViewModel = {
  bottom: SidebarModeDescriptor[];
  homeActive: boolean;
  top: SidebarModeDescriptor[];
  visible: SidebarModeDescriptor[];
};

export function getBuiltInSidebarModes(labels: BuiltInSidebarLabels): SidebarModeDescriptor[] {
  return [
    { id: 'practice', label: labels.practice, group: 'top', icon: 'target' },
    { id: 'test', label: labels.test, group: 'top', icon: 'clock' },
    { id: 'survival', label: labels.survival, group: 'top', icon: 'shield' },
    { id: 'lessons', label: labels.lessons, group: 'top', icon: 'book-open' },
    { id: 'game', label: labels.game, group: 'top', icon: 'gamepad-2' },
    { id: 'stats', label: labels.stats, group: 'bottom', icon: 'bar-chart-3' },
    { id: 'addons', label: labels.addons, group: 'bottom', icon: 'puzzle' },
    { id: 'settings', label: labels.settings, group: 'bottom', icon: 'settings' },
  ];
}

export function getSidebarModeActive(currentMode: string, modeId: string) {
  if (modeId === 'survival') {
    return currentMode === 'survival' || currentMode === 'flawless';
  }
  return currentMode === modeId;
}

export function buildSidebarViewModel(args: {
  builtInLabels: BuiltInSidebarLabels;
  currentMode: string;
  disabledSections: string[];
  modModes: ModModeDefinition[];
}): SidebarViewModel {
  const disabled = new Set(args.disabledSections);
  const builtInModes = getBuiltInSidebarModes(args.builtInLabels);
  const modEntries = args.modModes.map<SidebarModeDescriptor>(mode => ({
    id: `mod:${mode.id}`,
    label: mode.label,
    group: mode.group,
    icon: mode.icon || 'box',
  }));
  const visible = [...builtInModes, ...modEntries].filter(mode => !disabled.has(mode.id));

  return {
    bottom: visible.filter(mode => mode.group === 'bottom'),
    homeActive: args.currentMode === 'home',
    top: visible.filter(mode => mode.group === 'top'),
    visible,
  };
}
