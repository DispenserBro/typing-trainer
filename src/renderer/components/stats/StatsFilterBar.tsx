import type {
  StatsFilterBarGroupId,
  StatsFilterBarGroupViewModel,
} from '../../../core/stats/viewModel';
import { SegmentedControl } from '../ui/SegmentedControl';

type StatsFilterBarProps = {
  filters: StatsFilterBarGroupViewModel[];
  onOptionSelect: (groupId: StatsFilterBarGroupId, value: string) => void;
};

export function StatsFilterBar({
  filters,
  onOptionSelect,
}: StatsFilterBarProps) {
  return (
    <div className="card-like stats-filter-card mt-16">
      <div className="stats-filters-grid">
        {filters.map(group => {
          const activeOption = group.options.find(option => option.active) ?? group.options[0];

          return (
            <label className="field" key={group.id}>
              <span>{group.label}</span>
              <SegmentedControl
                ariaLabel={group.label}
                value={activeOption?.value ?? ''}
                onChange={value => onOptionSelect(group.id, value)}
                options={group.options}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

