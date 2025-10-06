/**
 * Unique Item Effect Handlers
 * Implements special effects for unique items that don't fit standard patterns
 *
 * These items often have complex mechanics involving positioning, interrupts,
 * or special timing requirements.
 */

import type { EffectContext, EffectResult } from '../../types';

/**
 * Teleport +2 or -2 tiles, ignoring pass-through effects
 * Used by: Blink Scroll
 * @param context - Effect context with value (-2 or +2)
 */
export async function blink(context: EffectContext): Promise<EffectResult> {
  const { gameState, playerId, value = 2, updateGameState, addLog } = context;
  const player = gameState.players[playerId];

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  // Value should be -2 or +2 (UI will determine based on player choice)
  const direction = value > 0 ? '+' : '';
  const newPosition = Math.max(0, Math.min(19, player.position + value));

  // Check sanctuary restriction
  const currentTile = gameState.tiles[player.position];
  const targetTile = gameState.tiles[newPosition];

  if (currentTile.type === 'sanctuary' || targetTile.type === 'sanctuary') {
    await addLog(
      'action',
      `📜 ${player.nickname} cannot use Blink Scroll to enter or leave Sanctuary!`,
      playerId
    );
    return {
      success: false,
      error: 'Cannot blink into or out of Sanctuary',
    };
  }

  await updateGameState({
    [`players/${playerId}/position`]: newPosition,
  });

  await addLog(
    'action',
    `📜 ${player.nickname} used Blink Scroll and teleported ${direction}${Math.abs(value)} tiles to position ${newPosition}!`,
    playerId,
    true
  );

  return {
    success: true,
    message: `Teleported ${direction}${Math.abs(value)} tiles`,
    data: { oldPosition: player.position, newPosition },
  };
}

/**
 * Prevent 1 HP loss the next time player would take damage
 * Used by: Wardstone
 * @param context - Effect context
 */
export async function prevent1Hp(context: EffectContext): Promise<EffectResult> {
  const { gameState, playerId, updateGameState, addLog } = context;
  const player = gameState.players[playerId];

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  // Add wardstone protection as a temp effect
  const tempEffects = player.tempEffects || [];
  tempEffects.push({
    type: 'wardstone',
    duration: 99, // Persists until HP loss occurs
    description: 'Next time you would lose HP, prevent 1 HP loss',
  });

  await updateGameState({
    [`players/${playerId}/tempEffects`]: tempEffects,
  });

  await addLog(
    'action',
    `🛡️ ${player.nickname} activated Wardstone! Next 1 HP loss will be prevented`,
    playerId,
    true
  );

  return {
    success: true,
    message: 'Wardstone protection active',
  };
}

/**
 * Cancel a Luck card just drawn (interrupt)
 * Used by: Luck Charm
 * @param context - Effect context
 */
export async function luckCancel(context: EffectContext): Promise<EffectResult> {
  const { gameState, playerId, addLog } = context;
  const player = gameState.players[playerId];

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  // This is an interrupt effect - the UI must handle the timing
  // When a Luck card is drawn, player can play this to cancel it
  // The Luck Charm then returns to bottom of T1 deck

  await addLog(
    'action',
    `🍀 ${player.nickname} used Luck Charm to cancel the Luck card!`,
    playerId,
    true
  );

  return {
    success: true,
    message: 'Luck card cancelled',
    data: { requiresReturn: true, returnDeck: 'treasureDeck1' },
  };
}

/**
 * Prevent all duels for remainder of current turn (interrupt)
 * Used by: Smoke Bomb
 * @param context - Effect context
 */
export async function preventDuel(context: EffectContext): Promise<EffectResult> {
  const { gameState, playerId, updateGameState, addLog } = context;
  const player = gameState.players[playerId];

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  // Add duel prevention as temp effect for this turn
  const tempEffects = player.tempEffects || [];
  tempEffects.push({
    type: 'smoke_bomb',
    duration: 1,
    description: 'No duels can occur this turn',
  });

  await updateGameState({
    [`players/${playerId}/tempEffects`]: tempEffects,
  });

  await addLog(
    'action',
    `💣 ${player.nickname} threw a Smoke Bomb! No duels can happen this turn`,
    playerId,
    true
  );

  return {
    success: true,
    message: 'Duels prevented this turn',
    data: { requiresReturn: true, returnDeck: 'treasureDeck2' },
  };
}

/**
 * Become invisible to other players until next turn or moved by effect
 * Used by: Fairy Dust
 * @param context - Effect context
 */
export async function invisibility(context: EffectContext): Promise<EffectResult> {
  const { gameState, playerId, updateGameState, addLog } = context;
  const player = gameState.players[playerId];

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  // Set invisibility flag
  await updateGameState({
    [`players/${playerId}/isInvisible`]: true,
  });

  await addLog(
    'action',
    `✨ ${player.nickname} used Fairy Dust and became invisible!`,
    playerId,
    true
  );

  return {
    success: true,
    message: 'Player is now invisible',
  };
}

/**
 * If turn ends on tile with player/enemy, may step back 1 tile before resolving
 * Used by: Lamp
 * @param context - Effect context
 */
export async function stepBackBeforeResolve(context: EffectContext): Promise<EffectResult> {
  const { gameState, playerId, updateGameState, addLog } = context;
  const player = gameState.players[playerId];

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  // Move back 1 tile
  const newPosition = Math.max(0, player.position - 1);

  await updateGameState({
    [`players/${playerId}/position`]: newPosition,
  });

  await addLog(
    'action',
    `🏮 ${player.nickname} used their Lamp to step back 1 tile before resolving!`,
    playerId,
    true
  );

  return {
    success: true,
    message: 'Stepped back 1 tile',
    data: { oldPosition: player.position, newPosition },
  };
}
