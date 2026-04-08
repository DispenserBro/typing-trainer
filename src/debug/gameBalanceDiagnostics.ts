import {
  createGameEvent,
  createRestEvent,
  createCacheEvent,
  createShopEvent,
  createRiskEvent,
  shouldOfferGameEvent,
} from '../core/game/gameEvents';
import { GAME_ITEM_CATALOG } from '../core/game/items/catalog';
import { isDurableGameItem, pickRandomGameItem } from '../core/game/items/utils';
import type {
  GameEventKind,
  GameItemDefinition,
  GameRunEventChoice,
  GameRunEventState,
  GameRunModifier,
} from '../shared/types';

// ── Types ───────────────────────────────────────────────

export interface GameBalanceScenario {
  label: string;
  runs: number;
  levelsPerRun: number;
  startLives: number;
}

interface DurabilitySnapshot {
  itemId: string;
  startDurability: number;
  endDurability: number;
  repairsApplied: number;
}

interface RunTrace {
  levels: number;
  eventsTriggered: number;
  eventKinds: GameEventKind[];
  itemsGranted: string[];
  modifiersReceived: string[];
  livesAtEnd: number;
  totalLifeHealed: number;
  totalLifeLost: number;
  totalRepairPoints: number;
  durabilitySnapshots: DurabilitySnapshot[];
}

export interface GameBalanceReport {
  scenario: GameBalanceScenario;
  catalog: {
    totalItems: number;
    simpleItems: number;
    durableItems: number;
  };
  eventTrigger: {
    levelsChecked: number;
    eventsOffered: number;
    eventRate: number;
    eventLevels: number[];
  };
  eventKindDistribution: Record<GameEventKind, { count: number; share: number }>;
  choiceDistribution: Record<string, { count: number; share: number }>;
  itemDropDistribution: Record<string, { count: number; share: number }>;
  modifierDistribution: Record<string, { count: number; share: number }>;
  lifeDelta: {
    totalHealed: number;
    totalLost: number;
    avgHealedPerRun: number;
    avgLostPerRun: number;
  };
  durability: {
    totalRepairPoints: number;
    avgRepairPerRun: number;
    avgDurabilityLossPerEvent: number;
  };
  warnings: string[];
}

// ── Helpers ─────────────────────────────────────────────

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function buildDistribution<T extends string>(
  counts: Map<T, number>,
  total: number,
): Record<T, { count: number; share: number }> {
  const result = {} as Record<T, { count: number; share: number }>;
  for (const [key, count] of counts) {
    result[key] = { count, share: total > 0 ? round((count / total) * 100) : 0 };
  }
  return result;
}

function randomChoice(choices: GameRunEventChoice[]): GameRunEventChoice | null {
  const enabled = choices.filter(c => !c.disabled);
  if (!enabled.length) return null;
  return enabled[Math.floor(Math.random() * enabled.length)] ?? null;
}

// ── Core simulation ─────────────────────────────────────

function simulateRun(levelsPerRun: number, startLives: number): RunTrace {
  let lives = startLives;
  let totalLifeHealed = 0;
  let totalLifeLost = 0;
  let totalRepairPoints = 0;
  const eventKinds: GameEventKind[] = [];
  const itemsGranted: string[] = [];
  const modifiersReceived: string[] = [];
  const durabilitySnapshots: DurabilitySnapshot[] = [];
  let eventsTriggered = 0;

  // Track equipped durable items for wear simulation
  const equippedDurables: { itemId: string; durability: number; maxDurability: number }[] = [];

  for (let level = 1; level <= levelsPerRun; level += 1) {
    // Simulate durability wear on each level for equipped durable items
    for (const item of equippedDurables) {
      if (item.durability > 0) {
        item.durability -= 1;
      }
    }

    if (!shouldOfferGameEvent(level)) continue;

    const hasRepairTargets = equippedDurables.some(d => d.durability < d.maxDurability);
    const event = createGameEvent({ level, lives, hasRepairTargets });
    eventsTriggered += 1;
    eventKinds.push(event.kind);

    const choice = randomChoice(event.choices);
    if (!choice) continue;

    const eff = choice.effect;

    if (eff.lifeDelta) {
      if (eff.lifeDelta > 0) totalLifeHealed += eff.lifeDelta;
      else totalLifeLost += Math.abs(eff.lifeDelta);
      lives = Math.max(0, Math.min(3, lives + eff.lifeDelta));
    }

    if (eff.grantItemId) {
      itemsGranted.push(eff.grantItemId);
      const def = GAME_ITEM_CATALOG.find(i => i.id === eff.grantItemId);
      if (def && isDurableGameItem(def)) {
        equippedDurables.push({
          itemId: def.id,
          durability: def.maxDurability!,
          maxDurability: def.maxDurability!,
        });
      }
    }

    if (eff.repairEquippedBy && eff.repairEquippedBy > 0) {
      totalRepairPoints += eff.repairEquippedBy;
      for (const item of equippedDurables) {
        item.durability = Math.min(item.maxDurability, item.durability + eff.repairEquippedBy);
      }
    }

    if (eff.modifier) {
      modifiersReceived.push(eff.modifier.id);
    }
  }

  for (const item of equippedDurables) {
    durabilitySnapshots.push({
      itemId: item.itemId,
      startDurability: item.maxDurability,
      endDurability: item.durability,
      repairsApplied: totalRepairPoints,
    });
  }

  return {
    levels: levelsPerRun,
    eventsTriggered,
    eventKinds,
    itemsGranted,
    modifiersReceived,
    livesAtEnd: lives,
    totalLifeHealed,
    totalLifeLost,
    totalRepairPoints,
    durabilitySnapshots,
  };
}

// ── Build report ────────────────────────────────────────

function buildWarnings(report: Omit<GameBalanceReport, 'warnings'>): string[] {
  const warnings: string[] = [];
  const kinds = report.eventKindDistribution;

  const kindKeys = Object.keys(kinds) as GameEventKind[];
  if (kindKeys.length > 0) {
    for (const kind of kindKeys) {
      if (kinds[kind].share >= 55) {
        warnings.push(`Перекос по типу '${kind}': ${kinds[kind].share}% всех событий.`);
      }
    }
    if (!kinds.risk || kinds.risk.count === 0) {
      warnings.push(`Рисковые события не появились ни разу.`);
    }
    if (!kinds.rest || kinds.rest.count === 0) {
      warnings.push(`События отдыха не появились ни разу.`);
    }
  }

  const items = report.itemDropDistribution;
  const itemKeys = Object.keys(items);
  if (itemKeys.length > 0) {
    for (const itemId of itemKeys) {
      if (items[itemId].share >= 35) {
        warnings.push(`Предмет '${itemId}' доминирует в выпадении: ${items[itemId].share}%.`);
      }
    }
  }

  if (report.lifeDelta.avgLostPerRun > 1.5) {
    warnings.push(`Высокие потери жизней: в среднем ${report.lifeDelta.avgLostPerRun} за забег.`);
  }

  if (report.eventTrigger.eventRate < 5) {
    warnings.push(`Очень низкая частота событий: ${report.eventTrigger.eventRate}%.`);
  }

  if (report.durability.avgRepairPerRun < 0.5 && report.catalog.durableItems > 0) {
    warnings.push(`Очень мало ремонтов: в среднем ${report.durability.avgRepairPerRun} очков за забег. Предметы с прочностью могут быстро разрушиться.`);
  }

  if (warnings.length === 0) {
    warnings.push('Явных дисбалансов не обнаружено.');
  }

  return warnings;
}

export function runGameBalanceDiagnostics(scenario: GameBalanceScenario): GameBalanceReport {
  const eventKindCounts = new Map<GameEventKind, number>();
  const choiceCounts = new Map<string, number>();
  const itemDropCounts = new Map<string, number>();
  const modifierCounts = new Map<string, number>();
  let totalEventsOffered = 0;
  let totalLifeHealed = 0;
  let totalLifeLost = 0;
  let totalRepairPoints = 0;
  let totalDurabilityEvents = 0;

  // Check event trigger schedule
  const eventLevels: number[] = [];
  for (let l = 1; l <= scenario.levelsPerRun; l += 1) {
    if (shouldOfferGameEvent(l)) eventLevels.push(l);
  }

  for (let run = 0; run < scenario.runs; run += 1) {
    const trace = simulateRun(scenario.levelsPerRun, scenario.startLives);
    totalEventsOffered += trace.eventsTriggered;
    totalLifeHealed += trace.totalLifeHealed;
    totalLifeLost += trace.totalLifeLost;
    totalRepairPoints += trace.totalRepairPoints;
    totalDurabilityEvents += trace.durabilitySnapshots.length;

    for (const kind of trace.eventKinds) {
      eventKindCounts.set(kind, (eventKindCounts.get(kind) ?? 0) + 1);
    }
    for (const itemId of trace.itemsGranted) {
      itemDropCounts.set(itemId, (itemDropCounts.get(itemId) ?? 0) + 1);
    }
    for (const modId of trace.modifiersReceived) {
      modifierCounts.set(modId, (modifierCounts.get(modId) ?? 0) + 1);
    }
  }

  // Count total choices resolved (= totalEventsOffered since each event resolves one choice)
  const totalChoices = totalEventsOffered;

  const simpleItems = GAME_ITEM_CATALOG.filter(i => !isDurableGameItem(i)).length;
  const durableItems = GAME_ITEM_CATALOG.filter(i => isDurableGameItem(i)).length;

  const baseReport: Omit<GameBalanceReport, 'warnings'> = {
    scenario,
    catalog: {
      totalItems: GAME_ITEM_CATALOG.length,
      simpleItems,
      durableItems,
    },
    eventTrigger: {
      levelsChecked: scenario.levelsPerRun,
      eventsOffered: eventLevels.length,
      eventRate: round((eventLevels.length / scenario.levelsPerRun) * 100),
      eventLevels,
    },
    eventKindDistribution: buildDistribution(eventKindCounts, totalEventsOffered),
    choiceDistribution: buildDistribution(choiceCounts, totalChoices),
    itemDropDistribution: buildDistribution(itemDropCounts, [...itemDropCounts.values()].reduce((s, v) => s + v, 0)),
    modifierDistribution: buildDistribution(modifierCounts, [...modifierCounts.values()].reduce((s, v) => s + v, 0)),
    lifeDelta: {
      totalHealed: totalLifeHealed,
      totalLost: totalLifeLost,
      avgHealedPerRun: round(totalLifeHealed / Math.max(1, scenario.runs)),
      avgLostPerRun: round(totalLifeLost / Math.max(1, scenario.runs)),
    },
    durability: {
      totalRepairPoints,
      avgRepairPerRun: round(totalRepairPoints / Math.max(1, scenario.runs)),
      avgDurabilityLossPerEvent: totalDurabilityEvents > 0
        ? round(totalEventsOffered / totalDurabilityEvents)
        : 0,
    },
  };

  return {
    ...baseReport,
    warnings: buildWarnings(baseReport),
  };
}

// ── Format ──────────────────────────────────────────────

function formatDistribution(dist: Record<string, { count: number; share: number }>, indent = '  '): string[] {
  const entries = Object.entries(dist).sort((a, b) => b[1].count - a[1].count);
  if (!entries.length) return [`${indent}(нет данных)`];
  return entries.map(([key, { count, share }]) => `${indent}${key}: ${count} (${share}%)`);
}

export function formatGameBalanceReport(report: GameBalanceReport): string {
  const lines: string[] = [];
  lines.push(`=== ${report.scenario.label} ===`);
  lines.push(`Забегов: ${report.scenario.runs} | Уровней/забег: ${report.scenario.levelsPerRun} | Старт жизней: ${report.scenario.startLives}`);
  lines.push(`Каталог: ${report.catalog.totalItems} предметов (${report.catalog.simpleItems} простых, ${report.catalog.durableItems} прочных)`);
  lines.push('');

  lines.push(`Триггер событий:`);
  lines.push(`  Уровней проверено: ${report.eventTrigger.levelsChecked}`);
  lines.push(`  Событий за забег: ${report.eventTrigger.eventsOffered} (${report.eventTrigger.eventRate}%)`);
  lines.push(`  Уровни с событиями: ${report.eventTrigger.eventLevels.join(', ') || '—'}`);
  lines.push('');

  lines.push('Распределение типов событий:');
  lines.push(...formatDistribution(report.eventKindDistribution));
  lines.push('');

  lines.push('Выпадение предметов:');
  lines.push(...formatDistribution(report.itemDropDistribution));
  lines.push('');

  lines.push('Модификаторы:');
  lines.push(...formatDistribution(report.modifierDistribution));
  lines.push('');

  lines.push(`Жизни:`);
  lines.push(`  Восстановлено всего: ${report.lifeDelta.totalHealed} (${report.lifeDelta.avgHealedPerRun}/забег)`);
  lines.push(`  Потеряно всего: ${report.lifeDelta.totalLost} (${report.lifeDelta.avgLostPerRun}/забег)`);
  lines.push('');

  lines.push(`Прочность:`);
  lines.push(`  Очков ремонта всего: ${report.durability.totalRepairPoints} (${report.durability.avgRepairPerRun}/забег)`);
  lines.push('');

  lines.push('Warnings:');
  report.warnings.forEach(w => lines.push(`- ${w}`));
  lines.push('');

  return lines.join('\n');
}
