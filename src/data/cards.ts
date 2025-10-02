/**
 * Card definitions for Treasure and Luck/Chance decks
 * Items and effects are organized by tier
 * Easily editable - add/remove/modify cards by editing the arrays below
 */

import type { Item, LuckCard } from '../types';

/**
 * Creates a unique item instance
 * @param name - Item name
 * @param category - Item category (holdable, wearable, small)
 * @param tier - Item tier (1, 2, or 3)
 * @param description - Full effect description
 * @param options - Additional item properties
 * @returns A new Item object
 */
function createItem(
  name: string,
  category: 'holdable' | 'wearable' | 'small',
  tier: 1 | 2 | 3,
  description: string,
  options: {
    attackBonus?: number;
    defenseBonus?: number;
    movementBonus?: number;
    special?: string;
    isConsumable?: boolean;
    requiresTarget?: boolean;
  } = {}
): Item {
  const item: Item = {
    id: `${name}-${Date.now()}-${Math.random()}`, // Unique ID
    name,
    category,
    tier,
    description,
  };

  // Only include optional fields if they have values
  if (options.attackBonus !== undefined) item.attackBonus = options.attackBonus;
  if (options.defenseBonus !== undefined) item.defenseBonus = options.defenseBonus;
  if (options.movementBonus !== undefined) item.movementBonus = options.movementBonus;
  if (options.special !== undefined) item.special = options.special;
  if (options.isConsumable !== undefined) item.isConsumable = options.isConsumable;
  if (options.requiresTarget !== undefined) item.requiresTarget = options.requiresTarget;

  return item;
}

// ============================================================================
// TIER 1 TREASURE CARDS (24 total)
// ============================================================================

export const TIER_1_TREASURE_FACTORIES = [
  // Dagger: Holdable, +1 Attack (4 copies)
  () => createItem('Dagger', 'holdable', 1, '+1 Attack when equipped', { attackBonus: 1 }),
  () => createItem('Dagger', 'holdable', 1, '+1 Attack when equipped', { attackBonus: 1 }),
  () => createItem('Dagger', 'holdable', 1, '+1 Attack when equipped', { attackBonus: 1 }),
  () => createItem('Dagger', 'holdable', 1, '+1 Attack when equipped', { attackBonus: 1 }),

  // Wooden Shield: Holdable, +1 Defense (4 copies)
  () => createItem('Wooden Shield', 'holdable', 1, '+1 Defense when equipped', { defenseBonus: 1 }),
  () => createItem('Wooden Shield', 'holdable', 1, '+1 Defense when equipped', { defenseBonus: 1 }),
  () => createItem('Wooden Shield', 'holdable', 1, '+1 Defense when equipped', { defenseBonus: 1 }),
  () => createItem('Wooden Shield', 'holdable', 1, '+1 Defense when equipped', { defenseBonus: 1 }),

  // Robe: Wearable, +1 Defense (3 copies)
  () => createItem('Robe', 'wearable', 1, '+1 Defense when equipped', { defenseBonus: 1 }),
  () => createItem('Robe', 'wearable', 1, '+1 Defense when equipped', { defenseBonus: 1 }),
  () => createItem('Robe', 'wearable', 1, '+1 Defense when equipped', { defenseBonus: 1 }),

  // Crude Axe: Holdable, +1 Attack (3 copies)
  () => createItem('Crude Axe', 'holdable', 1, '+1 Attack when equipped', { attackBonus: 1 }),
  () => createItem('Crude Axe', 'holdable', 1, '+1 Attack when equipped', { attackBonus: 1 }),
  () => createItem('Crude Axe', 'holdable', 1, '+1 Attack when equipped', { attackBonus: 1 }),

  // Lamp: Holdable, special ability (2 copies)
  () => createItem('Lamp', 'holdable', 1, 'If your turn would end on a tile with a player or enemy, you may step back 1 tile BEFORE resolving that tile', {
    special: 'step_back_before_resolve',
  }),
  () => createItem('Lamp', 'holdable', 1, 'If your turn would end on a tile with a player or enemy, you may step back 1 tile BEFORE resolving that tile', {
    special: 'step_back_before_resolve',
  }),

  // Trap: Small, place on tile (3 copies)
  () => createItem('Trap', 'small', 1, 'Place on your current tile; the next player who lands here skips their next turn (visible)', {
    special: 'trap',
    isConsumable: true,
  }),
  () => createItem('Trap', 'small', 1, 'Place on your current tile; the next player who lands here skips their next turn (visible)', {
    special: 'trap',
    isConsumable: true,
  }),
  () => createItem('Trap', 'small', 1, 'Place on your current tile; the next player who lands here skips their next turn (visible)', {
    special: 'trap',
    isConsumable: true,
  }),

  // Luck Charm: Small, interrupt (2 copies)
  () => createItem('Luck Charm', 'small', 1, 'Cancel a Luck card you just drew or another player just revealed; play immediately as an interrupt; then return to bottom of T1', {
    special: 'luck_cancel',
    isConsumable: true,
  }),
  () => createItem('Luck Charm', 'small', 1, 'Cancel a Luck card you just drew or another player just revealed; play immediately as an interrupt; then return to bottom of T1', {
    special: 'luck_cancel',
    isConsumable: true,
  }),

  // Beer: Drinkable, heal 3 HP, -1 movement (2 copies)
  () => createItem('Beer', 'small', 1, 'Heal 3 HP; -1 to your next movement roll', {
    special: 'heal_3_debuff_move',
    isConsumable: true,
  }),
  () => createItem('Beer', 'small', 1, 'Heal 3 HP; -1 to your next movement roll', {
    special: 'heal_3_debuff_move',
    isConsumable: true,
  }),

  // Agility Draught: Drinkable, +1 defense this turn (1 copy)
  () => createItem('Agility Draught', 'small', 1, '+1 to all your Defense rolls this turn', {
    special: 'temp_defense_1',
    isConsumable: true,
  }),
];

// ============================================================================
// TIER 2 TREASURE CARDS (18 total)
// ============================================================================

export const TIER_2_TREASURE_FACTORIES = [
  // Heirloom Armor: Wearable, +2 Defense (3 copies)
  () => createItem('Heirloom Armor', 'wearable', 2, '+2 Defense when equipped', { defenseBonus: 2 }),
  () => createItem('Heirloom Armor', 'wearable', 2, '+2 Defense when equipped', { defenseBonus: 2 }),
  () => createItem('Heirloom Armor', 'wearable', 2, '+2 Defense when equipped', { defenseBonus: 2 }),

  // Silver Shield: Holdable, +2 Defense (3 copies)
  () => createItem('Silver Shield', 'holdable', 2, '+2 Defense when equipped', { defenseBonus: 2 }),
  () => createItem('Silver Shield', 'holdable', 2, '+2 Defense when equipped', { defenseBonus: 2 }),
  () => createItem('Silver Shield', 'holdable', 2, '+2 Defense when equipped', { defenseBonus: 2 }),

  // Lord's Sword: Holdable, +2 Attack (3 copies)
  () => createItem('Lord\'s Sword', 'holdable', 2, '+2 Attack when equipped', { attackBonus: 2 }),
  () => createItem('Lord\'s Sword', 'holdable', 2, '+2 Attack when equipped', { attackBonus: 2 }),
  () => createItem('Lord\'s Sword', 'holdable', 2, '+2 Attack when equipped', { attackBonus: 2 }),

  // Boogey-Bane: Holdable, +2 Attack vs creatures (2 copies)
  () => createItem('Boogey-Bane', 'holdable', 2, '+2 Attack vs creatures only (not players)', {
    attackBonus: 2,
    special: 'creatures_only',
  }),
  () => createItem('Boogey-Bane', 'holdable', 2, '+2 Attack vs creatures only (not players)', {
    attackBonus: 2,
    special: 'creatures_only',
  }),

  // Velvet Cloak: Wearable, +1 movement (2 copies)
  () => createItem('Velvet Cloak', 'wearable', 2, '+1 to movement roll', { movementBonus: 1 }),
  () => createItem('Velvet Cloak', 'wearable', 2, '+1 to movement roll', { movementBonus: 1 }),

  // Rage Potion: Drinkable, +1 attack this turn (2 copies)
  () => createItem('Rage Potion', 'small', 2, '+1 to all your Attack rolls this turn', {
    special: 'temp_attack_1',
    isConsumable: true,
  }),
  () => createItem('Rage Potion', 'small', 2, '+1 to all your Attack rolls this turn', {
    special: 'temp_attack_1',
    isConsumable: true,
  }),

  // Fairy Dust: Small, become invisible (2 copies)
  () => createItem('Fairy Dust', 'small', 2, 'Use before choosing Sleep; you become invisible to other players until your next turn starts or if any effect moves you; cannot be dueled while invisible', {
    special: 'invisibility',
    isConsumable: true,
  }),
  () => createItem('Fairy Dust', 'small', 2, 'Use before choosing Sleep; you become invisible to other players until your next turn starts or if any effect moves you; cannot be dueled while invisible', {
    special: 'invisibility',
    isConsumable: true,
  }),

  // Smoke Bomb: Small, prevent duels (1 copy)
  () => createItem('Smoke Bomb', 'small', 2, 'When someone offers a duel to you, play to prevent any duels for the remainder of the current turn; return to bottom of T2', {
    special: 'prevent_duel',
    isConsumable: true,
  }),
];

// ============================================================================
// TIER 3 TREASURE CARDS (10 total)
// ============================================================================

export const TIER_3_TREASURE_FACTORIES = [
  // Royal Aegis: Wearable, +3 Defense, -1 movement (2 copies)
  () => createItem('Royal Aegis', 'wearable', 3, '+3 Defense, -1 to movement roll', {
    defenseBonus: 3,
    movementBonus: -1,
  }),
  () => createItem('Royal Aegis', 'wearable', 3, '+3 Defense, -1 to movement roll', {
    defenseBonus: 3,
    movementBonus: -1,
  }),

  // Essence of the Mysterious Flower: Drinkable, full heal (2 copies)
  () => createItem('Essence of the Mysterious Flower', 'small', 3, 'Fully heal to max HP', {
    special: 'full_heal',
    isConsumable: true,
  }),
  () => createItem('Essence of the Mysterious Flower', 'small', 3, 'Fully heal to max HP', {
    special: 'full_heal',
    isConsumable: true,
  }),

  // Dragonfang Greatsword: Holdable, +3 Attack (2 copies)
  () => createItem('Dragonfang Greatsword', 'holdable', 3, '+3 Attack when equipped', { attackBonus: 3 }),
  () => createItem('Dragonfang Greatsword', 'holdable', 3, '+3 Attack when equipped', { attackBonus: 3 }),

  // Blink Scroll: Small, teleport (2 copies)
  () => createItem('Blink Scroll', 'small', 3, 'Move yourself +2 or -2 tiles before resolving your tile; ignore pass-through effects; cannot move into or out of Sanctuary if a card/effect would force you', {
    special: 'blink',
    isConsumable: true,
  }),
  () => createItem('Blink Scroll', 'small', 3, 'Move yourself +2 or -2 tiles before resolving your tile; ignore pass-through effects; cannot move into or out of Sanctuary if a card/effect would force you', {
    special: 'blink',
    isConsumable: true,
  }),

  // Wardstone: Small, prevent 1 HP loss (2 copies)
  () => createItem('Wardstone', 'small', 3, 'The next time you would lose HP, prevent 1 HP loss, then discard', {
    special: 'prevent_1_hp',
    isConsumable: true,
  }),
  () => createItem('Wardstone', 'small', 3, 'The next time you would lose HP, prevent 1 HP loss, then discard', {
    special: 'prevent_1_hp',
    isConsumable: true,
  }),
];

// ============================================================================
// LUCK/CHANCE CARDS (32 total)
// ============================================================================

/**
 * Creates a luck card
 * @param name - Card name
 * @param description - Full effect description
 * @param effect - Effect identifier for code logic
 * @param value - Numeric value if applicable
 * @param options - Additional card properties
 * @returns A new LuckCard object
 */
function createLuckCard(
  name: string,
  description: string,
  effect: string,
  value?: number,
  options: { requiresChoice?: boolean; canBeKept?: boolean } = {}
): LuckCard {
  const card: LuckCard = {
    id: `luck-${name}-${Date.now()}-${Math.random()}`,
    name,
    description,
    effect,
  };

  // Only include optional fields if they have values
  if (value !== undefined) card.value = value;
  if (options.requiresChoice !== undefined) card.requiresChoice = options.requiresChoice;
  if (options.canBeKept !== undefined) card.canBeKept = options.canBeKept;

  return card;
}

export const LUCK_CARD_FACTORIES = [
  // Exhaustion: move 1 back (4 copies)
  () => createLuckCard('Exhaustion', 'Move 1 tile back', 'move_back', 1),
  () => createLuckCard('Exhaustion', 'Move 1 tile back', 'move_back', 1),
  () => createLuckCard('Exhaustion', 'Move 1 tile back', 'move_back', 1),
  () => createLuckCard('Exhaustion', 'Move 1 tile back', 'move_back', 1),

  // Cave-in: move 3 back (3 copies)
  () => createLuckCard('Cave-in', 'Move 3 tiles back', 'move_back', 3),
  () => createLuckCard('Cave-in', 'Move 3 tiles back', 'move_back', 3),
  () => createLuckCard('Cave-in', 'Move 3 tiles back', 'move_back', 3),

  // Faint: skip next turn (2 copies)
  () => createLuckCard('Faint', 'Skip your next turn', 'skip_turn'),
  () => createLuckCard('Faint', 'Skip your next turn', 'skip_turn'),

  // Vital Energy: roll movement again (2 copies)
  () => createLuckCard('Vital Energy', 'Roll movement again immediately and move', 'roll_again'),
  () => createLuckCard('Vital Energy', 'Roll movement again immediately and move', 'roll_again'),

  // Lost Treasure: skip next turn but draw 2 T1 (2 copies)
  () => createLuckCard('Lost Treasure', 'Skip next turn; draw 2 Tier 1 Treasures now', 'skip_draw_t1', 2),
  () => createLuckCard('Lost Treasure', 'Skip next turn; draw 2 Tier 1 Treasures now', 'skip_draw_t1', 2),

  // Jinn Thief: lose one item (3 copies)
  () => createLuckCard('Jinn Thief', 'Choose one of your items (equipped or in inventory) and return it to the bottom of the matching Treasure tier deck', 'steal_item', undefined, { requiresChoice: true }),
  () => createLuckCard('Jinn Thief', 'Choose one of your items (equipped or in inventory) and return it to the bottom of the matching Treasure tier deck', 'steal_item', undefined, { requiresChoice: true }),
  () => createLuckCard('Jinn Thief', 'Choose one of your items (equipped or in inventory) and return it to the bottom of the matching Treasure tier deck', 'steal_item', undefined, { requiresChoice: true }),

  // Sprained Wrist: lose 1 HP (3 copies)
  () => createLuckCard('Sprained Wrist', 'Lose 1 HP', 'lose_hp', 1),
  () => createLuckCard('Sprained Wrist', 'Lose 1 HP', 'lose_hp', 1),
  () => createLuckCard('Sprained Wrist', 'Lose 1 HP', 'lose_hp', 1),

  // Covered Pit: draw 1 T1 Treasure (3 copies)
  () => createLuckCard('Covered Pit', 'Draw 1 Tier 1 Treasure now', 'draw_t1', 1),
  () => createLuckCard('Covered Pit', 'Draw 1 Tier 1 Treasure now', 'draw_t1', 1),
  () => createLuckCard('Covered Pit', 'Draw 1 Tier 1 Treasure now', 'draw_t1', 1),

  // White-Bearded Spirit: move 2 forward (2 copies)
  () => createLuckCard('White-Bearded Spirit', 'Move 2 tiles forward', 'move_forward', 2),
  () => createLuckCard('White-Bearded Spirit', 'Move 2 tiles forward', 'move_forward', 2),

  // Mystic Wave: swap positions (2 copies)
  () => createLuckCard('Mystic Wave', 'Swap positions with the nearest player (tie breaks random; Sanctuary allowed because you affect yourself)', 'swap_position', undefined, { requiresChoice: true }),
  () => createLuckCard('Mystic Wave', 'Swap positions with the nearest player (tie breaks random; Sanctuary allowed because you affect yourself)', 'swap_position', undefined, { requiresChoice: true }),

  // Nefarious Spirit: move to nearest and duel (2 copies)
  () => createLuckCard('Nefarious Spirit', 'If any player is within 6 tiles, move to that player and immediately start a duel (nearest; tie random)', 'forced_duel'),
  () => createLuckCard('Nefarious Spirit', 'If any player is within 6 tiles, move to that player and immediately start a duel (nearest; tie random)', 'forced_duel'),

  // Ambush Opportunity: keep face down, place for ambush (2 copies)
  () => createLuckCard('Ambush Opportunity', 'Keep face down; starting next turn, place it on your current non-Sanctuary tile; the next time a player enters that tile during movement, you may immediately start a duel before the tile resolves; then discard', 'ambush', undefined, { canBeKept: true }),
  () => createLuckCard('Ambush Opportunity', 'Keep face down; starting next turn, place it on your current non-Sanctuary tile; the next time a player enters that tile during movement, you may immediately start a duel before the tile resolves; then discard', 'ambush', undefined, { canBeKept: true }),

  // Instinct: keep face down, move +1 or -1 (2 copies)
  () => createLuckCard('Instinct', 'Keep face down; once on your turn, move yourself +1 or -1 tile before or after your movement roll; single use', 'instinct', undefined, { canBeKept: true }),
  () => createLuckCard('Instinct', 'Keep face down; once on your turn, move yourself +1 or -1 tile before or after your movement roll; single use', 'instinct', undefined, { canBeKept: true }),
];

// ============================================================================
// DECK BUILDING FUNCTIONS
// ============================================================================

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param deck - Array to shuffle
 * @returns Shuffled array
 */
function shuffleDeck<T>(deck: T[]): T[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Build a shuffled treasure deck for a given tier
 * @param tier - The treasure tier (1, 2, or 3)
 * @returns Shuffled array of Item objects
 */
export function buildTreasureDeck(tier: 1 | 2 | 3): Item[] {
  let factories: (() => Item)[];

  if (tier === 1) {
    factories = TIER_1_TREASURE_FACTORIES;
  } else if (tier === 2) {
    factories = TIER_2_TREASURE_FACTORIES;
  } else {
    factories = TIER_3_TREASURE_FACTORIES;
  }

  const deck = factories.map(factory => factory());
  return shuffleDeck(deck);
}

/**
 * Build a shuffled luck deck
 * @returns Shuffled array of LuckCard objects
 */
export function buildLuckDeck(): LuckCard[] {
  const deck = LUCK_CARD_FACTORIES.map(factory => factory());
  return shuffleDeck(deck);
}
