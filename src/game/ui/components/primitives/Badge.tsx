import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

export type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand';

export type BadgeProps = {
  variant?: BadgeVariant;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  tone?: 'solid' | 'soft';
} & HTMLAttributes<HTMLSpanElement>;

const solidStyles: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-raised text-text-secondary',
  info: 'bg-info-600 text-text-inverted',
  success: 'bg-success-600 text-text-inverted',
  warning: 'bg-warning-500 text-text-inverted',
  danger: 'bg-danger-600 text-text-inverted',
  brand: 'bg-brand-600 text-text-inverted',
};

const softStyles: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-raised/60 text-text-muted',
  info: 'bg-info-100 text-info-600',
  success: 'bg-success-100 text-success-600',
  warning: 'bg-warning-100 text-warning-600',
  danger: 'bg-danger-100 text-danger-600',
  brand: 'bg-brand-500/15 text-brand-600',
};

// Configurable badge for statuses and counts; keeps visual language consistent.
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { variant = 'neutral', tone = 'soft', leadingIcon, trailingIcon, className, children, ...rest },
    ref
  ) => {
    const palette = tone === 'solid' ? solidStyles : softStyles;
    const classes = [
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-sm font-semibold uppercase tracking-wider',
      palette[variant],
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <span ref={ref} className={classes} {...rest}>
        {leadingIcon ? <span aria-hidden className="inline-flex items-center text-current">{leadingIcon}</span> : null}
        {children}
        {trailingIcon ? <span aria-hidden className="inline-flex items-center text-current">{trailingIcon}</span> : null}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
