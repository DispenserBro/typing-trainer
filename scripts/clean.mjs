import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';

const targets = ['dist', 'dist-debug', 'dist-build'];

function tryRemove(targetPath) {
  try {
    rmSync(targetPath, {
      recursive: true,
      force: true,
      maxRetries: 2,
      retryDelay: 100,
    });
    return true;
  } catch (error) {
    return error;
  }
}

function cleanTarget(targetPath) {
  if (!existsSync(targetPath)) {
    return;
  }

  const removalResult = tryRemove(targetPath);
  if (removalResult === true) {
    return;
  }

  const error = removalResult;
  const isDirectory = existsSync(targetPath) && statSync(targetPath).isDirectory();

  if (!isDirectory || path.basename(targetPath) !== 'dist-build') {
    console.warn(`[clean] skipped ${targetPath}: ${error.code ?? error.message}`);
    return;
  }

  for (const entry of readdirSync(targetPath)) {
    const entryPath = path.join(targetPath, entry);
    const childRemoval = tryRemove(entryPath);
    if (childRemoval !== true) {
      console.warn(`[clean] skipped ${entryPath}: ${childRemoval.code ?? childRemoval.message}`);
    }
  }
}

for (const target of targets) {
  cleanTarget(path.resolve(process.cwd(), target));
}
