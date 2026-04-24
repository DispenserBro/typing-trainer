import fs from 'node:fs';
import path from 'node:path';
import {
  formatExtensionSourceDiagnosticsReport,
  runExtensionSourceDiagnostics,
} from './extensionSourceDiagnostics';

function parseJsonOutputPath(argv: string[]) {
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--json' && argv[index + 1]) {
      return argv[index + 1]!;
    }
  }
  return null;
}

async function main() {
  const jsonOutputPath = parseJsonOutputPath(process.argv.slice(2));
  const report = await runExtensionSourceDiagnostics();
  process.stdout.write(formatExtensionSourceDiagnosticsReport(report));

  if (jsonOutputPath) {
    const absolutePath = path.resolve(jsonOutputPath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, JSON.stringify(report, null, 2), 'utf-8');
    process.stdout.write(`JSON report saved to ${absolutePath}\n`);
  }

  if (!report.sourceInstallOk || report.warnings.length > 0 || !report.addonInstalled || !report.modInstalled) {
    process.exitCode = 1;
  }
}

void main();
