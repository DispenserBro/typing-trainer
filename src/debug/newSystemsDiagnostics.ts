/**
 * Diagnostics for new game systems:
 *  – Boss archetypes distribution & balance
 *  – Item set synergies coverage
 *  – Daily run seeded RNG repeatability
 *  – Map branching (elite / miniboss frequency)
 */

import { getBossArchetype, BOSS_ARCHETYPES, computeRhythmDeviation } from '../core/game/bossArchetypes';
import type { BossArchetypeConfig } from '../core/game/bossArchetypes';
import type { BossArchetypeId } from '../shared/types';
import { computeSetBonuses, GAME_ITEM_SETS, ITEM_SET_MEMBERSHIP } from '../core/game/itemSets';
import type { GameItemSetId } from '../core/game/itemSets';
import { GAME_ITEM_CATALOG } from '../core/game/items/catalog';
import { getTodaySeed, hashSeed, createSeededRng, seededShuffle } from '../core/game/seededRng';
import { DAILY_RUN_LEVELS } from '../core/game/dailyRun';

// ── Boss Archetypes ─────────────────────────────────────

interface BossArchetypeDistribution {
  totalBossLevels: number;
  distribution: Record<BossArchetypeId, { count: number; share: number }>;
  firstAppearance: Record<BossArchetypeId, number>;
  sequence: { level: number; archetype: BossArchetypeId }[];
}

function round(v: number, p = 2) {
  const f = 10 ** p;
  return Math.round(v * f) / f;
}

export function analyzeBossArchetypeDistribution(maxLevel = 100): BossArchetypeDistribution {
  const counts: Record<string, number> = {};
  const firstAppearance: Record<string, number> = {};
  const sequence: { level: number; archetype: BossArchetypeId }[] = [];

  let totalBossLevels = 0;

  for (let level = 5; level <= maxLevel; level += 5) {
    const bossLevel = level / 5;
    const archetype = getBossArchetype(bossLevel);
    totalBossLevels += 1;
    counts[archetype.id] = (counts[archetype.id] || 0) + 1;
    if (!(archetype.id in firstAppearance)) {
      firstAppearance[archetype.id] = level;
    }
    sequence.push({ level, archetype: archetype.id });
  }

  const distribution = {} as Record<BossArchetypeId, { count: number; share: number }>;
  for (const [id, count] of Object.entries(counts)) {
    distribution[id as BossArchetypeId] = {
      count,
      share: round((count / totalBossLevels) * 100),
    };
  }

  return {
    totalBossLevels,
    distribution,
    firstAppearance: firstAppearance as Record<BossArchetypeId, number>,
    sequence,
  };
}

// ── Item Sets ───────────────────────────────────────────

interface ItemSetCoverage {
  totalCatalogItems: number;
  itemsInSets: number;
  itemsNotInSets: string[];
  sets: {
    id: string;
    name: string;
    memberCount: number;
    members: string[];
    bonus2: string;
    bonus3: string;
  }[];
}

export function analyzeItemSetCoverage(): ItemSetCoverage {
  const inSet = new Set(Object.keys(ITEM_SET_MEMBERSHIP));
  const notInSets = GAME_ITEM_CATALOG.filter(item => !inSet.has(item.id)).map(i => i.id);

  // Build members per set from ITEM_SET_MEMBERSHIP
  const membersPerSet: Partial<Record<GameItemSetId, string[]>> = {};
  for (const [itemId, setId] of Object.entries(ITEM_SET_MEMBERSHIP)) {
    (membersPerSet[setId] ??= []).push(itemId);
  }

  const sets = Object.entries(GAME_ITEM_SETS).map(([id, setDef]) => ({
    id,
    name: setDef.name,
    memberCount: (membersPerSet[id as GameItemSetId] ?? []).length,
    members: [...(membersPerSet[id as GameItemSetId] ?? [])],
    bonus2: setDef.bonuses[0]?.description ?? '—',
    bonus3: setDef.bonuses[1]?.description ?? '—',
  }));

  return {
    totalCatalogItems: GAME_ITEM_CATALOG.length,
    itemsInSets: inSet.size,
    itemsNotInSets: notInSets,
    sets,
  };
}

// ── Set Bonus Simulation ────────────────────────────────

interface SetBonusSimulationResult {
  scenarioLabel: string;
  equippedIds: string[];
  activeSets: { setId: string; pieces: number }[];
  totalSpeedReduction: number;
  totalAccuracyReduction: number;
  totalBossTimerBonus: number;
}

export function simulateSetBonuses(
  scenarios: { label: string; equippedIds: string[] }[],
): SetBonusSimulationResult[] {
  return scenarios.map(scenario => {
    const result = computeSetBonuses(scenario.equippedIds);
    return {
      scenarioLabel: scenario.label,
      equippedIds: scenario.equippedIds,
      activeSets: result.activeSets.map(s => ({ setId: s.set.id, pieces: s.count })),
      totalSpeedReduction: result.totalSpeedReduction,
      totalAccuracyReduction: result.totalAccuracyReduction,
      totalBossTimerBonus: result.totalBossTimerBonus,
    };
  });
}

// ── Seeded RNG ──────────────────────────────────────────

interface SeededRngCheck {
  seed: string;
  hash: number;
  first10: number[];
  repeatCheck: boolean;
  shuffledSample: string[];
}

export function analyzeSeededRng(): SeededRngCheck {
  const seed = getTodaySeed();
  const hash = hashSeed(seed);
  const rng = createSeededRng(hash);
  const first10 = Array.from({ length: 10 }, () => round(rng(), 6));

  // Repeat with same seed – should produce same sequence
  const rng2 = createSeededRng(hash);
  const second10 = Array.from({ length: 10 }, () => round(rng2(), 6));
  const repeatCheck = first10.every((v, i) => v === second10[i]);

  // Seeded shuffle
  const sample = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const rng3 = createSeededRng(hash);
  const shuffled = seededShuffle([...sample], rng3);

  return { seed, hash, first10, repeatCheck, shuffledSample: shuffled };
}

// ── Rhythm Deviation ────────────────────────────────────

export function analyzeRhythmDeviation(): { label: string; intervals: number[]; deviation: number }[] {
  return [
    {
      label: 'Идеальный ритм (200ms ровно)',
      intervals: [200, 200, 200, 200, 200],
      deviation: round(computeRhythmDeviation([200, 200, 200, 200, 200])),
    },
    {
      label: 'Хороший ритм (±20ms)',
      intervals: [190, 210, 195, 205, 200],
      deviation: round(computeRhythmDeviation([190, 210, 195, 205, 200])),
    },
    {
      label: 'Средний ритм (±50ms)',
      intervals: [180, 250, 170, 230, 200],
      deviation: round(computeRhythmDeviation([180, 250, 170, 230, 200])),
    },
    {
      label: 'Плохой ритм (±100ms)',
      intervals: [120, 300, 150, 280, 200],
      deviation: round(computeRhythmDeviation([120, 300, 150, 280, 200])),
    },
  ];
}

// ── Format ──────────────────────────────────────────────

export function formatNewSystemsDiagnostics(): string {
  const lines: string[] = [];

  // Boss Archetypes
  lines.push('═══ АРХЕТИПЫ БОССОВ ═══');
  const bossData = analyzeBossArchetypeDistribution();
  lines.push(`Всего боссов (до 100 уровня): ${bossData.totalBossLevels}`);
  lines.push('');
  lines.push('Распределение:');
  for (const [id, data] of Object.entries(bossData.distribution)) {
    const config = BOSS_ARCHETYPES[id as BossArchetypeId];
    lines.push(`  ${config?.name ?? id}: ${data.count} (${data.share}%) | первое появление: уровень ${bossData.firstAppearance[id as BossArchetypeId]}`);
  }
  lines.push('');
  lines.push('Последовательность:');
  const seqStr = bossData.sequence.map(s => `${s.level}:${s.archetype.slice(0, 4)}`).join(' → ');
  lines.push(`  ${seqStr}`);
  lines.push('');

  // Archetype configs summary
  lines.push('Конфигурации архетипов:');
  for (const [id, config] of Object.entries(BOSS_ARCHETYPES) as [BossArchetypeId, BossArchetypeConfig][]) {
    lines.push(`  ${config.name} (${id}):`);
    lines.push(`    Слова: ×${config.wordCountMultiplier} | Таймер: ×${config.timerMultiplier} | Награда: ×${config.rewardMultiplier}`);
    if (config.extraAccuracy) lines.push(`    Доп. точность: +${config.extraAccuracy}%`);
    if (config.maxErrors !== undefined) lines.push(`    Макс. ошибок: ${config.maxErrors}`);
    if (config.checkRhythm) lines.push(`    Проверка ритма: да (макс. отклонение: ${config.maxRhythmDeviation}ms)`);
  }
  lines.push('');

  // Item Sets
  lines.push('═══ НАБОРЫ ПРЕДМЕТОВ ═══');
  const setCoverage = analyzeItemSetCoverage();
  lines.push(`Каталог: ${setCoverage.totalCatalogItems} предметов, в наборах: ${setCoverage.itemsInSets}`);
  if (setCoverage.itemsNotInSets.length) {
    lines.push(`Не в наборах: ${setCoverage.itemsNotInSets.join(', ')}`);
  }
  lines.push('');
  for (const set of setCoverage.sets) {
    lines.push(`  ${set.name} (${set.id}): ${set.memberCount} предметов`);
    lines.push(`    Участники: ${set.members.join(', ')}`);
    lines.push(`    2 шт: ${set.bonus2}`);
    lines.push(`    3 шт: ${set.bonus3}`);
  }
  lines.push('');

  // Set bonus simulation
  lines.push('Симуляция бонусов наборов:');
  const simResults = simulateSetBonuses([
    { label: 'Нет предметов', equippedIds: [] },
    { label: '2 предмета tempo', equippedIds: ['speed-boost', 'steady-pace'] },
    { label: '3 предмета tempo', equippedIds: ['speed-boost', 'steady-pace', 'adrenaline-rush'] },
    { label: '2 fortress + 1 tempo', equippedIds: ['iron-focus', 'precision-lens', 'speed-boost'] },
  ]);
  for (const sim of simResults) {
    lines.push(`  ${sim.scenarioLabel}: скорость -${sim.totalSpeedReduction}%, точн. -${sim.totalAccuracyReduction}%, таймер +${sim.totalBossTimerBonus}с`);
    if (sim.activeSets.length) {
      lines.push(`    Активные наборы: ${sim.activeSets.map(s => `${s.setId}(${s.pieces}шт)`).join(', ')}`);
    }
  }
  lines.push('');

  // Seeded RNG
  lines.push('═══ СЕЯНЫЙ ГЕНЕРАТОР ═══');
  const rngCheck = analyzeSeededRng();
  lines.push(`Seed: ${rngCheck.seed} (hash: ${rngCheck.hash})`);
  lines.push(`Повторяемость: ${rngCheck.repeatCheck ? '✓ ОК' : '✗ ОШИБКА'}`);
  lines.push(`Первые 10 значений: ${rngCheck.first10.join(', ')}`);
  lines.push(`Shuffle ['a'..'h']: ${rngCheck.shuffledSample.join(', ')}`);
  lines.push('');

  // Rhythm
  lines.push('═══ РИТМ-ПРОВЕРКА (БОСС «МЕТРОНОМ») ═══');
  const rhythmData = analyzeRhythmDeviation();
  for (const r of rhythmData) {
    const passSymbol = r.deviation <= 180 ? '✓' : '✗';
    lines.push(`  ${r.label}: deviation=${r.deviation}ms ${passSymbol}`);
  }
  lines.push('');

  return lines.join('\n');
}
