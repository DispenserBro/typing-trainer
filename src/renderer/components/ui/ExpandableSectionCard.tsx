import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { SectionHeader } from './SectionHeader';

type ExpandableSectionCardProps = {
  title: string;
  description?: string;
  expanded: boolean;
  onToggle: () => void;
  children?: ReactNode;
};

export function ExpandableSectionCard({
  children,
  description,
  expanded,
  onToggle,
  title,
}: ExpandableSectionCardProps) {
  return (
    <div className="card stats-section-card mt-16">
      <button
        type="button"
        className={`stats-section-toggle${expanded ? ' expanded' : ''}`}
        onClick={onToggle}
      >
        <SectionHeader
          className={undefined}
          title={title}
          description={description}
          titleTag="h4"
        />
        {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>

      {expanded ? children : null}
    </div>
  );
}
