import { useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

export type TabOption = {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  content?: ReactNode;
};

export type TabsVariant = 'solid' | 'underline';

export type TabsProps = {
  tabs: TabOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  variant?: TabsVariant;
  className?: string;
  tabClassName?: string;
  contentClassName?: string;
  renderTabContent?: (tab: TabOption) => ReactNode;
};

const baseList = 'flex items-center gap-2 rounded-full bg-surface-raised p-1 text-body-sm';
const baseTrigger =
  'relative inline-flex min-w-[4rem] items-center justify-center gap-1 rounded-full px-3 py-1.5 font-medium transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400';
const basePanel = 'rounded-3xl border border-[rgba(148,163,184,0.2)] bg-surface-card p-md shadow-sm';

const solidActive = 'bg-brand-500 text-text-inverted shadow-[var(--kotm-shadow-pop)]';
const solidInactive = 'text-text-muted hover:text-text-primary';

const underlineActive =
  'text-text-primary after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-8 after:-translate-x-1/2 after:rounded-full after:bg-brand-500';
const underlineInactive = 'text-text-muted hover:text-text-primary';

// Lightweight tabs control tailored to docked panels (log/chat, etc.). Includes content slot for common layouts.
export function Tabs({
  tabs,
  value,
  defaultValue,
  onValueChange,
  variant = 'solid',
  className,
  tabClassName,
  contentClassName,
  renderTabContent,
}: TabsProps) {
  const initial = value ?? defaultValue ?? (tabs[0] ? tabs[0].value : undefined);
  const [internalValue, setInternalValue] = useState(initial);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeValue = value ?? internalValue;

  const handleChange = (next: string, focus = false) => {
    if (value === undefined) {
      setInternalValue(next);
    }
    onValueChange?.(next);

    if (focus) {
      const index = tabs.findIndex((item) => item.value === next);
      if (index >= 0) {
        tabRefs.current[index]?.focus();
      }
    }
  };

  const handleKeyPress = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (tabs.length === 0) {
      return;
    }

    const lastIndex = tabs.length - 1;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        event.preventDefault();
        const nextIndex = index === lastIndex ? 0 : index + 1;
        handleChange(tabs[nextIndex].value, true);
        break;
      }
      case 'ArrowLeft':
      case 'ArrowUp': {
        event.preventDefault();
        const nextIndex = index === 0 ? lastIndex : index - 1;
        handleChange(tabs[nextIndex].value, true);
        break;
      }
      case 'Home': {
        event.preventDefault();
        handleChange(tabs[0].value, true);
        break;
      }
      case 'End': {
        event.preventDefault();
        handleChange(tabs[lastIndex].value, true);
        break;
      }
      default:
        break;
    }
  };

  return (
    <div className={['flex w-full flex-col gap-4', className].filter(Boolean).join(' ')}>
      <div role="tablist" aria-orientation="horizontal" className={baseList}>
        {tabs.map((tab, index) => {
          const isActive = tab.value === activeValue;
          const variantClass =
            variant === 'solid'
              ? isActive
                ? solidActive
                : solidInactive
              : isActive
              ? underlineActive
              : underlineInactive;

          return (
            <button
              key={tab.value}
              id={`tab-${tab.value}`}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`tab-panel-${tab.value}`}
              className={[baseTrigger, variantClass, tabClassName].filter(Boolean).join(' ')}
              onClick={() => handleChange(tab.value)}
              onKeyDown={(event) => handleKeyPress(event, index)}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
            >
              {tab.icon ? <span aria-hidden className="text-current">{tab.icon}</span> : null}
              <span>{tab.label}</span>
              {tab.badge ? <span aria-hidden>{tab.badge}</span> : null}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => {
        const isActive = tab.value === activeValue;
        if (!isActive) {
          return null;
        }

        const finalContent = renderTabContent ? renderTabContent(tab) : tab.content;

        return (
          <div
            key={tab.value}
            role="tabpanel"
            id={`tab-panel-${tab.value}`}
            aria-labelledby={`tab-${tab.value}`}
            className={[basePanel, contentClassName].filter(Boolean).join(' ')}
          >
            {finalContent}
          </div>
        );
      })}
    </div>
  );
}
