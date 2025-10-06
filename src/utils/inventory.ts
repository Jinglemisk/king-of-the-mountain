/**
 * Inventory management utilities
 */

import type { Item, Player } from '../types';

/**
 * Normalize inventory array to ensure correct number of slots
 * Ensures inventory always has proper length, padding with null if needed
 * @param inventory - Current inventory array (may be incomplete or empty)
 * @param playerClass - Player's class (Porter gets 5 slots, others get 4)
 * @returns Normalized inventory array with proper length
 */
export function normalizeInventory(
  inventory: (Item | null)[] | undefined | null,
  playerClass: Player['class']
): (Item | null)[] {
  const maxSlots = playerClass === 'Porter' ? 5 : 4;
  const currentInventory = inventory || [];

  // Create array with max slots, preserving existing items
  const normalized: (Item | null)[] = [];
  for (let i = 0; i < maxSlots; i++) {
    normalized[i] = currentInventory[i] || null;
  }

  return normalized;
}
