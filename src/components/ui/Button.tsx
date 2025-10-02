/**
 * Reusable Button component
 * Medieval-themed button with different variants
 */

import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit';
}

/**
 * Button component with medieval styling
 * @param children - Button content
 * @param onClick - Click handler
 * @param variant - Button style variant
 * @param disabled - Whether button is disabled
 * @param fullWidth - Whether button should take full width
 * @param type - Button type attribute
 */
export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  fullWidth = false,
  type = 'button',
}: ButtonProps) {
  // Base classes for all buttons
  const baseClasses = 'btn';

  // Variant-specific classes
  const variantClasses = `btn-${variant}`;

  // Full width class
  const widthClass = fullWidth ? 'btn-full' : '';

  // Disabled class
  const disabledClass = disabled ? 'btn-disabled' : '';

  const className = `${baseClasses} ${variantClasses} ${widthClass} ${disabledClass}`.trim();

  return (
    <button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
