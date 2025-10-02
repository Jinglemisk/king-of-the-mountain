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

**King of the Mountain** is a browser-based, real-time multiplayer board game for 2-6 players. It's a medieval adventure race where players compete to be the first to reach the final tile while fighting enemies, collecting treasures, and navigating chaotic luck cards.

### Game Features
- **7 Player Classes** with unique abilities (Scout, Hunter, Gladiator, Warden, Guard, Monk, Porter)
- **20-tile board** with different tile types (Enemy, Treasure, Luck, Sanctuary, Final)
- **3-tier card system** for enemies, treasures, and luck cards
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
            ├─> Card (Display Items/Enemies/Luck)
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
│   │   ├── cards.ts           # Treasure & Luck cards
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
| **Luck** | Draw luck/chance card (good or bad effects) |
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

1. **Game Board**
   - Visual board exists, tiles display correctly
   - Player tokens show on tiles
   - **Missing**: Tile click interactions, tile effect resolution

2. **Inventory**
   - UI displays equipped items and carried items
   - **Missing**: Drag & drop, equip/unequip, item swapping

3. **Logging**
   - Log display component exists
   - Basic logs for moves and system messages
   - **Missing**: Combat logs, detailed action logs

### 🔴 Not Implemented

1. **Tile Effect Resolution**
2. **Combat System (PvE & PvP)**
3. **Inventory Management (equip/unequip/drop)**
4. **Item Effects (special abilities)**
5. **Luck Card Effects (all 13 unique effects)**
6. **Class Special Abilities (Hunter, Gladiator, Warden, Guard, Monk, Scout bonuses)**
7. **Trading System**
8. **Deck Management (reshuffle when empty)**
9. **Chat System**
10. **Animations & Sound Effects**

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
- Builds and shuffles all card decks (enemies, treasures, luck)
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
**Location**: `src/state/gameSlice.ts:350`
**Description**: Rolls a dice with specified number of sides
**Parameters**:
- `sides` - Number of sides (e.g., 4 or 6)
**Returns**: Random number from 1 to sides (inclusive)
**Example**:
```typescript
const movementRoll = rollDice(4); // Returns 1-4
const attackRoll = rollDice(6);   // Returns 1-6
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
**Description**: Builds and shuffles the luck/chance card deck
**Returns**: Shuffled array of 32 LuckCard objects
**Example**:
```typescript
const luckDeck = buildLuckDeck(); // 32 luck cards, shuffled
```

#### `createItem(...)` (private)
**Location**: `src/data/cards.ts:18`
**Description**: Factory function to create item instances with unique IDs

#### `createLuckCard(...)` (private)
**Location**: `src/data/cards.ts:251`
**Description**: Factory function to create luck card instances with unique IDs

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
- `handleMove()` - Rolls d4 and moves player forward (location: line 48)
- `handleSleep()` - Restores player to full HP (location: line 76)
- `handleEndTurn()` - Advances to next player's turn (location: line 95)
- `renderEquipment()` - Renders equipped items UI (location: line 117)
- `renderInventory()` - Renders backpack inventory UI (location: line 172)
- `renderStats()` - Calculates and displays player stats (location: line 200)
- `renderActions()` - Renders action buttons for current turn (location: line 247)
- `renderLogs()` - Renders event logs panel (location: line 285)

**Current Limitations**:
- Tile effects not resolved after move
- Inventory is display-only (no drag & drop)
- Combat and trade modals are placeholders

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
**Description**: Visual representation of treasure, enemy, and luck cards
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
1. Implement combat system (PvE) - this is the core gameplay loop
2. Implement tile effect resolution - needed for cards to be drawn
3. Basic inventory management - equip/unequip items

### Short-term Goals (Week 2-3)
4. Implement all item special effects
5. Implement all luck card effects
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
