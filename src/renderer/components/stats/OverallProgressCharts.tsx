import { ProgressChart } from './ProgressChart';
import { getChartThemeColors } from './chartTheme';

type OverallProgressChartsProps = {
  accData: number[];
  accuracyTitle: string;
  accuracyValueLabel: string;
  chartEmptyLabel: string;
  chartTimestamps: string[];
  speedData: number[];
  speedTitle: string;
  speedValueLabel: string;
};

export function OverallProgressCharts({
  accData,
  accuracyTitle,
  accuracyValueLabel,
  chartEmptyLabel,
  chartTimestamps,
  speedData,
  speedTitle,
  speedValueLabel,
}: OverallProgressChartsProps) {
  const { accent, green } = getChartThemeColors();

  return (
    <div className="stats-grid">
      <ProgressChart
        title={speedTitle}
        values={speedData}
        timestamps={chartTimestamps}
        color={accent}
        emptyText={chartEmptyLabel}
        valueLabel={speedValueLabel}
        minValue={0}
      />
      <ProgressChart
        title={accuracyTitle}
        values={accData}
        timestamps={chartTimestamps}
        color={green}
        emptyText={chartEmptyLabel}
        valueLabel={accuracyValueLabel}
        minValue={50}
        maxValue={100}
      />
    </div>
  );
}

