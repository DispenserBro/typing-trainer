export type AdventureRole = 'warden' | 'mage' | 'ranger';
export type AdventureAction = 'strike' | 'guard' | 'spell';
export type AdventureRoom = 'battle' | 'elite' | 'camp' | 'shop' | 'event' | 'boss';
export type AdventurePhase = 'map' | 'battle' | 'reward' | 'camp' | 'shop' | 'event' | 'won' | 'lost';
export type AdventureRelic = 'ember' | 'shell' | 'moss' | 'lens' | 'coin' | 'fang' | 'well' | 'echo';
export type AdventureEnemyKind = 'slime' | 'wisp' | 'sentinel' | 'stalker' | 'boss';
export type AdventureIntent = 'attack' | 'heavy' | 'drain' | 'ward';
export interface AdventureEnemy {
  id: number; kind: AdventureEnemyKind; hp: number; maxHp: number;
  damage: number; armor: number; intent: AdventureIntent; countdown: number; enraged: boolean;
}
export interface AdventureNode { id: string; depth: number; lane: number; kind: AdventureRoom; }
export interface AdventureRun {
  version: 1; seed: number; randomState: number; role: AdventureRole; difficulty: 'story' | 'normal';
  language: string; layout: string; phase: AdventurePhase; depth: number; lane: number;
  path: AdventureNode[]; hp: number; maxHp: number; shield: number; mana: number;
  gold: number; power: number; combo: number; bestCombo: number; words: number; errors: number;
  elapsedMs: number; relics: AdventureRelic[]; enemies: AdventureEnemy[]; turn: number;
  room: AdventureRoom; offers: AdventureRelic[]; encounter: number; purchased: string[];
}
export interface AdventureState {
  version: 1; run: AdventureRun | null; shards: number; vitality: number; might: number;
  bestDepth: number; victories: number; runs: number; discovered: AdventureRelic[];
}
export interface AdventureFeedback {
  id: number; kind: 'strike' | 'guard' | 'spell' | 'hurt' | 'heal' | 'loot' | 'win' | 'lose';
  target: number; amount: number; critical: boolean;
}
