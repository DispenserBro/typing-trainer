import * as fs from 'fs';
import * as path from 'path';
import { compileString } from 'sass';
import type {
  CustomThemeColors,
  InstalledTheme,
  ThemeManifest,
  ThemeRegistryState,
} from '../../shared/types';
import {
  THEME_MANIFEST_VERSION,
  THEME_STYLE_CSS_FILE_CANDIDATES,
  THEME_STYLE_SCSS_FILE_CANDIDATES,
} from '../../shared/types';

const REGISTRY_FILE = 'theme-registry.json';

export interface ThemeValidationResult {
  ok: boolean;
  errors: string[];
  manifest?: ThemeManifest;
}

type ThemeManifestValidationOptions = {
  sidecarCss?: string;
  sidecarScss?: string;
};

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .filter((entry): entry is string => typeof entry === 'string')
    .map(entry => entry.trim())
    .filter(Boolean);
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeStringRecord(value: unknown) {
  if (!value || typeof value !== 'object') return undefined;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => typeof entryValue === 'string')
    .map(([key, entryValue]) => [key.trim(), (entryValue as string).trim()] as const)
    .filter(([key, entryValue]) => key.length > 0 && entryValue.length > 0);

  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
}

function normalizeThemeColors(value: unknown): CustomThemeColors | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const colors = value as Record<string, unknown>;

  const bg = normalizeOptionalString(colors.bg);
  const surface = normalizeOptionalString(colors.surface);
  const surface2 = normalizeOptionalString(colors.surface2);
  const text = normalizeOptionalString(colors.text);
  const subtext = normalizeOptionalString(colors.subtext);
  const accent = normalizeOptionalString(colors.accent);
  const green = normalizeOptionalString(colors.green);
  const red = normalizeOptionalString(colors.red);
  const yellow = normalizeOptionalString(colors.yellow);

  if (!bg || !surface || !surface2 || !text || !subtext || !accent || !green || !red || !yellow) {
    return undefined;
  }

  return {
    bg,
    surface,
    surface2,
    surface3: normalizeOptionalString(colors.surface3),
    text,
    textDim: normalizeOptionalString(colors.textDim),
    subtext,
    accent,
    accentHover: normalizeOptionalString(colors.accentHover),
    accentDim: normalizeOptionalString(colors.accentDim),
    green,
    red,
    yellow,
    fontSans: normalizeOptionalString(colors.fontSans),
    fontMono: normalizeOptionalString(colors.fontMono),
    radius: normalizeOptionalString(colors.radius),
    radiusSm: normalizeOptionalString(colors.radiusSm),
    transitionSpeed: normalizeOptionalString(colors.transitionSpeed),
  };
}

function hasThemeStyleContent(manifest: ThemeManifest) {
  const style = manifest.style;
  return Boolean(
    style.colors
    || style.css
    || style.scss
    || (style.variables && Object.keys(style.variables).length > 0)
    || (style.bodyClasses && style.bodyClasses.length > 0)
    || (style.rootClasses && style.rootClasses.length > 0)
    || (style.bodyAttributes && Object.keys(style.bodyAttributes).length > 0)
    || (style.rootAttributes && Object.keys(style.rootAttributes).length > 0),
  );
}

function joinStyleChunks(...chunks: Array<string | undefined>) {
  const normalized = chunks
    .map(chunk => normalizeOptionalString(chunk))
    .filter((chunk): chunk is string => Boolean(chunk));
  return normalized.length > 0 ? normalized.join('\n\n') : undefined;
}

function findFirstExistingSidecarFile(manifestPath: string, candidates: readonly string[]) {
  const manifestDir = path.dirname(manifestPath);
  for (const candidate of candidates) {
    const filePath = path.join(manifestDir, candidate);
    if (!fs.existsSync(filePath)) continue;
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) continue;
    return filePath;
  }
  return undefined;
}

function readThemeStyleSidecars(manifestPath: string) {
  const cssFilePath = findFirstExistingSidecarFile(manifestPath, THEME_STYLE_CSS_FILE_CANDIDATES);
  const scssFilePath = findFirstExistingSidecarFile(manifestPath, THEME_STYLE_SCSS_FILE_CANDIDATES);

  return {
    css: cssFilePath ? normalizeOptionalString(fs.readFileSync(cssFilePath, 'utf-8')) : undefined,
    scss: scssFilePath ? normalizeOptionalString(fs.readFileSync(scssFilePath, 'utf-8')) : undefined,
  };
}

function compileThemeScss(scss: string) {
  try {
    const result = compileString(scss, {
      style: 'expanded',
    });
    const compiledCss = result.css.trim();
    return { compiledCss: compiledCss || undefined };
  } catch (error) {
    const details = error instanceof Error
      ? error.message.split('\n').map(line => line.trim()).filter(Boolean)[0] ?? error.message
      : 'Unknown SCSS compilation error.';
    return { error: `Invalid "style.scss": ${details}` };
  }
}

export function validateThemeManifest(
  raw: unknown,
  options?: ThemeManifestValidationOptions,
): ThemeValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return { ok: false, errors: ['Manifest is not a valid JSON object.'] };
  }

  const manifestLike = raw as Record<string, unknown>;
  if (typeof manifestLike.manifestVersion !== 'number') {
    errors.push('Missing or invalid "manifestVersion".');
  } else if (manifestLike.manifestVersion > THEME_MANIFEST_VERSION) {
    errors.push(`Unsupported manifestVersion ${manifestLike.manifestVersion} (max ${THEME_MANIFEST_VERSION}).`);
  }

  const id = normalizeOptionalString(manifestLike.id);
  if (!id) {
    errors.push('Missing or invalid "id".');
  } else if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(id) && id.length > 1) {
    errors.push('"id" must be kebab-case (lowercase, digits, hyphens).');
  }

  const name = normalizeOptionalString(manifestLike.name);
  if (!name) {
    errors.push('Missing or invalid "name".');
  }

  const version = normalizeOptionalString(manifestLike.version);
  if (!version) {
    errors.push('Missing or invalid "version".');
  }

  if (manifestLike.type !== 'theme') {
    errors.push('Theme "type" must be "theme".');
  }

  const styleRaw = manifestLike.style;
  if (styleRaw !== undefined && (typeof styleRaw !== 'object' || !styleRaw)) {
    errors.push('Missing or invalid "style".');
  }

  if (errors.length > 0) return { ok: false, errors };

  const styleLike = styleRaw && typeof styleRaw === 'object'
    ? styleRaw as Record<string, unknown>
    : {};
  const css = joinStyleChunks(styleLike.css as string | undefined, options?.sidecarCss);
  const scss = joinStyleChunks(styleLike.scss as string | undefined, options?.sidecarScss);
  let compiledScss: string | undefined;

  if (scss) {
    const compiledResult = compileThemeScss(scss);
    if (compiledResult.error) {
      errors.push(compiledResult.error);
    } else {
      compiledScss = compiledResult.compiledCss;
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const manifest: ThemeManifest = {
    manifestVersion: manifestLike.manifestVersion as number,
    id: id!,
    name: name!,
    version: version!,
    icon: normalizeOptionalString(manifestLike.icon),
    description: normalizeOptionalString(manifestLike.description),
    author: normalizeOptionalString(manifestLike.author),
    minAppVersion: normalizeOptionalString(manifestLike.minAppVersion),
    type: 'theme',
    preview: normalizeThemeColors(manifestLike.preview),
    style: {
      colors: normalizeThemeColors(styleLike.colors),
      variables: normalizeStringRecord(styleLike.variables),
      css,
      scss,
      compiledScss,
      bodyClasses: normalizeStringArray(styleLike.bodyClasses),
      rootClasses: normalizeStringArray(styleLike.rootClasses),
      bodyAttributes: normalizeStringRecord(styleLike.bodyAttributes),
      rootAttributes: normalizeStringRecord(styleLike.rootAttributes),
    },
  };

  if (!hasThemeStyleContent(manifest)) {
    return { ok: false, errors: ['Theme "style" must define colors, variables, CSS, classes, or attributes.'] };
  }

  return { ok: true, errors: [], manifest };
}

export function loadThemeRegistry(themesDir: string): ThemeRegistryState {
  const file = path.join(themesDir, REGISTRY_FILE);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return { themes: [] };
  }
}

export function saveThemeRegistry(themesDir: string, state: ThemeRegistryState): void {
  fs.mkdirSync(themesDir, { recursive: true });
  fs.writeFileSync(
    path.join(themesDir, REGISTRY_FILE),
    JSON.stringify(state, null, 2),
    'utf-8',
  );
}

export function scanThemes(themesDir: string): InstalledTheme[] {
  const registry = loadThemeRegistry(themesDir);

  if (!fs.existsSync(themesDir)) return [];

  const files = fs.readdirSync(themesDir)
    .filter(fileName => fileName.endsWith('.json') && fileName !== REGISTRY_FILE);

  const found: InstalledTheme[] = [];

  for (const fileName of files) {
    const filePath = path.join(themesDir, fileName);
    try {
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) continue;

      const rawText = fs.readFileSync(filePath, 'utf-8');
      const raw = JSON.parse(rawText);
      const sidecars = readThemeStyleSidecars(filePath);
      const result = validateThemeManifest(raw, {
        sidecarCss: sidecars.css,
        sidecarScss: sidecars.scss,
      });
      if (!result.ok || !result.manifest) continue;

      const existing = registry.themes.find(theme => theme.id === result.manifest!.id);
      found.push({
        id: result.manifest.id,
        manifest: result.manifest,
        fileName,
        installedAt: existing?.installedAt ?? new Date().toISOString(),
      });
    } catch {
      // Skip broken files silently
    }
  }

  saveThemeRegistry(themesDir, {
    themes: found.map(theme => ({
      id: theme.id,
      fileName: theme.fileName,
      installedAt: theme.installedAt,
    })),
  });

  return found;
}

export function installThemeFromJSON(
  themesDir: string,
  jsonContent: string,
): { ok: boolean; error?: string; theme?: InstalledTheme } {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonContent);
  } catch {
    return { ok: false, error: 'Invalid JSON.' };
  }

  const result = validateThemeManifest(raw);
  if (!result.ok || !result.manifest) {
    return { ok: false, error: result.errors.join(' ') };
  }

  const manifest = result.manifest;
  const fileName = `${manifest.id}.json`;

  fs.mkdirSync(themesDir, { recursive: true });
  fs.writeFileSync(
    path.join(themesDir, fileName),
    JSON.stringify(manifest, null, 2),
    'utf-8',
  );

  const registry = loadThemeRegistry(themesDir);
  const installedTheme: InstalledTheme = {
    id: manifest.id,
    manifest,
    fileName,
    installedAt: new Date().toISOString(),
  };

  const registryEntry = {
    id: installedTheme.id,
    fileName: installedTheme.fileName,
    installedAt: installedTheme.installedAt,
  };

  const existingIndex = registry.themes.findIndex(theme => theme.id === manifest.id);
  if (existingIndex >= 0) {
    registry.themes[existingIndex] = registryEntry;
  } else {
    registry.themes.push(registryEntry);
  }

  saveThemeRegistry(themesDir, registry);
  return { ok: true, theme: installedTheme };
}

export function installThemeFromFile(
  themesDir: string,
  manifestPath: string,
): { ok: boolean; error?: string; theme?: InstalledTheme } {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch {
    return { ok: false, error: 'Invalid JSON.' };
  }

  const sidecars = readThemeStyleSidecars(manifestPath);
  const result = validateThemeManifest(raw, {
    sidecarCss: sidecars.css,
    sidecarScss: sidecars.scss,
  });
  if (!result.ok || !result.manifest) {
    return { ok: false, error: result.errors.join(' ') };
  }

  const manifest = result.manifest;
  const fileName = `${manifest.id}.json`;

  fs.mkdirSync(themesDir, { recursive: true });
  fs.writeFileSync(
    path.join(themesDir, fileName),
    JSON.stringify(manifest, null, 2),
    'utf-8',
  );

  const registry = loadThemeRegistry(themesDir);
  const installedTheme: InstalledTheme = {
    id: manifest.id,
    manifest,
    fileName,
    installedAt: new Date().toISOString(),
  };

  const registryEntry = {
    id: installedTheme.id,
    fileName: installedTheme.fileName,
    installedAt: installedTheme.installedAt,
  };

  const existingIndex = registry.themes.findIndex(theme => theme.id === manifest.id);
  if (existingIndex >= 0) {
    registry.themes[existingIndex] = registryEntry;
  } else {
    registry.themes.push(registryEntry);
  }

  saveThemeRegistry(themesDir, registry);
  return { ok: true, theme: installedTheme };
}

export function removeTheme(
  themesDir: string,
  themeId: string,
): boolean {
  const registry = loadThemeRegistry(themesDir);
  const theme = registry.themes.find(entry => entry.id === themeId);
  if (!theme) return false;

  const filePath = path.join(themesDir, theme.fileName);
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
  }

  registry.themes = registry.themes.filter(entry => entry.id !== themeId);
  saveThemeRegistry(themesDir, registry);
  return true;
}
