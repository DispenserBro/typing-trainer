import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const targetFile = path.join(
  process.cwd(),
  'node_modules',
  'app-builder-lib',
  'out',
  'node-module-collector',
  'nodeModulesCollector.js',
);

const argsOriginalSnippet = 'args = ["/c", `"${tempBatFile}"`, ...args];';
const argsPatchedSnippet = 'args = ["/d", "/s", "/c", tempBatFile, ...args];';

const shellOriginalSnippet =
  'shell: true, // `true`` is now required: https://github.com/electron-userland/electron-builder/issues/9488';

const shellLegacyPatchedSnippet =
  'shell: false, // direct spawn avoids Node 24 DEP0190 warnings and works with the cmd.exe wrapper above';

const shellPatchedSnippet =
  'shell: false, // direct spawn avoids Node 24 DEP0190 warnings once cmd.exe is invoked explicitly';

export function applyElectronBuilderPatch() {
  const fileContents = readFileSync(targetFile, 'utf8');
  let nextContents = fileContents;

  if (
    fileContents.includes(argsPatchedSnippet) &&
    fileContents.includes(shellPatchedSnippet)
  ) {
    return false;
  }

  if (nextContents.includes(argsOriginalSnippet)) {
    nextContents = nextContents.replace(argsOriginalSnippet, argsPatchedSnippet);
  }

  if (nextContents.includes(shellOriginalSnippet)) {
    nextContents = nextContents.replace(shellOriginalSnippet, shellPatchedSnippet);
  } else if (nextContents.includes(shellLegacyPatchedSnippet)) {
    nextContents = nextContents.replace(shellLegacyPatchedSnippet, shellPatchedSnippet);
  }

  if (nextContents === fileContents) {
    throw new Error(`Cannot patch electron-builder: expected snippets not found in ${targetFile}`);
  }

  writeFileSync(targetFile, nextContents, 'utf8');
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  applyElectronBuilderPatch();
}
