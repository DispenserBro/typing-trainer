import { formatNewSystemsDiagnostics } from './newSystemsDiagnostics';

function main() {
  const output = formatNewSystemsDiagnostics();
  process.stdout.write(`${output}\n`);
}

main();
