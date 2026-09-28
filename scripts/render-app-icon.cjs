// Растеризация исходного SVG для пакетов Linux/macOS без изменения дизайна.
const { app, BrowserWindow } = require('electron');
const { readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.whenReady().then(async () => {
  const svg = readFileSync(path.join(__dirname, '../data/app-icon.svg'), 'utf8');
  const window = new BrowserWindow({
    width: 1024, height: 1024, show: false, frame: false, transparent: true,
    webPreferences: { offscreen: true, backgroundThrottling: false, contextIsolation: true, nodeIntegration: false },
  });
  try {
    await window.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(
      '<style>html,body{margin:0;width:100%;height:100%;background:transparent}svg{display:block;width:100%;height:100%}</style>' + svg,
    ));
    await window.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    const image = await window.webContents.capturePage();
    const pixels = image.toBitmap();
    let coloredPixels = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] > 0 && Math.abs(pixels[index] - pixels[index + 2]) > 20) coloredPixels++;
    }
    if (coloredPixels < 1000) throw new Error('Icon has not rendered; refusing to replace the PNG');
    const size = image.getSize();
    if (size.width !== 1024 || size.height !== 1024) throw new Error('Unexpected icon dimensions');
    writeFileSync(path.join(__dirname, '../data/app-icon.png'), image.toPNG());
    console.log('Rendered data/app-icon.png: 1024x1024');
  } finally {
    window.destroy();
    app.quit();
  }
}).catch(error => { console.error(error); app.exit(1); });
