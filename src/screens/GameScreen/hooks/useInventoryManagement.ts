/**
 * useInventoryManagement Hook
 * Handles all inventory-related operations
 */

import type { GameState, Item, Player } from '../../../types';
import { updateGameState, addLog } from '../../../state/gameSlice';
import { normalizeInventory } from '../../../utils/inventory';

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

    await updateGameState(gameState.lobbyCode, {
      [`players/${playerId}/inventory`]: normalizedInventory,
    });

    await addLog(
      gameState.lobbyCode,
      'action',
      `${currentPlayer.nickname} added item(s) to inventory`,
      playerId
    );

    setPendingItems([]);
  };

  /**
   * Handle inventory full modal - player selected which items to keep
   */
  const handleInventoryDiscard = async (itemsToKeep: (Item | null)[]) => {
    await updateGameState(gameState.lobbyCode, {
      [`players/${playerId}/inventory`]: normalizeInventory(itemsToKeep, currentPlayer.class),
    });

    await addLog(
      gameState.lobbyCode,
      'action',
      `${currentPlayer.nickname} reorganized inventory`,
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

    // Update Firebase with normalized inventory
    await updateGameState(gameState.lobbyCode, {
      [`players/${playerId}/inventory`]: normalizeInventory(inventory, currentPlayer.class),
      tiles: updatedTiles,
    });

    await addLog(
      gameState.lobbyCode,
      'action',
      `${currentPlayer.nickname} placed a Trap on tile ${currentPlayer.position}! ⚠️`,
      playerId,
      true
    );
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
    handleDropOnInventory,
  };
}
