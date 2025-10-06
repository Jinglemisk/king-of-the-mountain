/**
 * useInventoryManagement Hook
 * Handles all inventory-related operations
 */

import type { GameState, Item, Player } from '../../../types';
import { updateGameState, updateGameStateWithLog, addLog, drawCards, drawLuckCard, startCombat } from '../../../state/gameSlice';
import { normalizeInventory } from '../../../utils/inventory';
import { executeEffect } from '../../../services/effectExecutor';

interface UseInventoryManagementParams {
  gameState: GameState;
  playerId: string;
  currentPlayer: Player;
  setPendingItems: (items: Item[]) => void;
  setShowInventoryFull: (show: boolean) => void;
  draggedItem: { item: Item; source: string } | null;
  setDraggedItem: (item: { item: Item; source: string } | null) => void;
  handleUnequipItem: (item: Item, equipmentSlot: 'holdable1' | 'holdable2' | 'wearable') => Promise<void>;
}

export function useInventoryManagement({
  gameState,
  playerId,
  currentPlayer,
  setPendingItems,
  setShowInventoryFull,
  draggedItem,
  setDraggedItem,
  handleUnequipItem,
}: UseInventoryManagementParams) {
  /**
   * Add items to inventory, handling overflow
   */
  const addItemToInventory = (items: Item[]): { inventory: (Item | null)[]; added: Item[]; overflow: Item[] } => {
    // Normalize inventory to ensure proper slot count
    const inventory = normalizeInventory(currentPlayer.inventory, currentPlayer.class);

    const added: Item[] = [];
    const overflow: Item[] = [];

    for (const item of items) {
      // Find first null/empty slot
      const emptyIndex = inventory.findIndex(slot => slot === null);
      if (emptyIndex !== -1) {
        inventory[emptyIndex] = item;
        added.push(item);
      } else {
        // All slots full - item overflows
        overflow.push(item);
      }
    }

    return { inventory, added, overflow };
  };

  /**
   * Update inventory in Firebase
   */
  const handleInventoryUpdate = async (inventory: (Item | null)[]) => {
    // Normalize before saving to ensure proper slot count
    const normalizedInventory = normalizeInventory(inventory, currentPlayer.class);

    // Update inventory and log in single operation
    await updateGameStateWithLog(
      gameState.lobbyCode,
      {
        [`players/${playerId}/inventory`]: normalizedInventory,
      },
      'action',
      `${currentPlayer.nickname} added item(s) to inventory`,
      gameState.logs,
      playerId
    );

    setPendingItems([]);
  };

  /**
   * Handle inventory full modal - player selected which items to keep
   */
  const handleInventoryDiscard = async (itemsToKeep: (Item | null)[]) => {
    // Update inventory and log in single operation
    await updateGameStateWithLog(
      gameState.lobbyCode,
      {
        [`players/${playerId}/inventory`]: normalizeInventory(itemsToKeep, currentPlayer.class),
      },
      'action',
      `${currentPlayer.nickname} reorganized inventory`,
      gameState.logs,
      playerId
    );

    setShowInventoryFull(false);
    setPendingItems([]);
  };

  /**
   * Handle using a Trap item - place it on current tile
   */
  const handleUseTrap = async (item: Item, inventoryIndex: number) => {
    if (item.special !== 'trap') return;

    const currentTile = gameState.tiles[currentPlayer.position];

    // Cannot place trap on Start or Sanctuary tiles
    if (currentTile.type === 'start' || currentTile.type === 'sanctuary') {
      await addLog(
        gameState.lobbyCode,
        'action',
        `${currentPlayer.nickname} cannot place a trap on ${currentTile.type} tiles!`,
        playerId
      );
      return;
    }

    // Cannot place trap if tile already has a trap
    if (currentTile.hasTrap) {
      await addLog(
        gameState.lobbyCode,
        'action',
        `${currentPlayer.nickname} cannot place a trap here - there's already one!`,
        playerId
      );
      return;
    }

    // Remove trap from inventory
    const inventory = normalizeInventory(currentPlayer.inventory, currentPlayer.class);
    inventory[inventoryIndex] = null;

    // Update tile with trap
    const updatedTiles = [...gameState.tiles];
    updatedTiles[currentPlayer.position] = {
      ...currentTile,
      hasTrap: true,
      trapOwnerId: playerId,
    };

    // Update inventory, tile, and log in single operation
    await updateGameStateWithLog(
      gameState.lobbyCode,
      {
        [`players/${playerId}/inventory`]: normalizeInventory(inventory, currentPlayer.class),
        tiles: updatedTiles,
      },
      'action',
      `${currentPlayer.nickname} placed a Trap on tile ${currentPlayer.position}! ⚠️`,
      gameState.logs,
      playerId,
      true
    );
  };

  /**
   * Handle using a consumable item (potions, scrolls, etc.)
   */
  const handleUseItem = async (item: Item, inventoryIndex: number) => {
    if (!item.isConsumable || !item.special) return;

    // Trap has its own handler
    if (item.special === 'trap') {
      return handleUseTrap(item, inventoryIndex);
    }

    // Execute the item's effect
    const result = await executeEffect(item.special, {
      gameState,
      lobbyCode: gameState.lobbyCode,
      playerId,
      itemId: item.id,
      updateGameState: (updates) => updateGameState(gameState.lobbyCode, updates),
      addLog: (type, message, pid, important) => addLog(gameState.lobbyCode, type, message, pid, important, gameState.logs),
      drawCards: (deckType, tier, count) => drawCards(gameState.lobbyCode, deckType, tier, count),
      drawLuckCard: () => drawLuckCard(gameState.lobbyCode),
      startCombat: (attackerId, defenders, canRetreat) => startCombat(gameState.lobbyCode, attackerId, defenders, canRetreat),
      resolveTile: async () => {
        // No-op for consumable items used outside of movement
        // Items used during movement will have proper tile resolution
      },
    });

    if (result.success) {
      // Remove consumed item from inventory
      const inventory = normalizeInventory(currentPlayer.inventory, currentPlayer.class);
      inventory[inventoryIndex] = null;

      const updates: any = {
        [`players/${playerId}/inventory`]: normalizeInventory(inventory, currentPlayer.class),
      };

      // Handle items that return to deck bottom (Luck Charm, Smoke Bomb)
      if (result.data?.requiresReturn && result.data?.returnDeck) {
        const deckKey = result.data.returnDeck;
        const currentDeck = gameState[deckKey as keyof typeof gameState] as any[];

        // Add item to bottom of deck
        if (Array.isArray(currentDeck)) {
          updates[deckKey] = [...currentDeck, item];
        }
      }

      await updateGameState(gameState.lobbyCode, updates);
    }
  };

  /**
   * Handle dropping an item onto the inventory area
   */
  const handleDropOnInventory = async (e: React.DragEvent) => {
    e.preventDefault();

    if (!draggedItem) return;

    const { item, source } = draggedItem;

    // Only handle unequipping from equipment to inventory
    if (source.startsWith('equipment-')) {
      const equipmentSlot = source.replace('equipment-', '') as 'holdable1' | 'holdable2' | 'wearable';
      await handleUnequipItem(item, equipmentSlot);
    }

    setDraggedItem(null);
  };

  return {
    addItemToInventory,
    handleInventoryUpdate,
    handleInventoryDiscard,
    handleUseTrap,
    handleUseItem,
    handleDropOnInventory,
  };
}
