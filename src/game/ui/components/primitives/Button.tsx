import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

// Variant map keeps hover/active/disabled states consistent across the app shell.
const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-text-inverted shadow-[var(--kotm-shadow-pop)]',
  secondary:
    'bg-surface-raised hover:bg-surface-card active:bg-surface-raised/80 border border-[rgba(148,163,184,0.35)] text-text-primary',
  ghost: 'bg-transparent hover:bg-brand-500/10 active:bg-brand-500/20 text-brand-400',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-label-sm gap-2',
  md: 'h-10 px-4 text-body-sm gap-2.5',
  lg: 'h-12 px-6 text-body-md gap-3',
};

const disabledStyles = 'disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      leftIcon,
      rightIcon,
      loading = false,
      className,
      type = 'button',
      children,
      disabled,
      ...rest
    },
    ref
  ) => {
    const effectiveDisabled = disabled || loading;
    const classes = [
      'inline-flex items-center justify-center rounded-full font-medium transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
      variantStyles[variant],
      sizeStyles[size],
      disabledStyles,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        disabled={effectiveDisabled}
        aria-busy={loading || undefined}
        {...rest}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
            <span className="sr-only">Loading</span>
            <span>{children}</span>
          </span>
        ) : (
          <>
            {leftIcon ? <span className="inline-flex items-center" aria-hidden>{leftIcon}</span> : null}
            <span>{children}</span>
            {rightIcon ? <span className="inline-flex items-center" aria-hidden>{rightIcon}</span> : null}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
