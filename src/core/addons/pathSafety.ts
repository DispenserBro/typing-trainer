import * as path from 'path';

export function isResolvedPathInside(parentDir: string, targetPath: string): boolean {
  const relative = path.relative(path.resolve(parentDir), path.resolve(targetPath));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function resolveSafeRegistryFilePath(parentDir: string, fileName: string): string | null {
  if (
    !fileName
    || path.basename(fileName) !== fileName
    || path.win32.basename(fileName) !== fileName
    || path.posix.basename(fileName) !== fileName
  ) {
    return null;
  }

  const targetPath = path.resolve(parentDir, fileName);
  return isResolvedPathInside(parentDir, targetPath) ? targetPath : null;
}
