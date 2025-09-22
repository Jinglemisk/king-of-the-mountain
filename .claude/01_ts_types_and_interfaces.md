Title: TS_TYPES_AND_INTERFACES.md
Version: 1.0.0 (schema version for engine v1 content)

Purpose
- Single source of truth for TypeScript domain models and the narrow engine API surface.
- Used by engine, UI, and networking code to stay consistent.

Conventions and naming
- Canonical IDs (stable across versions; used as keys and for persistence):
  - Classes: class.scout.v1, class.hunter.v1, class.raider.v1, class.guardian.v1, class.duelist.v1, class.alchemist.v1, class.porter.v1, class.monk.v1
  - Items: item.dagger.v1, item.woodenShield.v1, item.robe.v1, etc.
  - Chance cards: chance.exhaustion.v1, chance.caveIn.v1, etc.
  - Enemy definitions: enemy.goblin.v1, enemy.orc.v1, etc.
  - Tile IDs: integer NodeId (0–67 on board v1). Board id: board.v1
- IDs are lowercase camel after prefix; version suffix is required (.v1).
- Timestamps are milliseconds (number).
- Numeric dice:
  - d4: 1–4 inclusive
  - d6: 1–6 inclusive
- Determinism: all randomness flows through RNG helpers with audit entries.

Paste into /src/game/types.ts (shared types)
```ts
// /src/game/types.ts
// Version: 1.0.0

export type UID = string;
export type PlayerId = UID;
export type RoomId = string;
export type GameId = string;

export type InstanceId = string; // e.g., itm_..., eff_..., enemyInst_...
export type NodeId = number; // Board node id (0..67 for board.v1)

export type DieType = 'd4' | 'd6';

export type TileType =
  | 'start'
  | 'final'
  | 'enemy'
  | 'treasure'
  | 'chance'
  | 'sanctuary'
  | 'empty';

export type Tier = 1 | 2 | 3;

export type ClassId =
  | 'class.scout.v1'
  | 'class.hunter.v1'
  | 'class.raider.v1'
  | 'class.guardian.v1'
  | 'class.duelist.v1'
  | 'class.alchemist.v1'
  | 'class.porter.v1'
  | 'class.monk.v1';

export type ItemTier = Tier;
export type EnemyTier = Tier;
export type TreasureTier = Tier;

export type ItemCategory = 'wearable' | 'holdable' | 'drinkable' | 'small';

// Game phases as specified in GDD
export type GamePhase =
  | 'turnStart'
  | 'manage'
  | 'preDuel'
  | 'moveOrSleep'
  | 'resolveTile'
  | 'combat' // PvE fight
  | 'duel'   // PvP duel
  | 'postCombat'
  | 'capacity'
  | 'endTurn'
  | 'finalTieBreaker'; // temporary bracket mode

// Board v1
export interface BoardNode {
  id: NodeId;
  type: TileType;
  tier?: Tier;         // for enemy/treasure tiles
  neighbors: NodeId[]; // forward edges
}

export interface BoardGraph {
  id: 'board.v1';
  nodes: ReadonlyArray<BoardNode>;
  // Optional: precomputed reverse adjacency to support backward traversal
  reverseAdj?: ReadonlyMap<NodeId, ReadonlyArray<NodeId>>;
}

export interface ClassStateFlags {
  // Duelist: per-duel reroll control is in DuelState, not here
  monkCancelUsed?: boolean; // once per game, true after use
}

export interface PlayerPublicInfo {
  uid: PlayerId;
  nickname: string;
  seat: number; // 0..5 in turn order
  classId?: ClassId;
}

export interface PlayerVisibility {
  // Visible to all
  equipped: {
    wearable?: ItemInstancePublic;
    holdables: ItemInstancePublic[]; // length <= 2
  };
  // Hidden inventory summarized as counts only (UI convenience)
  inventoryCounts: {
    bandolier: number;
    backpack: number;
  };
}

export interface MovementHistory {
  // Path taken during the active turn (forward traversal)
  // Used to resolve backward moves by popping values
  forwardThisTurn: NodeId[];
  // The node id you came from most recently (for reverse tie-breaking)
  lastFrom?: NodeId;
}

export interface PlayerState {
  uid: PlayerId;
  seat: number;
  nickname: string;

  classId: ClassId;
  classFlags: ClassStateFlags;

  position: NodeId;
  hp: number;
  maxHp: number;     // default 5; can be modified by items/effects
  alive: boolean;    // false only if at 0 HP in duel; still occupies tile but cannot act

  // Inventory and equipment
  equipped: {
    wearable?: ItemInstance;          // max 1
    holdables: ItemInstance[];        // max 2
  };
  inventory: {
    bandolier: ItemInstance[];        // default max 1; Alchemist +1
    backpack: ItemInstance[];         // default max 1; Porter +1
  };

  // Flags / statuses
  mustSleepNextTurn?: boolean;        // from losing a PvE fight
  skipNextTurn?: boolean;             // from Chance
  invisibleUntilTs?: number;          // from Fairy Dust
  wardstones?: number;                // stackable prevention charges (from Wardstone)

  // Pending tile resolution (moved during someone else’s turn)
  pendingTileId?: NodeId;

  // Held face-down effects from Chance
  heldEffects: HeldEffectInstance[];

  // Per-turn resettable data
  movementHistory: MovementHistory;
  perTurn: {
    usedLampThisTurn?: boolean; // track if Lamp was used; it may be used each time condition occurs; this flag is informational
    attackBonusThisTurn?: number;  // from potions or effects
    defenseBonusThisTurn?: number; // from potions or effects
  };
}

// Item definitions and instances

export interface ItemDef {
  id: string;            // canonical id e.g., 'item.dagger.v1'
  name: string;
  tier: ItemTier;
  category: ItemCategory;
  // Static modifiers when equipped (for wearables/holdables)
  equipModifiers?: {
    attack?: number;       // additive to single die (GDD)
    defense?: number;
    movement?: number;     // e.g., Velvet Cloak +1, Royal Aegis -1
    attackVsCreatures?: number; // e.g., Boogey-Bane
    defenseVsCreatures?: number;
  };
  // Rules/effects keyed by effect dictionary (see CONTENT_CATALOG)
  effects?: EffectRef[];
  public?: boolean; // true if visible always when possessed (equipped items are public regardless)
}

export interface ItemInstance {
  instanceId: InstanceId;
  defId: string;
  revealed?: boolean; // for hidden inventory reveals (UI aid)
}

export interface ItemInstancePublic {
  instanceId: InstanceId;
  defId: string; // public sees the card id when equipped
}

// Chance cards (draw-and-resolve or keep)
export interface ChanceCardDef {
  id: string;   // canonical id e.g., 'chance.exhaustion.v1'
  name: string;
  // Resolvable effect immediately or keepable
  kind: 'immediate' | 'keep';
  effects: EffectRef[];
}

export interface HeldEffectInstance {
  instanceId: InstanceId;
  defId: string;            // chance.* id
  revealed?: boolean;       // usually false; becomes true when played
}

// Enemies
export interface EnemyDef {
  id: string;       // canonical id e.g., 'enemy.goblin.v1'
  name: string;
  tier: EnemyTier;
  hp: number;
  attackBonus: number;
  defenseBonus: number;
  effects?: EffectRef[]; // e.g., special rules (if any)
}

export interface EnemyInstance {
  instanceId: InstanceId;
  defId: string; // enemy.* id
  currentHp: number;
}

// Effects (dictionary keys and param bag)
export type EffectKey = string; // concrete union generated in CONTENT_CATALOG; placeholder here

export interface EffectRef {
  key: EffectKey;       // e.g., 'effect.trap.place', 'effect.lamp.stepBackBeforeResolve'
  params?: any;         // schema defined per key in CONTENT_CATALOG
}

// Deck states (runtime)
export interface DeckState {
  drawPile: string[];    // array of canonical ids
  discardPile: string[];
}

export interface EnemyDecksState {
  t1: DeckState;
  t2: DeckState;
  t3: DeckState;
}

export interface TreasureDecksState {
  t1: DeckState;
  t2: DeckState;
  t3: DeckState;
}

export interface ChanceDecksState {
  main: DeckState;
}

// Tile runtime state (dynamic traps/ambush/enemies on tiles)
export interface TrapOnTile {
  placedBy: PlayerId;
  itemDefId: string; // item.trap.v1 (or effect from Chance)
  visible: boolean;  // traps are visible
}

export interface AmbushOnTile {
  placedBy: PlayerId;
  sourceDefId: string; // chance.ambushOpportunity.v1
}

export interface TileRuntimeState {
  enemies?: EnemyInstance[];     // queued enemies to fight on entering
  trap?: TrapOnTile;             // single trap per tile for MVP
  ambush?: AmbushOnTile;         // single ambush holder per tile
}

export type TileStateMap = Record<string, TileRuntimeState>; // key = NodeId string

// RNG state (shared-visible parts)
export interface RngAuditEntry {
  id: string;             // audit id
  ts: number;
  actor?: PlayerId;       // who triggered (if applicable)
  kind: 'd4' | 'd6' | 'shuffle' | 'weightedPick';
  requestId?: string;     // tie to an action
  details?: any;          // see engine types for exact details
}

export interface RNGState {
  // For dev/testing: optional fixed seed; production uses crypto.getRandomValues
  seed?: string;
  counter: number;        // entropy consumption counter
  audit: RngAuditEntry[]; // append-only
}

// Combat and duel states (public portions)
export type CombatType = 'fight' | 'duel';

export interface CombatRoundSummary {
  round: number;
  rolls: {
    attackerAttack: number;
    defenderDefense: number;
    defenderAttack?: number; // for duel or fight where enemy also strikes
    attackerDefense?: number;
  };
  damage: {
    attackerLost: number;
    defenderLost: number;
  };
}

export interface FightPublicState {
  type: 'fight';
  tileId: NodeId;
  playerId: PlayerId;           // the player fighting
  enemyQueue: EnemyInstance[];  // remaining enemies (public)
  currentRound: number;
}

export interface DuelPublicState {
  type: 'duel';
  a: PlayerId;
  b: PlayerId;
  currentRound: number;
}

export type CombatPublicState = FightPublicState | DuelPublicState | null;

// Game status and turn order
export interface TurnOrder {
  seats: PlayerId[];   // ordered uids in seat order
  currentIdx: number;  // 0..seats.length-1
}

// Log entry (public)
export interface LogEntry {
  id: string;
  ts: number;
  actor?: PlayerId;
  type: string;        // event name or custom
  payload?: any;
  message?: string;    // formatted
}

// GameState (shared)
export interface GameState {
  id: GameId;
  version: number;           // increments per authoritative state mutation
  schemaVersion: '1.0.0';    // this document version
  status: 'lobby' | 'playing' | 'ended';
  phase: GamePhase;
  currentPlayer: PlayerId | null;

  board: {
    id: BoardGraph['id'];
    graph: BoardGraph;
    playerPositions: Record<PlayerId, NodeId>;
  };

  players: Record<PlayerId, PlayerState>;
  order: TurnOrder;

  decks: {
    treasure: TreasureDecksState;
    chance: ChanceDecksState;
    enemies: EnemyDecksState;
  };

  tileState: TileStateMap;

  combat: CombatPublicState;     // present when in combat or duel
  finalTieBreaker?: {
    uids: PlayerId[];            // contestants in seat order
    bracketLog?: string[];       // ids of duel logs
  };

  rng: RNGState;

  logVersion: number;            // last log sync version (UI convenience)
}
```

Paste into /src/game/engine/types.ts (engine-internal types and API)
```ts
// /src/game/engine/types.ts
// Version: 1.0.0

import {
  UID, PlayerId, GameId, NodeId, ItemInstance, ItemInstancePublic,
  ClassId, BoardGraph, PlayerState as SharedPlayerState, GamePhase,
  GameState as SharedGameState, TileStateMap, DeckState, TreasureDecksState,
  EnemyDecksState, ChanceDecksState, RNGState, RngAuditEntry, DieType, Tier,
  EnemyInstance, EffectRef, CombatPublicState, TurnOrder, LogEntry
} from '../types';

// Narrow internal PlayerState (alias to shared, but engine may use helpers)
export type PlayerState = SharedPlayerState;

// Internal combat/duel expanded state
export interface AttackDefenseMods {
  // Resolved modifiers for this entity at this moment (items, class, potions)
  attack: number;
  defense: number;
  movement?: number;
  attackVsCreatures?: number;
  defenseVsCreatures?: number;
}

export interface DiceRoll {
  id: string;         // audit id
  die: DieType;
  value: number;      // 1..N
  actor?: PlayerId;
}

export interface CombatActorSnapshot {
  playerId?: PlayerId;     // present for player side
  enemy?: EnemyInstance;   // present for enemy side
  mods: AttackDefenseMods; // computed for this round
}

export interface FightState {
  type: 'fight';
  tileId: NodeId;
  playerId: PlayerId;
  enemyQueue: EnemyInstance[];         // pending enemies on tile
  currentRound: number;
  roundLog: InternalCombatRoundLog[];
  // Retreat path snapshot (movement history) stored on entry to combat
  retreatHistorySnapshot: NodeId[];
}

export interface DuelState {
  type: 'duel';
  a: PlayerId;
  b: PlayerId;
  currentRound: number;
  roundLog: InternalCombatRoundLog[];
  // Duelist passive: track per-duel defense reroll usage by player
  defenseRerollUsed: Record<PlayerId, boolean>;
  offeredBy: PlayerId; // who initiated
}

export type InternalCombatState = FightState | DuelState;

export interface InternalCombatRoundLog {
  round: number;
  attacker: CombatActorSnapshot;
  defender: CombatActorSnapshot;
  rolls: {
    attackerAttack: DiceRoll;
    defenderDefense: DiceRoll;
    defenderAttack?: DiceRoll; // for simultaneous
    attackerDefense?: DiceRoll;
  };
  damage: {
    attackerLost: number;
    defenderLost: number;
  };
  notes?: string[];
}

// Engine-private RNG (adds helpers and deterministic audit contract)
export interface RNG {
  state: RNGState;
  // Roll a die and record audit
  roll(die: DieType, actor?: PlayerId, requestId?: string): DiceRoll;
  // Shuffle array in-place (returns new array copy), auditing the permutation
  shuffle<T>(arr: ReadonlyArray<T>, requestId?: string): T[];
  // Weighted pick; weights[i] >= 0
  weightedPick<T>(items: ReadonlyArray<T>, weights: ReadonlyArray<number>, requestId?: string): { index: number; item: T };
}

export interface EngineContext {
  now(): number;
  rng: RNG;
  // Hooks for logging/events
  emit: (event: DomainEvent) => void;
}

// Actions (client commands). Full spec in ACTIONS_EVENTS_AND_LOGGING; kept here for typing.
export type ActionType =
  | 'startGame'
  | 'selectClass'
  | 'offerDuel'
  | 'acceptDuel'
  | 'declineDuel'
  | 'useItem'
  | 'equipItem'
  | 'unequipItem'
  | 'swapEquipment'
  | 'chooseBranch'        // at split nodes
  | 'chooseSleep'         // choose sleep in moveOrSleep
  | 'rollMovement'        // trigger d4 roll
  | 'resolvePendingTile'  // explicit transition from turnStart
  | 'retreat'
  | 'endTurn'
  | 'pickUpDropped'       // step 6 pickup on shared tile
  | 'dropItem'            // capacity enforcement/voluntary drop
  | 'playHeldEffect'      // Ambush/Instinct etc.
  | 'consumePotion'       // alias of useItem for drinkable
  | 'acknowledgeLog';     // UI ack

export interface BaseAction<T extends ActionType = ActionType> {
  id: string;
  ts: number;
  type: T;
  uid: PlayerId;      // actor
  // requestId ties to RNG audit entries if any
  requestId?: string;
}

export interface StartGameAction extends BaseAction<'startGame'> {
  // No payload (owner-only, after lobby ready)
}

export interface SelectClassAction extends BaseAction<'selectClass'> {
  classId: ClassId;
}

export interface OfferDuelAction extends BaseAction<'offerDuel'> {
  targetUid: PlayerId;
}

export interface AcceptDuelAction extends BaseAction<'acceptDuel'> {}
export interface DeclineDuelAction extends BaseAction<'declineDuel'> {}

export interface ChooseBranchAction extends BaseAction<'chooseBranch'> {
  from: NodeId;
  to: NodeId;
}

export interface ChooseSleepAction extends BaseAction<'chooseSleep'> {}

export interface RollMovementAction extends BaseAction<'rollMovement'> {
  // UI may pass desired path branching decision ahead of time; engine validates after roll
  preferredPath?: NodeId[]; // optional hint (engine does not trust)
}

export interface ResolvePendingTileAction extends BaseAction<'resolvePendingTile'> {}

export interface RetreatAction extends BaseAction<'retreat'> {}

export interface EndTurnAction extends BaseAction<'endTurn'> {}

export interface EquipItemAction extends BaseAction<'equipItem'> {
  instanceId: string;
}

export interface UnequipItemAction extends BaseAction<'unequipItem'> {
  instanceId: string;
}

export interface SwapEquipmentAction extends BaseAction<'swapEquipment'> {
  // Swaps or reorders holdables; may also move between slots/inventory
  moves: Array<{
    instanceId: string;
    to: { area: 'equipped.wearable' | 'equipped.holdables' | 'inventory.bandolier' | 'inventory.backpack'; index?: number };
  }>;
}

export interface UseItemAction extends BaseAction<'useItem'> {
  instanceId: string;
}

export interface ConsumePotionAction extends BaseAction<'consumePotion'> {
  instanceId: string;
}

export interface PlayHeldEffectAction extends BaseAction<'playHeldEffect'> {
  instanceId: string; // held effect id
}

export interface DropItemAction extends BaseAction<'dropItem'> {
  instanceId: string;
}

export interface PickUpDroppedAction extends BaseAction<'pickUpDropped'> {
  instanceIds: string[]; // allowed if on same tile
}

export type Action =
  | StartGameAction
  | SelectClassAction
  | OfferDuelAction
  | AcceptDuelAction
  | DeclineDuelAction
  | ChooseBranchAction
  | ChooseSleepAction
  | RollMovementAction
  | ResolvePendingTileAction
  | RetreatAction
  | EndTurnAction
  | EquipItemAction
  | UnequipItemAction
  | SwapEquipmentAction
  | UseItemAction
  | ConsumePotionAction
  | PlayHeldEffectAction
  | DropItemAction
  | PickUpDroppedAction;

// Domain events (engine-emitted). Full payload spec in ACTIONS_EVENTS_AND_LOGGING.
export type DomainEventType =
  | 'GameStarted'
  | 'TurnStarted'
  | 'PhaseChanged'
  | 'DiceRolled'
  | 'Moved'
  | 'TileEntered'
  | 'EnemySpawned'
  | 'CombatStarted'
  | 'CombatRoundResolved'
  | 'DamageApplied'
  | 'EntityDefeated'
  | 'RetreatExecuted'
  | 'FightEnded'
  | 'DuelOffered'
  | 'DuelAccepted'
  | 'DuelDeclined'
  | 'DuelCancelled'   // Monk or Smoke Bomb
  | 'DuelStarted'
  | 'DuelEnded'
  | 'TreasureDrawn'
  | 'ItemGained'
  | 'ItemEquipped'
  | 'ItemUnequipped'
  | 'ItemUsed'
  | 'ItemDropped'
  | 'CapacityEnforced'
  | 'DeckShuffled'
  | 'RNGAdvanced'
  | 'FinalTieBreakerStarted'
  | 'FinalTieBreakerEnded'
  | 'GameEnded';

export interface DomainEvent<T extends DomainEventType = DomainEventType> {
  id: string;
  ts: number;
  type: T;
  actor?: PlayerId;
  payload?: any;
}

// Internal engine state extends shared with internal combat and guards
export interface EngineState extends Omit<SharedGameState, 'combat'> {
  combatInternal: InternalCombatState | null; // replaces public combat view
}

// Reducer result
export interface EngineUpdate {
  state: EngineState;
  events: DomainEvent[];
  logs?: LogEntry[]; // formatted (UI-friendly)
}

// Validation errors
export class InvalidActionError extends Error {
  constructor(public reason: string, public action: Action) {
    super(reason);
    this.name = 'InvalidActionError';
  }
}

// Command handler signature
export type CommandHandler<A extends Action = Action> = (s: EngineState, a: A, ctx: EngineContext) => EngineUpdate;

// Command registry (by action type)
export type CommandTable = {
  [K in Action['type']]?: CommandHandler<Extract<Action, { type: K }>>;
};

// Selectors (pure helpers)
export interface Selectors {
  currentPlayerId(s: EngineState): PlayerId | null;
  isPlayersTurn(s: EngineState, uid: PlayerId): boolean;
  legalActionsFor(s: EngineState, uid: PlayerId): Action['type'][];
  playerById(s: EngineState, uid: PlayerId): PlayerState;
  tileRuntime(s: EngineState, nodeId: NodeId): TileStateMap[string] | undefined;
  movementCapacity(s: EngineState, uid: PlayerId): {
    holdableSlots: number; // 2
    wearableSlots: number; // 1
    bandolier: number;     // 1 (Alchemist +1)
    backpack: number;      // 1 (Porter +1)
  };
}

// Invariants and guards (declare for enforcement)
export interface Invariants {
  // Hard caps
  readonly MAX_HP_BASE: 5;
  readonly EQUIP_WEARABLE_MAX: 1;
  readonly EQUIP_HOLDABLE_MAX: 2;
  readonly BANDOLIER_BASE_MAX: 1;
  readonly BACKPACK_BASE_MAX: 1;
  // Dice domains
  readonly D4_MIN: 1; readonly D4_MAX: 4;
  readonly D6_MIN: 1; readonly D6_MAX: 6;
}

// Engine API surface
export interface EngineApi {
  // Apply a client action with full validation, emit events and logs.
  applyAction(state: EngineState, action: Action, ctx: EngineContext): EngineUpdate;

  // Progress phase (internal helper; usually driven via actions + reducer)
  stepPhase(state: EngineState, ctx: EngineContext): EngineUpdate;

  // RNG helper factory (to implement RNGState policy)
  createRng(state: RNGState): RNG;

  // Recompute public combat view from internal
  toPublicState(state: EngineState): SharedGameState;

  // Selectors exposed to UI for convenience (pure)
  selectors: Selectors;

  // Invariants
  INV: Invariants;
}
```

Engine invariants and rules (enforced by reducers/validators)
- HP
  - 0 <= hp <= maxHp.
  - maxHp >= 1 (default 5; may be modified by items but should remain reasonable; UI clamps display).
  - At hp 0 after duel: alive=false, position unchanged; must Sleep next turn to recover; can be looted by winner (outside this doc, see Combat spec).
- Equipment and inventory capacities
  - Equipped: wearable <= 1; holdables length <= 2.
  - Inventory: bandolier holds only drinkable or small; capacity = 1 (+1 if class.alchemist.v1).
  - Inventory: backpack holds only wearable or holdable; capacity = 1 (+1 if class.porter.v1).
  - Equipped items are public; inventory hidden.
  - Swapping is only allowed in phase 'manage' and immediately upon drawing/looting Treasure (engine can grant a “swap window” guard token).
  - If over capacity at phase 'capacity' end, must drop to capacity (items go to bottom of respective treasure tier unless another player on tile picks up immediately).
- Movement and board
  - Movement always uses d4 through RNG.
  - Upon forward movement, append visited node IDs to movementHistory.forwardThisTurn.
  - Backward movement pops from movementHistory; if empty, use reverse graph (tie-break: prefer lastFrom if set; else lowest NodeId).
  - Sanctuary rules:
    - No duels initiated on sanctuary.
    - Traps/Ambush cannot be placed on sanctuary.
    - Players cannot be forced out of sanctuary by others; self-initiated moves allowed.
- Tile resolution
  - On someone else’s turn if you are moved, you do not resolve until your Step 1 'turnStart' with 'pendingTileId' set.
  - You only resolve the tile you stop on, except pass-over triggers explicitly defined (e.g., Ambush).
- Combat and duels
  - Round structure: simultaneous attack/defense comparisons (see Combat doc).
  - Retreat allowed any time: move 6 backward along movement history (or reverse graph) and end turn; no extra penalty.
  - On losing PvE: move back 1 tile and must Sleep next turn.
  - Lamp timing: if end-of-move tile would have player/enemy, Lamp can step back 1 before resolve.
  - Final tile tie: simultaneous arrivals run a seat-order bracket; winner ends the game.
- RNG determinism
  - All dice and shuffles go through EngineApi.createRng; every die roll and shuffle adds an RngAuditEntry.
  - Entropy consumption order is stable: movement roll before branch resolution; enemy composition before loot; round rolls attacker attack, defender defense, defender attack, attacker defense; strictly documented in RNG doc.

Notes for implementers
- This file intentionally avoids hardcoding the effect dictionary; those concrete keys and params are generated from docs/CONTENT_CATALOG.md. Here, EffectKey is a string; in codegen, replace it with a union of literal keys and typed param bags.
- The Actions and DomainEvents here are aligned with docs/ACTIONS_EVENTS_AND_LOGGING.md. That doc should be the canonical payload spec; if a discrepancy arises, defer to that doc and bump schemaVersion here.
- Public vs internal combat state:
  - Shared GameState exposes only a summarized CombatPublicState for UI safety.
  - EngineState keeps InternalCombatState including per-round rolls and modifier snapshots; use EngineApi.toPublicState to produce the shared view.
- Versioning and migrations:
  - schemaVersion pinned to '1.0.0' for engine v1. Any breaking change to types must bump this and include a migration step in NETWORKING_AND_DB_SCHEMA.md.
  - GameState.version increments on every authoritative state mutation, to help clients reconcile optimistic updates.
