import type { Timestamp } from 'firebase/firestore';
import type { GameState, PlayerState as EnginePlayerState } from '../types';

export type RoomStatus = "lobby" | "playing" | "ended";
export type GameStatus = "setup" | "playing" | "ended";
export type GamePhase =
  | "turnStart"
  | "manage"
  | "preDuel"
  | "moveOrSleep"
  | "resolveTile"
  | "combat"
  | "duel"
  | "postCombat"
  | "capacity"
  | "endTurn"
  | "finalBracket";

export type CombatType = "pve" | "pvp" | "none";

export interface Seat {
  seatIndex: number; // 0..5
  uid: string | null; // null means seat is empty
  nickname?: string | null;
  classId?: string | null; // e.g., class.scout.v1
  ready?: boolean; // default false
  lastSeen?: number; // timestamp in ms for connection tracking
  disconnectedAt?: number | null; // timestamp when disconnected
  kicked?: boolean; // owner-set
}

export interface RoomDoc {
  code: string; // redundant to doc id, uppercase
  ownerUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: RoomStatus;
  maxPlayers: number; // 2..6
  seats: Seat[]; // fixed-length array of 6 seat objects
  minReadyToStart: number; // default 2
  gameId?: string | null;
  expiresAt?: Timestamp | null; // TTL cleanup
}

export type CardId = string; // e.g., "item.dagger.v1"
export type NodeId = number; // board node id (0-67)
export type PlayerId = string; // Firebase auth uid
export type InstanceId = string; // unique instance identifier

export interface RngAuditEntry {
  id: string;
  ts: number; // milliseconds
  actorUid?: PlayerId | null;
  kind: "d4" | "d6" | "shuffle" | "weightedPick";
  source: string; // e.g., "move", "attack", "defense"
  value: number | string | number[];
  seedStep?: number; // when using dev seeded RNG
}

export interface PlayerInventory {
  equipped: {
    wearable?: CardId | null;
    holdableA?: CardId | null;
    holdableB?: CardId | null;
  };
  bandolier: CardId[];
  backpack: CardId[];
}

export interface NetworkPlayerState {
  uid: PlayerId;
  nickname: string;
  classId: string;
  hp: number;
  maxHp: number;
  position: NodeId;
  flags: {
    mustSleepNextTurn?: boolean;
    invisibleUntilTs?: number | null;
    wardstones?: number;
    ambushCardId?: CardId | null;
    skipNextTurn?: number;
    monkCancelUsed?: boolean;
  };
  inventory: PlayerInventory;
  movementHistory: NodeId[];
  perTurn: {
    usedLampThisTurn?: boolean;
    attackBonusThisTurn?: number;
    defenseBonusThisTurn?: number;
  };
}

export interface DeckState {
  draw: CardId[];
  discard: CardId[];
}

export interface EnemyInstance {
  instanceId: InstanceId;
  cardId: CardId;
  hp: number;
}

export type TileEnemies = {
  [tileId: string]: EnemyInstance[];
};

export interface TileAttachments {
  traps?: {
    [tileId: string]: {
      byUid: PlayerId;
      cardId: CardId;
      placedAt: number;
      visible: boolean;
    };
  };
  ambushes?: {
    [tileId: string]: {
      byUid: PlayerId;
      cardId: CardId;
      placedAt: number;
    };
  };
}

export interface CombatPvE {
  type: "pve";
  actorUid: PlayerId;
  tileId: NodeId;
  enemyQueue: EnemyInstance[];
  round: number;
  pendingRolls?: {
    attack?: number;
    defense?: number;
    enemies?: { [instanceId: string]: { attack?: number; defense?: number } };
  };
  modifiers?: {
    actorAttackBonus?: number;
    actorDefenseBonus?: number;
  };
}

export interface CombatPvP {
  type: "pvp";
  aUid: PlayerId;
  bUid: PlayerId;
  tileId: NodeId;
  round: number;
  pendingRolls?: {
    aAttack?: number;
    aDefense?: number;
    bAttack?: number;
    bDefense?: number;
  };
  aRerollDefenseAvailable?: boolean;
  bRerollDefenseAvailable?: boolean;
}

export type CombatState = CombatPvE | CombatPvP | null;

export interface FinalTileTie {
  bracketOrder: PlayerId[];
  active: boolean;
}

export interface GameDoc {
  schemaVersion: string;
  version: number;
  status: GameStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: PlayerId;
  startedAt?: Timestamp | null;
  endedAt?: Timestamp | null;

  currentPlayerUid: PlayerId;
  phase: GamePhase;
  turnOrder: PlayerId[];
  turnNumber: number;

  board: {
    id: string;
    positions: { [uid: string]: NodeId };
  };

  players: { [uid: string]: NetworkPlayerState };

  decks: {
    treasureT1: DeckState;
    treasureT2: DeckState;
    treasureT3: DeckState;
    chance: DeckState;
    enemyT1: DeckState;
    enemyT2: DeckState;
    enemyT3: DeckState;
  };

  tileState: {
    enemies: TileEnemies;
    attachments: TileAttachments;
  };

  combat: CombatState;
  finalTileTie?: FinalTileTie | null;

  rngAudit?: RngAuditEntry[] | null;
  analytics?: {
    tilesMoved?: { [uid: string]: number };
    enemiesDefeated?: { [tier: string]: number };
    duelsWon?: { [uid: string]: number };
    duelsLost?: { [uid: string]: number };
    itemsAcquired?: number;
    itemsConsumed?: number;
    totalTurns?: number;
  };
}

export interface LogEntry {
  ts: Timestamp;
  seq?: number;
  actorUid?: PlayerId | null;
  type: string;
  message?: string;
  payload?: any;
  visibility?: "public" | "obfuscated";
}

export interface ChatMessage {
  ts: Timestamp;
  uid: PlayerId;
  nickname: string;
  text: string;
}

export interface ClientAction {
  ts: Timestamp;
  uid: PlayerId;
  type: string;
  payload: any;
  correlatesToSeq?: number;
}