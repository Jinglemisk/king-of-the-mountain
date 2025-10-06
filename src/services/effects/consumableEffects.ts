/**
 * Consumable Item Effect Handlers
 * Implements effects for consumable items (potions, draughts, essences, etc.)
 *
 * These items are typically small category items that are consumed upon use
 * and provide immediate or temporary benefits.
 */

import type { EffectContext, EffectResult } from '../../types';

/**
 * Heal 3 HP and add -1 movement debuff for next movement roll
 * Used by: Beer
 * @param context - Effect context
 */
export async function heal3DebuffMove(context: EffectContext): Promise<EffectResult> {
  const { gameState, playerId, updateGameState, addLog } = context;
  const player = gameState.players[playerId];

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  // Heal 3 HP (capped at maxHp)
  const newHp = Math.min(player.maxHp, player.hp + 3);
  const actualHealing = newHp - player.hp;

  // Add movement debuff
  const tempEffects = player.tempEffects || [];
  tempEffects.push({
    type: 'beer_debuff',
    duration: 1,
    description: '-1 to next movement roll',
  });

  await updateGameState({
    [`players/${playerId}/hp`]: newHp,
    [`players/${playerId}/tempEffects`]: tempEffects,
  });

  await addLog(
    'action',
    `🍺 ${player.nickname} drank Beer! Healed ${actualHealing} HP but will have -1 movement next turn`,
    playerId,
    true
  );

  return {
    success: true,
    message: `Healed ${actualHealing} HP, -1 movement next turn`,
    data: { healedAmount: actualHealing, newHp },
  };
}

/**
 * Fully restore HP to maximum
 * Used by: Essence of the Mysterious Flower
 * @param context - Effect context
 */
export async function fullHeal(context: EffectContext): Promise<EffectResult> {
  const { gameState, playerId, updateGameState, addLog } = context;
  const player = gameState.players[playerId];

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  const healedAmount = player.maxHp - player.hp;

  if (healedAmount === 0) {
    await addLog(
      'action',
      `🌸 ${player.nickname} used Essence of the Mysterious Flower, but is already at full HP!`,
      playerId
    );
    return { success: true, message: 'Already at full HP' };
  }

  await updateGameState({
    [`players/${playerId}/hp`]: player.maxHp,
  });

  await addLog(
    'action',
    `🌸 ${player.nickname} used Essence of the Mysterious Flower and fully healed ${healedAmount} HP!`,
    playerId,
    true
  );

  return {
    success: true,
    message: `Fully healed ${healedAmount} HP`,
    data: { healedAmount, newHp: player.maxHp },
  };
}

/**
 * Add +1 to all Defense rolls this turn
 * Used by: Agility Draught
 * @param context - Effect context
 */
export async function tempDefense1(context: EffectContext): Promise<EffectResult> {
  const { gameState, playerId, updateGameState, addLog } = context;
  const player = gameState.players[playerId];

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  // Add temporary defense buff
  const tempEffects = player.tempEffects || [];
  tempEffects.push({
    type: 'agility_draught',
    duration: 1,
    defenseBonus: 1,
    description: '+1 to all Defense rolls this turn',
  });

  await updateGameState({
    [`players/${playerId}/tempEffects`]: tempEffects,
  });

  await addLog(
    'action',
    `⚗️ ${player.nickname} drank Agility Draught! +1 Defense for this turn`,
    playerId,
    true
  );

  return {
    success: true,
    message: '+1 Defense this turn',
    data: { defenseBonus: 1 },
  };
}

/**
 * Add +1 to all Attack rolls this turn
 * Used by: Rage Potion
 * @param context - Effect context
 */
export async function tempAttack1(context: EffectContext): Promise<EffectResult> {
  const { gameState, playerId, updateGameState, addLog } = context;
  const player = gameState.players[playerId];

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  // Add temporary attack buff
  const tempEffects = player.tempEffects || [];
  tempEffects.push({
    type: 'rage_potion',
    duration: 1,
    attackBonus: 1,
    description: '+1 to all Attack rolls this turn',
  });

  await updateGameState({
    [`players/${playerId}/tempEffects`]: tempEffects,
  });

  await addLog(
    'action',
    `⚗️ ${player.nickname} drank Rage Potion! +1 Attack for this turn`,
    playerId,
    true
  );

  return {
    success: true,
    message: '+1 Attack this turn',
    data: { attackBonus: 1 },
  };
}
