import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  CheckCircle2,
  Gamepad2,
  Keyboard,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  Trophy,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ModalLayout } from '../ui/ModalLayout';

export type ModeGuideMode = 'practice' | 'test' | 'survival' | 'flawless' | 'lessons' | 'game';

type ModeGuideStep = {
  body: string;
  checklist: string[];
  kind?: 'interactive';
  title: string;
};

type ModeGuideConfig = {
  description: string;
  finishLabel: string;
  icon: LucideIcon;
  interactivePrompt: string;
  interactiveTargets: string[];
  kicker: string;
  steps: ModeGuideStep[];
  title: string;
};

const MODE_GUIDE_CONFIGS: Record<ModeGuideMode, ModeGuideConfig> = {
  practice: {
    description: 'Короткий адаптивный режим для слабых символов, сочетаний и ритма.',
    finishLabel: 'Перейти к практике',
    icon: Target,
    interactivePrompt: 'Нажмите подсвеченные цели по порядку: фокус, темп, точность.',
    interactiveTargets: ['Фокус', 'Темп', 'Точность'],
    kicker: 'Быстрый старт',
    title: 'Практика',
    steps: [
      {
        title: 'Что здесь тренируется',
        body: 'Практика подбирает материал под текущую раскладку, прогресс и слабые места.',
        checklist: ['слабые буквы', 'адаптивные слова', 'ритм и стабильность'],
      },
      {
        title: 'Как начать',
        body: 'Нажмите на текстовую область или начните печатать. Настройки режима можно открыть сверху.',
        checklist: ['выбор материала', 'цель скорости', 'режим тренировки'],
      },
      {
        kind: 'interactive',
        title: 'Мини-проба',
        body: 'Перед стартом запомните базовый цикл: сосредоточиться, держать темп, не жертвовать точностью.',
        checklist: ['пройти 3 мини-шага'],
      },
    ],
  },
  test: {
    description: 'Спринт на время для проверки текущей скорости и точности.',
    finishLabel: 'Перейти к спринту',
    icon: Timer,
    interactivePrompt: 'Отметьте три опоры спринта перед первым запуском.',
    interactiveTargets: ['Таймер', 'Ровный темп', 'Финиш'],
    kicker: 'Режим на время',
    title: 'Спринт',
    steps: [
      {
        title: 'Главная идея',
        body: 'Спринт показывает, как вы печатаете под ограничением времени.',
        checklist: ['15-60 секунд', 'живые метрики', 'история лучших попыток'],
      },
      {
        title: 'Что важно',
        body: 'Не разгоняйтесь ценой ошибок: итоговая оценка полезнее, когда скорость и точность растут вместе.',
        checklist: ['следите за таймером', 'не паникуйте на ошибках', 'повторяйте короткими сериями'],
      },
      {
        kind: 'interactive',
        title: 'Мини-проба',
        body: 'Спринт легче, если заранее принять его ритм.',
        checklist: ['пройти 3 мини-шага'],
      },
    ],
  },
  survival: {
    description: 'Длинная дистанция с запасом ошибок и проверкой стабильности.',
    finishLabel: 'Перейти к выживанию',
    icon: ShieldCheck,
    interactivePrompt: 'Соберите безопасный маршрут: запас, контроль, финиш.',
    interactiveTargets: ['Запас', 'Контроль', 'Финиш'],
    kicker: 'Режим на выдержку',
    title: 'Выживание',
    steps: [
      {
        title: 'Цель режима',
        body: 'Выживание проверяет, насколько долго вы удерживаете качество печати.',
        checklist: ['есть лимит ошибок', 'дистанция длиннее', 'важна стабильность'],
      },
      {
        title: 'Как играть',
        body: 'Печатайте ровно, не пытайтесь отыграть ошибку резким ускорением.',
        checklist: ['берегите попытки', 'смотрите на прогресс', 'перезапускайте короткими циклами'],
      },
      {
        kind: 'interactive',
        title: 'Мини-проба',
        body: 'Отметьте базовые опоры выживания перед первым запуском.',
        checklist: ['пройти 3 мини-шага'],
      },
    ],
  },
  flawless: {
    description: 'Чистый забег без права на ошибку.',
    finishLabel: 'Перейти к безошибочному режиму',
    icon: Sparkles,
    interactivePrompt: 'Соберите чистый старт: взгляд, пауза, ввод.',
    interactiveTargets: ['Взгляд', 'Пауза', 'Ввод'],
    kicker: 'Точность прежде всего',
    title: 'Без ошибок',
    steps: [
      {
        title: 'Чем отличается режим',
        body: 'Здесь важнее всего контроль: одна ошибка может завершить попытку.',
        checklist: ['нулевая терпимость к ошибкам', 'короткая концентрация', 'медленный старт допустим'],
      },
      {
        title: 'Полезная стратегия',
        body: 'Сначала читайте на полслова вперед, затем ускоряйтесь только когда поймали ритм.',
        checklist: ['не спешить на старте', 'держать взгляд впереди', 'останавливаться после сбоя'],
      },
      {
        kind: 'interactive',
        title: 'Мини-проба',
        body: 'Точность начинается с маленькой паузы перед первым символом.',
        checklist: ['пройти 3 мини-шага'],
      },
    ],
  },
  lessons: {
    description: 'Пошаговое изучение раскладки и закрепление новых символов.',
    finishLabel: 'Перейти к урокам',
    icon: BookOpen,
    interactivePrompt: 'Отметьте путь урока: ряд, символ, закрепление.',
    interactiveTargets: ['Ряд', 'Символ', 'Закрепление'],
    kicker: 'Учебный маршрут',
    title: 'Уроки',
    steps: [
      {
        title: 'Зачем нужны уроки',
        body: 'Уроки проводят по раскладке постепенно, чтобы пальцы привыкали без перегруза.',
        checklist: ['освоение рядов', 'новые символы', 'упражнения по порядку'],
      },
      {
        title: 'Как проходить',
        body: 'Лучше закрывать уроки короткими подходами, чем пытаться пройти всю раскладку за один раз.',
        checklist: ['начните с доступного урока', 'повторяйте сложные символы', 'следите за точностью'],
      },
      {
        kind: 'interactive',
        title: 'Мини-проба',
        body: 'Соберите три части учебного цикла.',
        checklist: ['пройти 3 мини-шага'],
      },
    ],
  },
  game: {
    description: 'Рогалик-забег с картой, предметами, событиями и боссами.',
    finishLabel: 'Перейти к игре',
    icon: Gamepad2,
    interactivePrompt: 'Подготовьте забег: карта, бой, награда.',
    interactiveTargets: ['Карта', 'Бой', 'Награда'],
    kicker: 'Игровая прогрессия',
    title: 'Игра',
    steps: [
      {
        title: 'Что происходит',
        body: 'Игра превращает тренировку в маршрут: вы выбираете узлы, проходите бои и собираете предметы.',
        checklist: ['карта забега', 'обычные уровни и боссы', 'инвентарь и награды'],
      },
      {
        title: 'Как не потеряться',
        body: 'Сначала выберите комфортную цель скорости, затем следите за здоровьем и эффектами предметов.',
        checklist: ['цель скорости', 'здоровье', 'выбор наград'],
      },
      {
        kind: 'interactive',
        title: 'Мини-проба',
        body: 'Отметьте три элемента, которые ведут игровой забег.',
        checklist: ['пройти 3 мини-шага'],
      },
    ],
  },
};

export function isModeGuideMode(mode: string): mode is ModeGuideMode {
  return Object.prototype.hasOwnProperty.call(MODE_GUIDE_CONFIGS, mode);
}

type ModeWelcomeGuideProps = {
  mode: ModeGuideMode;
  onComplete: () => void;
  onSkip: () => void;
};

export function ModeWelcomeGuide({ mode, onComplete, onSkip }: ModeWelcomeGuideProps) {
  const config = MODE_GUIDE_CONFIGS[mode];
  const Icon = config.icon;
  const [stepIndex, setStepIndex] = useState(0);
  const [hitIndex, setHitIndex] = useState(0);

  useEffect(() => {
    setStepIndex(0);
    setHitIndex(0);
  }, [mode]);

  const step = config.steps[stepIndex] ?? config.steps[0]!;
  const isInteractiveStep = step.kind === 'interactive';
  const interactionDone = !isInteractiveStep || hitIndex >= config.interactiveTargets.length;
  const isLastStep = stepIndex >= config.steps.length - 1;
  const progressPercent = Math.round(((stepIndex + 1) / config.steps.length) * 100);

  const handleNext = () => {
    if (!interactionDone) return;
    if (isLastStep) {
      onComplete();
      return;
    }
    setStepIndex(current => current + 1);
    setHitIndex(0);
  };

  return (
    <ModalLayout
      className="mode-guide-modal"
      description={config.description}
      footer={(
        <div className="mode-guide-actions">
          <Button variant="ghost" onClick={onSkip}>Пропустить гайд</Button>
          <Button
            variant="accent"
            disabled={!interactionDone}
            onClick={handleNext}
          >
            {isLastStep ? config.finishLabel : 'Дальше'}
          </Button>
        </div>
      )}
      onClose={onSkip}
      size="lg"
      title={(
        <span className="mode-guide-title">
          <span className="mode-guide-title-icon"><Icon size={20} /></span>
          {config.title}
        </span>
      )}
    >
      <div className="mode-guide">
        <div className="mode-guide-progress" aria-hidden="true">
          <span style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="mode-guide-kicker">{config.kicker}</div>
        <h3>{step.title}</h3>
        <p>{step.body}</p>

        <div className="mode-guide-checklist">
          {step.checklist.map(item => (
            <div key={item} className="mode-guide-checkitem">
              <CheckCircle2 size={16} />
              <span>{item}</span>
            </div>
          ))}
        </div>

        {isInteractiveStep ? (
          <div className="mode-guide-interaction">
            <div>
              <strong>Интерактивный шаг</strong>
              <p>{config.interactivePrompt}</p>
            </div>
            <div className="mode-guide-targets">
              {config.interactiveTargets.map((target, index) => {
                const done = index < hitIndex;
                const active = index === hitIndex;
                return (
                  <button
                    key={target}
                    type="button"
                    className={[
                      'mode-guide-target',
                      done ? 'done' : '',
                      active ? 'active' : '',
                    ].filter(Boolean).join(' ')}
                    disabled={!active}
                    onClick={() => setHitIndex(current => Math.min(current + 1, config.interactiveTargets.length))}
                  >
                    {done ? <CheckCircle2 size={15} /> : <Keyboard size={15} />}
                    {target}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mode-guide-step-label">
          Шаг {stepIndex + 1} из {config.steps.length}
        </div>
      </div>
    </ModalLayout>
  );
}
