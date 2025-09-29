// /src/game/engine/inventoryConverter.ts
// Conversion utilities between engine and network inventory formats

import type { ItemInstance, PlayerState } from '../types';
import type { PlayerInventory, NetworkPlayerState } from '../net/types';

/**
 * Convert engine inventory format to network format
 * Engine uses ItemInstance objects and holdables array
 * Network uses CardId strings and holdableA/holdableB
 */
export function convertEngineInventoryToNetwork(player: PlayerState): PlayerInventory {
  const inventory: PlayerInventory = {
    equipped: {
      wearable: player.equipped?.wearable?.defId || null,
      holdableA: player.equipped?.holdables?.[0]?.defId || null,
      holdableB: player.equipped?.holdables?.[1]?.defId || null
    },
    bandolier: player.inventory?.bandolier?.map(item => item.defId) || [],
    backpack: player.inventory?.backpack?.map(item => item.defId) || []
  };

  return inventory;
}

/**
 * Convert network inventory format to engine format
 * Network uses CardId strings and holdableA/holdableB
 * Engine uses ItemInstance objects and holdables array
 */
export function convertNetworkInventoryToEngine(
  networkInventory: PlayerInventory
): {
  equipped: {
    wearable?: ItemInstance;
    holdables: ItemInstance[];
  };
  inventory: {
    bandolier: ItemInstance[];
    backpack: ItemInstance[];
  };
} {
  const equipped: any = {};

  // Convert wearable - check if equipped exists first
  if (networkInventory?.equipped?.wearable) {
    equipped.wearable = {
      instanceId: `itm_${Date.now()}_${Math.random()}`,
      defId: networkInventory.equipped.wearable,
      revealed: true
    };
  }

  // Convert holdables from A/B to array
  equipped.holdables = [];
  if (networkInventory?.equipped?.holdableA) {
    equipped.holdables.push({
      instanceId: `itm_${Date.now()}_${Math.random()}`,
      defId: networkInventory.equipped.holdableA,
      revealed: true
    });
  }
  if (networkInventory?.equipped?.holdableB) {
    equipped.holdables.push({
      instanceId: `itm_${Date.now()}_${Math.random()}`,
      defId: networkInventory.equipped.holdableB,
      revealed: true
    });
  }

  // Convert inventory arrays - add null checks
  const inventory = {
    bandolier: (networkInventory?.bandolier || []).map(cardId => ({
      instanceId: `itm_${Date.now()}_${Math.random()}`,
      defId: cardId,
      revealed: false
    })),
    backpack: (networkInventory?.backpack || []).map(cardId => ({
      instanceId: `itm_${Date.now()}_${Math.random()}`,
      defId: cardId,
      revealed: false
    }))
  };

  return { equipped, inventory };
}

/**
 * Convert full player state between engine and network formats
 */
export function convertEnginePlayerToNetwork(enginePlayer: PlayerState): NetworkPlayerState {
  const networkPlayer: NetworkPlayerState = {
    uid: enginePlayer.uid,
    nickname: enginePlayer.nickname,
    classId: enginePlayer.classId,
    hp: enginePlayer.hp,
    maxHp: enginePlayer.maxHp,
    position: enginePlayer.position,
    flags: {
      mustSleepNextTurn: enginePlayer.mustSleepNextTurn,
      skipNextTurn: enginePlayer.skipNextTurn,
      invisibleUntilTs: enginePlayer.invisibleUntilTs || null,
      wardstones: enginePlayer.wardstones,
      ambushCardId: null, // TODO: Handle ambush cards
      monkCancelUsed: enginePlayer.classFlags?.monkCancelUsed
    },
    inventory: convertEngineInventoryToNetwork(enginePlayer),
    movementHistory: enginePlayer.movementHistory?.forwardThisTurn || [],
    perTurn: enginePlayer.perTurn || {}
  };

  return networkPlayer;
}

/**
 * Convert network player to engine format
 */
export function convertNetworkPlayerToEngine(networkPlayer: NetworkPlayerState): PlayerState {
  // Handle case where inventory might not exist
  const defaultInventory: PlayerInventory = {
    equipped: {
      wearable: null,
      holdableA: null,
      holdableB: null
    },
    bandolier: [],
    backpack: []
  };

  const { equipped, inventory } = convertNetworkInventoryToEngine(networkPlayer.inventory || defaultInventory);

  const enginePlayer: PlayerState = {
    uid: networkPlayer.uid,
    seat: 0, // Will be set elsewhere based on turn order
    nickname: networkPlayer.nickname,
    classId: networkPlayer.classId as any,
    classFlags: {
      monkCancelUsed: networkPlayer.flags?.monkCancelUsed
    },
    position: networkPlayer.position,
    hp: networkPlayer.hp,
    maxHp: networkPlayer.maxHp,
    alive: networkPlayer.hp > 0,
    equipped,
    inventory,
    mustSleepNextTurn: networkPlayer.flags?.mustSleepNextTurn,
    skipNextTurn: networkPlayer.flags?.skipNextTurn,
    invisibleUntilTs: networkPlayer.flags?.invisibleUntilTs || undefined,
    wardstones: networkPlayer.flags?.wardstones,
    heldEffects: [], // TODO: Handle held effects
    movementHistory: {
      forwardThisTurn: Array.isArray(networkPlayer.movementHistory) ? networkPlayer.movementHistory : [networkPlayer.position || 0],
      lastFrom: undefined
    },
    perTurn: networkPlayer.perTurn || {}
  };

  return enginePlayer;
}