import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useId } from 'react';
import { Button } from './Button';

export type ModalFrameProps = {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showCloseButton?: boolean;
  className?: string;
  overlayClassName?: string;
  hideOverlay?: boolean;
};

const sizeMap: Record<NonNullable<ModalFrameProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
};

const baseFrame =
  'relative w-full rounded-3xl border border-[rgba(148,163,184,0.25)] bg-surface-card p-6 shadow-[var(--kotm-shadow-pop)]';
const headingStyles = 'flex items-start justify-between gap-4';
const titleStyles = 'text-title-md font-semibold text-text-primary';
const descriptionStyles = 'mt-1 text-body-sm text-text-muted';
const bodyStyles = 'mt-6 text-body-sm text-text-primary';
const footerStyles = 'mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end';
const overlayStyles = 'fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay backdrop-blur-xl';

// ModalFrame standardizes overlay, chrome, and spacing so ad-hoc dialogs feel coherent.
export function ModalFrame({
  title,
  description,
  children,
  footer,
  onClose,
  size = 'md',
  showCloseButton = true,
  className,
  overlayClassName,
  hideOverlay = false,
}: ModalFrameProps) {
  const instanceId = useId();
  const labelledId = title ? `${instanceId}-title` : undefined;
  const describedId = description ? `${instanceId}-description` : undefined;
  const frameClasses = [baseFrame, sizeMap[size], className].filter(Boolean).join(' ');

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledId}
      aria-describedby={describedId}
      className={frameClasses}
    >
      <div className={headingStyles}>
        <div>
          {title ? (
            <h2 id={labelledId} className={titleStyles}>
              {title}
            </h2>
          ) : null}
          {description ? (
            <p id={describedId} className={descriptionStyles}>
              {description}
            </p>
          ) : null}
        </div>

        {showCloseButton ? (
          <ModalDismissButton onClick={onClose} aria-label="Close dialog" />
        ) : null}
      </div>

      <div className={bodyStyles}>{children}</div>

      {footer ? <div className={footerStyles}>{footer}</div> : null}
    </div>
  );

  if (hideOverlay) {
    return modalContent;
  }

  return (
    <div className={[overlayStyles, overlayClassName].filter(Boolean).join(' ')}>{modalContent}</div>
  );
}

function ModalDismissButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button
      variant="ghost"
      size="sm"
      type="button"
      className="h-9 w-9 rounded-full p-0 text-text-muted hover:text-text-primary"
      {...props}
    >
      X
    </Button>
  );
}
