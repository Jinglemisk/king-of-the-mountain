docs/NETWORKING_AND_DB_SCHEMA.md

Purpose
- Define concrete Firestore document shapes, subcollections, indexes, and sync flows for rooms and games
- Specify optimistic concurrency, currentPlayer gating, and reconciliation of stale writes
- Establish versioning and forward-compatible migration strategy
- Provide example snapshots and security rule skeletons aligned to the GDD
- Ensure full consistency with TypeScript types and game phase machine

Scope
- Collections:
  - rooms/{roomId} with lobby lifecycle and seats
  - games/{gameId} with authoritative game state
  - Subcollections for log, chat, actions
- Client-state sync protocol and write discipline
- Deterministic updates and conflict handling
- Schema versioning and migrations
- Indexes and retention/TTL guidance
- Connection status tracking for disconnect handling

Design principles
- Single-writer game state: Only the current player (currentPlayerUid) may update the authoritative game snapshot in games/{gameId}
- Optimistic concurrency: Every state update increments version; writes must carry version preconditions
- Deterministic replays: All RNG outcomes are recorded as events/logs so clients can audit and re-simulate
- Append-only audit: log and actions subcollections provide ordered, tamper-resistant breadcrumbs
- Minimal rules, maximal client checks: Security Rules gate basic invariants; most logic remains in the client engine
- No server: All logic runs on clients. We rely on Firestore transactions/batches and rules to gate writes
- Timestamp consistency: Use number (milliseconds) for game engine, serverTimestamp for Firestore metadata

Conventions
- IDs
  - roomId: 6-char uppercase alphanumeric code (e.g., "AB1C2D"). Make this the rooms document ID to guarantee uniqueness and enable direct joins by code
  - gameId: auto id (or same as roomId; recommend distinct for potential rematches)
  - playerId/uid: Firebase anonymous auth uid
- Timestamps:
  - Game engine uses number (milliseconds since epoch) for all game logic
  - Firestore metadata fields use serverTimestamp for createdAt/updatedAt
- Enumerations: Use exact strings from TS_TYPES_AND_INTERFACES.md
- Schema versioning: schemaVersion semver string, e.g., "1.0.0"
- Version counter: version is an integer that increments on every successful game state write

Collections and document shapes

1) rooms/{roomId}
- Purpose: Lobby state and seat reservation until a game starts. Rooms auto-delete 2h after empty

Recommended TypeScript types

type RoomStatus = "lobby" | "playing" | "ended"

type Seat = {
  seatIndex: number // 0..5
  uid: string | null // null means seat is empty
  nickname?: string | null
  classId?: string | null // e.g., class.scout.v1 (optional until locked)
  ready?: boolean // default false
  lastSeen?: number // timestamp in ms for connection tracking
  disconnectedAt?: number | null // timestamp when disconnected
  kicked?: boolean // owner-set
}

type RoomDoc = {
  // Identity and ownership
  code: string // redundant to doc id, uppercase
  ownerUid: string
  createdAt: FirebaseFirestore.Timestamp
  updatedAt: FirebaseFirestore.Timestamp
  status: RoomStatus
  maxPlayers: number // 2..6

  // Seating
  seats: Seat[] // fixed-length array of 6 seat objects
  minReadyToStart: number // default 2

  // Game linkage
  gameId?: string | null

  // TTL cleanup
  // Set when room becomes empty; clear when someone sits. Firestore TTL must be configured on this field
  expiresAt?: FirebaseFirestore.Timestamp | null
}

Notes
- Doc id == code ensures uniqueness without a server
- seats is a fixed-length array of six entries so indexing is deterministic. Empty slots have uid null
- lastSeen tracks connection health; update every 30s while connected
- When all seats are empty, clients set expiresAt = now+2h. With Firestore TTL configured on expiresAt, the room will be auto-deleted

Example room snapshot

{
  "code": "AB1C2D",
  "ownerUid": "u_owner",
  "createdAt": "2025-01-01T12:00:00.000Z",
  "updatedAt": "2025-01-01T12:05:03.500Z",
  "status": "lobby",
  "maxPlayers": 6,
  "minReadyToStart": 2,
  "seats": [
    {
      "seatIndex": 0,
      "uid": "u1",
      "nickname": "Scouty",
      "classId": "class.scout.v1",
      "ready": true,
      "lastSeen": 1735728303500,
      "disconnectedAt": null
    },
    {
      "seatIndex": 1,
      "uid": "u2",
      "nickname": "Guard",
      "classId": null,
      "ready": false,
      "lastSeen": 1735728303000,
      "disconnectedAt": null
    },
    { "seatIndex": 2, "uid": null },
    { "seatIndex": 3, "uid": null },
    { "seatIndex": 4, "uid": null },
    { "seatIndex": 5, "uid": null }
  ],
  "gameId": null,
  "expiresAt": null
}

2) games/{gameId}
- Purpose: Authoritative snapshot of a single match, including all state and clocks. Only currentPlayerUid may mutate

Enums (from TS_TYPES_AND_INTERFACES.md and TURN_AND_PHASE_MACHINE.md)

type GameStatus = "setup" | "playing" | "ended"
type GamePhase =
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
  | "finalBracket" // tie-breaker state

type CombatType = "pve" | "pvp" | "none"

Core shared types (aligned with TS_TYPES_AND_INTERFACES.md)

type CardId = string // e.g., "item.dagger.v1", "chance.exhaustion.v1", "enemy.goblin.v1"
type NodeId = number // board node id (0-67 for board.v1)
type PlayerId = string // Firebase auth uid
type InstanceId = string // unique instance identifier

// RNG audit entry
type RngAuditEntry = {
  id: string // unique within game
  ts: number // milliseconds
  actorUid?: PlayerId | null
  kind: "d4" | "d6" | "shuffle" | "weightedPick"
  source: string // e.g., "move", "attack", "defense", "enemyComposition", "lootDrop"
  value: number | string | number[] // roll or shuffle order or chosen index
  seedStep?: number // when using dev seeded RNG; omit in prod
}

type PlayerInventory = {
  equipped: {
    wearable?: CardId | null
    holdableA?: CardId | null
    holdableB?: CardId | null
  }
  bandolier: CardId[] // capacity varies by class (default 1, Alchemist 2)
  backpack: CardId[] // capacity varies by class (default 1, Porter 2)
}

type PlayerState = {
  uid: PlayerId
  nickname: string
  classId: string // e.g., "class.hunter.v1"
  hp: number
  maxHp: number
  position: NodeId
  flags: {
    mustSleepNextTurn?: boolean // set when losing PvE fight; clear after sleeping
    invisibleUntilTs?: number | null // Fairy Dust (milliseconds)
    wardstones?: number // Wardstone charges (0+)
    ambushCardId?: CardId | null // pending Ambush Opportunity
    skipNextTurn?: number // number of turns to skip
    monkCancelUsed?: boolean // once per game flag
  }
  inventory: PlayerInventory
  // Movement history for the current turn (for backward movement effects)
  movementHistory: NodeId[] // forward tiles visited this turn in order
  perTurn: {
    usedLampThisTurn?: boolean
    attackBonusThisTurn?: number
    defenseBonusThisTurn?: number
  }
}

type DeckState = {
  draw: CardId[] // top of deck is end of array
  discard: CardId[] // top of discard is end of array
}

type EnemyInstance = {
  instanceId: InstanceId
  cardId: CardId // enemy id
  hp: number
}

// Enemies present on tiles (keyed by stringified NodeId for Firestore)
type TileEnemies = {
  [tileId: string]: EnemyInstance[]
}

// Tile attachments (traps/ambushes)
type TileAttachments = {
  traps?: {
    [tileId: string]: {
      byUid: PlayerId
      cardId: CardId // item.trap.t1.v1
      placedAt: number // milliseconds
      visible: boolean // traps are visible
    }
  }
  ambushes?: {
    [tileId: string]: {
      byUid: PlayerId
      cardId: CardId // chance.ambushOpportunity.v1
      placedAt: number // milliseconds
    }
  }
}

type CombatPvE = {
  type: "pve"
  actorUid: PlayerId // player fighting
  tileId: NodeId
  enemyQueue: EnemyInstance[] // remaining enemies to defeat
  round: number
  pendingRolls?: {
    attack?: number
    defense?: number
    enemies?: { [instanceId: string]: { attack?: number; defense?: number } }
  }
  modifiers?: {
    actorAttackBonus?: number
    actorDefenseBonus?: number
  }
}

type CombatPvP = {
  type: "pvp"
  aUid: PlayerId
  bUid: PlayerId
  tileId: NodeId
  round: number
  pendingRolls?: {
    aAttack?: number
    aDefense?: number
    bAttack?: number
    bDefense?: number
  }
  aRerollDefenseAvailable?: boolean // Duelist passive per-duel
  bRerollDefenseAvailable?: boolean // if b is also Duelist
}

type CombatState = CombatPvE | CombatPvP | null

type FinalTileTie = {
  bracketOrder: PlayerId[] // seat order among tied players
  active: boolean
}

Game document

type GameDoc = {
  // meta
  schemaVersion: string // "1.0.0"
  version: number // monotonic, increments on each state write
  status: GameStatus // "setup" | "playing" | "ended"
  createdAt: FirebaseFirestore.Timestamp
  updatedAt: FirebaseFirestore.Timestamp
  createdBy: PlayerId
  startedAt?: FirebaseFirestore.Timestamp | null
  endedAt?: FirebaseFirestore.Timestamp | null

  // turn/phase
  currentPlayerUid: PlayerId
  phase: GamePhase
  turnOrder: PlayerId[] // fixed order for match
  turnNumber: number // starts at 1

  // board
  board: {
    id: string // "board.v1"
    positions: { [uid: string]: NodeId } // redundant to playerStates[].position for quick UI
  }

  // players keyed by uid for faster reads
  players: { [uid: string]: PlayerState }

  // decks by tier
  decks: {
    treasureT1: DeckState
    treasureT2: DeckState
    treasureT3: DeckState
    chance: DeckState
    enemyT1: DeckState
    enemyT2: DeckState
    enemyT3: DeckState
  }

  // tile state
  tileState: {
    enemies: TileEnemies
    attachments: TileAttachments
  }

  // combat/duel
  combat: CombatState

  // final tile tie-breaker
  finalTileTie?: FinalTileTie | null

  // debug/analytics
  rngAudit?: RngAuditEntry[] | null // optional; use log events instead for large matches
  analytics?: {
    tilesMoved?: { [uid: string]: number }
    enemiesDefeated?: { [tier: string]: number }
    duelsWon?: { [uid: string]: number }
    duelsLost?: { [uid: string]: number }
    itemsAcquired?: number
    itemsConsumed?: number
    totalTurns?: number
  }
}

Example games/{gameId} snapshot (abridged)

{
  "schemaVersion": "1.0.0",
  "version": 42,
  "status": "playing",
  "createdAt": "2025-01-01T12:06:00Z",
  "updatedAt": "2025-01-01T12:20:30Z",
  "createdBy": "u_owner",
  "startedAt": "2025-01-01T12:06:05Z",
  "currentPlayerUid": "u1",
  "phase": "moveOrSleep",
  "turnOrder": ["u1", "u2"],
  "turnNumber": 7,
  "board": {
    "id": "board.v1",
    "positions": { "u1": 22, "u2": 20 }
  },
  "players": {
    "u1": {
      "uid": "u1",
      "nickname": "Scouty",
      "classId": "class.scout.v1",
      "hp": 5,
      "maxHp": 5,
      "position": 22,
      "flags": { "mustSleepNextTurn": false },
      "inventory": {
        "equipped": {
          "wearable": null,
          "holdableA": "item.dagger.v1",
          "holdableB": null
        },
        "bandolier": ["item.luckCharm.v1"],
        "backpack": []
      },
      "movementHistory": [19, 20, 21, 22],
      "perTurn": {}
    },
    "u2": {
      "uid": "u2",
      "nickname": "Guard",
      "classId": "class.guardian.v1",
      "hp": 4,
      "maxHp": 5,
      "position": 20,
      "flags": {},
      "inventory": {
        "equipped": {
          "wearable": "item.robe.v1",
          "holdableA": "item.woodenShield.v1",
          "holdableB": null
        },
        "bandolier": [],
        "backpack": []
      },
      "movementHistory": [],
      "perTurn": {}
    }
  },
  "decks": {
    "treasureT1": {
      "draw": ["item.woodenShield.v1", "item.trap.v1"],
      "discard": []
    },
    "treasureT2": { "draw": ["item.heirloomArmor.v1"], "discard": [] },
    "treasureT3": { "draw": [], "discard": [] },
    "chance": { "draw": ["chance.exhaustion.v1"], "discard": [] },
    "enemyT1": { "draw": ["enemy.goblin.v1"], "discard": [] },
    "enemyT2": { "draw": ["enemy.orc.v1"], "discard": [] },
    "enemyT3": { "draw": ["enemy.demon.v1"], "discard": [] }
  },
  "tileState": {
    "enemies": {
      "22": [],
      "20": []
    },
    "attachments": {
      "traps": {
        "21": {
          "byUid": "u1",
          "cardId": "item.trap.v1",
          "placedAt": 1735728900000,
          "visible": true
        }
      },
      "ambushes": {}
    }
  },
  "combat": null,
  "finalTileTie": null
}

3) games/{gameId}/log/{entryId}
- Purpose: Immutable, ordered event log for UI and audits. Clients append a log entry in the same batch/transaction as the game state update

type LogEntry = {
  ts: FirebaseFirestore.Timestamp // serverTimestamp
  seq: number // optional monotonic sequence; otherwise derive from ts+autoid ordering
  actorUid?: PlayerId | null
  type: string // e.g., "GameStarted", "MoveRolled", "TileEntered", "CombatRound", "DamageApplied", "LootGained", "DeckShuffled"
  message?: string // formatted template (for quick UI)
  payload?: any // normalized, small JSON for structured consumers
  visibility?: "public" | "obfuscated" // obfuscated hides card name if needed
}

Example log entry

{
  "ts": "2025-01-01T12:10:10Z",
  "seq": 41,
  "actorUid": "u1",
  "type": "MoveRolled",
  "message": "Scouty rolled 3 on d4.",
  "payload": { "kind": "d4", "value": 3, "phase": "moveOrSleep" },
  "visibility": "public"
}

4) games/{gameId}/chat/{msgId}
- Purpose: Room-specific chat during the match

type ChatMessage = {
  ts: FirebaseFirestore.Timestamp
  uid: PlayerId
  nickname: string
  text: string
}

5) games/{gameId}/actions/{actionId}
- Purpose: Optional. Client-submitted command envelope for debug/replay. If used, append before applying local engine update; store deterministic inputs

type ClientAction = {
  ts: FirebaseFirestore.Timestamp
  uid: PlayerId
  type: string // e.g., "ChooseMoveOrSleep", "OfferDuel", "UseItem", "ChooseBranch", "Retreat"
  payload: any
  // Correlation to a resulting log sequence (if known) for traceability
  correlatesToSeq?: number
}

Indexes (Required for efficient queries)
- rooms
  - Collection: rooms
    - Query by id (code) direct lookup: no index needed beyond default
    - Optional lobby browser: Composite index on (status ASC, updatedAt DESC)
- games subcollections
  - games/{gameId}/log: Single-field index on ts ASC
  - games/{gameId}/chat: Single-field index on ts ASC
  - games/{gameId}/actions: Single-field index on ts ASC
- If you add filters (e.g., type == "CombatRound" orderBy ts), Firestore will prompt to create composite indexes

Sync protocol and write discipline

Lobby flow
1) Create room
- Client generates a 6-char uppercase code not in use (check doc existence first). Use code as rooms/{code}
- Set status "lobby", ownerUid, createdAt/updatedAt, seats with six entries uid=null
- Set expiresAt null

2) Join room
- If seats have free slot and not kicked, pick a seatIndex atomically:
  - Transaction: read room, find a seat with uid == null, set seats[N].uid = auth.uid, seats[N].nickname, seats[N].ready=false, seats[N].lastSeen=Date.now(); update updatedAt; if after write all seats uid null then set expiresAt else null
  - Start heartbeat: update lastSeen every 30s while connected
  - On disconnect: set disconnectedAt = Date.now(); optionally free seat after 2min grace

3) Ready/class selection
- Players update their own seat object: nickname, classId, ready. Owner can modify anyone for moderation (kick)

4) Start game
- Owner verifies >1 seated and all non-empty seats ready, and classId are unique (UI ensures; Rules cannot reliably enforce uniqueness)
- Owner creates games/{gameId}:
  - status "setup", schemaVersion, version 0, createdAt, createdBy
  - Determine turn order by rolling d6 (log rolls), resolve ties; set turnOrder
  - Copy players into GameDoc players map and board positions at Start tile 0; set currentPlayerUid to first in order; phase "turnStart"; status "playing"; startedAt now
  - Write an initial log entry "GameStarted" in a batch with the game doc

Gameplay writes
- Only currentPlayerUid writes the GameDoc (status "playing") except:
  - Owner may set status "ended" as a fallback
  - Any player may add chat/log/actions subcollection entries (log mostly emitted by current player's batch; others only write chat)
- Each mutation:
  - Engine computes a deterministic new state from current local GameDoc and the client action
  - Client submits a batched write:
    - Update games/{gameId} with new fields (including version increment +1, updatedAt=serverTimestamp)
    - Add 1+ log entries for public audit (serverTimestamp, type, payload)
    - Optionally add actions entry for trace
  - Precondition:
    - Ensure the write is for the current player (rules enforce)
    - Ensure GameDoc.version matches client's baseVersion; increment to baseVersion+1 (rules enforce expected increment)
    - Optionally, ensure phase is appropriate for the action (UI ensures; rules enforce coarse gate by phase set membership)

Connection health monitoring
- Clients update seats[N].lastSeen every 30 seconds while connected
- On disconnect detection (lastSeen > 90s ago):
  - Set disconnectedAt timestamp
  - After 2 minute grace period, seat can be freed by owner
  - If game in progress, current player's turn continues but with timeout warning

Conflict handling
- If write fails with permission-denied or precondition failed (version mismatch):
  - Client refetches the latest GameDoc
  - Recomputes the transition from the new base state if the action is still valid/allowed
  - Retries the batch
- Idempotency:
  - Use a client-generated mutationId (UUID) in payload of emitted log entries to detect duplicate application attempts
  - The engine should be pure/side-effect-free so re-running on the new base state yields the same or correctly rejected outcome

Reconnect/resume
- When a client reconnects:
  - Subscribe to rooms/{code} and games/{gameId}
  - Update lastSeen immediately, clear disconnectedAt
  - If client is the currentPlayerUid, enable action UI
  - If a player was moved by a Chance card during another's turn, pending tile resolution is stored in state. The engine ensures resolve pending tile at turnStart

Failure/rollback policy
- If a batch partially fails (rare with Firestore, batches are atomic):
  - The UI reports failure and retries
- If a client crashes mid-turn:
  - Another client is not allowed to continue unless owner sets ended. When the current player reconnects, they resume
  - If a stale client regains connectivity and attempts a write with old version, it will be rejected by rules

Security rules (high-level skeleton)
Note: Actual deployment requires adapting to Firebase rules syntax and adding auth checks

- rooms
  - Read: allow anyone with the code (doc id) to read. Require auth != null
  - Create: allow authenticated users to create new rooms if doc id is unique
  - Update:
    - Only ownerUid can set owner-only fields: status, maxPlayers, kick toggles, start game linkage (gameId)
    - Any authenticated user can claim an empty seat or update their own seat (nickname, classId, ready, lastSeen) in place
    - Write must not change seats[i].uid to a different uid unless either it's null->auth.uid, or ownerUid is making the change (kick/unseat)
    - expiresAt may be set only when all seats are empty
  - Delete: allow if status == "ended" or TTL triggers

- games
  - Read: allow only seated players from the linked room (store roomId on game if needed)
  - Update:
    - Only currentPlayerUid may update the GameDoc while status == "playing"
    - Coarse phase gates: restrict allowed fields per phase to a white-list set
    - Enforce version increment by 1:
      request.resource.data.version == resource.data.version + 1
    - Disallow changing currentPlayerUid except as a consequence of valid endTurn transitions
    - Owner override: ownerUid (from room) may set status "ended" and endedAt

- subcollections
  - games/{gameId}/log: append-only
    - Allow all seated players to create new docs; deny updates/deletes
  - games/{gameId}/chat: allow create for seated players; deny update/delete except by writer for brief edit window
  - games/{gameId}/actions: allow create for seated players; deny update/delete

Example rules fragment (illustrative, not complete)

match /databases/{database}/documents {
  function isAuthed() { return request.auth != null; }
  function isOwner(room) { return room.data.ownerUid == request.auth.uid; }
  function inSeats(room) {
    return room.data.seats.where(s => s.uid == request.auth.uid).size() > 0;
  }

  match /rooms/{roomId} {
    allow read: if isAuthed();
    allow create: if isAuthed() && request.resource.id.size() == 6;
    allow update: if isAuthed() && (
      // owner can moderate
      isOwner(resource) ||
      // seat self-service: only modify your own seat object fields
      (
        request.resource.data.seats.size() == 6 &&
        // Prevent changing other seats' uid
        // (Implement deeper per-index checks; omitted for brevity)
        true
      )
    );
    allow delete: if isOwner(resource);
  }

  match /games/{gameId} {
    allow read: if isAuthed(); // refine by linking room membership
    allow update: if isAuthed() &&
      request.resource.data.status == "playing" &&
      request.resource.data.version == resource.data.version + 1 &&
      request.resource.data.currentPlayerUid == request.auth.uid;
  }

  match /games/{gameId}/{sub=**} {
    allow read: if isAuthed();
    match /log/{entryId} {
      allow create: if isAuthed();
      allow update, delete: if false;
    }
    match /chat/{msgId} {
      allow create: if isAuthed();
      allow update, delete: if request.auth.uid == resource.data.uid;
    }
    match /actions/{actionId} {
      allow create: if isAuthed();
      allow update, delete: if false;
    }
  }
}

Client write API patterns

Batched state+log write
- Use a WriteBatch to:
  - Update games/{gameId} with computed patch + version increment
  - Insert one or more logs under games/{gameId}/log with serverTimestamp ts
  - Optionally insert an actions envelope for debugging
- Use a transaction if the client needs to read-modify-write (to account for deck draws, etc.). Always verify resource version within the transaction

Example: End of move resolving a Treasure tile (Tier 2)
- Pre-read GameDoc (version v)
- Engine computes:
  - Movement result, Lamp usage, tile resolution
  - Deck pop from treasureT2.draw (last element), push to discard if returned
  - Inventory swap immediately allowed on draw
  - Phase transitions to "capacity"
  - version to v+1
- Batch:
  - update games/{gameId} with players[u].position, players[u].movementHistory cleared/updated, decks.treasureT2 arrays updated, inventory changes, phase "capacity", updatedAt=serverTimestamp, version=v+1
  - add log "MoveRolled", "TileEntered", "TreasureDrawn", etc.

Optimistic concurrency and dedupe
- Each computed mutation can include a mutationId (UUID) in the top-level GameDoc (e.g., lastMutationId) and emitted in the log payload. Rules do not need to validate it; the UI uses it to detect if a displayed log corresponds to the last attempted mutation and avoid double-toasts

Phase gating cheat-sheet (rules coarse checks)
- turnStart: pending tile resolution, skip turn check
- manage: inventory/equipment fields on currentPlayer only
- preDuel: duel offer markers, noDuelsThisTurn flag
- moveOrSleep: currentPlayer position not changed yet; only set a pending movement roll or choose sleep
- resolveTile: deck pops, tileState attachments/enemies, combat spawn
- combat/duel: hp, combat struct, deck pops for loot, tile enemies removal
- postCombat: loot assignment, inventory updates
- capacity: inventory trims/drops
- endTurn: clear per-turn flags; advance currentPlayerUid to next; increment turnNumber; phase -> turnStart
- finalBracket: special tie-breaker state outside normal turn flow

Versioning and migrations

Fields
- schemaVersion: semver string
- dataVersion: optional numeric for migration scripts (monotonic)
- migratedWith: client app version that performed the last migration
- Optional migrationNotes: string for audit

Policy
- Forward-only one-step migrations: Clients may migrate a document by one minor version at a time (e.g., "1.0.0" -> "1.1.0") if they know how. Major changes require creating a new game
- Unknown fields must be preserved on read/write (treat unknown keys as opaque to maintain forward compatibility)
- Adding fields:
  - Provide safe defaults (e.g., null, empty array)
  - Rules must allow presence/absence of these fields to avoid bricking older clients
- Removing fields:
  - First deprecate: keep field in storage but ignore in code
  - After all clients upgraded, migration can drop field as a separate step

Migration workflow
- On game open:
  - If schemaVersion != clientSupportedVersion:
    - If client can migrate up by one step, run migration, write back in a batch with a log "GameMigrated"
    - If migration not supported, open read-only and prompt to upgrade client
- Rooms should not be migrated; if schema mismatch occurs, re-create the room

Data retention and TTL

- rooms: Use expiresAt TTL. When last seat becomes empty, set expiresAt = now + 2h. When any seat is claimed, clear expiresAt. Configure TTL on expiresAt in Firestore console
- logs: Keep full history for the life of the game. Optionally set TTL on logs to purge 48h post game end by writing expiresAt on each log after endedAt is set
- chat: Optional TTL similar to logs
- actions: For debug only; prune by TTL quickly (e.g., 24h)

Size and limits

- Firestore doc size limit 1 MiB. GameDoc must remain under this:
  - Deck arrays can be up to a few dozen items each; fine
  - rngAudit can grow; prefer logging RNG via games/{gameId}/log and keep rngAudit null or small
  - players map max 6 entries; inventories small
  - tileState.enemies should contain only present enemies; clear promptly after combat
- Throughput:
  - Each player turn typically produces 1 state write + 1–3 log writes. Well within free tier for hobby use

Example flows

Offer duel (preDuel)
- Actor: currentPlayerUid on shared non-Sanctuary tile
- ClientAction:
  { type: "OfferDuel", payload: { targetUid: "u2" } }
- Engine computes duel setup (or just sets a "duelOffered" marker requiring the other player to confirm via their UI)
- Batch:
  - Update GameDoc: phase -> "duel", combat to pvp state, version++
  - Add log "DuelStarted" with participants

Resolve PvE combat round
- Actor: currentPlayerUid
- Engine rolls d6+d6 (attack/defense) for both sides; applies class modifiers; applies damage simultaneously; removes zero-HP enemies; decides continue/retreat/end
- Batch:
  - Update GameDoc: combat.round++, players[u].hp, tileState.enemies updated
  - Add logs: "CombatRound", "DamageApplied", "EnemyDefeated" as needed
  - version++

Capacity enforcement
- Actor: currentPlayerUid
- Engine validates capacities; prompts drops if over capacity; moves dropped items to bottom of the same tier deck
- Batch:
  - Update GameDoc: inventory arrays, decks.discard/draw updates, phase -> "endTurn"
  - Add logs: "ItemDropped"
  - version++

Connection recovery
- On reconnect:
  - Update seats[N].lastSeen = Date.now()
  - Clear seats[N].disconnectedAt = null
  - Resume normal heartbeat (every 30s)

Deterministic RNG audit
- For every random decision, emit a public log with payload { kind: "d4" | "d6" | "shuffle" | "weightedPick", value, actorUid }
- Optional: also append to rngAudit array if still under size budget

Error cases and recovery

- Lost write due to disconnect:
  - Client retries on reconnect. If the turn moved on, the stale write is rejected by version precondition
- Duplicate UI action:
  - Second attempt either computes a no-op or fails rule checks. UI should suppress re-clicks during pending network write
- Cheating attempts:
  - Non-current player attempts to write: rejected by rules
  - Current player attempts to modify forbidden fields (e.g., other players' inventory outside of duel loot): rejected by rules
- Owner emergency end:
  - Owner can set status "ended" with endedAt. Clients close the match view
- Stale disconnect detection:
  - If lastSeen > 90s ago and game is active, show "Player may be disconnected" warning
  - After 2 minutes, owner can choose to kick or wait

Minimal client adapters (suggested)
- subscribeRoom(roomId)
- claimSeat(roomId, seatIndex, nickname)
- setSeatReady(roomId, ready)
- setSeatClass(roomId, classId)
- kickSeat(roomId, seatIndex)
- updateHeartbeat(roomId) // update lastSeen
- startGame(roomId) -> creates game doc; updates room.gameId; sets rooms.status="playing"
- subscribeGame(gameId)
- applyGamePatch(gameId, patch, logs, actionEnvelope) // wraps transaction, handles version
- appendChat(gameId, text)

Example action and logs for movement

Action
{
  "ts": "2025-01-01T12:22:00Z",
  "uid": "u1",
  "type": "ChooseMoveOrSleep",
  "payload": { "choice": "move" }
}

Logs in batch
[
  {
    "type": "MoveRolled",
    "payload": { "kind": "d4", "value": 3, "actorUid": "u1" }
  },
  {
    "type": "TileEntered",
    "payload": { "tileId": 22, "tier": 2, "tileType": "enemy" }
  }
]

Security rule hardening ideas (optional)
- Store roomId on GameDoc; validate that request.auth.uid is present in the room.seats
- Maintain a "phaseAllowedFields" map in code and mirror a conservative approximation in rules
- Enforce owner-ended override only when necessary: resource.data.status == "playing" && request.resource.data.status == "ended" && isOwner(room)

Testing checklist for networking
- Joining concurrent: two clients claim the same seatIndex; one should win via transaction
- Current player gating: non-current player write rejected
- Version mismatch: stale client write rejected, client retries successfully after refetch
- Deck pop determinism: two clients with the same base state compute same top card; only current player can commit
- Connection tracking: lastSeen updates properly, disconnect detection works
- Final tile tie bracket: freeze normal turn cycle and write bracket; after winner determined, status "ended"

Implementation phases
1. Phase 1: Room creation + joining + heartbeat system
2. Phase 2: Game state sync + version control
3. Phase 3: Security rules hardening + TTL setup

Migration notes for future schema changes
- If you split players map to a subcollection for large inventories, bump schemaVersion minor, write a migration that copies data then flips a flag playersSubcollection=true
- If you add new item flags, ensure rules do not forbid unknown keys under players[uid].flags
- If you add new decks or board variants, prefer additive fields

Example: finishing a game
- Winner reaches tile 53 (Final) and no tie:
  - Batch:
    - Update games/{gameId}: status "ended", endedAt now
    - Add log "GameEnded" with winnerUid
  - Update rooms/{roomId}: status "ended", updatedAt now; optionally set expiresAt now+2h for room cleanup

This schema and protocol align with the GDD: single-writer authoritative state, deterministic logs, clean recovery from stale writes, connection health monitoring, and consistent TypeScript types while remaining fully client-side on Firestore.