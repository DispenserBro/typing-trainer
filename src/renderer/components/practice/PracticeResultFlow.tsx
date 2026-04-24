import type { PracticeFeedback } from '../../../core/practice/feedback';
import { LayoutMasteryPanel } from '../LayoutMasteryPanel';
import { ResultComparisonPanel } from '../ResultComparisonPanel';
import { ResultMetricStrip } from '../ResultMetricStrip';
import { ResultProgressMetrics } from '../ResultProgressMetrics';
import { Button } from '../ui/Button';
import { ResultCardLayout } from '../ui/ResultCardLayout';
import { PracticeFeedbackCard } from './PracticeFeedbackCard';

type PracticeResultFlowProps = {
  formatSpeed: (value: number) => string;
  layoutProgressUnlocked: number;
  practicesPerUnlock: number;
  practiceResultViewModel: {
    activePracticeGoals: Array<{
      current: number;
      definition: { id: string; title: string };
      nextTarget?: number | null;
    }>;
    masterySummary: any;
    practiceResultComparison: any;
    practiceStreaks: Array<{
      current: number;
      definition: { id: string; title: string };
    }>;
  };
  result: {
    acc: number;
    feedback: PracticeFeedback;
    newLetter: boolean;
    rhythmDeviation: number;
    rhythmScore: number;
    unlockProgress: number;
    worstChar: string | null;
    wpm: number;
  } | null;
  retryAndStart: () => void;
  speedLabel: string;
  trainingMode: 'normal' | 'rhythm';
  translate: (key: string) => string;
};

export function PracticeResultFlow({
  formatSpeed,
  layoutProgressUnlocked,
  practicesPerUnlock,
  practiceResultViewModel,
  result,
  retryAndStart,
  speedLabel,
  trainingMode,
  translate,
}: PracticeResultFlowProps) {
  if (!result) return null;

  return (
    <>
      <ResultCardLayout
        title={translate('practice.resultTitle')}
        headline={<>{formatSpeed(result.wpm)} <small className="speed-unit">{speedLabel}</small></>}
      >
        <ResultMetricStrip
          metrics={[
            {
              id: 'accuracy',
              label: translate('common.accuracy'),
              value: `${Math.round(result.acc)}%`,
              tone: result.acc >= 98 ? 'good' : result.acc >= 90 ? 'warn' : 'bad',
            },
            ...(trainingMode === 'rhythm'
              ? [
                  {
                    id: 'rhythm',
                    label: translate('practice.rhythm'),
                    value: `${Math.round(result.rhythmScore)}%`,
                    tone: result.rhythmScore >= 80 ? 'good' as const : result.rhythmScore >= 50 ? 'warn' as const : 'bad' as const,
                  },
                  {
                    id: 'rhythm-deviation',
                    label: translate('practice.rhythmDeviation'),
                    value: `${result.rhythmDeviation} ${translate('practice.msShort')}`,
                  },
                ]
              : []),
            {
              id: 'worst-char',
              label: translate('practice.problemChar'),
              value: result.worstChar?.toUpperCase() ?? '—',
              tone: result.worstChar ? 'warn' : 'neutral',
            },
            {
              id: 'letters',
              label: translate('practice.letters'),
              value: layoutProgressUnlocked,
            },
            result.newLetter
              ? {
                  id: 'new-letter',
                  label: translate('practice.newLetter'),
                  value: '+1',
                  tone: 'good' as const,
                }
              : {
                  id: 'until-new',
                  label: translate('practice.untilNew'),
                  value: `${result.unlockProgress}/${practicesPerUnlock}`,
                },
          ]}
        />
        <ResultProgressMetrics
          metrics={[
            ...practiceResultViewModel.activePracticeGoals.map((goal) => ({
              id: goal.definition.id,
              title: goal.definition.title,
              value: goal.nextTarget != null
                ? `${Math.round(goal.current)} / ${goal.nextTarget}`
                : `${Math.round(goal.current)}`,
            })),
            ...practiceResultViewModel.practiceStreaks.map((streak) => ({
              id: streak.definition.id,
              title: streak.definition.title,
              value: streak.current,
              tone: streak.current > 0 ? 'good' as const : 'neutral' as const,
            })),
          ]}
        />
        {practiceResultViewModel.practiceResultComparison && (
          <ResultComparisonPanel
            comparison={practiceResultViewModel.practiceResultComparison}
            formatSpeed={formatSpeed}
            speedLabel={speedLabel}
          />
        )}
        {practiceResultViewModel.masterySummary && (
          <div className="result-mastery-block">
            <LayoutMasteryPanel
              snapshot={practiceResultViewModel.masterySummary.current}
              summary={practiceResultViewModel.masterySummary}
              formatSpeed={formatSpeed}
              speedLabel={speedLabel}
            />
          </div>
        )}
        <p className="practice-result-next-hint">{translate('practice.pressAnyKey')}</p>
        <Button variant="accent" onClick={retryAndStart}>{translate('practice.continue')}</Button>
      </ResultCardLayout>

      <PracticeFeedbackCard feedback={result.feedback} />
    </>
  );
}
