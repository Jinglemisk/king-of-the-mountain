// /src/game/engine/tileResolver.ts
// Tile resolution logic for handling different tile types

import type {
  NodeId,
  PlayerId,
  ItemInstance,
  EnemyInstance
} from '../types';
import type { EngineState, DomainEvent, EngineContext } from './types';
import type { BoardGraphExtended } from './board';
import {
  drawFromDeck,
  getEnemyDeckByTier,
  getTreasureDeckByTier,
  getChanceDeck,
  getEnemyDrawCount
} from './deckUtils';
import {
  createItemInstance,
  createEnemyInstance,
  CHANCE_CARDS
} from '../data/content';
import { generateUID } from '../util/rng';

/**
 * Deep copy utility for ensuring state immutability
 */
function deepCopyState(state: EngineState): EngineState {
  return JSON.parse(JSON.stringify(state));
}

export interface TileResolutionResult {
  state: EngineState;
  events: DomainEvent[];
  shouldStartCombat?: boolean;
  drawnEnemies?: EnemyInstance[];
  drawnItems?: ItemInstance[];
  drawnChance?: any;
}

/**
 * Resolve what happens when a player lands on a tile
 */
export function resolveTileEffect(
  state: EngineState,
  playerId: PlayerId,
  tileId: NodeId,
  ctx: EngineContext
): TileResolutionResult {
  const events: DomainEvent[] = [];
  // Deep copy to avoid mutations
  let newState = deepCopyState(state);

  const board = state.board.graph as BoardGraphExtended;
  const tile = board.nodes.find(n => n.id === tileId);

  console.log('[tileResolver] resolveTileEffect called for tile:', tileId);
  if (!tile) {
    throw new Error(`Tile ${tileId} not found`);
  }

  console.log('[tileResolver] Tile found - type:', tile.type, 'tier:', tile.tier);
  const player = newState.players[playerId];
  if (!player) {
    throw new Error(`Player ${playerId} not found`);
  }

  // Log tile entry
  events.push({
    id: generateUID(),
    ts: ctx.now(),
    type: 'TileEntered',
    actor: playerId,
    payload: {
      tileId,
      tileType: tile.type,
      tier: tile.tier
    }
  });

  console.log('[tileResolver] Processing tile type:', tile.type);
  switch (tile.type) {
    case 'enemy':
      return resolveEnemyTile(newState, player, tile, ctx, events);

    case 'treasure':
      return resolveTreasureTile(newState, player, tile, ctx, events);

    case 'chance':
      return resolveChanceTile(newState, player, tile, ctx, events);

    case 'sanctuary':
      return resolveSanctuaryTile(newState, player, tile, ctx, events);

    case 'empty':
    case 'start':
      // No effect
      return { state: newState, events };

    case 'final':
      // Victory handled elsewhere
      return { state: newState, events };

    default:
      return { state: newState, events };
  }
}

function resolveEnemyTile(
  state: EngineState,
  player: any,
  tile: any,
  ctx: EngineContext,
  events: DomainEvent[]
): TileResolutionResult {
  const tier = tile.tier || 1;
  const enemyDeck = getEnemyDeckByTier(state, tier);

  if (!enemyDeck) {
    console.error(`No enemy deck for tier ${tier}`);
    return { state, events };
  }

  // Determine how many enemies to draw
  const drawCount = getEnemyDrawCount(tier, ctx.rng);

  // Draw enemy cards
  const drawResult = drawFromDeck(enemyDeck, drawCount, ctx.rng);

  // Deep copy state to avoid mutations
  const newState = deepCopyState(state);
  if (!newState.decks) newState.decks = {} as any;
  if (!newState.decks.enemies) newState.decks.enemies = {} as any;

  // Update the deck state
  switch (tier) {
    case 1:
      newState.decks.enemies.t1 = drawResult.deck;
      break;
    case 2:
      newState.decks.enemies.t2 = drawResult.deck;
      break;
    case 3:
      newState.decks.enemies.t3 = drawResult.deck;
      break;
  }

  // Create enemy instances
  const enemies: EnemyInstance[] = drawResult.drawn.map(enemyId =>
    createEnemyInstance(enemyId)
  );

  // Place enemies on the tile
  const tileKey = tile.id.toString();
  if (!newState.tileState) newState.tileState = {};
  if (!newState.tileState[tileKey]) {
    newState.tileState[tileKey] = {};
  }
  newState.tileState[tileKey].enemies = enemies;

  // Log enemy spawn
  // Log each enemy spawn
  for (const enemy of enemies) {
    events.push({
      id: generateUID(),
      ts: ctx.now(),
      type: 'EnemySpawned',
      actor: player.uid,
      payload: {
        tileId: tile.id,
        enemy: {
          id: enemy.instanceId,
          defId: enemy.defId,
          hp: enemy.currentHp
        },
        tier
      }
    });
  }

  return {
    state: newState,
    events,
    shouldStartCombat: true,
    drawnEnemies: enemies
  };
}

function resolveTreasureTile(
  state: EngineState,
  player: any,
  tile: any,
  ctx: EngineContext,
  events: DomainEvent[]
): TileResolutionResult {
  console.log('[tileResolver] resolveTreasureTile called');
  const tier = tile.tier || 1;
  const treasureDeck = getTreasureDeckByTier(state, tier);

  if (!treasureDeck) {
    console.error(`No treasure deck for tier ${tier}`);
    return { state, events };
  }

  // Draw one treasure card
  const drawResult = drawFromDeck(treasureDeck, 1, ctx.rng);

  if (drawResult.drawn.length === 0) {
    events.push({
      id: generateUID(),
      ts: ctx.now(),
      type: 'DeckShuffled',
      actor: player.uid,
      payload: {
        deckType: 'treasure',
        tier,
        message: 'Treasure deck empty'
      }
    });
    return { state, events };
  }

  // Deep copy state to avoid mutations
  const newState = deepCopyState(state);
  if (!newState.decks) newState.decks = {} as any;
  if (!newState.decks.treasure) newState.decks.treasure = {} as any;

  // Update the deck state
  switch (tier) {
    case 1:
      newState.decks.treasure.t1 = drawResult.deck;
      break;
    case 2:
      newState.decks.treasure.t2 = drawResult.deck;
      break;
    case 3:
      newState.decks.treasure.t3 = drawResult.deck;
      break;
  }

  // Create item instance
  const itemId = drawResult.drawn[0];
  const itemInstance = createItemInstance(itemId);

  // Get the player from the new state
  const newPlayer = newState.players[player.uid];

  // Initialize inventory if needed with correct structure
  if (!newPlayer.inventory) {
    newPlayer.inventory = {
      bandolier: [],
      backpack: []
    };
  }
  if (!newPlayer.equipped) {
    newPlayer.equipped = {
      holdables: []
    };
  }

  // Add to player's backpack (will need capacity check later)
  newPlayer.inventory.backpack.push(itemInstance);

  // Get the item definition for the card data
  const { TREASURES } = require('../data/content');
  const itemDef = TREASURES[itemId];

  console.log('[tileResolver] Creating TreasureDrawn event for item:', itemId, itemDef.name);

  // Log treasure gain
  // Log treasure drawn with full card data
  const treasureEvent = {
    id: generateUID(),
    ts: ctx.now(),
    type: 'TreasureDrawn' as const,
    actor: player.uid,
    payload: {
      tileId: tile.id,
      tier,
      card: {
        ...itemDef,
        instanceId: itemInstance.instanceId
      }
    }
  };
  console.log('[tileResolver] TreasureDrawn event:', treasureEvent);
  events.push(treasureEvent);

  // Log item gained
  events.push({
    id: generateUID(),
    ts: ctx.now(),
    type: 'ItemGained',
    actor: player.uid,
    payload: {
      itemId: itemInstance.defId,
      instanceId: itemInstance.instanceId,
      location: 'backpack'
    }
  });

  return {
    state: newState,
    events,
    drawnItems: [itemInstance]
  };
}

function resolveChanceTile(
  state: EngineState,
  player: any,
  tile: any,
  ctx: EngineContext,
  events: DomainEvent[]
): TileResolutionResult {
  console.log('[tileResolver] resolveChanceTile called');
  const chanceDeck = getChanceDeck(state);

  if (!chanceDeck) {
    console.error('No chance deck found');
    return { state, events };
  }

  // Draw one chance card
  const drawResult = drawFromDeck(chanceDeck, 1, ctx.rng);

  if (drawResult.drawn.length === 0) {
    events.push({
      id: generateUID(),
      ts: ctx.now(),
      type: 'DeckShuffled',
      actor: player.uid,
      payload: {
        deckType: 'chance',
        message: 'Chance deck empty'
      }
    });
    return { state, events };
  }

  // Deep copy state to avoid mutations
  const newState = deepCopyState(state);
  if (!newState.decks) newState.decks = {} as any;
  if (!newState.decks.chance) newState.decks.chance = {} as any;

  // Update the deck state
  newState.decks.chance.main = drawResult.deck;

  // Get the chance card definition
  const chanceCardId = drawResult.drawn[0];
  const chanceCard = CHANCE_CARDS[chanceCardId];

  if (!chanceCard) {
    console.error(`Chance card ${chanceCardId} not found`);
    return { state, events };
  }

  console.log('[tileResolver] Creating ChanceCardResolved event for card:', chanceCardId, chanceCard.name);

  // Log chance card resolved with full card data
  const chanceEvent = {
    id: generateUID(),
    ts: ctx.now(),
    type: 'ChanceCardResolved' as const,
    actor: player.uid,
    payload: {
      tileId: tile.id,
      card: {
        id: chanceCardId,
        name: chanceCard.name,
        rulesText: chanceCard.rulesText,
        tier: chanceCard.tier
      }
    }
  };
  console.log('[tileResolver] ChanceCardResolved event:', chanceEvent);
  events.push(chanceEvent);

  // For now, all chance cards are immediate effects
  // Add to discard pile after resolution
  if (!newState.decks.chance.main.discardPile) {
    newState.decks.chance.main.discardPile = [];
  }
  newState.decks.chance.main.discardPile.push(chanceCardId);

  return {
    state: newState,
    events,
    drawnChance: chanceCard
  };
}

function resolveSanctuaryTile(
  state: EngineState,
  player: any,
  tile: any,
  ctx: EngineContext,
  events: DomainEvent[]
): TileResolutionResult {
  // Sanctuary provides safety - log it
  // Deep copy state to avoid mutations
  const newState = deepCopyState(state);
  const newPlayer = newState.players[player.uid];

  // Heal 1 HP at sanctuary
  const oldHp = newPlayer.hp;
  newPlayer.hp = Math.min(newPlayer.hp + 1, newPlayer.maxHp);

  if (newPlayer.hp > oldHp) {
    events.push({
      id: generateUID(),
      ts: ctx.now(),
      type: 'DamageApplied',
      actor: player.uid,
      payload: {
        targetId: player.uid,
        damage: -1, // negative for healing
        newHp: newPlayer.hp,
        source: 'sanctuary'
      }
    });
  }

  events.push({
    id: generateUID(),
    ts: ctx.now(),
    type: 'TileEntered',
    actor: player.uid,
    payload: {
      tileId: tile.id,
      sanctuary: true,
      healed: newPlayer.hp > oldHp
    }
  });

  return { state: newState, events };
}