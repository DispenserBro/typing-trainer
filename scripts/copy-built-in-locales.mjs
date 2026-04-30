import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const outputDir = process.argv[2];

if (!outputDir) {
  throw new Error('Missing output directory. Usage: node scripts/copy-built-in-locales.mjs <dist-dir>');
}

const sourceDir = path.resolve(process.cwd(), 'src', 'core', 'i18n', 'locales');
const targetDir = path.resolve(process.cwd(), outputDir, 'core', 'i18n', 'locales');

if (!existsSync(sourceDir) || !statSync(sourceDir).isDirectory()) {
  throw new Error(`Built-in locale source directory not found: ${sourceDir}`);
}

mkdirSync(targetDir, { recursive: true });

for (const entry of readdirSync(sourceDir)) {
  if (!entry.endsWith('.po')) continue;
  copyFileSync(path.join(sourceDir, entry), path.join(targetDir, entry));
}
