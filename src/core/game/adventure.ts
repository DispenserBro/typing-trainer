import type { AdventureAction, AdventureEnemy, AdventureFeedback, AdventureNode, AdventureRelic, AdventureRole, AdventureRoom, AdventureRun, AdventureState } from '../../shared/types/adventure';

export const RELICS: AdventureRelic[] = ['ember', 'shell', 'moss', 'lens', 'coin', 'fang', 'well', 'echo'];
export const ROLES: AdventureRole[] = ['warden', 'mage', 'ranger'];
export const FINAL_DEPTH = 15;
export const emptyAdventure = (): AdventureState => ({ version: 1, run: null, shards: 0, vitality: 0, might: 0, bestDepth: 0, victories: 0, runs: 0, discovered: [] });
const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));
function random(run: AdventureRun) {
  run.randomState = (Math.imul(run.randomState, 1664525) + 1013904223) >>> 0;
  return run.randomState / 4294967296;
}
function hash(seed: number, depth: number, lane: number) {
  let n = (seed ^ Math.imul(depth + 1, 374761393) ^ Math.imul(lane + 1, 668265263)) >>> 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0;
  return (n ^ (n >>> 16)) >>> 0;
}
export function adventureRegion(depth: number) { return Math.min(2, Math.floor(Math.max(0, depth - 1) / 5)); }
export function adventureNode(seed: number, depth: number, lane: number): AdventureNode {
  const roll = hash(seed, depth, lane) % 10;
  const kind: AdventureRoom = depth % 5 === 0 ? 'boss' : depth % 5 === 4
    ? (['camp', 'shop', 'elite'] as const)[lane]!
    : depth === 1 ? 'battle'
    : lane === 0 ? (roll < 4 ? 'camp' : roll < 7 ? 'event' : 'battle')
    : lane === 2 ? (roll < 5 ? 'elite' : roll < 8 ? 'event' : 'battle')
    : roll < 3 ? 'shop' : roll < 5 ? 'event' : 'battle';
  return { id: `${depth}-${lane}`, depth, lane, kind };
}
export function adventureRoutes(run: AdventureRun) {
  if (run.depth >= FINAL_DEPTH) return [];
  const depth = run.depth + 1;
  const lanes = depth % 5 === 0 ? [1] : [0, 1, 2].filter(lane => run.depth % 5 === 0 || Math.abs(lane - run.lane) <= 1);
  return lanes.map(lane => adventureNode(run.seed, depth, lane));
}
export function startAdventure(state: AdventureState, role: AdventureRole, language: string, layout: string, seed: number, difficulty: AdventureRun['difficulty']): AdventureState {
  const maxHp = 90 + state.vitality * 5 + (role === 'warden' ? 25 : 0) + (difficulty === 'story' ? 25 : 0);
  return { ...state, runs: state.runs + 1, run: {
    version: 1, seed: seed >>> 0, randomState: seed >>> 0, role, difficulty, language, layout,
    phase: 'map', depth: 0, lane: 1, path: [], hp: maxHp, maxHp, shield: 0,
    mana: role === 'mage' ? 3 : 1, gold: 20, power: state.might, combo: 0, bestCombo: 0,
    words: 0, errors: 0, elapsedMs: 0, relics: [], enemies: [], turn: 0, room: 'battle',
    offers: [], encounter: 0, purchased: [],
  } };
}
function offerRelics(run: AdventureRun) {
  const available = RELICS.filter(id => !run.relics.includes(id));
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(random(run) * (i + 1));
    [available[i], available[j]] = [available[j]!, available[i]!];
  }
  return available.slice(0, 3);
}
function rollIntent(run: AdventureRun, enemy: AdventureEnemy) {
  const roll = random(run);
  enemy.intent = enemy.kind === 'sentinel' && roll < .3 ? 'ward'
    : enemy.kind === 'wisp' && roll < .4 ? 'drain'
    : (enemy.kind === 'boss' || enemy.kind === 'stalker') && roll < .45 ? 'heavy' : 'attack';
  enemy.countdown = enemy.intent === 'heavy' ? 4 : enemy.enraged ? 2 : 3;
}
export function enterAdventureNode(state: AdventureState, nodeId: string): AdventureState {
  if (!state.run || state.run.phase !== 'map') return state;
  const node = adventureRoutes(state.run).find(n => n.id === nodeId);
  if (!node) return state;
  const run = structuredClone(state.run);
  Object.assign(run, { depth: node.depth, lane: node.lane, room: node.kind, shield: 0, combo: 0, turn: 0, purchased: [], enemies: [], offers: [] });
  run.path.push(node);
  run.encounter = hash(run.seed, run.depth, run.lane) % 3;
  if (['battle', 'elite', 'boss'].includes(node.kind)) {
    run.phase = 'battle';
    const region = adventureRegion(run.depth);
    const count = node.kind === 'boss' ? 1 : node.kind === 'elite' ? 2 : run.depth === 1 ? 1 : 1 + (hash(run.seed, run.depth, 8) % 2);
    for (let i = 0; i < count; i++) {
      const kind = node.kind === 'boss' ? 'boss' : (['slime', 'wisp', 'sentinel', 'stalker'] as const)[Math.floor(random(run) * 4)]!;
      const hp = (kind === 'boss' ? 180 + region * 100 : 38 + region * 20 + (node.kind === 'elite' ? 22 : 0)) + (kind === 'sentinel' ? 10 : 0);
      const enemy: AdventureEnemy = { id: i, kind, hp, maxHp: hp, damage: 7 + region * 3 + (node.kind === 'elite' ? 3 : 0) + (kind === 'boss' ? 6 : 0), armor: kind === 'sentinel' ? 3 : 0, intent: 'attack', countdown: 3 + i, enraged: false };
      rollIntent(run, enemy);
      enemy.countdown += i;
      run.enemies.push(enemy);
    }
  } else {
    run.phase = node.kind === 'camp' ? 'camp' : node.kind === 'shop' ? 'shop' : 'event';
    if (node.kind === 'shop') run.offers = offerRelics(run);
  }
  return { ...state, bestDepth: Math.max(state.bestDepth, node.depth), run };
}
// Text generation is owned by the shared practice content pipeline.
export function playAdventureWord(state: AdventureState, action: AdventureAction, target: number, mistakes: number, elapsedMs: number): { state: AdventureState; effects: AdventureFeedback[] } {
  const old = state.run;
  if (!old || old.phase !== 'battle' || (action === 'spell' && old.mana < 3)) return { state, effects: [] };
  const selected = old.enemies.find(e => e.id === target && e.hp > 0) ?? old.enemies.find(e => e.hp > 0);
  if (!selected) return { state, effects: [] };
  const run = structuredClone(old);
  const effects: AdventureFeedback[] = [];
  const emit = (kind: AdventureFeedback['kind'], amount: number, id = selected.id, critical = false) =>
    effects.push({ id: run.words * 10 + effects.length, kind, target: id, amount, critical });
  const errors = clamp(Number.isFinite(mistakes) ? Math.floor(mistakes) : 0, 0, 100);
  const perfect = errors === 0;
  run.words += 1; run.turn += 1; run.errors += errors;
  run.elapsedMs += clamp(Number.isFinite(elapsedMs) ? elapsedMs : 0, 0, 600000);
  run.combo = perfect ? run.combo + 1 : 0;
  run.bestCombo = Math.max(run.bestCombo, run.combo);
  const critical = run.combo > 0 && run.combo % (run.relics.includes('lens') ? 3 : 5) === 0;
  const multiplier = critical ? (run.role === 'ranger' ? 2.3 : 1.8) : 1;
  const quality = Math.max(.5, 1 - errors * .12);
  const speedBonus = elapsedMs > 0 && elapsedMs < 2200 ? 2 : 0;
  const power = run.power + (run.relics.includes('ember') ? 3 : 0);
  const damage = Math.round(((action === 'spell' ? 20 + (run.role === 'mage' ? 6 : 0) : action === 'guard' ? 5 : 12) + power + speedBonus) * quality * multiplier);
  if (action === 'spell') run.mana -= 3;
  else if (perfect) run.mana = Math.min(6, run.mana + 1);
  if (action === 'guard') {
    const shield = 12 + (run.role === 'warden' ? 5 : 0) + (run.relics.includes('shell') ? 5 : 0);
    run.shield = Math.min(45, run.shield + shield);
    emit('guard', shield);
  }
  for (const enemy of run.enemies) {
    if (action === 'guard' || enemy.hp <= 0 || (action !== 'spell' && enemy.id !== selected.id)) continue;
    const hit = Math.max(1, damage - (run.relics.includes('fang') ? 0 : enemy.armor));
    enemy.hp = Math.max(0, enemy.hp - hit);
    emit(action === 'spell' ? 'spell' : 'strike', hit, enemy.id, critical);
    if (enemy.kind === 'boss' && enemy.hp > 0 && enemy.hp <= enemy.maxHp / 2) enemy.enraged = true;
  }
  if (perfect && run.relics.includes('echo') && run.combo % 3 === 0) run.shield = Math.min(45, run.shield + 6);
  if (run.enemies.every(e => e.hp <= 0)) {
    const boss = run.room === 'boss';
    run.gold += (boss ? 40 : run.room === 'elite' ? 30 : 18) + (run.relics.includes('coin') ? 10 : 0);
    run.hp = Math.min(run.maxHp, run.hp + (run.relics.includes('moss') ? 8 : 0) + (boss ? 20 : 0));
    run.shield = 0;
    if (boss) run.power += 2;
    run.phase = run.depth === FINAL_DEPTH ? 'won' : 'reward';
    run.offers = offerRelics(run);
    emit('win', 0);
    return { state: { ...state, run, shards: state.shards + (boss ? 3 : 1), victories: state.victories + (run.phase === 'won' ? 1 : 0) }, effects };
  }
  for (const enemy of run.enemies) {
    if (enemy.hp <= 0) continue;
    enemy.countdown -= 1;
    if (enemy.countdown > 0) continue;
    if (enemy.intent === 'ward') enemy.armor = Math.min(8, enemy.armor + 2);
    else {
      const incoming = Math.round(enemy.damage * (enemy.intent === 'heavy' ? 1.7 : 1) * (enemy.enraged ? 1.25 : 1) * (run.difficulty === 'story' ? .7 : 1));
      const absorbed = Math.min(run.shield, incoming);
      run.shield -= absorbed;
      const loss = incoming - absorbed;
      run.hp = Math.max(0, run.hp - loss);
      if (enemy.intent === 'drain') run.mana = Math.max(0, run.mana - 1);
      emit('hurt', loss, enemy.id);
    }
    rollIntent(run, enemy);
  }
  if (run.relics.includes('well') && run.turn % 4 === 0) run.mana = Math.min(6, run.mana + 1);
  if (run.hp === 0) { run.phase = 'lost'; emit('lose', 0); }
  return { state: { ...state, run }, effects };
}
export function chooseAdventureReward(state: AdventureState, choice: string): AdventureState {
  if (!state.run || state.run.phase !== 'reward') return state;
  const run = structuredClone(state.run);
  if (choice === 'heal') run.hp = Math.min(run.maxHp, run.hp + 25);
  else if (choice === 'power') run.power += 1;
  else if (run.offers.includes(choice as AdventureRelic)) run.relics.push(choice as AdventureRelic);
  else return state;
  run.phase = 'map'; run.offers = [];
  return { ...state, run, discovered: Array.from(new Set([...state.discovered, ...run.relics])) };
}
export function adventureService(state: AdventureState, choice: string): AdventureState {
  const old = state.run;
  if (!old || !['camp', 'shop', 'event'].includes(old.phase)) return state;
  const run = structuredClone(old);
  if (choice === 'leave') { run.phase = 'map'; return { ...state, run }; }
  if (run.phase === 'camp') {
    if (choice === 'rest') run.hp = Math.min(run.maxHp, run.hp + 35);
    else if (choice === 'train') { run.power += 2; run.mana = Math.min(6, run.mana + 2); }
    else return state;
    run.phase = 'map';
  } else if (run.phase === 'shop') {
    if (run.purchased.includes(choice)) return state;
    const cost = choice === 'potion' ? 18 : choice === 'forge' ? 30 : 40;
    if (run.gold < cost) return state;
    if (choice === 'potion') { if (run.hp === run.maxHp) return state; run.hp = Math.min(run.maxHp, run.hp + 30); }
    else if (choice === 'forge') run.power += 2;
    else if (run.offers.includes(choice as AdventureRelic) && !run.relics.includes(choice as AdventureRelic)) run.relics.push(choice as AdventureRelic);
    else return state;
    run.gold -= cost; run.purchased.push(choice);
  } else {
    if (choice === 'safe') { run.hp = Math.min(run.maxHp, run.hp + 12); run.gold += 8; }
    else if (choice === 'risk') {
      if (run.hp <= 15) return state;
      run.hp -= 15;
      const relic = offerRelics(run)[0];
      if (relic) run.relics.push(relic); else run.power += 3;
      run.gold += 20;
    } else if (choice === 'blessing') {
      if (run.gold < 20) return state;
      run.gold -= 20; run.maxHp += 12; run.hp += 12;
    } else return state;
    run.phase = 'map';
  }
  return { ...state, run, discovered: Array.from(new Set([...state.discovered, ...run.relics])) };
}
export function upgradeAdventure(state: AdventureState, kind: 'vitality' | 'might'): AdventureState {
  if (state.run && !['won', 'lost'].includes(state.run.phase)) return state;
  const cost = 4 + state[kind] * 3;
  if (state[kind] >= 5 || state.shards < cost) return state;
  return { ...state, shards: state.shards - cost, [kind]: state[kind] + 1 };
}

// Validate the persisted domain object, never execute saved content or coerce arbitrary strings.
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const number = (v: unknown, low: number, high: number) => typeof v === 'number' && Number.isFinite(v) ? clamp(Math.floor(v), low, high) : low;
const relics = (v: unknown): AdventureRelic[] => Array.isArray(v) ? Array.from(new Set(v.filter((id): id is AdventureRelic => RELICS.includes(id)))) : [];
export function normalizeAdventure(value: unknown): AdventureState {
  const empty = emptyAdventure();
  if (!record(value) || value.version !== 1) return empty;
  const result: AdventureState = {
    version: 1, run: null, shards: number(value.shards, 0, 100000), vitality: number(value.vitality, 0, 5),
    might: number(value.might, 0, 5), bestDepth: number(value.bestDepth, 0, FINAL_DEPTH),
    victories: number(value.victories, 0, 100000), runs: number(value.runs, 0, 100000), discovered: relics(value.discovered),
  };
  const r = value.run;
  if (!record(r) || r.version !== 1 || !ROLES.includes(r.role as AdventureRole)
    || !['map', 'battle', 'reward', 'camp', 'shop', 'event', 'won', 'lost'].includes(String(r.phase))
    || !['story', 'normal'].includes(String(r.difficulty))
    || typeof r.language !== 'string' || typeof r.layout !== 'string'
    || !Array.isArray(r.enemies) || !Array.isArray(r.path)) return result;
  const enemies: AdventureEnemy[] = [];
  for (const e of r.enemies.slice(0, 3)) {
    if (!record(e) || !['slime', 'wisp', 'sentinel', 'stalker', 'boss'].includes(String(e.kind)) || !['attack', 'heavy', 'drain', 'ward'].includes(String(e.intent))) return result;
    const maxHp = number(e.maxHp, 1, 10000);
    enemies.push({ id: enemies.length, kind: e.kind as AdventureEnemy['kind'], maxHp, hp: number(e.hp, 0, maxHp),
      damage: number(e.damage, 1, 100), armor: number(e.armor, 0, 8), intent: e.intent as AdventureEnemy['intent'],
      countdown: number(e.countdown, 1, 8), enraged: e.enraged === true });
  }
  if (r.phase === 'battle' && !enemies.some(e => e.hp > 0)) return result;
  const seed = number(r.seed, 0, 4294967295), depth = number(r.depth, 0, FINAL_DEPTH);
  const path: AdventureNode[] = [];
  for (const n of r.path.slice(0, FINAL_DEPTH)) {
    if (!record(n) || typeof n.depth !== 'number' || n.depth !== path.length + 1 || ![0, 1, 2].includes(Number(n.lane))) return result;
    path.push(adventureNode(seed, n.depth, Number(n.lane)));
  }
  if (path.length !== depth) return result;
  const maxHp = number(r.maxHp, 1, 500);
  result.run = {
    version: 1, seed, randomState: number(r.randomState, 0, 4294967295), role: r.role as AdventureRole,
    difficulty: r.difficulty as AdventureRun['difficulty'], language: r.language.slice(0, 20), layout: r.layout.slice(0, 50),
    phase: r.phase as AdventureRun['phase'], depth, lane: number(r.lane, 0, 2), path,
    hp: number(r.hp, 0, maxHp), maxHp, shield: number(r.shield, 0, 45), mana: number(r.mana, 0, 6),
    gold: number(r.gold, 0, 10000), power: number(r.power, 0, 100), combo: number(r.combo, 0, 10000),
    bestCombo: number(r.bestCombo, 0, 10000), words: number(r.words, 0, 100000), errors: number(r.errors, 0, 100000),
    elapsedMs: number(r.elapsedMs, 0, 100000000), relics: relics(r.relics), enemies,
    turn: number(r.turn, 0, 10000), room: path[path.length - 1]?.kind ?? 'battle',
    offers: relics(r.offers), encounter: number(r.encounter, 0, 2),
    purchased: Array.isArray(r.purchased) ? r.purchased.filter((x): x is string => typeof x === 'string').slice(0, 6) : [],
  };
  if (result.run.hp === 0) result.run.phase = 'lost';
  return result;
}
