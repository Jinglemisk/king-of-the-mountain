# King of the Mountain - Developer Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Setup Instructions](#setup-instructions)
5. [Project Structure](#project-structure)
6. [Core Game Mechanics](#core-game-mechanics)
7. [Implementation Status](#implementation-status)
8. [Function Reference](#function-reference)
9. [Component Reference](#component-reference)
10. [Data Structures](#data-structures)
11. [How to Extend the Game](#how-to-extend-the-game)
12. [Firebase Database Structure](#firebase-database-structure)
13. [Key Design Decisions](#key-design-decisions)
14. [Troubleshooting](#troubleshooting)

---

## Project Overview

**King of the Mountain** is a browser-based, real-time multiplayer board game for 2-6 players. It's a medieval adventure race where players compete to be the first to reach the final tile while fighting enemies, collecting treasures, and navigating chaotic Luck Cards.

### Game Features
- **7 Player Classes** with unique abilities (Scout, Hunter, Gladiator, Warden, Guard, Monk, Porter)
- **20-tile board** with different tile types (Enemy, Treasure, Luck, Sanctuary, Final)
- **3-tier card system** for enemies, treasures, and Luck Cards
- **Turn-based combat** with dice rolls (PvE and PvP)
- **Inventory management** (equipped items and carried items)
- **Real-time multiplayer** using Firebase Realtime Database
- **Lobby system** with 6-character alphanumeric codes

---

## Architecture

### State Management Philosophy
The game uses **Firebase Realtime Database as the single source of truth**. All game state is stored in a single JSON object in Firebase, and all clients subscribe to changes using Firebase's real-time listeners.

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────┐
│   Client 1  │◄─────►│  Firebase RTDB   │◄─────►│   Client 2  │
│  (React)    │       │  (Game State)    │       │  (React)    │
└─────────────┘       └──────────────────┘       └─────────────┘
                              ▲
                              │
                              ▼
                       ┌─────────────┐
                       │   Client 3  │
                       │  (React)    │
                       └─────────────┘
```

### Data Flow
1. **User Action** → Component event handler
2. **State Update** → `gameSlice.ts` function writes to Firebase
3. **Firebase Propagation** → All connected clients receive update
4. **Re-render** → `useGameState` hook triggers React re-render
5. **UI Update** → Components display new state

### Application Flow
```
main.tsx
  └─> App.tsx (Router)
       ├─> WelcomeScreen (Create/Join Lobby)
       ├─> LobbyScreen (Class Selection & Ready Up)
       └─> GameScreen (Main Gameplay)
            ├─> Board (Game Board with Tiles)
            ├─> Card (Display Items/Enemies/Luck Cards)
            ├─> PlayerToken (Player Markers)
            └─> Modal (Combat/Trade/Dialogs)
```

---

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| **TypeScript** | Type-safe JavaScript for better DX and fewer bugs |
| **React 19** | UI framework with hooks for component state |
| **Vite** | Fast build tool and dev server |
| **Firebase Realtime Database** | Real-time multiplayer state synchronization |
| **CSS** | Medieval dark fantasy themed styling |

### Why These Choices?
- **TypeScript**: Catches errors at compile time, especially important for complex game state
- **React**: Component-based architecture perfect for game UI (screens, modals, cards, etc.)
- **Firebase RTDB**: Simplest way to achieve real-time multiplayer without a backend server
- **Vite**: Fastest development experience with instant HMR

---

## Setup Instructions

### Prerequisites
- Node.js v20.19+ or v22.12+
- npm v10+
- Firebase project (create at [firebase.google.com](https://firebase.google.com))

### Installation

1. **Clone the repository**
   ```bash
   cd king-of-the-mountain
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable **Realtime Database** (not Firestore!)
   - Set database rules to allow read/write (for development):
     ```json
     {
       "rules": {
         ".read": true,
         ".write": true
       }
     }
     ```
   - Get your Firebase config from Project Settings > Your Apps

4. **Configure environment variables**
   - Copy `.env.example` to `.env.local`
   - Fill in your Firebase credentials:
     ```
     VITE_FIREBASE_API_KEY=your_api_key_here
     VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
     VITE_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com
     VITE_FIREBASE_PROJECT_ID=your_project_id
     VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
     VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
     VITE_FIREBASE_APP_ID=your_app_id
     ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Build for production**
   ```bash
   npm run build
   npm run preview  # Preview the production build
   ```

---

## Project Structure

```
king-of-the-mountain/
├── public/                    # Static assets
│   └── background.png         # (Add your own background image)
│
├── src/
│   ├── components/            # Reusable React components
│   │   ├── game/              # Game-specific components
│   │   │   ├── Board.tsx      # Game board with 20 tiles
│   │   │   ├── Card.tsx       # Card display component
│   │   │   ├── Dice.tsx       # Dice roller component
│   │   │   └── PlayerToken.tsx # Player token on board
│   │   │
│   │   └── ui/                # General UI components
│   │       ├── Button.tsx     # Styled button
│   │       ├── Input.tsx      # Text input
│   │       └── Modal.tsx      # Modal dialog
│   │
│   ├── data/                  # Easily editable game data
│   │   ├── cards.ts           # Treasure & Luck Cards
│   │   ├── classes.ts         # Player classes
│   │   └── enemies.ts         # Enemy cards
│   │
│   ├── hooks/                 # Custom React hooks
│   │   └── useGameState.ts    # Firebase state subscription
│   │
│   ├── lib/                   # External service configs
│   │   └── firebase.ts        # Firebase initialization
│   │
│   ├── screens/               # Top-level screen components
│   │   ├── WelcomeScreen.tsx  # Nickname & lobby code entry
│   │   ├── LobbyScreen.tsx    # Class selection & ready up
│   │   └── GameScreen.tsx     # Main gameplay screen
│   │
│   ├── state/                 # State management
│   │   └── gameSlice.ts       # Firebase update functions
│   │
│   ├── types/                 # TypeScript definitions
│   │   └── index.ts           # All game types & interfaces
│   │
│   ├── App.tsx                # Main app router
│   ├── main.tsx               # React entry point
│   └── index.css              # Global styles
│
├── .env.example               # Environment variable template
├── .env.local                 # Your Firebase credentials (gitignored)
├── package.json               # Dependencies & scripts
├── tsconfig.json              # TypeScript config
├── vite.config.ts             # Vite config
└── DEVELOPER_GUIDE.md         # This file
```

---

## Core Game Mechanics

### Turn Structure
1. **Pre-Action Phase**: Player can swap equipped/carried items
2. **Action Phase**: Choose one action:
   - **Move**: Roll d4, move forward
   - **Sleep**: Stay on tile, restore to full HP
   - **Duel**: Fight another player on same tile
   - **Trade**: Exchange items with another player
3. **Post-Move Phase**: Resolve tile effects (draw cards, combat, etc.)
4. **Inventory Check**: Drop items if inventory is full
5. **End Turn**: Next player's turn begins

### Combat System
- Both sides roll **d6 for attack** and **d6 for defense**
- Add bonuses from equipped items and player class
- If `Attack > Defense`, 1 HP damage dealt
- Continue until one side reaches 0 HP or retreats
- **Retreat**: Move back 6 tiles, end combat immediately

**🚧 Trap Effect in Combat (Not Yet Implemented):**
When a player triggers a Trap item and then enters combat on the same turn (e.g., landing on an Enemy tile with a trap), the trap should cause the player to skip their first round of combat attacks. The player can still roll for defense, but cannot attack for one combat round. This mechanic will be implemented when the combat system is completed.

### Inventory System
- **Equipped Items** (contribute to stats):
  - 2 Holdable slots (weapons, shields)
  - 1 Wearable slot (armor, cloaks)
- **Carried Items** (stored in backpack):
  - 4 slots by default (5 for Porter class)
  - Holdable/Wearable items take 2 slots
  - Small/Consumable items take 1 slot

### Tile Types
| Tile | Description |
|------|-------------|
| **Start** | Starting position for all players |
| **Enemy (T1/T2/T3)** | Draw enemy cards, enter combat |
| **Treasure (T1/T2/T3)** | Draw treasure/item cards |
| **Luck** | Draw Luck Card (good or bad effects) |
| **Sanctuary** | Safe zone, no duels allowed |
| **Final** | Win by staying here for 1 full turn |

### Card Tiers
- **Tier 1**: Common, weaker cards
- **Tier 2**: Uncommon, medium strength
- **Tier 3**: Rare, powerful cards

---

## Implementation Status

### ✅ Complete Features

1. **Project Setup**
   - TypeScript + React + Vite configured
   - Firebase Realtime Database integration
   - Environment variable configuration

2. **Type System**
   - Complete TypeScript definitions for all game entities
   - Player, Enemy, Item, Tile, GameState interfaces
   - Type-safe props for all components

3. **Game Data**
   - 7 player classes with unique abilities
   - 18 Tier 1 enemies, 12 Tier 2 enemies, 10 Tier 3 enemies
   - 24 Tier 1 treasures, 18 Tier 2 treasures, 10 Tier 3 treasures
   - 32 luck/chance cards
   - Enemy composition logic (what to draw on each tile tier)

4. **UI Components**
   - Button, Input, Modal components
   - Board with 20 tiles in snake layout
   - Card component for displaying items/enemies/luck cards
   - Dice roller component
   - Player tokens with HP indicators

5. **Screens**
   - Welcome Screen: Nickname entry, create/join lobby
   - Lobby Screen: Class selection, ready up, start game
   - Game Screen: Board, inventory, stats, action buttons, logs

6. **State Management**
   - Firebase hook for real-time state subscription
   - Create lobby, join lobby, select class, start game functions
   - Game state initialization with decks and turn order

7. **Styling**
   - Complete medieval dark fantasy CSS theme
   - Responsive layouts for laptop screens
   - Hover effects, animations, and transitions
   - Color-coded tile types and card tiers

8. **Basic Gameplay**
   - Turn order determination
   - Move action (roll d4, update position)
   - Sleep action (restore HP)
   - End turn functionality
   - Event logging system

### ⚠️ Partially Implemented

1. **Tile Effect Resolution** ✅
   - Enemy tiles draw enemies and show combat modal
   - Treasure tiles draw items and add to inventory
   - Luck tiles draw Luck Cards and display them
   - Automatic deck reshuffling when empty
   - **Missing**: Luck Card effect implementations (TODO)

2. **Inventory** ✅
   - UI displays equipped items and carried items
   - Auto-add items to first available slots
   - Overflow handling with discard modal
   - Drag & drop equip/unequip/swap functionality ✅
   - Visual feedback for valid/invalid drops ✅

3. **Trap Item System** ✅
   - Players can place Trap items on their current tile
   - Traps trigger when other players land on the tile
   - Trapped players skip tile effect resolution (no card draws)
   - Scout class is immune to traps
   - Traps are removed after triggering
   - Visual indicators on board (⚠️ emoji with pulsing animation)
   - **Missing**: Trap effect in combat (skip one round) - combat not implemented yet

4. **Logging**
   - Log display component exists
   - Logs for moves, card draws, and system messages
   - **Missing**: Combat result logs (combat not implemented yet)

### ✅ Fully Implemented (NEW!)

1. **Combat System (PvE & PvP)** ✅
   - ✅ Turn-based d6 dice rolling for attack and defense
   - ✅ Class-specific combat bonuses (Hunter, Gladiator, Warden, Guard)
   - ✅ Equipment bonuses applied correctly
   - ✅ Multiple enemy targeting with target selection UI
   - ✅ Retreat functionality (move back 6 tiles)
   - ✅ Victory/defeat handling
   - ✅ Enemy loot drops (50-80% based on tier)
   - ✅ Combat log display with round-by-round results
   - ✅ Monk revival ability (once per game when HP drops to 0)
   - ✅ Trap effect: Skip first attack round when trapped on enemy tile
   - ✅ PvP duel initiation system
   - ✅ PvP looting interface for winners

2. **Class Special Abilities** ✅
   - ✅ Scout: Trap immunity (COMPLETED)
   - ✅ Porter: +1 inventory slot (COMPLETED)
   - ✅ Hunter: +1 Attack vs Enemies (COMPLETED)
   - ✅ Gladiator: +1 Attack vs Players (COMPLETED)
   - ✅ Warden: +1 Defense vs Enemies (COMPLETED)
   - ✅ Guard: +1 Defense vs Players (COMPLETED)
   - ✅ Monk: One-time revival at 0 HP (COMPLETED)

### 🔴 Not Implemented

1. **Item Effects (special abilities)** - Most items defined, some activation logic needed
   - ✅ Trap placement and triggering (COMPLETED)
   - ⏳ Luck Charm, Beer, Rage Potion, Fairy Dust, etc. (TODO)
2. **Luck Card Effects (all unique effects)** - Cards drawn and displayed, effect logic needed
3. **Trading System**
4. **Chat System**
5. **Animations & Sound Effects**

---

## Function Reference

### `src/lib/firebase.ts`

#### `generateLobbyCode(): string`
**Location**: `src/lib/firebase.ts:39`
**Description**: Generates a random 6-character alphanumeric lobby code for creating game lobbies
**Returns**: 6-character uppercase alphanumeric string (e.g., "A3X9K2")
**Example**:
```typescript
const code = generateLobbyCode(); // "J7M2Q5"
```

#### `generatePlayerId(): string`
**Location**: `src/lib/firebase.ts:52`
**Description**: Generates a unique player ID using timestamp and random string
**Returns**: Unique string identifier (e.g., "player-1234567890-abc123def")
**Example**:
```typescript
const playerId = generatePlayerId(); // "player-1709123456-x8k2p9q"
```

---

### `src/state/gameSlice.ts`

#### `createGameLobby(hostPlayerId: string, hostNickname: string): Promise<string>`
**Location**: `src/state/gameSlice.ts:25`
**Description**: Creates a new game lobby with initial state and adds the host player
**Parameters**:
- `hostPlayerId` - Unique ID of the player creating the lobby
- `hostNickname` - Display name of the host player
**Returns**: Promise resolving to the lobby code
**Side Effects**: Creates new game state in Firebase at `/games/{lobbyCode}`
**Example**:
```typescript
const playerId = generatePlayerId();
const lobbyCode = await createGameLobby(playerId, "Alice");
// Returns: "A3X9K2"
```

#### `joinGameLobby(lobbyCode: string, playerId: string, nickname: string): Promise<boolean>`
**Location**: `src/state/gameSlice.ts:96`
**Description**: Adds a player to an existing lobby
**Parameters**:
- `lobbyCode` - The 6-character lobby code to join
- `playerId` - Unique ID of the joining player
- `nickname` - Display name of the joining player
**Returns**: `true` if successfully joined, `false` if lobby doesn't exist, is full, or already started
**Side Effects**: Adds player to `/games/{lobbyCode}/players/{playerId}` in Firebase
**Example**:
```typescript
const success = await joinGameLobby("A3X9K2", playerId, "Bob");
if (!success) {
  console.log("Could not join lobby");
}
```

#### `selectClass(lobbyCode: string, playerId: string, selectedClass: PlayerClass): Promise<void>`
**Location**: `src/state/gameSlice.ts:158`
**Description**: Updates a player's class selection and sets them to ready
**Parameters**:
- `lobbyCode` - The lobby code
- `playerId` - The player's ID
- `selectedClass` - The class they selected (Scout, Hunter, etc.)
**Side Effects**: Updates player class and ready status in Firebase, adds log entry
**Example**:
```typescript
await selectClass("A3X9K2", playerId, "Scout");
```

#### `startGame(lobbyCode: string): Promise<void>`
**Location**: `src/state/gameSlice.ts:181`
**Description**: Initializes game state with decks, turn order, and starts the game
**Parameters**:
- `lobbyCode` - The lobby code
**Side Effects**:
- Builds and shuffles all card decks (enemies, treasures, Luck Cards)
- Applies class-specific bonuses (Porter gets +1 inventory slot)
- Randomizes turn order
- Changes game status to "active"
- Adds system log entries
**Example**:
```typescript
await startGame("A3X9K2");
```

#### `updateGameState(lobbyCode: string, updates: Partial<GameState>): Promise<void>`
**Location**: `src/state/gameSlice.ts:243`
**Description**: Updates the game state with partial updates (use sparingly - prefer targeted updates)
**Parameters**:
- `lobbyCode` - The lobby code
- `updates` - Partial game state object with fields to update
**Side Effects**: Merges updates into Firebase game state
**Example**:
```typescript
await updateGameState("A3X9K2", {
  [`players/${playerId}/hp`]: 3,
  [`players/${playerId}/position`]: 5,
});
```

#### `addLog(lobbyCode: string, type: LogType, message: string, playerId?: string, isImportant?: boolean): Promise<void>`
**Location**: `src/state/gameSlice.ts:259`
**Description**: Adds an event log entry to the game
**Parameters**:
- `lobbyCode` - The lobby code
- `type` - Log type: 'action', 'combat', 'system', or 'chat'
- `message` - Log message text
- `playerId` - (Optional) Player ID associated with log
- `isImportant` - (Optional) Whether to highlight this log
**Side Effects**: Appends log entry to game logs array
**Example**:
```typescript
await addLog("A3X9K2", "action", "Alice rolled 4 and moved to tile 7", playerId);
```

#### `rollDice(sides: number): number`
**Location**: `src/state/gameSlice.ts:352`
**Description**: Rolls a dice with specified number of sides
**Parameters**:
- `sides` - Number of sides (e.g., 4 or 6)
**Returns**: Random number from 1 to sides (inclusive)
**Example**:
```typescript
const movementRoll = rollDice(4); // Returns 1-4
const attackRoll = rollDice(6);   // Returns 1-6
```

#### `drawCards(lobbyCode, deckType, tier, count): Promise<any[]>`
**Location**: `src/state/gameSlice.ts:364`
**Description**: Draws cards from a treasure or enemy deck with automatic reshuffling
**Parameters**:
- `lobbyCode` - The lobby code
- `deckType` - 'treasure' or 'enemy'
- `tier` - Deck tier (1, 2, or 3)
- `count` - Number of cards to draw
**Returns**: Promise resolving to array of drawn cards
**Side Effects**: Updates deck and discard pile in Firebase, reshuffles if deck is empty
**Example**:
```typescript
const treasures = await drawCards('ABC123', 'treasure', 2, 1); // Draw 1 T2 treasure
```

#### `drawLuckCard(lobbyCode): Promise<LuckCard>`
**Location**: `src/state/gameSlice.ts:426`
**Description**: Draws a Luck Card from the deck with automatic reshuffling
**Parameters**:
- `lobbyCode` - The lobby code
**Returns**: Promise resolving to the drawn LuckCard
**Side Effects**: Updates luck deck and discard pile in Firebase, reshuffles if deck is empty
**Example**:
```typescript
const luckCard = await drawLuckCard('ABC123');
```

#### `drawEnemiesForTile(lobbyCode, tier): Promise<Enemy[]>`
**Location**: `src/state/gameSlice.ts:471`
**Description**: Draws enemies for a tile based on tier using composition logic from `getEnemyComposition()`
**Parameters**:
- `lobbyCode` - The lobby code
- `tier` - Enemy tile tier (1, 2, or 3)
**Returns**: Promise resolving to array of Enemy objects
**Logic**: Uses probabilistic enemy composition (e.g., T2 tile has 70% chance of 2×T1, 30% chance of 1×T2)
**Example**:
```typescript
const enemies = await drawEnemiesForTile('ABC123', 2); // Might return 2 T1 or 1 T2
```

#### `generateTiles(): Tile[]` (private)
**Location**: `src/state/gameSlice.ts:285`
**Description**: Generates the 20 tiles for the game board in predetermined order
**Returns**: Array of 20 Tile objects
**Note**: This is called automatically by `createGameLobby()`

#### `createLogEntry(type, message, isImportant?, playerId?): LogEntry` (private)
**Location**: `src/state/gameSlice.ts:321`
**Description**: Creates a log entry object with timestamp and unique ID
**Returns**: LogEntry object

#### `startCombat(lobbyCode, attackerId, defenders, canRetreat): Promise<void>`
**Location**: `src/state/gameSlice.ts:559`
**Description**: Initialize combat state between a player and enemies or other players
**Parameters**:
- `lobbyCode` - The lobby code
- `attackerId` - ID of the attacking player
- `defenders` - Array of Enemy or Player objects being fought
- `canRetreat` - Whether retreat is allowed (true for PvE, false for PvP duels)
**Side Effects**: Creates CombatState in Firebase, adds combat log entry
**Example**:
```typescript
// Start PvE combat
await startCombat('ABC123', playerId, enemies, true);

// Start PvP duel (no retreat)
await startCombat('ABC123', playerId, [targetPlayer], false);
```

#### `executeCombatRound(lobbyCode, targetId?): Promise<CombatLogEntry>`
**Location**: `src/state/gameSlice.ts:601`
**Description**: Execute a single round of combat with dice rolls and damage calculation
**Parameters**:
- `lobbyCode` - The lobby code
- `targetId` - (Optional) ID of specific target to attack (for multiple enemies)
**Returns**: Promise resolving to CombatLogEntry with round results
**Side Effects**:
- Rolls d6 for attack/defense for all combatants
- Applies class bonuses (Hunter/Gladiator/Warden/Guard) and equipment bonuses
- Calculates damage (1 HP if attack > defense)
- Updates HP in Firebase
- Checks Monk revival ability
- Handles trap effect (skip first attack if player trapped)
**Example**:
```typescript
// Attack in single-enemy combat
await executeCombatRound('ABC123');

// Attack specific enemy in multi-enemy combat
await executeCombatRound('ABC123', enemy2.id);
```

#### `endCombat(lobbyCode, retreated): Promise<Item[]>`
**Location**: `src/state/gameSlice.ts:810`
**Description**: End combat and handle victory/defeat outcomes
**Parameters**:
- `lobbyCode` - The lobby code
- `retreated` - True if player retreated, false if combat naturally ended
**Returns**: Promise resolving to array of loot items (for PvE victory)
**Side Effects**:
- If retreated: Move player back 6 tiles, clear combat state
- If player defeated (PvE): Move back 1 tile, restore HP, Sleep action
- If player won (PvE): Roll for enemy loot, clear combat state
- If PvP: Restore loser's HP, Sleep action
- Clears combat state from Firebase
**Example**:
```typescript
// Retreat from combat
await endCombat('ABC123', true);

// End combat naturally (victory or defeat)
const loot = await endCombat('ABC123', false);
```

#### `rollEnemyLoot(lobbyCode, enemyTier): Promise<Item[]>`
**Location**: `src/state/gameSlice.ts:903`
**Description**: Roll for loot drops from defeated enemies
**Parameters**:
- `lobbyCode` - The lobby code
- `enemyTier` - Tier of defeated enemy (1, 2, or 3)
**Returns**: Promise resolving to array of dropped items
**Logic**:
- Tier 1: 50% chance → 1× T1 treasure
- Tier 2: 70% → 1× T2, 15% → 1× T1, 15% → nothing
- Tier 3: 80% → 1× T3, 20% → 1× T2
**Example**:
```typescript
const loot = await rollEnemyLoot('ABC123', 3); // Roll for T3 enemy loot
```

---

### `src/hooks/useGameState.ts`

#### `useGameState(lobbyCode: string | null): GameState | null`
**Location**: `src/hooks/useGameState.ts:16`
**Description**: Custom React hook that subscribes to Firebase game state changes
**Parameters**:
- `lobbyCode` - The 6-character lobby code (null if not in a lobby)
**Returns**: Current game state or null if not found/loading
**Side Effects**: Sets up Firebase listener on mount, cleans up on unmount
**Example**:
```typescript
function GameComponent() {
  const gameState = useGameState("A3X9K2");

  if (!gameState) {
    return <div>Loading...</div>;
  }

  return <div>Turn: {gameState.currentTurnIndex}</div>;
}
```

---

### `src/data/enemies.ts`

#### `buildEnemyDeck(tier: 1 | 2 | 3): Enemy[]`
**Location**: `src/data/enemies.ts:132`
**Description**: Builds and shuffles an enemy deck for a given tier
**Parameters**:
- `tier` - Enemy tier (1, 2, or 3)
**Returns**: Shuffled array of Enemy objects
**Example**:
```typescript
const tier1Enemies = buildEnemyDeck(1); // 18 tier 1 enemies, shuffled
```

#### `getEnemyComposition(tier: 1 | 2 | 3): { tier: 1 | 2 | 3; count: number }[]`
**Location**: `src/data/enemies.ts:167`
**Description**: Determines which enemies to draw for an Enemy tile based on tier
**Parameters**:
- `tier` - Tile tier (1, 2, or 3)
**Returns**: Array of objects specifying tier and count of enemies to draw
**Logic**:
- Tier 1: Always draw 1× T1 enemy
- Tier 2: 70% chance 2× T1, 30% chance 1× T2
- Tier 3: 70% chance 2× T2, 20% chance 1× T2 + 1× T1, 10% chance 1× T3
**Example**:
```typescript
const composition = getEnemyComposition(2);
// Might return: [{ tier: 1, count: 2 }] or [{ tier: 2, count: 1 }]
```

#### `createEnemy(...)` (private)
**Location**: `src/data/enemies.ts:19`
**Description**: Factory function to create enemy instances with unique IDs

---

### `src/data/cards.ts`

#### `buildTreasureDeck(tier: 1 | 2 | 3): Item[]`
**Location**: `src/data/cards.ts:356`
**Description**: Builds and shuffles a treasure deck for a given tier
**Parameters**:
- `tier` - Treasure tier (1, 2, or 3)
**Returns**: Shuffled array of Item objects
**Deck Sizes**:
- Tier 1: 24 items
- Tier 2: 18 items
- Tier 3: 10 items
**Example**:
```typescript
const tier1Treasures = buildTreasureDeck(1); // 24 tier 1 items, shuffled
```

#### `buildLuckDeck(): LuckCard[]`
**Location**: `src/data/cards.ts:375`
**Description**: Builds and shuffles the Luck Card deck
**Returns**: Shuffled array of 32 LuckCard objects
**Example**:
```typescript
const luckDeck = buildLuckDeck(); // 32 Luck Cards, shuffled
```

#### `createItem(...)` (private)
**Location**: `src/data/cards.ts:18`
**Description**: Factory function to create item instances with unique IDs

#### `createLuckCard(...)` (private)
**Location**: `src/data/cards.ts:251`
**Description**: Factory function to create Luck Card instances with unique IDs

---

### `src/data/classes.ts`

#### `getClassByName(className: string): ClassDefinition | undefined`
**Location**: `src/data/classes.ts:63`
**Description**: Retrieves class definition by class name
**Parameters**:
- `className` - Name of the class (e.g., "Scout", "Hunter")
**Returns**: ClassDefinition object or undefined if not found
**Example**:
```typescript
const scoutClass = getClassByName("Scout");
console.log(scoutClass?.specialEffect); // "Immune to Trap items..."
```

---

## Component Reference

### `src/App.tsx`

#### `<App />`
**Location**: `src/App.tsx:19`
**Description**: Main application component that handles routing between screens
**State**:
- `currentScreen`: 'welcome' | 'lobby' | 'game'
- `lobbyCode`: string | null
- `playerId`: string | null
**Props**: None (root component)
**Behavior**: Automatically transitions from lobby to game when game starts

---

### `src/screens/WelcomeScreen.tsx`

#### `<WelcomeScreen />`
**Location**: `src/screens/WelcomeScreen.tsx:22`
**Description**: First screen for entering nickname and creating/joining lobbies
**Props**:
- `onLobbyCreated: (code: string, id: string, nickname: string) => void`
- `onLobbyJoined: (code: string, id: string, nickname: string) => void`
**State**:
- `nickname`: Player's entered nickname
- `joinCode`: Lobby code to join
- `error`: Error message to display
- `isLoading`: Loading state for async operations

**Key Functions**:
- `handleCreateLobby()` - Creates new lobby and calls `onLobbyCreated`
- `handleJoinLobby()` - Joins existing lobby and calls `onLobbyJoined`

---

### `src/screens/LobbyScreen.tsx`

#### `<LobbyScreen />`
**Location**: `src/screens/LobbyScreen.tsx:22`
**Description**: Lobby screen for class selection and starting the game
**Props**:
- `gameState: GameState` - Current game state from Firebase
- `playerId: string` - This player's ID
**State**:
- `selectedClass`: Currently selected class (local state before confirmation)
- `isLoading`: Loading state for async operations

**Key Functions**:
- `handleSelectClass(className)` - Selects class and marks player as ready
- `handleStartGame()` - Starts the game (host only, requires all players ready)

**UI Elements**:
- Player list showing nickname, class, ready status
- Class selection grid (7 classes)
- Start game button (host only, disabled until conditions met)

---

### `src/screens/GameScreen.tsx`

#### `<GameScreen />`
**Location**: `src/screens/GameScreen.tsx:24`
**Description**: Main gameplay screen with board, inventory, and actions
**Props**:
- `gameState: GameState` - Current game state from Firebase
- `playerId: string` - This player's ID
**State**:
- `selectedItem`: Currently selected item for detail view
- `showLogs`: Whether logs panel is visible
- `activeTab`: 'logs' | 'chat'

**Key Functions**:
- `handleMove()` - Rolls d4, moves player forward, checks for traps, resolves tile effects (location: line 394)
- `handleSleep()` - Restores player to full HP (location: line 467)
- `handleEndTurn()` - Advances to next player's turn (location: line 554)
- `handleUseTrap(item, inventoryIndex)` - Places trap on current tile (location: line 526)
- `resolveTileEffect(tile)` - Resolves tile effects (enemy/treasure/luck) (location: line 319)
- `addItemToInventory(items)` - Adds items to first available slots (location: line 81)
- `handleEquipItem()` - Equips item from inventory to equipment slot (location: line 177)
- `handleUnequipItem()` - Unequips item from equipment to inventory (location: line 231)
- `handleSwapEquippedItems()` - Swaps items between equipment slots (location: line 280)
- `handleCardRevealClose()` - Handles card reveal modal close (location: line 443)
- `handleInventoryDiscard(items)` - Handles inventory overflow (location: line 505)
- `handleCombatRetreat()` - Moves player back 6 tiles (location: line 580)
- `renderEquipment()` - Renders equipped items UI with drag-and-drop (location: line 641)
- `renderInventory()` - Renders backpack inventory UI with drag-and-drop and trap button (location: line 825)
- `renderStats()` - Calculates and displays player stats (location: line 876)
- `renderActions()` - Renders action buttons for current turn (location: line 908)
- `renderLogs()` - Renders event logs panel (location: line 946)

**Tile Resolution Flow**:
1. Player moves to new tile
2. Check for trap on tile:
   - If trap exists and player is not trap owner:
     - **Scout class**: Log immunity message, continue to step 3
     - **Other classes**: Trigger trap, remove trap from tile, skip tile effect (return early)
3. `resolveTileEffect()` checks tile type (only if not trapped):
   - **Enemy tiles**: Draw enemies → Show CardRevealModal → Show CombatModal (provisional)
   - **Treasure tiles**: Draw treasure → Show CardRevealModal → Add to inventory or show InventoryFullModal
   - **Luck tiles**: Draw Luck Card → Show CardRevealModal → Apply effects (TODO)
   - **Start/Sanctuary/Final**: No effect
4. Effects are logged to game log

**Trap System Flow**:
1. Player uses trap item from inventory (clicks "Place Trap" button on their turn)
2. `handleUseTrap()` validates:
   - Cannot place on Start or Sanctuary tiles
   - Cannot place if tile already has a trap
3. Trap removed from inventory, tile updated with `hasTrap: true` and `trapOwnerId`
4. Visual indicator (⚠️) appears on tile with pulsing animation
5. When another player lands on trapped tile:
   - Trap owner is unaffected
   - Scout class is immune (logs message, continues to tile effect)
   - Other classes trigger trap (skip tile effect, trap is removed)

**Current Limitations**:
- Combat modal is provisional (no combat logic yet)
- Most item special abilities not yet implemented (except Trap)
- Luck Card effects are not implemented yet (cards are drawn and displayed only)

---

### `src/components/game/Board.tsx`

#### `<Board />`
**Location**: `src/components/game/Board.tsx:23`
**Description**: Visual representation of the 20-tile game board in snake layout
**Props**:
- `tiles: Tile[]` - Array of 20 tiles
- `players: Record<string, Player>` - Map of all players
- `currentPlayerId: string | null` - ID of player whose turn it is
- `onTileClick?: (tileId: number) => void` - Optional tile click handler

**Key Functions**:
- `getPlayersOnTile(tileId)` - Returns array of players on a specific tile (location: line 29)
- `getTileClass(tile)` - Returns CSS class for tile styling (location: line 38)
- `getTileLabel(tile)` - Returns display label/emoji for tile (location: line 50)

**Layout**: 4 rows × 5 columns in snake pattern (alternating row directions)

---

### `src/components/game/Card.tsx`

#### `<Card />`
**Location**: `src/components/game/Card.tsx:22`
**Description**: Visual representation of treasure, enemy, and Luck Cards
**Props**:
- `card: Item | Enemy | LuckCard | null` - The card data
- `type: 'treasure' | 'enemy' | 'luck'` - Card type
- `isRevealed?: boolean` - Whether card is face-up (default: true)
- `onClick?: () => void` - Click handler

**Behavior**:
- Shows card back if `!isRevealed`
- Renders different layouts based on card type
- Displays stats (HP, Attack, Defense) for enemies and items
- Shows tier badge for treasure and enemy cards

---

### `src/components/game/PlayerToken.tsx`

#### `<PlayerToken />`
**Location**: `src/components/game/PlayerToken.tsx:18`
**Description**: Visual representation of a player on the board
**Props**:
- `player: Player` - Player object
- `isCurrentTurn?: boolean` - Whether it's this player's turn

**Display**:
- Shows first letter of nickname
- Shows current HP
- Highlights if it's player's turn
- Different styling for dead players

---

### `src/components/ui/Button.tsx`

#### `<Button />`
**Location**: `src/components/ui/Button.tsx:26`
**Description**: Reusable button component with medieval styling
**Props**:
- `children: React.ReactNode` - Button content
- `onClick?: () => void` - Click handler
- `variant?: 'primary' | 'secondary' | 'danger'` - Style variant (default: 'primary')
- `disabled?: boolean` - Whether button is disabled (default: false)
- `fullWidth?: boolean` - Whether button takes full width (default: false)
- `type?: 'button' | 'submit'` - Button type attribute (default: 'button')

---

### `src/components/ui/Modal.tsx`

#### `<Modal />`
**Location**: `src/components/ui/Modal.tsx:26`
**Description**: Modal dialog component for overlays
**Props**:
- `isOpen: boolean` - Whether modal is visible
- `onClose?: () => void` - Function to call when closing
- `title?: string` - Modal title
- `children: React.ReactNode` - Modal content
- `canClose?: boolean` - Whether user can close (default: true)
- `size?: 'small' | 'medium' | 'large'` - Modal size (default: 'medium')

**Behavior**:
- Closes on backdrop click if `canClose` is true
- Shows close button if `canClose` is true
- Returns null if `!isOpen`

---

### `src/components/game/CardRevealModal.tsx`

#### `<CardRevealModal />`
**Location**: `src/components/game/CardRevealModal.tsx:26`
**Description**: Modal that displays revealed cards (treasure, enemy, or Luck Cards) to the player
**Props**:
- `isOpen: boolean` - Whether modal is visible
- `cards: (Item | Enemy | LuckCard)[]` - Array of cards to display
- `cardType: 'treasure' | 'enemy' | 'luck'` - Type of cards being shown
- `onClose: () => void` - Callback when modal is closed
- `title?: string` - Optional custom title

**Behavior**:
- Displays multiple cards side-by-side if more than one
- Shows card name, tier (if applicable), and description/effect
- Cannot be closed by clicking backdrop (must click Continue button)
- Used by tile resolution to show drawn cards

---

### `src/components/game/CombatModal.tsx`

#### `<CombatModal />`
**Location**: `src/components/game/CombatModal.tsx:51`
**Description**: Provisional combat modal for PvE and PvP encounters
**Props**:
- `isOpen: boolean` - Whether modal is visible
- `player: Player` - The player in combat
- `opponents: (Enemy | Player)[]` - Array of enemies or players being fought
- `onRetreat?: () => void` - Optional callback for retreat action
- `onClose?: () => void` - Optional callback when combat ends

**Display**:
- Shows player on left, opponents on right
- Displays HP, ATK, DEF for both sides
- Shows enemy cards for PvE
- Retreat button moves player back 6 tiles
- **Note**: Combat logic not implemented yet - this is a provisional UI

---

### `src/components/game/InventoryFullModal.tsx`

#### `<InventoryFullModal />`
**Location**: `src/components/game/InventoryFullModal.tsx:51`
**Description**: Modal for handling inventory overflow when adding new items
**Props**:
- `isOpen: boolean` - Whether modal is visible
- `currentItems: (Item | null)[]` - Current inventory items
- `newItems: Item[]` - New items trying to be added
- `onDiscard: (itemsToKeep: (Item | null)[]) => void` - Callback with final items to keep
- `maxSlots: number` - Maximum inventory slots available

**Behavior**:
- Shows all current + new items in a grid
- Player clicks to select which items to keep (up to maxSlots)
- New items are marked with a "NEW" badge
- Selected items show "✓ Keep", unselected show "✗ Discard"
- Cannot close until valid selection is made

---

### `src/components/ui/Input.tsx`

#### `<Input />`
**Location**: Not included in read files, but referenced in WelcomeScreen
**Description**: Text input component with medieval styling
**Expected Props**:
- `value: string`
- `onChange: (value: string) => void`
- `placeholder?: string`
- `maxLength?: number`
- `disabled?: boolean`
- `autoFocus?: boolean`

---

## Data Structures

### Game State Hierarchy

```typescript
GameState
├── lobbyCode: string
├── status: "waiting" | "active" | "finished"
├── players: Record<string, Player>
│   └── [playerId]: Player
│       ├── id: string
│       ├── nickname: string
│       ├── class: PlayerClass | null
│       ├── position: number (0-19)
│       ├── hp: number
│       ├── maxHp: number (always 5)
│       ├── equipment: Equipment
│       │   ├── holdable1: Item | null
│       │   ├── holdable2: Item | null
│       │   └── wearable: Item | null
│       ├── inventory: (Item | null)[]
│       ├── isReady: boolean
│       ├── isHost: boolean
│       ├── isAlive: boolean
│       ├── specialAbilityUsed?: boolean
│       ├── isInvisible?: boolean
│       └── tempEffects?: TempEffect[]
├── turnOrder: string[]
├── currentTurnIndex: number
├── tiles: Tile[] (20 tiles)
├── enemyDeck1/2/3: Enemy[]
├── treasureDeck1/2/3: Item[]
├── luckDeck: LuckCard[]
├── enemyDiscard1/2/3: Enemy[]
├── treasureDiscard1/2/3: Item[]
├── luckDiscard: LuckCard[]
├── combat: CombatState | null
├── trade: TradeState | null
├── logs: LogEntry[]
└── winnerId: string | null
```

### Key Type Definitions

See `src/types/index.ts` for complete type definitions:

- **PlayerClass**: 'Scout' | 'Hunter' | 'Gladiator' | 'Warden' | 'Guard' | 'Monk' | 'Porter'
- **TileType**: 'start' | 'enemy1' | 'enemy2' | 'enemy3' | 'treasure1' | 'treasure2' | 'treasure3' | 'luck' | 'sanctuary' | 'final'
- **ItemCategory**: 'holdable' | 'wearable' | 'small'
- **GameStatus**: 'waiting' | 'active' | 'finished'

---

## How to Extend the Game

### Adding a New Player Class

1. **Define the class** in `src/data/classes.ts:13`:
   ```typescript
   {
     name: 'Berserker',
     icon: '🪓',
     description: 'Raging warrior with high risk, high reward.',
     specialEffect: 'Deal +2 Attack but take +1 damage from all sources.',
   }
   ```

2. **Add to type** in `src/types/index.ts:11`:
   ```typescript
   export type PlayerClass =
     | 'Scout'
     | 'Hunter'
     // ... existing classes
     | 'Berserker'; // Add new class
   ```

3. **Implement special ability** in combat/game logic:
   - For passive effects (like Berserker), modify combat calculations
   - For active abilities, add UI trigger buttons
   - For one-time effects (like Monk), track usage in player state

### Adding New Items

1. **Add to factory array** in `src/data/cards.ts`:
   ```typescript
   export const TIER_2_TREASURE_FACTORIES = [
     // ... existing items
     () => createItem('Magic Ring', 'small', 2, 'Steal 1 item from another player', {
       special: 'steal_item',
       isConsumable: true,
     }),
   ];
   ```

2. **Implement special effect** in `src/state/itemEffects.ts` (to be created):
   ```typescript
   export function useItem(item: Item, gameState: GameState, playerId: string) {
     switch (item.special) {
       case 'steal_item':
         // Show modal to select target player and item
         // Transfer item from target to current player
         break;
       // ... other effects
     }
   }
   ```

### Adding New Enemy Types

1. **Add to enemy array** in `src/data/enemies.ts`:
   ```typescript
   export const TIER_3_ENEMIES = [
     // ... existing enemies
     () => createEnemy('Ancient Dragon', 3, 5, 4, 3, 'Deals 2 damage per hit instead of 1'),
   ];
   ```

2. **Implement special ability** in combat logic (to be created in CombatModal.tsx):
   ```typescript
   // In combat calculation
   if (enemy.special?.includes('2 damage')) {
     hpLoss = 2; // Instead of default 1
   }
   ```

### Adding New Tile Types

1. **Add to TileType** in `src/types/index.ts:21`:
   ```typescript
   export type TileType =
     | 'start'
     | 'enemy1'
     // ... existing types
     | 'shop'; // New tile type
   ```

2. **Add to board generation** in `src/state/gameSlice.ts:287`:
   ```typescript
   const tileTypes: TileType[] = [
     'start',
     'treasure1',
     // ... existing tiles
     'shop', // Add at desired position
     'final',
   ];
   ```

3. **Implement tile effect** in GameScreen.tsx:
   ```typescript
   function resolveTileEffect(tile: Tile, player: Player, gameState: GameState) {
     switch (tile.type) {
       case 'shop':
         // Show shop modal, allow player to buy/sell items
         break;
       // ... other tile effects
     }
   }
   ```

4. **Add styling** in `src/index.css`:
   ```css
   .tile-shop {
     background: #3a5f1e; /* Shop green color */
   }
   ```

### Modifying Game Rules

All game rules are centralized in a few key files:

- **Turn structure**: `src/screens/GameScreen.tsx`
- **Combat rules**: `src/components/game/CombatModal.tsx` (to be created)
- **Movement rules**: `handleMove()` in `GameScreen.tsx:48`
- **Inventory rules**: `src/components/game/InventoryManager.tsx` (to be created)
- **Win condition**: `GameScreen.tsx:332` (check for `winnerId`)

Example: Change from "stay on final tile for 1 turn" to "reach final tile immediately wins":

```typescript
// In handleMove() function at GameScreen.tsx:48
if (newPosition === 19) {
  await updateGameState(gameState.lobbyCode, {
    winnerId: playerId,
    status: 'finished',
  });
}
```

---

## Firebase Database Structure

The entire game state is stored at `/games/{lobbyCode}`:

```json
{
  "games": {
    "ABC123": {
      "lobbyCode": "ABC123",
      "status": "active",
      "players": {
        "player-123": {
          "id": "player-123",
          "nickname": "Alice",
          "class": "Scout",
          "position": 5,
          "hp": 4,
          "maxHp": 5,
          "equipment": {
            "holdable1": { /* Item object */ },
            "holdable2": null,
            "wearable": { /* Item object */ }
          },
          "inventory": [
            { /* Item object */ },
            null,
            { /* Item object */ },
            null
          ],
          "isReady": true,
          "isHost": true,
          "isAlive": true
        }
      },
      "turnOrder": ["player-123", "player-456"],
      "currentTurnIndex": 0,
      "tiles": [ /* Array of 20 Tile objects */ ],
      "enemyDeck1": [ /* Array of Enemy objects */ ],
      "treasureDeck1": [ /* Array of Item objects */ ],
      "luckDeck": [ /* Array of LuckCard objects */ ],
      "logs": [
        {
          "id": "log-1",
          "timestamp": 1234567890,
          "type": "action",
          "message": "Alice rolled 3 and moved to tile 5",
          "playerId": "player-123"
        }
      ],
      "combat": null,
      "trade": null,
      "winnerId": null
    }
  }
}
```

### Database Security Rules

For **production**, you should update Firebase rules to prevent cheating:

```json
{
  "rules": {
    "games": {
      "$lobbyCode": {
        ".read": true,
        ".write": "auth != null",
        "players": {
          "$playerId": {
            ".write": "$playerId === auth.uid"
          }
        }
      }
    }
  }
}
```

This would require adding Firebase Authentication, which is currently not implemented.

---

## Key Design Decisions

### Why Firebase Realtime Database?
- **Pros**: Simple setup, real-time sync, no backend code needed
- **Cons**: Limited query capabilities, scales poorly beyond ~100 concurrent users
- **Alternative**: Socket.io + Node.js backend for more control, but more complex

### Why Single JSON Object for State?
- **Pros**: Simple mental model, easy to debug, atomic updates
- **Cons**: Entire state re-syncs on every change (inefficient for large states)
- **Trade-off**: For a 6-player game, this is fine. For 100+ players, would need normalization.

### Why Emojis for Placeholders?
- Quick to implement, works everywhere
- Easy to replace with SVGs/PNGs later
- Keeps focus on game logic during initial development

### Why No Authentication?
- Keeps setup simple for local/private games
- Players self-identify with nicknames
- **Future**: Add Firebase Auth for persistent profiles and anti-cheat

### Why Factory Functions for Cards?
- Each call creates a new instance with unique ID
- Prevents card sharing issues
- Easy to add multiple copies of same card type

---

## Troubleshooting

### Firebase Connection Issues

**Problem**: "Loading game..." never completes

**Solutions**:
1. Check Firebase URL in `.env.local` is correct and uses `https://`
2. Verify Firebase Realtime Database is enabled (not Firestore)
3. Check database rules allow read/write
4. Open browser console and check for CORS or permission errors

### Build Errors

**Problem**: TypeScript compilation errors

**Solutions**:
1. Run `npm install` to ensure all deps are installed
2. Delete `node_modules` and run `npm install` again
3. Check that all imports use correct file extensions (`.tsx` for components)
4. Verify all types are properly exported from `src/types/index.ts`

### State Not Updating

**Problem**: Changes in one browser don't show in another

**Solutions**:
1. Check that both browsers are in the same lobby code
2. Open Firebase Console and verify data is being written
3. Check browser console for Firebase errors
4. Ensure `useGameState` hook is properly subscribed

### Slow Performance

**Problem**: Game lags or freezes

**Solutions**:
1. Check for infinite re-render loops (excessive Firebase writes)
2. Minimize state updates (batch updates when possible)
3. Use React DevTools Profiler to identify slow components
4. Consider memoizing expensive calculations with `useMemo`

---

## Next Steps for Developers

### Immediate Priorities (Week 1)
1. ✅ ~~Implement tile effect resolution~~ - **COMPLETED**
2. ✅ ~~Card drawing with deck management~~ - **COMPLETED**
3. ✅ ~~Basic inventory auto-add and overflow handling~~ - **COMPLETED**
4. Implement combat system (PvE) - provisional modal exists, add combat logic
5. Implement Luck Card effects - cards are drawn, need to apply effects
6. Manual inventory management - equip/unequip items

### Short-term Goals (Week 2-3)
4. Implement all item special effects
5. Implement all Luck Card effects
6. Implement trading system
7. Add PvP combat

### Medium-term Goals (Month 1)
8. Polish UI/UX (animations, sounds, better feedback)
9. Add chat system
10. Playtesting and balance adjustments
11. Deploy to production hosting (Vercel, Netlify, Firebase Hosting)

### Long-term Enhancements
- Player accounts and persistent profiles
- Game replay/history
- Spectator mode
- Mobile responsive design
- More classes, items, enemies
- Alternative game modes (team play, co-op vs AI, etc.)

---

## Recent Updates

### Complete Combat System Implementation (Latest - December 2024)

**What was implemented:**

1. **Core Combat Functions** (`src/state/gameSlice.ts`)
   - `startCombat()` - Initialize combat state with attackers and defenders
   - `executeCombatRound()` - Execute combat rounds with d6 dice rolls
   - `endCombat()` - Handle victory/defeat and loot distribution
   - `rollEnemyLoot()` - Roll for enemy loot drops based on tier
   - `getClassCombatBonuses()` - Calculate class-specific combat bonuses
   - `getEquipmentBonuses()` - Calculate equipment bonuses

2. **Interactive Combat Modal** (`src/components/game/CombatModal.tsx`)
   - Fully functional combat UI with attack button
   - Multiple enemy targeting with click-to-select interface
   - Round-by-round combat log display
   - Real-time HP updates
   - Victory/defeat screens
   - Retreat button functionality
   - Visual feedback for selected targets
   - Defeated enemy visual indicators

3. **Class-Specific Combat Bonuses**
   - Hunter: +1 Attack vs Enemies (PvE)
   - Gladiator: +1 Attack vs Players (PvP)
   - Warden: +1 Defense vs Enemies (PvE)
   - Guard: +1 Defense vs Players (PvP)
   - Monk: One-time revival when HP drops to 0

4. **Trap Combat Integration**
   - Players trapped on enemy tiles skip their first attack round
   - Can still defend but cannot attack for round 1
   - Trap flag cleared after first round

5. **PvP Duel System** (`src/screens/GameScreen.tsx`)
   - Duel button appears when players on same tile
   - Sanctuary tiles prevent duels
   - Target selection modal for choosing duel opponent
   - Duel action tracking
   - No retreat allowed in PvP duels

6. **PvP Looting Interface**
   - Winners can take items from defeated players
   - Shows defeated player's equipment and inventory
   - Click "Take" buttons to loot specific items
   - Automatic inventory management for looted items
   - "Finish Looting" button to end combat

7. **Enemy Loot System**
   - Tier 1: 50% → 1× T1 treasure
   - Tier 2: 70% → 1× T2, 15% → 1× T1, 15% → nothing
   - Tier 3: 80% → 1× T3, 20% → 1× T2
   - Loot automatically added to inventory with overflow handling

8. **Combat CSS Styling** (`src/index.css`)
   - Medieval-themed combat arena
   - Animated target indicators
   - Combat log styling with round-by-round details
   - Victory/defeat messages
   - Duel target selection UI
   - Looting interface styles

**Combat Flow:**
1. Player lands on enemy tile or initiates duel
2. `startCombat()` creates CombatState in Firebase
3. CombatModal displays with interactive UI
4. Player clicks Attack button (selects target if multiple enemies)
5. `executeCombatRound()` rolls dice, applies bonuses, calculates damage
6. HP updates in real-time, combat log shows results
7. Combat continues until victory, defeat, or retreat
8. `endCombat()` handles outcome, distributes loot
9. Looting interface shown for PvP victories

**Testing checklist:**
- ✅ PvE combat with single enemy
- ✅ PvE combat with multiple enemies (target selection)
- ✅ Class bonuses applied correctly
- ✅ Equipment bonuses calculated
- ✅ Retreat functionality
- ✅ Enemy loot drops
- ✅ Victory/defeat handling
- ✅ Monk revival ability
- ✅ Trap effect in combat
- ✅ PvP duel initiation
- ✅ PvP looting interface
- ✅ Sanctuary tile duel prevention

---

### Tile Resolution & Card Drawing System (November 2024)

**What was implemented:**

1. **Terminology Standardization**
   - Replaced all "chance" and "luck/chance" references with "Luck Cards" throughout codebase
   - Updated developer_guide.md, cards.ts, Card.tsx, and types/index.ts

2. **Card Drawing Functions** (`src/state/gameSlice.ts`)
   - `drawCards(lobbyCode, deckType, tier, count)` - Generic card drawing with auto-reshuffle
   - `drawLuckCard(lobbyCode)` - Specialized Luck Card drawing
   - `drawEnemiesForTile(lobbyCode, tier)` - Enemy drawing using composition logic
   - Automatic deck rebuilding when both deck and discard are empty
   - Game log notifications when decks are reshuffled

3. **UI Modal Components** (`src/components/game/`)
   - **CardRevealModal** - Displays drawn cards with name, tier, and description
     - Supports multiple cards side-by-side
     - Cannot be dismissed (must click Continue)
   - **CombatModal** - Provisional PvE/PvP combat display
     - Shows player vs opponents with HP, ATK, DEF stats
     - Retreat option (moves back 6 tiles)
     - Combat logic to be implemented later
   - **InventoryFullModal** - Handles inventory overflow
     - Shows all current + new items
     - Player selects which items to keep (up to max slots)
     - Discards unselected items

4. **Tile Resolution System** (`src/screens/GameScreen.tsx`)
   - `resolveTileEffect(tile)` - Main tile resolution function
     - **Enemy tiles**: Draw enemies → Show reveal modal → Show combat modal
     - **Treasure tiles**: Draw treasure → Show reveal modal → Add to inventory or show overflow modal
     - **Luck tiles**: Draw Luck Card → Show reveal modal → Log effect (implementation pending)
     - **Start/Sanctuary/Final**: No card effects
   - `addItemToInventory(items)` - Helper to add items to first available slots
   - `calculatePlayerStats()` - Helper to compute total ATK/DEF from equipment
   - Full integration with `handleMove()` - tile effects trigger automatically after movement

5. **Game Flow Integration**
   - Cards are drawn when player lands on tile (not Start, Sanctuary, or Final)
   - All card draws are logged to game event log
   - Inventory automatically handles overflow with player choice modal
   - Combat encounters are queued after card reveal
   - All existing deck initialization logic is utilized (no dead code)

**What still needs implementation:**
- Combat logic (modal is provisional UI only)
- Luck Card effect applications (cards are drawn and displayed, effects need logic)
- Manual inventory management (equip/unequip/swap items)
- Item special ability activation

**Testing checklist:**
- ✅ Enemy tiles draw correct enemy composition based on tier
- ✅ Treasure tiles draw treasure and attempt to add to inventory
- ✅ Luck tiles draw and display Luck Cards
- ✅ Inventory overflow triggers discard modal
- ✅ Decks automatically reshuffle when empty
- ✅ All effects are logged to game log
- ✅ Combat modal displays after enemy reveal (retreat works)

**Bug Fixes (Post-Implementation):**

1. **Fixed `Cannot read properties of undefined (reading 'length')` error** (GameScreen.tsx:701)
   - Added null/undefined checks for `currentPlayer.inventory` throughout
   - Added null/undefined checks for `currentPlayer.equipment` throughout
   - Added safety check for `currentTurnPlayer` when game status is 'active'
   - Created `safeTurnPlayer` fallback for proper rendering before game starts
   - All null safety checks use optional chaining and fallback values

2. **Fixed `gameState[discardKey] is not iterable` error** (gameSlice.ts:378)
   - **Root cause**: Discard piles were not initialized when game started
   - **Fix 1**: Added discard pile initialization in `startGame()` function
     - `enemyDiscard1/2/3`, `treasureDiscard1/2/3`, `luckDiscard` now all initialize as `[]`
   - **Fix 2**: Added `Array.isArray()` checks in `drawCards()` function
     - Safely handles cases where discard piles might be undefined/null
   - **Fix 3**: Added `Array.isArray()` checks in `drawLuckCard()` function
   - Now all deck drawing functions are bulletproof against missing/invalid data

3. **Fixed TypeScript type error in CardRevealModal**
   - Used type guards to properly check for `description` vs `special` properties
   - Enemy cards show `special`, Item/LuckCards show `description`

4. **Code cleanup**
   - Commented out unused `calculatePlayerStats()` function (will be used in combat implementation)
   - Prevents TypeScript warnings about unused declarations

5. **Fixed InventoryFullModal appearing when inventory has space**
   - **Root cause**: Inventory could be empty array `[]` instead of `[null, null, null, null]`
   - When `inventory = []`, `findIndex(slot => slot === null)` returns `-1` (no nulls found)
   - Items marked as overflow even though inventory has capacity
   - **Fix 1**: `addItemToInventory()` now initializes empty arrays to `[null, null, null, null]`
   - **Fix 2**: `handleInventoryUpdate()` also initializes empty arrays properly
   - **Fix 3**: Added safety check to expand inventory if under max capacity
   - **Fix 4**: Improved InventoryFullModal messaging to be clearer about current vs new items
   - Modal now only appears when inventory is genuinely full

---

## Conclusion

This codebase provides a **solid foundation** for King of the Mountain. The architecture, type system, and UI components are in place. The main work remaining is **implementing the game logic** for combat, tile effects, and inventory management.

The code is well-commented and follows consistent patterns, making it straightforward to extend. All game data (classes, items, enemies) is easily editable in the `src/data/` folder.

**Happy coding! 👑⚔️🏔️**

---

## Contact & Support

For questions or issues:
- Check the original game design document: `King of the Hill Documentation.md`
- Review TypeScript types in `src/types/index.ts` for data structure reference
- Inspect Firebase data in real-time using Firebase Console

**Contributors**: Feel free to add your name here as you make improvements!
