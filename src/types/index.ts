/**
 * Type definitions for King of the Mountain game
 * This file contains all TypeScript interfaces and types used throughout the game
 */

// ============================================================================
// ENUMS
// ============================================================================

/** Player class types that determine starting gear and special abilities */
export type PlayerClass =
  | 'Scout'      // Immune to Traps
  | 'Hunter'     // +1 Attack vs Enemies
  | 'Gladiator'  // +1 Attack vs Players
  | 'Warden'     // +1 Defence vs Enemies
  | 'Guard'      // +1 Defence vs Players
  | 'Monk'       // Restore 1 HP once when dropping to 0
  | 'Porter';    // +1 Inventory slot

/** Different types of tiles on the game board */
export type TileType =
  | 'start'      // Starting tile
  | 'enemy1'     // Enemy tile tier 1
  | 'enemy2'     // Enemy tile tier 2
  | 'enemy3'     // Enemy tile tier 3
  | 'treasure1'  // Treasure tile tier 1
  | 'treasure2'  // Treasure tile tier 2
  | 'treasure3'  // Treasure tile tier 3
  | 'luck'       // Luck/Chance tile
  | 'sanctuary'  // Safe tile, no duels allowed
  | 'final';     // Final tile, staying here wins the game

/** Card types in the game */
export type CardType =
  | 'enemy'      // Enemy card
  | 'treasure'   // Treasure/Item card
  | 'luck';      // Luck Card

/** Item categories determining inventory slot usage */
export type ItemCategory =
  | 'holdable'    // Weapons, shields (2 slots, equipped in hands)
  | 'wearable'    // Armor, cloaks (2 slots, equipped on body)
  | 'small';      // Consumables, trinkets (1 slot, stored in backpack)

/** Current state/phase of a player's turn */
export type TurnPhase =
  | 'waiting'     // Not this player's turn
  | 'pre-action'  // Can swap items before action
  | 'action'      // Can choose Move/Sleep/Duel/Trade
  | 'post-move'   // After rolling/moving, resolving tile effects
  | 'combat'      // In combat with enemies or another player
  | 'inventory'   // Must drop items if inventory full
  | 'ended';      // Turn completed

/** Player action choices during their turn */
export type PlayerAction =
  | 'move'   // Roll dice and move forward
  | 'sleep'  // Stay on tile, restore to full HP
  | 'duel'   // Initiate combat with another player
  | 'trade'; // Trade items with another player

/** Current status of the game */
export type GameStatus =
  | 'waiting'  // In lobby, waiting for players
  | 'active'   // Game in progress
  | 'finished'; // Game ended, someone won

// ============================================================================
// ITEM TYPES
// ============================================================================

/** Base interface for all items in the game */
export interface Item {
  id: string;                    // Unique identifier for this item instance
  name: string;                  // Display name
  category: ItemCategory;        // Holdable, Wearable, or Small
  tier: 1 | 2 | 3;              // Item tier (determines treasure deck)
  description: string;           // Full effect description
  attackBonus?: number;          // Attack bonus when equipped
  defenseBonus?: number;         // Defense bonus when equipped
  movementBonus?: number;        // Movement roll bonus
  special?: string;              // Special effect description
  isConsumable?: boolean;        // True if item is consumed on use
  requiresTarget?: boolean;      // True if item needs a target to use
}

// ============================================================================
// PLAYER TYPES
// ============================================================================

/** Equipment slots - what a player has actively equipped */
export interface Equipment {
  holdable1: Item | null;  // First hand slot (weapon/shield)
  holdable2: Item | null;  // Second hand slot (weapon/shield)
  wearable: Item | null;   // Body slot (armor/cloak)
}

/** Inventory - what a player is carrying in their backpack (4-5 slots depending on class) */
export type Inventory = (Item | null)[];

/** Complete player state */
export interface Player {
  id: string;                  // Unique player ID
  nickname: string;            // Player's chosen name
  class: PlayerClass | null;   // Selected class (null until chosen)
  position: number;            // Current tile position (0-19)
  hp: number;                  // Current hit points (max 5)
  maxHp: number;               // Maximum hit points (always 5)
  equipment: Equipment;        // Equipped items
  inventory: Inventory;        // Carried items in backpack
  isReady: boolean;            // Ready status in lobby
  isHost: boolean;             // True if this player created the lobby
  isAlive: boolean;            // False if HP = 0 (sleeping)
  actionTaken?: PlayerAction | null; // Action taken this turn (move/sleep)
  specialAbilityUsed?: boolean; // For Monk class - tracks if revival used
  isInvisible?: boolean;       // For Fairy Dust effect
  tempEffects?: TempEffect[];  // Temporary effects active on this player
  skipNextTileEffect?: boolean; // True if player should skip tile effect (trap triggered)
}

/** Temporary effects that last for a limited time */
export interface TempEffect {
  type: string;                // Effect identifier (e.g., 'rage_potion')
  duration: number;            // Turns remaining
  attackBonus?: number;        // Temporary attack bonus
  defenseBonus?: number;       // Temporary defense bonus
  description: string;         // Effect description
}

// ============================================================================
// ENEMY TYPES
// ============================================================================

/** Enemy card definition */
export interface Enemy {
  id: string;                  // Unique instance ID
  name: string;                // Enemy name
  tier: 1 | 2 | 3;            // Enemy tier
  hp: number;                  // Current hit points
  maxHp: number;               // Maximum hit points
  attackBonus: number;         // Attack modifier
  defenseBonus: number;        // Defense modifier
  special?: string;            // Special ability description
}

// ============================================================================
// CARD TYPES
// ============================================================================

/** Luck Card definition */
export interface LuckCard {
  id: string;                  // Card identifier
  name: string;                // Card name
  description: string;         // Full effect description
  effect: string;              // Effect type for code logic
  value?: number;              // Numeric value for moves, HP, etc.
  requiresChoice?: boolean;    // True if player must make a choice
  canBeKept?: boolean;         // True if card can be kept face-down
}

// ============================================================================
// TILE TYPES
// ============================================================================

/** Game board tile definition */
export interface Tile {
  id: number;                  // Tile index (0-19)
  type: TileType;              // Tile type
  hasTrap?: boolean;           // True if a Trap item is placed here
  trapOwnerId?: string;        // ID of player who placed the trap
}

// ============================================================================
// COMBAT TYPES
// ============================================================================

/** Combat state when fighting enemies or other players */
export interface CombatState {
  isActive: boolean;           // True if combat is ongoing
  attackerId: string;          // Player initiating combat
  defenderIds: string[];       // Enemy IDs or player IDs being fought
  defenders: (Enemy | Player)[]; // Actual defender entities
  currentRound: number;        // Current round number
  combatLog: CombatLogEntry[]; // Log of all combat rounds
  canRetreat: boolean;         // True if retreat is allowed
}

/** Single round of combat results */
export interface CombatLogEntry {
  round: number;               // Round number
  attackerRoll: CombatRoll;    // Attacker's dice rolls and totals
  defenderRolls: CombatRoll[]; // Each defender's dice rolls and totals
  results: CombatResult[];     // Outcome for each combatant
}

/** Dice rolls and calculated totals for one combatant */
export interface CombatRoll {
  entityId: string;            // Player or enemy ID
  entityName: string;          // Display name
  attackDie: number;           // Raw attack die roll (1-6)
  defenseDie: number;          // Raw defense die roll (1-6)
  attackBonus: number;         // Bonuses from items/class
  defenseBonus: number;        // Bonuses from items/class
  totalAttack: number;         // Final attack score
  totalDefense: number;        // Final defense score
}

/** Result of combat for a single entity */
export interface CombatResult {
  entityId: string;            // Player or enemy ID
  entityName: string;          // Display name
  hpLost: number;              // HP lost this round (0 or 1)
  hpRemaining: number;         // HP after this round
  isDefeated: boolean;         // True if reduced to 0 HP
}

// ============================================================================
// TRADE TYPES
// ============================================================================

/** Trade state when two players are trading items */
export interface TradeState {
  isActive: boolean;           // True if trade is ongoing
  player1Id: string;           // First trader ID
  player2Id: string;           // Second trader ID
  player1Offers: Item[];       // Items player 1 is offering
  player2Offers: Item[];       // Items player 2 is offering
  player1Accepted: boolean;    // True if player 1 clicked accept
  player2Accepted: boolean;    // True if player 2 clicked accept
}

// ============================================================================
// GAME STATE
// ============================================================================

/** Game event log entry for displaying in chat */
export interface LogEntry {
  id: string;                  // Unique log entry ID
  timestamp: number;           // Unix timestamp
  type: 'action' | 'combat' | 'system' | 'chat'; // Log entry type
  message: string;             // Log message
  playerId?: string;           // Player associated with this log
  isImportant?: boolean;       // Highlight important events
}

/** Complete game state stored in Firebase */
export interface GameState {
  // Lobby Info
  lobbyCode: string;           // 6-character alphanumeric code
  status: GameStatus;          // Current game status

  // Players
  players: Record<string, Player>; // Map of player ID to Player
  turnOrder: string[];         // Ordered list of player IDs
  currentTurnIndex: number;    // Index in turnOrder (whose turn it is)

  // Board
  tiles: Tile[];               // 20 tiles making up the game board

  // Decks (stored as arrays, top card = index 0)
  enemyDeck1: Enemy[];         // Tier 1 enemy deck
  enemyDeck2: Enemy[];         // Tier 2 enemy deck
  enemyDeck3: Enemy[];         // Tier 3 enemy deck
  treasureDeck1: Item[];       // Tier 1 treasure deck
  treasureDeck2: Item[];       // Tier 2 treasure deck
  treasureDeck3: Item[];       // Tier 3 treasure deck
  luckDeck: LuckCard[];        // Luck/Chance deck

  // Discard piles
  enemyDiscard1: Enemy[];      // Tier 1 enemy discard
  enemyDiscard2: Enemy[];      // Tier 2 enemy discard
  enemyDiscard3: Enemy[];      // Tier 3 enemy discard
  treasureDiscard1: Item[];    // Tier 1 treasure discard
  treasureDiscard2: Item[];    // Tier 2 treasure discard
  treasureDiscard3: Item[];    // Tier 3 treasure discard
  luckDiscard: LuckCard[];     // Luck discard

  // Active states
  combat: CombatState | null;  // Current combat (null if none)
  trade: TradeState | null;    // Current trade (null if none)

  // Logs
  logs: LogEntry[];            // Game event log

  // Winner
  winnerId: string | null;     // Player ID of winner (null if game ongoing)
}

// ============================================================================
// CLASS DEFINITION
// ============================================================================

/** Class selection information for lobby */
export interface ClassDefinition {
  name: PlayerClass;           // Class name
  icon: string;                // Emoji or SVG icon
  description: string;         // One-sentence description
  specialEffect: string;       // Detailed special effect
  startingItems?: Item[];      // Starting equipment for this class
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/** Props for React components that need game state */
export interface GameContextProps {
  gameState: GameState | null;
  playerId: string;
  updateGameState: (updates: Partial<GameState>) => Promise<void>;
}

/** Dice roll result */
export interface DiceRoll {
  value: number;               // Result of the roll
  timestamp: number;           // When rolled
  playerId: string;            // Who rolled
}
