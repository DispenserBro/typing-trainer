import { OverallProgressCharts } from './StatsCharts';
import type { StatsOverallProgressViewModel } from '../../../core/stats/viewModel';
import { ExpandableSectionCard } from '../ui/ExpandableSectionCard';

type StatsOverallProgressSectionProps = {
  expanded: boolean;
  progress: StatsOverallProgressViewModel;
  onToggle: () => void;
};

export function StatsOverallProgressSection({
  expanded,
  onToggle,
  progress,
}: StatsOverallProgressSectionProps) {
  return (
    <ExpandableSectionCard
      title={progress.title}
      description={progress.description}
      expanded={expanded}
      onToggle={onToggle}
    >
        <OverallProgressCharts
          chartTimestamps={progress.chartTimestamps}
          chartEmptyLabel={progress.chartEmptyLabel}
          speedData={progress.speedData}
          speedTitle={progress.speedTitle}
          accData={progress.accData}
          accuracyTitle={progress.accuracyTitle}
          accuracyValueLabel={progress.accuracyValueLabel}
          speedValueLabel={progress.speedValueLabel}
        />
    </ExpandableSectionCard>
  );
}
