/**
 * Effect Executor Service
 * Central registry and execution engine for all card and item effects
 *
 * This service maps effect identifiers (from cards.ts and enemies.ts) to their
 * corresponding handler functions. When a card is played or an effect is triggered,
 * the executor looks up the appropriate handler and executes it with the provided context.
 */

import type { EffectContext, EffectResult, EffectHandler } from '../types';

// Import effect handlers
import * as itemEffects from './effects/itemEffects';
import * as luckEffects from './effects/luckEffects';
import * as consumableEffects from './effects/consumableEffects';

/**
 * Effect registry mapping effect IDs to handler functions
 * Each effect identifier from cards.ts maps to a specific handler
 */
const EFFECT_REGISTRY: Record<string, EffectHandler> = {
  // === LUCK CARD EFFECTS (Phase 1 & 3) ===
  'move_back': luckEffects.moveBack,
  'move_forward': luckEffects.moveForward,
  'skip_turn': luckEffects.skipTurn,
  'roll_again': luckEffects.rollAgain,
  'skip_draw_t1': luckEffects.skipDrawT1,
  'steal_item': luckEffects.stealItem,
  'lose_hp': luckEffects.loseHp,
  'draw_t1': luckEffects.drawT1,
  'swap_position': luckEffects.swapPosition,
  'forced_duel': luckEffects.forcedDuel,
  'ambush': luckEffects.ambush,
  'instinct': luckEffects.instinct,

  // === CONSUMABLE ITEM EFFECTS (Phase 1 & 2) ===
  'heal_3_debuff_move': consumableEffects.heal3DebuffMove,
  'full_heal': consumableEffects.fullHeal,
  'temp_defense_1': consumableEffects.tempDefense1,
  'temp_attack_1': consumableEffects.tempAttack1,

  // === UNIQUE ITEM EFFECTS (Phase 2 & 3) ===
  'blink': itemEffects.blink,
  'prevent_1_hp': itemEffects.prevent1Hp,
  'luck_cancel': itemEffects.luckCancel,
  'prevent_duel': itemEffects.preventDuel,
  'invisibility': itemEffects.invisibility,
  'step_back_before_resolve': itemEffects.stepBackBeforeResolve,

  // Note: 'trap' effect is already implemented in useInventoryManagement.ts
  // It's handled separately due to its tile-placement mechanics
};

/**
 * Execute an effect by its identifier
 * @param effectId - The effect identifier (e.g., 'move_back', 'heal_3', etc.)
 * @param context - Effect context containing game state and utilities
 * @returns Result of the effect execution
 */
export async function executeEffect(
  effectId: string,
  context: EffectContext
): Promise<EffectResult> {
  const handler = EFFECT_REGISTRY[effectId];

  if (!handler) {
    console.error(`[EffectExecutor] Unknown effect: ${effectId}`);
    return {
      success: false,
      error: `Unknown effect: ${effectId}`,
    };
  }

  try {
    console.log(`[EffectExecutor] Executing effect: ${effectId}`, {
      playerId: context.playerId,
      targetId: context.targetId,
      value: context.value,
    });

    const result = await handler(context);

    console.log(`[EffectExecutor] Effect ${effectId} completed:`, result);
    return result;
  } catch (error) {
    console.error(`[EffectExecutor] Error executing effect ${effectId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if an effect is registered
 * @param effectId - The effect identifier to check
 * @returns True if the effect has a handler
 */
export function isEffectRegistered(effectId: string): boolean {
  return effectId in EFFECT_REGISTRY;
}

/**
 * Get all registered effect IDs
 * @returns Array of all registered effect identifiers
 */
export function getRegisteredEffects(): string[] {
  return Object.keys(EFFECT_REGISTRY);
}
