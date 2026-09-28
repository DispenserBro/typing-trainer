import fs from 'fs';
import { runAdventureChecks } from './adventureDiagnostics';
import { runExpeditionChecks } from './expeditionDiagnostics';
import { runCombatBalanceChecks } from './combatBalanceDiagnostics';
import { PLAYER_BASE_HP } from '../core/game/battleSystem';
import path from 'path';
import {
  runGameBalanceDiagnostics,
  formatGameBalanceReport,
  type GameBalanceScenario,
} from './gameBalanceDiagnostics';

type CliOptions = {
  runs: number;
  levels: number;
  lives: number;
  jsonPath?: string;
};

function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    runs: 200,
    levels: 25,
    lives: PLAYER_BASE_HP,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--runs' && next) {
      options.runs = Math.max(1, parseInt(next, 10) || options.runs);
      index += 1;
    } else if (arg === '--levels' && next) {
      options.levels = Math.max(1, parseInt(next, 10) || options.levels);
      index += 1;
    } else if (arg === '--lives' && next) {
      options.lives = Math.max(1, Math.min(500, parseInt(next, 10) || options.lives));
      index += 1;
    } else if (arg === '--json' && next) {
      options.jsonPath = next;
      index += 1;
    }
  }

  return options;
}

function writeJsonReport(jsonPath: string, payload: unknown) {
  const absolutePath = path.resolve(process.cwd(), jsonPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, JSON.stringify(payload, null, 2), 'utf8');
}

function main() {
  const options = parseCliArgs(process.argv.slice(2));

  const scenarios: GameBalanceScenario[] = [
    {
      label: `Стандартный забег (${options.levels} уровней, ${options.lives} HP)`,
      runs: options.runs,
      levelsPerRun: options.levels,
      startLives: options.lives,
    },
    {
      label: `Длинный забег (${Math.round(options.levels * 1.6)} уровней, ${options.lives} HP)`,
      runs: options.runs,
      levelsPerRun: Math.round(options.levels * 1.6),
      startLives: options.lives,
    },
    {
      label: `Хардкор (${options.levels} уровней, 25 HP)`,
      runs: options.runs,
      levelsPerRun: options.levels,
      startLives: 25,
    },
  ];

  console.log('Phaser adventure checks:', runAdventureChecks());
  const expedition = runExpeditionChecks();
  console.log('Expedition checks passed:', expedition);
  const combat = runCombatBalanceChecks();
  process.stdout.write(`Combat regression checks passed: ${combat.battles} seeded battles.\n`);
  for (const row of combat.rows.filter(row => row.tier === 'boss' && [5, 100].includes(row.level))) {
    process.stdout.write(`Boss ${row.level} / ${row.profile}: win ${(row.winRate * 100).toFixed(0)}%, phases ${row.averageRounds.toFixed(1)}, HP lost ${row.averageDamage.toFixed(1)}\n`);
  }
  const reports = scenarios.map(scenario => runGameBalanceDiagnostics(scenario));

  reports.forEach(report => {
    process.stdout.write(`${formatGameBalanceReport(report)}\n`);
  });

  if (options.jsonPath) {
    writeJsonReport(options.jsonPath, { generatedAt: new Date().toISOString(), reports, combat, expedition });
    process.stdout.write(`JSON report saved to ${options.jsonPath}\n`);
  }
}

main();
