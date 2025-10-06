/**
 * Player stats calculation utilities
 * Consolidates attack/defense calculations from equipment, class bonuses, and temporary effects
 */

import type { Player } from '../types';
import { getTempEffectCombatBonuses } from './tempEffects';

/**
 * Calculate equipment bonuses for attack and defense
 * @param player - The player
 * @returns Object with attack and defense bonuses from equipment
 */
export function getEquipmentBonuses(player: Player): {
  attackBonus: number;
  defenseBonus: number;
} {
  let attackBonus = 0;
  let defenseBonus = 0;

  const equipment = player.equipment || {
    holdable1: null,
    holdable2: null,
    wearable: null,
  };

  if (equipment.holdable1) {
    attackBonus += equipment.holdable1.attackBonus || 0;
    defenseBonus += equipment.holdable1.defenseBonus || 0;
  }
  if (equipment.holdable2) {
    attackBonus += equipment.holdable2.attackBonus || 0;
    defenseBonus += equipment.holdable2.defenseBonus || 0;
  }
  if (equipment.wearable) {
    attackBonus += equipment.wearable.attackBonus || 0;
    defenseBonus += equipment.wearable.defenseBonus || 0;
  }

  return { attackBonus, defenseBonus };
}

/**
 * Calculate class combat bonuses based on combat type
 * @param player - The player
 * @param isVsEnemy - True if fighting enemies, false if fighting players
 * @returns Object with attack and defense bonuses from class
 */
export function getClassCombatBonuses(
  player: Player,
  isVsEnemy: boolean
): {
  attackBonus: number;
  defenseBonus: number;
} {
  let attackBonus = 0;
  let defenseBonus = 0;

  if (isVsEnemy) {
    if (player.class === 'Hunter') attackBonus += 1;
    if (player.class === 'Warden') defenseBonus += 1;
  } else {
    if (player.class === 'Gladiator') attackBonus += 1;
    if (player.class === 'Guard') defenseBonus += 1;
  }

  return { attackBonus, defenseBonus };
}

/**
 * Calculate total attack and defense stats (base + all bonuses)
 * @param player - The player
 * @param isVsEnemy - True if fighting enemies, false if fighting players
 * @param includeClassBonuses - Whether to include class combat bonuses (default true)
 * @param includeTempEffects - Whether to include temporary effects (default true)
 * @returns Object with total attack and defense
 */
export function calculatePlayerStats(
  player: Player,
  isVsEnemy: boolean = true,
  includeClassBonuses: boolean = true,
  includeTempEffects: boolean = true
): {
  attack: number;
  defense: number;
} {
  const BASE_ATTACK = 1;
  const BASE_DEFENSE = 1;

  const equipmentBonuses = getEquipmentBonuses(player);
  const classBonuses = includeClassBonuses
    ? getClassCombatBonuses(player, isVsEnemy)
    : { attackBonus: 0, defenseBonus: 0 };
  const tempEffectBonuses = includeTempEffects
    ? getTempEffectCombatBonuses(player)
    : { attackBonus: 0, defenseBonus: 0 };

  return {
    attack: BASE_ATTACK + equipmentBonuses.attackBonus + classBonuses.attackBonus + tempEffectBonuses.attackBonus,
    defense: BASE_DEFENSE + equipmentBonuses.defenseBonus + classBonuses.defenseBonus + tempEffectBonuses.defenseBonus,
  };
}
