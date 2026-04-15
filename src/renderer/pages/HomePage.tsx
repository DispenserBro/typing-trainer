import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Clock3,
  Flame,
  Gamepad2,
  Play,
  Settings,
  Shield,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { EXERCISE_COUNT, filterYoKeys } from '../../core/engine';
import { DAILY_RUN_LEVELS } from '../../core/game/dailyRun';
import {
  countUnlockedAchievements,
  getReplayModeFromHistory,
  getReplayTitleFromHistory,
  summarizeDailyRunState,
  summarizeHomeHistory,
  summarizeLessonCompletion,
} from '../../core/home/summary';
import {
  getActiveMotivationGoalSnapshots,
  getMotivationStreakSnapshots,
  getMotivationWindowRemainingDays,
  getSeasonMotivationSnapshot,
  getWeeklyMotivationRecommendation,
  getWeeklyMotivationSnapshot,
} from '../../core/motivation/progress';
import {
  buildModeFocusSnapshots,
  buildHomePersonalRecordCards,
  buildLayoutMasterySnapshot,
  buildHistoryFollowupRecommendation,
  describeHomeRecord,
} from '../../core/motivation/records';
import { useApp } from '../contexts/AppContext';
import { AchievementsModal } from '../components/AchievementsModal';
import { LayoutMasteryPanel } from '../components/LayoutMasteryPanel';

type HomeAction = {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  meta: string;
  actionMode: string;
};

function formatShortDate(value: string | undefined) {
  if (!value) return 'нет данных';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'нет данных';
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
  });
}

function formatChallengeProgress(current: number, target: number) {
  const displayCurrent = Number.isInteger(current) ? current.toString() : Math.round(current).toString();
  const displayTarget = Number.isInteger(target) ? target.toString() : Math.round(target).toString();
  return `${displayCurrent} / ${displayTarget}`;
}

export function HomePage() {
  const {
    layouts,
    currentLayout,
    settings,
    progress,
    practiceSettings,
    gameState,
    fmtSpeed,
    spdLabel,
    switchMode,
    getLayoutProgress,
    getPracticeState,
    gameAchievementCatalog,
    unlockedAchievementIds,
    motivationProgress,
  } = useApp();

  const [showAchievements, setShowAchievements] = useState(false);

  const totalAchievementsCount = gameAchievementCatalog.length;
  const totalUnlockedAchievements = useMemo(
    () => countUnlockedAchievements(gameAchievementCatalog, unlockedAchievementIds),
    [gameAchievementCatalog, unlockedAchievementIds],
  );

  const layout = layouts.layouts[currentLayout];
  const layoutLabel = layout?.label ?? currentLayout.toUpperCase();
  const practiceUnlockOrder = filterYoKeys(layout?.practiceUnlockOrder ?? [], settings.useYo);
  const layoutProgress = getLayoutProgress();
  const practiceState = getPracticeState();
  const totalUnlocked = Math.min(layoutProgress.unlocked, practiceUnlockOrder.length);
  const nextLetter = practiceUnlockOrder[layoutProgress.unlocked] ?? null;
  const unlockProgress = practiceUnlockOrder.length > 0
    ? `${totalUnlocked}/${practiceUnlockOrder.length}`
    : '0/0';

  const goalValue = Math.max(1, practiceSettings.dailyGoalValue || 15);
  const dailyProgressValue = practiceSettings.dailyGoalType === 'sessions'
    ? practiceState.sessionsToday
    : Math.round(practiceState.minutesToday || 0);
  const dailyProgressLabel = practiceSettings.dailyGoalType === 'sessions'
    ? `${practiceState.sessionsToday} / ${goalValue} сессий`
    : `${Math.round(practiceState.minutesToday || 0)} / ${goalValue} мин`;
  const dailyProgressPercent = Math.min(100, Math.round((dailyProgressValue / goalValue) * 100));

  const currentHistory = progress.history?.[currentLayout] ?? [];
  const {
    lastSession,
    bestSession,
    bestSprintSession,
    bestSurvivalSession,
    bestFlawlessSession,
  } = useMemo(() => summarizeHomeHistory(currentHistory), [currentHistory]);

  const lessons = layout?.lessonOrder ?? [];
  const lessonProgress = progress.lessons?.[currentLayout] ?? {};
  const {
    completedLessons,
    nextLessonNumber,
  } = useMemo(
    () => summarizeLessonCompletion(lessons, lessonProgress, EXERCISE_COUNT),
    [lessons, lessonProgress],
  );

  const currentRun = gameState.currentRun ?? null;
  const activeRunLabel = currentRun
    ? `Уровень ${currentRun.level} · ${currentRun.lives} HP`
    : 'Нет активного забега';
  const todayKey = new Date().toISOString().slice(0, 10);
  const {
    todayDailyRun,
    dailyRunCompleted,
  } = useMemo(
    () => summarizeDailyRunState(gameState.dailyRun?.history, todayKey, DAILY_RUN_LEVELS),
    [gameState.dailyRun?.history, todayKey],
  );

  const actions: HomeAction[] = [
    currentRun
      ? {
          id: 'continue-run',
          title: 'Продолжить забег',
          description: 'Вернуться в сохранённый игровой прогресс с тем же уровнем, HP и маршрутом.',
          icon: <Play size={18} />,
          meta: activeRunLabel,
          actionMode: 'game',
        }
      : {
          id: 'start-practice',
          title: 'Быстрая практика',
          description: 'Открыть тренировку слабых мест и сразу начать текущую конфигурацию практики.',
          icon: <Target size={18} />,
          meta: nextLetter ? `Следующая буква: ${nextLetter.toUpperCase()}` : 'Все буквы текущей раскладки открыты',
          actionMode: 'practice',
        },
    {
      id: 'lessons',
      title: 'Вернуться к урокам',
      description: 'Продолжить обучение по структуре раскладки и упражнениям на переходы.',
      icon: <BookOpen size={18} />,
      meta: nextLessonNumber ? `Следующий урок: ${nextLessonNumber}` : 'Все уроки текущей раскладки завершены',
      actionMode: 'lessons',
    },
    {
      id: 'stats',
      title: 'Открыть статистику',
      description: 'Посмотреть динамику скорости, точности, ритма и проблемных сочетаний.',
      icon: <BarChart3 size={18} />,
      meta: lastSession ? `Последняя сессия: ${formatShortDate(lastSession.date)}` : 'Статистика появится после первых попыток',
      actionMode: 'stats',
    },
  ];

  const modeCards = [
    {
      id: 'practice',
      title: 'Практика',
      description: 'Короткие адаптивные сессии для слабых букв, биграмм и ритма.',
      icon: <Target size={20} />,
      meta: nextLetter ? `До новой буквы: ${layoutProgress.unlockProgress}/3` : 'Раскладка открыта полностью',
    },
    {
      id: 'test',
      title: 'Спринт',
      description: 'Короткий таймерный забег на темп и аккуратность поверх общего content-pipeline.',
      icon: <Clock3 size={20} />,
      meta: bestSprintSession ? `Лучший спринт: ${fmtSpeed(bestSprintSession.wpm)} ${spdLabel}` : 'Ещё нет спринтов',
    },
    {
      id: 'survival',
      title: 'Выживание',
      description: 'Длинный проход с ограничением по ошибкам, где важна устойчивая серия до конца текста.',
      icon: <Shield size={20} />,
      meta: bestSurvivalSession ? `Лучший проход: ${fmtSpeed(bestSurvivalSession.wpm)} ${spdLabel}` : 'Ещё нет проходов',
    },
    {
      id: 'flawless',
      title: 'Без ошибок',
      description: 'Чистый проход без права на промах, чтобы закреплять стабильность и аккуратность.',
      icon: <AlertTriangle size={20} />,
      meta: bestFlawlessSession ? `Лучший чистый проход: ${fmtSpeed(bestFlawlessSession.wpm)} ${spdLabel}` : 'Ещё нет чистых проходов',
    },
    {
      id: 'lessons',
      title: 'Уроки',
      description: 'Пошаговое обучение раскладке от базовых рядов до связок и ритма.',
      icon: <BookOpen size={20} />,
      meta: `${completedLessons}/${lessons.length || 0} уроков завершено`,
    },
    {
      id: 'game',
      title: 'Игра',
      description: 'Длинные забеги с боссами, предметами, маршрутами, событиями и наградами.',
      icon: <Gamepad2 size={20} />,
      meta: currentRun ? activeRunLabel : `Лучший уровень: ${gameState.highestLevel}`,
    },
    {
      id: 'stats',
      title: 'Статистика',
      description: 'Графики прогресса, heatmap клавиатуры, анализ ритма и drilldown по сессиям.',
      icon: <BarChart3 size={20} />,
      meta: lastSession ? `Последняя запись: ${formatShortDate(lastSession.date)}` : 'Появится после первых сессий',
    },
    {
      id: 'settings',
      title: 'Настройки',
      description: 'Темы, клавиатура, текст, визуал и параметры ввода под себя.',
      icon: <Settings size={20} />,
      meta: `${layoutLabel} · ${settings.theme}`,
    },
  ];
  const {
    homeGoals,
    homeStreaks,
    weeklySnapshot,
    seasonSnapshot,
    weeklyRecommendation,
    weeklyRemainingDays,
    seasonRemainingDays,
  } = useMemo(() => {
    const nextWeeklySnapshot = getWeeklyMotivationSnapshot(motivationProgress);
    const nextSeasonSnapshot = getSeasonMotivationSnapshot(motivationProgress);

    return {
      homeGoals: getActiveMotivationGoalSnapshots(motivationProgress, 4),
      homeStreaks: getMotivationStreakSnapshots(motivationProgress),
      weeklySnapshot: nextWeeklySnapshot,
      seasonSnapshot: nextSeasonSnapshot,
      weeklyRecommendation: getWeeklyMotivationRecommendation(motivationProgress, {
        todayDailyRunCompleted: dailyRunCompleted,
      }),
      weeklyRemainingDays: getMotivationWindowRemainingDays(nextWeeklySnapshot.endsAt),
      seasonRemainingDays: getMotivationWindowRemainingDays(nextSeasonSnapshot.endsAt),
    };
  }, [dailyRunCompleted, motivationProgress]);
  const {
    personalRecordCards,
    layoutMastery,
    modeFocusSnapshots,
    recommendedModeFocus,
    lastModeFollowup,
  } = useMemo(() => {
    const nextModeFocusSnapshots = buildModeFocusSnapshots(currentHistory);

    return {
      personalRecordCards: buildHomePersonalRecordCards(progress, layouts, currentLayout),
      layoutMastery: buildLayoutMasterySnapshot(progress, layouts, currentLayout),
      modeFocusSnapshots: nextModeFocusSnapshots,
      recommendedModeFocus: nextModeFocusSnapshots.find(snapshot => snapshot.id !== 'practice' && snapshot.attempts === 0)
        ?? nextModeFocusSnapshots.find(snapshot => snapshot.id !== 'practice' && snapshot.emphasis === 'warn')
        ?? null,
      lastModeFollowup: buildHistoryFollowupRecommendation(lastSession),
    };
  }, [currentHistory, currentLayout, lastSession, layouts, progress]);

  const recommendation = useMemo(() => {
    if (currentRun) {
      return {
        title: 'Продолжить забег',
        description: 'Активный игровой забег уже сохранён. Самый ценный следующий шаг — вернуться в него и не терять инерцию.',
        actionLabel: 'Продолжить игру',
        actionMode: 'game',
      };
    }

    if (weeklyRecommendation) {
      return {
        title: weeklyRecommendation.title,
        description: weeklyRecommendation.description,
        actionLabel: weeklyRecommendation.actionLabel,
        actionMode: weeklyRecommendation.actionMode,
      };
    }

    if (lastModeFollowup) {
      return {
        title: lastModeFollowup.title,
        description: lastModeFollowup.description,
        actionLabel: lastModeFollowup.actionLabel,
        actionMode: lastModeFollowup.actionMode,
      };
    }

    if (recommendedModeFocus) {
      return {
        title: `Проверить режим: ${recommendedModeFocus.title}`,
        description: recommendedModeFocus.recommendation,
        actionLabel: `Открыть ${recommendedModeFocus.title.toLowerCase()}`,
        actionMode: recommendedModeFocus.actionMode,
      };
    }

    if (nextLessonNumber !== null && completedLessons < Math.max(3, Math.floor(lessons.length * 0.35))) {
      return {
        title: 'Продолжить уроки',
        description: `Следующий полезный шаг — добрать базу раскладки. Ближайшая цель: урок ${nextLessonNumber}.`,
        actionLabel: 'Открыть уроки',
        actionMode: 'lessons',
      };
    }

    if (nextLetter) {
      return {
        title: 'Открыть новую букву',
        description: `До следующей буквы осталось немного. Практика быстрее всего продвинет раскладку к символу ${nextLetter.toUpperCase()}.`,
        actionLabel: 'Пойти в практику',
        actionMode: 'practice',
      };
    }

    if (!todayDailyRun) {
      return {
        title: 'Зайти в игровой режим',
        description: 'Базовая тренировка уже собрана. Игровой режим поможет закрепить навык в более длинной и вариативной сессии.',
        actionLabel: 'Открыть игру',
        actionMode: 'game',
      };
    }

    return {
      title: 'Открыть практику',
      description: 'Лучший следующий шаг — короткая практика, чтобы сохранить темп и продвинуть прогресс раскладки.',
      actionLabel: 'Перейти в практику',
      actionMode: 'practice',
    };
  }, [
    completedLessons,
    currentRun,
    lastModeFollowup,
    lessons.length,
    nextLessonNumber,
    nextLetter,
    recommendedModeFocus,
    todayDailyRun,
    weeklyRecommendation,
  ]);

  return (
    <section className="mode-panel active home-panel">
      <div className="panel-header home-header">
        <div>
          <h1>Главное меню</h1>
          <p className="card-desc home-header-copy">
            Центральная точка входа в тренировку, игру и аналитику.
          </p>
        </div>
      </div>

      <AchievementsModal
        open={showAchievements}
        achievementCatalog={gameAchievementCatalog}
        unlockedAchievementIds={unlockedAchievementIds}
        onClose={() => setShowAchievements(false)}
      />

      <div className="home-hero card">
        <div className="home-hero-copy">
          <span className="home-kicker">Typing Trainer</span>
          <h2>Быстрый старт, возврат в прогресс и понятный следующий шаг.</h2>
          <p>
            Здесь можно сразу продолжить активный забег, вернуться к урокам или выбрать режим
            под текущую цель без лишних переходов.
          </p>
          <div className="home-hero-actions">
            <button className="btn-accent" onClick={() => switchMode(recommendation.actionMode)}>
              {recommendation.actionLabel}
            </button>
            <button className="btn-secondary" onClick={() => switchMode(currentRun ? 'game' : 'practice')}>
              {currentRun ? 'Открыть игру' : 'Открыть практику'}
            </button>
          </div>
          <div className="home-hero-tags">
            <span>{layoutLabel}</span>
            <span>Дневная цель: {dailyProgressLabel}</span>
            <span>Weekly: {weeklySnapshot.completedCount}/{weeklySnapshot.totalCount}</span>
            <span>{currentRun ? 'Активный забег сохранён' : 'Можно стартовать новую сессию'}</span>
          </div>
        </div>

        <div className="home-recommendation">
          <div className="home-recommendation-head">
            <Sparkles size={18} />
            <span>Что делать дальше</span>
          </div>
          <h3>{recommendation.title}</h3>
          <p>{recommendation.description}</p>
          <button className="home-inline-link" onClick={() => switchMode(recommendation.actionMode)}>
            {recommendation.actionLabel}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <div className="home-summary-grid">
        <div className="card home-summary-card">
          <span className="home-summary-label">Текущая раскладка</span>
          <strong>{layoutLabel}</strong>
          <p>{unlockProgress} букв открыто</p>
        </div>
        <div className="card home-summary-card">
          <span className="home-summary-label">Дневная цель</span>
          <strong>{dailyProgressLabel}</strong>
          <div className="home-progress-bar">
            <span style={{ width: `${dailyProgressPercent}%` }} />
          </div>
        </div>
        <div className="card home-summary-card">
          <span className="home-summary-label">Уроки</span>
          <strong>{completedLessons}/{lessons.length || 0}</strong>
          <p>{nextLessonNumber ? `Следующий урок: ${nextLessonNumber}` : 'Все уроки завершены'}</p>
        </div>
        <div className="card home-summary-card">
          <span className="home-summary-label">Игровой прогресс</span>
          <strong>{currentRun ? `Уровень ${currentRun.level}` : `Уровень ${gameState.highestLevel}`}</strong>
          <p>{currentRun ? `${currentRun.lives} HP в активном забеге` : 'Активного забега нет'}</p>
        </div>
      </div>

      <div className="home-section">
        <div className="home-section-head">
          <h3>Быстрый возврат</h3>
          <p className="card-desc">Повтор последнего сценария и самый уместный следующий переход после него.</p>
        </div>
        <div className="home-action-grid">
          <button
            type="button"
            className="card home-action-card"
            onClick={() => switchMode(getReplayModeFromHistory(lastSession))}
          >
            <div className="home-card-head">
              <span className="home-card-meta">Последняя попытка</span>
            </div>
            <h4>{getReplayTitleFromHistory(lastSession)}</h4>
            <p>{lastSession ? `Последний результат был ${formatShortDate(lastSession.date)}.` : 'История пока пустая, начните с базовой практики.'}</p>
          </button>
          {lastModeFollowup && (
            <button
              type="button"
              className="card home-action-card"
              onClick={() => switchMode(lastModeFollowup.actionMode)}
            >
              <div className="home-card-head">
                <span className="home-card-meta">Следующий шаг</span>
              </div>
              <h4>{lastModeFollowup.title}</h4>
              <p>{lastModeFollowup.description}</p>
            </button>
          )}
        </div>
      </div>

      <div className="home-section">
        <div className="home-section-head">
          <h3>Недельные задачи</h3>
          <p className="card-desc">
            {weeklySnapshot.template.title} · до сброса осталось {weeklyRemainingDays} дн.
          </p>
        </div>
        <div className="home-summary-grid">
          {weeklySnapshot.goals.map((goal) => (
            <div key={goal.definition.id} className="card home-summary-card">
              <span className="home-summary-label">{goal.definition.title}</span>
              <strong>{formatChallengeProgress(goal.current, goal.target)}</strong>
              <div className="home-progress-bar">
                <span style={{ width: `${goal.progressPercent}%` }} />
              </div>
              <p>{goal.completed ? 'Задача недели закрыта' : goal.definition.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="home-section">
        <div className="home-section-head">
          <h3>Сезонный фокус</h3>
          <p className="card-desc">
            {seasonSnapshot.definition.title} · локальный цикл ещё на {seasonRemainingDays} дн.
          </p>
        </div>
        <div className="card home-summary-card">
          <span className="home-summary-label">{seasonSnapshot.definition.title}</span>
          <strong>{seasonSnapshot.completedCount}/{seasonSnapshot.totalCount} целей закрыто</strong>
          <p>{seasonSnapshot.definition.description}</p>
          <div className="home-insight-grid">
            {seasonSnapshot.goals.map((goal) => (
              <div key={goal.definition.id} className="card home-insight-card">
                <span className="home-summary-label">{goal.definition.title}</span>
                <strong>{formatChallengeProgress(goal.current, goal.target)}</strong>
                <p>{goal.completed ? 'Выполнено в текущем сезоне' : goal.definition.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="home-section">
        <div className="home-section-head">
          <h3>Достижения</h3>
          <p className="card-desc">Ваши награды за игровые, учебные и тренировочные успехи.</p>
        </div>
        <button
          type="button"
          className="card home-achievements-card"
          onClick={() => setShowAchievements(true)}
        >
          <div className="home-achievements-card-left">
            <div className="home-achievements-card-head">
              <Trophy size={24} style={{ color: 'var(--accent)' }} />
              <h3>Коллекция трофеев</h3>
            </div>
            <p className="home-achievements-card-desc">Посмотреть все разблокированные достижения из всех режимов</p>
          </div>
          <div className="home-achievements-card-count">
            <div className="home-achievements-card-value">
              {totalUnlockedAchievements}
            </div>
            <div className="home-achievements-card-total">
              / {totalAchievementsCount}
            </div>
          </div>
        </button>
      </div>

      <div className="home-section">
        <div className="home-section-head">
          <h3>Режимный фокус</h3>
          <p className="card-desc">Какие режимы уже встроены в цикл занятий, а какие ещё стоит подтянуть для более цельной прогрессии.</p>
        </div>
        <div className="home-summary-grid">
          {modeFocusSnapshots.map((snapshot) => (
            <button
              key={snapshot.id}
              type="button"
              className="card home-summary-card"
              onClick={() => switchMode(snapshot.actionMode)}
            >
              <span className="home-summary-label">{snapshot.title}</span>
              <strong>
                {snapshot.bestEntry ? `${fmtSpeed(snapshot.bestEntry.wpm)} ${spdLabel}` : 'Нет попыток'}
              </strong>
              <p>
                {snapshot.attempts > 0
                  ? `${snapshot.attempts} попыток · последняя ${formatShortDate(snapshot.lastEntry?.date)}`
                  : snapshot.description}
              </p>
              <p>{snapshot.recommendation}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="home-section">
        <div className="home-section-head">
          <h3>Личные рекорды</h3>
          <p className="card-desc">Короткая сводка лучших результатов по режимам, текущему языку и активной раскладке.</p>
        </div>
        <div className="home-summary-grid">
          {personalRecordCards.map((card) => (
            <div key={card.id} className="card home-summary-card">
              <span className="home-summary-label">{card.title}</span>
              <strong>{card.record ? `${fmtSpeed(card.record.entry.wpm)} ${spdLabel}` : 'Нет данных'}</strong>
              <p>{card.record ? `${Math.round(card.record.entry.acc)}% · ${describeHomeRecord(card.record)}` : card.subtitle}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="home-section">
        <div className="home-section-head">
          <h3>Цепочка мастерства</h3>
          <p className="card-desc">Текущая ступень раскладки, активный unlock-эффект и ближайшая награда в mastery-цепочке.</p>
        </div>
        <LayoutMasteryPanel
          snapshot={layoutMastery}
          formatSpeed={fmtSpeed}
          speedLabel={spdLabel}
        />
      </div>

      <div className="home-section">
        <div className="home-section-head">
          <h3>Долгие цели</h3>
          <p className="card-desc">Прогресс по крупным вехам, которые держат инерцию между отдельными сессиями.</p>
        </div>
        <div className="home-summary-grid">
          {homeGoals.map((goal) => (
            <div key={goal.definition.id} className="card home-summary-card">
              <span className="home-summary-label">{goal.definition.title}</span>
              <strong>
                {Math.round(goal.current)}
                {goal.nextTarget != null ? ` / ${goal.nextTarget}` : ''}
              </strong>
              <p>{goal.definition.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="home-section">
        <div className="home-section-head">
          <h3>Серии</h3>
          <p className="card-desc">Текущие и лучшие цепочки, которые помогают видеть стабильность, а не только разовый пик.</p>
        </div>
        <div className="home-insight-grid">
          {homeStreaks.map((streak) => (
            <div key={streak.definition.id} className="card home-insight-card">
              <span className="home-summary-label">{streak.definition.title}</span>
              <strong>{streak.current}</strong>
              <p>Лучший результат: {streak.best}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="home-section">
        <div className="home-section-head">
          <h3>Быстрые действия</h3>
          <p className="card-desc">Самые частые входы для продолжения текущего прогресса.</p>
        </div>
        <div className="home-action-grid">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              className="card home-action-card"
              onClick={() => switchMode(action.actionMode)}
            >
              <div className="home-card-head">
                <span className="home-card-icon">{action.icon}</span>
                <span className="home-card-meta">{action.meta}</span>
              </div>
              <h4>{action.title}</h4>
              <p>{action.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="home-section">
        <div className="home-section-head">
          <h3>Режимы</h3>
          <p className="card-desc">Каждый режим отвечает за свой тип прогресса и сценарий занятия.</p>
        </div>
        <div className="home-mode-grid">
          {modeCards.map((card) => (
            <button
              key={card.id}
              type="button"
              className="card home-mode-card"
              onClick={() => switchMode(card.id)}
            >
              <div className="home-card-head">
                <span className="home-card-icon">{card.icon}</span>
                <span className="home-card-meta">{card.meta}</span>
              </div>
              <h4>{card.title}</h4>
              <p>{card.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="home-section">
        <div className="home-section-head">
          <h3>Краткая сводка</h3>
          <p className="card-desc">Самое важное состояние профиля на текущий момент.</p>
        </div>
        <div className="home-insight-grid">
          <div className="card home-insight-card">
            <span className="home-summary-label">Последняя сессия</span>
            <strong>{lastSession ? `${fmtSpeed(lastSession.wpm)} ${spdLabel}` : 'Нет данных'}</strong>
            <p>{lastSession ? `${Math.round(lastSession.acc)}% · ${formatShortDate(lastSession.date)}` : 'Пока нет завершённых сессий'}</p>
          </div>
          <div className="card home-insight-card">
            <span className="home-summary-label">Лучшая скорость</span>
            <strong>{bestSession ? `${fmtSpeed(bestSession.wpm)} ${spdLabel}` : 'Нет данных'}</strong>
            <p>{bestSession ? `${Math.round(bestSession.acc)}% точности` : 'Появится после первых результатов'}</p>
          </div>
          <div className="card home-insight-card">
            <span className="home-summary-label">Текущая серия дня</span>
            <strong>{practiceSettings.dailyGoalType === 'sessions' ? practiceState.sessionsToday : `${Math.round(practiceState.minutesToday || 0)} мин`}</strong>
            <p>{practiceSettings.dailyGoalType === 'sessions' ? 'Сессий сегодня' : 'Практики сегодня'}</p>
          </div>
          <div className="card home-insight-card">
            <span className="home-summary-label">Daily run</span>
            <strong>{dailyRunCompleted ? 'Пройден' : 'Не пройден'}</strong>
            <p>{todayDailyRun ? `Попыток: ${todayDailyRun.attempts}` : 'Сегодня ещё не было попыток'}</p>
          </div>
        </div>
      </div>

      <div className="home-footer-note">
        <Flame size={16} />
        <span>
          Главное меню теперь открывается при запуске приложения и по нажатию на иконку в боковой панели.
        </span>
        <Trophy size={16} />
      </div>
    </section>
  );
}
