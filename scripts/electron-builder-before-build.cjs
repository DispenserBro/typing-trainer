const fs = require('fs');
const path = require('path');

function removeIfExists(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return false;
  }

  fs.rmSync(targetPath, { recursive: true, force: true });
  return true;
}

function removeParcelWatcherPackages(nodeModulesDir) {
  const parcelScopeDir = path.join(nodeModulesDir, '@parcel');
  if (!fs.existsSync(parcelScopeDir)) {
    return 0;
  }

  let removed = 0;
  for (const entry of fs.readdirSync(parcelScopeDir)) {
    if (!entry.startsWith('watcher')) {
      continue;
    }

    if (removeIfExists(path.join(parcelScopeDir, entry))) {
      removed += 1;
    }
  }

  return removed;
}

exports.default = async function beforeBuild() {
  const projectDir = process.cwd();
  const nodeModulesDir = path.join(projectDir, 'node_modules');

  const removedPackages = removeParcelWatcherPackages(nodeModulesDir);
  if (removedPackages > 0) {
    console.log(`[electron-builder] omitted optional @parcel/watcher packages: ${removedPackages}`);
  }

  return true;
};
