import type { ReactNode } from 'react';

type InlineStatsBarItem = {
  className?: string;
  content: ReactNode;
  id: string;
};

type InlineStatsBarProps = {
  className?: string;
  items: InlineStatsBarItem[];
};

export function InlineStatsBar({ className, items }: InlineStatsBarProps) {
  const rootClassName = ['stats-bar', className].filter(Boolean).join(' ');

  return (
    <div className={rootClassName}>
      {items.map((item) => (
        <div key={item.id} className={['metric', item.className].filter(Boolean).join(' ')}>
          {item.content}
        </div>
      ))}
    </div>
  );
}
