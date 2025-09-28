import type { Unsubscribe } from 'firebase/firestore';
import type { GameDoc, RoomDoc, LogEntry, ChatMessage, ClientAction } from './types';
import type { GameState } from '../types';
import type { GameAction } from '../engine/types';
import { GameEngine } from '../engine/GameEngine';
import {
  subscribeToGame,
  subscribeToGameLog,
  subscribeToChat,
  applyGameAction,
  sendChatMessage
} from './gameService';
import { subscribeToRoom } from './roomService';
import { useGameStore } from '../ui/stores/gameStore';

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

    // Get uid from gameStore which is the source of truth
    const myUid = useGameStore.getState().myUid;
    if (!myUid) {
      throw new Error('User not authenticated - no uid in gameStore');
    }

    console.log('[SyncManager] executeAction - myUid:', myUid);
    console.log('[SyncManager] executeAction - currentPlayerUid:', this.currentGameState?.currentPlayerUid);
    console.log('[SyncManager] executeAction - isMyTurn:', this.isMyTurn());

    if (!this.isMyTurn()) {
      throw new Error('Not your turn');
    }

    // Generate action ID for tracking
    const actionId = `${Date.now()}_${Math.random()}`;

    const action: ClientAction = {
      ts: null as any, // Will be set by Firestore
      uid: myUid,
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
          // Convert game state to engine state - map currentPlayerUid to currentPlayer
          const networkState = currentState as any;
          const engineState: any = {
            ...currentState,
            currentPlayer: networkState.currentPlayerUid || currentState.currentPlayer,
            // Convert turnOrder array to order object
            order: networkState.turnOrder ? {
              seats: networkState.turnOrder,
              currentIdx: networkState.turnOrder.indexOf(networkState.currentPlayerUid || currentState.currentPlayer) || 0
            } : currentState.order
          };

          console.log('[SyncManager] State conversion - currentPlayerUid:', (currentState as any).currentPlayerUid);
          console.log('[SyncManager] State conversion - engineState.currentPlayer:', engineState.currentPlayer);
          console.log('[SyncManager] State conversion - board exists:', !!engineState.board);
          console.log('[SyncManager] State conversion - board.graph exists:', !!engineState.board?.graph);
          console.log('[SyncManager] State conversion - board.graph.nodes exists:', !!engineState.board?.graph?.nodes);

          // Validate board structure
          if (!engineState.board || !engineState.board.graph) {
            console.error('[SyncManager] Board structure missing in game state!', {
              hasBoard: !!engineState.board,
              boardKeys: engineState.board ? Object.keys(engineState.board) : [],
              hasGraph: !!engineState.board?.graph
            });
            throw new Error('Invalid game state: board not initialized');
          }

          // Create context
          const ctx = {
            now: () => Date.now(),
            rng: {
              state: { seed: Date.now().toString(), counter: 0 },
              roll: (die: string) => {
                const max = die === 'd4' ? 4 : 6;
                return { value: Math.floor(Math.random() * max) + 1, raw: 0 };
              },
              shuffle: <T>(arr: ReadonlyArray<T>) => [...arr],
              weightedPick: <T>(items: ReadonlyArray<T>, weights: ReadonlyArray<number>) => ({ index: 0, item: items[0] })
            },
            emit: (event: any) => {
              // Events are handled by the engine internally
              console.log('[SyncManager] Engine event:', event.type);
            }
          };

          // Ensure the engine action has all required fields
          const completeEngineAction = {
            id: `action_${Date.now()}_${Math.random()}`,
            ts: Date.now(),
            uid: myUid, // Add the uid from the authenticated user
            ...engineAction // Allow override of defaults with values from engineAction
          };

          console.log('[SyncManager] Complete engine action:', completeEngineAction);

          // Apply the action using the engine
          const result = this.engine.applyAction(engineState, completeEngineAction as any, ctx);

          console.log('[SyncManager] Engine result - currentPlayer:', result.state.currentPlayer);

          // Convert engine state back - map currentPlayer to currentPlayerUid and order to turnOrder
          const returnState = {
            ...result.state,
            currentPlayerUid: result.state.currentPlayer,
            currentPlayer: undefined, // Remove the engine's currentPlayer field
            // Convert order object back to turnOrder array
            turnOrder: result.state.order?.seats,
            order: undefined // Remove the engine's order field
          } as any;
          delete returnState.currentPlayer; // Ensure it's removed
          delete returnState.order; // Ensure it's removed

          console.log('[SyncManager] Return state - currentPlayerUid:', returnState.currentPlayerUid);

          return returnState;
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

    // Get uid from gameStore which is the source of truth
    const myUid = useGameStore.getState().myUid;
    if (!myUid) {
      throw new Error('User not authenticated - no uid in gameStore');
    }

    const player = this.currentGameState.players[myUid];
    if (!player) {
      throw new Error('User not in game');
    }

    await sendChatMessage(this.currentGameId, text, player.nickname);
  }

  isMyTurn(): boolean {
    if (!this.currentGameState) {
      console.log('[SyncManager.isMyTurn] No game state');
      return false;
    }

    // Get uid from gameStore which is the source of truth
    const myUid = useGameStore.getState().myUid;
    if (!myUid) {
      console.log('[SyncManager.isMyTurn] No myUid in gameStore');
      return false;
    }

    console.log('[SyncManager.isMyTurn] myUid from store:', myUid);
    console.log('[SyncManager.isMyTurn] currentPlayerUid:', this.currentGameState.currentPlayerUid);
    const result = this.currentGameState.currentPlayerUid === myUid;
    console.log('[SyncManager.isMyTurn] Result:', result);
    return result;
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