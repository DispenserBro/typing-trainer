import type { PracticeFeedback } from '../../../core/practice/feedback';
import { LayoutMasteryPanel } from '../LayoutMasteryPanel';
import { ResultSummaryPanel } from '../ResultSummaryPanel';
import { Button } from '../ui/Button';
import { PracticeFeedbackCard } from './PracticeFeedbackCard';

type PracticeResultFlowProps = {
  formatSpeed: (value: number) => string;
  practiceResultViewModel: {
    activePracticeGoals: Array<{
      current: number;
      definition: { id: string; title: string };
      nextTarget?: number | null;
    }>;
    masterySummary: any;
    primaryMetrics: Array<{
      id: string;
      value: string | number;
      label: string;
      tone?: 'good' | 'warn' | 'bad' | 'neutral';
    }>;
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
  translate: (key: string) => string;
};

export function PracticeResultFlow({
  formatSpeed,
  practiceResultViewModel,
  result,
  retryAndStart,
  speedLabel,
  translate,
}: PracticeResultFlowProps) {
  if (!result) return null;

  return (
    <>
      <ResultSummaryPanel
        title={translate('practice.resultTitle')}
        headline={<>{formatSpeed(result.wpm)} <small className="speed-unit">{speedLabel}</small></>}
        metrics={practiceResultViewModel.primaryMetrics}
        goals={practiceResultViewModel.activePracticeGoals}
        streaks={practiceResultViewModel.practiceStreaks}
        comparison={practiceResultViewModel.practiceResultComparison}
        formatSpeed={formatSpeed}
        speedLabel={speedLabel}
      >
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
      </ResultSummaryPanel>

      <PracticeFeedbackCard feedback={result.feedback} />
    </>
  );
}
