import { existsSync, mkdtempSync, readFileSync, readdirSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// Already supplied by the pinned electron-builder dependency.
const { path7za } = require('7zip-bin');
export const portableMarker = 'typing-trainer-portable.json';

export async function runPortableTool(command, args, cwd, timeout = 0) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: false, stdio: 'inherit', timeout });
    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (code !== 0 || signal) reject(new Error(`Portable tool failed: ${command} (code=${code}, signal=${signal})`));
      else resolve();
    });
  });
}

export async function createWindowsPortableArchives(outputDir, version) {
  const root = path.resolve(outputDir);
  const packages = readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && /^win(?:-(?:ia32|arm64))?-unpacked$/.test(entry.name));
  if (packages.length === 0) throw new Error('No unpacked Windows app found for portable ZIP.');

  const archives = [];
  for (const entry of packages) {
    const appDir = path.join(root, entry.name);
    const arch = entry.name === 'win-unpacked' ? 'x64' : entry.name.split('-')[1];
    for (const required of ['Typing Trainer.exe', 'resources/app.asar']) {
      if (!existsSync(path.join(appDir, required))) throw new Error(`Portable app missing ${required}`);
    }
    // Never distribute an already-run portable profile.
    if (existsSync(path.join(appDir, 'data'))) throw new Error('Unpacked app contains user data; rebuild in a clean output directory.');
    const archive = path.join(root, `Typing-Trainer-${version}-win-${arch}-portable.zip`);
    if (existsSync(archive)) throw new Error(`Refusing to update an existing release archive: ${archive}`);
    const staging = mkdtempSync(path.join(root, 'portable-metadata-'));
    try {
      writeFileSync(path.join(staging, portableMarker), JSON.stringify({ portable: true, version }) + '\n');
      writeFileSync(path.join(staging, 'PORTABLE-README.txt'), readFileSync('docs/windows-portable.txt'));
      await runPortableTool(path7za, ['a', '-tzip', '-mx=5', archive, '.'], appDir);
      await runPortableTool(path7za, ['a', '-tzip', archive, portableMarker, 'PORTABLE-README.txt'], staging);
      await runPortableTool(path7za, ['t', archive], root);
      archives.push(archive);
      console.log(`[portable] ZIP ready: ${archive}`);
    } finally {
      for (const name of [portableMarker, 'PORTABLE-README.txt']) {
        const file = path.join(staging, name);
        if (existsSync(file)) unlinkSync(file);
      }
      rmdirSync(staging);
    }
  }
  return archives;
}
