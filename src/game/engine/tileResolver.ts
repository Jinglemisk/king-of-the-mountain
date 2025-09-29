// /src/game/engine/tileResolver.ts
// Tile resolution logic for handling different tile types

import type {
  NodeId,
  PlayerId,
  ItemInstance,
  EnemyInstance,
  ChanceCardDef,
  TileType
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

export interface TileResolutionResult {
  state: EngineState;
  events: DomainEvent[];
  shouldStartCombat?: boolean;
  drawnEnemies?: EnemyInstance[];
  drawnItems?: ItemInstance[];
  drawnChance?: ChanceCardDef;
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
  let newState = { ...state };

  const board = state.board.graph as BoardGraphExtended;
  const tile = board.nodes.find(n => n.id === tileId);

  if (!tile) {
    throw new Error(`Tile ${tileId} not found`);
  }

  const player = newState.players[playerId];
  if (!player) {
    throw new Error(`Player ${playerId} not found`);
  }

  // Log tile entry
  events.push({
    id: generateUID(),
    ts: ctx.now(),
    type: 'TileResolved',
    actor: playerId,
    payload: {
      tileId,
      tileType: tile.type,
      tier: tile.tier
    }
  });

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

  // Update the deck state
  switch (tier) {
    case 1:
      state.decks.enemies.t1 = drawResult.deck;
      break;
    case 2:
      state.decks.enemies.t2 = drawResult.deck;
      break;
    case 3:
      state.decks.enemies.t3 = drawResult.deck;
      break;
  }

  // Create enemy instances
  const enemies: EnemyInstance[] = drawResult.drawn.map(enemyId =>
    createEnemyInstance(enemyId)
  );

  // Place enemies on the tile
  const tileKey = tile.id.toString();
  if (!state.tileState[tileKey]) {
    state.tileState[tileKey] = {};
  }
  state.tileState[tileKey].enemies = enemies;

  // Log enemy spawn
  events.push({
    id: generateUID(),
    ts: ctx.now(),
    type: 'EnemiesSpawned',
    actor: player.uid,
    payload: {
      tileId: tile.id,
      enemies: enemies.map(e => ({
        id: e.instanceId,
        defId: e.defId,
        hp: e.currentHp
      })),
      count: enemies.length,
      tier
    }
  });

  return {
    state,
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
      type: 'TreasureEmpty',
      actor: player.uid,
      payload: { tileId: tile.id, tier }
    });
    return { state, events };
  }

  // Update the deck state
  switch (tier) {
    case 1:
      state.decks.treasure.t1 = drawResult.deck;
      break;
    case 2:
      state.decks.treasure.t2 = drawResult.deck;
      break;
    case 3:
      state.decks.treasure.t3 = drawResult.deck;
      break;
  }

  // Create item instance
  const itemId = drawResult.drawn[0];
  const itemInstance = createItemInstance(itemId);

  // Initialize inventory if needed with correct structure
  if (!player.inventory) {
    player.inventory = {
      bandolier: [],
      backpack: []
    };
  }
  if (!player.equipped) {
    player.equipped = {
      holdables: []
    };
  }

  // Add to player's backpack (will need capacity check later)
  player.inventory.backpack.push(itemInstance);

  // Log treasure gain
  events.push({
    id: generateUID(),
    ts: ctx.now(),
    type: 'TreasureGained',
    actor: player.uid,
    payload: {
      tileId: tile.id,
      itemId: itemInstance.defId,
      instanceId: itemInstance.instanceId,
      tier
    }
  });

  return {
    state,
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
      type: 'ChanceEmpty',
      actor: player.uid,
      payload: { tileId: tile.id }
    });
    return { state, events };
  }

  // Update the deck state
  state.decks.chance.main = drawResult.deck;

  // Get the chance card definition
  const chanceCardId = drawResult.drawn[0];
  const chanceCard = CHANCE_CARDS.find(c => c.id === chanceCardId);

  if (!chanceCard) {
    console.error(`Chance card ${chanceCardId} not found`);
    return { state, events };
  }

  // Log chance card drawn
  events.push({
    id: generateUID(),
    ts: ctx.now(),
    type: 'ChanceDrawn',
    actor: player.uid,
    payload: {
      tileId: tile.id,
      cardId: chanceCardId,
      cardName: chanceCard.name,
      kind: chanceCard.kind
    }
  });

  // Handle immediate vs keep cards
  if (chanceCard.kind === 'immediate') {
    // Resolve immediately (will implement specific effects later)
    events.push({
      id: generateUID(),
      ts: ctx.now(),
      type: 'ChanceResolved',
      actor: player.uid,
      payload: {
        cardId: chanceCardId,
        immediate: true
      }
    });

    // Add to discard pile
    state.decks.chance.main.discardPile.push(chanceCardId);
  } else {
    // Keep card - add to player's held effects
    if (!player.heldEffects) {
      player.heldEffects = [];
    }
    player.heldEffects.push({
      instanceId: generateUID(),
      defId: chanceCardId,
      revealed: false
    });

    events.push({
      id: generateUID(),
      ts: ctx.now(),
      type: 'ChanceKept',
      actor: player.uid,
      payload: {
        cardId: chanceCardId,
        cardName: chanceCard.name
      }
    });
  }

  return {
    state,
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
  events.push({
    id: generateUID(),
    ts: ctx.now(),
    type: 'SanctuaryEntered',
    actor: player.uid,
    payload: {
      tileId: tile.id,
      message: 'You are safe in the sanctuary'
    }
  });

  return { state, events };
}