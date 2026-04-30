import type { CustomThemeColors, ThemeDefinitions } from '../../shared/types';
import { BUILT_IN_THEMES } from './appDefaults';

const THEME_RESET_VARS = [
  '--bg',
  '--surface',
  '--surface2',
  '--surface3',
  '--text',
  '--text-dim',
  '--subtext',
  '--accent',
  '--accent-hover',
  '--accent-dim',
  '--green',
  '--red',
  '--yellow',
  '--font-sans',
  '--font-mono',
  '--radius',
  '--radius-sm',
  '--transition',
] as const;

type AppliedRuntimeThemeState = {
  bodyAttributes: string[];
  bodyClasses: string[];
  rootAttributes: string[];
  rootClasses: string[];
  styleElement?: HTMLStyleElement;
};

const appliedRuntimeThemeState: AppliedRuntimeThemeState = {
  bodyAttributes: [],
  bodyClasses: [],
  rootAttributes: [],
  rootClasses: [],
};

const RUNTIME_THEME_GUARD_CSS = `
body[data-theme="custom"] .mode-panel {
  background: transparent !important;
  background-image: none !important;
}
`.trim();

function isColorString(value?: string) {
  return Boolean(value && value.trim().length > 0);
}

function colorDim(value: string, amount: string) {
  return `color-mix(in srgb, ${value} ${amount}, transparent)`;
}

function deriveThemeVariables(colors: CustomThemeColors) {
  const accent = colors.accent;
  const subtext = colors.textDim ?? colors.subtext;

  return {
    '--bg': colors.bg,
    '--surface': colors.surface,
    '--surface2': colors.surface2,
    '--surface3': colors.surface3 ?? colors.surface2,
    '--text': colors.text,
    '--text-dim': subtext,
    '--subtext': colors.subtext,
    '--accent': accent,
    '--accent-hover': colors.accentHover ?? accent,
    '--accent-dim': colors.accentDim ?? colorDim(accent, '15%'),
    '--green': colors.green,
    '--red': colors.red,
    '--yellow': colors.yellow,
    '--font-sans': colors.fontSans,
    '--font-mono': colors.fontMono,
    '--radius': colors.radius,
    '--radius-sm': colors.radiusSm,
    '--transition': colors.transitionSpeed ? `${colors.transitionSpeed} ease` : undefined,
  };
}

function clearRuntimeTheme(root: HTMLElement, body: HTMLElement) {
  const runtimeStyle = appliedRuntimeThemeState.styleElement;
  if (runtimeStyle) {
    runtimeStyle.remove();
    appliedRuntimeThemeState.styleElement = undefined;
  }

  for (const attribute of appliedRuntimeThemeState.rootAttributes) {
    root.removeAttribute(attribute);
  }
  for (const attribute of appliedRuntimeThemeState.bodyAttributes) {
    body.removeAttribute(attribute);
  }
  for (const className of appliedRuntimeThemeState.rootClasses) {
    root.classList.remove(className);
  }
  for (const className of appliedRuntimeThemeState.bodyClasses) {
    body.classList.remove(className);
  }

  appliedRuntimeThemeState.rootAttributes = [];
  appliedRuntimeThemeState.bodyAttributes = [];
  appliedRuntimeThemeState.rootClasses = [];
  appliedRuntimeThemeState.bodyClasses = [];
}

function resetThemeVariables(root: CSSStyleDeclaration) {
  THEME_RESET_VARS.forEach(variable => root.removeProperty(variable));
}

function applyVariableEntries(root: CSSStyleDeclaration, entries?: Record<string, string>) {
  if (!entries) return;
  for (const [key, value] of Object.entries(entries)) {
    if (!key.startsWith('--') || !value.trim()) continue;
    root.setProperty(key, value);
  }
}

function applyAttributeEntries(node: HTMLElement, entries: Record<string, string> | undefined, collector: string[]) {
  if (!entries) return;
  for (const [key, value] of Object.entries(entries)) {
    if (!key.trim() || !value.trim()) continue;
    node.setAttribute(key, value);
    collector.push(key);
  }
}

function applyClassEntries(node: HTMLElement, classes: string[] | undefined, collector: string[]) {
  if (!classes) return;
  for (const className of classes) {
    if (!className.trim()) continue;
    node.classList.add(className);
    collector.push(className);
  }
}

function applyRuntimeTheme(
  name: string,
  availableThemes: ThemeDefinitions,
) {
  const theme = availableThemes[name];
  if (!theme) return;

  const rootNode = document.documentElement;
  const bodyNode = document.body;
  const rootStyle = rootNode.style;

  bodyNode.setAttribute('data-theme', 'custom');
  resetThemeVariables(rootStyle);

  const derivedVariables = theme.style.colors ? deriveThemeVariables(theme.style.colors) : undefined;
  if (derivedVariables) {
    for (const [key, value] of Object.entries(derivedVariables)) {
      if (!isColorString(value)) continue;
      rootStyle.setProperty(key, value as string);
    }
  }

  applyVariableEntries(rootStyle, theme.style.variables);
  applyClassEntries(rootNode, theme.style.rootClasses, appliedRuntimeThemeState.rootClasses);
  applyClassEntries(bodyNode, theme.style.bodyClasses, appliedRuntimeThemeState.bodyClasses);
  applyAttributeEntries(rootNode, theme.style.rootAttributes, appliedRuntimeThemeState.rootAttributes);
  applyAttributeEntries(bodyNode, theme.style.bodyAttributes, appliedRuntimeThemeState.bodyAttributes);

  const runtimeCss = [theme.style.css, theme.style.compiledScss, RUNTIME_THEME_GUARD_CSS]
    .filter((chunk): chunk is string => Boolean(chunk && chunk.trim()))
    .join('\n\n');

  if (runtimeCss) {
    const styleElement = document.createElement('style');
    styleElement.setAttribute('data-theme-css', theme.id);
    styleElement.textContent = runtimeCss;
    document.head.appendChild(styleElement);
    appliedRuntimeThemeState.styleElement = styleElement;
  }
}

export function applyThemeDom(name: string, availableThemes: ThemeDefinitions) {
  const rootNode = document.documentElement;
  const bodyNode = document.body;
  const rootStyle = rootNode.style;

  clearRuntimeTheme(rootNode, bodyNode);

  if (BUILT_IN_THEMES.includes(name)) {
    bodyNode.setAttribute('data-theme', name);
    resetThemeVariables(rootStyle);
    return;
  }

  if (!availableThemes[name]) {
    const fallbackTheme = BUILT_IN_THEMES[0] || 'dark-orange';
    bodyNode.setAttribute('data-theme', fallbackTheme);
    resetThemeVariables(rootStyle);
    return;
  }

  applyRuntimeTheme(name, availableThemes);
}
