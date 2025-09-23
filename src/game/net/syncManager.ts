import { Unsubscribe } from 'firebase/firestore';
import { GameDoc, RoomDoc, LogEntry, ChatMessage, ClientAction } from './types';
import { GameState, GameAction } from '../engine/types';
import { GameEngine } from '../engine/GameEngine';
import {
  subscribeToGame,
  subscribeToGameLog,
  subscribeToChat,
  applyGameAction,
  sendChatMessage,
  addGameLog
} from './gameService';
import { subscribeToRoom } from './roomService';
import { getCurrentUser } from './firebase';

export interface SyncCallbacks {
  onRoomUpdate?: (room: RoomDoc | null) => void;
  onGameUpdate?: (game: GameDoc | null) => void;
  onLogUpdate?: (logs: LogEntry[]) => void;
  onChatUpdate?: (messages: ChatMessage[]) => void;
  onError?: (error: Error) => void;
}

export class SyncManager {
  private roomSubscription: Unsubscribe | null = null;
  private gameSubscription: Unsubscribe | null = null;
  private logSubscription: Unsubscribe | null = null;
  private chatSubscription: Unsubscribe | null = null;

  private currentRoomCode: string | null = null;
  private currentGameId: string | null = null;
  private currentGameState: GameDoc | null = null;
  private localVersion: number = 0;

  private callbacks: SyncCallbacks = {};
  private engine: GameEngine;
  private pendingActions: Map<string, ClientAction> = new Map();

  constructor(callbacks: SyncCallbacks = {}) {
    this.callbacks = callbacks;
    this.engine = new GameEngine();
  }

  subscribeToRoom(roomCode: string): void {
    this.unsubscribeFromRoom();
    this.currentRoomCode = roomCode;

    this.roomSubscription = subscribeToRoom(roomCode, (room) => {
      if (this.callbacks.onRoomUpdate) {
        this.callbacks.onRoomUpdate(room);
      }

      // Auto-subscribe to game if it starts
      if (room?.gameId && room.gameId !== this.currentGameId) {
        this.subscribeToGame(room.gameId);
      }
    });
  }

  subscribeToGame(gameId: string): void {
    if (this.currentGameId === gameId) {
      return; // Already subscribed
    }

    this.unsubscribeFromGame();
    this.currentGameId = gameId;

    // Subscribe to game state
    this.gameSubscription = subscribeToGame(gameId, (game) => {
      if (game) {
        this.handleGameUpdate(game);
      }
    });

    // Subscribe to game log
    this.logSubscription = subscribeToGameLog(gameId, (logs) => {
      if (this.callbacks.onLogUpdate) {
        this.callbacks.onLogUpdate(logs);
      }
    });

    // Subscribe to chat
    this.chatSubscription = subscribeToChat(gameId, (messages) => {
      if (this.callbacks.onChatUpdate) {
        this.callbacks.onChatUpdate(messages);
      }
    });
  }

  private handleGameUpdate(game: GameDoc): void {
    const wasMyTurn = this.isMyTurn();
    this.currentGameState = game;
    this.localVersion = game.version;

    // Check for pending actions that succeeded
    this.clearCompletedPendingActions();

    if (this.callbacks.onGameUpdate) {
      this.callbacks.onGameUpdate(game);
    }

    // Notify if turn changed to current user
    const isMyTurnNow = this.isMyTurn();
    if (!wasMyTurn && isMyTurnNow) {
      this.notifyTurnStart();
    }
  }

  private notifyTurnStart(): void {
    // Could trigger a notification or sound effect
    console.log('Your turn has started!');
  }

  async executeAction(
    actionType: string,
    payload: any,
    engineAction: GameAction
  ): Promise<void> {
    if (!this.currentGameId || !this.currentGameState) {
      throw new Error('No active game');
    }

    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    if (!this.isMyTurn()) {
      throw new Error('Not your turn');
    }

    // Generate action ID for tracking
    const actionId = `${Date.now()}_${Math.random()}`;

    const action: ClientAction = {
      ts: null as any, // Will be set by Firestore
      uid: user.uid,
      type: actionType,
      payload
    };

    // Store as pending
    this.pendingActions.set(actionId, action);

    try {
      // Apply action through game service
      await applyGameAction(
        this.currentGameId,
        action,
        (currentState: GameState) => {
          // Apply the action using the engine
          return this.engine.processAction(currentState, engineAction);
        }
      );

      // Success - action will be cleared when game update arrives
    } catch (error) {
      // Remove from pending on error
      this.pendingActions.delete(actionId);

      if (this.callbacks.onError) {
        this.callbacks.onError(error as Error);
      }

      throw error;
    }
  }

  async sendChat(text: string): Promise<void> {
    if (!this.currentGameId || !this.currentGameState) {
      throw new Error('No active game');
    }

    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const player = this.currentGameState.players[user.uid];
    if (!player) {
      throw new Error('User not in game');
    }

    await sendChatMessage(this.currentGameId, text, player.nickname);
  }

  isMyTurn(): boolean {
    if (!this.currentGameState) {
      return false;
    }

    const user = getCurrentUser();
    if (!user) {
      return false;
    }

    return this.currentGameState.currentPlayerUid === user.uid;
  }

  getCurrentPlayer(): string | null {
    return this.currentGameState?.currentPlayerUid || null;
  }

  getGameState(): GameDoc | null {
    return this.currentGameState;
  }

  getRoomCode(): string | null {
    return this.currentRoomCode;
  }

  getGameId(): string | null {
    return this.currentGameId;
  }

  private clearCompletedPendingActions(): void {
    // In a real implementation, we'd check action logs to see which actions completed
    // For now, clear all pending actions when version changes
    if (this.currentGameState && this.localVersion !== this.currentGameState.version) {
      this.pendingActions.clear();
    }
  }

  unsubscribeFromRoom(): void {
    if (this.roomSubscription) {
      this.roomSubscription();
      this.roomSubscription = null;
    }
    this.currentRoomCode = null;
  }

  unsubscribeFromGame(): void {
    if (this.gameSubscription) {
      this.gameSubscription();
      this.gameSubscription = null;
    }

    if (this.logSubscription) {
      this.logSubscription();
      this.logSubscription = null;
    }

    if (this.chatSubscription) {
      this.chatSubscription();
      this.chatSubscription = null;
    }

    this.currentGameId = null;
    this.currentGameState = null;
    this.pendingActions.clear();
  }

  destroy(): void {
    this.unsubscribeFromRoom();
    this.unsubscribeFromGame();
  }
}

// Singleton instance
let syncManagerInstance: SyncManager | null = null;

export function getSyncManager(callbacks?: SyncCallbacks): SyncManager {
  if (!syncManagerInstance) {
    syncManagerInstance = new SyncManager(callbacks || {});
  } else if (callbacks) {
    // Update callbacks if provided
    syncManagerInstance = new SyncManager(callbacks);
  }
  return syncManagerInstance;
}

export function destroySyncManager(): void {
  if (syncManagerInstance) {
    syncManagerInstance.destroy();
    syncManagerInstance = null;
  }
}