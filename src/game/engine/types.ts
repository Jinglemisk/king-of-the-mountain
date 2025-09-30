// /src/game/engine/types.ts
// Version: 1.0.0

import type {
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
  | 'startCombat'         // initiate combat with enemies
  | 'rollCombat';         // roll for combat resolution

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

export interface StartCombatAction extends BaseAction<'startCombat'> {
  enemyIds: string[];
}

export interface RollCombatAction extends BaseAction<'rollCombat'> {
  targetEnemyId?: string;
}

export type Action =
  | StartGameAction
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
  | PickUpDroppedAction
  | StartCombatAction
  | RollCombatAction;

// Type alias for compatibility with networking layer
export type GameAction = Action;

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
  | 'ChanceCardResolved'
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
  reason: string;
  action: Action;

  constructor(reason: string, action: Action) {
    super(reason);
    this.reason = reason;
    this.action = action;
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