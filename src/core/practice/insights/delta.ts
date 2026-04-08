import type {
  FingerName,
  LayoutPracticeInsights,
  PracticeInsightAggregate,
  PracticeInsightRow,
  Session,
} from '../../../shared/types';
import {
  computeAggregateWeakness,
  computeBigramWeakness,
  computeRhythmWeakness,
  createAggregate,
  createBigramInsight,
  createEmptyLayoutPracticeInsights,
  createRhythmInsight,
} from './core';

const KB_ROWS: Record<string, string[][]> = {
  qwerty: [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', '\''],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
  ],
  dvorak: [
    ['\'', ',', '.', 'p', 'y', 'f', 'g', 'c', 'r', 'l', '/', '+'],
    ['a', 'o', 'e', 'u', 'i', 'd', 'h', 't', 'n', 's', '-'],
    [';', 'q', 'j', 'k', 'x', 'b', 'm', 'w', 'v', 'z'],
  ],
  'йцукен': [
    ['й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х', 'ъ'],
    ['ф', 'ы', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'э'],
    ['я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю', '.'],
  ],
  'яверты': [
    ['я', 'ш', 'е', 'р', 'т', 'ы', 'у', 'и', 'о', 'п', 'ъ', 'ь'],
    ['а', 'с', 'д', 'ф', 'г', 'х', 'й', 'к', 'л', 'э', 'ю'],
    ['щ', 'ж', 'ц', 'в', 'б', 'н', 'м', 'ч', 'з', '.'],
  ],
};

function getRowMap(layoutId: string): Record<string, PracticeInsightRow> {
  const rows = KB_ROWS[layoutId] ?? KB_ROWS.qwerty;
  const map: Record<string, PracticeInsightRow> = {};

  rows[0]?.forEach(key => { map[key.toLowerCase()] = 'top'; });
  rows[1]?.forEach(key => { map[key.toLowerCase()] = 'middle'; });
  rows[2]?.forEach(key => { map[key.toLowerCase()] = 'bottom'; });

  return map;
}

function getFingerMap(layoutFingers: Record<FingerName, string[]>): Record<string, FingerName> {
  const map: Record<string, FingerName> = {};
  for (const [finger, keys] of Object.entries(layoutFingers)) {
    keys.forEach((key) => {
      map[key.toLowerCase()] = finger as FingerName;
    });
  }
  return map;
}

function updateAggregate(
  aggregate: PracticeInsightAggregate,
  args: { hit: boolean; miss: boolean; time: number },
) {
  aggregate.hits += args.hit ? 1 : 0;
  aggregate.misses += args.miss ? 1 : 0;
  aggregate.totalTime += Math.max(0, args.time);
  aggregate.weakness = computeAggregateWeakness(aggregate);
}

function updateBigram(
  aggregate: ReturnType<typeof createBigramInsight>,
  args: { hit: boolean; miss: boolean; time: number },
) {
  aggregate.hits += args.hit ? 1 : 0;
  aggregate.misses += args.miss ? 1 : 0;
  aggregate.totalTransitionTime += Math.max(0, args.time);
  aggregate.weakness = computeBigramWeakness(aggregate);
}

export function buildPracticeInsightsDelta(args: {
  layoutId: string;
  layoutFingers: Record<FingerName, string[]>;
  session: Session;
}): LayoutPracticeInsights {
  const { layoutId, layoutFingers, session } = args;
  const rowMap = getRowMap(layoutId);
  const fingerMap = getFingerMap(layoutFingers);
  const delta = createEmptyLayoutPracticeInsights();
  const intervals: number[] = [];
  const keypresses = session.keypresses.filter(entry => entry.expected && entry.actual && entry.expected !== ' ');

  for (let index = 0; index < keypresses.length; index += 1) {
    const entry = keypresses[index];
    const expected = entry.expected.toLowerCase();
    const isHit = entry.correct;
    const time = entry.interval > 0 ? entry.interval : 0;

    delta.chars[expected] ??= createAggregate();
    updateAggregate(delta.chars[expected], { hit: isHit, miss: !isHit, time });

    const row = rowMap[expected];
    if (row) {
      updateAggregate(delta.rows[row], { hit: isHit, miss: !isHit, time });
    }

    const finger = fingerMap[expected];
    if (finger) {
      delta.fingers[finger] ??= createAggregate();
      updateAggregate(delta.fingers[finger]!, { hit: isHit, miss: !isHit, time });
    }

    if (time > 0) intervals.push(time);

    if (index === 0) continue;

    const previous = keypresses[index - 1];
    const prevExpected = previous.expected.toLowerCase();
    if (prevExpected === ' ' || expected === ' ') continue;
    const bigram = `${prevExpected}${expected}`;
    delta.bigrams[bigram] ??= createBigramInsight();
    updateBigram(delta.bigrams[bigram], {
      hit: previous.correct && entry.correct,
      miss: !(previous.correct && entry.correct),
      time,
    });
  }

  if (intervals.length > 0) {
    const averageInterval = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
    const averageDeviation = intervals.reduce((sum, value) => sum + Math.abs(value - averageInterval), 0) / intervals.length;
    delta.rhythm = {
      samples: intervals.length,
      averageInterval,
      averageDeviation,
      weakness: computeRhythmWeakness({
        samples: intervals.length,
        averageInterval,
        averageDeviation,
      }),
    };
  }

  delta.lastUpdated = new Date().toISOString();
  return delta;
}

export function summarizeSessionRhythm(session: Session) {
  const intervals = session.keypresses
    .filter(entry => entry.expected && entry.expected !== ' ' && entry.interval > 0)
    .map(entry => entry.interval);

  if (intervals.length === 0) {
    return createRhythmInsight();
  }

  const averageInterval = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  const averageDeviation = intervals.reduce((sum, value) => sum + Math.abs(value - averageInterval), 0) / intervals.length;

  return {
    samples: intervals.length,
    averageInterval,
    averageDeviation,
    weakness: computeRhythmWeakness({
      samples: intervals.length,
      averageInterval,
      averageDeviation,
    }),
  };
}
