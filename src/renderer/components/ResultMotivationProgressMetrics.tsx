import { ResultProgressMetrics } from './ResultProgressMetrics';

export type ResultMotivationGoalMetric = {
  current: number;
  definition: { id: string; title: string };
  nextTarget?: number | null;
};

export type ResultMotivationStreakMetric = {
  current: number;
  definition: { id: string; title: string };
};

type ResultMotivationProgressMetricsProps = {
  goals: ResultMotivationGoalMetric[];
  streaks: ResultMotivationStreakMetric[];
};

export function hasResultMotivationProgressMetrics(
  goals: ResultMotivationGoalMetric[],
  streaks: ResultMotivationStreakMetric[],
) {
  return goals.length > 0 || streaks.length > 0;
}

export function ResultMotivationProgressMetrics({
  goals,
  streaks,
}: ResultMotivationProgressMetricsProps) {
  if (!hasResultMotivationProgressMetrics(goals, streaks)) return null;

  return (
    <ResultProgressMetrics
      metrics={[
        ...goals.map((goal) => ({
          id: goal.definition.id,
          title: goal.definition.title,
          value: goal.nextTarget != null
            ? `${Math.round(goal.current)} / ${goal.nextTarget}`
            : `${Math.round(goal.current)}`,
        })),
        ...streaks.map((streak) => ({
          id: streak.definition.id,
          title: streak.definition.title,
          value: streak.current,
          tone: streak.current > 0 ? 'good' as const : 'neutral' as const,
        })),
      ]}
    />
  );
}
