import type { StatsRhythmPanelViewModel } from '../../../core/stats/viewModel';
import { EmptyStateNotice } from '../ui/EmptyStateNotice';
import { SectionHeader } from '../ui/SectionHeader';
import { RhythmChart } from './StatsCharts';

type StatsSessionRhythmPanelProps = {
  rhythmPanel: StatsRhythmPanelViewModel;
};

export function StatsSessionRhythmPanel({
  rhythmPanel,
}: StatsSessionRhythmPanelProps) {
  return (
    <div>
      <div className="stats-rhythm-head">
        <SectionHeader titleTag="h4" title={rhythmPanel.title} description={rhythmPanel.description} />
      </div>

      {!rhythmPanel.displayedRhythmSession ? (
        <EmptyStateNotice text={rhythmPanel.emptyLabel} />
      ) : (
        <div className="stats-rhythm-grid">
          <RhythmChart
            labels={rhythmPanel.labels}
            data={rhythmPanel.data}
            averageLine={rhythmPanel.averageLine}
            averageLineLabel={rhythmPanel.averageLineLabel}
            emptyText={rhythmPanel.emptyLabel}
            intervalLabel={rhythmPanel.intervalLabel}
            unavailableText={rhythmPanel.unavailableLabel}
          />
          <div className="stats-rhythm-summary">
            {rhythmPanel.summaryItems.map(item => (
              <div className="stats-rhythm-metric" key={item.id}>
                <span>{item.label}</span>
                <b>{item.value}</b>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

