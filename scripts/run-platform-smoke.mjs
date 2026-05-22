import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const electronCli = path.resolve('node_modules', 'electron', 'cli.js');

if (!existsSync(electronCli)) {
  throw new Error(`Electron CLI was not found: ${electronCli}`);
}

const electronArgs = ['.', '--platform-smoke'];
if (process.platform === 'linux' && process.env.GITHUB_ACTIONS === 'true') {
  electronArgs.unshift('--no-sandbox');
}

const child = spawn(process.execPath, [electronCli, ...electronArgs], {
  cwd: process.cwd(),
  shell: false,
  stdio: 'inherit',
});

child.on('error', (error) => {
  throw error;
});

child.on('close', (code, signal) => {
  if (signal) {
    console.error(`Platform smoke terminated by ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 0);
});
