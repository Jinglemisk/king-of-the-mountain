/**
 * GameLog Component
 * Displays game event logs and chat (coming soon)
 */

import type { LogEntry } from '../../../types';

interface GameLogProps {
  logs: LogEntry[];
  activeTab: 'logs' | 'chat';
  onTabChange: (tab: 'logs' | 'chat') => void;
}

export function GameLog({ logs, activeTab, onTabChange }: GameLogProps) {
  // Get last 20 logs, most recent first
  const recentLogs = [...logs].reverse().slice(0, 20);

  return (
    <div className="logs-section">
      <div className="logs-header">
        <button
          className={activeTab === 'logs' ? 'active' : ''}
          onClick={() => onTabChange('logs')}
        >
          📜 Event Logs
        </button>
        <button
          className={activeTab === 'chat' ? 'active' : ''}
          onClick={() => onTabChange('chat')}
        >
          💬 Chat (Coming soon)
        </button>
      </div>
      <div className="logs-content">
        {activeTab === 'logs' && (
          <div className="event-logs">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className={`log-entry log-${log.type} ${log.isImportant ? 'important' : ''}`}
              >
                <span className="log-time">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'chat' && (
          <div className="chat-placeholder">
            <p>Chat functionality coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
}
