/**
 * useCombat Hook
 * Handles all combat-related operations
 */

import type { GameState, Player, Item, Enemy } from '../../../types';
import { executeCombatRound, endCombat, startCombat } from '../../../state/gameSlice';

interface UseCombatParams {
  gameState: GameState;
  playerId: string;
  currentPlayer: Player;
  setShowCombat: (show: boolean) => void;
  setCombatEnemies: (enemies: Enemy[]) => void;
  setDefeatedPlayerId: (id: string | null) => void;
  setShowLootingModal: (show: boolean) => void;
  setShowCardReveal: (show: boolean) => void;
  setPendingItems: (items: Item[]) => void;
  setShowInventoryFull: (show: boolean) => void;
  revealCardType: 'treasure' | 'enemy' | 'luck' | null;
  combatEnemies: Enemy[];
  pendingItems: Item[];
  addItemToInventory: (items: Item[]) => { inventory: (Item | null)[]; added: Item[]; overflow: Item[] };
  handleInventoryUpdate: (inventory: (Item | null)[]) => Promise<void>;
}

export function useCombat({
  gameState,
  playerId,
  currentPlayer,
  setShowCombat,
  setCombatEnemies,
  setDefeatedPlayerId,
  setShowLootingModal,
  setShowCardReveal,
  setPendingItems,
  setShowInventoryFull,
  revealCardType,
  combatEnemies,
  pendingItems,
  addItemToInventory,
  handleInventoryUpdate,
}: UseCombatParams) {
  /**
   * Handle attack action in combat
   */
  const handleCombatAttack = async (targetId?: string) => {
    try {
      await executeCombatRound(gameState.lobbyCode, targetId);
    } catch (error) {
      console.error('Combat round error:', error);
    }
  };

  /**
   * Handle combat retreat
   */
  const handleCombatRetreat = async () => {
    await endCombat(gameState.lobbyCode, true);
    setShowCombat(false);
    setCombatEnemies([]);
  };

  /**
   * Handle combat end (victory or defeat)
   */
  const handleCombatEnd = async () => {
    // Check if it was PvP combat
    const combat = gameState.combat;
    if (combat && combat.defenders.length > 0) {
      const firstDefender = combat.defenders[0];
      const isPvP = 'nickname' in firstDefender;

      if (isPvP) {
        // Check if player won (defender defeated)
        const defenderDefeated = combat.defenders.every(d => d.hp === 0);
        const playerDefeated = currentPlayer.hp === 0;

        if (defenderDefeated && !playerDefeated) {
          // Player won - show looting interface
          const defeatedId = combat.defenders[0].id;
          setDefeatedPlayerId(defeatedId);
          setShowCombat(false);
          setShowLootingModal(true);
          return;
        }
      }
    }

    // PvE combat or player lost - get loot and end
    const loot = await endCombat(gameState.lobbyCode, false);

    setShowCombat(false);
    setCombatEnemies([]);

    // If there's loot, try to add to inventory
    if (loot.length > 0) {
      const result = addItemToInventory(loot);

      if (result.overflow.length > 0) {
        setPendingItems(loot);
        setShowInventoryFull(true);
      } else {
        await handleInventoryUpdate(result.inventory);
      }
    }
  };

  /**
   * Handle card reveal modal close
   */
  const handleCardRevealClose = async () => {
    setShowCardReveal(false);

    // If it was an enemy reveal, start combat
    if (revealCardType === 'enemy' && combatEnemies.length > 0) {
      await startCombat(gameState.lobbyCode, playerId, combatEnemies, true);
      setShowCombat(true);
    }

    // If it was a treasure reveal, try to add to inventory
    if (revealCardType === 'treasure' && pendingItems.length > 0) {
      const result = addItemToInventory(pendingItems);

      if (result.overflow.length > 0) {
        // Inventory full - show discard modal
        setShowInventoryFull(true);
      } else {
        // All items fit - update inventory with the modified inventory array
        handleInventoryUpdate(result.inventory);
      }
    }
  };

  /**
   * Handle finishing looting from defeated player
   */
  const handleLootingFinish = async () => {
    // Check if this was post-combat looting (combat state exists) or on-tile looting
    if (gameState.combat && gameState.combat.isActive) {
      // Post-combat looting - end combat
      await endCombat(gameState.lobbyCode, false);
    }
    // For on-tile looting, just close modal (no combat to end)
    setShowLootingModal(false);
    setDefeatedPlayerId(null);
  };

  return {
    handleCombatAttack,
    handleCombatRetreat,
    handleCombatEnd,
    handleCardRevealClose,
    handleLootingFinish,
  };
}
