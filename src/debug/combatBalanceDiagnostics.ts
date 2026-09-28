import assert from 'node:assert/strict';
import {
  computeDeltaCpm, computeDeltaRhythm, createBattleState, createEnemy,
  resolveBattleRound, type BattleBonuses,
} from '../core/game/battleSystem';
import { createSeededRng } from '../core/game/seededRng';
import { buildBossRewardChoices } from '../core/game/runUtils';
import { resolveGameChoiceEffect } from '../core/game/runFlow';
import { GAME_ITEM_CATALOG, getGameItemById } from '../core/game/items';
import type { BattleState, EnemyTier } from '../shared/types';

const NONE: BattleBonuses = {
  enemyAttackReduction: 0, enemyDefenseReduction: 0, dodgeBonus: 0,
  playerAttackBonus: 0, playerDamageBonus: 0, dmgCoeff: 0, defCoeff: 0, critBonus: 0,
};
const STEADY = [190, 200, 205, 195, 210, 200];
const GEAR: BattleBonuses = {
  ...NONE, dmgCoeff: 0.3, defCoeff: 0.2, critBonus: 0.035,
  dodgeBonus: 8, enemyDefenseReduction: 6,
};

function fixture(phase: BattleState['phase'] = 'attack'): BattleState {
  return {
    ...createBattleState({ ...createEnemy('normal', 1, () => 0.5), hp: 100, maxHp: 100, defense: 30 }, 100, 100),
    phase,
  };
}

function round(state: BattleState, accuracy = 95, cpm = 150, bonuses = NONE, roll = 0.9) {
  return resolveBattleRound(state, accuracy, cpm, 150, STEADY, bonuses, () => roll);
}

export function runCombatBalanceChecks() {
  const original = fixture();
  const snapshot = JSON.stringify(original);
  const normal = round(original);
  const fast = round(original, 95, 210);
  const slow = round(original, 95, 90);
  const damage = (state: BattleState) => state.roundResults[state.roundResults.length - 1]!.damage;
  assert(damage(normal) > 1, 'Armor must not flatten ordinary attacks to 1 HP');
  assert(damage(fast) > damage(normal) && damage(normal) > damage(slow), 'Typing speed must affect damage');
  assert(damage(round(original, 50)) < damage(normal), 'Accuracy must affect damage');
  assert.equal(damage(round(original, 0)), 0, 'Zero accuracy cannot deal damage');
  assert.equal(damage(round(original, 100, 0)), 0, 'An empty timed round cannot deal damage');
  assert.equal(computeDeltaCpm(Number.NaN, 150), 0);
  assert.equal(computeDeltaCpm(100000, 150), 2);
  assert(computeDeltaRhythm([200, 200, 200, 4000]) < computeDeltaRhythm([200, 200, 200, 200]), 'Pauses must not be discarded');
  assert.equal(computeDeltaRhythm([NaN, Infinity]), 1.5);
  assert.equal(JSON.stringify(original), snapshot, 'Combat must not mutate saved input');

  const defending = fixture('defend');
  assert(damage(round(defending, 50)) > damage(round(defending, 100)), 'Accurate typing must improve guard');
  const dodged = round(defending, 95, 150, { ...NONE, dodgeBonus: 10 }, 0.05);
  assert.equal(dodged.playerHp, 100);
  assert.equal(dodged.roundResults[0]!.hit, false);
  assert.equal(dodged.roundResults[0]!.damage, 0);
  assert.equal(round(defending, 95, 150, { ...NONE, dodgeBonus: 1000 }, 0.5).roundResults[0]!.hit, true, 'Dodge cap prevents invulnerability');
  assert.equal(round(original, 95, 150, { ...NONE, critBonus: 1000 }, 0.9).roundResults[0]!.crit, false, 'Critical chance is capped');
  assert(damage(round(original, 95, 150, GEAR)) > damage(normal));
  assert(damage(round(defending, 95, 150, GEAR)) < damage(round(defending)));
  const finished = { ...original, finished: true, won: true };
  assert.equal(round(finished), finished, 'A finished battle cannot resolve again');
  const restored = JSON.parse(JSON.stringify(normal)) as BattleState;
  assert.deepEqual(round(restored), round(normal), 'Battle serialization must preserve the next round');
  assert.deepEqual(createEnemy('boss', 50, createSeededRng(41)), createEnemy('boss', 50, createSeededRng(41)));

  const rewardsRandom = createSeededRng(7001);
  for (let i = 0; i < 400; i++) {
    const choices = buildBossRewardChoices(i % 2 ? 'a' : null, i % 100 + 1, rewardsRandom);
    assert.equal(choices.length, 3);
    assert.equal(new Set(choices.map(choice => choice.id)).size, 3);
    assert(choices.some(choice => choice.itemId), 'Every boss must offer equipment');
  }
  assert.equal(new Set(GAME_ITEM_CATALOG.map(item => item.id)).size, GAME_ITEM_CATALOG.length);
  for (const id of ['metronome-heart', 'mist-step', 'piercing-quill']) {
    const item = getGameItemById(id);
    assert(item && item.effects.length === 2);
    assert(!item.name.startsWith('game.'), 'New item names must be translated');
  }
  assert.equal(resolveGameChoiceEffect({ hp: 20, maxHp: 100, effect: { maxLifeDelta: 10, lifeDelta: 5 } }).nextHp, 35);
  assert.equal(resolveGameChoiceEffect({ hp: 20, maxHp: 100, effect: { fullHeal: true, lifeDelta: -10 } }).nextHp, 90);

  const rows: Array<{ level: number; tier: EnemyTier; profile: string; winRate: number; averageRounds: number; averageDamage: number }> = [];
  for (const level of [1, 5, 25, 50, 100]) {
    for (const tier of ['normal', 'elite', 'miniboss', 'boss'] as EnemyTier[]) {
      for (const profile of [
        { name: 'learning', cpm: 105, accuracy: 85, bonuses: NONE },
        { name: 'on-target', cpm: 150, accuracy: 96, bonuses: NONE },
        { name: 'equipped', cpm: 150, accuracy: 96, bonuses: GEAR },
      ]) {
        let wins = 0, rounds = 0, loss = 0;
        for (let seed = 1; seed <= 80; seed++) {
          const random = createSeededRng(seed);
          let state = createBattleState(createEnemy(tier, level, random), 100, 100);
          for (let step = 0; step < 160 && !state.finished; step++) {
            state = resolveBattleRound(state, profile.accuracy, profile.cpm, 150, STEADY, profile.bonuses, random);
          }
          assert(state.finished, 'Combat must finish within a bounded number of rounds');
          assert(state.playerHp >= 0 && state.enemy.hp >= 0);
          wins += Number(state.won);
          rounds += state.roundResults.length;
          loss += 100 - state.playerHp;
        }
        rows.push({ level, tier, profile: profile.name, winRate: wins / 80, averageRounds: rounds / 80, averageDamage: loss / 80 });
      }
    }
  }
  const row = (level: number, tier: EnemyTier, profile: string) => rows.find(x => x.level === level && x.tier === tier && x.profile === profile)!;
  assert(row(1, 'normal', 'on-target').averageRounds <= 5, 'First fight should introduce the loop without grinding');
  assert(row(5, 'boss', 'on-target').winRate >= 0.9, 'First boss should be fair at the chosen target speed');
  assert(row(100, 'boss', 'equipped').winRate > row(100, 'boss', 'learning').winRate, 'Gear and typing quality must matter late in the run');
  assert(row(100, 'normal', 'on-target').averageRounds > row(1, 'normal', 'on-target').averageRounds, 'Enemy health must progress');
  return { battles: rows.length * 80, rows };
}
