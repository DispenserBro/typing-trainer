import type { ReactNode } from 'react';

type ChipListProps = {
  chips: Array<{
    className?: string;
    content: ReactNode;
    id: string;
  }>;
  className?: string;
};

export function ChipList({ chips, className }: ChipListProps) {
  if (chips.length === 0) return null;

  return (
    <div className={className}>
      {chips.map((chip) => (
        <span key={chip.id} className={chip.className}>
          {chip.content}
        </span>
      ))}
    </div>
  );
}
