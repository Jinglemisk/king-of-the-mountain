import type { GameDoc, LogEntry, ChatMessage, NetworkPlayerState, RoomDoc, ClientAction } from './types';
import type { GameState } from '../types';
import { CLASSES } from '../data/content';
import { getBoardLayout } from '../data/board';

const DEFAULT_BOARD = getBoardLayout();
const START_TILE_ID = DEFAULT_BOARD.nodes.find(node => node.type === 'start')?.id ?? 0;

// LocalStorage key for games
const STORAGE_KEY = 'kotm_mock_games';
const LOGS_STORAGE_KEY = 'kotm_mock_game_logs';
const CHAT_STORAGE_KEY = 'kotm_mock_game_chat';

// In-memory cache synced with localStorage
const mockGames = new Map<string, GameDoc>();
const mockLogs = new Map<string, LogEntry[]>();
const mockChat = new Map<string, ChatMessage[]>();
const gameSubscribers = new Map<string, Set<(game: GameDoc | null) => void>>();
const logSubscribers = new Map<string, Set<(logs: LogEntry[]) => void>>();
const chatSubscribers = new Map<string, Set<(messages: ChatMessage[]) => void>>();

// Load games from localStorage on startup
function loadGamesFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const games = JSON.parse(stored);
      mockGames.clear();
      Object.entries(games).forEach(([id, game]) => {
        const gameDoc = game as GameDoc;
        gameDoc.createdAt = new Date(gameDoc.createdAt as any);
        gameDoc.updatedAt = new Date(gameDoc.updatedAt as any);
        mockGames.set(id, gameDoc);
      });
    }

    // Load logs
    const storedLogs = localStorage.getItem(LOGS_STORAGE_KEY);
    if (storedLogs) {
      const logs = JSON.parse(storedLogs);
      mockLogs.clear();
      Object.entries(logs).forEach(([gameId, gameLogs]) => {
        mockLogs.set(gameId, gameLogs as LogEntry[]);
      });
    }

    // Load chat
    const storedChat = localStorage.getItem(CHAT_STORAGE_KEY);
    if (storedChat) {
      const chat = JSON.parse(storedChat);
      mockChat.clear();
      Object.entries(chat).forEach(([gameId, messages]) => {
        mockChat.set(gameId, messages as ChatMessage[]);
      });
    }
  } catch (err) {
    console.error('[Mock] Failed to load games from storage:', err);
  }
}

// Save games to localStorage
function saveGamesToStorage() {
  try {
    const games: Record<string, GameDoc> = {};
    mockGames.forEach((game, id) => {
      games[id] = game;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(games));

    // Save logs
    const logs: Record<string, LogEntry[]> = {};
    mockLogs.forEach((gameLogs, gameId) => {
      logs[gameId] = gameLogs;
    });
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));

    // Save chat
    const chat: Record<string, ChatMessage[]> = {};
    mockChat.forEach((messages, gameId) => {
      chat[gameId] = messages;
    });
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chat));
  } catch (err) {
    console.error('[Mock] Failed to save games to storage:', err);
  }
}

// Initialize on module load
loadGamesFromStorage();

// Listen for storage changes from other tabs
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY || e.key === LOGS_STORAGE_KEY || e.key === CHAT_STORAGE_KEY) {
    loadGamesFromStorage();
    // Notify all subscribers
    mockGames.forEach((game, id) => {
      notifyGameSubscribers(id);
    });
    mockLogs.forEach((logs, gameId) => {
      notifyLogSubscribers(gameId);
    });
    mockChat.forEach((messages, gameId) => {
      notifyChatSubscribers(gameId);
    });
  }
});

function notifyGameSubscribers(gameId: string) {
  const game = mockGames.get(gameId);
  const subscribers = gameSubscribers.get(gameId);
  if (subscribers) {
    subscribers.forEach(callback => callback(game || null));
  }
}

function notifyLogSubscribers(gameId: string) {
  const logs = mockLogs.get(gameId) || [];
  const subscribers = logSubscribers.get(gameId);
  if (subscribers) {
    subscribers.forEach(callback => callback(logs));
  }
}

function notifyChatSubscribers(gameId: string) {
  const messages = mockChat.get(gameId) || [];
  const subscribers = chatSubscribers.get(gameId);
  if (subscribers) {
    subscribers.forEach(callback => callback(messages));
  }
}

export async function createGame(roomData: RoomDoc): Promise<string> {
  const gameId = `game-${roomData.code}-${Date.now()}`;

  // Get active players
  const activePlayers = roomData.seats.filter(seat => seat.uid !== null);

  console.log('[Mock] Creating game with active players:', activePlayers.map(s => ({ uid: s.uid, nickname: s.nickname })));

  // Create initial player states
  const players: Record<string, NetworkPlayerState> = {};
  const turnOrder: string[] = [];

  // Simple turn order - just use seat order for now
  activePlayers.forEach((seat, index) => {
    if (!seat.uid || !seat.classId) return;

    turnOrder.push(seat.uid);
    console.log('[Mock] Added to turnOrder:', seat.uid, 'at index:', turnOrder.length - 1);

    const classData = CLASSES[seat.classId];
    players[seat.uid] = {
      uid: seat.uid,
      nickname: seat.nickname || 'Player',
      classId: seat.classId,
      position: 0,
      hp: classData.startHp,
      maxHp: classData.startHp,
      equipped: {},
      inventory: [],
      combatModifiers: {
        attackBonus: 0,
        defenseBonus: 0,
        attackRerolls: 0,
        defenseRerolls: 0,
        autoDefense: 0,
        poisoned: false,
        mustRetreat: false,
        cannotRetreat: false
      },
      passiveFlags: {},
      cardsDrawnThisTurn: 0,
      movementHistory: {
        forwardThisTurn: [0], // Start at tile 0
        lastFrom: undefined
      },
      mustSleepNext: false,
      isAsleep: false,
      effects: []
    };
  });

  // Create game document matching the expected structure
  const gameDoc: GameDoc = {
    schemaVersion: '1.0.0',
    version: 1,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: roomData.ownerUid,
    startedAt: new Date(),
    endedAt: null,

    currentPlayerUid: turnOrder[0],
    phase: 'moveOrSleep',
    turnOrder,
    turnNumber: 1,

    board: {
      id: DEFAULT_BOARD.id,
      graph: DEFAULT_BOARD as any, // Include the board graph data
      playerPositions: {} // Will be populated with player positions
    },

    players,

    decks: {
      treasure: {
        t1: { drawPile: [], discardPile: [] },
        t2: { drawPile: [], discardPile: [] },
        t3: { drawPile: [], discardPile: [] }
      },
      chance: {
        main: { drawPile: [], discardPile: [] }
      },
      enemies: {
        t1: { drawPile: [], discardPile: [] },
        t2: { drawPile: [], discardPile: [] },
        t3: { drawPile: [], discardPile: [] }
      }
    },

    tileState: {
      enemies: {},
      attachments: {}
    },

    combat: null,
    finalTileTie: null,

    rngAudit: []
  } as GameDoc;

  // Set initial player positions
  turnOrder.forEach(uid => {
    gameDoc.board.playerPositions[uid] = START_TILE_ID; // All start at the board's start tile
  });

  mockGames.set(gameId, gameDoc);
  mockLogs.set(gameId, []);
  mockChat.set(gameId, []);

  saveGamesToStorage();

  console.log('[Mock] Game created:', gameId);
  console.log('[Mock] First player (currentPlayerUid):', gameDoc.currentPlayerUid);
  console.log('[Mock] Turn order:', turnOrder);

  // Add initial log entry
  await addGameLog(gameId, 'game_start', 'Game started!', { players: turnOrder });

  notifyGameSubscribers(gameId);

  return gameId;
}

export async function updateGame(gameId: string, updates: Partial<GameDoc>): Promise<void> {
  const game = mockGames.get(gameId);
  if (!game) throw new Error('Game not found');

  Object.assign(game, updates, {
    updatedAt: new Date(),
    version: (game.version || 0) + 1
  });

  saveGamesToStorage();
  notifyGameSubscribers(gameId);
}

export function subscribeToGame(
  gameId: string,
  callback: (game: GameDoc | null) => void
): () => void {
  if (!gameSubscribers.has(gameId)) {
    gameSubscribers.set(gameId, new Set());
  }

  const subscribers = gameSubscribers.get(gameId)!;
  subscribers.add(callback);

  // Load latest from storage and send immediately
  loadGamesFromStorage();
  const game = mockGames.get(gameId);
  callback(game || null);

  // Poll for changes
  const intervalId = setInterval(() => {
    const prevGame = mockGames.get(gameId);
    loadGamesFromStorage();
    const newGame = mockGames.get(gameId);

    if (JSON.stringify(prevGame) !== JSON.stringify(newGame)) {
      callback(newGame || null);
    }
  }, 1000);

  // Return unsubscribe function
  return () => {
    clearInterval(intervalId);
    subscribers.delete(callback);
    if (subscribers.size === 0) {
      gameSubscribers.delete(gameId);
    }
  };
}

export function subscribeToGameLog(
  gameId: string,
  callback: (logs: LogEntry[]) => void,
  limitCount: number = 50
): () => void {
  if (!logSubscribers.has(gameId)) {
    logSubscribers.set(gameId, new Set());
  }

  const subscribers = logSubscribers.get(gameId)!;
  subscribers.add(callback);

  // Send current logs immediately
  const logs = mockLogs.get(gameId) || [];
  callback(logs.slice(-limitCount));

  // Poll for changes
  const intervalId = setInterval(() => {
    loadGamesFromStorage();
    const newLogs = mockLogs.get(gameId) || [];
    callback(newLogs.slice(-limitCount));
  }, 1000);

  // Return unsubscribe function
  return () => {
    clearInterval(intervalId);
    subscribers.delete(callback);
    if (subscribers.size === 0) {
      logSubscribers.delete(gameId);
    }
  };
}

export function subscribeToChat(
  gameId: string,
  callback: (messages: ChatMessage[]) => void,
  limitCount: number = 100
): () => void {
  if (!chatSubscribers.has(gameId)) {
    chatSubscribers.set(gameId, new Set());
  }

  const subscribers = chatSubscribers.get(gameId)!;
  subscribers.add(callback);

  // Send current messages immediately
  const messages = mockChat.get(gameId) || [];
  callback(messages.slice(-limitCount));

  // Poll for changes
  const intervalId = setInterval(() => {
    loadGamesFromStorage();
    const newMessages = mockChat.get(gameId) || [];
    callback(newMessages.slice(-limitCount));
  }, 1000);

  // Return unsubscribe function
  return () => {
    clearInterval(intervalId);
    subscribers.delete(callback);
    if (subscribers.size === 0) {
      chatSubscribers.delete(gameId);
    }
  };
}

export async function sendChatMessage(gameId: string, text: string, nickname: string, userId: string): Promise<void> {
  const messages = mockChat.get(gameId) || [];

  messages.push({
    ts: new Date(),
    uid: userId,
    nickname,
    text
  });

  mockChat.set(gameId, messages);
  saveGamesToStorage();
  notifyChatSubscribers(gameId);
}

export async function addGameLog(
  gameId: string,
  logType: string,
  message: string,
  payload?: any,
  userId?: string
): Promise<void> {
  const logs = mockLogs.get(gameId) || [];

  logs.push({
    ts: new Date(),
    actorUid: userId || null,
    type: logType,
    message,
    payload,
    visibility: 'public'
  });

  mockLogs.set(gameId, logs);
  saveGamesToStorage();
  notifyLogSubscribers(gameId);

  console.log(`[Mock] Game log: ${message}`);
}

// Debug helpers
export function debugGetGame(gameId: string) {
  return mockGames.get(gameId);
}

export function debugGetAllGames() {
  return Array.from(mockGames.entries());
}

export function clearAllGames() {
  mockGames.clear();
  mockLogs.clear();
  mockChat.clear();
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LOGS_STORAGE_KEY);
  localStorage.removeItem(CHAT_STORAGE_KEY);
  console.log('[Mock] All games cleared');
}

export async function applyGameAction(
  gameId: string,
  action: Omit<ClientAction, 'ts'>,
  engineTransform: (state: GameState) => GameState
): Promise<void> {
  // Don't reload from storage if we already have the game in memory
  // This prevents stale data issues
  let game = mockGames.get(gameId);
  if (!game) {
    // Only load from storage if the game isn't in memory
    loadGamesFromStorage();
    game = mockGames.get(gameId);
    if (!game) {
      throw new Error('Game not found');
    }
  }

  // Verify current player
  console.log('[Mock] applyGameAction - game.currentPlayerUid:', game.currentPlayerUid);
  console.log('[Mock] applyGameAction - action.uid:', action.uid);
  console.log('[Mock] applyGameAction - comparison:', game.currentPlayerUid === action.uid);

  if (game.currentPlayerUid !== action.uid) {
    console.error('[Mock] Turn validation failed!');
    console.error('[Mock] Expected currentPlayerUid:', game.currentPlayerUid);
    console.error('[Mock] Received action.uid:', action.uid);
    console.error('[Mock] Game version:', game.version);
    console.error('[Mock] Game phase:', game.phase);
    throw new Error('Not your turn');
  }

  // Apply the engine transformation
  const currentState = game as any as GameState; // Type conversion for engine
  const newState = engineTransform(currentState);

  console.log('[Mock] Phase transition:', game.phase, '->', newState.phase);
  console.log('[Mock] Current player after action:', newState.currentPlayer);

  // Update the game state
  const updatedGame: GameDoc = {
    ...game,
    ...(newState as any),
    version: game.version + 1,
    updatedAt: new Date()
  };

  mockGames.set(gameId, updatedGame);
  saveGamesToStorage();

  // Log the action
  await addGameLog(gameId, 'Action', `${action.type} executed`, action.payload, action.uid);

  // Notify subscribers
  notifyGameSubscribers(gameId);

  console.log(`[Mock] Applied action ${action.type} to game ${gameId}`);
}
