import assert from 'node:assert/strict';
import { buildPracticeContentText, buildNgramModel, filterYoKeys, filterYoWords } from '../core/engine';
import { adventureRoutes, adventureService, chooseAdventureReward, emptyAdventure, enterAdventureNode, normalizeAdventure, playAdventureWord, ROLES, startAdventure, upgradeAdventure } from '../core/game/adventure';
import type { AdventureAction, AdventureState } from '../shared/types/adventure';
import { readGameState } from '../renderer/contexts/appGameState';
import { defaultGameState } from '../renderer/contexts/appDefaults';
import { migrateProgressData, normalizeProgressForSave } from '../core/progress/migrations';

export function runAdventureChecks() {
  let checked = 0;
  const fresh = () => enterAdventureNode(startAdventure(emptyAdventure(), 'warden', 'en', 'qwerty', 42, 'normal'), '1-1');
  const base = fresh();
  assert.equal(playAdventureWord(base, 'spell', 0, 0, 2000).state, base, 'Unaffordable action must not advance time');
  assert.equal(enterAdventureNode(base, '2-1'), base, 'Cannot choose a room during combat');
  assert.equal(upgradeAdventure(base, 'might'), base, 'Cannot upgrade an active expedition');
  const guarded = playAdventureWord(base, 'guard', 0, 0, 3000).state;
  assert.equal(guarded.run!.enemies[0]!.hp, base.run!.enemies[0]!.hp, 'Guard cannot win by passive damage');
  assert.equal(guarded.run!.shield, 17);
  const wounded = playAdventureWord(base, 'strike', 0, 3, 3000).state;
  const accurate = playAdventureWord(base, 'strike', 0, 0, 3000).state;
  assert.ok(accurate.run!.enemies[0]!.hp < wounded.run!.enemies[0]!.hp);
  assert.equal(wounded.run!.combo, 0); assert.equal(wounded.run!.mana, 1);
  const castState = structuredClone(base); castState.run!.mana = 3;
  castState.run!.enemies.push({ ...castState.run!.enemies[0]!, id: 1 });
  const cast = playAdventureWord(castState, 'spell', 0, 0, 3000).state;
  assert.equal(cast.run!.mana, 0);
  assert.ok(cast.run!.enemies.every(e => e.hp < e.maxHp), 'Spell must hit every living target');
  assert.deepEqual(base, fresh(), 'Reducer must not mutate input');
  const afterReload = readGameState(normalizeProgressForSave({ game: { ...defaultGameState(), adventure: guarded } })).adventure;
  assert.deepEqual(afterReload, guarded, 'Actual app normalizers must preserve in-combat state');
  assert.equal(migrateProgressData({ game: { highestLevel: 3 } }).ok, true, 'Legacy profile still migrates');
  assert.equal(readGameState({ game: defaultGameState() }).adventure, undefined);
  assert.equal(normalizeAdventure({ version: 999 }).run, null);
  assert.equal(normalizeAdventure({ ...base, run: { ...base.run, enemies: [{ kind: 'bad' }] } }).run, null);
  // Adventure uses the same adaptive pipeline and model as the other game modes.
  for (const scenarioId of ['survival', 'flawless'] as const) {
    for (const useYo of [true, false]) {
      for (const alphabet of [['e', 't'], ['о', 'а'], ['ё', 'ж', 'е'], ['a']]) {
        const unlockedChars = filterYoKeys(alphabet, useYo);
        const allWords = filterYoWords(['tree', 'test', 'alpha', 'ёж', 'желе', 'дорога'], useYo);
        for (let index = 0; index < 20; index++) {
          const word = buildPracticeContentText({
            allWords, unlockedChars, weakChar: unlockedChars[0], contentMode: 'adaptive-words',
            scenarioId, wordCountOverride: 1, ngramModel: buildNgramModel(allWords),
          });
          assert.ok(word.length > 0, 'Starter alphabet must produce a prompt');
          assert.ok(!/\\s/.test(word), 'One completed word performs one adventure action');
          assert.ok([...word].every(ch => unlockedChars.includes(ch)), 'Shared adaptation must respect unlocked letters and yo');
          checked += 3;
        }
      }
    }
  }
  const shop = structuredClone(base); shop.run!.phase = 'shop'; shop.run!.gold = 60;
  const purchase = adventureService(shop, 'forge');
  assert.equal(purchase.run!.gold, 30);
  assert.equal(purchase.run!.power, shop.run!.power + 2);
  assert.equal(adventureService(purchase, 'forge'), purchase, 'Cannot buy the same service twice');
  shop.run!.gold = 0;
  assert.equal(adventureService(shop, 'forge'), shop, 'Unaffordable purchase is atomic');
  const event = structuredClone(base); event.run!.phase = 'event'; event.run!.hp = 15;
  assert.equal(adventureService(event, 'risk'), event, 'Event cannot charge lethal HP');
  event.run!.hp = 16;
  assert.equal(adventureService(event, 'risk').run!.hp, 1);
  const reward = structuredClone(base); reward.run!.phase = 'reward'; reward.run!.offers = ['ember'];
  const claimed = chooseAdventureReward(reward, 'ember');
  assert.equal(chooseAdventureReward(claimed, 'ember'), claimed, 'Reward cannot be claimed twice');
  assert.deepEqual(playAdventureWord(afterReload!, 'strike', 0, 0, 3200), playAdventureWord(guarded, 'strike', 0, 0, 3200), 'Reload preserves next RNG-driven turn');
  const invalid = normalizeAdventure({ ...base, shards: NaN, run: { ...base.run, hp: Infinity } });
  assert.equal(invalid.shards, 0); assert.equal(invalid.run!.phase, 'lost');
  checked += 27;

  const rows: { role: string; profile: string; wins: number; runs: number; averageWords: number }[] = [];
  for (const role of ROLES) for (const profile of ['tactical', 'reckless', 'learner'] as const) {
    let wins = 0, totalWords = 0;
    for (let seed = 1; seed <= 40; seed++) {
      let state: AdventureState = startAdventure(emptyAdventure(), role, 'en', 'qwerty', seed, profile === 'learner' ? 'story' : 'normal');
      let steps = 0;
      while (!['won', 'lost'].includes(state.run!.phase) && steps++ < 700) {
        const r = state.run!;
        assert.ok(Number.isFinite(r.hp) && r.hp >= 0 && r.hp <= r.maxHp);
        assert.ok(r.mana >= 0 && r.mana <= 6 && r.shield <= 45);
        if (r.phase === 'map') {
          const choices = adventureRoutes(r);
          assert.ok(choices.length > 0);
          const pick = profile === 'reckless' ? choices[choices.length - 1]! : choices[0]!;
          state = enterAdventureNode(state, pick.id);
        } else if (r.phase === 'battle') {
          const living = r.enemies.filter(e => e.hp > 0);
          const danger = living.filter(e => e.countdown === 1 && e.intent !== 'ward').reduce((sum,e)=>sum+e.damage*(e.intent==='heavy'?1.7:1)*(e.enraged?1.25:1),0);
          const action: AdventureAction = profile === 'reckless' ? 'strike' : danger > r.shield + 4 ? 'guard' : r.mana >= 3 ? 'spell' : 'strike';
          state = playAdventureWord(state, action, living.sort((a,b)=>a.hp-b.hp)[0]!.id, profile === 'learner' && steps % 3 === 0 ? 1 : 0, profile === 'reckless' ? 5000 : 3200).state;
        } else if (r.phase === 'reward') {
          state = chooseAdventureReward(state, r.hp < r.maxHp - 28 ? 'heal' : r.offers.includes('moss') ? 'moss' : r.offers[0] ?? 'power');
        } else if (r.phase === 'camp') state = adventureService(state, r.hp < r.maxHp - 20 ? 'rest' : 'train');
        else if (r.phase === 'event') state = adventureService(state, 'safe');
        else state = adventureService(state, r.gold >= 18 && r.hp < r.maxHp - 20 && !r.purchased.includes('potion') ? 'potion' : 'leave');
        if (steps % 7 === 0) {
          const saved = JSON.parse(JSON.stringify(normalizeProgressForSave({ game: { ...defaultGameState(), adventure: state } })));
          const restored = readGameState(saved).adventure!;
          assert.deepEqual(restored, state, 'Full save/load round trip during a campaign');
          state = restored;
        }
        checked++;
      }
      assert.ok(steps < 700, 'Campaign must terminate');
      if (state.run!.phase === 'won') {
        wins++;
        assert.equal(state.run!.depth, 15); assert.equal(state.victories, 1);
        assert.equal(playAdventureWord(state, 'strike', 0, 0, 1000).state, state, 'Cannot repeat victory rewards');
      }
      totalWords += state.run!.words;
    }
    rows.push({ role, profile, wins, runs: 40, averageWords: Math.round(totalWords / 40) });
  }
  for (const role of ROLES) {
    const tactical = rows.find(r => r.role === role && r.profile === 'tactical')!;
    const reckless = rows.find(r => r.role === role && r.profile === 'reckless')!;
    assert.ok(tactical.wins >= 24, 'Tactical play must be viable for every class');
    assert.ok(tactical.wins >= reckless.wins, 'Tactical choices must not reduce survival');
  }
  return { checked, rows };
}
