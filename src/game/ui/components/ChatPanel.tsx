import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';

interface ChatMessage {
  id: string;
  timestamp: number;
  uid: string;
  nickname: string;
  text: string;
}

export function ChatPanel() {
  const { myUid, gameState } = useGameStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputText.trim() || !myUid) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      uid: myUid,
      nickname: gameState?.players[myUid]?.nickname || 'Player',
      text: inputText.trim(),
    };

    // Add to local state (in real app, would send to Firebase)
    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    // TODO: Send to Firebase
    console.log('Send chat message:', newMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`
                text-sm
                ${msg.uid === myUid ? 'text-right' : 'text-left'}
              `}
            >
              <div
                className={`
                  inline-block max-w-[80%] rounded-lg px-3 py-2
                  ${msg.uid === myUid
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }
                `}
              >
                <div className="font-semibold text-xs opacity-75 mb-1">
                  {msg.nickname}
                </div>
                <div className="break-words">{msg.text}</div>
                <div className="text-xs opacity-75 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            maxLength={200}
            data-testid="chat-input"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            data-testid="chat-send"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}