import type { GameState } from '../types';
import type { GameAction } from '../engine/types';
import { getSyncManager } from './syncManager';
import { addGameLog } from './gameService';
import { getCurrentUser } from './firebase';

export interface ActionResult {
  success: boolean;
  error?: string;
  logs?: string[];
}

export class ActionHandlers {
  private syncManager = getSyncManager();

  async chooseMoveOrSleep(choice: 'move' | 'sleep'): Promise<ActionResult> {
    // This method is kept for backward compatibility
    if (choice === 'sleep') {
      return this.chooseSleep();
    } else {
      return this.rollMovement();
    }
  }

  async chooseSleep(): Promise<ActionResult> {
    try {
      const gameState = this.syncManager.getGameState();
      console.log('[ActionHandlers] chooseSleep - gameState:', gameState ? 'exists' : 'null');

      if (!gameState) {
        console.error('[ActionHandlers] No game state in syncManager');
        return { success: false, error: 'No active game state. Please refresh the page.' };
      }

      const action: GameAction = {
        type: 'chooseSleep',
        payload: {}
      };

      console.log('[ActionHandlers] Executing chooseSleep action');
      await this.syncManager.executeAction('chooseSleep', {}, action);

      // Log the action
      const gameId = this.syncManager.getGameId();
      if (gameId) {
        await addGameLog(gameId, 'Sleep', 'chose to sleep and heal', {});
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async rollMovement(): Promise<ActionResult> {
    try {
      const gameState = this.syncManager.getGameState();
      console.log('[ActionHandlers] rollMovement - gameState:', gameState ? 'exists' : 'null');

      if (!gameState) {
        console.error('[ActionHandlers] No game state in syncManager');
        return { success: false, error: 'No active game state. Please refresh the page.' };
      }

      const action: GameAction = {
        type: 'rollMovement',
        payload: {}
      };

      console.log('[ActionHandlers] Executing rollMovement action');
      await this.syncManager.executeAction('rollMovement', {}, action);

      // Log the action
      const gameId = this.syncManager.getGameId();
      if (gameId) {
        await addGameLog(gameId, 'Movement', 'rolled dice for movement', {});
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async chooseBranch(targetNodeId: number): Promise<ActionResult> {
    try {
      const gameState = this.syncManager.getGameState();
      if (!gameState) {
        return { success: false, error: 'No active game' };
      }

      const action: GameAction = {
        type: 'chooseBranch',
        payload: { targetNodeId }
      };

      await this.syncManager.executeAction('chooseBranch', { targetNodeId }, action);

      const gameId = this.syncManager.getGameId();
      if (gameId) {
        await addGameLog(gameId, 'BranchChosen', `chose path to node ${targetNodeId}`, { targetNodeId });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async resolveTile(): Promise<ActionResult> {
    try {
      const gameState = this.syncManager.getGameState();
      if (!gameState) {
        return { success: false, error: 'No active game' };
      }

      const action: GameAction = {
        type: 'resolvePendingTile',
        payload: {}
      };

      await this.syncManager.executeAction('resolvePendingTile', {}, action);

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async startCombat(enemyIds: string[]): Promise<ActionResult> {
    try {
      const gameState = this.syncManager.getGameState();
      if (!gameState) {
        return { success: false, error: 'No active game' };
      }

      const action: GameAction = {
        type: 'startCombat',
        payload: { enemyIds }
      };

      await this.syncManager.executeAction('startCombat', { enemyIds }, action);

      const gameId = this.syncManager.getGameId();
      if (gameId) {
        await addGameLog(gameId, 'CombatStarted', 'combat started', { enemyIds });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async rollCombat(targetEnemyId?: string): Promise<ActionResult> {
    try {
      const gameState = this.syncManager.getGameState();
      if (!gameState) {
        return { success: false, error: 'No active game' };
      }

      const action: GameAction = {
        type: 'rollCombat',
        payload: { targetEnemyId }
      };

      await this.syncManager.executeAction('rollCombat', { targetEnemyId }, action);

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async retreat(): Promise<ActionResult> {
    try {
      const gameState = this.syncManager.getGameState();
      if (!gameState) {
        return { success: false, error: 'No active game' };
      }

      const action: GameAction = {
        type: 'retreat',
        payload: {}
      };

      await this.syncManager.executeAction('retreat', {}, action);

      const gameId = this.syncManager.getGameId();
      if (gameId) {
        await addGameLog(gameId, 'Retreat', 'retreated from combat', {});
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async offerDuel(targetPlayerId: string): Promise<ActionResult> {
    try {
      const gameState = this.syncManager.getGameState();
      if (!gameState) {
        return { success: false, error: 'No active game' };
      }

      const action: GameAction = {
        type: 'offerDuel',
        payload: { targetPlayerId }
      };

      await this.syncManager.executeAction('offerDuel', { targetPlayerId }, action);

      const gameId = this.syncManager.getGameId();
      if (gameId) {
        const targetPlayer = gameState.players[targetPlayerId];
        const message = `offered a duel to ${targetPlayer?.nickname || targetPlayerId}`;
        await addGameLog(gameId, 'DuelOffered', message, { targetPlayerId });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async acceptDuel(duelId: string): Promise<ActionResult> {
    try {
      const gameState = this.syncManager.getGameState();
      if (!gameState) {
        return { success: false, error: 'No active game' };
      }

      const action: GameAction = {
        type: 'acceptDuel',
        payload: { duelId }
      };

      await this.syncManager.executeAction('acceptDuel', { duelId }, action);

      const gameId = this.syncManager.getGameId();
      if (gameId) {
        await addGameLog(gameId, 'DuelAccepted', 'duel accepted', { duelId });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async declineDuel(duelId: string): Promise<ActionResult> {
    try {
      const gameState = this.syncManager.getGameState();
      if (!gameState) {
        return { success: false, error: 'No active game' };
      }

      const action: GameAction = {
        type: 'declineDuel',
        payload: { duelId }
      };

      await this.syncManager.executeAction('declineDuel', { duelId }, action);

      const gameId = this.syncManager.getGameId();
      if (gameId) {
        await addGameLog(gameId, 'DuelDeclined', 'duel declined', { duelId });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async useItem(itemId: string, target?: string): Promise<ActionResult> {
    try {
      const gameState = this.syncManager.getGameState();
      if (!gameState) {
        return { success: false, error: 'No active game' };
      }

      const action: GameAction = {
        type: 'useItem',
        payload: { itemId, target }
      };

      await this.syncManager.executeAction('useItem', { itemId, target }, action);

      const gameId = this.syncManager.getGameId();
      if (gameId) {
        await addGameLog(gameId, 'ItemUsed', `used item ${itemId}`, { itemId, target });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async equipItem(itemId: string, slot: string): Promise<ActionResult> {
    try {
      const gameState = this.syncManager.getGameState();
      if (!gameState) {
        return { success: false, error: 'No active game' };
      }

      const action: GameAction = {
        type: 'equipItem',
        payload: { itemId, slot }
      };

      await this.syncManager.executeAction('equipItem', { itemId, slot }, action);

      const gameId = this.syncManager.getGameId();
      if (gameId) {
        await addGameLog(gameId, 'ItemEquipped', `equipped ${itemId} to ${slot}`, { itemId, slot });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async swapItems(fromLocation: string, toLocation: string): Promise<ActionResult> {
    try {
      const gameState = this.syncManager.getGameState();
      if (!gameState) {
        return { success: false, error: 'No active game' };
      }

      const action: GameAction = {
        type: 'swapEquipment',
        payload: { fromLocation, toLocation }
      };

      await this.syncManager.executeAction('swapEquipment', { fromLocation, toLocation }, action);

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async dropItem(itemId: string): Promise<ActionResult> {
    try {
      const gameState = this.syncManager.getGameState();
      if (!gameState) {
        return { success: false, error: 'No active game' };
      }

      const action: GameAction = {
        type: 'dropItem',
        payload: { itemId }
      };

      await this.syncManager.executeAction('dropItem', { itemId }, action);

      const gameId = this.syncManager.getGameId();
      if (gameId) {
        await addGameLog(gameId, 'ItemDropped', `dropped ${itemId}`, { itemId });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async pickUpItem(itemId: string): Promise<ActionResult> {
    try {
      const gameState = this.syncManager.getGameState();
      if (!gameState) {
        return { success: false, error: 'No active game' };
      }

      const action: GameAction = {
        type: 'pickUpDropped',
        payload: { itemId }
      };

      await this.syncManager.executeAction('pickUpDropped', { itemId }, action);

      const gameId = this.syncManager.getGameId();
      if (gameId) {
        await addGameLog(gameId, 'ItemPickedUp', `picked up ${itemId}`, { itemId });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async endTurn(): Promise<ActionResult> {
    try {
      const gameState = this.syncManager.getGameState();
      if (!gameState) {
        return { success: false, error: 'No active game' };
      }

      const user = getCurrentUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const currentPlayer = gameState.players[user.uid];

      const action: GameAction = {
        type: 'endTurn',
        payload: {}
      };

      await this.syncManager.executeAction('endTurn', {}, action);

      const gameId = this.syncManager.getGameId();
      if (gameId) {
        await addGameLog(gameId, 'TurnEnded', `${currentPlayer?.nickname} ended their turn`, {});
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async continuePhase(): Promise<ActionResult> {
    try {
      const gameState = this.syncManager.getGameState();
      console.log('[ActionHandlers] continuePhase - phase:', gameState?.phase);

      if (!gameState) {
        return { success: false, error: 'No active game' };
      }

      // For phases that need automatic progression, we simply end the turn
      // The engine will handle the proper phase transitions
      // All phases that need to continue use endTurn to progress
      switch (gameState.phase) {
        case 'turnStart':
        case 'manage':
        case 'preDuel':
        case 'resolveTile':
        case 'capacity':
        case 'endTurn':
          const action: GameAction = {
            type: 'endTurn',
            payload: {}
          };
          await this.syncManager.executeAction('endTurn', {}, action);
          return { success: true };

        default:
          return { success: false, error: `Cannot continue from phase: ${gameState.phase}` };
      }
    } catch (error) {
      console.error('[ActionHandlers] continuePhase error:', error);
      return { success: false, error: (error as Error).message };
    }
  }
}

// Singleton instance
let actionHandlersInstance: ActionHandlers | null = null;

export function getActionHandlers(): ActionHandlers {
  if (!actionHandlersInstance) {
    actionHandlersInstance = new ActionHandlers();
  }
  return actionHandlersInstance;
}