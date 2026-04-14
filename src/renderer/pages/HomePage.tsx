import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Clock3,
  Flame,
  Gamepad2,
  Play,
  Settings,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { EXERCISE_COUNT, filterYoKeys } from '../../core/engine';
import { DAILY_RUN_LEVELS } from '../../core/game/dailyRun';
import { useApp } from '../contexts/AppContext';
import { AchievementsModal } from '../components/AchievementsModal';

type HomeAction = {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  meta: string;
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
  } = useApp();

  const [showAchievements, setShowAchievements] = useState(false);

  const totalAchievementsCount = gameAchievementCatalog.length;
  const totalUnlockedAchievements = unlockedAchievementIds.filter(
    id => gameAchievementCatalog.some(a => a.id === id),
  ).length;

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
  const lastSession = currentHistory[currentHistory.length - 1] ?? null;
  let bestSession = lastSession;
  for (const entry of currentHistory) {
    if (!bestSession || entry.wpm > bestSession.wpm) {
      bestSession = entry;
    }
  }

  const lessons = layout?.lessonOrder ?? [];
  const lessonProgress = progress.lessons?.[currentLayout] ?? {};
  const completedLessons = lessons.reduce((count, _lesson, index) => {
    const done = lessonProgress[index];
    const doneCount = typeof done === 'number' ? done : (done ? EXERCISE_COUNT : 0);
    return count + (doneCount >= EXERCISE_COUNT ? 1 : 0);
  }, 0);
  const nextLessonNumber = completedLessons < lessons.length ? completedLessons + 1 : null;

  const currentRun = gameState.currentRun ?? null;
  const activeRunLabel = currentRun
    ? `Уровень ${currentRun.level} · ${currentRun.lives} HP`
    : 'Нет активного забега';
  const dailyRunEntries = Object.values(gameState.dailyRun?.history ?? {});
  const todayDailyRun = dailyRunEntries
    .find(entry => entry.date === new Date().toISOString().slice(0, 10)) ?? null;
  const dailyRunCompleted = Boolean(todayDailyRun && todayDailyRun.maxLevel >= DAILY_RUN_LEVELS);

  let recommendation = {
    title: 'Открыть практику',
    description: 'Лучший следующий шаг — короткая практика, чтобы сохранить темп и продвинуть прогресс раскладки.',
    actionLabel: 'Перейти в практику',
    action: () => switchMode('practice'),
  };

  if (currentRun) {
    recommendation = {
      title: 'Продолжить забег',
      description: 'Активный игровой забег уже сохранён. Самый ценный следующий шаг — вернуться в него и не терять инерцию.',
      actionLabel: 'Продолжить игру',
      action: () => switchMode('game'),
    };
  } else if (nextLessonNumber !== null && completedLessons < Math.max(3, Math.floor(lessons.length * 0.35))) {
    recommendation = {
      title: 'Продолжить уроки',
      description: `Следующий полезный шаг — добрать базу раскладки. Ближайшая цель: урок ${nextLessonNumber}.`,
      actionLabel: 'Открыть уроки',
      action: () => switchMode('lessons'),
    };
  } else if (nextLetter) {
    recommendation = {
      title: 'Открыть новую букву',
      description: `До следующей буквы осталось немного. Практика быстрее всего продвинет раскладку к символу ${nextLetter.toUpperCase()}.`,
      actionLabel: 'Пойти в практику',
      action: () => switchMode('practice'),
    };
  } else if (!todayDailyRun) {
    recommendation = {
      title: 'Зайти в игровой режим',
      description: 'Базовая тренировка уже собрана. Игровой режим поможет закрепить навык в более длинной и вариативной сессии.',
      actionLabel: 'Открыть игру',
      action: () => switchMode('game'),
    };
  }

  const actions: HomeAction[] = [
    currentRun
      ? {
          id: 'continue-run',
          title: 'Продолжить забег',
          description: 'Вернуться в сохранённый игровой прогресс с тем же уровнем, HP и маршрутом.',
          icon: <Play size={18} />,
          meta: activeRunLabel,
        }
      : {
          id: 'start-practice',
          title: 'Быстрая практика',
          description: 'Открыть тренировку слабых мест и сразу начать текущую конфигурацию практики.',
          icon: <Target size={18} />,
          meta: nextLetter ? `Следующая буква: ${nextLetter.toUpperCase()}` : 'Все буквы текущей раскладки открыты',
        },
    {
      id: 'lessons',
      title: 'Вернуться к урокам',
      description: 'Продолжить обучение по структуре раскладки и упражнениям на переходы.',
      icon: <BookOpen size={18} />,
      meta: nextLessonNumber ? `Следующий урок: ${nextLessonNumber}` : 'Все уроки текущей раскладки завершены',
    },
    {
      id: 'stats',
      title: 'Открыть статистику',
      description: 'Посмотреть динамику скорости, точности, ритма и проблемных сочетаний.',
      icon: <BarChart3 size={18} />,
      meta: lastSession ? `Последняя сессия: ${formatShortDate(lastSession.date)}` : 'Статистика появится после первых попыток',
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
      title: 'Тест',
      description: 'Проверка чистой скорости и точности на фиксированном времени.',
      icon: <Clock3 size={20} />,
      meta: bestSession ? `Лучший результат: ${fmtSpeed(bestSession.wpm)} ${spdLabel}` : 'Ещё нет результатов',
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
            <button className="btn-accent" onClick={recommendation.action}>
              {recommendation.actionLabel}
            </button>
            <button className="btn-secondary" onClick={() => switchMode(currentRun ? 'game' : 'practice')}>
              {currentRun ? 'Открыть игру' : 'Открыть практику'}
            </button>
          </div>
          <div className="home-hero-tags">
            <span>{layoutLabel}</span>
            <span>Дневная цель: {dailyProgressLabel}</span>
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
          <button className="home-inline-link" onClick={recommendation.action}>
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
          <h3>Быстрые действия</h3>
          <p className="card-desc">Самые частые входы для продолжения текущего прогресса.</p>
        </div>
        <div className="home-action-grid">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              className="card home-action-card"
              onClick={() => {
                if (action.id === 'continue-run') switchMode('game');
                else if (action.id === 'start-practice') switchMode('practice');
                else if (action.id === 'lessons') switchMode('lessons');
                else switchMode('stats');
              }}
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
