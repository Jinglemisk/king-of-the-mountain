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
    - [Managing Cards for Testing (Card Manager)](#managing-cards-for-testing-card-manager)
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
│   │   │   ├── CardRevealModal.tsx  # Card reveal display
│   │   │   ├── CombatModal.tsx      # Combat interface
│   │   │   ├── InventoryFullModal.tsx # Overflow handling
│   │   │   └── PlayerToken.tsx # Player token on board
│   │   │
│   │   └── ui/                # General UI components
│   │       ├── Button.tsx     # Styled button
│   │       ├── Input.tsx      # Text input
│   │       └── Modal.tsx      # Modal dialog
│   │
│   ├── data/                  # Easily editable game data
│   │   ├── BoardLayout.ts     # Board configuration & generation
│   │   ├── cards.ts           # Treasure & Luck Cards (uses cardManager)
│   │   ├── cardManager.ts     # Deck configuration for testing ✨ NEW!
│   │   ├── Card_Status.md     # Card testing documentation ✨ NEW!
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
│   │   ├── GameScreen.tsx     # Main gameplay screen (modularized - 465 lines)
│   │   └── GameScreen/        # GameScreen modules ✨ MODULARIZED!
│   │       ├── hooks/         # GameScreen-specific hooks (6 hooks)
│   │       │   ├── usePlayerUtils.ts       # Player queries
│   │       │   ├── useInventoryManagement.ts # Inventory operations
│   │       │   ├── useEquipmentManagement.ts # Equipment operations
│   │       │   ├── useDragAndDrop.ts       # Drag-drop state
│   │       │   ├── useTurnActions.ts       # Turn actions
│   │       │   └── useCombat.ts            # Combat operations
│   │       └── components/    # GameScreen sub-components (5 components)
│   │           ├── PlayerStats.tsx         # Player stats display
│   │           ├── GameLog.tsx             # Event logs display
│   │           ├── EquipmentSlots.tsx      # Equipment UI
│   │           ├── InventoryGrid.tsx       # Inventory UI
│   │           └── ActionButtons.tsx       # Turn actions UI
│   │
│   ├── state/                 # State management
│   │   └── gameSlice.ts       # Firebase update functions
│   │
│   ├── types/                 # TypeScript definitions
│   │   └── index.ts           # All game types & interfaces
│   │
│   ├── utils/                 # Shared utility functions ✨ NEW!
│   │   ├── inventory.ts       # Inventory normalization
│   │   ├── playerStats.ts     # Combat stat calculations
│   │   └── shuffle.ts         # Deck shuffling
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
   - ✅ Temporary effects bonuses (Rage Potion, Agility Draught)
   - ✅ Multiple enemy targeting with target selection UI
   - ✅ Retreat functionality (move back 6 tiles)
   - ✅ Victory/defeat handling
   - ✅ Enemy loot drops (50-80% based on tier)
   - ✅ Combat log display with round-by-round results
   - ✅ Monk revival ability (once per game when HP drops to 0)
   - ✅ Wardstone protection (prevent 1 HP loss)
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

3. **Effect System** ✅ **NEW!**
   - ✅ Centralized effect executor with registry pattern
   - ✅ 24 card effects fully implemented (Luck cards + consumables + unique items)
   - ✅ Temporary effects system with turn-based tracking
   - ✅ Automatic effect execution on card draw/item use
   - ✅ Movement modifiers (Beer debuff)
   - ✅ Combat bonuses from temp effects (Rage Potion, Agility Draught)
   - ✅ HP damage prevention (Wardstone)
   - ✅ Position manipulation (Blink, Mystic Wave, Nefarious Spirit)
   - ✅ Healing effects (Beer, Essence of Mysterious Flower)
   - ✅ Face-down kept cards (Ambush, Instinct)

### 🔴 Not Yet Implemented

1. **Trading System**
2. **Chat System**
3. **Animations & Sound Effects**
4. **Remaining Card Effects** (6 effects - see detailed list below)

---

## Effect System Architecture

### Overview

The Effect System is a centralized, scalable architecture for handling all card and item effects in the game. It separates effect logic from game flow, making effects testable, maintainable, and easy to extend.

### Key Components

```
src/
├── services/
│   ├── effectExecutor.ts       # Main executor + registry
│   └── effects/
│       ├── luckEffects.ts      # Luck card effects
│       ├── consumableEffects.ts # Potion/consumable effects
│       ├── itemEffects.ts      # Unique item effects
│       └── index.ts            # Re-exports
│
├── utils/
│   └── tempEffects.ts          # Temporary effect utilities
│
└── types/
    └── index.ts                # Effect types (EffectContext, EffectResult, etc.)
```

### Effect Types

**1. Passive Effects** - Automatic bonuses from equipped items
- Examples: +1 Attack, +2 Defense, +1 Movement
- Implementation: Calculated in `playerStats.ts`
- No effect executor needed

**2. Triggered Effects** - Player-activated from inventory
- Examples: Beer (heal + debuff), Rage Potion, Blink Scroll
- Implementation: `handleUseItem()` in `useInventoryManagement.ts`
- Executed via `executeEffect()` from effect executor

**3. Automatic Effects** - Execute immediately on draw
- Examples: Luck cards (move back, skip turn, forced duel)
- Implementation: `resolveTileEffect()` in `useTurnActions.ts`
- Executed via `executeEffect()` from effect executor

### Effect Executor Pattern

**File**: `src/services/effectExecutor.ts`

```typescript
// Central registry maps effect IDs to handlers
const EFFECT_REGISTRY: Record<string, EffectHandler> = {
  'move_back': luckEffects.moveBack,
  'heal_3_debuff_move': consumableEffects.heal3DebuffMove,
  'blink': itemEffects.blink,
  // ... 24 total effects
};

// Execute an effect by ID
await executeEffect('move_back', context);
```

### Effect Context

Every effect receives a context object containing:
- `gameState` - Current game state
- `lobbyCode` - For Firebase updates
- `playerId` - Who triggered the effect
- `value` - Optional numeric parameter (e.g., tiles to move)
- `targetId` - Optional target player/enemy ID
- Utility functions: `updateGameState`, `addLog`, `drawCards`, `startCombat`

Example:
```typescript
await executeEffect('move_back', {
  gameState,
  lobbyCode: 'ABC123',
  playerId: 'player-123',
  value: 3, // Move back 3 tiles
  updateGameState: (updates) => updateGameState(lobbyCode, updates),
  addLog: (type, msg, pid, important) => addLog(lobbyCode, type, msg, pid, important),
  // ... other utilities
});
```

### Temporary Effects System

**File**: `src/utils/tempEffects.ts`

Temporary effects are time-limited buffs/debuffs stored in `Player.tempEffects[]`.

**Structure**:
```typescript
interface TempEffect {
  type: string;           // Effect identifier
  duration: number;       // Turns remaining
  attackBonus?: number;   // Temp attack bonus
  defenseBonus?: number;  // Temp defense bonus
  description: string;    // Display text
}
```

**Lifecycle**:
1. **Created** - When effect executes (e.g., drink Rage Potion)
2. **Applied** - During combat calculation (`getTempEffectCombatBonuses()`)
3. **Decremented** - At end of turn (`decrementTempEffects()`)
4. **Removed** - When duration reaches 0

**Common Temp Effects**:
- `rage_potion`: +1 Attack for 1 turn
- `agility_draught`: +1 Defense for 1 turn
- `beer_debuff`: -1 Movement for 1 turn
- `wardstone`: Prevent 1 HP loss (duration: 99)
- `skip_turn`: Skip next turn (duration: 1)
- `ambush`: Can place ambush (duration: 99, until used)

**Integration Points**:
- **Combat**: `executeCombatRound()` in `gameSlice.ts` - Applies temp bonuses
- **Movement**: `handleMove()` in `useTurnActions.ts` - Applies movement modifiers
- **Turn End**: `handleEndTurn()` in `useTurnActions.ts` - Decrements durations
- **Damage**: `executeCombatRound()` in `gameSlice.ts` - Checks Wardstone protection

### Implemented Effects

**Luck Card Effects** (12 total)
| Effect ID | Card Name | Description | Status |
|-----------|-----------|-------------|--------|
| `move_back` | Exhaustion, Cave-in | Move player backward 1-3 tiles | ✅ Fully implemented |
| `move_forward` | White-Bearded Spirit | Move player forward 2 tiles | ✅ Fully implemented |
| `skip_turn` | Faint | Skip next turn | ✅ Fully implemented |
| `roll_again` | Vital Energy | Roll movement again immediately | ✅ Fully implemented |
| `skip_draw_t1` | Lost Treasure | Skip turn but draw 2 T1 treasures | ✅ Fully implemented |
| `steal_item` | Jinn Thief | Discard one item (player choice) | ⚠️ Needs selection UI |
| `lose_hp` | Sprained Wrist | Lose 1 HP | ✅ Fully implemented |
| `draw_t1` | Covered Pit | Draw 1 T1 treasure | ✅ Fully implemented |
| `swap_position` | Mystic Wave | Swap positions with nearest player | ⚠️ Needs tie-break UI |
| `forced_duel` | Nefarious Spirit | Move to nearest player and duel | ✅ Fully implemented |
| `ambush` | Ambush Opportunity | Keep face-down, place for ambush | ⚠️ Needs activation UI |
| `instinct` | Instinct | Keep face-down, move ±1 tile once | ⚠️ Needs activation UI |

**Consumable Effects** (4 total)
| Effect ID | Item Name | Description | Status |
|-----------|-----------|-------------|--------|
| `heal_3_debuff_move` | Beer | Heal 3 HP, -1 movement next roll | ✅ Fully implemented |
| `full_heal` | Essence of Mysterious Flower | Fully restore HP | ✅ Fully implemented |
| `temp_attack_1` | Rage Potion | +1 Attack this turn | ✅ Fully implemented |
| `temp_defense_1` | Agility Draught | +1 Defense this turn | ✅ Fully implemented |

**Unique Item Effects** (8 total)
| Effect ID | Item Name | Description | Status |
|-----------|-----------|-------------|--------|
| `blink` | Blink Scroll | Teleport ±2 tiles, skip pass-through | ✅ Fully implemented |
| `prevent_1_hp` | Wardstone | Prevent next 1 HP loss | ✅ Fully implemented |
| `luck_cancel` | Luck Charm | Cancel Luck card (interrupt) | ⚠️ Needs interrupt system |
| `prevent_duel` | Smoke Bomb | Prevent duels this turn | ⚠️ Needs interrupt UI |
| `invisibility` | Fairy Dust | Become invisible until next turn | ✅ Fully implemented |
| `step_back_before_resolve` | Lamp | Step back 1 before resolving tile | ⚠️ Needs timing hook |
| `trap` | Trap | Place on tile, trigger combat skip | ✅ Fully implemented |
| `creatures_only` | Boogey-Bane | +2 Attack vs creatures only | ❌ Not implemented |

**Special Case**: `trap` effect is handled separately in `useInventoryManagement.ts:handleUseTrap()` due to tile-placement mechanics.

### Adding New Effects

**Step 1**: Define the card in `cards.ts` or `enemies.ts`
```typescript
() => createItem('Fireball', 'small', 2, 'Deal 2 damage to all enemies', {
  special: 'fireball',
  isConsumable: true,
})
```

**Step 2**: Create effect handler in appropriate file
```typescript
// In src/services/effects/consumableEffects.ts
export async function fireball(context: EffectContext): Promise<EffectResult> {
  const { gameState, playerId, addLog } = context;

  // Effect logic here
  // Deal 2 damage to all enemies in combat

  await addLog('combat', `💥 ${player.nickname} cast Fireball!`, playerId, true);

  return {
    success: true,
    message: 'Fireball dealt 2 damage to all enemies',
  };
}
```

**Step 3**: Register effect in executor
```typescript
// In src/services/effectExecutor.ts
const EFFECT_REGISTRY: Record<string, EffectHandler> = {
  // ... existing effects
  'fireball': consumableEffects.fireball,
};
```

**Step 4**: Test effect
- Draw/use item in game
- Verify effect executes correctly
- Check game logs for feedback
- Verify Firebase state updates

### Complex Effect Example

See the "Complex Example" section below for a detailed walkthrough of the **Nefarious Spirit** card implementation, showing how effects integrate with combat, positioning, and player selection.

### Not Yet Implemented Card Effects

While 18 of 24 card effects are fully functional, 6 effects require additional UI/timing implementation:

#### 1. **Boogey-Bane** (Tier 2 Treasure) - Conditional Combat Bonus
**Effect ID**: `creatures_only`
**Current Status**: ❌ Not implemented
**Description**: +2 Attack vs creatures only (not players)
**Implementation Needed**:
- Add conditional check in `executeCombatRound()` in `gameSlice.ts`
- Check if defender is Enemy (has `attackBonus` property) vs Player
- Apply +2 attack bonus only in PvE combat, not PvP
- **Estimated effort**: 15 minutes

#### 2. **Luck Charm** (Tier 1 Treasure) - Interrupt System
**Effect ID**: `luck_cancel`
**Current Status**: ⚠️ Partially implemented (can cancel own cards)
**Description**: Cancel a Luck card you OR another player just drew
**Implementation Needed**:
- Real-time interrupt UI when any player draws Luck card
- "Cancel with Luck Charm?" prompt for all players with charm
- First to respond cancels the card
- Return Luck Charm to bottom of T1 deck
- **Estimated effort**: 2-3 hours (requires real-time event system)

#### 3. **Smoke Bomb** (Tier 2 Treasure) - Duel Interrupt
**Effect ID**: `prevent_duel`
**Current Status**: ⚠️ Basic implementation exists, no UI trigger
**Description**: When challenged to duel, prevent all duels this turn
**Implementation Needed**:
- Interrupt UI when player receives duel challenge
- "Use Smoke Bomb?" prompt before duel starts
- Set `smoke_bomb` tempEffect to block duels this turn
- Return Smoke Bomb to bottom of T2 deck
- **Estimated effort**: 1-2 hours

#### 4. **Ambush Opportunity** (Luck Card) - Face-Down Activation
**Effect ID**: `ambush`
**Current Status**: ⚠️ Stored in tempEffects, no activation UI
**Description**: Place on tile, duel entering players before tile resolves
**Implementation Needed**:
- UI button to place ambush on current non-Sanctuary tile
- Track ambush tile in game state
- Intercept other players' movement to that tile
- Show "Start Ambush Duel?" prompt to ambush owner
- Duel occurs BEFORE tile effect resolution
- Remove ambush after use
- **Estimated effort**: 3-4 hours (complex timing logic)

#### 5. **Instinct** (Luck Card) - Face-Down Activation
**Effect ID**: `instinct`
**Current Status**: ⚠️ Stored in tempEffects, no activation UI
**Description**: Move ±1 tile before/after movement roll (once)
**Implementation Needed**:
- UI button to "Use Instinct" (shows when player has it)
- Can use before rolling (adjust starting position) or after (adjust landing position)
- Modal to choose +1 or -1 direction
- Update position accordingly
- Remove from tempEffects after single use
- **Estimated effort**: 2 hours

#### 6. **Lamp** (Tier 1 Treasure) - Pre-Resolution Trigger
**Effect ID**: `step_back_before_resolve`
**Current Status**: ✅ Effect implemented, ❌ Not wired to correct timing
**Description**: Step back 1 tile BEFORE resolving if tile has player/enemy
**Implementation Needed**:
- After movement, check if landing tile has player or enemy
- Show "Use Lamp?" prompt BEFORE tile resolution
- Execute `stepBackBeforeResolve` if player accepts
- Move player back 1 tile, then resolve new tile
- **Estimated effort**: 1 hour

#### 7. **Player Choice Enhancements**

**Jinn Thief** (Luck Card) - `steal_item`
- **Status**: ✅ Logic implemented, ❌ No selection UI
- **Needed**: Modal showing all items (equipped + inventory) with "Discard" buttons
- **Estimated effort**: 1 hour

**Mystic Wave** (Luck Card) - `swap_position`
- **Status**: ✅ Auto-selects nearest, ❌ No tie-break UI
- **Needed**: Modal to choose between equidistant players when multiple at same distance
- **Estimated effort**: 30 minutes

---

**Implementation Summary**:
- **Total Effects**: 24
- **Fully Implemented**: 18 (75%)
- **Partially Implemented**: 6 (25%)
- **Total Implementation Time**: ~12-15 hours

**Priority Order**:
1. **Quick Wins** (1-2 hours): Boogey-Bane, Lamp timing, Mystic Wave tie-breaks, Jinn Thief UI
2. **Medium Complexity** (2-3 hours): Instinct activation, Smoke Bomb interrupt
3. **Complex Features** (3-4 hours): Ambush system, Luck Charm real-time interrupts

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

#### `generateBoardTiles(): Tile[]`
**Location**: `src/data/BoardLayout.ts`
**Description**: Generates the game board tiles from centralized configuration
**Returns**: Array of Tile objects based on BOARD_PATTERN
**Configuration**: Edit `src/data/BoardLayout.ts` to customize:
  - `BOARD_CONFIG` - Total tiles, start/final positions, sanctuary locations
  - `BOARD_PATTERN` - Complete board layout pattern (tile counts auto-calculated)
**Helper Function**: `getTileDistribution()` returns tile counts from pattern
**Validation**: Automatically validates configuration before generation
**Note**: This replaces the old hardcoded `generateTiles()` function

#### `createLogEntry(type, message, isImportant?, playerId?): LogEntry` (private)
**Location**: `src/state/gameSlice.ts:321`
**Description**: Creates a log entry object with timestamp and unique ID
**Returns**: LogEntry object

---

### `src/utils/playerStats.ts` ✨ NEW!

#### `getEquipmentBonuses(player: Player): { attackBonus: number; defenseBonus: number }`
**Location**: `src/utils/playerStats.ts:13`
**Description**: Calculate attack and defense bonuses from equipped items
**Parameters**:
- `player` - The player object
**Returns**: Object with attackBonus and defenseBonus from all equipped items
**Example**:
```typescript
const bonuses = getEquipmentBonuses(player);
// Returns: { attackBonus: 3, defenseBonus: 2 }
```

#### `getClassCombatBonuses(player: Player, isVsEnemy: boolean): { attackBonus: number; defenseBonus: number }`
**Location**: `src/utils/playerStats.ts:46`
**Description**: Calculate class-specific combat bonuses
**Parameters**:
- `player` - The player object
- `isVsEnemy` - True if fighting enemies (PvE), false if fighting players (PvP)
**Returns**: Object with class-specific attack and defense bonuses
**Logic**:
- Hunter: +1 Attack vs Enemies
- Gladiator: +1 Attack vs Players
- Warden: +1 Defense vs Enemies
- Guard: +1 Defense vs Players
**Example**:
```typescript
const bonuses = getClassCombatBonuses(hunterPlayer, true);
// Returns: { attackBonus: 1, defenseBonus: 0 }
```

#### `calculatePlayerStats(player: Player, isVsEnemy?: boolean, includeClassBonuses?: boolean): { attack: number; defense: number }`
**Location**: `src/utils/playerStats.ts:73`
**Description**: Calculate total player attack and defense (base + equipment + class bonuses)
**Parameters**:
- `player` - The player object
- `isVsEnemy` - Whether fighting enemies (default: true)
- `includeClassBonuses` - Whether to include class bonuses (default: true)
**Returns**: Object with total attack and defense values
**Base Values**: Attack = 1, Defense = 1
**Example**:
```typescript
// Get full combat stats
const stats = calculatePlayerStats(player, true);
// Returns: { attack: 4, defense: 3 }

// Get equipment stats only (for display)
const displayStats = calculatePlayerStats(player, true, false);
// Returns: { attack: 3, defense: 2 } (no class bonuses)
```

---

### `src/utils/shuffle.ts` ✨ NEW!

#### `shuffleDeck<T>(deck: T[]): T[]`
**Location**: `src/utils/shuffle.ts:10`
**Description**: Shuffle an array using Fisher-Yates algorithm
**Parameters**:
- `deck` - Array to shuffle (generic type T)
**Returns**: New shuffled array (does not mutate original)
**Example**:
```typescript
const shuffledEnemies = shuffleDeck(enemyDeck);
const shuffledCards = shuffleDeck(treasureDeck);
```

---

### `src/utils/inventory.ts` ✨ NEW!

#### `normalizeInventory(inventory: (Item | null)[] | undefined | null, playerClass: PlayerClass): (Item | null)[]`
**Location**: `src/utils/inventory.ts:14`
**Description**: Normalize inventory array to ensure correct number of slots
**Parameters**:
- `inventory` - Current inventory array (may be incomplete or empty)
- `playerClass` - Player's class (Porter gets 5 slots, others get 4)
**Returns**: Normalized inventory array with proper length, padded with null
**Example**:
```typescript
// Normal player with partial inventory
const normalized = normalizeInventory([item1, item2], 'Scout');
// Returns: [item1, item2, null, null]

// Porter with full inventory
const porterInv = normalizeInventory([item1, item2, item3, item4], 'Porter');
// Returns: [item1, item2, item3, item4, null]
```

---

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
- Applies class bonuses via `getClassCombatBonuses()` from `utils/playerStats.ts`
- Applies equipment bonuses via `getEquipmentBonuses()` from `utils/playerStats.ts`
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
**Returns**: Shuffled array of Enemy objects using `shuffleDeck()` from `utils/shuffle.ts`
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
**Location**: `src/data/cards.ts:339`
**Description**: Builds and shuffles a treasure deck for a given tier
**Parameters**:
- `tier` - Treasure tier (1, 2, or 3)
**Returns**: Shuffled array of Item objects using `shuffleDeck()` from `utils/shuffle.ts`
**Deck Sizes**:
- Tier 1: 24 items
- Tier 2: 18 items
- Tier 3: 10 items
**Example**:
```typescript
const tier1Treasures = buildTreasureDeck(1); // 24 tier 1 items, shuffled
```

#### `buildLuckDeck(): LuckCard[]`
**Location**: `src/data/cards.ts:358`
**Description**: Builds and shuffles the Luck Card deck
**Returns**: Shuffled array of 32 LuckCard objects using `shuffleDeck()` from `utils/shuffle.ts`
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

### `src/screens/GameScreen.tsx` ✨ MODULARIZED!

#### `<GameScreen />`
**Location**: `src/screens/GameScreen.tsx:41`
**Description**: Main gameplay screen orchestrating board, inventory, and actions using modular components and hooks
**Props**:
- `gameState: GameState` - Current game state from Firebase
- `playerId: string` - This player's ID
**State**:
- `selectedItem`: Currently selected item for detail view
- `showLogs`: Whether logs panel is visible
- `activeTab`: 'logs' | 'chat'
- Modal states for various game features

**Architecture**:
The GameScreen has been fully modularized from **1,425 lines to 465 lines** (67% reduction) by extracting:
- **5 UI Components** (PlayerStats, GameLog, EquipmentSlots, InventoryGrid, ActionButtons)
- **6 Custom Hooks** (usePlayerUtils, useInventoryManagement, useEquipmentManagement, useDragAndDrop, useTurnActions, useCombat)

**Components Used**:
- `<PlayerStats />` - Displays HP, attack, defense, class
- `<GameLog />` - Displays event logs with tabs
- `<EquipmentSlots />` - Equipment slots with drag-and-drop
- `<InventoryGrid />` - Inventory grid with trap placement
- `<ActionButtons />` - Turn action buttons

**Hooks Used**:
- `usePlayerUtils()` - Player queries (same tile, unconscious, current tile)
- `useInventoryManagement()` - Inventory operations (add, update, discard, trap, drop)
- `useEquipmentManagement()` - Equipment operations (equip, unequip, swap, validation)
- `useDragAndDrop()` - Drag-and-drop state management
- `useTurnActions()` - Turn actions (move, sleep, duel, end turn, unconscious)
- `useCombat()` - Combat operations (attack, retreat, end, reveal, looting)

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
- Most item special abilities not yet implemented (except Trap)
- Luck Card effects are not implemented yet (cards are drawn and displayed only)
- Trade and Chat systems are stubbed for future implementation

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
**Location**: `src/components/game/CombatModal.tsx:32`
**Description**: Fully functional combat modal for PvE and PvP encounters
**Props**:
- `isOpen: boolean` - Whether modal is visible
- `gameState: GameState` - Current game state
- `playerId: string` - Current player's ID
- `onAttack: (targetId?: string) => void` - Callback for attack action
- `onRetreat: () => void` - Callback for retreat action
- `onEndCombat: () => void` - Callback when combat ends

**Features**:
- Real-time combat with attack button
- Multiple enemy targeting with click-to-select
- Round-by-round combat log display
- Calculates stats using `calculatePlayerStats()` from `utils/playerStats.ts`
- Victory/defeat screens
- Retreat functionality
- Visual feedback for selected targets and defeated enemies

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

### GameScreen Components ✨ NEW!

#### `<PlayerStats />`
**Location**: `src/screens/GameScreen/components/PlayerStats.tsx:13`
**Description**: Displays player's current HP, attack, defense, and class
**Props**:
- `player: Player` - The player object
**Features**:
- Shows HP as current/max
- Displays total attack and defense (from equipment only)
- Uses `calculatePlayerStats()` from `utils/playerStats.ts`
- Class bonuses excluded from inventory display

---

#### `<GameLog />`
**Location**: `src/screens/GameScreen/components/GameLog.tsx:14`
**Description**: Displays event logs and chat placeholder with tabbed interface
**Props**:
- `logs: LogEntry[]` - Array of game event logs
- `activeTab: 'logs' | 'chat'` - Currently active tab
- `onTabChange: (tab: 'logs' | 'chat') => void` - Tab change handler
**Features**:
- Shows last 20 logs in reverse chronological order
- Log types: action, combat, system, chat
- Important logs highlighted
- Timestamps displayed
- Chat tab placeholder for future implementation

---

#### `<EquipmentSlots />`
**Location**: `src/screens/GameScreen/components/EquipmentSlots.tsx:19`
**Description**: Displays and manages equipped items (2 Holdable, 1 Wearable) with drag-and-drop
**Props**:
- `equipment: Equipment` - Current equipment object
- `draggedItem: { item: Item; source: string } | null` - Currently dragged item
- `canEquipItemInSlot: (item: Item, slot) => boolean` - Validation function
- `onDragStart: (item: Item, source: string) => void` - Drag start handler
- `onDragOver: (e: React.DragEvent) => void` - Drag over handler
- `onDrop: (e: React.DragEvent, slot) => void` - Drop handler
- `onItemClick: (item: Item) => void` - Item click handler
**Features**:
- Three equipment slots: Hand 1, Hand 2, Armor
- Drag-and-drop equip/unequip/swap
- Valid/invalid drop zone visual feedback
- Empty slot placeholders

---

#### `<InventoryGrid />`
**Location**: `src/screens/GameScreen/components/InventoryGrid.tsx:20`
**Description**: Displays player's carried items with drag-and-drop and trap placement
**Props**:
- `player: Player` - The player object
- `isMyTurn: boolean` - Whether it's the player's turn
- `onDragStart: (item: Item, source: string) => void` - Drag start handler
- `onDragOver: (e: React.DragEvent) => void` - Drag over handler
- `onDropOnInventory: (e: React.DragEvent) => void` - Drop handler
- `onItemClick: (item: Item) => void` - Item click handler
- `onUseTrap: (item: Item, index: number) => void` - Trap use handler
**Features**:
- Displays 4 slots (5 for Porter class)
- Drag-and-drop item management
- Trap placement button (only on player's turn)
- Auto-normalizes inventory using `normalizeInventory()` from `utils/inventory.ts`

---

#### `<ActionButtons />`
**Location**: `src/screens/GameScreen/components/ActionButtons.tsx:38`
**Description**: Displays available actions for the current player's turn
**Props**:
- `isMyTurn: boolean` - Whether it's this player's turn
- `currentPlayer: Player` - The current player
- `turnPlayerNickname: string` - Nickname of player whose turn it is
- `playersOnSameTile: Record<string, Player>` - Players on same tile
- `unconsciousPlayersOnTile: Record<string, Player>` - Unconscious players on tile
- `isSanctuary: boolean` - Whether current tile is sanctuary
- `onMove: () => void` - Move action handler
- `onSleep: () => void` - Sleep action handler
- `onShowDuelModal: () => void` - Show duel modal handler
- `onLootPlayer: (playerId: string) => void` - Loot player handler
- `onEndTurn: () => void` - End turn handler
**Features**:
- Shows waiting message when not player's turn
- Shows wake up message when unconscious
- Action buttons: Move, Sleep, Duel, Loot, Trade (coming soon)
- End Turn button
- Buttons disabled appropriately based on game state

---

### GameScreen Hooks ✨ NEW!

#### `usePlayerUtils()`
**Location**: `src/screens/GameScreen/hooks/usePlayerUtils.ts:14`
**Description**: Provides utility functions for player-related calculations and queries
**Parameters**:
- `gameState: GameState` - Current game state
- `playerId: string` - This player's ID
- `currentPlayer: Player` - Current player object
**Returns**:
- `getPlayersOnSameTile()` - Returns alive players on same tile (for dueling)
- `getUnconsciousPlayersOnSameTile()` - Returns unconscious players on tile (for looting)
- `getCurrentTile()` - Returns the tile the player is currently on

---

#### `useInventoryManagement()`
**Location**: `src/screens/GameScreen/hooks/useInventoryManagement.ts:21`
**Description**: Handles all inventory-related operations
**Parameters**:
- `gameState: GameState` - Current game state
- `playerId: string` - This player's ID
- `currentPlayer: Player` - Current player object
- State setters for pending items and modals
- `draggedItem` and `setDraggedItem` - Drag state
- `handleUnequipItem` - From equipment management hook
**Returns**:
- `addItemToInventory(items)` - Adds items to first available slots with overflow detection
- `handleInventoryUpdate(inventory)` - Updates inventory in Firebase
- `handleInventoryDiscard(itemsToKeep)` - Handles overflow modal selection
- `handleUseTrap(item, index)` - Places trap on current tile
- `handleDropOnInventory(e)` - Handles dropping item onto inventory

---

#### `useEquipmentManagement()`
**Location**: `src/screens/GameScreen/hooks/useEquipmentManagement.ts:17`
**Description**: Handles all equipment-related operations
**Parameters**:
- `gameState: GameState` - Current game state
- `playerId: string` - This player's ID
- `currentPlayer: Player` - Current player object
- `draggedItem` and `setDraggedItem` - Drag state
**Returns**:
- `canEquipItemInSlot(item, slot)` - Validates if item can be equipped in slot
- `handleEquipItem(item, index, slot)` - Equips item from inventory
- `handleUnequipItem(item, slot)` - Unequips item to inventory
- `handleSwapEquippedItems(fromSlot, toSlot)` - Swaps items between equipment slots
- `handleDropOnEquipment(e, slot)` - Handles dropping item onto equipment slot

---

#### `useDragAndDrop()`
**Location**: `src/screens/GameScreen/hooks/useDragAndDrop.ts:9`
**Description**: Manages drag-and-drop state and handlers
**Parameters**: None
**Returns**:
- `draggedItem` - Currently dragged item with source location
- `setDraggedItem` - State setter for dragged item
- `handleDragStart(item, source)` - Initiates drag operation
- `handleDragOver(e)` - Allows drop by preventing default

---

#### `useTurnActions()`
**Location**: `src/screens/GameScreen/hooks/useTurnActions.ts:31`
**Description**: Handles all turn-related actions (move, sleep, duel, end turn, etc.)
**Parameters**:
- `gameState: GameState` - Current game state
- `playerId: string` - This player's ID
- `currentPlayer: Player` - Current player object
- `safeTurnPlayer: Player` - Turn player with fallback
- State setters for cards, combat, modals
- `handleEndTurn` - Passed from parent for circular dependency
**Returns**:
- `resolveTileEffect(tile)` - Resolves tile effects (enemy/treasure/luck)
- `handleMove()` - Rolls dice, moves player, checks traps, resolves tile
- `handleSleep()` - Restores player to full HP
- `handleEndTurn()` - Advances to next player's turn
- `handleDuel(targetPlayerId)` - Initiates PvP duel
- `handleLootPlayer(targetPlayerId)` - Opens looting modal
- `handleUnconsciousPlayerTurn()` - Auto-wakes unconscious player

---

#### `useCombat()`
**Location**: `src/screens/GameScreen/hooks/useCombat.ts:27`
**Description**: Handles all combat-related operations
**Parameters**:
- `gameState: GameState` - Current game state
- `playerId: string` - This player's ID
- `currentPlayer: Player` - Current player object
- State setters for combat, looting, inventory
- `revealCardType`, `combatEnemies`, `pendingItems` - Combat state
- `addItemToInventory` and `handleInventoryUpdate` - From inventory hook
**Returns**:
- `handleCombatAttack(targetId?)` - Executes combat round with optional target
- `handleCombatRetreat()` - Retreats from combat (moves back 6 tiles)
- `handleCombatEnd()` - Ends combat, handles victory/defeat, distributes loot
- `handleCardRevealClose()` - Handles card reveal modal close, starts combat if needed
- `handleLootingFinish()` - Ends looting and closes modal

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

### Managing Cards for Testing (Card Manager)

The Card Manager system (`src/data/cardManager.ts`) lets you control which cards appear in the game without editing code. This is essential for playtesting specific cards and combinations.

#### Quick Start

1. **Open** `src/data/cardManager.ts`
2. **Edit** the `deckConfig` object to customize your deck
3. **Reload** the dev server to apply changes

#### Configuration Options

Each card has three settings:

```typescript
Dagger: { enabled: true, quantity: 4, priority: false }
```

- **`enabled`**: `true` to include card, `false` to remove it
- **`quantity`**: Number of copies in the deck
- **`priority`**: `true` places card at top of deck (drawn first)

#### Common Testing Scenarios

**Disable a specific card:**
```typescript
// Completely remove Traps from the game
Trap: { enabled: false, quantity: 0, priority: false }
```

**Test with more copies:**
```typescript
// Test with 10 Daggers instead of 4
Dagger: { enabled: true, quantity: 10, priority: false }
```

**Force specific cards to top of deck:**
```typescript
// Guarantee these cards are drawn first
Beer: { enabled: true, quantity: 2, priority: true }
Trap: { enabled: true, quantity: 3, priority: true }
// Priority cards are shuffled among themselves, then placed before regular cards
```

**Test only specific cards (disable all others):**
```typescript
treasures: {
  // Enable only cards you want to test
  Trap: { enabled: true, quantity: 5, priority: true },
  Beer: { enabled: true, quantity: 5, priority: true },

  // Disable all other cards
  Dagger: { enabled: false, quantity: 0, priority: false },
  WoodenShield: { enabled: false, quantity: 0, priority: false },
  Robe: { enabled: false, quantity: 0, priority: false },
  // ... etc
}
```

**Test card interactions:**
```typescript
// Testing Trap immunity for Scout class
luckCards: {
  // Only enable movement cards to force trap encounters
  Exhaustion: { enabled: true, quantity: 10, priority: true },
  CaveIn: { enabled: true, quantity: 10, priority: true },
  // Disable all other luck cards
}

treasures: {
  // Ensure traps are available
  Trap: { enabled: true, quantity: 10, priority: true },
  // Disable other T1 cards
}
```

#### How Priority Works

Priority cards appear at the **top of the deck**:

1. All priority cards are shuffled together
2. All non-priority cards are shuffled together
3. Priority cards are placed first, followed by regular cards
4. This means priority cards will be drawn earliest, but their exact order is still random

Example:
```typescript
// Tier 1 deck with priorities
Trap: { enabled: true, quantity: 3, priority: true },    // Will be in first 5 cards
Beer: { enabled: true, quantity: 2, priority: true },    // Will be in first 5 cards
Dagger: { enabled: true, quantity: 10, priority: false }, // Will be in cards 6-15

// Resulting deck order (example):
// [Beer, Trap, Trap, Beer, Trap, Dagger, Dagger, Dagger, ...]
//  ↑---- Priority cards ----↑  ↑------- Regular cards -------↑
```

#### Resetting Configuration

**Reset to default (manual):**
1. Open `cardManager.ts`
2. Copy the `DEFAULT_DECK_CONFIG` object
3. Paste it into `deckConfig`

**Save current config as new default:**
1. Open `cardManager.ts`
2. Copy your current `deckConfig` object
3. Paste it into `DEFAULT_DECK_CONFIG`

#### Behind the Scenes

When you start a game:
1. `buildTreasureDeck()` and `buildLuckDeck()` in `cards.ts` read from `cardManager.ts`
2. Only enabled cards are included
3. Each card is created N times based on `quantity`
4. Priority cards are separated and placed at deck top
5. Decks are saved to Firebase and used for the entire game session

**Important:** Changes only apply to NEW games. Existing games use the deck configuration from when they were created.

#### Testing Workflow

```bash
# 1. Edit cardManager.ts
# Example: Enable only Traps and Beer
vim src/data/cardManager.ts

# 2. Dev server auto-reloads
# (if using npm run dev)

# 3. Create a new game to test
# Go to localhost:5173 and start a new lobby

# 4. Draw cards and verify configuration
# First few cards should be your priority cards

# 5. Test card interactions
# Document findings in src/data/Card_Status.md
```

#### Tips

- Keep a backup of `DEFAULT_DECK_CONFIG` before extensive changes
- Use priority for deterministic testing (no RNG waiting)
- Set quantity to 1 for rare cards you want to test once
- Document your test configurations in comments:
  ```typescript
  // Testing Trap mechanics - 2024-01-15
  Trap: { enabled: true, quantity: 10, priority: true },
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

### Card Manager Not Working

**Problem**: Changes to `cardManager.ts` don't appear in game

**Solutions**:
1. **Create a NEW game** - Card Manager only affects new lobbies, not existing ones
2. Check for TypeScript errors in `cardManager.ts` (dev server console)
3. Verify card names match exactly (case-sensitive):
   - Use `Dagger` not `dagger`
   - Use `LordsSword` not `Lord'sSword` in config keys
4. Reload dev server if hot-reload didn't trigger
5. Check browser console for warnings about missing factory functions

**Problem**: Cards not appearing in expected order (priority not working)

**Solutions**:
1. Remember: Priority cards are **shuffled among themselves** first
2. Priority cards go to top, but order within priority group is random
3. To test a specific card first, set quantity: 1 with priority: true
4. Check multiple games - RNG may vary results

**Problem**: Deck is empty or missing cards

**Solutions**:
1. Ensure at least one card is enabled per tier you're testing
2. Check `quantity` is > 0 for enabled cards
3. Verify you're testing the right tier (T1, T2, T3, Luck)
4. Check Firebase console - deck arrays should not be empty at game start

---

## Next Steps for Developers

### Immediate Priorities (Week 1)
1. ✅ ~~Implement tile effect resolution~~ - **COMPLETED**
2. ✅ ~~Card drawing with deck management~~ - **COMPLETED**
3. ✅ ~~Basic inventory auto-add and overflow handling~~ - **COMPLETED**
4. ✅ ~~Implement combat system (PvE & PvP)~~ - **COMPLETED**
5. ✅ ~~Manual inventory management - equip/unequip items~~ - **COMPLETED**
6. ✅ ~~Code refactoring and optimization~~ - **COMPLETED**
7. ✅ ~~GameScreen modularization (components + hooks)~~ - **COMPLETED**

### Short-term Goals (Week 2-3)
1. ✅ ~~Implement Luck Card effects~~ - **COMPLETED** (18/24 effects done, 6 need UI/timing enhancements)
2. Complete remaining card effects:
   - Boogey-Bane conditional bonus
   - Jinn Thief item selection UI
   - Lamp pre-resolution trigger
   - Mystic Wave tie-break UI
   - Instinct activation UI
   - Ambush placement system
   - Interrupt system (Luck Charm, Smoke Bomb)
3. Implement trading system
4. Add chat system

### Medium-term Goals (Month 1)
1. Polish UI/UX (animations, sounds, better feedback)
2. Playtesting and balance adjustments
3. Deploy to production hosting (Vercel, Netlify, Firebase Hosting)

### Long-term Enhancements
- Player accounts and persistent profiles
- Game replay/history
- Spectator mode
- Mobile responsive design
- More classes, items, enemies
- Alternative game modes (team play, co-op vs AI, etc.)

---

## Recent Updates

### GameScreen Modularization (Latest - October 2025)

**What was modularized:**

Successfully refactored `GameScreen.tsx` from **1,425 lines to 465 lines** (67% reduction) by extracting business logic into focused, reusable components and custom hooks.

**1. UI Components Created** (`src/screens/GameScreen/components/`)
   - **`PlayerStats.tsx`** (44 lines) - Displays HP, attack, defense, class
   - **`GameLog.tsx`** (58 lines) - Event logs with tabs for logs/chat
   - **`EquipmentSlots.tsx`** (107 lines) - Equipment slots with drag-and-drop
   - **`InventoryGrid.tsx`** (76 lines) - Inventory grid with trap placement
   - **`ActionButtons.tsx`** (101 lines) - Turn action buttons

**2. Custom Hooks Created** (`src/screens/GameScreen/hooks/`)
   - **`usePlayerUtils.ts`** (53 lines) - Player queries (same tile, unconscious, current tile)
   - **`useInventoryManagement.ts`** (177 lines) - Inventory operations (add, update, discard, trap, drop)
   - **`useEquipmentManagement.ts`** (221 lines) - Equipment operations (equip, unequip, swap, validation)
   - **`useDragAndDrop.ts`** (31 lines) - Drag-and-drop state management
   - **`useTurnActions.ts`** (304 lines) - Turn actions (move, sleep, duel, end turn, unconscious)
   - **`useCombat.ts`** (167 lines) - Combat operations (attack, retreat, end, reveal, looting)

**3. Architecture Improvements**
   - **Single Responsibility**: Each component/hook handles one concern
   - **Reusability**: Components and hooks can be used independently
   - **Testability**: Smaller, focused units are easier to test
   - **Maintainability**: Clear separation of concerns
   - **Type Safety**: Full TypeScript coverage maintained

**4. Circular Dependency Resolution**
   - Used ref pattern to handle `useTurnActions` needing `handleEndTurn`
   - `turnActionsRef.current` holds reference to avoid circular dependency

**Code Quality Improvements:**
- ✅ **Zero TypeScript errors** after modularization
- ✅ **960 lines removed** from main GameScreen file
- ✅ **Clear component hierarchy** with props flowing down
- ✅ **Better code navigation** with organized file structure
- ✅ **Faster development** with smaller, focused files

**Testing:**
- ✅ Build passes with no errors
- ✅ All functionality preserved
- ✅ No breaking changes
- ✅ Bundle size: 478.77 kB (no size increase)

**File Statistics:**
- **Original GameScreen.tsx**: 1,425 lines
- **Refactored GameScreen.tsx**: 465 lines
- **Total new files**: 11 (5 components + 6 hooks)
- **Total new code**: 1,139 lines (well-organized in modules)
- **Net benefit**: Highly maintainable, modular architecture

---

### Code Refactoring & Optimization (October 2025)

**What was refactored:**

1. **Created Shared Utility Files** (`src/utils/`)
   - **`playerStats.ts`** - Consolidated all player stat calculations
     - `getEquipmentBonuses()` - Calculate equipment bonuses
     - `getClassCombatBonuses()` - Calculate class-specific combat bonuses
     - `calculatePlayerStats()` - Calculate total attack/defense (base + bonuses)
   - **`shuffle.ts`** - Generic Fisher-Yates shuffle implementation
     - `shuffleDeck<T>()` - Used by all deck building functions
   - **`inventory.ts`** - Inventory management utilities
     - `normalizeInventory()` - Ensure correct inventory slot count

2. **Eliminated Code Duplication**
   - Removed duplicate stats calculation from:
     - `gameSlice.ts` (removed `getClassCombatBonuses()` and `getEquipmentBonuses()`)
     - `CombatModal.tsx` (removed `calculateStats()`)
     - `GameScreen.tsx` (removed inline stats calculation)
   - Removed duplicate shuffle function from:
     - `enemies.ts` (removed local `shuffleDeck()`)
     - `cards.ts` (removed local `shuffleDeck()`)
   - Extracted `normalizeInventory()` from GameScreen.tsx to utility

3. **Cleaned Up Dead Code**
   - Removed 25+ lines of commented-out code
   - Deleted obsolete TODO comments
   - Removed unused function implementations

4. **Updated All Imports**
   - `gameSlice.ts` now imports from `utils/playerStats.ts`
   - `CombatModal.tsx` now imports from `utils/playerStats.ts`
   - `GameScreen.tsx` now imports from `utils/playerStats.ts` and `utils/inventory.ts`
   - `enemies.ts` now imports from `utils/shuffle.ts`
   - `cards.ts` now imports from `utils/shuffle.ts`

**Code Quality Improvements:**
- ✅ **Zero TypeScript errors** after refactoring
- ✅ **~165 lines of duplicate/dead code removed**
- ✅ **Single source of truth** for all utility functions
- ✅ **Better code organization** with clear separation of concerns
- ✅ **Easier to maintain** with consolidated logic

**Testing:**
- ✅ Build passes with no errors
- ✅ All functionality preserved
- ✅ No breaking changes

**Future Modularization:**
- GameScreen.tsx modularization plan created (`GAMESCREEN_MODULARIZATION_PLAN.md`)
- Target: Break 1,424-line file into modular structure (~400 line main file + hooks + components)
- See `REFACTORING_COMPLETED.md` for full details

---

### Complete Combat System Implementation (December 2024)

**What was implemented:**

1. **Core Combat Functions** (`src/state/gameSlice.ts`)
   - `startCombat()` - Initialize combat state with attackers and defenders
   - `executeCombatRound()` - Execute combat rounds with d6 dice rolls
   - `endCombat()` - Handle victory/defeat and loot distribution
   - `rollEnemyLoot()` - Roll for enemy loot drops based on tier
   - Uses `getClassCombatBonuses()` from `utils/playerStats.ts`
   - Uses `getEquipmentBonuses()` from `utils/playerStats.ts`

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

---

## Complex Effect Example: Nefarious Spirit Card

This section provides a detailed walkthrough of a complex card effect implementation, showing how the effect system integrates card definitions, effect handlers, combat mechanics, and player interactions.

### Card Definition

**File**: `src/data/cards.ts:293`

```typescript
() => createLuckCard(
  'Nefarious Spirit',
  'Move to the nearest player within 6 tiles and engage in a duel',
  'forced_duel'
)
```

The card is defined with:
- **Name**: "Nefarious Spirit"
- **Description**: Player-facing text explaining what happens
- **Effect ID**: `'forced_duel'` - Maps to effect handler in registry

### Effect Registration

**File**: `src/services/effectExecutor.ts:31`

```typescript
const EFFECT_REGISTRY: Record<string, EffectHandler> = {
  // ... other effects
  'forced_duel': luckEffects.forcedDuel,
  // ... other effects
};
```

The `forced_duel` identifier maps to the `forcedDuel` handler function.

### Effect Handler Implementation

**File**: `src/services/effects/luckEffects.ts:294`

```typescript
export async function forcedDuel(context: EffectContext): Promise<EffectResult> {
  const { gameState, playerId, startCombat, addLog } = context;
  const player = gameState.players[playerId];

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  // Find all other players within 6 tiles
  const otherPlayers = Object.values(gameState.players).filter(p => {
    if (p.id === playerId) return false;
    const distance = Math.abs(p.position - player.position);
    return distance <= 6;
  });

  if (otherPlayers.length === 0) {
    await addLog(
      'action',
      `👹 Nefarious Spirit appeared, but no players are within 6 tiles of ${player.nickname}!`,
      playerId
    );
    return { success: true, message: 'No players within range' };
  }

  // Find nearest player
  let nearestPlayer: Player = otherPlayers[0];
  let minDistance = Math.abs(nearestPlayer.position - player.position);

  for (const p of otherPlayers) {
    const distance = Math.abs(p.position - player.position);
    if (distance < minDistance) {
      minDistance = distance;
      nearestPlayer = p;
    }
  }

  // Move player to nearest player's position
  await context.updateGameState({
    [`players/${playerId}/position`]: nearestPlayer.position,
  });

  await addLog(
    'combat',
    `👹 Nefarious Spirit! ${player.nickname} was forced to move to ${nearestPlayer.nickname}'s position!`,
    playerId,
    true
  );

  // Start combat (no retreat allowed for forced duel)
  await startCombat(playerId, [nearestPlayer], false);

  return {
    success: true,
    message: `Forced duel with ${nearestPlayer.nickname}`,
    data: { targetPlayer: nearestPlayer.nickname },
  };
}
```

### Effect Flow Breakdown

**Step 1: Card Draw**
When player lands on Luck tile:
```typescript
// In useTurnActions.ts:108
const luckCard = await drawLuckCard(gameState.lobbyCode);
// Card revealed to player in CardRevealModal
```

**Step 2: Effect Execution**
```typescript
// In useTurnActions.ts:127
await executeEffect(luckCard.effect, {
  gameState,
  lobbyCode: gameState.lobbyCode,
  playerId,
  updateGameState: (updates) => updateGameState(gameState.lobbyCode, updates),
  addLog: (type, message, pid, important) => addLog(gameState.lobbyCode, type, message, pid, important),
  startCombat: (attackerId, defenders, canRetreat) => startCombat(gameState.lobbyCode, attackerId, defenders, canRetreat),
  // ... other utility functions
});
```

**Step 3: Effect Logic Execution**
1. **Player Validation**: Checks if triggering player exists
2. **Range Check**: Finds all players within 6 tiles (distance calculation)
3. **Edge Case**: If no players in range, logs message and exits gracefully
4. **Target Selection**: Finds nearest player using minimum distance algorithm
5. **Position Update**: Moves triggering player to target's position via Firebase
6. **Logging**: Adds combat log entry with important flag for highlighting
7. **Combat Initiation**: Calls `startCombat()` with:
   - `attackerId`: The player who drew the card
   - `defenders`: Array containing the nearest player
   - `canRetreat: false`: Forced duels don't allow retreat

**Step 4: Combat System Takeover**
```typescript
// In gameSlice.ts:559 - startCombat()
export async function startCombat(
  lobbyCode: string,
  attackerId: string,
  defenders: (Enemy | Player)[],
  canRetreat: boolean
): Promise<void> {
  // Create combat state
  const combatState: CombatState = {
    isActive: true,
    attackerId,
    defenderIds: defenders.map(d => d.id),
    defenders,
    currentRound: 0,
    combatLog: [],
    canRetreat, // false for Nefarious Spirit
  };

  // Update Firebase with combat state
  await updateGameState(lobbyCode, { combat: combatState });

  // Log combat initiation
  await addLog(lobbyCode, 'combat', `Combat started!`, attackerId, true);
}
```

**Step 5: Combat Modal Display**
```typescript
// In GameScreen.tsx (rendered when gameState.combat !== null)
<CombatModal
  isOpen={gameState.combat !== null}
  gameState={gameState}
  playerId={playerId}
  onAttack={handleCombatAttack}
  onRetreat={handleCombatRetreat} // Disabled for forced duels
  onEndCombat={handleCombatEnd}
/>
```

**Step 6: Combat Execution**
Player clicks "Attack" button:
```typescript
// In useCombat.ts:37 - handleCombatAttack()
const combatEntry = await executeCombatRound(gameState.lobbyCode);
```

Combat round logic:
```typescript
// In gameSlice.ts:601 - executeCombatRound()
// 1. Roll d6 for attack and defense for both players
// 2. Apply equipment bonuses via getEquipmentBonuses()
// 3. Apply class bonuses via getClassCombatBonuses()
// 4. Apply temp effects bonuses via getTempEffectCombatBonuses()
// 5. Calculate total attack/defense
// 6. Determine hits: attack > defense
// 7. Apply HP damage
// 8. Check Wardstone protection
// 9. Check Monk revival
// 10. Update Firebase with new HP values
// 11. Return combat log entry
```

**Step 7: Combat Resolution**
When one player reaches 0 HP:
```typescript
// In useCombat.ts:52 - handleCombatEnd()
const loot = await endCombat(gameState.lobbyCode, false);

// For PvP (Nefarious Spirit case):
// - Loser's HP restored to full
// - Winner can loot loser's items
// - Combat state cleared from Firebase
```

### Integration Points

**1. Card System** → **Effect Executor**
```
cards.ts (effect: 'forced_duel')
  ↓
effectExecutor.ts (EFFECT_REGISTRY['forced_duel'])
  ↓
luckEffects.ts (forcedDuel function)
```

**2. Effect Handler** → **Combat System**
```
luckEffects.forcedDuel()
  ↓ startCombat()
gameSlice.ts (createCombatState, update Firebase)
  ↓ combat !== null
GameScreen.tsx (render CombatModal)
```

**3. Combat Execution** → **State Updates**
```
CombatModal (player clicks Attack)
  ↓ handleCombatAttack()
useCombat.ts
  ↓ executeCombatRound()
gameSlice.ts (roll dice, calculate damage, update HP)
  ↓ Firebase update
All clients (re-render with new state)
```

### Key Features Demonstrated

1. **Multi-step Effect**: Position change → combat initiation
2. **Player Selection**: Automated (nearest) vs manual (UI choice)
3. **Distance Calculation**: `Math.abs(p.position - player.position)`
4. **Edge Case Handling**: No players in range scenario
5. **Combat Integration**: Seamless transition to combat system
6. **Firebase Updates**: Multiple state changes in sequence
7. **Logging**: User-facing feedback at each step
8. **PvP Mechanics**: Forced duel with no retreat
9. **Error Handling**: Graceful failures with error messages
10. **Type Safety**: Full TypeScript coverage throughout

### Testing Checklist

✅ **Basic Functionality**
- Player draws Nefarious Spirit card
- Effect identifies nearest player within 6 tiles
- Player teleports to target's position
- Combat initiates automatically

✅ **Edge Cases**
- No players within 6 tiles (effect skips combat)
- Multiple players at same distance (picks first found)
- Target player at position 0 or 19 (boundary)
- Only 2 players in game (targets the other)

✅ **Combat Integration**
- Retreat button disabled (canRetreat: false)
- Class bonuses applied (Gladiator gets +1 Attack in PvP)
- Equipment bonuses calculated correctly
- Temp effects applied if active
- Wardstone protection works
- Combat logs display properly

✅ **State Synchronization**
- Position update visible to all clients
- Combat state appears for all players
- HP changes propagate in real-time
- Combat end clears state properly

### Related Files Reference

- **Card Definition**: `src/data/cards.ts:293`
- **Effect Handler**: `src/services/effects/luckEffects.ts:294`
- **Effect Registry**: `src/services/effectExecutor.ts:31`
- **Combat Initiation**: `src/state/gameSlice.ts:559`
- **Combat Execution**: `src/state/gameSlice.ts:601`
- **Combat UI**: `src/components/game/CombatModal.tsx`
- **Luck Card Draw**: `src/screens/GameScreen/hooks/useTurnActions.ts:108`
- **Effect Execution**: `src/screens/GameScreen/hooks/useTurnActions.ts:127`

This example demonstrates how a complex card effect seamlessly integrates with multiple game systems while maintaining clean separation of concerns and type safety.
