# King of the Mountain - Development Assistant

## Project Context
Push-your-luck adventure race boardgame for 2-6 players. React + TypeScript frontend with Firebase backend. See `README.md` for complete game design document.

## Architecture
- **Frontend**: React + TypeScript + Vite, Zustand state management, Tailwind CSS
- **Backend**: Firebase Firestore + Anonymous Auth (no custom server)
- **Game Logic**: Client-side with Firestore Security Rules validation

## Development Guidelines

### Code Organization
```
/src/
  /game/
    /engine/     # Pure TypeScript game rules
    /data/       # Content definitions and board data
    /ui/         # React components
    /net/        # Firebase adapters
    /state/      # Client state management
```

### Key Implementation Principles
- **Pure Engine**: Game logic is Firebase-agnostic for easy testing
- **Client Authority**: All game rules run client-side with optimistic updates
- **Structured Content**: All game content defined in JSON with TypeScript types
- **Real-time Sync**: Firestore handles multiplayer state synchronization

## Reference Documentation System

This project uses detailed auxiliary documentation in `.claude/` folder:

**Core Mechanics & Data**
- `.claude/CONTENT_CATALOG.md` - All items, enemies, classes, effects with canonical IDs
- `.claude/TS_TYPES_AND_INTERFACES.md` - TypeScript contracts for all game state
- `.claude/COMBAT_AND_DUELS.md` - Combat mechanics and edge cases
- `.claude/TURN_AND_PHASE_MACHINE.md` - Turn flow state machine

**System Implementation**
- `.claude/BOARD_AND_MOVEMENT_SPEC.md` - Movement rules and board graph
- `.claude/ITEMS_INVENTORY_AND_TIMING.md` - Equipment and inventory system
- `.claude/RNG_AND_SHUFFLING.md` - Randomness and deterministic testing
- `.claude/ACTIONS_EVENTS_AND_LOGGING.md` - Action system and event logging

**Integration & Quality**
- `.claude/UI_COMPONENT_CONTRACT.md` - Component specs and user interactions
- `.claude/NETWORKING_AND_DB_SCHEMA.md` - Firestore schemas and security rules
- `.claude/TEST_PLAN_AND_FIXTURES.md` - Test scenarios and validation

## Development Workflow
1. **Check README.md** for game design context and rules
2. **Reference relevant `.claude/` docs** for implementation details
3. **Follow TypeScript contracts** from `TS_TYPES_AND_INTERFACES.md`
4. **Test against scenarios** in `TEST_PLAN_AND_FIXTURES.md`

## Current Phase
**Phase 1: Pure Game Engine** - Building core TypeScript rules engine without UI/Firebase dependencies.

## Key Reminders
- All randomness via `crypto.getRandomValues()` with audit logging
- Combat uses simultaneous attack/defense rolls with modifier stacking
- Movement history tracked for backward movement (retreat, cards)
- 8 unique player classes with passive abilities, no duplicates
- Victory condition: first to Final tile (tie-breaker duels if simultaneous)