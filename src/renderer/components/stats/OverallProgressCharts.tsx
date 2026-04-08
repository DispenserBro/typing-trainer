import { speedLabel } from '../../../core/engine';
import { ProgressChart } from './ProgressChart';
import { getChartThemeColors } from './chartTheme';

type OverallProgressChartsProps = {
  chartTimestamps: string[];
  speedData: number[];
  accData: number[];
  unit: 'wpm' | 'cpm' | 'cps';
};

export function OverallProgressCharts({
  chartTimestamps,
  speedData,
  accData,
  unit,
}: OverallProgressChartsProps) {
  const { accent, green } = getChartThemeColors();

  return (
    <div className="stats-grid">
      <ProgressChart
        title="Прогресс скорости"
        values={speedData}
        timestamps={chartTimestamps}
        color={accent}
        valueLabel={speedLabel(unit)}
        minValue={0}
      />
      <ProgressChart
        title="Прогресс точности"
        values={accData}
        timestamps={chartTimestamps}
        color={green}
        valueLabel="Accuracy %"
        minValue={50}
        maxValue={100}
      />
    </div>
  );
}

