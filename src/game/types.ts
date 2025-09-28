// /src/game/types.ts
// Version: 1.0.0

export type UID = string;
export type PlayerId = UID;
export type RoomId = string;
export type GameId = string;

export type InstanceId = string; // e.g., itm_..., eff_..., enemyInst_...
export type NodeId = number; // Board node id (0..14 for board.v1)

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

  // Pending tile resolution (moved during someone else's turn)
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