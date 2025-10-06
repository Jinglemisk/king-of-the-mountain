/**
 * useEquipmentManagement Hook
 * Handles all equipment-related operations
 */

import type { GameState, Item, Player } from '../../../types';
import { updateGameState, updateGameStateWithLog, addLog } from '../../../state/gameSlice';
import { normalizeInventory } from '../../../utils/inventory';

interface UseEquipmentManagementParams {
  gameState: GameState;
  playerId: string;
  currentPlayer: Player;
  draggedItem: { item: Item; source: string } | null;
  setDraggedItem: (item: { item: Item; source: string } | null) => void;
}

export function useEquipmentManagement({
  gameState,
  playerId,
  currentPlayer,
  draggedItem,
  setDraggedItem,
}: UseEquipmentManagementParams) {
  /**
   * Validation: Check if an item can be equipped in a specific slot
   */
  const canEquipItemInSlot = (item: Item, slot: 'holdable1' | 'holdable2' | 'wearable'): boolean => {
    // Small items (consumables) cannot be equipped
    if (item.category === 'small') {
      return false;
    }

    // Holdable items (weapons, shields) can only go in hand slots
    if (item.category === 'holdable' && (slot === 'holdable1' || slot === 'holdable2')) {
      return true;
    }

    // Wearable items (armor, cloaks) can only go in armor slot
    if (item.category === 'wearable' && slot === 'wearable') {
      return true;
    }

    return false;
  };

  /**
   * Handle equipping an item from inventory to equipment slot
   */
  const handleEquipItem = async (
    item: Item,
    inventoryIndex: number,
    equipmentSlot: 'holdable1' | 'holdable2' | 'wearable'
  ) => {
    // Validate the item can be equipped in this slot
    if (!canEquipItemInSlot(item, equipmentSlot)) {
      return;
    }

    const equipment = currentPlayer.equipment || { holdable1: null, holdable2: null, wearable: null };
    const inventory = currentPlayer.inventory ? [...currentPlayer.inventory] : [null, null, null, null];

    // Check if the equipment slot is already occupied
    const currentlyEquippedItem = equipment[equipmentSlot];

    let logMessage: string;
    // If slot is occupied, swap items (move equipped item to inventory)
    if (currentlyEquippedItem) {
      inventory[inventoryIndex] = currentlyEquippedItem;
      logMessage = `${currentPlayer.nickname} swapped ${currentlyEquippedItem.name} with ${item.name} in ${equipmentSlot === 'wearable' ? 'Armor' : equipmentSlot === 'holdable1' ? 'Hand 1' : 'Hand 2'}`;
    } else {
      // Slot is empty, just remove from inventory
      inventory[inventoryIndex] = null;
      logMessage = `${currentPlayer.nickname} equipped ${item.name} in ${equipmentSlot === 'wearable' ? 'Armor' : equipmentSlot === 'holdable1' ? 'Hand 1' : 'Hand 2'}`;
    }

    // Update equipment
    const updatedEquipment = {
      ...equipment,
      [equipmentSlot]: item,
    };

    // Update Firebase with normalized inventory and log in single operation
    await updateGameStateWithLog(
      gameState.lobbyCode,
      {
        [`players/${playerId}/equipment`]: updatedEquipment,
        [`players/${playerId}/inventory`]: normalizeInventory(inventory, currentPlayer.class),
      },
      'action',
      logMessage,
      gameState.logs,
      playerId
    );
  };

  /**
   * Handle unequipping an item from equipment slot to inventory
   */
  const handleUnequipItem = async (
    item: Item,
    equipmentSlot: 'holdable1' | 'holdable2' | 'wearable'
  ) => {
    const equipment = currentPlayer.equipment || { holdable1: null, holdable2: null, wearable: null };
    const inventory = currentPlayer.inventory ? [...currentPlayer.inventory] : [null, null, null, null];

    // Find first empty inventory slot
    const emptySlotIndex = inventory.findIndex(slot => slot === null);

    if (emptySlotIndex === -1) {
      // No space in inventory - cannot unequip
      await addLog(
        gameState.lobbyCode,
        'action',
        `${currentPlayer.nickname} tried to unequip ${item.name} but inventory is full!`,
        playerId
      );
      return;
    }

    // Move item to inventory
    inventory[emptySlotIndex] = item;

    // Clear equipment slot
    const updatedEquipment = {
      ...equipment,
      [equipmentSlot]: null,
    };

    // Update Firebase with normalized inventory and log in single operation
    await updateGameStateWithLog(
      gameState.lobbyCode,
      {
        [`players/${playerId}/equipment`]: updatedEquipment,
        [`players/${playerId}/inventory`]: normalizeInventory(inventory, currentPlayer.class),
      },
      'action',
      `${currentPlayer.nickname} unequipped ${item.name} to inventory`,
      gameState.logs,
      playerId
    );
  };

  /**
   * Handle swapping items between two equipment slots
   */
  const handleSwapEquippedItems = async (
    fromSlot: 'holdable1' | 'holdable2' | 'wearable',
    toSlot: 'holdable1' | 'holdable2' | 'wearable'
  ) => {
    const equipment = currentPlayer.equipment || { holdable1: null, holdable2: null, wearable: null };
    const fromItem = equipment[fromSlot];
    const toItem = equipment[toSlot];

    if (!fromItem) return;

    // Validate the item can be equipped in the target slot
    if (!canEquipItemInSlot(fromItem, toSlot)) {
      return;
    }

    // Swap items
    const updatedEquipment = {
      ...equipment,
      [fromSlot]: toItem,
      [toSlot]: fromItem,
    };

    // Update Firebase and log in single operation
    await updateGameStateWithLog(
      gameState.lobbyCode,
      {
        [`players/${playerId}/equipment`]: updatedEquipment,
      },
      'action',
      `${currentPlayer.nickname} swapped ${fromItem.name} between equipment slots`,
      gameState.logs,
      playerId
    );
  };

  /**
   * Handle dropping an item onto an equipment slot
   */
  const handleDropOnEquipment = async (
    e: React.DragEvent,
    equipmentSlot: 'holdable1' | 'holdable2' | 'wearable'
  ) => {
    e.preventDefault();

    if (!draggedItem) return;

    const { item, source } = draggedItem;

    // Determine if dragging from inventory or equipment
    if (source.startsWith('inventory-')) {
      // Dragging from inventory to equipment
      const inventoryIndex = parseInt(source.replace('inventory-', ''));
      await handleEquipItem(item, inventoryIndex, equipmentSlot);
    } else if (source.startsWith('equipment-')) {
      // Dragging from equipment to equipment (swap)
      const fromSlot = source.replace('equipment-', '') as 'holdable1' | 'holdable2' | 'wearable';
      await handleSwapEquippedItems(fromSlot, equipmentSlot);
    }

    setDraggedItem(null);
  };

  return {
    canEquipItemInSlot,
    handleEquipItem,
    handleUnequipItem,
    handleSwapEquippedItems,
    handleDropOnEquipment,
  };
}
