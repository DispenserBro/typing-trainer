/**
 * Boss archetypes – each archetype changes the boss fight goal,
 * penalties, UI hints, and reward balance.
 *
 * Four archetypes:
 *  1. precision  – extremely high accuracy requirement
 *  2. steadiness – stable tempo (low deviation between keypresses)
 *  3. endurance  – extra-long text
 *  4. flawless   – streak without any error (allowed error budget = 0-2)
 */

export type BossArchetypeId = 'precision' | 'steadiness' | 'endurance' | 'flawless';

export interface BossArchetypeConfig {
  id: BossArchetypeId;
  /** Display name shown in HUD */
  name: string;
  /** Short subtitle for the result card */
  subtitle: string;
  /** Colour accent class added to the boss HUD chip */
  accent: 'red' | 'blue' | 'purple' | 'orange';
  /** Icon key (lucide-react icon name) */
  icon: string;
  /** Description shown in the map node and pre-fight tooltip */
  description: string;
  /** Multiplier applied to BOSS_LEVEL_WORDS (1 = default 28) */
  wordCountMultiplier: number;
  /** Extra accuracy added on top of BOSS_MIN_ACCURACY (absolute %) */
  extraAccuracy: number;
  /**
   * If > 0 the boss enforces max allowed errors (absolute count).
   * When exceeded the fight is failed regardless of accuracy %.
   */
  maxErrors: number;
  /** Multiplier applied to base boss timer (1 = default) */
  timerMultiplier: number;
  /**
   * If true the result screen evaluates rhythm stability
   * (average deviation of keypress intervals).
   * A deviation above `maxRhythmDeviation` causes failure.
   */
  checkRhythm: boolean;
  /** Max allowed deviation in ms (only when checkRhythm = true) */
  maxRhythmDeviation: number;
  /** Extra reward XP multiplier for surviving this archetype */
  rewardMultiplier: number;
}

export const BOSS_ARCHETYPES: Record<BossArchetypeId, BossArchetypeConfig> = {
  precision: {
    id: 'precision',
    name: 'Снайпер',
    subtitle: 'Точность — всё',
    accent: 'red',
    icon: 'crosshair',
    description: 'Требования к точности резко повышены. Каждый промах ощутим.',
    wordCountMultiplier: 1,
    extraAccuracy: 3,
    maxErrors: 0,
    timerMultiplier: 1.15,
    checkRhythm: false,
    maxRhythmDeviation: 0,
    rewardMultiplier: 1.2,
  },
  steadiness: {
    id: 'steadiness',
    name: 'Метроном',
    subtitle: 'Ровный темп решает',
    accent: 'blue',
    icon: 'activity',
    description: 'Важна не скорость, а стабильность ритма. Резкие просадки и ускорения караются.',
    wordCountMultiplier: 1,
    extraAccuracy: 0,
    maxErrors: 0,
    timerMultiplier: 1.25,
    checkRhythm: true,
    maxRhythmDeviation: 180,
    rewardMultiplier: 1.15,
  },
  endurance: {
    id: 'endurance',
    name: 'Марафон',
    subtitle: 'Длинная дистанция',
    accent: 'purple',
    icon: 'scroll-text',
    description: 'Текст значительно длиннее обычного. Нужна выносливость и устойчивый темп.',
    wordCountMultiplier: 1.5,
    extraAccuracy: 0,
    maxErrors: 0,
    timerMultiplier: 1.8,
    checkRhythm: false,
    maxRhythmDeviation: 0,
    rewardMultiplier: 1.3,
  },
  flawless: {
    id: 'flawless',
    name: 'Абсолют',
    subtitle: 'Ноль ошибок',
    accent: 'orange',
    icon: 'shield-check',
    description: 'Допускается не больше 2 ошибок за весь бой. Одно лишнее нажатие — провал.',
    wordCountMultiplier: 0.85,
    extraAccuracy: 0,
    maxErrors: 2,
    timerMultiplier: 1.35,
    checkRhythm: false,
    maxRhythmDeviation: 0,
    rewardMultiplier: 1.25,
  },
};

const ARCHETYPE_IDS: BossArchetypeId[] = ['precision', 'steadiness', 'endurance', 'flawless'];

/**
 * Deterministically picks a boss archetype for a given boss level.
 * Uses a simple rotation so every archetype appears equally often,
 * with a bit of mixing so the order isn't boring.
 */
export function getBossArchetype(bossLevel: number): BossArchetypeConfig {
  // Boss levels: 5, 10, 15, 20, ...  →  bossIndex = 0, 1, 2, 3, ...
  const bossIndex = Math.floor(bossLevel / 5) - 1;
  // Simple shuffle via golden-ratio offset
  const shuffled = (bossIndex * 3 + 1) % ARCHETYPE_IDS.length;
  const id = ARCHETYPE_IDS[Math.max(0, shuffled)] ?? 'precision';
  return BOSS_ARCHETYPES[id];
}

/**
 * Returns rhythm deviation from an array of keypress intervals (ms).
 * Uses mean-absolute-deviation which is more intuitive than std-dev for typing.
 */
export function computeRhythmDeviation(intervals: number[]): number {
  if (intervals.length < 2) return 0;
  // Filter out pauses (> 2s) which are likely breaks, not typing
  const filtered = intervals.filter(ms => ms > 0 && ms < 2000);
  if (filtered.length < 2) return 0;
  const mean = filtered.reduce((s, v) => s + v, 0) / filtered.length;
  const deviation = filtered.reduce((s, v) => s + Math.abs(v - mean), 0) / filtered.length;
  return deviation;
}
