import assert from 'node:assert/strict';
import { normalizeSavedGameRunState } from '../renderer/contexts/appGameSavedRunResolvers';
import { normalizeGameRunModifier } from '../renderer/contexts/appGameRunResolvers';
import { createGameRunMap, getGameRunMapOutgoingIds } from '../core/game/routes';
import { createExpeditionEvent, getExpeditionEncounterKey, buildEliteRewardChoices } from '../core/game/expedition';
import { resolveGameChoiceEffect } from '../core/game/runFlow';
import { createSeededRng } from '../core/game/seededRng';
import { buildGameRewardChoiceBlockViewModel } from '../core/game/resultRewards';
import type { GameRunResult } from '../shared/types';

export function runExpeditionChecks() {
  let maps = 0, events = 0;
  const variations = new Set<string>();
  for (const total of [1, 4, 5, 25, 100]) {
    for (let seed = 0; seed < 40; seed++) {
      const map = createGameRunMap(total, 'expedition-test-' + seed);
      assert.deepEqual(map, createGameRunMap(total, 'expedition-test-' + seed), 'A seed must reproduce the full map');
      for (const column of new Set(map.nodes.map(node => node.column))) {
        const siblings = map.nodes.filter(node => node.column === column);
        assert.equal(new Set(siblings.map(node => node.kind)).size, siblings.length, 'Parallel choices should offer different room types');
      }
      const byId = new Map(map.nodes.map(node => [node.id, node]));
      assert.equal(byId.size, map.nodes.length, 'Map node IDs must be unique');
      const reached = new Set([map.currentNodeId!]);
      const latestLevel = new Map<string, number>([[map.currentNodeId!, 1]]);
      for (const node of map.nodes) {
        assert(reached.has(node.id), 'Every map node must be reachable from the start');
        const previousLevel = latestLevel.get(node.id) ?? 1;
        if (['battle', 'elite', 'miniboss', 'boss'].includes(node.kind)) {
          assert(node.battleLevel != null && node.battleLevel >= previousLevel && node.battleLevel <= total,
            'Every combat must have a level that never moves backwards along a path');
        }
        const outgoing = getGameRunMapOutgoingIds(map, node.id);
        for (const id of outgoing) {
          const next = byId.get(id);
          assert(next && next.column > node.column, 'Edges must move forward, without cycles');
          reached.add(id);
          latestLevel.set(id, Math.max(latestLevel.get(id) ?? 1, node.battleLevel ?? previousLevel));
        }
        if (!outgoing.length) assert.equal(node.battleLevel, total, 'Only the final encounter may be a leaf');
        const key = getExpeditionEncounterKey(node);
        if (!key) continue;
        variations.add(key);
        const args = { level: previousLevel, hp: 50, maxHp: 100, hasRepairTargets: true };
        const event = createExpeditionEvent(node, args)!;
        assert(event && event.choices.length === 3);
        assert.equal(event.title, node.title, 'Map preview must describe the actual event');
        assert(!event.title.startsWith('game.'), 'Encounter must be translated');
        assert.deepEqual(event, createExpeditionEvent(node, args), 'Reload must not reroll an offer');
        assert.deepEqual(JSON.parse(JSON.stringify(event)), event, 'Encounter must survive save/load');
        const normalized = normalizeSavedGameRunState({
          pendingEvent: JSON.parse(JSON.stringify(event)),
          activeModifiers: event.choices.flatMap(choice => choice.effect.modifier ? [choice.effect.modifier] : []),
          regenTurns: 3,
        })!;
        assert.equal(normalized.regenTurns, 3);
        event.choices.forEach((choice, index) => {
          const savedEffect = normalized.pendingEvent!.choices[index].effect;
          for (const [field, value] of Object.entries(choice.effect)) {
            if (field === 'modifier' && value) {
              for (const [key, number] of Object.entries(value)) {
                assert.equal((savedEffect.modifier as any)?.[key], number, 'Saved offer must keep modifier ' + key);
                assert.equal((normalized.activeModifiers.find(modifier => modifier.id === value.id) as any)?.[key], number,
                  'Active modifiers must preserve bonuses and penalties');
              }
            } else {
              assert.deepEqual((savedEffect as any)[field], value, 'Saved offer must keep effect ' + field);
            }
          }
        });
        for (const choice of event.choices) {
          const resolved = resolveGameChoiceEffect({ effect: choice.effect, hp: 50, maxHp: 100 });
          assert(resolved.nextHp >= 0 && resolved.nextHp <= resolved.nextMaxHp);
        }
        const lowHpEvent = createExpeditionEvent(node, { ...args, hp: 1, hasRepairTargets: false })!;
        assert(lowHpEvent.choices.some(choice => !choice.disabled), 'Every encounter needs an available exit or choice');
        assert(lowHpEvent.choices.filter(choice => (choice.effect.lifeDelta ?? 0) < 0).every(choice => choice.disabled),
          'Health trades cannot kill a player who cannot afford them');
        events++;
      }
      assert.equal(map.nodes.filter(node => !getGameRunMapOutgoingIds(map, node.id).length).length, 1);
      if (total % 5 === 0) assert.equal(map.nodes.filter(node => node.kind === 'boss').length, total / 5,
        'Do not append a duplicate final boss');
      if (total >= 5) assert(map.nodes.some(node => getGameRunMapOutgoingIds(map, node.id).length >= 3));
      maps++;
    }
  }
  assert.equal(normalizeGameRunModifier({ id: 'bad', name: 'bad', dmgCoeff: NaN, remainingLevels: Infinity })?.dmgCoeff, undefined);
  assert.equal(variations.size, 8, 'All encounter variants must appear');
  for (const tier of ['elite', 'miniboss'] as const) {
    const choices = buildEliteRewardChoices(tier, createSeededRng(8));
    assert(choices.some(choice => choice.itemId));
    assert(choices.some(choice => (choice.effect?.lifeDelta ?? 0) > 0));
    const block = buildGameRewardChoiceBlockViewModel({
      result: { passed: true, isBoss: false, victory: false } as GameRunResult,
      rewardChoices: choices, selectedRewardMessage: null, translate: key => key,
    });
    assert(block && block.choices.length === 2, 'Elite loot must be visible without marking the encounter as a boss');
    assert.equal(buildGameRewardChoiceBlockViewModel({
      result: { passed: true, isBoss: false, victory: false } as GameRunResult,
      rewardChoices: choices, selectedRewardMessage: 'claimed', translate: key => key,
    })?.choices.length, 0, 'Claimed loot cannot remain selectable');
  }
  return { maps, events, variations: variations.size };
}
