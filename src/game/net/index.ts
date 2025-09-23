// Firebase initialization
export {
  initializeFirebase,
  signInAsAnonymous,
  onAuthChange,
  getCurrentUser,
  goOnline,
  goOffline,
  isInitialized
} from './firebase';

// Room management
export {
  createRoom,
  joinRoom,
  leaveRoom,
  updateSeatReady,
  updateSeatClass,
  kickPlayer,
  subscribeToRoom
} from './roomService';

// Game management
export {
  startGame,
  subscribeToGame,
  subscribeToGameLog,
  subscribeToChat,
  sendChatMessage,
  addGameLog
} from './gameService';

// Connection management
export {
  getConnectionManager,
  destroyConnectionManager,
  ConnectionManager
} from './connectionManager';

// State synchronization
export {
  getSyncManager,
  destroySyncManager,
  SyncManager,
  type SyncCallbacks
} from './syncManager';

// Action handlers
export {
  getActionHandlers,
  ActionHandlers,
  type ActionResult
} from './actionHandlers';

// Types
export * from './types';