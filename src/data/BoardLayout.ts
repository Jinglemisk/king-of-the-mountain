/**
 * Board Layout Configuration
 * Centralized configuration for the game board layout
 * Edit this file to easily adjust tile count, types, and positions
 */

import type { Tile, TileType } from '../types';

// ============================================================================
// BOARD CONFIGURATION
// ============================================================================

/**
 * Core board settings
 * Adjust these values to change board size and key positions
 */
export const BOARD_CONFIG = {
  totalTiles: 40,           // Total number of tiles on the board
  startTileIndex: 0,        // Starting position (always first tile)
  finalTileIndex: 39,       // Winning position (always last tile)
  sanctuaryTiles: [],       // Safe tiles where no duels are allowed
};

// ============================================================================
// TILE DISTRIBUTION (AUTO-CALCULATED)
// ============================================================================

/**
 * Calculate tile distribution from the pattern
 * This is automatically computed from BOARD_PATTERN - no manual maintenance needed!
 * @returns Object with counts of each tile type
 */
export function getTileDistribution(): Record<TileType, number> {
  const distribution: Partial<Record<TileType, number>> = {};

  BOARD_PATTERN.forEach(type => {
    distribution[type] = (distribution[type] || 0) + 1;
  });

  return distribution as Record<TileType, number>;
}

// ============================================================================
// BOARD PATTERN
// ============================================================================

/**
 * Complete board layout pattern (left to right, top to bottom)
 *
 * Layout visualization (8 rows of 5 tiles):
 * Row 1: [0-4]   Start → Treasure1 → Luck → Treasure2 → Luck
 * Row 2: [5-9]   Treasure1 → Luck → Treasure3 → Treasure2 → Luck
 * Row 3: [10-14] Treasure1 → Luck → Treasure2 → Treasure3 → Luck
 * Row 4: [15-19] Treasure1 → Luck → Treasure3 → Treasure2 → Luck
 * Row 5: [20-24] Treasure1 → Luck → Treasure2 → Treasure3 → Luck
 * Row 6: [25-29] Treasure1 → Luck → Treasure3 → Treasure2 → Luck
 * Row 7: [30-34] Treasure1 → Luck → Treasure2 → Treasure3 → Luck
 * Row 8: [35-39] Treasure1 → Luck → Treasure2 → Treasure3 → Final
 *
 * Board filled with luck and treasure tiles for variety
 */
export const BOARD_PATTERN: TileType[] = [
  'start',      // 0  - Starting tile
  'enemy1',  // 1  - Tier 1 treasure
  'enemy1',       // 2  - Luck card
  'enemy1',  // 3  - Tier 2 treasure
  'enemy1',       // 4  - Luck card
  'enemy1',  // 5  - Tier 1 treasure
  'enemy1',       // 6  - Luck card
  'treasure3',  // 7  - Tier 3 treasure
  'treasure2',  // 8  - Tier 2 treasure
  'luck',       // 9  - Luck card
  'treasure1',  // 10 - Tier 1 treasure
  'luck',       // 11 - Luck card
  'treasure2',  // 12 - Tier 2 treasure
  'treasure3',  // 13 - Tier 3 treasure
  'luck',       // 14 - Luck card
  'treasure1',  // 15 - Tier 1 treasure
  'luck',       // 16 - Luck card
  'treasure3',  // 17 - Tier 3 treasure
  'treasure2',  // 18 - Tier 2 treasure
  'luck',       // 19 - Luck card
  'treasure1',  // 20 - Tier 1 treasure
  'luck',       // 21 - Luck card
  'treasure2',  // 22 - Tier 2 treasure
  'treasure3',  // 23 - Tier 3 treasure
  'luck',       // 24 - Luck card
  'treasure1',  // 25 - Tier 1 treasure
  'luck',       // 26 - Luck card
  'treasure3',  // 27 - Tier 3 treasure
  'treasure2',  // 28 - Tier 2 treasure
  'luck',       // 29 - Luck card
  'treasure1',  // 30 - Tier 1 treasure
  'luck',       // 31 - Luck card
  'treasure2',  // 32 - Tier 2 treasure
  'treasure3',  // 33 - Tier 3 treasure
  'luck',       // 34 - Luck card
  'treasure1',  // 35 - Tier 1 treasure
  'luck',       // 36 - Luck card
  'treasure2',  // 37 - Tier 2 treasure
  'treasure3',  // 38 - Tier 3 treasure
  'final',      // 39 - Final/winning tile
];

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate that the board layout configuration is correct
 * Checks for consistency between pattern, config, and distribution
 * @returns True if valid, throws error if invalid
 */
export function validateBoardLayout(): boolean {
  // Check pattern length matches total tiles
  if (BOARD_PATTERN.length !== BOARD_CONFIG.totalTiles) {
    throw new Error(
      `Board pattern length (${BOARD_PATTERN.length}) does not match total tiles (${BOARD_CONFIG.totalTiles})`
    );
  }

  // Check start tile is at correct position
  if (BOARD_PATTERN[BOARD_CONFIG.startTileIndex] !== 'start') {
    throw new Error(
      `Start tile must be at position ${BOARD_CONFIG.startTileIndex}`
    );
  }

  // Check final tile is at correct position
  if (BOARD_PATTERN[BOARD_CONFIG.finalTileIndex] !== 'final') {
    throw new Error(
      `Final tile must be at position ${BOARD_CONFIG.finalTileIndex}`
    );
  }

  // Check sanctuary tiles are at correct positions
  for (const sanctuaryPos of BOARD_CONFIG.sanctuaryTiles) {
    if (BOARD_PATTERN[sanctuaryPos] !== 'sanctuary') {
      throw new Error(
        `Sanctuary tile expected at position ${sanctuaryPos}`
      );
    }
  }

  // Validation passes - distribution is auto-calculated from pattern
  // No need to validate counts since pattern is the single source of truth

  return true;
}

// ============================================================================
// GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate the game board tiles from the configured pattern
 * This replaces the old hardcoded generateTiles() function
 * @returns Array of Tile objects for the game board
 */
export function generateBoardTiles(): Tile[] {
  // Validate before generating
  validateBoardLayout();

  // Map pattern to Tile objects
  return BOARD_PATTERN.map((type, id) => ({
    id,
    type
  }));
}

/**
 * Get tile information by position
 * @param position - Tile position (0-39)
 * @returns Tile object at that position, or null if invalid
 */
export function getTileByPosition(position: number): Tile | null {
  if (position < 0 || position >= BOARD_CONFIG.totalTiles) {
    return null;
  }

  return {
    id: position,
    type: BOARD_PATTERN[position],
  };
}

/**
 * Get all positions of a specific tile type
 * @param tileType - The tile type to search for
 * @returns Array of positions where this tile type exists
 */
export function getPositionsOfType(tileType: TileType): number[] {
  const positions: number[] = [];
  BOARD_PATTERN.forEach((type, index) => {
    if (type === tileType) {
      positions.push(index);
    }
  });
  return positions;
}

/**
 * Check if a position is a sanctuary tile
 * @param position - Tile position to check
 * @returns True if position is a sanctuary
 */
export function isSanctuaryTile(position: number): boolean {
  return BOARD_CONFIG.sanctuaryTiles.includes(position);
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export everything for easy access
export default {
  BOARD_CONFIG,
  BOARD_PATTERN,
  getTileDistribution,
  validateBoardLayout,
  generateBoardTiles,
  getTileByPosition,
  getPositionsOfType,
  isSanctuaryTile,
};
