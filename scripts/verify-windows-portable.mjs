import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createRequire } from 'node:module';
import { portableMarker, runPortableTool } from './build-windows-portable.mjs';

if (process.platform !== 'win32') throw new Error('The packaged portable smoke check requires Windows.');
const archive = path.resolve(process.argv[2] ?? '');
if (!archive.endsWith('-portable.zip') || !existsSync(archive)) throw new Error('Pass an existing Windows portable ZIP.');
const { path7za } = createRequire(import.meta.url)('7zip-bin');
const parent = path.dirname(archive);
const fixture = mkdtempSync(path.join(parent, 'portable-smoke-'));
const unpacked = path.join(fixture, 'first');
const moved = path.join(fixture, 'moved');
try {
  await runPortableTool(path7za, ['x', archive, `-o${unpacked}`, '-y'], parent);
  assert.ok(existsSync(path.join(unpacked, portableMarker)));
  assert.ok(existsSync(path.join(unpacked, 'PORTABLE-README.txt')));
  assert.ok(!existsSync(path.join(unpacked, 'data')), 'Archive must not contain a user profile');
  const run = directory => runPortableTool(path.join(directory, 'Typing Trainer.exe'), ['--platform-smoke'], directory, 60000);
  await run(unpacked);
  const progressFile = path.join(unpacked, 'data', 'progress.json');
  const progress = JSON.parse(readFileSync(progressFile, 'utf8'));
  progress.settings = { ...progress.settings, fontSize: 27 };
  writeFileSync(progressFile, JSON.stringify(progress));
  // Windows scanners and Electron child processes may briefly retain file handles.
  for (let attempt = 0; ; attempt++) {
    try {
      renameSync(unpacked, moved);
      break;
    } catch (error) {
      if (attempt >= 20 || !['EPERM', 'EACCES', 'EBUSY'].includes(error.code)) throw error;
      await delay(250);
    }
  }
  await run(moved);
  const restored = JSON.parse(readFileSync(path.join(moved, 'data', 'progress.json'), 'utf8'));
  const smoke = JSON.parse(readFileSync(path.join(moved, 'data', 'platform-smoke.json'), 'utf8'));
  assert.equal(restored.settings.fontSize, 27, 'Progress must survive moving and restarting the portable app');
  assert.equal(smoke.isPackaged, true);
  assert.equal(path.resolve(smoke.userDataPath), path.join(moved, 'data'));
  console.log('[portable] Packaged launch, writable data, relocation and progress reload passed.');
} finally {
  // Only remove this script's freshly allocated fixture within the verified archive directory.
  const resolved = path.resolve(fixture);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('portable-smoke-')) {
    throw new Error('Unsafe portable smoke cleanup path');
  }
  rmSync(resolved, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
}
