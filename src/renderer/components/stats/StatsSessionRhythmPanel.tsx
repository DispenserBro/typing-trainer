import type { ScopedRhythmSession } from '../../../core/stats/utils';
import { RhythmChart } from './StatsCharts';

type StatsSessionRhythmPanelProps = {
  displayedRhythmSession: ScopedRhythmSession | null;
  rhythmLabels: number[];
  rhythmData: number[];
  rhythmAverageLine: number[];
  rhythmWorstPoint: number;
  rhythmStableRun: number;
};

export function StatsSessionRhythmPanel({
  displayedRhythmSession,
  rhythmLabels,
  rhythmData,
  rhythmAverageLine,
  rhythmWorstPoint,
  rhythmStableRun,
}: StatsSessionRhythmPanelProps) {
  return (
    <div>
      <div className="stats-rhythm-head">
        <div>
          <h4>Ритм сессии</h4>
          <p className="card-desc">
            График обновляется по выбранной записи из истории сессий.
          </p>
        </div>
      </div>

      {!displayedRhythmSession ? (
        <p style={{ opacity: 0.5 }}>
          Для выбранной сессии нет детальных данных ритма. Выбери практику с сохраненной аналитикой.
        </p>
      ) : (
        <div className="stats-rhythm-grid">
          <RhythmChart
            labels={rhythmLabels}
            data={rhythmData}
            averageLine={rhythmAverageLine}
            emptyText="Для выбранной сессии нет детальных данных ритма."
          />
          <div className="stats-rhythm-summary">
            <div className="stats-rhythm-metric">
              <span>Оценка ритма</span>
              <b>{Math.round(displayedRhythmSession.session.rhythmScore)}%</b>
            </div>
            <div className="stats-rhythm-metric">
              <span>Средний интервал</span>
              <b>{Math.round(displayedRhythmSession.session.averageInterval)}мс</b>
            </div>
            <div className="stats-rhythm-metric">
              <span>Среднее отклонение</span>
              <b>{Math.round(displayedRhythmSession.session.averageDeviation)}мс</b>
            </div>
            <div className="stats-rhythm-metric">
              <span>Худший провал</span>
              <b>{Math.round(rhythmWorstPoint)}мс</b>
            </div>
            <div className="stats-rhythm-metric">
              <span>Лучший ровный отрезок</span>
              <b>{rhythmStableRun} символов</b>
            </div>
            <div className="stats-rhythm-metric">
              <span>Сессия</span>
              <b>
                {displayedRhythmSession.session.textLength} знаков · {Math.round(displayedRhythmSession.session.acc)}%
              </b>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

