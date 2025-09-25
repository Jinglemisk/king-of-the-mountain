import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';

export type CardTone = 'default' | 'accent' | 'danger';

export type CardProps = {
  tone?: CardTone;
  interactive?: boolean;
  selected?: boolean;
  disabled?: boolean;
} & HTMLAttributes<HTMLDivElement>;

const toneStyles: Record<CardTone, string> = {
  default: 'bg-surface-card text-text-primary',
  accent: 'bg-gradient-to-br from-brand-500/20 via-brand-500/10 to-surface-card border-brand-500/30 text-text-primary',
  danger: 'bg-danger-500/10 border-danger-500/40 text-danger-600 dark:text-danger-200',
};

const baseStyles = 'rounded-3xl border border-[rgba(148,163,184,0.28)] dark:border-[rgba(148,163,184,0.16)] shadow-[var(--kotm-shadow-card)] transition-all duration-150';

const interactiveStyles = 'hover:-translate-y-0.5 hover:shadow-[var(--kotm-shadow-pop)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400';

const disabledStyles = 'cursor-not-allowed opacity-60';

// Card is the go-to container for anything that needs elevation and interactivity (seats, class tiles, etc.).
export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { tone = 'default', interactive = false, selected = false, disabled = false, className, children, ...rest },
    ref
  ) => {
    const classes = [
      baseStyles,
      toneStyles[tone],
      interactive ? interactiveStyles : null,
      selected ? 'ring-2 ring-brand-400 ring-offset-2 ring-offset-surface-base' : null,
      disabled ? disabledStyles : interactive ? 'cursor-pointer' : 'cursor-default',
      'p-lg',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={classes} aria-disabled={disabled} {...rest}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
