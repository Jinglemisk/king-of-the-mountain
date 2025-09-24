Title: Board and Movement Spec (v1)

Purpose
- Formal contract for the board graph and movement rules.
- Defines the board JSON schema, per-tile metadata, branch selection flow, path-history stack semantics, backward traversal when history is empty, pass-over triggers (Ambush), Sanctuary movement restrictions, and Lamp timing relative to “end on tile.”
- Outputs a deterministic movement API and validation rules the engine will implement, plus example traces for tests.

Scope and non-goals
- Covers: forward/backward/teleport moves; movement during your turn vs being moved by effects on others’ turns; pass-over vs on-stop triggers; simultaneous/mass movements (e.g., Earthquake).
- Does not re-specify combat/duel/tile resolution logic except where movement must pause or resume around them.

Terminology
- OnStepEnter: The moment you step onto a tile during a multi-step movement (before checking if you still have steps left).
- OnStop: The final landing of your movement (after all steps are consumed or otherwise ended) that will proceed to tile resolution (Step 5 of the turn flow).
- MovementHistory: A per-turn stack of tile ids representing your exact forward path on your turn. It is used for retreat and other history-aware backward moves and is cleared at the start of your turn (turnStart).
- Reverse traversal: Backward movement that uses the graph’s reverse edges when your per-turn MovementHistory is empty or exhausted.
- MoveContext: Flags that define whether pass-over triggers and duels are allowed during a given movement (normal move, retreat, Earthquake, teleport, etc.).
- Active player: The player whose turn it currently is.

1) Board data model (JSON schema)

File naming and versioning
- Board file path: /src/game/data/board.v1.json
- Board schema version: boardSchemaVersion = 1
- Board content version: id “board.v1” (allow future boards: board.v2, board.v3…)

Canonical tile types
- start, final, empty, chance, treasure, enemy, sanctuary

Tier semantics
- tier is required only for treasure and enemy tiles and must be 1, 2, or 3. Not present for other tile types.

Neighbors
- neighbors is a forward adjacency list. All edges must be directed from lower to higher position in the race; the graph is a DAG (no cycles). final has neighbors: [].

Optional UI metadata
- x, y (number): layout hints for board rendering (grid or absolute coords).
- label (string): optional display label.

Board JSON schema (draft/engine-internal; used for codegen of validators)

{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "BoardGraph",
  "type": "object",
  "required": ["id", "boardSchemaVersion", "nodes"],
  "properties": {
    "id": { "type": "string", "pattern": "^board\\.v\\d+$" },
    "title": { "type": "string" },
    "boardSchemaVersion": { "type": "integer", "const": 1 },
    "nodes": {
      "type": "array",
      "minItems": 2,
      "items": {
        "type": "object",
        "required": ["id", "type", "neighbors"],
        "properties": {
          "id": { "type": "integer", "minimum": 0 },
          "type": {
            "type": "string",
            "enum": ["start", "final", "empty", "chance", "treasure", "enemy", "sanctuary"]
          },
          "tier": {
            "type": "integer",
            "enum": [1, 2, 3]
          },
          "neighbors": {
            "type": "array",
            "items": { "type": "integer", "minimum": 0 },
            "uniqueItems": true
          },
          "x": { "type": "number" },
          "y": { "type": "number" },
          "label": { "type": "string" }
        },
        "allOf": [
          {
            "if": { "properties": { "type": { "const": "treasure" } } },
            "then": { "required": ["tier"] }
          },
          {
            "if": { "properties": { "type": { "const": "enemy" } } },
            "then": { "required": ["tier"] }
          },
          {
            "if": { "properties": { "type": { "const": "final" } } },
            "then": { "properties": { "neighbors": { "maxItems": 0 } } }
          }
        ]
      }
    }
  },
  "additionalProperties": false
}

Validation on load (engine invariant checks)
- Unique node ids; id 0 must exist and be type "start"; exactly one "final" with neighbors: [].
- All neighbor ids refer to existing nodes.
- DAG: reject cycles. Enforce acyclicity via topological sort.
- Reachability: every node must be reachable from start; final must be reachable from start.
- Tier presence: treasure/enemy must have tier; other types must not.
- No self-loops; no duplicate edges; neighbors sorted ascending for deterministic diffs.
- Shortcuts: allow multi-predecessor rejoin nodes (e.g., 18, 46 in v1).
- Optional: count checks for v1 (approximate): total nodes = 68; two shortcut branches exist.

2) Board v1 canonical ids and neighbors
- Provided in GDD: ids 0–53 main path, 54–59 shortcut A, 60–67 shortcut B. Start = 0, Final = 53. Branch A: 10 -> 54 and rejoins at 18; Branch B: 36 -> 60 and rejoins at 46.
- The shipped /src/game/data/board.v1.json must match the GDD’s list exactly.

3) Movement model

3.1 Movement types
- Normal forward move (your Step 4 “Move”): roll d4 (+/- modifiers), clamp to min 0, then advance up to N steps.
- Sleep (Step 4 “Sleep”): you do not move; if on an enemy tile, Step 5 will still trigger a fight.
- Backward step-based move (e.g., “move 3 back”, Retreat 6 back): advance in reverse by N steps; prefer MovementHistory pops, then reverse traversal.
- Teleport-like move (swap positions, Blink “ignore pass-through effects”): goes directly to target tile without stepping through intermediate tiles (no OnStepEnter triggers).
- Mass/simultaneous group move (e.g., Earthquake): each affected player moves in seating order, with a shared simGroupId for final-tile tie resolution; pass-over duels are disabled per card text.

3.2 Movement modifiers and clamping
- Base roll: d4.
- Modifiers: additive integer bonuses/penalties from items/effects (e.g., Velvet Cloak +1; Royal Aegis −1; Beer −1 to your next movement).
- Movement steps = max(0, base d4 + sum of modifiers for this roll). There is no “exact count to reach Final” requirement; if you reach Final, remaining steps are discarded.

3.3 MovementHistory
- The engine keeps a per-turn stack of tile ids that you traverse during your own Step 4 movement (only forward).
- Cleared: at turnStart for the active player.
- Pushed: after each forward step, push the tile you just left and the tile you entered so the last element always equals your current tile; the sequence allows precise backtracking. For convenience, store only the path of entered tiles in order; implementation detail below.
- Used for: retreat and any “move back N” effects occurring on your own turn.
- Not used for: movements caused on other players’ turns; those will use reverse traversal.

Implementation suggestion
- Keep movementHistory: number[] of visited nodes in order this turn, starting with the starting tile (inclusive), appending each new tile id you enter. On retreat n back, pop n items (or until length=1) to step back one-by-one.

3.4 Reverse traversal (when history is empty)
- Build reverse adjacency on load: preds[id] = list of ids that have id in their neighbors.
- Deterministic predecessor selection when multiple preds exist:
  1) If the current movement already used a predecessor to enter or leave this node earlier in the same movement, prefer that predecessor (lastFrom).
  2) Else choose the lowest predecessor id.
- If there is no predecessor (e.g., start), stop moving; extra backward steps are lost.
- This rule applies to backward moves during others’ turns (history unused) and to overrun after history pops are exhausted.

3.5 OnStepEnter vs OnStop
- OnStepEnter events fire for each tile you enter during step-based movement:
  - Ambush pass-over trigger may fire here (see 4.1), subject to MoveContext.
  - You do not resolve the tile’s standard effect (Chance/Treasure/Enemy) on passing through; that only happens OnStop.
- OnStop event fires when your remaining steps reach 0 or you otherwise end movement. The tile you stop on is the one you resolve at Step 5 of the turn sequence.

3.6 Branch selection
- When you step onto a node with neighbors.length > 1 and you still have steps remaining, the engine pauses and requires a BranchChoice action from the active player.
- UI contract:
  - Show all legal neighbors as buttons; highlight if a neighbor is a shortcut (metadata optional).
  - If the player closes the dialog or times out, default to the lowest-id neighbor for determinism.
- A branch choice is needed at each such node where steps remain; if steps run out exactly when you arrive at a branching tile, no choice is made and you stop there.

3.7 Reaching Final
- If you enter Final at any point in your movement, you stop immediately and win unless a simultaneous arrival rule applies.
- Simultaneous arrival: if 2+ players are moved to Final by the same single effect resolution (e.g., an action or a simGroupId batch like Earthquake), suspend normal flow and run the tie-breaker duel bracket in seat order among those tied players.

4) Special movement interactions

4.1 Ambush pass-over trigger
- Placement: Ambush (from Chance) may only be placed on non-Sanctuary tiles. It sits face down (tileState.ambush = true with ownerUid).
- Trigger: When a player enters that tile during step-based movement (forward or backward), Ambush may be revealed to immediately offer a duel before any tile resolution.
- Movement pause: Movement is paused while the duel resolves. If the moving player survives and chooses not to retreat to 0 HP, resume movement with remaining steps from the same tile. Steps already consumed are not refunded.
- Restriction flags:
  - On mass-move effects that explicitly forbid “intermediate duels” (e.g., Earthquake), Ambush does not trigger.
  - On teleport moves (swap, Blink with “ignore pass-through effects” for intermediate tiles), Ambush does not trigger for tiles not actually entered step-by-step. If Blink lands exactly on the Ambush tile, it counts as an OnStop arrival (not OnStepEnter); Ambush still triggers because you “entered during movement” on the landing step.
- Sanctuary: no Ambush may be placed on Sanctuary and thus cannot trigger there.
- Scout passive: the Scout ignores Ambush; if they enter an Ambush tile, the Ambush does not fire against them. The card remains on the tile for the next entrant (unless the rules for picking up/consuming say otherwise; Scout interaction details live in Items/Timing doc).

4.2 Traps
- Traps trigger OnStop (“the next player who lands here…”). They do not trigger on pass-over.
- Sanctuary: Traps cannot be placed here and thus cannot trigger here.
- Scout: may pick up a Trap they step onto rather than triggering it (covered in Items/Timing doc). Movement resumes normally.

4.3 Sanctuary movement restrictions
- You cannot be forced out of Sanctuary by other players’ cards/effects.
- You may voluntarily move out of Sanctuary on your turn (normal movement) and you may move yourself with self-played effects (e.g., Instinct).
- Blink Scroll specific restriction: “cannot move into or out of Sanctuary if a card/effect would force you.” This overrides the general “self-play is allowed” rule for Blink only: Blink cannot take you into or out of Sanctuary at all.
- Mass moves: If an effect attempts to move you into or out of Sanctuary and the actor is not you, the move is blocked; you remain where you are for that step; remaining steps may still apply if the effect specifies multiple steps (consume steps until they can’t move further).

4.4 Lamp timing
- Lamp text: “If your turn would end on a tile with a player or an enemy, you may step back 1 tile BEFORE resolving that tile.”
- When checked: immediately after computing your final landing tile for your movement (Step 4), but before Step 5 tile resolution. This is a pre-resolution adjustment that happens on your turn only.
- “Tile with a player”: any other player token occupies that tile.
- “Tile with an enemy”: either the tile type is enemy, or the tile already has enemies present in tileState (e.g., lingering enemies from a previous entry). Spawn timing on new enemy tiles is Step 5, but the Lamp treats “enemy tiles” as eligible.
- Executing the Lamp step back:
  - If you moved forward this turn, step back to the previous tile by popping from MovementHistory (always unambiguous).
  - If you did not move at all (e.g., roll 0 after modifiers), you cannot Lamp because there is no “previous tile this turn.”
  - Lamp does not trigger from movements on other players’ turns.
- After stepping back, Step 5 resolves the tile you stepped back onto.

4.5 Retreat movement
- At any time during a fight or a duel, you may retreat; you immediately move 6 tiles backward using your MovementHistory for this turn. If history length < 6, move back to the earliest tile in your history, then continue using reverse traversal for the remaining steps as needed (rare; generally you retreat on your own turn where history > 0).
- The turn ends immediately after retreating. No tile resolution occurs on your retreat destination tile this turn.

4.6 Movement during others’ turns (external movement)
- When you are moved by someone else’s effect (e.g., Exhaustion, Cave-in, Earthquake), you do not resolve the tile immediately. Instead, you gain a pendingTile to resolve at Step 1 of your next turn.
- MoveContext defaults:
  - allowPassOverTriggers: false (no Ambush while being moved by someone else’s effect unless the card explicitly says “start a duel”).
  - allowDuels: false by default (Earthquake explicitly forbids intermediate duels).
- Reverse traversal use: backward external moves do not use your per-turn MovementHistory (which is per the active player’s turn). They use reverse traversal rules.

4.7 Teleports and swaps
- MoveStyle “teleport” ignores intermediate tiles (no OnStepEnter); OnStop fires at the destination. This includes:
  - Blink Scroll (+2 or −2 “before resolving your tile” and “ignore pass-through effects”; treat as a two-step teleport along the forward/reverse direction without entering intermediate tiles).
  - Mystic Wave (swap positions with nearest player).
- Sanctuary with teleports:
  - Swaps are allowed into/out of Sanctuary if you (the mover) initiated it on yourself. Blink cannot move into/out of Sanctuary (specific restriction).
  - If a teleport would be blocked by Sanctuary rules, the move is canceled; the actor remains in place.

5) Deterministic movement API (engine contract)

Types

type TileId = number;

type TileType = "start" | "final" | "empty" | "chance" | "treasure" | "enemy" | "sanctuary";

interface BoardGraph {
  id: string; // "board.v1"
  boardSchemaVersion: 1;
  nodes: Array<{
    id: TileId;
    type: TileType;
    tier?: 1 | 2 | 3;
    neighbors: TileId[];
    x?: number;
    y?: number;
    label?: string;
  }>;
  // Derived at load:
  preds?: Record<TileId, TileId[]>;
}

interface MoveContext {
  actorUid: string;     // who initiated the effect
  targetUid: string;    // who is moving
  moveStyle: "step" | "teleport" | "mass";
  direction: "forward" | "backward" | "none";
  allowPassOverTriggers: boolean;
  allowDuels: boolean;
  allowLamp: boolean;   // usually only true for active player’s Step 4
  simGroupId?: string;  // for simultaneous arrival sets (e.g., Earthquake)
  source: "turnMove" | "sleep" | "retreat" | "cardSelf" | "cardOther" | "massEffect" | "uiBranch";
}

interface MovementStep {
  from: TileId;
  to: TileId;
  onStepEnterFired: boolean;
}

interface MovementResult {
  path: MovementStep[];         // steps taken in order
  stoppedOn: TileId;            // final tile
  reason: "stepsConsumed" | "blocked" | "final" | "cancelled";
  pendingTile: boolean;         // whether tile resolution is deferred (external movement)
  simGroupId?: string;
  historyAfter?: TileId[];      // updated MovementHistory for target
}

Required utilities (pure functions unless otherwise stated)

- validateBoard(board: BoardGraph): { ok: true } | { ok: false, errors: string[] }
- buildReverseAdjacency(board: BoardGraph): BoardGraph // adds preds
- computeMovementSteps(board, start: TileId, steps: number, ctx: MoveContext, movementHistory: TileId[]): MovementResult
  - For moveStyle "step", direction "forward": walk step-by-step, pausing at branches for UI “ChooseBranch” action (external to this function) or applying a default deterministic choice (lowest id) if none provided.
  - For moveStyle "step", direction "backward": consume movementHistory first; when empty, use reverse traversal with deterministic predecessor selection.
  - For moveStyle "teleport": jump directly to destination tile (passed via an overload or accessory parameter), ignoring intermediate tiles; no pass-over triggers; OnStop only.
- chooseBranch(current: TileId, options: TileId[], ctx: MoveContext): TileId
  - UI or AI selects; engine must support deterministic fallback: min(options).
- applyLampIfEligible(graph, stoppedOn: TileId, ctx: MoveContext, movementHistory: TileId[], tileState): { finalStop: TileId, historyAfter: TileId[] }
  - Only allowed if ctx.allowLamp is true and condition satisfied. Steps back exactly one tile via MovementHistory; if none, no Lamp.

Engine integration notes
- Movement that happens outside the active player’s turn must set pendingTile = true and not call tile resolution. The GameState stores per-player pendingTile (boolean) and pendingTileId (the tile you ended on).
- During Step 1 turnStart, if pendingTile is true, resolve that tile as if you had just ended your movement there, but no Lamp applies (Lamp is turn-move only).
- All movement operations append rngAudit entries for dice rolls and branch default picks.

6) Branch selection UI contract

- The engine emits RequireBranchChoice event with:
  - playerUid, currentTileId, neighborIds[], remainingSteps, ctx.
- The UI emits ChooseBranch action with:
  - chosenNeighborId (must be in neighborIds).
- Timeout/default:
  - After a configurable timeout (e.g., 30s) or on disconnect, engine chooses the lowest-id neighbor deterministically and continues.

7) Example traces (canonical tests)

Example 1: Simple forward with branch
- Start: Player A on tile 9 (enemy t1), chooses to Move, rolls d4 = 3 (no modifiers).
- Steps: 9 -> 10 (remaining 2), tile 10 has [11, 54], requires branch choice. A chooses 11.
- Continue: 10 -> 11 (remaining 1), 11 -> 12 (remaining 0). Stop on 12 (enemy t1).
- OnStop: tile 12 is enemy; proceed to fight.
- MovementHistory this turn: [9, 10, 11, 12].

Example 2: Shortcut A and Lamp
- Start: Player B at tile 10 (branch), d4 = 4, chooses the shortcut 54 path.
- Steps: 10 -> 54 -> 55 -> 56 (remaining 1) -> 57 (remaining 0). Stop on 57 (chance).
- Suppose an opponent token sits on 57. Lamp check: “tile with a player” true; B Lamps back 1 to 56 before resolving.
- OnStop after Lamp: resolve tile 56 (enemy t2); fight begins there instead.
- History after Lamp: [10, 54, 55, 56] (Lamp popped 57).

Example 3: Retreat using MovementHistory
- Start: Player C begins on 56, moves forward this turn to 58 (via 57). MovementHistory: [56, 57, 58].
- On tile 58 they start a fight and after some rounds they choose to retreat.
- Retreat 6 back: pop history first: 58 -> 57 -> 56 (history now [56]). Continue reverse traversal for remaining 3 steps:
  - preds(56) = [55], 56 -> 55
  - preds(55) = [54], 55 -> 54
  - preds(54) = [10], 54 -> 10
- End on 10. Turn ends immediately; no tile resolution.

Example 4: Backward move from card on someone else’s turn (history empty)
- Start: Player D is at 19. Another player reveals Cave-in: “move 3 back”.
- Because this is external movement, MovementHistory is ignored. Use reverse traversal:
  - Step 1: preds(19) = [18], go 19 -> 18.
  - Step 2: preds(18) = [17, 59]. No lastFrom exists in this movement; choose lowest id = 17. Go 18 -> 17.
  - Step 3: preds(17) = [16], go 17 -> 16.
- D stops on 16 (sanctuary). pendingTile = true. No duels or Ambush triggers during this movement. D resolves tile 16 at Step 1 of their next turn (sanctuary does nothing).

Example 5: Earthquake (mass movement, no intermediate duels)
- Card text: everyone rolls d4 and moves backward that much; resolve in seating order; effectively simultaneous; no intermediate duels.
- Engine:
  - Assign simGroupId = “EQ-<ts>”.
  - For each seated player, in seat order: roll d4, compute MovementResult with ctx.moveStyle = "mass", allowDuels = false, allowPassOverTriggers = false, direction = "backward".
  - Set pendingTile = true for all moved players.
  - If 2+ players end on Final via some future mass-forward effect with the same simGroupId, run the tie-breaker bracket.

Example 6: Blink “ignore pass-through effects”
- Player E ends movement on tile 40 (enemy) this turn. Before Step 5, they use Blink Scroll “+2 before resolving your tile; ignore pass-through effects; cannot move into/out of Sanctuary.”
- Treat as teleport two tiles forward along graph:
  - Determine a 2-step forward target deterministically by walking neighbors along default branch order (lowest id) if choices exist; no pass-over triggers fire for tiles 41 and 42.
  - If the computed 2-step destination would cross into Sanctuary (or out of it), abort Blink; E remains at 40.
- After Blink, re-check Lamp eligibility (if your landing tile has a player/enemy) and apply if desired.

8) Interactions with turn/phase and tile resolution
- Turn phases:
  - Step 4 Move updates MovementHistory and ends by providing a final stoppedOn tile.
  - Lamp resolves before Step 5.
  - Step 5 resolves the tile you stopped on (unless movement was external, in which case pendingTile defers it to Step 1 of your next turn).
- Being moved on someone else’s turn: do not fight or draw immediately; set pendingTile and stop.
- Ending conditions:
  - If you hit Final during movement, you win immediately unless simultaneous arrival applies.
  - If a duel is initiated by Ambush during your movement and you lose to 0 HP, your movement ends; you remain on that tile at 0 HP; looting occurs as per duel rules.

9) Determinism and RNG
- All branch defaults use lowest id. No randomness in path unless a card explicitly says “tie breaks random” (that randomness is handled in RNG doc).
- Movement dice (d4) are logged to rngAudit with actorUid.
- Mass movement groups get a simGroupId for correct simultaneous arrival detection.

10) Engine invariants for movement
- Multiple players may occupy the same tile.
- You only resolve the tile you stop on (OnStop), except Ambush which may trigger on pass-over (OnStepEnter) and cause a duel.
- Lamp is only evaluated on the active player’s turn after movement finishes and before tile resolution.
- Backward moves never go below Start. Extra steps are lost.
- MovementHistory is per-turn and forward-only. It is not used for external movements.

11) Board loader and validation checklist
- On game start/load:
  - Parse board JSON and validate with schema.
  - Build preds for all nodes.
  - Verify DAG and reachability.
  - Cache neighbor lists sorted ascending.
- On game create:
  - Store immutable boardId in GameState.
- On version bumps:
  - Board schema version changes require a migration step described in Networking/DB doc. Save boardId and game version in GameState for replays.

12) Minimal example snippet of board.v1.json (excerpt only)

// This is only an excerpt; use the full map from GDD
{
  "id": "board.v1",
  "title": "Main Board v1",
  "boardSchemaVersion": 1,
  "nodes": [
    { "id": 0, "type": "start", "neighbors": [1] },
    { "id": 1, "type": "chance", "neighbors": [2] },
    { "id": 2, "type": "enemy", "tier": 1, "neighbors": [3] },
    { "id": 3, "type": "treasure", "tier": 1, "neighbors": [4] },
    ...
    { "id": 10, "type": "chance", "neighbors": [11, 54] },
    ...
    { "id": 18, "type": "enemy", "tier": 2, "neighbors": [19] },
    ...
    { "id": 53, "type": "final", "neighbors": [] },
    // Shortcut A
    { "id": 54, "type": "enemy", "tier": 2, "neighbors": [55] },
    ...
    { "id": 59, "type": "treasure", "tier": 2, "neighbors": [18] },
    // Shortcut B
    { "id": 60, "type": "enemy", "tier": 2, "neighbors": [61] },
    ...
    { "id": 67, "type": "enemy", "tier": 2, "neighbors": [46] }
  ]
}

13) Test hooks and fixtures (movement-specific)
- Given/When/Then cases (to be referenced in TEST_PLAN):
  - MV-01: Branch choice at 10, roll=3, choose [11] → path [9,10,11,12], stop on 12 enemy, Lamp disabled if no other players there.
  - MV-02: Shortcut A with Lamp: roll=4 from 10 choosing 54; end 57, Lamp back to 56.
  - MV-03: Retreat consumes MovementHistory then reverse traversal when exhausted; verify exact stop at 10.
  - MV-04: Cave-in 3 back from 19 on someone else’s turn; verify pred tie-break to 17 at 18 and pendingTile=true.
  - MV-05: Earthquake mass move: no Ambush triggers; pendingTile set for all; simGroupId present; logs consistent.
  - MV-06: Blink two forward from 40, ignoring pass-over; Sanctuary blocking if target crosses sanctuary.
  - MV-07: Ambush on 12 triggers on pass-over with a 3-step forward move; movement pauses for duel, then resumes if mover survives.
  - MV-08: Movement roll with modifiers yielding 0 steps: remain on current tile; if current tile is enemy, Step 5 triggers fight; Lamp cannot be used (no previous tile this turn).
  - MV-09: Final tile reached with leftover steps: immediate win; leftover steps discarded.
  - MV-10: Tie at Final via a single effect moving two players: bracket is created; normal turn cycle paused.

14) Implementation notes and pitfalls
- Do not mutate MovementHistory for external movements; only update pendingTile.
- When Lamp steps back, update MovementHistory accordingly (pop last entered tile).
- Avoid dead-ends that are not Final; board validation should reject nodes with neighbors: [] that are not final.
- Ensure that reverse traversal cannot select a predecessor outside preds (guard against malformed boards).
- Log every movement step for audit: from, to, reason (forward/backward/teleport), ctx.source, simGroupId if any.
- Deterministic fallback pathing at branches is essential for replay consistency.
