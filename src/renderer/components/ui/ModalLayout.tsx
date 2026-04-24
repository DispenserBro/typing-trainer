import type { ReactNode } from 'react';
import { SectionHeader } from './SectionHeader';

type ModalLayoutProps = {
  bodyClassName?: string;
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  footer?: ReactNode;
  headerWrapperClassName?: string;
  onClose: () => void;
  scrollBody?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'wide' | 'full';
  title: ReactNode;
};

export function ModalLayout({
  bodyClassName,
  children,
  className,
  description,
  footer,
  headerWrapperClassName,
  onClose,
  scrollBody = false,
  size = 'md',
  title,
}: ModalLayoutProps) {
  const modalClassName = ['modal', `modal-size-${size}`, className].filter(Boolean).join(' ');
  const bodyRootClassName = ['modal-body', scrollBody ? 'modal-scroll-body' : '', bodyClassName]
    .filter(Boolean)
    .join(' ');
  const header = <SectionHeader title={title} description={description} />;

  return (
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={modalClassName} onClick={event => event.stopPropagation()}>
        {headerWrapperClassName ? <div className={headerWrapperClassName}>{header}</div> : header}
        {(bodyClassName || scrollBody) ? <div className={bodyRootClassName}>{children}</div> : children}
        {footer}
      </div>
    </div>
  );
}
