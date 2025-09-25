import type { ReactNode } from 'react';

export type AppShellProps = {
  header?: ReactNode;
  footer?: ReactNode;
  leftSidebar?: ReactNode;
  rightSidebar?: ReactNode;
  children: ReactNode;
  stickyHeader?: boolean;
  gap?: 'sm' | 'md' | 'lg';
  leftWidth?: 'narrow' | 'default' | 'wide';
  rightWidth?: 'narrow' | 'default' | 'wide';
  className?: string;
};

const gapStyles: Record<NonNullable<AppShellProps['gap']>, string> = {
  sm: 'gap-4',
  md: 'gap-6',
  lg: 'gap-8',
};

const sidebarWidths = {
  narrow: 'lg:w-56',
  default: 'lg:w-72',
  wide: 'lg:w-80',
};

// AppShell orchestrates the global layout (sidebars + main content) for both lobby and in-game screens.
export function AppShell({
  header,
  footer,
  leftSidebar,
  rightSidebar,
  children,
  stickyHeader = true,
  gap = 'md',
  leftWidth = 'default',
  rightWidth = 'default',
  className,
}: AppShellProps) {
  const resolvedGap = gapStyles[gap];
  const leftClass = sidebarWidths[leftWidth];
  const rightClass = sidebarWidths[rightWidth];

  return (
    <div className={['col-span-full flex min-h-screen w-full max-w-none flex-col bg-surface-base text-text-primary', className].filter(Boolean).join(' ')}>
      {header ? (
        <header
          className={[
            'z-20 bg-surface-base/90 text-text-primary shadow-sm',
            stickyHeader ? 'sticky top-0 backdrop-blur-xl' : 'relative',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="col-span-full flex w-full max-w-none items-center justify-between px-6 py-4">
            {header}
          </div>
        </header>
      ) : null}

      <div className={`col-span-full flex w-full max-w-none flex-1 flex-col px-4 py-6 lg:px-6 ${resolvedGap}`}>
        <div className={`col-span-full flex w-full max-w-none flex-1 flex-col ${resolvedGap} lg:flex-row`}>
          {leftSidebar ? (
            <aside className={`order-1 flex w-full flex-col gap-4 ${leftClass}`}>
              {leftSidebar}
            </aside>
          ) : null}

          <main className={`order-2 col-span-full flex w-full max-w-none flex-1 basis-full flex-col ${resolvedGap} min-w-0`}>
            {children}
          </main>

          {rightSidebar ? (
            <aside className={`order-3 flex w-full flex-col gap-4 ${rightClass}`}>
              {rightSidebar}
            </aside>
          ) : null}
        </div>
      </div>

      {footer ? (
        <footer className="col-span-full mt-auto w-full max-w-none bg-surface-raised/40 py-4">
          <div className="col-span-full flex w-full max-w-none justify-between px-6 text-label-sm text-text-muted">
            {footer}
          </div>
        </footer>
      ) : null}
    </div>
  );
}
