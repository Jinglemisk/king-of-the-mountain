# Claude Development Assistant for King of the Hill

## Project Overview

King of the Hill is a push-your-luck, lightweight adventure race game for 2-6 players. Players roll d4 to advance along a 68-tile branching track, fighting enemies, collecting treasures, and racing to reach the final tile first. The game targets 20-30 minute matches and is designed for desktop web browsers.

## Architecture Summary

- **Frontend**: React + TypeScript + Vite with Zustand/Redux Toolkit state management
- **Backend**: Firebase Firestore + Firebase Anonymous Auth (no custom server)
- **Game Logic**: Client-side with lightweight validation via Firestore Security Rules

## Claude Assistant Documentation

This project uses a structured documentation system in the `.claude/` folder to provide Claude with detailed context for development assistance. Each document serves a specific purpose and should be referenced when working on related features.

### Core Reference Documents

#### Content and Data Specifications
- **`.claude/CONTENT_CATALOG.md`** - Master catalog of all game content including classes, items/treasures by tier, Chance cards, enemies by tier, and tile types. Contains canonical IDs and JSON schemas plus effect keyword dictionary.
  - *Use when*: Adding new items, enemies, or effects; implementing content loading; validating game balance
  - *Contains*: Complete item/enemy definitions, tier distributions, effect templates

#### Code Architecture and Types
- **`.claude/TS_TYPES_AND_INTERFACES.md`** - Source of truth for TypeScript domain models and engine API including GameState, PlayerState, Tile/Board structures, Item/Enemy models, Combat/Duel state, events, selectors, and invariants.
  - *Use when*: Writing any game logic code; implementing state management; creating API contracts
  - *Contains*: Complete TypeScript interfaces, state shape definitions, validation rules

#### Game Mechanics Implementation
- **`.claude/COMBAT_AND_DUELS.md`** - Detailed combat specification for PvE and PvP including round flow, modifier stacking, class passives, multi-enemy targeting, retreat/defeat outcomes, loot tables, and timing edge cases.
  - *Use when*: Implementing combat systems; debugging fight mechanics; balancing combat
  - *Contains*: Combat algorithms, damage calculations, special cases, loot drop tables

- **`.claude/TURN_AND_PHASE_MACHINE.md`** - Complete turn/phase state machine with allowed actions per phase, entry/exit guards, endTurn clearing logic, and pending-tile resolution ordering.
  - *Use when*: Implementing turn management; handling phase transitions; debugging turn flow
  - *Contains*: State machine diagrams, phase transition rules, action validation

#### System Design and Integration
- **`.claude/ACTIONS_EVENTS_AND_LOGGING.md`** - Canonical list of client actions, engine-emitted events, and log templates with payload shapes, authorization rules, and ordering/idempotency requirements.
  - *Use when*: Implementing user actions; creating event handlers; building action log system
  - *Contains*: Action/event schemas, authorization matrix, logging templates

- **`.claude/RNG_AND_SHUFFLING.md`** - Randomness policy covering dice rolls, deck shuffling, weighted picks, audit logging, deterministic seeding, and replay/test hooks.
  - *Use when*: Implementing dice systems; shuffling decks; creating reproducible tests
  - *Contains*: RNG algorithms, seeding strategies, audit trail requirements

#### Game World and Movement
- **`.claude/BOARD_AND_MOVEMENT_SPEC.md`** - Board JSON schema and movement rules including branching logic, path-history stack management, backward traversal when history is empty, pass-over triggers, tie-breaking, and Lamp item timing.
  - *Use when*: Implementing board navigation; handling shortcuts; managing movement history
  - *Contains*: Board graph structure, pathfinding algorithms, movement edge cases

- **`.claude/ITEMS_INVENTORY_AND_TIMING.md`** - Equipment and inventory rules covering slots and capacities, swap windows, drop/pickup policy, play/interrupt timings, Sanctuary/trap restrictions, and per-item special rulings.
  - *Use when*: Implementing inventory system; handling item interactions; managing equipment swaps
  - *Contains*: Inventory slot definitions, timing rules, item interaction matrices

#### User Interface and Experience
- **`.claude/UI_COMPONENT_CONTRACT.md`** - UI component catalog and prop contracts covering all screens, data inputs, user actions mapped to engine actions, visible vs hidden information display, and accessibility states.
  - *Use when*: Building UI components; implementing user interactions; ensuring consistent UX
  - *Contains*: Component specifications, prop interfaces, accessibility requirements

#### Data and Networking
- **`.claude/NETWORKING_AND_DB_SCHEMA.md`** - Firestore document shapes and sync protocol including rooms/games schemas, indexes, optimistic concurrency handling, versioning/migrations, and read/write security rules by game phase.
  - *Use when*: Implementing database operations; setting up Firestore rules; handling real-time sync
  - *Contains*: Database schemas, security rules, sync protocols

#### Quality Assurance
- **`.claude/TEST_PLAN_AND_FIXTURES.md`** - Acceptance tests and fixtures with seeded scenarios for movement, combat, items/timing, RNG determinism, Sanctuary/duel rules, and final-tile tie-breaker situations.
  - *Use when*: Writing tests; debugging edge cases; validating game rules implementation
  - *Contains*: Test scenarios, fixture data, validation checklists

## Development Workflow

### When Starting a New Feature
1. Identify the relevant documentation files from the list above
2. Reference the appropriate `.claude/` documents for detailed specifications
3. Use the TypeScript types from `TS_TYPES_AND_INTERFACES.md` as your contract
4. Implement following the patterns in the relevant spec documents
5. Test against scenarios in `TEST_PLAN_AND_FIXTURES.md`

### When Debugging Issues
1. Check the relevant spec document for edge cases and special rules
2. Verify implementation matches the canonical definitions in `CONTENT_CATALOG.md`
3. Ensure state transitions follow `TURN_AND_PHASE_MACHINE.md`
4. Validate data shapes against `NETWORKING_AND_DB_SCHEMA.md`

### When Adding Content
1. Update `CONTENT_CATALOG.md` with new items/enemies/effects
2. Add corresponding TypeScript types to `TS_TYPES_AND_INTERFACES.md`
3. Update relevant mechanic specifications if behavior changes
4. Add test fixtures to `TEST_PLAN_AND_FIXTURES.md`

## Key Implementation Notes

- **State Management**: All game logic runs client-side with Firestore for real-time sync
- **RNG**: Use `crypto.getRandomValues()` for all randomness with audit logging
- **Combat**: Simultaneous attack/defense rolls each round with modifier stacking
- **Movement**: d4 rolls with path history tracking for backward movement
- **Inventory**: Equipment slots (1 Wearable + 2 Holdable) plus Bandolier + Backpack
- **Classes**: 8 unique classes with passive abilities and no duplicates allowed
- **Board**: 68-tile directed graph with 2 shortcut branches (riskier but shorter)

## Quick Reference

- **Turn Structure**: 6 phases from turnStart → manage → preDuel → moveOrSleep → resolveTile → capacity
- **Tile Types**: Enemy (Red), Treasure (Yellow), Chance (Purple), Sanctuary (Green), Empty (Gray)
- **Combat**: Continue until 0 HP or retreat (move back 6 tiles)
- **Victory**: First to Final tile wins (tie-breaker duel if simultaneous)
- **Items**: 3 tiers each for Treasures and Enemies with increasing power/rarity

This documentation system ensures consistent, accurate implementation across all game features. Always reference the appropriate `.claude/` documents when working on related functionality.