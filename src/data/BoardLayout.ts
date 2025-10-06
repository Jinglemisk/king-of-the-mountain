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
  totalTiles: 20,           // Total number of tiles on the board
  startTileIndex: 0,        // Starting position (always first tile)
  finalTileIndex: 19,       // Winning position (always last tile)
  sanctuaryTiles: [7, 9, 17], // Safe tiles where no duels are allowed
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
 * Layout visualization (4 rows of 5 tiles):
 * Row 1: [0-4]   Start → Treasure1 → Treasure1 → Luck → Luck
 * Row 2: [5-9]   Treasure2 → Treasure2 → Sanctuary → Treasure1 → Sanctuary
 * Row 3: [10-14] Luck → Treasure3 → Treasure2 → Luck → Luck
 * Row 4: [15-19] Treasure3 → Treasure1 → Sanctuary → Treasure3 → Final
 *
 * Original layout had enemy tiles at positions: 2, 4, 6, 9, 11, 13, 16
 * These have been replaced with treasure and luck tiles for variety
 */
export const BOARD_PATTERN: TileType[] = [
  'start',      // 0  - Starting tile
  'treasure1',  // 1  - Tier 1 treasure
  'treasure1',  // 2  - Tier 1 treasure (was enemy1)
  'luck',       // 3  - Luck card
  'luck',       // 4  - Luck card (was enemy1)
  'treasure2',  // 5  - Tier 2 treasure
  'treasure2',  // 6  - Tier 2 treasure (was enemy2)
  'sanctuary',  // 7  - Safe sanctuary
  'treasure1',  // 8  - Tier 1 treasure
  'sanctuary',  // 9  - Safe sanctuary (was enemy2)
  'luck',       // 10 - Luck card
  'treasure3',  // 11 - Tier 3 treasure (was enemy2)
  'treasure2',  // 12 - Tier 2 treasure
  'luck',       // 13 - Luck card (was enemy3)
  'luck',       // 14 - Luck card
  'treasure3',  // 15 - Tier 3 treasure
  'treasure1',  // 16 - Tier 1 treasure (was enemy3)
  'sanctuary',  // 17 - Safe sanctuary
  'treasure3',  // 18 - Tier 3 treasure
  'final',      // 19 - Final/winning tile
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
 * @param position - Tile position (0-19)
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
