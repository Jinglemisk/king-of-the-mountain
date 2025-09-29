// /src/game/engine/deckUtils.ts
// Deck management utilities for drawing cards with reshuffle logic

import type { DeckState } from '../types';
import type { RNG } from './types';

export interface DrawResult<T = string> {
  drawn: T[];
  deck: DeckState;
}

/**
 * Draw cards from a deck, reshuffling discard pile if needed
 * @param deck - Current deck state
 * @param count - Number of cards to draw
 * @param rng - RNG instance for shuffling
 * @returns Drawn cards and updated deck state
 */
export function drawFromDeck(
  deck: DeckState,
  count: number,
  rng: RNG
): DrawResult {
  const drawn: string[] = [];

  // Handle null/undefined deck
  if (!deck || !deck.drawPile) {
    return {
      drawn: [],
      deck: { drawPile: [], discardPile: [] }
    };
  }

  let drawPile = [...deck.drawPile];
  let discardPile = [...(deck.discardPile || [])];

  for (let i = 0; i < count; i++) {
    // If draw pile is empty, reshuffle discard pile
    if (drawPile.length === 0) {
      if (discardPile.length === 0) {
        // No cards left at all
        break;
      }

      // Reshuffle discard pile into draw pile
      drawPile = rng.shuffle(discardPile, 'deck-reshuffle');
      discardPile = [];
    }

    // Draw from top of deck
    const card = drawPile.shift();
    if (card) {
      drawn.push(card);
    }
  }

  return {
    drawn,
    deck: {
      drawPile,
      discardPile
    }
  };
}

/**
 * Add cards to the discard pile
 * @param deck - Current deck state
 * @param cards - Cards to discard
 * @returns Updated deck state
 */
export function discardCards(
  deck: DeckState,
  cards: string[]
): DeckState {
  return {
    drawPile: deck.drawPile,
    discardPile: [...deck.discardPile, ...cards]
  };
}

/**
 * Get the appropriate enemy deck based on tier
 * @param state - Game engine state
 * @param tier - Enemy tier (1, 2, or 3)
 * @returns The appropriate enemy deck state
 */
export function getEnemyDeckByTier(state: any, tier: number): DeckState | null {
  switch (tier) {
    case 1:
      return state.decks?.enemies?.t1 || null;
    case 2:
      return state.decks?.enemies?.t2 || null;
    case 3:
      return state.decks?.enemies?.t3 || null;
    default:
      return null;
  }
}

/**
 * Get the appropriate treasure deck based on tier
 * @param state - Game engine state
 * @param tier - Treasure tier (1, 2, or 3)
 * @returns The appropriate treasure deck state
 */
export function getTreasureDeckByTier(state: any, tier: number): DeckState | null {
  switch (tier) {
    case 1:
      return state.decks?.treasure?.t1 || null;
    case 2:
      return state.decks?.treasure?.t2 || null;
    case 3:
      return state.decks?.treasure?.t3 || null;
    default:
      return null;
  }
}

/**
 * Get the chance deck
 * @param state - Game engine state
 * @returns The chance deck state
 */
export function getChanceDeck(state: any): DeckState | null {
  return state.decks?.chance?.main || null;
}

/**
 * Determine enemy composition based on tier
 * According to GDD:
 * - T1: d4, 1 = one enemy, 2-4 = two enemies
 * - T2: d6, 1-2 = one enemy, 3-6 = two enemies
 * - T3: d6, 1-3 = two enemies, 4-6 = three enemies
 */
export function getEnemyDrawCount(tier: number, rng: RNG): number {
  switch (tier) {
    case 1: {
      const roll = rng.roll('d4', undefined, 'enemy-composition-t1');
      return roll.value === 1 ? 1 : 2;
    }
    case 2: {
      const roll = rng.roll('d6', undefined, 'enemy-composition-t2');
      return roll.value <= 2 ? 1 : 2;
    }
    case 3: {
      const roll = rng.roll('d6', undefined, 'enemy-composition-t3');
      return roll.value <= 3 ? 2 : 3;
    }
    default:
      return 1;
  }
}