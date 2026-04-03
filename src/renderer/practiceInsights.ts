import type {
  FingerName,
  LayoutPracticeInsights,
  PracticeBigramInsight,
  PracticeInsightAggregate,
  PracticeInsightRow,
  PracticeRhythmInsight,
  Session,
} from '../shared/types';

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

function createAggregate(): PracticeInsightAggregate {
  return { hits: 0, misses: 0, totalTime: 0, weakness: 0 };
}

function createBigramInsight(): PracticeBigramInsight {
  return { hits: 0, misses: 0, totalTransitionTime: 0, weakness: 0 };
}

function createRhythmInsight(): PracticeRhythmInsight {
  return { samples: 0, averageInterval: 0, averageDeviation: 0, weakness: 0 };
}

export function createEmptyLayoutPracticeInsights(): LayoutPracticeInsights {
  return {
    chars: {},
    bigrams: {},
    fingers: {},
    rows: {
      top: createAggregate(),
      middle: createAggregate(),
      bottom: createAggregate(),
    },
    rhythm: createRhythmInsight(),
    lastUpdated: '',
  };
}

function computeAggregateWeakness(aggregate: Pick<PracticeInsightAggregate, 'hits' | 'misses' | 'totalTime'>) {
  const attempts = aggregate.hits + aggregate.misses;
  if (attempts <= 0) return 0;

  const errorPenalty = (aggregate.misses / attempts) * 70;
  const averageTime = aggregate.hits > 0 ? aggregate.totalTime / aggregate.hits : 600;
  const speedPenalty = Math.min(30, Math.max(0, (averageTime - 220) / 8));
  return Math.round((errorPenalty + speedPenalty) * 10) / 10;
}

function computeBigramWeakness(aggregate: Pick<PracticeBigramInsight, 'hits' | 'misses' | 'totalTransitionTime'>) {
  const attempts = aggregate.hits + aggregate.misses;
  if (attempts <= 0) return 0;

  const errorPenalty = (aggregate.misses / attempts) * 75;
  const averageTime = aggregate.hits > 0 ? aggregate.totalTransitionTime / aggregate.hits : 650;
  const speedPenalty = Math.min(25, Math.max(0, (averageTime - 240) / 10));
  return Math.round((errorPenalty + speedPenalty) * 10) / 10;
}

function computeRhythmWeakness(rhythm: Pick<PracticeRhythmInsight, 'samples' | 'averageInterval' | 'averageDeviation'>) {
  if (rhythm.samples <= 0 || rhythm.averageInterval <= 0) return 0;
  const relativeDeviation = rhythm.averageDeviation / rhythm.averageInterval;
  return Math.round(Math.min(100, relativeDeviation * 100) * 10) / 10;
}

export function getRhythmScore(rhythm: Pick<PracticeRhythmInsight, 'samples' | 'averageInterval' | 'averageDeviation'>) {
  return Math.max(0, Math.round((100 - computeRhythmWeakness(rhythm)) * 10) / 10);
}

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
  aggregate: PracticeBigramInsight,
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

export function summarizeSessionRhythm(session: Session): PracticeRhythmInsight {
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

export function mergeLayoutPracticeInsights(
  base: LayoutPracticeInsights,
  delta: LayoutPracticeInsights,
): LayoutPracticeInsights {
  const next = createEmptyLayoutPracticeInsights();

  const mergedChars = new Set([...Object.keys(base.chars), ...Object.keys(delta.chars)]);
  for (const char of mergedChars) {
    const target = createAggregate();
    const prev = base.chars[char];
    const extra = delta.chars[char];
    if (prev) {
      target.hits += prev.hits;
      target.misses += prev.misses;
      target.totalTime += prev.totalTime;
    }
    if (extra) {
      target.hits += extra.hits;
      target.misses += extra.misses;
      target.totalTime += extra.totalTime;
    }
    target.weakness = computeAggregateWeakness(target);
    next.chars[char] = target;
  }

  const mergedBigrams = new Set([...Object.keys(base.bigrams), ...Object.keys(delta.bigrams)]);
  for (const bigram of mergedBigrams) {
    const target = createBigramInsight();
    const prev = base.bigrams[bigram];
    const extra = delta.bigrams[bigram];
    if (prev) {
      target.hits += prev.hits;
      target.misses += prev.misses;
      target.totalTransitionTime += prev.totalTransitionTime;
    }
    if (extra) {
      target.hits += extra.hits;
      target.misses += extra.misses;
      target.totalTransitionTime += extra.totalTransitionTime;
    }
    target.weakness = computeBigramWeakness(target);
    next.bigrams[bigram] = target;
  }

  const mergedFingers = new Set([
    ...Object.keys(base.fingers),
    ...Object.keys(delta.fingers),
  ]) as Set<FingerName>;
  for (const finger of mergedFingers) {
    const target = createAggregate();
    const prev = base.fingers[finger];
    const extra = delta.fingers[finger];
    if (prev) {
      target.hits += prev.hits;
      target.misses += prev.misses;
      target.totalTime += prev.totalTime;
    }
    if (extra) {
      target.hits += extra.hits;
      target.misses += extra.misses;
      target.totalTime += extra.totalTime;
    }
    target.weakness = computeAggregateWeakness(target);
    next.fingers[finger] = target;
  }

  (['top', 'middle', 'bottom'] as PracticeInsightRow[]).forEach((row) => {
    const target = createAggregate();
    target.hits = base.rows[row].hits + delta.rows[row].hits;
    target.misses = base.rows[row].misses + delta.rows[row].misses;
    target.totalTime = base.rows[row].totalTime + delta.rows[row].totalTime;
    target.weakness = computeAggregateWeakness(target);
    next.rows[row] = target;
  });

  const rhythmSamples = base.rhythm.samples + delta.rhythm.samples;
  const averageInterval = rhythmSamples > 0
    ? ((base.rhythm.averageInterval * base.rhythm.samples) + (delta.rhythm.averageInterval * delta.rhythm.samples)) / rhythmSamples
    : 0;
  const averageDeviation = rhythmSamples > 0
    ? ((base.rhythm.averageDeviation * base.rhythm.samples) + (delta.rhythm.averageDeviation * delta.rhythm.samples)) / rhythmSamples
    : 0;

  next.rhythm = {
    samples: rhythmSamples,
    averageInterval,
    averageDeviation,
    weakness: computeRhythmWeakness({ samples: rhythmSamples, averageInterval, averageDeviation }),
  };

  next.lastUpdated = delta.lastUpdated || base.lastUpdated;
  return next;
}
