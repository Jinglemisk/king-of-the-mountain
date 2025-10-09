/**
 * Combat Engine - Pure Combat Calculation Logic
 *
 * This module contains all core combat mechanics as pure functions.
 * No Firebase dependencies - all functions take input and return output.
 * This makes the combat logic fully unit-testable.
 */

import type { Player, Enemy, CombatRoll, CombatResult, CombatLogEntry } from '../../types';
import { getClassCombatBonuses, getEquipmentBonuses } from '../../utils/playerStats';
import { getTempEffectCombatBonuses, hasWardstoneProtection, removeTempEffect } from '../../utils/tempEffects';

/**
 * Roll a dice with specified number of sides
 * @param sides - Number of sides (e.g., 4 or 6)
 * @returns Random number from 1 to sides
 */
export function rollDice(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Calculate combat bonuses for a player
 * @param player - The player to calculate bonuses for
 * @param isVsEnemy - True if fighting enemies, false if fighting players
 * @returns Combined bonuses from class, equipment, and temp effects
 */
export function calculatePlayerBonuses(
  player: Player,
  isVsEnemy: boolean
): { attackBonus: number; defenseBonus: number } {
  const classBonuses = getClassCombatBonuses(player, isVsEnemy);
  const equipmentBonuses = getEquipmentBonuses(player, isVsEnemy);
  const tempEffectBonuses = getTempEffectCombatBonuses(player);

  return {
    attackBonus: classBonuses.attackBonus + equipmentBonuses.attackBonus + tempEffectBonuses.attackBonus,
    defenseBonus: classBonuses.defenseBonus + equipmentBonuses.defenseBonus + tempEffectBonuses.defenseBonus,
  };
}

/**
 * Calculate combat roll for an entity (player or enemy)
 * @param entity - The player or enemy
 * @param isVsEnemy - True if fighting enemies
 * @param skipAttack - True to set attack die to 0 (for trap effect)
 * @returns Combat roll with dice values and totals
 */
export function calculateCombatRoll(
  entity: Player | Enemy,
  isVsEnemy: boolean,
  skipAttack: boolean = false
): CombatRoll {
  const isPlayer = 'nickname' in entity;
  const entityName = isPlayer ? (entity as Player).nickname : (entity as Enemy).name;

  let attackBonus = 0;
  let defenseBonus = 0;

  if (isPlayer) {
    const bonuses = calculatePlayerBonuses(entity as Player, isVsEnemy);
    attackBonus = bonuses.attackBonus;
    defenseBonus = bonuses.defenseBonus;
  } else {
    const enemy = entity as Enemy;
    attackBonus = enemy.attackBonus;
    defenseBonus = enemy.defenseBonus;
  }

  const attackDie = skipAttack ? 0 : rollDice(6);
  const defenseDie = rollDice(6);

  return {
    entityId: entity.id,
    entityName,
    attackDie,
    defenseDie,
    attackBonus,
    defenseBonus,
    totalAttack: 1 + attackDie + attackBonus,
    totalDefense: 1 + defenseDie + defenseBonus,
  };
}

/**
 * Resolve damage and special effects for a combat round
 * @param attacker - The attacking player
 * @param defender - The defending entity
 * @param attackerRoll - Attacker's combat roll
 * @param defenderRoll - Defender's combat roll
 * @param isTargeted - True if this defender is being targeted (for multi-enemy fights)
 * @returns Object with damage dealt, HP updates, and special effect flags
 */
export function resolveCombatDamage(
  attacker: Player,
  defender: Player | Enemy,
  attackerRoll: CombatRoll,
  defenderRoll: CombatRoll,
  isTargeted: boolean
): {
  attackerHpLost: number;
  defenderHpLost: number;
  attackerNewHp: number;
  defenderNewHp: number;
  attackerWardstoneUsed: boolean;
  defenderWardstoneUsed: boolean;
  attackerMonkRevived: boolean;
  defenderMonkRevived: boolean;
  attackerTempEffects?: any[];
  defenderTempEffects?: any[];
} {
  // Determine if attacker hits defender
  const attackerHits = isTargeted && attackerRoll.totalAttack > defenderRoll.totalDefense;
  // Defender always attacks back
  const defenderHits = defenderRoll.totalAttack > attackerRoll.totalDefense;

  // Calculate raw damage
  let attackerHpLost = defenderHits ? 1 : 0;
  let defenderHpLost = attackerHits ? 1 : 0;

  // Track special effects
  let attackerWardstoneUsed = false;
  let defenderWardstoneUsed = false;
  let attackerMonkRevived = false;
  let defenderMonkRevived = false;
  let attackerTempEffects = attacker.tempEffects ? [...attacker.tempEffects] : [];
  let defenderTempEffects: any[] = [];

  // Check Wardstone protection for attacker
  if (attackerHpLost > 0 && hasWardstoneProtection(attacker)) {
    attackerHpLost = 0;
    attackerWardstoneUsed = true;
    attackerTempEffects = removeTempEffect(attacker, 'wardstone');
  }

  // Check Wardstone protection for defender (if player)
  const isDefenderPlayer = 'nickname' in defender;
  if (isDefenderPlayer && defenderHpLost > 0 && hasWardstoneProtection(defender as Player)) {
    defenderHpLost = 0;
    defenderWardstoneUsed = true;
    defenderTempEffects = removeTempEffect(defender as Player, 'wardstone');
  } else if (isDefenderPlayer) {
    const defPlayer = defender as Player;
    defenderTempEffects = defPlayer.tempEffects ? [...defPlayer.tempEffects] : [];
  }

  // Calculate new HP
  let attackerNewHp = Math.max(0, attacker.hp - attackerHpLost);
  let defenderNewHp = Math.max(0, defender.hp - defenderHpLost);

  // Check Monk revival for attacker
  if (attackerNewHp === 0 && attacker.class === 'Monk' && !attacker.specialAbilityUsed) {
    attackerNewHp = 1;
    attackerMonkRevived = true;
  }

  // Check Monk revival for defender (if player)
  if (isDefenderPlayer) {
    const defPlayer = defender as Player;
    if (defenderNewHp === 0 && defPlayer.class === 'Monk' && !defPlayer.specialAbilityUsed) {
      defenderNewHp = 1;
      defenderMonkRevived = true;
    }
  }

  return {
    attackerHpLost,
    defenderHpLost,
    attackerNewHp,
    defenderNewHp,
    attackerWardstoneUsed,
    defenderWardstoneUsed,
    attackerMonkRevived,
    defenderMonkRevived,
    attackerTempEffects,
    defenderTempEffects,
  };
}

/**
 * Execute a full combat round with all defenders
 * @param attacker - The attacking player
 * @param defenders - Array of defenders (enemies or players)
 * @param currentRound - Current round number (0-indexed)
 * @param targetId - ID of specific target (for multi-enemy fights)
 * @returns Complete combat log entry for this round
 */
export function executeCombatRound(
  attacker: Player,
  defenders: (Player | Enemy)[],
  currentRound: number,
  targetId?: string
): {
  logEntry: CombatLogEntry;
  attackerUpdates: {
    hp: number;
    specialAbilityUsed?: boolean;
    tempEffects?: any[];
    skipNextTileEffect?: boolean;
  };
  defenderUpdates: Map<string, {
    hp: number;
    specialAbilityUsed?: boolean;
    tempEffects?: any[];
  }>;
  wardstoneMessages: string[];
} {
  // Check if player is trapped and this is round 1
  const skipPlayerAttack = attacker.skipNextTileEffect && currentRound === 0;

  // Determine if fighting enemies
  const firstDefender = defenders[0];
  const isVsEnemy = 'attackBonus' in firstDefender && 'defenseBonus' in firstDefender;

  // Roll for attacker
  const attackerRoll = calculateCombatRoll(attacker, isVsEnemy, skipPlayerAttack);

  // Roll for each defender and resolve damage
  const defenderRolls: CombatRoll[] = [];
  const results: CombatResult[] = [];
  const defenderUpdates = new Map<string, any>();
  const wardstoneMessages: string[] = [];

  let attackerHp = attacker.hp;
  let attackerMonkUsed = attacker.specialAbilityUsed || false;
  let attackerTempEffects = attacker.tempEffects ? [...attacker.tempEffects] : [];
  let totalAttackerHpLost = 0;

  for (const defender of defenders) {
    const defenderRoll = calculateCombatRoll(defender, false);
    defenderRolls.push(defenderRoll);

    // Determine if we're targeting this defender
    const isTargeted = defenders.length === 1 || targetId === defender.id;

    // Resolve damage for this specific defender
    const damageResult = resolveCombatDamage(
      { ...attacker, hp: attackerHp, specialAbilityUsed: attackerMonkUsed, tempEffects: attackerTempEffects },
      defender,
      attackerRoll,
      defenderRoll,
      isTargeted
    );

    // Update attacker HP (cumulative from all defenders)
    attackerHp = damageResult.attackerNewHp;
    totalAttackerHpLost += damageResult.attackerHpLost;
    if (damageResult.attackerMonkRevived) {
      attackerMonkUsed = true;
    }
    if (damageResult.attackerWardstoneUsed) {
      attackerTempEffects = damageResult.attackerTempEffects || [];
      wardstoneMessages.push(`🛡️ ${attacker.nickname}'s Wardstone absorbed the damage!`);
    }

    // Track defender updates
    defenderUpdates.set(defender.id, {
      hp: damageResult.defenderNewHp,
      specialAbilityUsed: damageResult.defenderMonkRevived ? true : undefined,
      tempEffects: damageResult.defenderTempEffects,
    });

    if (damageResult.defenderWardstoneUsed) {
      const defName = 'nickname' in defender ? (defender as Player).nickname : (defender as Enemy).name;
      wardstoneMessages.push(`🛡️ ${defName}'s Wardstone absorbed the damage!`);
    }

    // Create result entries
    const defenderName = 'nickname' in defender ? (defender as Player).nickname : (defender as Enemy).name;
    results.push({
      entityId: defender.id,
      entityName: defenderName,
      hpLost: damageResult.defenderHpLost,
      hpRemaining: damageResult.defenderNewHp,
      isDefeated: damageResult.defenderNewHp === 0,
    });
  }

  // Add attacker result (only once, with cumulative damage)
  results.push({
    entityId: attacker.id,
    entityName: attacker.nickname,
    hpLost: totalAttackerHpLost,
    hpRemaining: attackerHp,
    isDefeated: attackerHp === 0 && !attackerMonkUsed,
  });

  // Create combat log entry
  const logEntry: CombatLogEntry = {
    round: currentRound + 1,
    attackerRoll,
    defenderRolls,
    results,
  };

  // Prepare attacker updates
  const attackerUpdates: any = {
    hp: attackerHp,
    tempEffects: attackerTempEffects,
  };

  if (attackerMonkUsed && !attacker.specialAbilityUsed) {
    attackerUpdates.specialAbilityUsed = true;
  }

  if (currentRound === 0 && attacker.skipNextTileEffect) {
    attackerUpdates.skipNextTileEffect = false;
  }

  return {
    logEntry,
    attackerUpdates,
    defenderUpdates,
    wardstoneMessages,
  };
}

/**
 * Determine if combat is over and who won
 * @param attackerHp - Attacker's current HP
 * @param defenders - Array of defenders with current HP
 * @returns Combat outcome
 */
export function determineCombatOutcome(
  attackerHp: number,
  defenders: (Player | Enemy)[]
): {
  isOver: boolean;
  attackerDefeated: boolean;
  defendersDefeated: boolean;
} {
  const attackerDefeated = attackerHp === 0;
  const defendersDefeated = defenders.every(d => d.hp === 0);

  return {
    isOver: attackerDefeated || defendersDefeated,
    attackerDefeated,
    defendersDefeated,
  };
}

/**
 * Calculate loot drop for defeated enemy
 * @param enemyTier - Tier of defeated enemy (1, 2, or 3)
 * @returns Object with loot tier and count
 */
export function calculateEnemyLoot(enemyTier: 1 | 2 | 3): { tier: 1 | 2 | 3; count: number } | null {
  const roll = Math.random();

  if (enemyTier === 1) {
    // T1: 50% chance for 1× T1 treasure
    if (roll < 0.5) {
      return { tier: 1, count: 1 };
    }
  } else if (enemyTier === 2) {
    // T2: 70% T2, 15% T1, 15% nothing
    if (roll < 0.7) {
      return { tier: 2, count: 1 };
    } else if (roll < 0.85) {
      return { tier: 1, count: 1 };
    }
  } else if (enemyTier === 3) {
    // T3: 80% T3, 20% T2
    if (roll < 0.8) {
      return { tier: 3, count: 1 };
    } else {
      return { tier: 2, count: 1 };
    }
  }

  return null;
}
