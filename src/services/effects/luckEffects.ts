/**
 * Luck Card Effect Handlers
 * Implements all effects from Luck Cards (cards.ts LUCK_CARD_FACTORIES)
 *
 * These effects are triggered when a player draws a Luck Card from a luck tile.
 * Most effects execute immediately and are discarded, but some can be kept face-down.
 */

import type { EffectContext, EffectResult, Player } from '../../types';

/**
 * Move player backward on the board
 * Used by: Exhaustion (1 tile), Cave-in (3 tiles)
 * @param context - Effect context with value indicating tiles to move back
 */
export async function moveBack(context: EffectContext): Promise<EffectResult> {
  const { gameState, playerId, value = 1, updateGameState, addLog } = context;
  const player = gameState.players[playerId];

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  const newPosition = Math.max(0, player.position - value);

  await updateGameState({
    [`players/${playerId}/position`]: newPosition,
  });

  await addLog(
    'action',
    `${player.nickname} moved ${value} tile${value > 1 ? 's' : ''} back to tile ${newPosition}`,
    playerId,
    true
  );

  return {
    success: true,
    message: `Moved back ${value} tiles`,
    data: { oldPosition: player.position, newPosition },
  };
}

/**
 * Move player forward on the board
 * Used by: White-Bearded Spirit (2 tiles)
 * @param context - Effect context with value indicating tiles to move forward
 */
export async function moveForward(context: EffectContext): Promise<EffectResult> {
  const { gameState, playerId, value = 2, updateGameState, addLog } = context;
  const player = gameState.players[playerId];

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  const newPosition = Math.min(19, player.position + value);

  await updateGameState({
    [`players/${playerId}/position`]: newPosition,
  });

  await addLog(
    'action',
    `✨ ${player.nickname} moved ${value} tiles forward to tile ${newPosition}!`,
    playerId,
    true
  );

  return {
    success: true,
    message: `Moved forward ${value} tiles`,
    data: { oldPosition: player.position, newPosition },
  };
}

/**
 * Skip player's next turn
 * Used by: Faint
 * @param context - Effect context
 */
export async function skipTurn(context: EffectContext): Promise<EffectResult> {
  const { gameState, playerId, addLog } = context;
  const player = gameState.players[playerId];

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  // Add a temp effect to track the skip
  const tempEffects = player.tempEffects || [];
  tempEffects.push({
    type: 'skip_turn',
    duration: 1,
    description: 'Skip next turn',
  });

  await context.updateGameState({
    [`players/${playerId}/tempEffects`]: tempEffects,
  });

  await addLog(
    'action',
    `😴 ${player.nickname} will skip their next turn!`,
    playerId,
    true
  );

  return {
    success: true,
    message: 'Next turn will be skipped',
  };
}

/**
 * Roll movement dice again and move immediately
 * Used by: Vital Energy
 * @param context - Effect context
 */
export async function rollAgain(context: EffectContext): Promise<EffectResult> {
  const { gameState, playerId, addLog, resolveTile } = context;
  const player = gameState.players[playerId];

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  // Roll a 4-sided die for movement
  const roll = Math.floor(Math.random() * 4) + 1;
  const newPosition = Math.min(19, player.position + roll);

  await context.updateGameState({
    [`players/${playerId}/position`]: newPosition,
  });

  await addLog(
    'action',
    `⚡ ${player.nickname} rolled again and got ${roll}! Moved to tile ${newPosition}`,
    playerId,
    true
  );

  // Create updated game state with new position for tile resolution
  const updatedGameState = {
    ...gameState,
    players: {
      ...gameState.players,
      [playerId]: {
        ...player,
        position: newPosition,
      },
    },
  };

  // Resolve the new tile's effects (treasure, enemy, luck)
  await resolveTile(newPosition, updatedGameState);

  return {
    success: true,
    message: `Rolled ${roll} and moved`,
    data: { roll, newPosition },
  };
}

/**
 * Skip next turn but draw 2 Tier 1 treasures
 * Used by: Lost Treasure
 * @param context - Effect context with value indicating number of treasures
 */
export async function skipDrawT1(context: EffectContext): Promise<EffectResult> {
  const { gameState, playerId, value = 2, drawCards, addLog } = context;
  const player = gameState.players[playerId];

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  // Add skip turn effect
  const tempEffects = player.tempEffects || [];
  tempEffects.push({
    type: 'skip_turn',
    duration: 1,
    description: 'Skip next turn',
  });

  // Draw treasures
  const treasures = await drawCards('treasure', 1, value);

  await context.updateGameState({
    [`players/${playerId}/tempEffects`]: tempEffects,
  });

  await addLog(
    'action',
    `🎁 ${player.nickname} found lost treasure! Drew ${value} Tier 1 treasures but will skip next turn`,
    playerId,
    true
  );

  return {
    success: true,
    message: `Drew ${value} treasures but next turn skipped`,
    data: { treasures },
  };
}

/**
 * Player must choose and discard one item
 * Used by: Jinn Thief
 * @param context - Effect context with itemId to steal
 */
export async function stealItem(context: EffectContext): Promise<EffectResult> {
  const { gameState, playerId, itemId, addLog } = context;
  const player = gameState.players[playerId];

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  // Check if player has any items
  const inventory = player.inventory || [];
  const equipment = player.equipment || { holdable1: null, holdable2: null, wearable: null };

  const hasItems = inventory.some(item => item !== null) ||
    equipment.holdable1 !== null ||
    equipment.holdable2 !== null ||
    equipment.wearable !== null;

  if (!hasItems) {
    await addLog(
      'action',
      `👻 Jinn Thief appeared to ${player.nickname}, but they have no items to steal!`,
      playerId
    );
    return { success: true, message: 'No items to steal' };
  }

  // If itemId is provided, remove that specific item
  if (itemId) {
    // Check inventory
    const inventoryIndex = inventory.findIndex(item => item?.id === itemId);
    if (inventoryIndex !== -1) {
      const stolenItem = inventory[inventoryIndex];
      inventory[inventoryIndex] = null;

      await context.updateGameState({
        [`players/${playerId}/inventory`]: inventory,
      });

      await addLog(
        'action',
        `👻 Jinn Thief stole ${stolenItem!.name} from ${player.nickname}!`,
        playerId,
        true
      );

      return { success: true, message: `${stolenItem!.name} was stolen` };
    }

    // Check equipment
    for (const slot of ['holdable1', 'holdable2', 'wearable'] as const) {
      if (equipment[slot]?.id === itemId) {
        const stolenItem = equipment[slot];
        await context.updateGameState({
          [`players/${playerId}/equipment/${slot}`]: null,
        });

        await addLog(
          'action',
          `👻 Jinn Thief stole ${stolenItem!.name} from ${player.nickname}!`,
          playerId,
          true
        );

        return { success: true, message: `${stolenItem!.name} was stolen` };
      }
    }
  }

  // No itemId provided - player needs to choose (UI will handle this)
  await addLog(
    'action',
    `👻 Jinn Thief appeared! ${player.nickname} must choose an item to lose`,
    playerId,
    true
  );

  return {
    success: true,
    message: 'Player must choose item to discard',
    data: { requiresChoice: true },
  };
}

/**
 * Player loses HP
 * Used by: Sprained Wrist (1 HP)
 * @param context - Effect context with value indicating HP to lose
 */
export async function loseHp(context: EffectContext): Promise<EffectResult> {
  const { gameState, playerId, value = 1, addLog } = context;
  const player = gameState.players[playerId];

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  const newHp = Math.max(0, player.hp - value);

  // Check for Monk revival if HP would drop to 0
  if (newHp === 0 && player.class === 'Monk' && !player.specialAbilityUsed) {
    await context.updateGameState({
      [`players/${playerId}/hp`]: 1,
      [`players/${playerId}/specialAbilityUsed`]: true,
    });

    await addLog(
      'combat',
      `🙏 ${player.nickname} would have dropped to 0 HP, but their Monk ability saved them!`,
      playerId,
      true
    );

    return { success: true, message: 'Monk ability prevented death' };
  }

  await context.updateGameState({
    [`players/${playerId}/hp`]: newHp,
  });

  await addLog(
    'combat',
    `💔 ${player.nickname} lost ${value} HP! (${newHp} HP remaining)`,
    playerId,
    true
  );

  return {
    success: true,
    message: `Lost ${value} HP`,
    data: { newHp },
  };
}

/**
 * Draw Tier 1 treasure cards
 * Used by: Covered Pit (1 card)
 * @param context - Effect context with value indicating number of cards
 */
export async function drawT1(context: EffectContext): Promise<EffectResult> {
  const { gameState, playerId, value = 1, drawCards, addLog } = context;
  const player = gameState.players[playerId];

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  const treasures = await drawCards('treasure', 1, value);

  await addLog(
    'action',
    `💎 ${player.nickname} found ${value} Tier 1 treasure${value > 1 ? 's' : ''}!`,
    playerId
  );

  return {
    success: true,
    message: `Drew ${value} Tier 1 treasure${value > 1 ? 's' : ''}`,
    data: { treasures },
  };
}

/**
 * Swap positions with nearest player
 * Used by: Mystic Wave
 * @param context - Effect context with optional targetId
 */
export async function swapPosition(context: EffectContext): Promise<EffectResult> {
  const { gameState, playerId, targetId, addLog } = context;
  const player = gameState.players[playerId];

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  // Find all other players
  const otherPlayers = Object.values(gameState.players).filter(p => p.id !== playerId);

  if (otherPlayers.length === 0) {
    await addLog('action', `🌀 Mystic Wave appeared, but ${player.nickname} is alone!`, playerId);
    return { success: true, message: 'No other players to swap with' };
  }

  let targetPlayer: Player | undefined;

  if (targetId) {
    targetPlayer = gameState.players[targetId];
  } else {
    // Find nearest player (minimum distance)
    let minDistance = Infinity;
    for (const p of otherPlayers) {
      const distance = Math.abs(p.position - player.position);
      if (distance < minDistance) {
        minDistance = distance;
        targetPlayer = p;
      }
    }
  }

  if (!targetPlayer) {
    return { success: false, error: 'No valid target player found' };
  }

  // Swap positions
  const playerPos = player.position;
  const targetPos = targetPlayer.position;

  await context.updateGameState({
    [`players/${playerId}/position`]: targetPos,
    [`players/${targetPlayer.id}/position`]: playerPos,
  });

  await addLog(
    'action',
    `🌀 Mystic Wave! ${player.nickname} and ${targetPlayer.nickname} swapped positions!`,
    playerId,
    true
  );

  return {
    success: true,
    message: `Swapped positions with ${targetPlayer.nickname}`,
    data: { swappedWith: targetPlayer.nickname },
  };
}

/**
 * Move to nearest player within 6 tiles and start a duel
 * Used by: Nefarious Spirit
 * @param context - Effect context
 */
export async function forcedDuel(context: EffectContext): Promise<EffectResult> {
  const { gameState, playerId, startCombat, addLog } = context;
  const player = gameState.players[playerId];

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  // Find all other players within 6 tiles
  const otherPlayers = Object.values(gameState.players).filter(p => {
    if (p.id === playerId) return false;
    const distance = Math.abs(p.position - player.position);
    return distance <= 6;
  });

  if (otherPlayers.length === 0) {
    await addLog(
      'action',
      `👹 Nefarious Spirit appeared, but no players are within 6 tiles of ${player.nickname}!`,
      playerId
    );
    return { success: true, message: 'No players within range' };
  }

  // Find nearest player
  let nearestPlayer: Player = otherPlayers[0];
  let minDistance = Math.abs(nearestPlayer.position - player.position);

  for (const p of otherPlayers) {
    const distance = Math.abs(p.position - player.position);
    if (distance < minDistance) {
      minDistance = distance;
      nearestPlayer = p;
    }
  }

  // Move player to nearest player's position
  await context.updateGameState({
    [`players/${playerId}/position`]: nearestPlayer.position,
  });

  await addLog(
    'combat',
    `👹 Nefarious Spirit! ${player.nickname} was forced to move to ${nearestPlayer.nickname}'s position!`,
    playerId,
    true
  );

  // Start combat (no retreat allowed for forced duel)
  await startCombat(playerId, [nearestPlayer], false);

  return {
    success: true,
    message: `Forced duel with ${nearestPlayer.nickname}`,
    data: { targetPlayer: nearestPlayer.nickname },
  };
}

/**
 * Keep face-down card that allows ambush placement
 * Used by: Ambush Opportunity
 * @param context - Effect context
 */
export async function ambush(context: EffectContext): Promise<EffectResult> {
  const { gameState, playerId, addLog } = context;
  const player = gameState.players[playerId];

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  // Add ambush card to player's kept cards (we'll track this in tempEffects)
  const tempEffects = player.tempEffects || [];
  tempEffects.push({
    type: 'ambush',
    duration: 99, // Persists until used
    description: 'Can place ambush on tile to duel entering players',
  });

  await context.updateGameState({
    [`players/${playerId}/tempEffects`]: tempEffects,
  });

  await addLog(
    'action',
    `🃏 ${player.nickname} kept an Ambush Opportunity card face-down!`,
    playerId,
    true
  );

  return {
    success: true,
    message: 'Ambush card kept face-down',
    data: { canBeKept: true },
  };
}

/**
 * Keep face-down card that allows +1/-1 tile movement
 * Used by: Instinct
 * @param context - Effect context
 */
export async function instinct(context: EffectContext): Promise<EffectResult> {
  const { gameState, playerId, addLog } = context;
  const player = gameState.players[playerId];

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  // Add instinct card to player's kept cards
  const tempEffects = player.tempEffects || [];
  tempEffects.push({
    type: 'instinct',
    duration: 99, // Persists until used
    description: 'Once per turn: move +1 or -1 tile before/after movement roll',
  });

  await context.updateGameState({
    [`players/${playerId}/tempEffects`]: tempEffects,
  });

  await addLog(
    'action',
    `🃏 ${player.nickname} kept an Instinct card face-down!`,
    playerId,
    true
  );

  return {
    success: true,
    message: 'Instinct card kept face-down',
    data: { canBeKept: true },
  };
}
