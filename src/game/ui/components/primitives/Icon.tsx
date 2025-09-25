import { forwardRef } from 'react';
import type { ImgHTMLAttributes } from 'react';
import { getAsset } from '../../../../assetRegistry';

type IconSize = number | string;

export type IconProps = {
  /** Logical asset key such as "sword.svg" or "icons/sword.svg". */
  name: string;
  /** Optional shortcut to set both width and height in one go. */
  size?: IconSize;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'>;

const coerceSize = (size: IconSize): { width: IconSize; height: IconSize } => ({
  width: size,
  height: size,
});

// Centralized <img> usage so feature components pull icons through the asset registry.
export const Icon = forwardRef<HTMLImageElement, IconProps>(
  ({ name, alt, size, className, style, ...rest }, ref) => {
    const normalized = name.includes('/') ? name : `icons/${name}`;
    const src = getAsset(normalized);

    const dimensions = typeof size !== 'undefined' ? coerceSize(size) : undefined;

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        className={className}
        style={dimensions ? { ...dimensions, ...style } : style}
        {...rest}
      />
    );
  }
);

Icon.displayName = 'Icon';
