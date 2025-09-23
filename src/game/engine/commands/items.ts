import {
  EngineState, EngineContext, EngineUpdate, DomainEvent,
  UseItemAction, EquipItemAction, UnequipItemAction, SwapEquipmentAction,
  DropItemAction, PickUpDroppedAction, ConsumePotionAction, PlayHeldEffectAction,
  InvalidActionError
} from '../types';
import {
  findItemInInventory, removeItemFromSlot, addItemToSlot, swapItems,
  enforceCapacity, handleColocatedPickup, useItem, equipItem,
  getPlayerCapacity, InventorySlot, ItemMove
} from '../inventory';
import { generateUID } from '../../util/rng';
import { ItemInstance } from '../../types';

export function handleUseItem(
  state: EngineState,
  action: UseItemAction,
  ctx: EngineContext
): EngineUpdate {
  const currentPlayer = state.turnOrder[state.currentTurn];
  if (currentPlayer !== action.uid && state.phase !== 'combat') {
    throw new InvalidActionError('Can only use items on your turn or during combat', action);
  }

  const newState = { ...state };
  const events = useItem(newState, action.uid, action.instanceId, ctx);

  return { state: newState, events };
}

export function handleEquipItem(
  state: EngineState,
  action: EquipItemAction,
  ctx: EngineContext
): EngineUpdate {
  if (state.phase !== 'manage') {
    throw new InvalidActionError('Can only equip items during manage phase', action);
  }

  const currentPlayer = state.turnOrder[state.currentTurn];
  if (currentPlayer !== action.uid) {
    throw new InvalidActionError('Not your turn', action);
  }

  const newState = { ...state };
  const events = equipItem(newState, action.uid, action.instanceId, ctx);

  return { state: newState, events };
}

export function handleUnequipItem(
  state: EngineState,
  action: UnequipItemAction,
  ctx: EngineContext
): EngineUpdate {
  if (state.phase !== 'manage') {
    throw new InvalidActionError('Can only unequip items during manage phase', action);
  }

  const currentPlayer = state.turnOrder[state.currentTurn];
  if (currentPlayer !== action.uid) {
    throw new InvalidActionError('Not your turn', action);
  }

  const newState = { ...state };
  const events: DomainEvent[] = [];

  const itemLocation = findItemInInventory(newState, action.uid, action.instanceId);
  if (!itemLocation) {
    throw new InvalidActionError('Item not found', action);
  }

  const item = itemLocation.item;
  const player = newState.players[action.uid];

  if (itemLocation.slot.area.startsWith('inventory')) {
    throw new InvalidActionError('Item is not equipped', action);
  }

  let targetSlot: InventorySlot | null = null;

  const capacity = getPlayerCapacity(newState, action.uid);

  if (item.category === 'wearable' || item.category === 'holdable') {
    if (capacity.backpack.current < capacity.backpack.max) {
      targetSlot = { area: 'inventory.backpack' };
    }
  } else if (item.category === 'drinkable' || item.category === 'small') {
    if (capacity.bandolier.current < capacity.bandolier.max) {
      targetSlot = { area: 'inventory.bandolier' };
    }
  }

  if (!targetSlot) {
    throw new InvalidActionError('No inventory space to unequip item', action);
  }

  const moves: ItemMove[] = [{
    item,
    from: itemLocation.slot,
    to: targetSlot
  }];

  const swapEvents = swapItems(newState, action.uid, moves, ctx);

  events.push({
    id: generateUID(),
    ts: ctx.now(),
    type: 'ItemUnequipped',
    actor: action.uid,
    payload: {
      itemId: item.id,
      from: itemLocation.slot.area
    }
  });

  events.push(...swapEvents);

  return { state: newState, events };
}

export function handleSwapEquipment(
  state: EngineState,
  action: SwapEquipmentAction,
  ctx: EngineContext
): EngineUpdate {
  if (state.phase !== 'manage' && state.phase !== 'resolveTile') {
    throw new InvalidActionError('Can only swap equipment during manage phase or when drawing items', action);
  }

  const currentPlayer = state.turnOrder[state.currentTurn];
  if (currentPlayer !== action.uid) {
    throw new InvalidActionError('Not your turn', action);
  }

  const newState = { ...state };
  const events: DomainEvent[] = [];

  const moves: ItemMove[] = [];
  for (const move of action.moves) {
    const itemLocation = findItemInInventory(newState, action.uid, move.instanceId);
    if (!itemLocation) {
      throw new InvalidActionError(`Item ${move.instanceId} not found`, action);
    }

    moves.push({
      item: itemLocation.item,
      from: itemLocation.slot,
      to: move.to as InventorySlot
    });
  }

  const swapEvents = swapItems(newState, action.uid, moves, ctx);
  events.push(...swapEvents);

  return { state: newState, events };
}

export function handleDropItem(
  state: EngineState,
  action: DropItemAction,
  ctx: EngineContext
): EngineUpdate {
  if (state.phase !== 'manage' && state.phase !== 'capacity') {
    throw new InvalidActionError('Can only drop items during manage or capacity phase', action);
  }

  const currentPlayer = state.turnOrder[state.currentTurn];
  if (currentPlayer !== action.uid) {
    throw new InvalidActionError('Not your turn', action);
  }

  const newState = { ...state };
  const events: DomainEvent[] = [];

  const itemLocation = findItemInInventory(newState, action.uid, action.instanceId);
  if (!itemLocation) {
    throw new InvalidActionError('Item not found', action);
  }

  const item = removeItemFromSlot(newState, action.uid, itemLocation.slot);
  if (!item) {
    throw new InvalidActionError('Failed to remove item', action);
  }

  const player = newState.players[action.uid];
  const tileState = newState.tiles[player.position] || {};
  tileState.droppedItems = tileState.droppedItems || [];
  tileState.droppedItems.push(item);
  newState.tiles[player.position] = tileState;

  events.push({
    id: generateUID(),
    ts: ctx.now(),
    type: 'ItemDropped',
    actor: action.uid,
    payload: {
      itemId: item.id,
      instanceId: item.instanceId,
      tile: player.position,
      reason: 'voluntary'
    }
  });

  return { state: newState, events };
}

export function handlePickUpDropped(
  state: EngineState,
  action: PickUpDroppedAction,
  ctx: EngineContext
): EngineUpdate {
  if (state.phase !== 'capacity') {
    throw new InvalidActionError('Can only pick up items during capacity phase', action);
  }

  const newState = { ...state };
  const events: DomainEvent[] = [];

  const player = newState.players[action.uid];
  const tileState = newState.tiles[player.position];

  if (!tileState?.droppedItems || tileState.droppedItems.length === 0) {
    throw new InvalidActionError('No items to pick up', action);
  }

  const capacity = getPlayerCapacity(newState, action.uid);
  const pickedItems: ItemInstance[] = [];

  for (const instanceId of action.instanceIds) {
    const itemIndex = tileState.droppedItems.findIndex(i => i.instanceId === instanceId);
    if (itemIndex === -1) continue;

    const item = tileState.droppedItems[itemIndex];
    let canPickup = false;

    if (item.category === 'drinkable' || item.category === 'small') {
      if (capacity.bandolier.current < capacity.bandolier.max) {
        player.inventory.bandolier.push(item);
        capacity.bandolier.current++;
        canPickup = true;
      }
    } else if (item.category === 'wearable' || item.category === 'holdable') {
      if (capacity.backpack.current < capacity.backpack.max) {
        player.inventory.backpack.push(item);
        capacity.backpack.current++;
        canPickup = true;
      }
    }

    if (canPickup) {
      tileState.droppedItems.splice(itemIndex, 1);
      pickedItems.push(item);
    }
  }

  if (pickedItems.length > 0) {
    events.push({
      id: generateUID(),
      ts: ctx.now(),
      type: 'ItemGained',
      actor: action.uid,
      payload: {
        items: pickedItems.map(i => ({ id: i.id, instanceId: i.instanceId })),
        source: 'pickup',
        tile: player.position
      }
    });
  }

  return { state: newState, events };
}

export function handleConsumePotion(
  state: EngineState,
  action: ConsumePotionAction,
  ctx: EngineContext
): EngineUpdate {
  const currentPlayer = state.turnOrder[state.currentTurn];
  const isMyTurn = currentPlayer === action.uid;

  const itemLocation = findItemInInventory(state, action.uid, action.instanceId);
  if (!itemLocation) {
    throw new InvalidActionError('Potion not found', action);
  }

  const item = itemLocation.item;
  if (item.category !== 'drinkable') {
    throw new InvalidActionError('Item is not a drinkable', action);
  }

  const isInterrupt = item.id === 'smoke-bomb';

  if (!isMyTurn && !isInterrupt) {
    throw new InvalidActionError('Can only use non-interrupt potions on your turn', action);
  }

  const newState = { ...state };
  const events = useItem(newState, action.uid, action.instanceId, ctx);

  return { state: newState, events };
}

export function handlePlayHeldEffect(
  state: EngineState,
  action: PlayHeldEffectAction,
  ctx: EngineContext
): EngineUpdate {
  const events: DomainEvent[] = [];

  const player = state.players[action.uid];
  const heldEffect = player.heldEffects?.find(e => e.instanceId === action.instanceId);

  if (!heldEffect) {
    throw new InvalidActionError('Held effect not found', action);
  }

  const newState = { ...state };

  if (heldEffect.type === 'ambush') {
    const targetPlayer = Object.values(newState.players).find(p =>
      p.position === player.position && p.uid !== action.uid
    );

    if (!targetPlayer) {
      throw new InvalidActionError('No valid target for Ambush', action);
    }

    targetPlayer.position = newState.board.nodes.start.id;
    targetPlayer.movementHistory = [];
    targetPlayer.pendingTileResolution = false;

    events.push({
      id: generateUID(),
      ts: ctx.now(),
      type: 'ItemUsed',
      actor: action.uid,
      payload: {
        itemId: 'ambush',
        effect: 'send-to-start',
        target: targetPlayer.uid
      }
    });

    player.heldEffects = player.heldEffects?.filter(e => e.instanceId !== action.instanceId);

  } else if (heldEffect.type === 'instinct') {
    const roll = ctx.rng.roll('d6', action.uid, 'instinct-cancel');

    if (roll.value >= 4) {
      events.push({
        id: generateUID(),
        ts: ctx.now(),
        type: 'ItemUsed',
        actor: action.uid,
        payload: {
          itemId: 'instinct',
          effect: 'cancel-enemy',
          roll: roll.value
        }
      });
    } else {
      events.push({
        id: generateUID(),
        ts: ctx.now(),
        type: 'DiceRolled',
        actor: action.uid,
        payload: {
          purpose: 'instinct-failed',
          roll: roll.value
        }
      });
    }

    player.heldEffects = player.heldEffects?.filter(e => e.instanceId !== action.instanceId);
  }

  return { state: newState, events };
}

export function handleCapacityEnforcement(
  state: EngineState,
  ctx: EngineContext
): EngineUpdate {
  if (state.phase !== 'capacity') {
    return { state, events: [] };
  }

  const newState = { ...state };
  const events: DomainEvent[] = [];

  const currentPlayer = state.turnOrder[state.currentTurn];
  const { droppedItems, events: dropEvents } = enforceCapacity(newState, currentPlayer, ctx);

  events.push(...dropEvents);

  if (droppedItems.length > 0) {
    const pickupEvents = handleColocatedPickup(newState, newState.players[currentPlayer].position, ctx);
    events.push(...pickupEvents);
  }

  return { state: newState, events };
}