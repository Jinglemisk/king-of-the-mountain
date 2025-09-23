import {
  ItemInstance, ItemCategory, PlayerId, ItemId, Tier, ItemTag
} from '../types';
import {
  EngineState, EngineContext, DomainEvent, InvalidActionError
} from './types';
import { generateUID } from '../util/rng';

export interface InventorySlot {
  area: 'equipped.wearable' | 'equipped.holdables' | 'inventory.bandolier' | 'inventory.backpack';
  index?: number;
}

export interface ItemMove {
  item: ItemInstance;
  from: InventorySlot;
  to: InventorySlot;
}

export interface CapacityCheck {
  wearable: { current: number; max: number; over: boolean };
  holdables: { current: number; max: number; over: boolean };
  bandolier: { current: number; max: number; over: boolean };
  backpack: { current: number; max: number; over: boolean };
  totalOver: boolean;
}

export function getPlayerCapacity(state: EngineState, playerId: PlayerId): CapacityCheck {
  const player = state.players[playerId];
  if (!player) throw new Error(`Player ${playerId} not found`);

  const isAlchemist = player.classId === 'alchemist';
  const isPorter = player.classId === 'porter';

  const wearableMax = 1;
  const holdablesMax = 2;
  const bandolierMax = isAlchemist ? 2 : 1;
  const backpackMax = isPorter ? 2 : 1;

  const wearableCurrent = player.equipped.wearable ? 1 : 0;
  const holdablesCurrent = player.equipped.holdables.filter(Boolean).length;
  const bandolierCurrent = player.inventory.bandolier.filter(Boolean).length;
  const backpackCurrent = player.inventory.backpack.filter(Boolean).length;

  return {
    wearable: {
      current: wearableCurrent,
      max: wearableMax,
      over: wearableCurrent > wearableMax
    },
    holdables: {
      current: holdablesCurrent,
      max: holdablesMax,
      over: holdablesCurrent > holdablesMax
    },
    bandolier: {
      current: bandolierCurrent,
      max: bandolierMax,
      over: bandolierCurrent > bandolierMax
    },
    backpack: {
      current: backpackCurrent,
      max: backpackMax,
      over: backpackCurrent > backpackMax
    },
    totalOver: false
  };
}

export function canItemFitInSlot(item: ItemInstance, slot: InventorySlot): boolean {
  const category = item.category;

  switch (slot.area) {
    case 'equipped.wearable':
      return category === 'wearable';

    case 'equipped.holdables':
      return category === 'holdable';

    case 'inventory.bandolier':
      return category === 'drinkable' || category === 'small';

    case 'inventory.backpack':
      return category === 'wearable' || category === 'holdable';

    default:
      return false;
  }
}

export function findItemInInventory(
  state: EngineState,
  playerId: PlayerId,
  instanceId: string
): { item: ItemInstance; slot: InventorySlot } | null {
  const player = state.players[playerId];
  if (!player) return null;

  if (player.equipped.wearable?.instanceId === instanceId) {
    return {
      item: player.equipped.wearable,
      slot: { area: 'equipped.wearable' }
    };
  }

  for (let i = 0; i < player.equipped.holdables.length; i++) {
    const holdable = player.equipped.holdables[i];
    if (holdable?.instanceId === instanceId) {
      return {
        item: holdable,
        slot: { area: 'equipped.holdables', index: i }
      };
    }
  }

  for (let i = 0; i < player.inventory.bandolier.length; i++) {
    const item = player.inventory.bandolier[i];
    if (item?.instanceId === instanceId) {
      return {
        item,
        slot: { area: 'inventory.bandolier', index: i }
      };
    }
  }

  for (let i = 0; i < player.inventory.backpack.length; i++) {
    const item = player.inventory.backpack[i];
    if (item?.instanceId === instanceId) {
      return {
        item,
        slot: { area: 'inventory.backpack', index: i }
      };
    }
  }

  return null;
}

export function removeItemFromSlot(
  state: EngineState,
  playerId: PlayerId,
  slot: InventorySlot
): ItemInstance | null {
  const player = state.players[playerId];
  if (!player) return null;

  switch (slot.area) {
    case 'equipped.wearable': {
      const item = player.equipped.wearable;
      player.equipped.wearable = null;
      return item;
    }

    case 'equipped.holdables': {
      const index = slot.index ?? 0;
      const item = player.equipped.holdables[index];
      player.equipped.holdables[index] = null;
      return item;
    }

    case 'inventory.bandolier': {
      const index = slot.index ?? 0;
      const item = player.inventory.bandolier[index];
      player.inventory.bandolier.splice(index, 1);
      return item;
    }

    case 'inventory.backpack': {
      const index = slot.index ?? 0;
      const item = player.inventory.backpack[index];
      player.inventory.backpack.splice(index, 1);
      return item;
    }

    default:
      return null;
  }
}

export function addItemToSlot(
  state: EngineState,
  playerId: PlayerId,
  item: ItemInstance,
  slot: InventorySlot
): boolean {
  const player = state.players[playerId];
  if (!player) return false;

  if (!canItemFitInSlot(item, slot)) return false;

  switch (slot.area) {
    case 'equipped.wearable':
      if (player.equipped.wearable) return false;
      player.equipped.wearable = item;
      return true;

    case 'equipped.holdables': {
      const index = slot.index ?? player.equipped.holdables.findIndex(h => !h);
      if (index < 0 || index >= 2) return false;
      if (player.equipped.holdables[index]) return false;
      player.equipped.holdables[index] = item;
      return true;
    }

    case 'inventory.bandolier': {
      const capacity = getPlayerCapacity(state, playerId);
      if (player.inventory.bandolier.length >= capacity.bandolier.max) return false;
      player.inventory.bandolier.push(item);
      return true;
    }

    case 'inventory.backpack': {
      const capacity = getPlayerCapacity(state, playerId);
      if (player.inventory.backpack.length >= capacity.backpack.max) return false;
      player.inventory.backpack.push(item);
      return true;
    }

    default:
      return false;
  }
}

export function swapItems(
  state: EngineState,
  playerId: PlayerId,
  moves: ItemMove[],
  ctx: EngineContext
): DomainEvent[] {
  const events: DomainEvent[] = [];

  const tempStorage: ItemInstance[] = [];
  for (const move of moves) {
    const removed = removeItemFromSlot(state, playerId, move.from);
    if (removed) {
      tempStorage.push(removed);
    }
  }

  for (const move of moves) {
    const item = tempStorage.find(i => i.instanceId === move.item.instanceId);
    if (item && !addItemToSlot(state, playerId, item, move.to)) {
      throw new Error(`Failed to place item ${item.id} in ${move.to.area}`);
    }
  }

  events.push({
    id: generateUID(),
    ts: ctx.now(),
    type: 'ItemEquipped',
    actor: playerId,
    payload: {
      swaps: moves.map(m => ({
        itemId: m.item.id,
        from: m.from.area,
        to: m.to.area
      }))
    }
  });

  return events;
}

export function enforceCapacity(
  state: EngineState,
  playerId: PlayerId,
  ctx: EngineContext
): { droppedItems: ItemInstance[]; events: DomainEvent[] } {
  const events: DomainEvent[] = [];
  const droppedItems: ItemInstance[] = [];

  const player = state.players[playerId];
  if (!player) return { droppedItems, events };

  const capacity = getPlayerCapacity(state, playerId);

  while (capacity.bandolier.over) {
    const item = player.inventory.bandolier.pop();
    if (item) {
      droppedItems.push(item);
      capacity.bandolier.current--;
      capacity.bandolier.over = capacity.bandolier.current > capacity.bandolier.max;
    }
  }

  while (capacity.backpack.over) {
    const item = player.inventory.backpack.pop();
    if (item) {
      droppedItems.push(item);
      capacity.backpack.current--;
      capacity.backpack.over = capacity.backpack.current > capacity.backpack.max;
    }
  }

  if (droppedItems.length > 0) {
    const tileState = state.tiles[player.position] || {};
    tileState.droppedItems = tileState.droppedItems || [];
    tileState.droppedItems.push(...droppedItems);
    state.tiles[player.position] = tileState;

    events.push({
      id: generateUID(),
      ts: ctx.now(),
      type: 'CapacityEnforced',
      actor: playerId,
      payload: {
        dropped: droppedItems.map(i => i.id),
        tile: player.position
      }
    });

    events.push({
      id: generateUID(),
      ts: ctx.now(),
      type: 'ItemDropped',
      actor: playerId,
      payload: {
        items: droppedItems.map(i => ({ id: i.id, instanceId: i.instanceId })),
        reason: 'over-capacity'
      }
    });
  }

  return { droppedItems, events };
}

export function handleColocatedPickup(
  state: EngineState,
  tileId: string,
  ctx: EngineContext
): DomainEvent[] {
  const events: DomainEvent[] = [];

  const tileState = state.tiles[tileId];
  if (!tileState?.droppedItems || tileState.droppedItems.length === 0) {
    return events;
  }

  const playersOnTile = Object.values(state.players)
    .filter(p => p.position === tileId)
    .map(p => p.uid);

  const currentPlayerIndex = state.turnOrder.indexOf(state.turnOrder[state.currentTurn]);
  const sortedPlayers: PlayerId[] = [];

  for (let i = 1; i < state.turnOrder.length; i++) {
    const idx = (currentPlayerIndex + i) % state.turnOrder.length;
    const pid = state.turnOrder[idx];
    if (playersOnTile.includes(pid)) {
      sortedPlayers.push(pid);
    }
  }

  for (const playerId of sortedPlayers) {
    const capacity = getPlayerCapacity(state, playerId);
    const itemsToPickup: ItemInstance[] = [];

    for (let i = tileState.droppedItems.length - 1; i >= 0; i--) {
      const item = tileState.droppedItems[i];

      if (item.category === 'drinkable' || item.category === 'small') {
        if (capacity.bandolier.current < capacity.bandolier.max) {
          itemsToPickup.push(item);
          tileState.droppedItems.splice(i, 1);
          capacity.bandolier.current++;
        }
      } else if (item.category === 'wearable' || item.category === 'holdable') {
        if (capacity.backpack.current < capacity.backpack.max) {
          itemsToPickup.push(item);
          tileState.droppedItems.splice(i, 1);
          capacity.backpack.current++;
        }
      }
    }

    if (itemsToPickup.length > 0) {
      for (const item of itemsToPickup) {
        if (item.category === 'drinkable' || item.category === 'small') {
          state.players[playerId].inventory.bandolier.push(item);
        } else {
          state.players[playerId].inventory.backpack.push(item);
        }
      }

      events.push({
        id: generateUID(),
        ts: ctx.now(),
        type: 'ItemGained',
        actor: playerId,
        payload: {
          items: itemsToPickup.map(i => ({ id: i.id, instanceId: i.instanceId })),
          source: 'pickup',
          tile: tileId
        }
      });
    }
  }

  for (const remainingItem of tileState.droppedItems) {
    const tier = remainingItem.tier || 'T1';
    const deckKey = `treasure${tier}` as 'treasureT1' | 'treasureT2' | 'treasureT3';

    if (state.decks[deckKey]) {
      state.decks[deckKey].discardPile.push(remainingItem.id);
    }
  }

  tileState.droppedItems = [];

  return events;
}

export function useItem(
  state: EngineState,
  playerId: PlayerId,
  instanceId: string,
  ctx: EngineContext
): DomainEvent[] {
  const events: DomainEvent[] = [];

  const itemLocation = findItemInInventory(state, playerId, instanceId);
  if (!itemLocation) {
    throw new InvalidActionError('Item not found', { type: 'useItem', uid: playerId } as any);
  }

  const item = itemLocation.item;
  const player = state.players[playerId];

  if (item.category === 'drinkable') {
    removeItemFromSlot(state, playerId, itemLocation.slot);

    if (item.id === 'rage-potion') {
      player.activeEffects = player.activeEffects || [];
      player.activeEffects.push({
        type: 'rage-potion',
        duration: 'this-turn',
        source: 'item'
      });
    } else if (item.id === 'agility-draught') {
      player.activeEffects = player.activeEffects || [];
      player.activeEffects.push({
        type: 'agility-draught',
        duration: 'this-turn',
        source: 'item'
      });
    } else if (item.id === 'healing-potion') {
      const healAmount = player.classId === 'alchemist' ? 4 : 3;
      player.hp = Math.min(player.maxHp || 5, player.hp + healAmount);
    } else if (item.id === 'beer') {
      player.hp = Math.min(player.maxHp || 5, player.hp + 1);
    }

    events.push({
      id: generateUID(),
      ts: ctx.now(),
      type: 'ItemUsed',
      actor: playerId,
      payload: {
        itemId: item.id,
        instanceId: item.instanceId,
        effect: item.id
      }
    });

    const deckKey = `treasure${item.tier || 'T1'}` as 'treasureT1' | 'treasureT2' | 'treasureT3';
    if (state.decks[deckKey]) {
      state.decks[deckKey].discardPile.push(item.id);
    }
  } else if (item.category === 'small') {
    if (item.id === 'lamp') {
      const currentTile = state.board.nodes[player.position];
      if (currentTile.type === 'enemy' || Object.values(state.players).some(p =>
        p.position === player.position && p.uid !== playerId
      )) {
        const history = player.movementHistory || [];
        if (history.length > 0) {
          const previousPosition = history[history.length - 1];
          player.position = previousPosition;
          player.pendingTileResolution = false;

          removeItemFromSlot(state, playerId, itemLocation.slot);

          events.push({
            id: generateUID(),
            ts: ctx.now(),
            type: 'ItemUsed',
            actor: playerId,
            payload: {
              itemId: 'lamp',
              effect: 'step-back',
              from: currentTile.id,
              to: previousPosition
            }
          });
        }
      }
    }
  }

  return events;
}

export function equipItem(
  state: EngineState,
  playerId: PlayerId,
  instanceId: string,
  ctx: EngineContext
): DomainEvent[] {
  const events: DomainEvent[] = [];

  const itemLocation = findItemInInventory(state, playerId, instanceId);
  if (!itemLocation) {
    throw new InvalidActionError('Item not found', { type: 'equipItem', uid: playerId } as any);
  }

  const item = itemLocation.item;

  let targetSlot: InventorySlot;
  if (item.category === 'wearable') {
    targetSlot = { area: 'equipped.wearable' };
  } else if (item.category === 'holdable') {
    const player = state.players[playerId];
    const emptyIndex = player.equipped.holdables.findIndex(h => !h);
    if (emptyIndex === -1) {
      throw new InvalidActionError('No empty holdable slots', { type: 'equipItem', uid: playerId } as any);
    }
    targetSlot = { area: 'equipped.holdables', index: emptyIndex };
  } else {
    throw new InvalidActionError('Item cannot be equipped', { type: 'equipItem', uid: playerId } as any);
  }

  const moves: ItemMove[] = [{
    item,
    from: itemLocation.slot,
    to: targetSlot
  }];

  return swapItems(state, playerId, moves, ctx);
}