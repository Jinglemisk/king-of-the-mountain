import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';

export type PanelTone = 'default' | 'raised' | 'sunken' | 'muted';
export type PanelPadding = 'none' | 'sm' | 'md' | 'lg';

export type PanelProps = {
  tone?: PanelTone;
  padding?: PanelPadding;
  withBorder?: boolean;
} & HTMLAttributes<HTMLDivElement>;

const toneStyles: Record<PanelTone, string> = {
  default: 'bg-surface-card text-text-primary',
  raised: 'bg-surface-raised text-text-primary shadow-[var(--kotm-shadow-card)]',
  sunken: 'bg-surface-base text-text-primary shadow-inner',
  muted: 'bg-surface-subtle text-text-secondary',
};

const paddingStyles: Record<PanelPadding, string> = {
  none: 'p-0',
  sm: 'p-sm',
  md: 'p-md',
  lg: 'p-lg',
};

const borderStyles = 'border border-[rgba(148,163,184,0.35)] dark:border-[rgba(148,163,184,0.18)]';

// Panel centralizes the base chrome for stacked surfaces so higher-level layouts stay consistent.
export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  (
    {
      tone = 'default',
      padding = 'md',
      withBorder = true,
      className,
      children,
      ...rest
    },
    ref
  ) => {
    const classes = [
      'rounded-2xl transition-colors duration-150',
      toneStyles[tone],
      paddingStyles[padding],
      withBorder ? borderStyles : null,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={classes} {...rest}>
        {children}
      </div>
    );
  }
);

Panel.displayName = 'Panel';
