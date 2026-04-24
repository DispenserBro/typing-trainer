import type { ReactNode } from 'react';

type EmptyStateNoticeProps = {
  text: ReactNode;
  className?: string;
};

export function EmptyStateNotice({ className, text }: EmptyStateNoticeProps) {
  return (
    <p className={['ui-empty-state', className].filter(Boolean).join(' ')}>
      {text}
    </p>
  );
}
