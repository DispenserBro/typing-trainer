import type {
  MotivationChallengeGoalId,
  MotivationChallengeProgress,
  MotivationGoalId,
  MotivationProgress,
  MotivationSeasonState,
  MotivationSeasonThemeId,
  MotivationStreakId,
  MotivationWeeklyState,
  PracticeTrainingMode,
} from '../../shared/types';

export interface MotivationGoalDefinition {
  id: MotivationGoalId;
  title: string;
  description: string;
  targets: number[];
  speedThresholdCpm?: number;
  accuracyThreshold?: number;
}

export interface MotivationGoalSnapshot {
  definition: MotivationGoalDefinition;
  current: number;
  previousTarget: number;
  nextTarget: number | null;
  completed: boolean;
  progressPercent: number;
}

export interface MotivationStreakDefinition {
  id: MotivationStreakId;
  title: string;
  description: string;
}

export interface MotivationStreakSnapshot {
  definition: MotivationStreakDefinition;
  current: number;
  best: number;
}

export interface PracticeMotivationUpdate {
  elapsedSeconds: number;
  cpm: number;
  acc: number;
  trainingMode: PracticeTrainingMode;
  successfulSession: boolean;
  flawlessSession: boolean;
}

export interface GameMotivationUpdate {
  passedLevel: boolean;
  runCompleted: boolean;
  victory: boolean;
  cleanVictory: boolean;
}

export interface MotivationChallengeDefinition {
  id: MotivationChallengeGoalId;
  title: string;
  description: string;
  recommendedMode: 'practice' | 'game';
}

type MotivationChallengeTarget = {
  id: MotivationChallengeGoalId;
  target: number;
};

type MotivationWeeklyTemplate = {
  id: string;
  title: string;
  description: string;
  goals: MotivationChallengeTarget[];
};

export interface MotivationChallengeSnapshot {
  definition: MotivationChallengeDefinition;
  current: number;
  target: number;
  completed: boolean;
  completedAt: string | null;
  progressPercent: number;
  remaining: number;
}

export interface MotivationWeeklySnapshot {
  template: MotivationWeeklyTemplate;
  startedAt: string;
  endsAt: string;
  goals: MotivationChallengeSnapshot[];
  completedCount: number;
  totalCount: number;
}

export interface MotivationSeasonDefinition {
  id: MotivationSeasonThemeId;
  title: string;
  description: string;
  featuredGoalIds: MotivationChallengeTarget[];
}

export interface MotivationSeasonSnapshot {
  definition: MotivationSeasonDefinition;
  startedAt: string;
  endsAt: string;
  goals: MotivationChallengeSnapshot[];
  completedCount: number;
  totalCount: number;
}

export interface MotivationRecommendation {
  title: string;
  description: string;
  actionMode: 'practice' | 'game';
  actionLabel: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const SEASON_WEEKS = 4;
const ROTATION_BASE_MONDAY = new Date(2026, 0, 5);

export const MOTIVATION_GOAL_DEFINITIONS: MotivationGoalDefinition[] = [
  {
    id: 'practice-sessions',
    title: 'Сессии практики',
    description: 'Наращивайте общий объём практики и закрепляйте привычку.',
    targets: [10, 25, 50, 100, 250],
  },
  {
    id: 'practice-minutes',
    title: 'Минуты практики',
    description: 'Набирайте суммарное время за спокойными, регулярными тренировками.',
    targets: [30, 60, 180, 360, 720],
  },
  {
    id: 'target-speed-sessions',
    title: 'Скоростные сессии',
    description: 'Проводите практики на уверенной рабочей скорости.',
    targets: [5, 15, 30, 60, 120],
    speedThresholdCpm: 180,
  },
  {
    id: 'high-accuracy-sessions',
    title: 'Точные сессии',
    description: 'Собирайте чистые по точности практики без провалов по аккуратности.',
    targets: [5, 15, 30, 60, 120],
    accuracyThreshold: 98,
  },
  {
    id: 'game-victories',
    title: 'Победы в забегах',
    description: 'Проходите игровые забеги до конца и копите победы.',
    targets: [1, 3, 5, 10, 25],
  },
];

export const MOTIVATION_STREAK_DEFINITIONS: MotivationStreakDefinition[] = [
  {
    id: 'flawless-practice',
    title: 'Безошибочные практики',
    description: 'Сессии практики подряд без ошибок.',
  },
  {
    id: 'successful-practice',
    title: 'Удачные практики подряд',
    description: 'Сессии подряд, где выполнены рабочие требования по скорости и точности.',
  },
  {
    id: 'clean-game-victories',
    title: 'Чистые победы',
    description: 'Победы в игре без потери жизней по ходу забега.',
  },
];

export const MOTIVATION_CHALLENGE_DEFINITIONS: MotivationChallengeDefinition[] = [
  {
    id: 'practice-sessions',
    title: 'Недельный объём',
    description: 'Соберите серию коротких практик и поддержите инерцию недели.',
    recommendedMode: 'practice',
  },
  {
    id: 'practice-minutes',
    title: 'Минуты практики',
    description: 'Наберите спокойный объём времени и не теряйте контакт с клавиатурой.',
    recommendedMode: 'practice',
  },
  {
    id: 'rhythm-sessions',
    title: 'Ритм-сессии',
    description: 'Проведите несколько практик в режиме ровного темпа.',
    recommendedMode: 'practice',
  },
  {
    id: 'target-speed-sessions',
    title: 'Скоростные сессии',
    description: 'Закройте подходы на уверенной рабочей скорости.',
    recommendedMode: 'practice',
  },
  {
    id: 'high-accuracy-sessions',
    title: 'Чистая точность',
    description: 'Накопите чистые по точности попытки без провалов по аккуратности.',
    recommendedMode: 'practice',
  },
  {
    id: 'flawless-practice',
    title: 'Практики без ошибок',
    description: 'Закрепите аккуратность через безошибочные сессии.',
    recommendedMode: 'practice',
  },
  {
    id: 'game-levels',
    title: 'Пройденные уровни',
    description: 'Пройдите несколько уровней, чтобы закрепить навык в длинной форме.',
    recommendedMode: 'game',
  },
  {
    id: 'game-victories',
    title: 'Победы в забеге',
    description: 'Доведите хотя бы один забег до полной победы.',
    recommendedMode: 'game',
  },
  {
    id: 'clean-game-victories',
    title: 'Чистые победы',
    description: 'Победите в забеге, не теряя жизней по пути.',
    recommendedMode: 'game',
  },
];

const CHALLENGE_DEFINITION_MAP = Object.fromEntries(
  MOTIVATION_CHALLENGE_DEFINITIONS.map(definition => [definition.id, definition]),
) as Record<MotivationChallengeGoalId, MotivationChallengeDefinition>;

const WEEKLY_TEMPLATES: MotivationWeeklyTemplate[] = [
  {
    id: 'steady-practice',
    title: 'Неделя стабильной практики',
    description: 'Спокойный объём, точность и ритм без рывков.',
    goals: [
      { id: 'practice-sessions', target: 10 },
      { id: 'practice-minutes', target: 60 },
      { id: 'high-accuracy-sessions', target: 6 },
    ],
  },
  {
    id: 'tempo-push',
    title: 'Неделя темпа',
    description: 'Фокус на ритме, скорости и аккуратных подходах.',
    goals: [
      { id: 'rhythm-sessions', target: 5 },
      { id: 'target-speed-sessions', target: 6 },
      { id: 'flawless-practice', target: 4 },
    ],
  },
  {
    id: 'hybrid-loop',
    title: 'Смешанный цикл',
    description: 'Комбинация длинной практики и игровых забегов.',
    goals: [
      { id: 'practice-minutes', target: 75 },
      { id: 'game-levels', target: 8 },
      { id: 'game-victories', target: 1 },
    ],
  },
  {
    id: 'adventure-week',
    title: 'Неделя приключений',
    description: 'Недельный упор на длинные попытки и чистые забеги.',
    goals: [
      { id: 'practice-sessions', target: 8 },
      { id: 'game-levels', target: 10 },
      { id: 'clean-game-victories', target: 1 },
    ],
  },
];

const SEASON_DEFINITIONS: MotivationSeasonDefinition[] = [
  {
    id: 'consistency',
    title: 'Сезон устойчивости',
    description: 'Ровный прогресс без провалов: объём, регулярность и чистая точность.',
    featuredGoalIds: [
      { id: 'practice-minutes', target: 240 },
      { id: 'practice-sessions', target: 35 },
      { id: 'high-accuracy-sessions', target: 20 },
    ],
  },
  {
    id: 'precision',
    title: 'Сезон точности',
    description: 'Фокус на чистом наборе, контроле ритма и уверенных скоростных сессиях.',
    featuredGoalIds: [
      { id: 'high-accuracy-sessions', target: 24 },
      { id: 'flawless-practice', target: 12 },
      { id: 'target-speed-sessions', target: 18 },
    ],
  },
  {
    id: 'adventure',
    title: 'Сезон забегов',
    description: 'Игровой ритм недели: длинные уровни, победы и чистые проходы.',
    featuredGoalIds: [
      { id: 'game-levels', target: 30 },
      { id: 'game-victories', target: 3 },
      { id: 'clean-game-victories', target: 2 },
    ],
  },
  {
    id: 'balanced',
    title: 'Сезон баланса',
    description: 'Смешанный темп: практика, скорость и игра работают вместе.',
    featuredGoalIds: [
      { id: 'practice-minutes', target: 180 },
      { id: 'target-speed-sessions', target: 14 },
      { id: 'game-levels', target: 18 },
    ],
  },
];

function normalizeNonNegativeInt(value: number | undefined, fallback = 0) {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.round(value));
}

function normalizeNonNegativeFloat(value: number | undefined, fallback = 0) {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(0, value);
}

function updateStreak(current: { current: number; best: number }, nextCurrent: number) {
  return {
    current: Math.max(0, nextCurrent),
    best: Math.max(current.best, Math.max(0, nextCurrent)),
  };
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getWeekStart(date: Date) {
  const start = startOfLocalDay(date);
  const weekday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - weekday);
  return start;
}

function modulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function getWeekRotationInfo(now: Date) {
  const weekStart = getWeekStart(now);
  const weekEnd = addDays(weekStart, 7);
  const weekIndex = Math.floor((weekStart.getTime() - startOfLocalDay(ROTATION_BASE_MONDAY).getTime()) / WEEK_MS);
  const template = WEEKLY_TEMPLATES[modulo(weekIndex, WEEKLY_TEMPLATES.length)]!;

  return {
    weekKey: formatDateKey(weekStart),
    startedAt: weekStart.toISOString(),
    endsAt: weekEnd.toISOString(),
    weekIndex,
    template,
  };
}

function getSeasonRotationInfo(now: Date) {
  const weekInfo = getWeekRotationInfo(now);
  const cycleIndex = Math.floor(weekInfo.weekIndex / SEASON_WEEKS);
  const seasonStart = addDays(startOfLocalDay(ROTATION_BASE_MONDAY), cycleIndex * SEASON_WEEKS * 7);
  const seasonEnd = addDays(seasonStart, SEASON_WEEKS * 7);
  const definition = SEASON_DEFINITIONS[modulo(cycleIndex, SEASON_DEFINITIONS.length)]!;

  return {
    cycleKey: formatDateKey(seasonStart),
    startedAt: seasonStart.toISOString(),
    endsAt: seasonEnd.toISOString(),
    definition,
  };
}

function createEmptyChallengeProgress(): MotivationChallengeProgress {
  return {
    current: 0,
    completedAt: null,
  };
}

function createEmptyChallengeGoalsRecord() {
  const goalIds = MOTIVATION_CHALLENGE_DEFINITIONS.map(definition => definition.id);
  return Object.fromEntries(
    goalIds.map(goalId => [goalId, createEmptyChallengeProgress()]),
  ) as Record<MotivationChallengeGoalId, MotivationChallengeProgress>;
}

function normalizeChallengeProgress(value?: Partial<MotivationChallengeProgress> | null): MotivationChallengeProgress {
  return {
    current: normalizeNonNegativeFloat(value?.current),
    completedAt: typeof value?.completedAt === 'string' ? value.completedAt : null,
  };
}

function normalizeChallengeGoals(
  value?: Partial<Record<MotivationChallengeGoalId, Partial<MotivationChallengeProgress>>> | null,
) {
  const normalized = createEmptyChallengeGoalsRecord();
  for (const definition of MOTIVATION_CHALLENGE_DEFINITIONS) {
    normalized[definition.id] = normalizeChallengeProgress(value?.[definition.id]);
  }
  return normalized;
}

function createWeeklyState(now: Date): MotivationWeeklyState {
  const weekInfo = getWeekRotationInfo(now);
  return {
    weekKey: weekInfo.weekKey,
    startedAt: weekInfo.startedAt,
    endsAt: weekInfo.endsAt,
    templateId: weekInfo.template.id,
    activeGoalIds: weekInfo.template.goals.map(goal => goal.id),
    goals: createEmptyChallengeGoalsRecord(),
  };
}

function createSeasonState(now: Date): MotivationSeasonState {
  const seasonInfo = getSeasonRotationInfo(now);
  return {
    cycleKey: seasonInfo.cycleKey,
    startedAt: seasonInfo.startedAt,
    endsAt: seasonInfo.endsAt,
    themeId: seasonInfo.definition.id,
    featuredGoalIds: seasonInfo.definition.featuredGoalIds.map(goal => goal.id),
    goals: createEmptyChallengeGoalsRecord(),
  };
}

function normalizeWeeklyState(state: Partial<MotivationWeeklyState> | null | undefined, now: Date): MotivationWeeklyState {
  const active = getWeekRotationInfo(now);
  if (!state || state.weekKey !== active.weekKey || state.templateId !== active.template.id) {
    return createWeeklyState(now);
  }

  return {
    weekKey: active.weekKey,
    startedAt: active.startedAt,
    endsAt: active.endsAt,
    templateId: active.template.id,
    activeGoalIds: active.template.goals.map(goal => goal.id),
    goals: normalizeChallengeGoals(state.goals),
  };
}

function normalizeSeasonState(state: Partial<MotivationSeasonState> | null | undefined, now: Date): MotivationSeasonState {
  const active = getSeasonRotationInfo(now);
  if (!state || state.cycleKey !== active.cycleKey || state.themeId !== active.definition.id) {
    return createSeasonState(now);
  }

  return {
    cycleKey: active.cycleKey,
    startedAt: active.startedAt,
    endsAt: active.endsAt,
    themeId: active.definition.id,
    featuredGoalIds: active.definition.featuredGoalIds.map(goal => goal.id),
    goals: normalizeChallengeGoals(state.goals),
  };
}

function getChallengeTargetMap(goals: MotivationChallengeTarget[]) {
  return new Map<MotivationChallengeGoalId, number>(goals.map(goal => [goal.id, goal.target]));
}

function incrementChallengeGoals(
  currentGoals: Record<MotivationChallengeGoalId, MotivationChallengeProgress>,
  increments: Partial<Record<MotivationChallengeGoalId, number>>,
  targets: Map<MotivationChallengeGoalId, number>,
  timestamp: string,
) {
  const next = { ...currentGoals };

  for (const definition of MOTIVATION_CHALLENGE_DEFINITIONS) {
    const delta = increments[definition.id] ?? 0;
    const target = targets.get(definition.id);
    if (delta <= 0 || target == null) continue;

    const previous = next[definition.id] ?? createEmptyChallengeProgress();
    const nextValue = normalizeNonNegativeFloat(previous.current) + delta;
    next[definition.id] = {
      current: nextValue,
      completedAt: previous.completedAt ?? (nextValue >= target ? timestamp : null),
    };
  }

  return next;
}

function getWeeklyTemplateById(templateId: string) {
  return WEEKLY_TEMPLATES.find(template => template.id === templateId) ?? WEEKLY_TEMPLATES[0]!;
}

function getSeasonDefinitionById(themeId: MotivationSeasonThemeId) {
  return SEASON_DEFINITIONS.find(definition => definition.id === themeId) ?? SEASON_DEFINITIONS[0]!;
}

function createChallengeSnapshot(
  progress: MotivationChallengeProgress,
  goal: MotivationChallengeTarget,
): MotivationChallengeSnapshot {
  const definition = CHALLENGE_DEFINITION_MAP[goal.id];
  const current = normalizeNonNegativeFloat(progress.current);
  const target = Math.max(1, goal.target);

  return {
    definition,
    current,
    target,
    completed: current >= target,
    completedAt: progress.completedAt,
    progressPercent: Math.max(0, Math.min(100, Math.round((current / target) * 100))),
    remaining: Math.max(0, target - current),
  };
}

function getGoalMetricValue(progress: MotivationProgress, goalId: MotivationGoalId) {
  switch (goalId) {
    case 'practice-sessions':
      return progress.totals.practiceSessions;
    case 'practice-minutes':
      return progress.totals.practiceMinutes;
    case 'target-speed-sessions':
      return progress.totals.targetSpeedSessions;
    case 'high-accuracy-sessions':
      return progress.totals.highAccuracySessions;
    case 'game-victories':
      return progress.totals.gameVictories;
    default:
      return 0;
  }
}

function getRecommendationCopy(
  snapshot: MotivationChallengeSnapshot,
  options?: { todayDailyRunCompleted?: boolean },
): MotivationRecommendation {
  const remainingRounded = Math.max(1, Math.ceil(snapshot.remaining));

  switch (snapshot.definition.id) {
    case 'practice-sessions':
      return {
        title: 'Добрать недельный объём практики',
        description: `До выполнения недельной задачи осталось ${remainingRounded} практик. Это самый быстрый способ сохранить темп недели.`,
        actionMode: 'practice',
        actionLabel: 'Открыть практику',
      };
    case 'practice-minutes':
      return {
        title: 'Закрыть минуты практики',
        description: `Осталось около ${remainingRounded} минут до недельной цели. Короткая сессия сейчас хорошо двинет прогресс.`,
        actionMode: 'practice',
        actionLabel: 'Пойти в практику',
      };
    case 'rhythm-sessions':
      return {
        title: 'Собрать ритм-сессии',
        description: `До недельной задачи по ритму осталось ${remainingRounded} подходов. Режим rhythm сейчас даст самый полезный прогресс.`,
        actionMode: 'practice',
        actionLabel: 'Открыть практику',
      };
    case 'target-speed-sessions':
      return {
        title: 'Дожать скоростные сессии',
        description: `Осталось ${remainingRounded} скоростных подходов. Самое время забрать пару уверенных попыток на рабочем темпе.`,
        actionMode: 'practice',
        actionLabel: 'Перейти в практику',
      };
    case 'high-accuracy-sessions':
      return {
        title: 'Собрать чистые попытки',
        description: `До недельной цели по точности не хватает ${remainingRounded} аккуратных сессий. Хороший момент замедлиться и набрать чисто.`,
        actionMode: 'practice',
        actionLabel: 'Открыть практику',
      };
    case 'flawless-practice':
      return {
        title: 'Закрыть безошибочную неделю',
        description: `Осталось ${remainingRounded} практик без ошибок. Короткий аккуратный заход сейчас хорошо укрепит серию.`,
        actionMode: 'practice',
        actionLabel: 'Пойти в практику',
      };
    case 'game-levels':
      return {
        title: options?.todayDailyRunCompleted
          ? 'Продвинуть недельные игровые уровни'
          : 'Сыграть weekly-уровни через daily run',
        description: options?.todayDailyRunCompleted
          ? `До недельной цели осталось ${remainingRounded} пройденных уровней. Игровой режим сейчас даст самый прямой прогресс.`
          : `До недельной задачи осталось ${remainingRounded} уровней. Daily run хорошо закрывает эту цель и добавляет вариативности.`,
        actionMode: 'game',
        actionLabel: 'Открыть игру',
      };
    case 'clean-game-victories':
      return {
        title: 'Собрать чистую победу недели',
        description: 'Недельная задача просит пройти забег без потери жизней. Это отличный повод на аккуратный, размеренный run.',
        actionMode: 'game',
        actionLabel: 'Открыть игру',
      };
    case 'game-victories':
    default:
      return {
        title: 'Закрыть победу в забеге',
        description: options?.todayDailyRunCompleted
          ? `До недельной победы осталось ${remainingRounded} забегов. Игровой режим сейчас двигает цель лучше всего.`
          : 'Недельная цель просит довести забег до победы. Daily run или основной режим сейчас будут самым ценным следующим шагом.',
        actionMode: 'game',
        actionLabel: 'Открыть игру',
      };
  }
}

export function createEmptyMotivationProgress(now = new Date()): MotivationProgress {
  return {
    totals: {
      practiceSessions: 0,
      practiceMinutes: 0,
      targetSpeedSessions: 0,
      highAccuracySessions: 0,
      flawlessPracticeSessions: 0,
      successfulPracticeSessions: 0,
      gameVictories: 0,
      cleanGameVictories: 0,
    },
    streaks: {
      flawlessPractice: { current: 0, best: 0 },
      successfulPractice: { current: 0, best: 0 },
      cleanGameVictories: { current: 0, best: 0 },
    },
    weekly: createWeeklyState(now),
    season: createSeasonState(now),
    lastUpdated: new Date(0).toISOString(),
  };
}

export function normalizeMotivationProgress(progress?: Partial<MotivationProgress> | null, now = new Date()): MotivationProgress {
  const empty = createEmptyMotivationProgress(now);
  return {
    totals: {
      practiceSessions: normalizeNonNegativeInt(progress?.totals?.practiceSessions, empty.totals.practiceSessions),
      practiceMinutes: normalizeNonNegativeFloat(progress?.totals?.practiceMinutes, empty.totals.practiceMinutes),
      targetSpeedSessions: normalizeNonNegativeInt(progress?.totals?.targetSpeedSessions, empty.totals.targetSpeedSessions),
      highAccuracySessions: normalizeNonNegativeInt(progress?.totals?.highAccuracySessions, empty.totals.highAccuracySessions),
      flawlessPracticeSessions: normalizeNonNegativeInt(progress?.totals?.flawlessPracticeSessions, empty.totals.flawlessPracticeSessions),
      successfulPracticeSessions: normalizeNonNegativeInt(progress?.totals?.successfulPracticeSessions, empty.totals.successfulPracticeSessions),
      gameVictories: normalizeNonNegativeInt(progress?.totals?.gameVictories, empty.totals.gameVictories),
      cleanGameVictories: normalizeNonNegativeInt(progress?.totals?.cleanGameVictories, empty.totals.cleanGameVictories),
    },
    streaks: {
      flawlessPractice: {
        current: normalizeNonNegativeInt(progress?.streaks?.flawlessPractice?.current),
        best: normalizeNonNegativeInt(progress?.streaks?.flawlessPractice?.best),
      },
      successfulPractice: {
        current: normalizeNonNegativeInt(progress?.streaks?.successfulPractice?.current),
        best: normalizeNonNegativeInt(progress?.streaks?.successfulPractice?.best),
      },
      cleanGameVictories: {
        current: normalizeNonNegativeInt(progress?.streaks?.cleanGameVictories?.current),
        best: normalizeNonNegativeInt(progress?.streaks?.cleanGameVictories?.best),
      },
    },
    weekly: normalizeWeeklyState(progress?.weekly, now),
    season: normalizeSeasonState(progress?.season, now),
    lastUpdated: typeof progress?.lastUpdated === 'string' ? progress.lastUpdated : empty.lastUpdated,
  };
}

export function updateMotivationAfterPractice(
  current: MotivationProgress,
  update: PracticeMotivationUpdate,
  now = new Date(),
): MotivationProgress {
  const next = normalizeMotivationProgress(current, now);
  const timestamp = now.toISOString();
  const speedGoal = MOTIVATION_GOAL_DEFINITIONS.find(goal => goal.id === 'target-speed-sessions');
  const accuracyGoal = MOTIVATION_GOAL_DEFINITIONS.find(goal => goal.id === 'high-accuracy-sessions');
  const hasTargetSpeed = (speedGoal?.speedThresholdCpm ?? 180) > 0 && update.cpm >= (speedGoal?.speedThresholdCpm ?? 180);
  const hasHighAccuracy = update.acc >= (accuracyGoal?.accuracyThreshold ?? 98);
  const flawlessCurrent = update.flawlessSession ? next.streaks.flawlessPractice.current + 1 : 0;
  const successfulCurrent = update.successfulSession ? next.streaks.successfulPractice.current + 1 : 0;
  const weeklyTemplate = getWeeklyTemplateById(next.weekly.templateId);
  const seasonDefinition = getSeasonDefinitionById(next.season.themeId);
  const increments: Partial<Record<MotivationChallengeGoalId, number>> = {
    'practice-sessions': 1,
    'practice-minutes': update.elapsedSeconds / 60,
    'rhythm-sessions': update.trainingMode === 'rhythm' ? 1 : 0,
    'target-speed-sessions': hasTargetSpeed ? 1 : 0,
    'high-accuracy-sessions': hasHighAccuracy ? 1 : 0,
    'flawless-practice': update.flawlessSession ? 1 : 0,
  };

  return {
    totals: {
      ...next.totals,
      practiceSessions: next.totals.practiceSessions + 1,
      practiceMinutes: next.totals.practiceMinutes + (update.elapsedSeconds / 60),
      targetSpeedSessions: next.totals.targetSpeedSessions + (hasTargetSpeed ? 1 : 0),
      highAccuracySessions: next.totals.highAccuracySessions + (hasHighAccuracy ? 1 : 0),
      flawlessPracticeSessions: next.totals.flawlessPracticeSessions + (update.flawlessSession ? 1 : 0),
      successfulPracticeSessions: next.totals.successfulPracticeSessions + (update.successfulSession ? 1 : 0),
    },
    streaks: {
      ...next.streaks,
      flawlessPractice: updateStreak(next.streaks.flawlessPractice, flawlessCurrent),
      successfulPractice: updateStreak(next.streaks.successfulPractice, successfulCurrent),
    },
    weekly: {
      ...next.weekly,
      goals: incrementChallengeGoals(next.weekly.goals, increments, getChallengeTargetMap(weeklyTemplate.goals), timestamp),
    },
    season: {
      ...next.season,
      goals: incrementChallengeGoals(next.season.goals, increments, getChallengeTargetMap(seasonDefinition.featuredGoalIds), timestamp),
    },
    lastUpdated: timestamp,
  };
}

export function updateMotivationAfterGame(
  current: MotivationProgress,
  update: GameMotivationUpdate,
  now = new Date(),
): MotivationProgress {
  const next = normalizeMotivationProgress(current, now);
  const timestamp = now.toISOString();
  const cleanCurrent = update.cleanVictory ? next.streaks.cleanGameVictories.current + 1 : 0;
  const weeklyTemplate = getWeeklyTemplateById(next.weekly.templateId);
  const seasonDefinition = getSeasonDefinitionById(next.season.themeId);
  const increments: Partial<Record<MotivationChallengeGoalId, number>> = {
    'game-levels': update.passedLevel ? 1 : 0,
    'game-victories': update.victory ? 1 : 0,
    'clean-game-victories': update.cleanVictory ? 1 : 0,
  };

  return {
    totals: {
      ...next.totals,
      gameVictories: next.totals.gameVictories + (update.victory ? 1 : 0),
      cleanGameVictories: next.totals.cleanGameVictories + (update.cleanVictory ? 1 : 0),
    },
    streaks: {
      ...next.streaks,
      cleanGameVictories: update.runCompleted
        ? updateStreak(next.streaks.cleanGameVictories, cleanCurrent)
        : next.streaks.cleanGameVictories,
    },
    weekly: {
      ...next.weekly,
      goals: incrementChallengeGoals(next.weekly.goals, increments, getChallengeTargetMap(weeklyTemplate.goals), timestamp),
    },
    season: {
      ...next.season,
      goals: incrementChallengeGoals(next.season.goals, increments, getChallengeTargetMap(seasonDefinition.featuredGoalIds), timestamp),
    },
    lastUpdated: timestamp,
  };
}

export function getMotivationGoalSnapshots(
  progress: MotivationProgress,
  goalIds?: MotivationGoalId[],
): MotivationGoalSnapshot[] {
  const normalized = normalizeMotivationProgress(progress);
  const definitions = goalIds
    ? MOTIVATION_GOAL_DEFINITIONS.filter(goal => goalIds.includes(goal.id))
    : MOTIVATION_GOAL_DEFINITIONS;

  return definitions.map((definition) => {
    const current = getGoalMetricValue(normalized, definition.id);
    const previousTarget = [...definition.targets].reverse().find(target => current >= target) ?? 0;
    const nextTarget = definition.targets.find(target => current < target) ?? null;
    const completed = nextTarget == null;
    const rangeStart = previousTarget;
    const rangeEnd = nextTarget ?? previousTarget;
    const progressPercent = completed
      ? 100
      : rangeEnd <= rangeStart
        ? 0
        : Math.max(0, Math.min(100, Math.round(((current - rangeStart) / (rangeEnd - rangeStart)) * 100)));

    return {
      definition,
      current,
      previousTarget,
      nextTarget,
      completed,
      progressPercent,
    };
  });
}

export function getActiveMotivationGoalSnapshots(
  progress: MotivationProgress,
  limit = 4,
  goalIds?: MotivationGoalId[],
): MotivationGoalSnapshot[] {
  return getMotivationGoalSnapshots(progress, goalIds)
    .sort((left, right) => {
      if (left.completed !== right.completed) return left.completed ? 1 : -1;
      if (left.progressPercent !== right.progressPercent) return right.progressPercent - left.progressPercent;
      return left.definition.title.localeCompare(right.definition.title, 'ru');
    })
    .slice(0, Math.max(1, limit));
}

export function getMotivationStreakSnapshots(
  progress: MotivationProgress,
  streakIds?: MotivationStreakId[],
): MotivationStreakSnapshot[] {
  const normalized = normalizeMotivationProgress(progress);
  const definitions = streakIds
    ? MOTIVATION_STREAK_DEFINITIONS.filter(streak => streakIds.includes(streak.id))
    : MOTIVATION_STREAK_DEFINITIONS;

  return definitions.map((definition) => {
    switch (definition.id) {
      case 'flawless-practice':
        return {
          definition,
          current: normalized.streaks.flawlessPractice.current,
          best: normalized.streaks.flawlessPractice.best,
        };
      case 'successful-practice':
        return {
          definition,
          current: normalized.streaks.successfulPractice.current,
          best: normalized.streaks.successfulPractice.best,
        };
      case 'clean-game-victories':
      default:
        return {
          definition,
          current: normalized.streaks.cleanGameVictories.current,
          best: normalized.streaks.cleanGameVictories.best,
        };
    }
  });
}

export function getWeeklyMotivationSnapshot(progress: MotivationProgress, now = new Date()): MotivationWeeklySnapshot {
  const normalized = normalizeMotivationProgress(progress, now);
  const template = getWeeklyTemplateById(normalized.weekly.templateId);
  const goals = template.goals.map(goal => createChallengeSnapshot(normalized.weekly.goals[goal.id], goal));
  const completedCount = goals.filter(goal => goal.completed).length;

  return {
    template,
    startedAt: normalized.weekly.startedAt,
    endsAt: normalized.weekly.endsAt,
    goals,
    completedCount,
    totalCount: goals.length,
  };
}

export function getSeasonMotivationSnapshot(progress: MotivationProgress, now = new Date()): MotivationSeasonSnapshot {
  const normalized = normalizeMotivationProgress(progress, now);
  const definition = getSeasonDefinitionById(normalized.season.themeId);
  const goals = definition.featuredGoalIds.map(goal => createChallengeSnapshot(normalized.season.goals[goal.id], goal));
  const completedCount = goals.filter(goal => goal.completed).length;

  return {
    definition,
    startedAt: normalized.season.startedAt,
    endsAt: normalized.season.endsAt,
    goals,
    completedCount,
    totalCount: goals.length,
  };
}

export function getWeeklyMotivationRecommendation(
  progress: MotivationProgress,
  options?: { todayDailyRunCompleted?: boolean; now?: Date },
): MotivationRecommendation | null {
  const snapshot = getWeeklyMotivationSnapshot(progress, options?.now);
  const nextGoal = snapshot.goals.find(goal => !goal.completed) ?? null;
  if (!nextGoal) return null;
  return getRecommendationCopy(nextGoal, options);
}

export function getMotivationWindowRemainingDays(endsAt: string, now = new Date()) {
  const endTime = new Date(endsAt).getTime();
  const nowTime = now.getTime();
  if (Number.isNaN(endTime) || Number.isNaN(nowTime)) return 0;
  return Math.max(0, Math.ceil((endTime - nowTime) / DAY_MS));
}
