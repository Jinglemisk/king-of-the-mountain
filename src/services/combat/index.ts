/**
 * Combat Service - Public API
 *
 * This module exports the public interface for the combat system.
 * It combines the pure combat engine with Firebase persistence.
 */

// Export combat engine functions
export {
  rollDice,
  calculatePlayerBonuses,
  calculateCombatRoll,
  resolveCombatDamage,
  executeCombatRound,
  determineCombatOutcome,
  calculateEnemyLoot,
} from './combatEngine';

// Export persistence functions
export {
  getGameState,
  updateCombatState,
  appendCombatLog,
  updatePlayerCombatStats,
  batchUpdatePlayerStats,
  updateDefenderHp,
  endCombatAndUpdate,
  rollLootForEnemies,
  advanceTurn,
} from './combatPersistence';
