import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

interface TooltipProps {
  children: ReactElement;
  content: ReactNode;
  placement?: 'top' | 'bottom';
}

export function Tooltip({ children, content, placement = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const show = () => setIsVisible(true);
  const hide = () => setIsVisible(false);

  return (
    <div
      className={`tooltip-container tooltip-${placement}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      <div className={`tooltip-bubble ${isVisible ? 'visible' : ''}`} role="tooltip">
        {content}
      </div>
    </div>
  );
}
