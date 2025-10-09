/**
 * Combat Persistence Layer
 *
 * Handles all Firebase operations for combat system.
 * This module is responsible for reading/writing combat state to the database.
 * Contains NO game logic - only data persistence.
 */

import { ref, update, get } from 'firebase/database';
import { database } from '../../lib/firebase';
import type { GameState, CombatState, CombatLogEntry, Enemy, Item } from '../../types';
import { drawCards } from '../../state/gameSlice';

/**
 * Get current game state from Firebase
 * @param lobbyCode - The lobby code
 * @returns Current game state
 */
export async function getGameState(lobbyCode: string): Promise<GameState> {
  const gameRef = ref(database, `games/${lobbyCode}`);
  const snapshot = await get(gameRef);
  return snapshot.val() as GameState;
}

/**
 * Update combat state in Firebase
 * @param lobbyCode - The lobby code
 * @param combat - Updated combat state
 */
export async function updateCombatState(
  lobbyCode: string,
  combat: CombatState | null
): Promise<void> {
  const gameRef = ref(database, `games/${lobbyCode}`);
  await update(gameRef, { combat });
}

/**
 * Update combat log and combat state
 * @param lobbyCode - The lobby code
 * @param combat - Updated combat state
 * @param newLogEntry - New combat log entry to append
 */
export async function appendCombatLog(
  lobbyCode: string,
  combat: CombatState,
  newLogEntry: CombatLogEntry
): Promise<void> {
  const gameRef = ref(database, `games/${lobbyCode}`);
  const updatedCombat: CombatState = {
    ...combat,
    currentRound: newLogEntry.round,
    combatLog: [...(combat.combatLog || []), newLogEntry],
  };

  await update(gameRef, { combat: updatedCombat });
}

/**
 * Update player HP and special flags in Firebase
 * @param lobbyCode - The lobby code
 * @param playerId - The player ID
 * @param updates - Object with HP and optional special ability flags
 */
export async function updatePlayerCombatStats(
  lobbyCode: string,
  playerId: string,
  updates: {
    hp: number;
    specialAbilityUsed?: boolean;
    tempEffects?: any[];
    skipNextTileEffect?: boolean;
  }
): Promise<void> {
  const gameRef = ref(database, `games/${lobbyCode}`);
  const updateObject: any = {
    [`players/${playerId}/hp`]: updates.hp,
  };

  if (updates.specialAbilityUsed !== undefined) {
    updateObject[`players/${playerId}/specialAbilityUsed`] = updates.specialAbilityUsed;
  }

  if (updates.tempEffects !== undefined) {
    updateObject[`players/${playerId}/tempEffects`] = updates.tempEffects;
  }

  if (updates.skipNextTileEffect !== undefined) {
    updateObject[`players/${playerId}/skipNextTileEffect`] = updates.skipNextTileEffect;
  }

  await update(gameRef, updateObject);
}

/**
 * Update multiple players' combat stats in a single operation
 * @param lobbyCode - The lobby code
 * @param playerUpdates - Map of player IDs to their updates
 */
export async function batchUpdatePlayerStats(
  lobbyCode: string,
  playerUpdates: Map<string, {
    hp: number;
    specialAbilityUsed?: boolean;
    tempEffects?: any[];
    skipNextTileEffect?: boolean;
  }>
): Promise<void> {
  const gameRef = ref(database, `games/${lobbyCode}`);
  const updateObject: any = {};

  for (const [playerId, updates] of playerUpdates.entries()) {
    updateObject[`players/${playerId}/hp`] = updates.hp;

    if (updates.specialAbilityUsed !== undefined) {
      updateObject[`players/${playerId}/specialAbilityUsed`] = updates.specialAbilityUsed;
    }

    if (updates.tempEffects !== undefined) {
      updateObject[`players/${playerId}/tempEffects`] = updates.tempEffects;
    }

    if (updates.skipNextTileEffect !== undefined) {
      updateObject[`players/${playerId}/skipNextTileEffect`] = updates.skipNextTileEffect;
    }
  }

  await update(gameRef, updateObject);
}

/**
 * Update defender HP in combat (works for both players and enemies)
 * Note: For enemies, this updates the combat.defenders array
 * @param lobbyCode - The lobby code
 * @param combat - Current combat state
 * @param defenderId - Defender ID
 * @param newHp - New HP value
 */
export async function updateDefenderHp(
  lobbyCode: string,
  combat: CombatState,
  defenderId: string,
  newHp: number
): Promise<void> {
  const gameRef = ref(database, `games/${lobbyCode}`);

  // Update HP in the defenders array
  const updatedDefenders = combat.defenders.map(d =>
    d.id === defenderId ? { ...d, hp: newHp } : d
  );

  const updatedCombat: CombatState = {
    ...combat,
    defenders: updatedDefenders,
  };

  await update(gameRef, {
    combat: updatedCombat,
  });
}

/**
 * End combat and handle post-combat state
 * @param lobbyCode - The lobby code
 * @param updates - Updates to apply (player position, HP, isAlive, etc.)
 */
export async function endCombatAndUpdate(
  lobbyCode: string,
  updates: any
): Promise<void> {
  const gameRef = ref(database, `games/${lobbyCode}`);
  await update(gameRef, {
    ...updates,
    combat: null,
  });
}

/**
 * Roll for loot from defeated enemies
 * @param lobbyCode - The lobby code
 * @param enemies - Array of defeated enemies
 * @returns Array of dropped items
 */
export async function rollLootForEnemies(
  lobbyCode: string,
  enemies: Enemy[]
): Promise<Item[]> {
  const loot: Item[] = [];

  for (const enemy of enemies) {
    const lootDrop = await rollSingleEnemyLoot(lobbyCode, enemy.tier);
    loot.push(...lootDrop);
  }

  return loot;
}

/**
 * Roll loot for a single defeated enemy
 * @param lobbyCode - The lobby code
 * @param enemyTier - Tier of defeated enemy
 * @returns Array of dropped items
 */
async function rollSingleEnemyLoot(
  lobbyCode: string,
  enemyTier: 1 | 2 | 3
): Promise<Item[]> {
  const loot: Item[] = [];
  const roll = Math.random();

  if (enemyTier === 1) {
    // T1: 50% chance for 1× T1 treasure
    if (roll < 0.5) {
      const items = await drawCards(lobbyCode, 'treasure', 1, 1);
      loot.push(...items);
    }
  } else if (enemyTier === 2) {
    // T2: 70% T2, 15% T1, 15% nothing
    if (roll < 0.7) {
      const items = await drawCards(lobbyCode, 'treasure', 2, 1);
      loot.push(...items);
    } else if (roll < 0.85) {
      const items = await drawCards(lobbyCode, 'treasure', 1, 1);
      loot.push(...items);
    }
  } else if (enemyTier === 3) {
    // T3: 80% T3, 20% T2
    if (roll < 0.8) {
      const items = await drawCards(lobbyCode, 'treasure', 3, 1);
      loot.push(...items);
    } else {
      const items = await drawCards(lobbyCode, 'treasure', 2, 1);
      loot.push(...items);
    }
  }

  return loot;
}

/**
 * Advance to next turn (used when player is defeated)
 * @param lobbyCode - The lobby code
 * @param currentTurnIndex - Current turn index
 * @param turnOrder - Turn order array
 * @returns Next player ID
 */
export async function advanceTurn(
  lobbyCode: string,
  currentTurnIndex: number,
  turnOrder: string[]
): Promise<string> {
  const gameRef = ref(database, `games/${lobbyCode}`);
  const nextIndex = (currentTurnIndex + 1) % turnOrder.length;
  const nextPlayerId = turnOrder[nextIndex];

  await update(gameRef, {
    currentTurnIndex: nextIndex,
  });

  return nextPlayerId;
}
