/**
 * Temporary Effects Utility
 * Handles temporary effect tracking, bonuses calculation, and cleanup
 *
 * Temporary effects are time-limited buffs/debuffs that expire after a certain
 * number of turns or when specific conditions are met.
 */

import type { Player, TempEffect } from '../types';
import { updateGameState } from '../state/gameSlice';

/**
 * Calculate combat bonuses from temporary effects
 * @param player - The player to calculate bonuses for
 * @returns Object with attack and defense bonuses from temp effects
 */
export function getTempEffectCombatBonuses(player: Player): {
  attackBonus: number;
  defenseBonus: number;
} {
  let attackBonus = 0;
  let defenseBonus = 0;

  if (!player.tempEffects || player.tempEffects.length === 0) {
    return { attackBonus, defenseBonus };
  }

  for (const effect of player.tempEffects) {
    attackBonus += effect.attackBonus || 0;
    defenseBonus += effect.defenseBonus || 0;
  }

  return { attackBonus, defenseBonus };
}

/**
 * Check if player has a specific temporary effect active
 * @param player - The player to check
 * @param effectType - The effect type to look for (e.g., 'rage_potion', 'skip_turn')
 * @returns True if player has the effect active
 */
export function hasActiveTempEffect(player: Player, effectType: string): boolean {
  if (!player.tempEffects || player.tempEffects.length === 0) {
    return false;
  }

  return player.tempEffects.some(effect => effect.type === effectType);
}

/**
 * Get a specific temporary effect if it exists
 * @param player - The player to check
 * @param effectType - The effect type to find
 * @returns The temp effect if found, undefined otherwise
 */
export function getTempEffect(player: Player, effectType: string): TempEffect | undefined {
  if (!player.tempEffects || player.tempEffects.length === 0) {
    return undefined;
  }

  return player.tempEffects.find(effect => effect.type === effectType);
}

/**
 * Remove a specific temporary effect
 * @param player - The player to remove effect from
 * @param effectType - The effect type to remove
 * @returns Updated tempEffects array
 */
export function removeTempEffect(player: Player, effectType: string): TempEffect[] {
  if (!player.tempEffects || player.tempEffects.length === 0) {
    return [];
  }

  return player.tempEffects.filter(effect => effect.type !== effectType);
}

/**
 * Decrement duration of all temporary effects and remove expired ones
 * Should be called at the END of each player's turn
 * @param player - The player whose effects should be decremented
 * @returns Updated tempEffects array with decremented durations and expired effects removed
 */
export function decrementTempEffects(player: Player): TempEffect[] {
  if (!player.tempEffects || player.tempEffects.length === 0) {
    return [];
  }

  // Decrement duration for all effects
  const updatedEffects = player.tempEffects.map(effect => ({
    ...effect,
    duration: effect.duration - 1,
  }));

  // Filter out effects with duration <= 0
  return updatedEffects.filter(effect => effect.duration > 0);
}

/**
 * Clean up temporary effects for a player at turn end
 * Updates Firebase with decremented effects
 * @param lobbyCode - The lobby code
 * @param playerId - The player ID
 * @param player - The player object
 */
export async function cleanupTempEffectsAtTurnEnd(
  lobbyCode: string,
  playerId: string,
  player: Player
): Promise<void> {
  const updatedEffects = decrementTempEffects(player);

  await updateGameState(lobbyCode, {
    [`players/${playerId}/tempEffects`]: updatedEffects,
  });
}

/**
 * Check if player should skip their turn (from temp effects)
 * @param player - The player to check
 * @returns True if player has skip_turn effect active
 */
export function shouldSkipTurn(player: Player): boolean {
  return hasActiveTempEffect(player, 'skip_turn');
}

/**
 * Get movement modifier from temporary effects
 * @param player - The player to check
 * @returns Movement bonus/penalty (e.g., -1 from Beer)
 */
export function getMovementModifier(player: Player): number {
  if (!player.tempEffects || player.tempEffects.length === 0) {
    return 0;
  }

  // Check for beer debuff
  if (hasActiveTempEffect(player, 'beer_debuff')) {
    return -1;
  }

  // Add other movement modifiers here if needed
  return 0;
}

/**
 * Check if player has Wardstone protection active
 * @param player - The player to check
 * @returns True if wardstone effect is active
 */
export function hasWardstoneProtection(player: Player): boolean {
  return hasActiveTempEffect(player, 'wardstone');
}

/**
 * Check if player is protected from duels (Smoke Bomb effect)
 * @param player - The player to check
 * @returns True if smoke bomb effect is active
 */
export function isDuelProtected(player: Player): boolean {
  return hasActiveTempEffect(player, 'smoke_bomb');
}
