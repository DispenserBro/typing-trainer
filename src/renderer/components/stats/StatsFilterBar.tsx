import {
  LAYOUT_SCOPE_OPTIONS,
  MODE_OPTIONS,
  PERIOD_OPTIONS,
  type StatsLayoutScope,
  type StatsModeFilter,
  type StatsPeriod,
} from '../../../core/stats/utils';

type StatsFilterBarProps = {
  statsPeriod: StatsPeriod;
  setStatsPeriod: (value: StatsPeriod) => void;
  statsMode: StatsModeFilter;
  setStatsMode: (value: StatsModeFilter) => void;
  layoutScope: StatsLayoutScope;
  setLayoutScope: (value: StatsLayoutScope) => void;
};

export function StatsFilterBar({
  statsPeriod,
  setStatsPeriod,
  statsMode,
  setStatsMode,
  layoutScope,
  setLayoutScope,
}: StatsFilterBarProps) {
  return (
    <div className="card-like stats-filter-card mt-16">
      <div className="stats-filters-grid">
        <label className="field">
          <span>Период</span>
          <div className="seg-group">
            {PERIOD_OPTIONS.map(option => (
              <button
                key={option.value}
                className={`seg-btn${statsPeriod === option.value ? ' active' : ''}`}
                onClick={() => setStatsPeriod(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </label>

        <label className="field">
          <span>Режим</span>
          <div className="seg-group">
            {MODE_OPTIONS.map(option => (
              <button
                key={option.value}
                className={`seg-btn${statsMode === option.value ? ' active' : ''}`}
                onClick={() => setStatsMode(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </label>

        <label className="field">
          <span>Срез</span>
          <div className="seg-group">
            {LAYOUT_SCOPE_OPTIONS.map(option => (
              <button
                key={option.value}
                className={`seg-btn${layoutScope === option.value ? ' active' : ''}`}
                onClick={() => setLayoutScope(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </label>
      </div>
    </div>
  );
}

