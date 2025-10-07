/**
 * Card Manager - Deck Configuration for Testing
 *
 * Control which cards appear in the game and in what quantities.
 * Priority cards are placed at the top of the deck (unshuffled).
 *
 * HOW TO USE:
 * 1. Edit the `deckConfig` object below to enable/disable cards
 * 2. Set `quantity` to control how many copies appear
 * 3. Set `priority: true` to place cards at top of deck
 * 4. To reset: Copy DEFAULT_DECK_CONFIG into deckConfig
 * 5. To save as new default: Copy your deckConfig into DEFAULT_DECK_CONFIG
 */

interface CardConfig {
  enabled: boolean;
  quantity: number;
  priority: boolean;
}

interface TreasureDeckConfig {
  // Tier 1
  Dagger: CardConfig;
  WoodenShield: CardConfig;
  Robe: CardConfig;
  CrudeAxe: CardConfig;
  Lamp: CardConfig;
  Trap: CardConfig;
  LuckCharm: CardConfig;
  Beer: CardConfig;
  AgilityDraught: CardConfig;
  // Tier 2
  HeirloomArmor: CardConfig;
  SilverShield: CardConfig;
  LordsSword: CardConfig;
  BoogeyBane: CardConfig;
  VelvetCloak: CardConfig;
  RagePotion: CardConfig;
  FairyDust: CardConfig;
  SmokeBomb: CardConfig;
  // Tier 3
  RoyalAegis: CardConfig;
  EssenceOfTheMysteriousFlower: CardConfig;
  DragonfangGreatsword: CardConfig;
  BlinkScroll: CardConfig;
  Wardstone: CardConfig;
}

interface LuckDeckConfig {
  Exhaustion: CardConfig;
  CaveIn: CardConfig;
  Faint: CardConfig;
  VitalEnergy: CardConfig;
  LostTreasure: CardConfig;
  JinnThief: CardConfig;
  SprainedWrist: CardConfig;
  CoveredPit: CardConfig;
  WhiteBeardedSpirit: CardConfig;
  MysticWave: CardConfig;
  NefariousSpirit: CardConfig;
  AmbushOpportunity: CardConfig;
  Instinct: CardConfig;
}

interface DeckConfig {
  treasures: TreasureDeckConfig;
  luckCards: LuckDeckConfig;
}

/**
 * DEFAULT DECK CONFIGURATION
 * This is your baseline - all cards enabled with normal quantities.
 * To save your current config as the new default, manually copy deckConfig into this object.
 */
const DEFAULT_DECK_CONFIG: DeckConfig = {
  treasures: {
    // === TIER 1 TREASURES (24 total) ===
    Dagger: { enabled: true, quantity: 4, priority: false },
    WoodenShield: { enabled: true, quantity: 4, priority: false },
    Robe: { enabled: true, quantity: 3, priority: false },
    CrudeAxe: { enabled: true, quantity: 3, priority: false },
    Lamp: { enabled: true, quantity: 2, priority: false },
    Trap: { enabled: true, quantity: 3, priority: false },
    LuckCharm: { enabled: true, quantity: 2, priority: false },
    Beer: { enabled: true, quantity: 2, priority: false },
    AgilityDraught: { enabled: true, quantity: 1, priority: false },

    // === TIER 2 TREASURES (18 total) ===
    HeirloomArmor: { enabled: true, quantity: 3, priority: false },
    SilverShield: { enabled: true, quantity: 3, priority: false },
    LordsSword: { enabled: true, quantity: 3, priority: false },
    BoogeyBane: { enabled: true, quantity: 2, priority: false },
    VelvetCloak: { enabled: true, quantity: 2, priority: false },
    RagePotion: { enabled: true, quantity: 2, priority: false },
    FairyDust: { enabled: true, quantity: 2, priority: false },
    SmokeBomb: { enabled: true, quantity: 1, priority: false },

    // === TIER 3 TREASURES (10 total) ===
    RoyalAegis: { enabled: true, quantity: 2, priority: false },
    EssenceOfTheMysteriousFlower: { enabled: true, quantity: 2, priority: false },
    DragonfangGreatsword: { enabled: true, quantity: 2, priority: false },
    BlinkScroll: { enabled: true, quantity: 2, priority: false },
    Wardstone: { enabled: true, quantity: 2, priority: false },
  },

  luckCards: {
    // === LUCK CARDS (32 total) ===
    Exhaustion: { enabled: true, quantity: 4, priority: false },
    CaveIn: { enabled: true, quantity: 3, priority: false },
    Faint: { enabled: true, quantity: 2, priority: false },
    VitalEnergy: { enabled: true, quantity: 2, priority: false },
    LostTreasure: { enabled: true, quantity: 2, priority: false },
    JinnThief: { enabled: true, quantity: 3, priority: false },
    SprainedWrist: { enabled: true, quantity: 3, priority: false },
    CoveredPit: { enabled: true, quantity: 3, priority: false },
    WhiteBeardedSpirit: { enabled: true, quantity: 2, priority: false },
    MysticWave: { enabled: true, quantity: 2, priority: false },
    NefariousSpirit: { enabled: true, quantity: 2, priority: false },
    AmbushOpportunity: { enabled: true, quantity: 2, priority: false },
    Instinct: { enabled: true, quantity: 2, priority: false },
  },
};

/**
 * WORKING DECK CONFIGURATION
 * Edit this object to customize your deck for testing.
 *
 * Examples:
 *
 * // Disable a card completely:
 * Trap: { enabled: false, quantity: 0, priority: false },
 *
 * // Test with more copies of a card:
 * Dagger: { enabled: true, quantity: 10, priority: false },
 *
 * // Force specific cards to top of deck:
 * Beer: { enabled: true, quantity: 2, priority: true },
 * Trap: { enabled: true, quantity: 3, priority: true },
 * // These will be drawn first (shuffled among priority cards only)
 *
 * // Test only specific cards (disable all others):
 * Trap: { enabled: true, quantity: 5, priority: true },
 * Beer: { enabled: true, quantity: 5, priority: true },
 * // All other cards: { enabled: false, quantity: 0, priority: false }
 */
export const deckConfig: DeckConfig = {
  treasures: {
    // === TIER 1 TREASURES (24 total) ===
    Dagger: { enabled: true, quantity: 4, priority: false },
    WoodenShield: { enabled: true, quantity: 4, priority: false },
    Robe: { enabled: true, quantity: 3, priority: false },
    CrudeAxe: { enabled: true, quantity: 3, priority: false },
    Lamp: { enabled: true, quantity: 2, priority: false },
    Trap: { enabled: true, quantity: 3, priority: false },
    LuckCharm: { enabled: true, quantity: 2, priority: false },
    Beer: { enabled: true, quantity: 2, priority: false },
    AgilityDraught: { enabled: true, quantity: 1, priority: false },

    // === TIER 2 TREASURES (18 total) ===
    HeirloomArmor: { enabled: true, quantity: 3, priority: false },
    SilverShield: { enabled: true, quantity: 3, priority: false },
    LordsSword: { enabled: true, quantity: 3, priority: false },
    BoogeyBane: { enabled: true, quantity: 2, priority: false },
    VelvetCloak: { enabled: true, quantity: 2, priority: false },
    RagePotion: { enabled: true, quantity: 2, priority: false },
    FairyDust: { enabled: true, quantity: 2, priority: false },
    SmokeBomb: { enabled: true, quantity: 1, priority: false },

    // === TIER 3 TREASURES (10 total) ===
    RoyalAegis: { enabled: true, quantity: 2, priority: false },
    EssenceOfTheMysteriousFlower: { enabled: true, quantity: 2, priority: false },
    DragonfangGreatsword: { enabled: true, quantity: 2, priority: false },
    BlinkScroll: { enabled: true, quantity: 2, priority: false },
    Wardstone: { enabled: true, quantity: 2, priority: false },
  },

  luckCards: {
    // === LUCK CARDS (32 total) ===
    Exhaustion: { enabled: true, quantity: 4, priority: false },
    CaveIn: { enabled: true, quantity: 3, priority: false },
    Faint: { enabled: true, quantity: 2, priority: false },
    VitalEnergy: { enabled: true, quantity: 2, priority: false },
    LostTreasure: { enabled: true, quantity: 2, priority: false },
    JinnThief: { enabled: true, quantity: 3, priority: false },
    SprainedWrist: { enabled: true, quantity: 3, priority: false },
    CoveredPit: { enabled: true, quantity: 3, priority: false },
    WhiteBeardedSpirit: { enabled: true, quantity: 2, priority: false },
    MysticWave: { enabled: true, quantity: 2, priority: false },
    NefariousSpirit: { enabled: true, quantity: 2, priority: false },
    AmbushOpportunity: { enabled: true, quantity: 2, priority: false },
    Instinct: { enabled: true, quantity: 2, priority: false },
  },
};

/**
 * Reset working config to default
 * Call this function or manually copy DEFAULT_DECK_CONFIG into deckConfig
 */
export function resetToDefault(): DeckConfig {
  return JSON.parse(JSON.stringify(DEFAULT_DECK_CONFIG));
}

/**
 * Map card names to their factory functions
 * Used by deck building to create the correct card instances
 */
export const CARD_NAME_MAP = {
  // Tier 1
  Dagger: 'Dagger',
  WoodenShield: 'Wooden Shield',
  Robe: 'Robe',
  CrudeAxe: 'Crude Axe',
  Lamp: 'Lamp',
  Trap: 'Trap',
  LuckCharm: 'Luck Charm',
  Beer: 'Beer',
  AgilityDraught: 'Agility Draught',
  // Tier 2
  HeirloomArmor: 'Heirloom Armor',
  SilverShield: 'Silver Shield',
  LordsSword: "Lord's Sword",
  BoogeyBane: 'Boogey-Bane',
  VelvetCloak: 'Velvet Cloak',
  RagePotion: 'Rage Potion',
  FairyDust: 'Fairy Dust',
  SmokeBomb: 'Smoke Bomb',
  // Tier 3
  RoyalAegis: 'Royal Aegis',
  EssenceOfTheMysteriousFlower: 'Essence of the Mysterious Flower',
  DragonfangGreatsword: 'Dragonfang Greatsword',
  BlinkScroll: 'Blink Scroll',
  Wardstone: 'Wardstone',
  // Luck cards
  Exhaustion: 'Exhaustion',
  CaveIn: 'Cave-in',
  Faint: 'Faint',
  VitalEnergy: 'Vital Energy',
  LostTreasure: 'Lost Treasure',
  JinnThief: 'Jinn Thief',
  SprainedWrist: 'Sprained Wrist',
  CoveredPit: 'Covered Pit',
  WhiteBeardedSpirit: 'White-Bearded Spirit',
  MysticWave: 'Mystic Wave',
  NefariousSpirit: 'Nefarious Spirit',
  AmbushOpportunity: 'Ambush Opportunity',
  Instinct: 'Instinct',
} as const;

/**
 * Get treasure deck configuration for a specific tier
 */
export function getTier1TreasureConfig() {
  return {
    Dagger: deckConfig.treasures.Dagger,
    WoodenShield: deckConfig.treasures.WoodenShield,
    Robe: deckConfig.treasures.Robe,
    CrudeAxe: deckConfig.treasures.CrudeAxe,
    Lamp: deckConfig.treasures.Lamp,
    Trap: deckConfig.treasures.Trap,
    LuckCharm: deckConfig.treasures.LuckCharm,
    Beer: deckConfig.treasures.Beer,
    AgilityDraught: deckConfig.treasures.AgilityDraught,
  };
}

export function getTier2TreasureConfig() {
  return {
    HeirloomArmor: deckConfig.treasures.HeirloomArmor,
    SilverShield: deckConfig.treasures.SilverShield,
    LordsSword: deckConfig.treasures.LordsSword,
    BoogeyBane: deckConfig.treasures.BoogeyBane,
    VelvetCloak: deckConfig.treasures.VelvetCloak,
    RagePotion: deckConfig.treasures.RagePotion,
    FairyDust: deckConfig.treasures.FairyDust,
    SmokeBomb: deckConfig.treasures.SmokeBomb,
  };
}

export function getTier3TreasureConfig() {
  return {
    RoyalAegis: deckConfig.treasures.RoyalAegis,
    EssenceOfTheMysteriousFlower: deckConfig.treasures.EssenceOfTheMysteriousFlower,
    DragonfangGreatsword: deckConfig.treasures.DragonfangGreatsword,
    BlinkScroll: deckConfig.treasures.BlinkScroll,
    Wardstone: deckConfig.treasures.Wardstone,
  };
}

export function getLuckCardConfig() {
  return deckConfig.luckCards;
}
