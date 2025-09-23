import { useState, useRef, useEffect } from 'react';

interface LogEntry {
  id: string;
  timestamp: number;
  type: 'move' | 'combat' | 'item' | 'dice' | 'card' | 'system';
  message: string;
  details?: any;
}

export function LogPanel() {
  const [entries, setEntries] = useState<LogEntry[]>([
    {
      id: '1',
      timestamp: Date.now() - 60000,
      type: 'system',
      message: 'Game started',
    },
    {
      id: '2',
      timestamp: Date.now() - 50000,
      type: 'dice',
      message: 'Player1 rolled 3 on d4',
    },
    {
      id: '3',
      timestamp: Date.now() - 40000,
      type: 'move',
      message: 'Player1 moved to tile #3 (Treasure T1)',
    },
    {
      id: '4',
      timestamp: Date.now() - 30000,
      type: 'card',
      message: 'Player1 drew Dagger (+1 Attack)',
    },
  ]);

  const [filter, setFilter] = useState<string>('all');
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  const filteredEntries = filter === 'all'
    ? entries
    : entries.filter(e => e.type === filter);

  const getEntryIcon = (type: string) => {
    switch (type) {
      case 'move': return '👣';
      case 'combat': return '⚔️';
      case 'item': return '📦';
      case 'dice': return '🎲';
      case 'card': return '🃏';
      case 'system': return '⚙️';
      default: return '📝';
    }
  };

  const getEntryColor = (type: string) => {
    switch (type) {
      case 'move': return 'text-blue-600 dark:text-blue-400';
      case 'combat': return 'text-red-600 dark:text-red-400';
      case 'item': return 'text-green-600 dark:text-green-400';
      case 'dice': return 'text-purple-600 dark:text-purple-400';
      case 'card': return 'text-yellow-600 dark:text-yellow-400';
      case 'system': return 'text-gray-600 dark:text-gray-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter buttons */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-2">
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`
              px-2 py-1 text-xs rounded transition-colors
              ${filter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
              }
            `}
          >
            All
          </button>
          {['move', 'combat', 'item', 'dice', 'card', 'system'].map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`
                px-2 py-1 text-xs rounded transition-colors capitalize
                ${filter === type
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                }
              `}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {filteredEntries.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
            No log entries to display
          </div>
        ) : (
          filteredEntries.map(entry => (
            <div
              key={entry.id}
              className="flex gap-2 text-sm py-1 border-b border-gray-100 dark:border-gray-800"
              role="status"
            >
              <div className="flex-shrink-0">
                <span className={getEntryColor(entry.type)}>
                  {getEntryIcon(entry.type)}
                </span>
              </div>
              <div className="flex-1">
                <span className="text-gray-700 dark:text-gray-300">
                  {entry.message}
                </span>
              </div>
              <div className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-500">
                {new Date(entry.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>

      {/* Entry count */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-2">
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Showing {filteredEntries.length} of {entries.length} entries
        </div>
      </div>
    </div>
  );
}