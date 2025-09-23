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
    try {
      const gameState = this.syncManager.getGameState();
      if (!gameState) {
        return { success: false, error: 'No active game' };
      }

      const action: GameAction = {
        type: 'CHOOSE_MOVE_OR_SLEEP',
        payload: { choice }
      };

      await this.syncManager.executeAction('ChooseMoveOrSleep', { choice }, action);

      // Log the action
      const gameId = this.syncManager.getGameId();
      if (gameId) {
        const message = choice === 'move' ? 'chose to move' : 'chose to sleep';
        await addGameLog(gameId, 'MoveChoice', message, { choice });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async rollMovement(): Promise<ActionResult> {
    try {
      const gameState = this.syncManager.getGameState();
      if (!gameState) {
        return { success: false, error: 'No active game' };
      }

      const action: GameAction = {
        type: 'ROLL_MOVEMENT',
        payload: {}
      };

      await this.syncManager.executeAction('RollMovement', {}, action);

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
        type: 'CHOOSE_BRANCH',
        payload: { targetNodeId }
      };

      await this.syncManager.executeAction('ChooseBranch', { targetNodeId }, action);

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
        type: 'RESOLVE_TILE',
        payload: {}
      };

      await this.syncManager.executeAction('ResolveTile', {}, action);

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
        type: 'START_COMBAT',
        payload: { enemyIds }
      };

      await this.syncManager.executeAction('StartCombat', { enemyIds }, action);

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
        type: 'ROLL_COMBAT',
        payload: { targetEnemyId }
      };

      await this.syncManager.executeAction('RollCombat', { targetEnemyId }, action);

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
        type: 'RETREAT',
        payload: {}
      };

      await this.syncManager.executeAction('Retreat', {}, action);

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
        type: 'OFFER_DUEL',
        payload: { targetPlayerId }
      };

      await this.syncManager.executeAction('OfferDuel', { targetPlayerId }, action);

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
        type: 'ACCEPT_DUEL',
        payload: { duelId }
      };

      await this.syncManager.executeAction('AcceptDuel', { duelId }, action);

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
        type: 'DECLINE_DUEL',
        payload: { duelId }
      };

      await this.syncManager.executeAction('DeclineDuel', { duelId }, action);

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
        type: 'USE_ITEM',
        payload: { itemId, target }
      };

      await this.syncManager.executeAction('UseItem', { itemId, target }, action);

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
        type: 'EQUIP_ITEM',
        payload: { itemId, slot }
      };

      await this.syncManager.executeAction('EquipItem', { itemId, slot }, action);

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
        type: 'SWAP_ITEMS',
        payload: { fromLocation, toLocation }
      };

      await this.syncManager.executeAction('SwapItems', { fromLocation, toLocation }, action);

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
        type: 'DROP_ITEM',
        payload: { itemId }
      };

      await this.syncManager.executeAction('DropItem', { itemId }, action);

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
        type: 'PICK_UP_ITEM',
        payload: { itemId }
      };

      await this.syncManager.executeAction('PickUpItem', { itemId }, action);

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
        type: 'END_TURN',
        payload: {}
      };

      await this.syncManager.executeAction('EndTurn', {}, action);

      const gameId = this.syncManager.getGameId();
      if (gameId) {
        await addGameLog(gameId, 'TurnEnded', `${currentPlayer?.nickname} ended their turn`, {});
      }

      return { success: true };
    } catch (error) {
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