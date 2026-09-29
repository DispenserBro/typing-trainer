const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');

const code = fs.readFileSync(path.resolve('dist/main/autoUpdates.js'), 'utf8');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'typing-trainer-updates-'));
const marker = path.join(fixture, 'typing-trainer-portable.json');
function start({ portable = false, packaged = true, platform = 'win32', smoke = false, disabled = false } = {}) {
  if (portable) fs.writeFileSync(marker, '{}');
  else if (fs.existsSync(marker)) fs.unlinkSync(marker);
  const timers = [];
  const events = [];
  let checks = 0;
  const updater = { on: name => events.push(name), checkForUpdates: () => { checks++; return Promise.resolve(); } };
  const module = { exports: {} };
  vm.runInNewContext(code, {
    exports: module.exports,
    require(name) {
      if (name === 'electron') return { app: { isPackaged: packaged, getPath: () => path.join(fixture, 'Typing Trainer.exe') } };
      if (name === 'electron-updater') return { autoUpdater: updater };
      return require(name);
    },
    process: { platform, argv: smoke ? ['--platform-smoke'] : [], env: disabled ? { TYPING_TRAINER_DISABLE_AUTO_UPDATE: '1' } : {} },
    setTimeout: fn => timers.push(fn),
    console: { log() {}, error() {} },
  });
  module.exports.startAutoUpdates(() => null);
  module.exports.startAutoUpdates(() => null);
  timers.forEach(fn => fn());
  return { timers: timers.length, events: events.length, checks, updater };
}
try {
  for (const options of [{ portable: true }, { packaged: false }, { smoke: true }, { disabled: true }]) {
    const result = start(options);
    assert.equal(result.timers, 0, JSON.stringify(options));
    assert.equal(result.events, 0);
    assert.equal(result.checks, 0);
    assert.equal(result.updater.autoDownload, undefined);
  }
  for (const options of [{}, { portable: true, platform: 'darwin' }, { portable: true, platform: 'linux' }]) {
    const result = start(options);
    assert.equal(result.timers, 1, 'Repeated start must not register another update check');
    assert.equal(result.checks, 1);
    assert.equal(result.updater.autoDownload, true);
    assert.equal(result.updater.autoInstallOnAppQuit, true);
  }
  console.log('Auto-update diagnostics passed: portable never starts updater; installed builds retain one automatic check.');
} finally {
  if (fs.existsSync(marker)) fs.unlinkSync(marker);
  fs.rmdirSync(fixture);
}
