import type {
  HistoryEntry,
  LayoutsData,
  PracticeContentMode,
  PracticeTrainingMode,
  Progress,
} from '../../shared/types';
import { formatDelta } from '../stats/utils';

type ScopedHistoryEntry = {
  layoutId: string;
  layoutLabel: string;
  languageId: string;
  languageLabel: string;
  entry: HistoryEntry;
};

type ResultComparisonInput = {
  wpm: number;
  acc: number;
};

export interface ResultComparisonBenchmark {
  label: string;
  entry: HistoryEntry;
  contextLabel: string;
}

export interface ResultComparisonDelta {
  label: string;
  speedDelta: number;
  accuracyDelta: number;
  formattedSpeedDelta: string;
  formattedAccuracyDelta: string;
  tone: 'up' | 'down' | 'flat';
}

export interface ResultComparisonSummary {
  previousAttempt: ResultComparisonBenchmark | null;
  previousDelta: ResultComparisonDelta | null;
  recentBest: ResultComparisonBenchmark | null;
  recentBestDelta: ResultComparisonDelta | null;
}

export interface HomePersonalRecordCard {
  id: string;
  title: string;
  subtitle: string;
  record: ScopedHistoryEntry | null;
}

export interface ModeFocusSnapshot {
  id: 'practice' | 'test' | 'survival' | 'flawless';
  title: string;
  description: string;
  actionMode: string;
  attempts: number;
  bestEntry: HistoryEntry | null;
  lastEntry: HistoryEntry | null;
  emphasis: 'good' | 'warn' | 'neutral';
  recommendation: string;
}

export interface ModeFollowupRecommendation {
  title: string;
  description: string;
  actionMode: string;
  actionLabel: string;
}

export interface LayoutMasteryMilestone {
  id: string;
  title: string;
  threshold: number;
  description: string;
  rewardTitle: string;
  rewardDescription: string;
}

export interface LayoutMasterySnapshot {
  layoutId: string;
  layoutLabel: string;
  currentScore: number;
  currentMilestone: LayoutMasteryMilestone;
  nextMilestone: LayoutMasteryMilestone | null;
  progressPercent: number;
  remainingPoints: number;
  unlockedLetters: number;
  totalLetters: number;
  practiceSessions: number;
  bestPracticeWpm: number;
  bestPracticeAccuracy: number;
  milestones: LayoutMasteryMilestone[];
  unlockedMilestones: LayoutMasteryMilestone[];
  activeRewardTitle: string;
  activeRewardDescription: string;
  nextRewardTitle: string | null;
  nextRewardDescription: string | null;
}

export interface LayoutMasteryResultSummary {
  previous: LayoutMasterySnapshot;
  current: LayoutMasterySnapshot;
  scoreDelta: number;
  unlockedMilestone: LayoutMasteryMilestone | null;
}

const PRACTICE_TRAINING_MODE_LABELS: Record<PracticeTrainingMode, string> = {
  normal: 'Обычный темп',
  rhythm: 'Ровный ритм',
};

const PRACTICE_CONTENT_MODE_LABELS: Record<PracticeContentMode, string> = {
  'adaptive-words': 'Слова',
  syllables: 'Слоги',
  'pseudo-words': 'Псевдослова',
  sentences: 'Предложения',
  custom: 'Свои наборы',
};

const PRACTICE_SCENARIO_LABELS = {
  'practice-normal': 'Обычная практика',
  'practice-rhythm': 'Ритм-практика',
  sprint: 'Спринт',
  survival: 'Выживание',
  flawless: 'Безошибочный режим',
} as const;

const LAYOUT_MASTERY_MILESTONES: LayoutMasteryMilestone[] = [
  {
    id: 'first-steps',
    title: 'Первые шаги',
    threshold: 0,
    description: 'База раскладки и первые уверенные попытки уже на месте.',
    rewardTitle: 'Стартовый mastery-бейдж',
    rewardDescription: 'Раскладка получает собственный статус и начинает копить явную цепочку мастерства.',
  },
  {
    id: 'steady-hands',
    title: 'Ровные руки',
    threshold: 25,
    description: 'Раскладка перестаёт быть чужой, а темп становится стабильнее.',
    rewardTitle: 'Фокус на слабых местах',
    rewardDescription: 'Мастерство начинает подсвечивать, что именно ещё отделяет раскладку от следующей ступени.',
  },
  {
    id: 'confident-flow',
    title: 'Уверенный поток',
    threshold: 50,
    description: 'Появляется хороший темп, меньше случайных срывов и провалов.',
    rewardTitle: 'Продвинутый result-callout',
    rewardDescription: 'После попыток можно явно показывать progression-callout по этой раскладке как часть mastery-цепочки.',
  },
  {
    id: 'layout-expert',
    title: 'Эксперт раскладки',
    threshold: 75,
    description: 'Навык уже держится на длинной дистанции, а не только в пиковых сессиях.',
    rewardTitle: 'Экспертный титул',
    rewardDescription: 'Раскладка получает устойчивый экспертный статус и отдельный reward-preview на главном экране.',
  },
  {
    id: 'layout-master',
    title: 'Мастер раскладки',
    threshold: 100,
    description: 'Максимальная веха: раскладка прокачана и готова к долгой прогрессии.',
    rewardTitle: 'Статус Mastered',
    rewardDescription: 'Раскладка считается полностью освоенной и может быть отмечена как mastered в дальнейшей мета-прогрессии.',
  },
];

type LayoutMasterySnapshotOptions = {
  historyEntriesOverride?: HistoryEntry[];
  unlockedLettersOverride?: number;
};

function getLanguageLabel(layouts: LayoutsData, languageId: string) {
  return layouts.languages.find(language => language.id === languageId)?.label ?? languageId.toUpperCase();
}

function flattenHistory(progress: Progress, layouts: LayoutsData): ScopedHistoryEntry[] {
  return Object.entries(progress.history ?? {}).flatMap(([layoutId, entries]) => {
    const layout = layouts.layouts[layoutId];
    const layoutLabel = layout?.label ?? layoutId.toUpperCase();
    const languageId = layout?.lang ?? 'unknown';
    const languageLabel = getLanguageLabel(layouts, languageId);

    return entries.map((entry) => ({
      layoutId,
      layoutLabel,
      languageId,
      languageLabel,
      entry,
    }));
  });
}

function compareEntries(left: ScopedHistoryEntry, right: ScopedHistoryEntry) {
  if (left.entry.wpm !== right.entry.wpm) return left.entry.wpm - right.entry.wpm;
  if (left.entry.acc !== right.entry.acc) return left.entry.acc - right.entry.acc;

  const leftTs = new Date(left.entry.date).getTime();
  const rightTs = new Date(right.entry.date).getTime();
  return leftTs - rightTs;
}

function pickBestEntry(entries: ScopedHistoryEntry[]) {
  if (!entries.length) return null;
  return entries.reduce((best, entry) => (compareEntries(entry, best) > 0 ? entry : best));
}

function pickBestHistoryEntry(entries: HistoryEntry[]) {
  if (!entries.length) return null;
  return entries.reduce<HistoryEntry | null>((best, entry) => {
    if (!best) return entry;
    if (entry.wpm !== best.wpm) return entry.wpm > best.wpm ? entry : best;
    if (entry.acc !== best.acc) return entry.acc > best.acc ? entry : best;
    return new Date(entry.date).getTime() > new Date(best.date).getTime() ? entry : best;
  }, null);
}

function isRoundedMatch(entry: HistoryEntry, current: ResultComparisonInput) {
  return entry.wpm === Math.round(current.wpm)
    && Math.abs(entry.acc - Math.round(current.acc * 10) / 10) <= 0.1;
}

function getTone(speedDelta: number, accuracyDelta: number): ResultComparisonDelta['tone'] {
  if (speedDelta > 0 || (speedDelta === 0 && accuracyDelta > 0)) return 'up';
  if (speedDelta < 0 || (speedDelta === 0 && accuracyDelta < 0)) return 'down';
  return 'flat';
}

function buildDelta(label: string, current: ResultComparisonInput, benchmark: HistoryEntry): ResultComparisonDelta {
  const speedDelta = current.wpm - benchmark.wpm;
  const accuracyDelta = current.acc - benchmark.acc;

  return {
    label,
    speedDelta,
    accuracyDelta,
    formattedSpeedDelta: formatDelta(speedDelta, 0),
    formattedAccuracyDelta: formatDelta(accuracyDelta, 1),
    tone: getTone(speedDelta, accuracyDelta),
  };
}

function buildBenchmark(label: string, entry: HistoryEntry, contextLabel: string): ResultComparisonBenchmark {
  return {
    label,
    entry,
    contextLabel,
  };
}

function buildComparisonSummary(
  entries: HistoryEntry[],
  current: ResultComparisonInput,
  contextLabel: (entry: HistoryEntry) => string,
): ResultComparisonSummary {
  const latestEntry = entries.length > 0 ? entries[entries.length - 1]! : null;
  const currentAlreadySaved = latestEntry ? isRoundedMatch(latestEntry, current) : false;
  const historicalEntries = currentAlreadySaved ? entries.slice(0, -1) : entries;
  const previousAttempt = historicalEntries.length > 0 ? historicalEntries[historicalEntries.length - 1]! : null;
  const recentBestEntry = historicalEntries.length > 0
    ? historicalEntries
        .slice(-8)
        .reduce((best, entry) => {
          if (!best) return entry;
          if (entry.wpm !== best.wpm) return entry.wpm > best.wpm ? entry : best;
          if (entry.acc !== best.acc) return entry.acc > best.acc ? entry : best;
          return new Date(entry.date).getTime() > new Date(best.date).getTime() ? entry : best;
        }, historicalEntries[0] ?? null)
    : null;

  return {
    previousAttempt: previousAttempt
      ? buildBenchmark('Предыдущая попытка', previousAttempt, contextLabel(previousAttempt))
      : null,
    previousDelta: previousAttempt ? buildDelta('Δ к прошлой', current, previousAttempt) : null,
    recentBest: recentBestEntry
      ? buildBenchmark('Лучший недавний', recentBestEntry, contextLabel(recentBestEntry))
      : null,
    recentBestDelta: recentBestEntry ? buildDelta('Δ к лучшему', current, recentBestEntry) : null,
  };
}

function getHistoricalBaselineCount(entries: HistoryEntry[], current: ResultComparisonInput) {
  const latestEntry = entries.length > 0 ? entries[entries.length - 1]! : null;
  const currentAlreadySaved = latestEntry ? isRoundedMatch(latestEntry, current) : false;
  return currentAlreadySaved ? Math.max(0, entries.length - 1) : entries.length;
}

function pickComparisonGroup(groups: HistoryEntry[][], current: ResultComparisonInput) {
  return groups.find(group => getHistoricalBaselineCount(group, current) > 0)
    ?? groups.find(group => group.length > 0)
    ?? [];
}

function describePracticeContext(entry: HistoryEntry) {
  if (entry.contentScenarioId && entry.contentScenarioId !== 'practice-normal' && entry.contentScenarioId !== 'practice-rhythm') {
    const scenarioLabel = PRACTICE_SCENARIO_LABELS[entry.contentScenarioId];
    const contentLabel = entry.contentMode
      ? PRACTICE_CONTENT_MODE_LABELS[entry.contentMode]
      : 'Материал не указан';
    return `${scenarioLabel} · ${contentLabel}`;
  }

  const trainingLabel = entry.trainingMode
    ? PRACTICE_TRAINING_MODE_LABELS[entry.trainingMode]
    : 'Практика';
  const contentLabel = entry.contentMode
    ? PRACTICE_CONTENT_MODE_LABELS[entry.contentMode]
    : 'Материал не указан';
  return `${trainingLabel} · ${contentLabel}`;
}

function describeGameContext(entry: HistoryEntry) {
  const stageLabel = entry.gameStageType === 'boss' ? 'Босс' : 'Обычный бой';
  const levelLabel = entry.gameLevel ? `ур. ${entry.gameLevel}` : 'уровень не указан';
  return `${stageLabel} · ${levelLabel}`;
}

function describeSprintContext(entry: HistoryEntry) {
  const durationLabel = entry.durationSeconds
    ? `${Math.max(1, Math.round(entry.durationSeconds))} с`
    : 'время не указано';
  const contentLabel = entry.contentMode
    ? PRACTICE_CONTENT_MODE_LABELS[entry.contentMode]
    : 'Материал не указан';
  return `Спринт · ${durationLabel} · ${contentLabel}`;
}

export function buildPracticeResultComparison(
  entries: HistoryEntry[],
  current: ResultComparisonInput & {
    contentScenarioId?: HistoryEntry['contentScenarioId'];
    trainingMode?: PracticeTrainingMode;
    contentMode?: PracticeContentMode;
  },
): ResultComparisonSummary {
  const candidates = pickComparisonGroup([
    entries.filter(entry => entry.mode === 'practice'
      && entry.contentScenarioId === current.contentScenarioId
      && entry.contentMode === current.contentMode),
    entries.filter(entry => entry.mode === 'practice'
      && entry.trainingMode === current.trainingMode
      && entry.contentMode === current.contentMode),
    entries.filter(entry => entry.mode === 'practice' && entry.trainingMode === current.trainingMode),
    entries.filter(entry => entry.mode === 'practice'),
  ], current);

  return buildComparisonSummary(candidates, current, describePracticeContext);
}

export function buildGameResultComparison(
  entries: HistoryEntry[],
  current: ResultComparisonInput & {
    gameLevel?: number;
    gameStageType?: 'normal' | 'boss';
  },
): ResultComparisonSummary {
  const candidates = pickComparisonGroup([
    entries.filter(entry => entry.mode === 'game' && entry.gameLevel === current.gameLevel),
    entries.filter(entry => entry.mode === 'game' && entry.gameStageType === current.gameStageType),
    entries.filter(entry => entry.mode === 'game'),
  ], current);

  return buildComparisonSummary(candidates, current, describeGameContext);
}

export function buildSprintResultComparison(
  entries: HistoryEntry[],
  current: ResultComparisonInput & {
    contentScenarioId?: HistoryEntry['contentScenarioId'];
    durationSeconds?: number;
    contentMode?: PracticeContentMode;
  },
): ResultComparisonSummary {
  const roundedDuration = current.durationSeconds != null
    ? Math.max(1, Math.round(current.durationSeconds))
    : null;
  const candidates = pickComparisonGroup([
    entries.filter(entry => entry.mode === 'test'
      && entry.contentScenarioId === current.contentScenarioId
      && entry.contentMode === current.contentMode
      && (roundedDuration == null || Math.max(1, Math.round(entry.durationSeconds ?? 0)) === roundedDuration)),
    entries.filter(entry => entry.mode === 'test'
      && (roundedDuration == null || Math.max(1, Math.round(entry.durationSeconds ?? 0)) === roundedDuration)),
    entries.filter(entry => entry.mode === 'test'),
  ], current);

  return buildComparisonSummary(candidates, current, describeSprintContext);
}

export function buildHomePersonalRecordCards(
  progress: Progress,
  layouts: LayoutsData,
  currentLayout: string,
): HomePersonalRecordCard[] {
  const scopedEntries = flattenHistory(progress, layouts);
  const currentLayoutInfo = layouts.layouts[currentLayout];
  const currentLanguage = currentLayoutInfo?.lang ?? '';

  return [
    {
      id: 'practice-overall',
      title: 'Рекорд практики',
      subtitle: 'Лучший результат по режиму',
      record: pickBestEntry(scopedEntries.filter(entry => entry.entry.mode === 'practice')),
    },
    {
      id: 'game-overall',
      title: 'Рекорд игры',
      subtitle: 'Лучший результат по режиму',
      record: pickBestEntry(scopedEntries.filter(entry => entry.entry.mode === 'game')),
    },
    {
      id: 'sprint-overall',
      title: 'Рекорд спринта',
      subtitle: 'Лучший короткий забег',
      record: pickBestEntry(scopedEntries.filter(entry => entry.entry.mode === 'test')),
    },
    {
      id: 'current-layout',
      title: 'Текущая раскладка',
      subtitle: currentLayoutInfo?.label ?? currentLayout.toUpperCase(),
      record: pickBestEntry(scopedEntries.filter(entry => entry.layoutId === currentLayout)),
    },
    {
      id: 'current-language',
      title: 'Текущий язык',
      subtitle: currentLanguage ? getLanguageLabel(layouts, currentLanguage) : 'Язык не выбран',
      record: currentLanguage
        ? pickBestEntry(scopedEntries.filter(entry => entry.languageId === currentLanguage))
        : null,
    },
  ];
}

export function buildModeFocusSnapshots(entries: HistoryEntry[]): ModeFocusSnapshot[] {
  const basePracticeEntries = entries.filter(entry => entry.mode === 'practice'
    && entry.contentScenarioId !== 'survival'
    && entry.contentScenarioId !== 'flawless');
  const sprintEntries = entries.filter(entry => entry.mode === 'test');
  const survivalEntries = entries.filter(entry => entry.mode === 'practice' && entry.contentScenarioId === 'survival');
  const flawlessEntries = entries.filter(entry => entry.mode === 'practice' && entry.contentScenarioId === 'flawless');

  const buildSnapshot = (
    id: ModeFocusSnapshot['id'],
    title: string,
    description: string,
    actionMode: string,
    modeEntries: HistoryEntry[],
    recommendation: (attempts: number, best: HistoryEntry | null, last: HistoryEntry | null) => Pick<ModeFocusSnapshot, 'emphasis' | 'recommendation'>,
  ): ModeFocusSnapshot => {
    const attempts = modeEntries.length;
    const bestEntry = pickBestHistoryEntry(modeEntries);
    const lastEntry = attempts > 0 ? modeEntries[attempts - 1]! : null;
    const feedback = recommendation(attempts, bestEntry, lastEntry);

    return {
      id,
      title,
      description,
      actionMode,
      attempts,
      bestEntry,
      lastEntry,
      emphasis: feedback.emphasis,
      recommendation: feedback.recommendation,
    };
  };

  return [
    buildSnapshot(
      'practice',
      'Практика',
      'Базовый режим для повседневного закрепления скорости, точности и слабых мест.',
      'practice',
      basePracticeEntries,
      (attempts, best, last) => {
        if (attempts === 0) {
          return {
            emphasis: 'warn',
            recommendation: 'Нужна хотя бы одна базовая практика, чтобы на ней держались остальные режимы.',
          };
        }
        if ((last?.acc ?? 0) < 93) {
          return {
            emphasis: 'warn',
            recommendation: 'Сейчас практика проседает по точности. Лучше стабилизировать базу перед challenge-режимами.',
          };
        }
        if ((best?.wpm ?? 0) >= 60 && (best?.acc ?? 0) >= 96) {
          return {
            emphasis: 'good',
            recommendation: 'База выглядит уверенно. Практика уже может быть точкой разогрева перед спринтом или flawless.',
          };
        }
        return {
          emphasis: 'neutral',
          recommendation: 'Ещё немного базовых сессий, и режимы на выносливость и чистоту будут ощущаться заметно ровнее.',
        };
      },
    ),
    buildSnapshot(
      'test',
      'Спринт',
      'Короткий таймерный режим на разгон, плотность набора и контроль ошибок под давлением времени.',
      'test',
      sprintEntries,
      (attempts, best, last) => {
        if (attempts === 0) {
          return {
            emphasis: 'warn',
            recommendation: 'Спринт ещё не открыт в реальном цикле тренировок. Стоит сделать хотя бы один короткий забег на калибровку темпа.',
          };
        }
        if ((last?.acc ?? best?.acc ?? 0) < 93) {
          return {
            emphasis: 'warn',
            recommendation: 'Спринт теряет результат на ошибках. Полезно сохранить темп, но снизить хаотичные промахи на старте.',
          };
        }
        if ((best?.wpm ?? 0) >= 70 && (best?.acc ?? 0) >= 95) {
          return {
            emphasis: 'good',
            recommendation: 'Спринт уже даёт сильный пик скорости. Можно использовать его как короткую контрольную сессию между практиками.',
          };
        }
        return {
          emphasis: 'neutral',
          recommendation: 'Режим уже в работе, но ему ещё нужны повторения, чтобы темп стал устойчивее, а не разовым всплеском.',
        };
      },
    ),
    buildSnapshot(
      'survival',
      'Выживание',
      'Длинный проход с лимитом ошибок, который проверяет устойчивость темпа и концентрации на дистанции.',
      'survival',
      survivalEntries,
      (attempts, best, last) => {
        if (attempts === 0) {
          return {
            emphasis: 'warn',
            recommendation: 'Выживание пока не встроено в ритм занятий. Один длинный проход быстро покажет, держится ли навык вне коротких серий.',
          };
        }
        if ((last?.acc ?? best?.acc ?? 0) < 94) {
          return {
            emphasis: 'warn',
            recommendation: 'Режим упирается не в пиковую скорость, а в устойчивость. Стоит добрать более ровную точность на длинной дистанции.',
          };
        }
        if ((best?.acc ?? 0) >= 96 && (best?.wpm ?? 0) >= 55) {
          return {
            emphasis: 'good',
            recommendation: 'Выживание уже выглядит зрелым режимом для вас. Им удобно проверять, не рассыпается ли техника на длинном тексте.',
          };
        }
        return {
          emphasis: 'neutral',
          recommendation: 'Есть рабочая база, но режиму ещё полезны несколько длинных проходов, чтобы сгладить середину и конец текста.',
        };
      },
    ),
    buildSnapshot(
      'flawless',
      'Без ошибок',
      'Чистый проход без права на промах, где важнее дисциплина и контроль, чем разовый пик скорости.',
      'flawless',
      flawlessEntries,
      (attempts, best, last) => {
        if (attempts === 0) {
          return {
            emphasis: 'warn',
            recommendation: 'Безошибочный режим ещё не обкатан. Его стоит подключать, когда хочется проверить не скорость, а реальную чистоту набора.',
          };
        }
        if ((best?.acc ?? 0) < 96 || (last?.acc ?? best?.acc ?? 0) < 95) {
          return {
            emphasis: 'warn',
            recommendation: 'Flawless пока срывается на единичных промахах. Полезно добрать более чистые серии в обычной практике или survival.',
          };
        }
        if ((best?.acc ?? 0) >= 98 && (best?.wpm ?? 0) >= 50) {
          return {
            emphasis: 'good',
            recommendation: 'Чистые проходы уже получаются. Режим можно использовать как эталон контроля после разогрева и спринта.',
          };
        }
        return {
          emphasis: 'neutral',
          recommendation: 'База уже есть, но безошибочному режиму ещё нужны повторения, чтобы случайные срывы случались реже.',
        };
      },
    ),
  ];
}

export function buildHistoryFollowupRecommendation(entry: HistoryEntry | null): ModeFollowupRecommendation | null {
  if (!entry) return null;

  if (entry.mode === 'test') {
    if (entry.acc >= 95 && entry.wpm >= 70) {
      return {
        title: 'Проверить длинную дистанцию',
        description: 'Сильный спринт уже есть. Следующий полезный шаг — перенести этот темп в более длинный и стабильный проход выживания.',
        actionMode: 'survival',
        actionLabel: 'Открыть выживание',
      };
    }
    return {
      title: 'Закрепить темп в практике',
      description: 'Спринт уже дал полезный пик скорости, но теперь его лучше приземлить в более спокойную базовую практику без таймера.',
      actionMode: 'practice',
      actionLabel: 'Вернуться в практику',
    };
  }

  if (entry.mode === 'practice' && entry.contentScenarioId === 'survival') {
    if (entry.passed && entry.acc >= 96) {
      return {
        title: 'Поднять планку до flawless',
        description: 'Выживание уже держится уверенно. Следующий шаг — проверить, получится ли такой же контроль без права на ошибку.',
        actionMode: 'flawless',
        actionLabel: 'Открыть без ошибок',
      };
    }
    return {
      title: 'Вернуться к базовой стабилизации',
      description: 'Последний проход выживания просит более спокойной базы. Обычная практика поможет выровнять точность и ритм перед новой длинной серией.',
      actionMode: 'practice',
      actionLabel: 'Пойти в практику',
    };
  }

  if (entry.mode === 'practice' && entry.contentScenarioId === 'flawless') {
    if (entry.passed) {
      return {
        title: 'Закрепить контроль в выживании',
        description: 'Чистый проход уже сложился. Теперь полезно проверить, удержится ли та же дисциплина на более длинной дистанции.',
        actionMode: 'survival',
        actionLabel: 'Открыть выживание',
      };
    }
    return {
      title: 'Снять перегрузку через базу',
      description: entry.acc >= 94
        ? 'До рабочего flawless уже недалеко, но сейчас безопаснее добрать стабильность в выживании.'
        : 'После срыва в flawless лучше вернуться в обычную практику и снять лишнее давление режима.',
      actionMode: entry.acc >= 94 ? 'survival' : 'practice',
      actionLabel: entry.acc >= 94 ? 'Перейти в выживание' : 'Вернуться в практику',
    };
  }

  return null;
}

export function buildModeResultFollowupRecommendation(args: {
  mode: 'test' | 'survival' | 'flawless';
  wpm: number;
  acc: number;
  passed?: boolean;
  errors?: number;
}): ModeFollowupRecommendation {
  if (args.mode === 'test') {
    if (args.acc >= 95 && args.wpm >= 70) {
      return {
        title: 'Перенести темп в длинную сессию',
        description: 'Сильный спринт стоит сразу проверить в выживании, пока скорость и ритм ещё ощущаются свежо.',
        actionMode: 'survival',
        actionLabel: 'Проверить выживание',
      };
    }
    return {
      title: 'Стабилизировать базу',
      description: 'После спринта полезно вернуться в обычную практику и превратить пик скорости в более ровую серию без таймера.',
      actionMode: 'practice',
      actionLabel: 'В практику',
    };
  }

  if (args.mode === 'survival') {
    if (args.passed && args.acc >= 96) {
      return {
        title: 'Поднять планку',
        description: 'Длинная дистанция уже держится. Следующая честная проверка — безошибочный режим.',
        actionMode: 'flawless',
        actionLabel: 'Открыть flawless',
      };
    }
    return {
      title: 'Вернуться к выравниванию',
      description: 'Сейчас полезнее снять напряжение через базовую практику, а потом снова зайти в длинный проход.',
      actionMode: 'practice',
      actionLabel: 'Вернуться в практику',
    };
  }

  if (args.passed) {
    return {
      title: 'Закрепить чистый контроль',
      description: 'Flawless уже получился, и теперь этот контроль стоит проверить на более длинном тексте в выживании.',
      actionMode: 'survival',
      actionLabel: 'Открыть выживание',
    };
  }

  if (args.acc >= 94) {
    return {
      title: 'Переключиться на мягкую длинную серию',
      description: 'Ошибка в flawless пришла не из-за полной потери формы. Выживание поможет удержать контроль, не ломая попытку одним промахом.',
      actionMode: 'survival',
      actionLabel: 'Перейти в выживание',
    };
  }

  return {
    title: 'Снять давление режима',
    description: 'После провала в flawless лучше вернуться в базовую практику и снова собрать чистый, спокойный проход.',
    actionMode: 'practice',
    actionLabel: 'Вернуться в практику',
  };
}

export function describeHomeRecord(record: ScopedHistoryEntry | null) {
  if (!record) return 'Ещё нет завершённых попыток';
  const detail = record.entry.mode === 'practice'
    ? describePracticeContext(record.entry)
    : record.entry.mode === 'game'
      ? describeGameContext(record.entry)
      : record.entry.mode === 'test'
        ? describeSprintContext(record.entry)
        : 'Урок';
  return `${record.layoutLabel} · ${record.languageLabel} · ${detail}`;
}

export function buildLayoutMasterySnapshot(
  progress: Progress,
  layouts: LayoutsData,
  currentLayout: string,
  options?: LayoutMasterySnapshotOptions,
): LayoutMasterySnapshot {
  const layout = layouts.layouts[currentLayout];
  const layoutLabel = layout?.label ?? currentLayout.toUpperCase();
  const historyEntries = options?.historyEntriesOverride ?? progress.history?.[currentLayout] ?? [];
  const practiceEntries = historyEntries.filter(entry => entry.mode === 'practice');
  const layoutProgress = progress.layoutProgress?.[currentLayout];
  const practiceUnlockOrder = layout?.practiceUnlockOrder ?? [];
  const totalLetters = practiceUnlockOrder.length;
  const unlockedLetters = Math.min(options?.unlockedLettersOverride ?? layoutProgress?.unlocked ?? 0, totalLetters);
  const practiceSessions = practiceEntries.length;
  const bestPractice = practiceEntries.reduce<HistoryEntry | null>((best, entry) => {
    if (!best) return entry;
    if (entry.wpm !== best.wpm) return entry.wpm > best.wpm ? entry : best;
    if (entry.acc !== best.acc) return entry.acc > best.acc ? entry : best;
    return new Date(entry.date).getTime() > new Date(best.date).getTime() ? entry : best;
  }, null);
  const bestPracticeWpm = bestPractice?.wpm ?? 0;
  const bestPracticeAccuracy = bestPractice?.acc ?? 0;

  const unlockPoints = totalLetters > 0 ? (unlockedLetters / totalLetters) * 40 : 0;
  const sessionPoints = Math.min(25, (practiceSessions / 24) * 25);
  const speedPoints = Math.min(20, (bestPracticeWpm / 90) * 20);
  const accuracyPoints = Math.min(15, (bestPracticeAccuracy / 98) * 15);
  const currentScore = Math.max(0, Math.min(100, Math.round(unlockPoints + sessionPoints + speedPoints + accuracyPoints)));

  const currentMilestone = LAYOUT_MASTERY_MILESTONES.reduce((best, milestone) => (
    currentScore >= milestone.threshold ? milestone : best
  ), LAYOUT_MASTERY_MILESTONES[0]!);
  const nextMilestone = LAYOUT_MASTERY_MILESTONES.find(milestone => milestone.threshold > currentScore) ?? null;
  const milestoneFloor = currentMilestone.threshold;
  const milestoneCeiling = nextMilestone?.threshold ?? 100;
  const unlockedMilestones = LAYOUT_MASTERY_MILESTONES.filter(milestone => currentScore >= milestone.threshold);
  const progressPercent = nextMilestone
    ? Math.max(0, Math.min(100, Math.round(((currentScore - milestoneFloor) / Math.max(1, milestoneCeiling - milestoneFloor)) * 100)))
    : 100;

  return {
    layoutId: currentLayout,
    layoutLabel,
    currentScore,
    currentMilestone,
    nextMilestone,
    progressPercent,
    remainingPoints: nextMilestone ? Math.max(0, nextMilestone.threshold - currentScore) : 0,
    unlockedLetters,
    totalLetters,
    practiceSessions,
    bestPracticeWpm,
    bestPracticeAccuracy,
    milestones: LAYOUT_MASTERY_MILESTONES,
    unlockedMilestones,
    activeRewardTitle: currentMilestone.rewardTitle,
    activeRewardDescription: currentMilestone.rewardDescription,
    nextRewardTitle: nextMilestone?.rewardTitle ?? null,
    nextRewardDescription: nextMilestone?.rewardDescription ?? null,
  };
}

export function describeLayoutMasterySignals(snapshot: LayoutMasterySnapshot) {
  return `Открыто ${snapshot.unlockedLetters}/${snapshot.totalLetters || 0} символов · ${snapshot.practiceSessions} практик · лучший темп ${snapshot.bestPracticeWpm} WPM`;
}

export function buildLayoutMasteryResultSummary(
  progress: Progress,
  layouts: LayoutsData,
  currentLayout: string,
  options?: {
    previousHistoryEntriesOverride?: HistoryEntry[];
    currentHistoryEntriesOverride?: HistoryEntry[];
    previousUnlockedLettersOverride?: number;
    currentUnlockedLettersOverride?: number;
  },
): LayoutMasteryResultSummary {
  const previous = buildLayoutMasterySnapshot(progress, layouts, currentLayout, {
    historyEntriesOverride: options?.previousHistoryEntriesOverride,
    unlockedLettersOverride: options?.previousUnlockedLettersOverride,
  });
  const current = buildLayoutMasterySnapshot(progress, layouts, currentLayout, {
    historyEntriesOverride: options?.currentHistoryEntriesOverride,
    unlockedLettersOverride: options?.currentUnlockedLettersOverride,
  });
  const unlockedMilestone = current.currentMilestone.id !== previous.currentMilestone.id
    ? current.currentMilestone
    : null;

  return {
    previous,
    current,
    scoreDelta: current.currentScore - previous.currentScore,
    unlockedMilestone,
  };
}
