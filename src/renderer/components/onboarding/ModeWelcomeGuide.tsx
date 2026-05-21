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
import { useI18n } from '../../contexts/I18nContext';
import { Button } from '../ui/Button';
import { ModalLayout } from '../ui/ModalLayout';

export type ModeGuideMode = 'practice' | 'test' | 'survival' | 'flawless' | 'lessons' | 'game';

type ModeGuideStep = {
  bodyKey: string;
  checklistKeys: string[];
  kind?: 'interactive';
  titleKey: string;
};

type ModeGuideConfig = {
  descriptionKey: string;
  finishLabelKey: string;
  icon: LucideIcon;
  interactivePromptKey: string;
  interactiveTargetKeys: string[];
  kickerKey: string;
  steps: ModeGuideStep[];
  titleKey: string;
};

const MODE_GUIDE_CONFIGS: Record<ModeGuideMode, ModeGuideConfig> = {
  practice: {
    descriptionKey: 'onboarding.modeGuide.practice.description',
    finishLabelKey: 'onboarding.modeGuide.practice.finish',
    icon: Target,
    interactivePromptKey: 'onboarding.modeGuide.practice.interactivePrompt',
    interactiveTargetKeys: [
      'onboarding.modeGuide.practice.targets.focus',
      'onboarding.modeGuide.practice.targets.tempo',
      'onboarding.modeGuide.practice.targets.accuracy',
    ],
    kickerKey: 'onboarding.modeGuide.practice.kicker',
    titleKey: 'onboarding.modeGuide.practice.title',
    steps: [
      {
        titleKey: 'onboarding.modeGuide.practice.steps.training.title',
        bodyKey: 'onboarding.modeGuide.practice.steps.training.body',
        checklistKeys: [
          'onboarding.modeGuide.practice.steps.training.checklist.weakLetters',
          'onboarding.modeGuide.practice.steps.training.checklist.adaptiveWords',
          'onboarding.modeGuide.practice.steps.training.checklist.rhythm',
        ],
      },
      {
        titleKey: 'onboarding.modeGuide.practice.steps.start.title',
        bodyKey: 'onboarding.modeGuide.practice.steps.start.body',
        checklistKeys: [
          'onboarding.modeGuide.practice.steps.start.checklist.material',
          'onboarding.modeGuide.practice.steps.start.checklist.speedGoal',
          'onboarding.modeGuide.practice.steps.start.checklist.trainingMode',
        ],
      },
      {
        kind: 'interactive',
        titleKey: 'onboarding.modeGuide.common.miniTrial.title',
        bodyKey: 'onboarding.modeGuide.practice.steps.trial.body',
        checklistKeys: ['onboarding.modeGuide.common.miniTrial.checklist'],
      },
    ],
  },
  test: {
    descriptionKey: 'onboarding.modeGuide.test.description',
    finishLabelKey: 'onboarding.modeGuide.test.finish',
    icon: Timer,
    interactivePromptKey: 'onboarding.modeGuide.test.interactivePrompt',
    interactiveTargetKeys: [
      'onboarding.modeGuide.test.targets.timer',
      'onboarding.modeGuide.test.targets.steadyTempo',
      'onboarding.modeGuide.common.targets.finish',
    ],
    kickerKey: 'onboarding.modeGuide.test.kicker',
    titleKey: 'onboarding.modeGuide.test.title',
    steps: [
      {
        titleKey: 'onboarding.modeGuide.test.steps.idea.title',
        bodyKey: 'onboarding.modeGuide.test.steps.idea.body',
        checklistKeys: [
          'onboarding.modeGuide.test.steps.idea.checklist.duration',
          'onboarding.modeGuide.test.steps.idea.checklist.liveMetrics',
          'onboarding.modeGuide.test.steps.idea.checklist.bestHistory',
        ],
      },
      {
        titleKey: 'onboarding.modeGuide.test.steps.focus.title',
        bodyKey: 'onboarding.modeGuide.test.steps.focus.body',
        checklistKeys: [
          'onboarding.modeGuide.test.steps.focus.checklist.timer',
          'onboarding.modeGuide.test.steps.focus.checklist.errors',
          'onboarding.modeGuide.test.steps.focus.checklist.series',
        ],
      },
      {
        kind: 'interactive',
        titleKey: 'onboarding.modeGuide.common.miniTrial.title',
        bodyKey: 'onboarding.modeGuide.test.steps.trial.body',
        checklistKeys: ['onboarding.modeGuide.common.miniTrial.checklist'],
      },
    ],
  },
  survival: {
    descriptionKey: 'onboarding.modeGuide.survival.description',
    finishLabelKey: 'onboarding.modeGuide.survival.finish',
    icon: ShieldCheck,
    interactivePromptKey: 'onboarding.modeGuide.survival.interactivePrompt',
    interactiveTargetKeys: [
      'onboarding.modeGuide.survival.targets.reserve',
      'onboarding.modeGuide.survival.targets.control',
      'onboarding.modeGuide.common.targets.finish',
    ],
    kickerKey: 'onboarding.modeGuide.survival.kicker',
    titleKey: 'onboarding.modeGuide.survival.title',
    steps: [
      {
        titleKey: 'onboarding.modeGuide.survival.steps.goal.title',
        bodyKey: 'onboarding.modeGuide.survival.steps.goal.body',
        checklistKeys: [
          'onboarding.modeGuide.survival.steps.goal.checklist.errorLimit',
          'onboarding.modeGuide.survival.steps.goal.checklist.longDistance',
          'onboarding.modeGuide.survival.steps.goal.checklist.stability',
        ],
      },
      {
        titleKey: 'onboarding.modeGuide.survival.steps.play.title',
        bodyKey: 'onboarding.modeGuide.survival.steps.play.body',
        checklistKeys: [
          'onboarding.modeGuide.survival.steps.play.checklist.attempts',
          'onboarding.modeGuide.survival.steps.play.checklist.progress',
          'onboarding.modeGuide.survival.steps.play.checklist.cycles',
        ],
      },
      {
        kind: 'interactive',
        titleKey: 'onboarding.modeGuide.common.miniTrial.title',
        bodyKey: 'onboarding.modeGuide.survival.steps.trial.body',
        checklistKeys: ['onboarding.modeGuide.common.miniTrial.checklist'],
      },
    ],
  },
  flawless: {
    descriptionKey: 'onboarding.modeGuide.flawless.description',
    finishLabelKey: 'onboarding.modeGuide.flawless.finish',
    icon: Sparkles,
    interactivePromptKey: 'onboarding.modeGuide.flawless.interactivePrompt',
    interactiveTargetKeys: [
      'onboarding.modeGuide.flawless.targets.lookAhead',
      'onboarding.modeGuide.flawless.targets.pause',
      'onboarding.modeGuide.flawless.targets.input',
    ],
    kickerKey: 'onboarding.modeGuide.flawless.kicker',
    titleKey: 'onboarding.modeGuide.flawless.title',
    steps: [
      {
        titleKey: 'onboarding.modeGuide.flawless.steps.difference.title',
        bodyKey: 'onboarding.modeGuide.flawless.steps.difference.body',
        checklistKeys: [
          'onboarding.modeGuide.flawless.steps.difference.checklist.zeroTolerance',
          'onboarding.modeGuide.flawless.steps.difference.checklist.shortFocus',
          'onboarding.modeGuide.flawless.steps.difference.checklist.slowStart',
        ],
      },
      {
        titleKey: 'onboarding.modeGuide.flawless.steps.strategy.title',
        bodyKey: 'onboarding.modeGuide.flawless.steps.strategy.body',
        checklistKeys: [
          'onboarding.modeGuide.flawless.steps.strategy.checklist.startSlowly',
          'onboarding.modeGuide.flawless.steps.strategy.checklist.lookAhead',
          'onboarding.modeGuide.flawless.steps.strategy.checklist.stopAfterMistake',
        ],
      },
      {
        kind: 'interactive',
        titleKey: 'onboarding.modeGuide.common.miniTrial.title',
        bodyKey: 'onboarding.modeGuide.flawless.steps.trial.body',
        checklistKeys: ['onboarding.modeGuide.common.miniTrial.checklist'],
      },
    ],
  },
  lessons: {
    descriptionKey: 'onboarding.modeGuide.lessons.description',
    finishLabelKey: 'onboarding.modeGuide.lessons.finish',
    icon: BookOpen,
    interactivePromptKey: 'onboarding.modeGuide.lessons.interactivePrompt',
    interactiveTargetKeys: [
      'onboarding.modeGuide.lessons.targets.row',
      'onboarding.modeGuide.lessons.targets.symbol',
      'onboarding.modeGuide.lessons.targets.reinforcement',
    ],
    kickerKey: 'onboarding.modeGuide.lessons.kicker',
    titleKey: 'onboarding.modeGuide.lessons.title',
    steps: [
      {
        titleKey: 'onboarding.modeGuide.lessons.steps.purpose.title',
        bodyKey: 'onboarding.modeGuide.lessons.steps.purpose.body',
        checklistKeys: [
          'onboarding.modeGuide.lessons.steps.purpose.checklist.rows',
          'onboarding.modeGuide.lessons.steps.purpose.checklist.newSymbols',
          'onboarding.modeGuide.lessons.steps.purpose.checklist.orderedExercises',
        ],
      },
      {
        titleKey: 'onboarding.modeGuide.lessons.steps.flow.title',
        bodyKey: 'onboarding.modeGuide.lessons.steps.flow.body',
        checklistKeys: [
          'onboarding.modeGuide.lessons.steps.flow.checklist.availableLesson',
          'onboarding.modeGuide.lessons.steps.flow.checklist.repeatSymbols',
          'onboarding.modeGuide.lessons.steps.flow.checklist.accuracy',
        ],
      },
      {
        kind: 'interactive',
        titleKey: 'onboarding.modeGuide.common.miniTrial.title',
        bodyKey: 'onboarding.modeGuide.lessons.steps.trial.body',
        checklistKeys: ['onboarding.modeGuide.common.miniTrial.checklist'],
      },
    ],
  },
  game: {
    descriptionKey: 'onboarding.modeGuide.game.description',
    finishLabelKey: 'onboarding.modeGuide.game.finish',
    icon: Gamepad2,
    interactivePromptKey: 'onboarding.modeGuide.game.interactivePrompt',
    interactiveTargetKeys: [
      'onboarding.modeGuide.game.targets.map',
      'onboarding.modeGuide.game.targets.battle',
      'onboarding.modeGuide.game.targets.reward',
    ],
    kickerKey: 'onboarding.modeGuide.game.kicker',
    titleKey: 'onboarding.modeGuide.game.title',
    steps: [
      {
        titleKey: 'onboarding.modeGuide.game.steps.flow.title',
        bodyKey: 'onboarding.modeGuide.game.steps.flow.body',
        checklistKeys: [
          'onboarding.modeGuide.game.steps.flow.checklist.runMap',
          'onboarding.modeGuide.game.steps.flow.checklist.levelsAndBosses',
          'onboarding.modeGuide.game.steps.flow.checklist.inventoryRewards',
        ],
      },
      {
        titleKey: 'onboarding.modeGuide.game.steps.orientation.title',
        bodyKey: 'onboarding.modeGuide.game.steps.orientation.body',
        checklistKeys: [
          'onboarding.modeGuide.game.steps.orientation.checklist.speedGoal',
          'onboarding.modeGuide.game.steps.orientation.checklist.health',
          'onboarding.modeGuide.game.steps.orientation.checklist.rewards',
        ],
      },
      {
        kind: 'interactive',
        titleKey: 'onboarding.modeGuide.common.miniTrial.title',
        bodyKey: 'onboarding.modeGuide.game.steps.trial.body',
        checklistKeys: ['onboarding.modeGuide.common.miniTrial.checklist'],
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
  const { t } = useI18n();
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
  const interactionDone = !isInteractiveStep || hitIndex >= config.interactiveTargetKeys.length;
  const isLastStep = stepIndex >= config.steps.length - 1;
  const progressPercent = Math.round(((stepIndex + 1) / config.steps.length) * 100);

  const interactiveTargets = config.interactiveTargetKeys.map(targetKey => t(targetKey));

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
      description={t(config.descriptionKey)}
      footer={(
        <div className="mode-guide-actions">
          <Button variant="ghost" onClick={onSkip}>{t('onboarding.modeGuide.skip')}</Button>
          <Button
            variant="accent"
            disabled={!interactionDone}
            onClick={handleNext}
          >
            {isLastStep ? t(config.finishLabelKey) : t('common.actions.next')}
          </Button>
        </div>
      )}
      onClose={onSkip}
      size="lg"
      title={(
        <span className="mode-guide-title">
          <span className="mode-guide-title-icon"><Icon size={20} /></span>
          {t(config.titleKey)}
        </span>
      )}
    >
      <div className="mode-guide">
        <div className="mode-guide-progress" aria-hidden="true">
          <span style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="mode-guide-kicker">{t(config.kickerKey)}</div>
        <h3>{t(step.titleKey)}</h3>
        <p>{t(step.bodyKey)}</p>

        <div className="mode-guide-checklist">
          {step.checklistKeys.map(itemKey => (
            <div key={itemKey} className="mode-guide-checkitem">
              <CheckCircle2 size={16} />
              <span>{t(itemKey)}</span>
            </div>
          ))}
        </div>

        {isInteractiveStep ? (
          <div className="mode-guide-interaction">
            <div>
              <strong>{t('onboarding.modeGuide.interactiveStep')}</strong>
              <p>{t(config.interactivePromptKey)}</p>
            </div>
            <div className="mode-guide-targets">
              {interactiveTargets.map((target, index) => {
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
                    onClick={() => setHitIndex(current => Math.min(current + 1, config.interactiveTargetKeys.length))}
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
          {t('onboarding.modeGuide.stepProgress', { current: stepIndex + 1, total: config.steps.length })}
        </div>
      </div>
    </ModalLayout>
  );
}
