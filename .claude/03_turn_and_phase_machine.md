docs/TURN_AND_PHASE_MACHINE.md

Title: Turn and Phase State Machine
Version: 1.0
Status: Draft for implementation and test

Purpose
- Define the exact state machine that governs turn flow, legal actions per phase, and guard/validation rules.
- Remove ambiguity around pending-tile resolution at turn start, combat/duel routing, and capacity enforcement.
- Provide a deterministic reducer/transition contract for the engine and UI.

Scope
- Phases: turnStart → manage → preDuel → moveOrSleep → resolveTile → combat/duel → postCombat → capacity → endTurn.
- Entry/exit conditions, allowed actions, and invariants per phase.
- Start-of-turn “pending tile” resolution semantics.
- Sleep on Enemy tile semantics.
- Retreat behavior and turn-ending rules.
- Final tile tie-bracket interrupt.
- Capacity enforcement timing and co-located pickup window.
- Clearing rules for per-turn effects and “once per” flags.

Phase identifiers (enum)
- turnStart
- manage
- preDuel
- moveOrSleep
- resolveTile
- combat (PvE fight)
- duel (PvP)
- postCombat
- capacity
- endTurn
- finalBracket (interrupt state; not part of normal per-turn chain)

High-level flow (happy path, no interruptions)
1) turnStart
   - Resolve pending tile from external movement (if any), including fights and immediate post-combat capacity.
   - Then proceed to manage (unless the turn was ended by retreat or a special rule).
2) manage
   - Free equipment/inventory swaps.
3) preDuel
   - Optional duels and/or trades on shared non-Sanctuary tiles.
4) moveOrSleep
   - Choose Sleep or Move (d4).
5) resolveTile
   - Resolve the tile you ended on. May route to combat or capacity.
6) combat/duel
   - Fight enemies or duel a player if initiated and accepted.
7) postCombat
   - Apply defeat outcomes, loot rolls/assignment, and combat cleanup.
8) capacity
   - Enforce inventory/equipment capacity; offer co-located pickups for dropped items.
9) endTurn
   - Advance current player; clear per-turn flags.

Global rules and invariants
- Only the currentPlayerUid may advance the turn/phase, except:
  - preDuel phase accepts OfferDuel from any co-located player (including non-current) and Accept/Decline from the target.
  - capacity “co-located pickup” accepts PickupDroppedItem from any co-located player.
  - finalBracket runs outside normal turn ownership and freezes the turn cycle until a winner is declared.
- Pending tile resolution at turnStart:
  - If you were moved by another player’s effect (Chance card or item) during their turn, you do not resolve the landed tile until your next turn’s turnStart phase. The entire pending-tile pipeline (including potential combat, postCombat, and capacity) runs before manage.
  - Exception: If an effect moves 2+ players onto the Final tile simultaneously, finalBracket triggers immediately at the time of the effect (outside any player’s turn). The “defer tile resolution until your turn” rule does not apply to the Final tile’s tie-breaker check.
- Retreat:
  - If the current player retreats from a fight/duel, their turn ends immediately; movementHistory is rewound by 6 steps (see Board spec), and the engine transitions directly to endTurn.
  - If a non-current player retreats from a duel offered during the current player’s preDuel, the duel ends and the current player continues their turn at postCombat → capacity → moveOrSleep (see details under preDuel/duel).
- Sanctuary:
  - No duels can be initiated on Sanctuary.
  - Traps/Ambush cannot be placed here.
  - Effects that force another player’s movement cannot push a player into/out of Sanctuary; self-targeted movement by a player can move them into/out of Sanctuary unless the specific effect says otherwise.
- Sleep on Enemy tile:
  - Choosing Sleep in moveOrSleep fully heals you (to current max HP) and then resolveTile still runs. If the tile is an Enemy tile, you immediately fight after sleeping.
- Capacity enforcement:
  - Always enforced at capacity phase. Also enforced immediately after a start-of-turn pending fight resolves (to avoid carrying illegal state into manage).
- Immediate swap window:
  - When you draw/loot a Treasure during resolveTile/postCombat, you may immediately rearrange equipped/inventory to make space (swap only; no drop-to-bottom until capacity).
- Skip Turn and Must Sleep flags:
  - skipNextTurn: At turnStart, after pending-tile pipeline completes, if skipNextTurn > 0, decrement and jump to endTurn (you skip manage through capacity). If pending tile included a fight and you retreated, the turn ended already (no skip consumption).
  - mustSleepNextTurn: At moveOrSleep you must choose Sleep. The flag clears after sleeping.

Phase details

Phase: turnStart
- Entry
  - currentPlayerUid’s turn begins.
- Entry side effects
  - Clear effects that expire “at the start of your next turn” (e.g., Fairy Dust invisibility). Mark invisibility=false here if it was active.
  - Recompute dynamic capacities from class passives and ongoing effects.
- Allowed actions
  - None (purely automatic), except interrupts that explicitly say “at start of your turn” in item/card rulings (rare). Those map to ItemUse at this phase.
- Process
  - If pendingTile exists:
    - Transition to resolveTile(pending=true). Run full resolve pipeline:
      - resolveTile → combat (if Enemy) → postCombat → capacity.
    - After this pipeline completes, continue to skip check (below).
  - If no pendingTile: proceed.
  - If skipNextTurn > 0:
    - Decrement skipNextTurn by 1 and transition directly to endTurn (turn is skipped).
  - Otherwise: transition to manage.
- Exit conditions
  - To manage, unless retreat ended the turn or skip consumed the turn.
- Guards/validation
  - The only legal external commands here are interrupts explicitly permitted “at start of your turn.”

Phase: manage
- Purpose
  - Free inventory/equipment management and swaps.
- Allowed actions (by current player only)
  - SwapEquip: move items between equipment slots and inventory within capacity rules.
  - InspectTile/Board: UI-only reads.
  - UseItem if the item’s timing includes “on your turn (any phase)” or “at any time.” (See Items Timing doc.)
- Forbidden
  - No movement, no duels launched by current player here; duels handled in preDuel.
- Exit
  - Explicit ContinueToPreDuel by current player.
- Guards
  - Do not allow capacity exceed except transiently during swap resolution; end of phase must be within capacity.

Phase: preDuel
- Purpose
  - Handle optional duels and trades on a shared non-Sanctuary tile before moving/sleeping.
- Preconditions
  - At least one other player shares the same non-Sanctuary tile, otherwise this phase is a no-op and ContinueToMoveOrSleep is legal immediately.
- Allowed actions
  - OfferDuel: can be sent by current player or any co-located player who is not invisible and not on Sanctuary.
  - AcceptDuel / DeclineDuel: target player responds.
  - UseInterrupts:
    - Smoke Bomb: When a duel is offered to you, prevent any duels for the remainder of this turn (sets noDuelsThisTurn flag).
    - Monk Cancel: When offered a duel, roll d6; on 5–6, cancel that duel (once per game).
  - ProposeTrade / AcceptTrade / DeclineTrade (optional in MVP; can be disabled without affecting the phase structure).
- Routing rules
  - If noDuelsThisTurn is set, no new OfferDuel is accepted; proceed to moveOrSleep when current player continues.
  - Only one duel may be active at a time. Queue additional offers; they auto-cancel if any participant moves/leaves or if the turn progresses past preDuel.
  - If a duel is accepted, transition to duel.
- Exit
  - ContinueToMoveOrSleep by current player if no active duel.
- Guards
  - No duels on Sanctuary; reject OfferDuel if tile is Sanctuary.
  - Invisible targets cannot be dueled.

Phase: moveOrSleep
- Purpose
  - The turn’s main choice: Sleep or Move.
- Allowed actions (current player)
  - ChooseSleep: immediately heal to current max HP; then proceed to resolveTile (see below).
  - ChooseMove:
    - RollDie d4 (engine-driven) for movement.
    - If the path has branches, choose neighbor edges one step at a time or as a path selection UI per move.
    - Record full forward path in movementHistory for this turn.
  - Timing windows (interrupts/items)
    - “Before moving” and “after movement but before resolving tile” items apply here (e.g., Instinct, Blink Scroll, Lamp).
- Exit
  - After Sleep, go to resolveTile (you still resolve the tile you are on).
  - After Move, go to resolveTile for the destination tile. Lamp can step you back 1 before resolveTile (see Board spec).
- Guards
  - mustSleepNextTurn forces ChooseSleep (no Move allowed).
  - Movement must follow board edges; movementHistory must append each step.

Phase: resolveTile
- Purpose
  - Resolve the effect of the tile you end on. Used both at turnStart (pending tile) and after moveOrSleep.
- Tile behaviors
  - Treasure: Draw from tile tier; open immediate swap window; then continue to capacity.
  - Chance: Draw and resolve immediately. If movement occurs:
    - If you are moved now during your own turn, resolve tiles immediately (nested) or mark pendingTile? Policy: Resolve immediately for effects that say “move and then …” and obey “Chance effects pushing you around” rule only when movement occurs during another player’s turn. Therefore:
      - During your turn: movement from your own Chance card resolves tiles immediately as part of this resolveTile (may nest other combats).
      - During someone else’s turn: movement defers; it’s recorded as pendingTile to resolve at your next turn’s turnStart.
  - Enemy: Determine composition; transition to combat.
  - Sanctuary: No effect; proceed to capacity.
  - Empty: No effect; proceed to capacity.
  - Final: If you arrive here during your own turn, you win immediately (end game). If multiple arrive from the same single effect resolution, trigger finalBracket immediately.
- Exit
  - To combat if Enemy; otherwise to capacity (unless finalBracket/game end).
- Guards
  - Enforce item/trap/Sanctuary restrictions as defined elsewhere.

Phase: combat (PvE fight)
- Purpose
  - Fight enemies according to the Combat and Duels spec.
- Entry
  - You landed on an Enemy tile via resolveTile (normal or pending-tile route).
- Allowed actions
  - FightRound (engine-driven dice and modifiers).
  - UseCombatItems: items whose timing is “during combat” or “this turn” still active.
  - Retreat: If the current player retreats, immediately move back 6 steps (history-based), end the turn (jump to endTurn). If retreat reduces movementHistory below zero, use reverse-edge algorithm (Board doc).
- Exit
  - If enemies defeated: go to postCombat.
  - If current player at 0 HP: apply Losing rules in postCombat.
  - If retreat by current player: jump to endTurn (bypasses postCombat/capacity).
- Guards
  - Deterministic roll order; simultaneous damage resolution; see Combat spec for priority/timing.

Phase: duel (PvP)
- Purpose
  - Resolve a duel offered during preDuel.
- Allowed actions
  - FightRound (engine-driven dice and modifiers).
  - UseCombatItems and class passives per timing rules.
  - Retreat by either participant:
    - If current player retreats: rewind 6 steps and end their turn (jump to endTurn).
    - If non-current retreats: duel ends; proceed to postCombat with outcome “opponent retreated.” The current player’s turn continues to capacity then back to moveOrSleep? Clarification:
      - Post-duel, you normally proceed to capacity; then return to preDuel (to allow additional duels/trades)? Simpler deterministic rule:
        - After any duel (win/lose/retreat), transition to postCombat → capacity → preDuel (allow additional duels/offers), then the current player may ContinueToMoveOrSleep. This preserves the Step 3 semantics: multiple duels are allowed by mutual consent within the same preDuel phase.
- Exit
  - To postCombat on duel termination (win/lose/retreat/cancel).
- Guards
  - No duels on Sanctuary; invisible players cannot be targeted.
  - Duelist re-roll timing; Monk cancel; Smoke Bomb; see Combat spec.

Phase: postCombat
- Purpose
  - Apply outcome effects and loot, then route to capacity.
- PvE outcomes
  - If player defeated on red tile: move player back 1 tile, set mustSleepNextTurn=true, no item drops, proceed to capacity.
  - If enemies defeated: roll loot drops per enemy by tier; immediate swap window for loot; then capacity.
- PvP (duel) outcomes
  - If a player reaches 0 HP: they remain on tile at 0 HP; winner may loot any/all items; remaining items stay; the downed player must Sleep on their next turn to recover.
  - If retreat or cancel: no loot; combat ends.
  - After any duel: go to capacity, then return to preDuel (allow more duels/trades) unless no co-located players remain; in that case advance to moveOrSleep.
- Exit
  - To capacity.
- Guards
  - Loot order: multi-kill loot resolves in encounter queue order (PvE). See Combat spec for explicit worked examples.

Phase: capacity
- Purpose
  - Enforce slot and inventory capacities. Handle dropped items and co-located pickups.
- Allowed actions
  - Current player:
    - DropToBottom: choose items to drop until within capacity. Dropped items go to the bottom of their tier deck unless otherwise stated.
  - Co-located other players (interrupt window):
    - PickupDroppedItem: may pick up any dropped items before they return to the deck, subject to their capacity. If multiple co-located players attempt to pick up the same item at once, tie-break by seat order, then by action timestamp.
- Exit
  - If invoked from turnStart pending pipeline: proceed to manage.
  - If invoked after postCombat during preDuel loop: return to preDuel if co-located players still share tile; otherwise moveOrSleep.
  - Otherwise (post resolveTile without duel): proceed to endTurn.
- Guards
  - Must end phase with legal capacities for all involved players.
  - Enforce visibility: equipped items are public; inventory pickups/drop by others are logged publicly only as “picked up an item” if hidden; specific names shown if rules require public knowledge.

Phase: endTurn
- Purpose
  - Final cleanup and pass priority to next seated player.
- Side effects
  - Clear “this turn” effect flags (Rage Potion, Agility Draught, etc.).
  - Advance seat index to next player with an active seat.
  - version++ for optimistic concurrency and potential migrations.
- Exit
  - To next player’s turnStart.
- Guards
  - No pending timers in MVP; ensure all transient per-turn state is cleared.

Interrupt: finalBracket
- Trigger
  - Two or more players land on the Final tile from the same single effect resolution.
- Behavior
  - Freeze the normal turn cycle and run a single-elimination bracket in seat order among tied players until one winner remains.
  - Winner is declared immediately and game status becomes ended.
  - If bracket triggers during someone’s turn, that turn ends with the game.
- Guards
  - While in finalBracket, no other actions are processed except bracket controls (AcceptDuel is implicit in the bracket; duels cannot be declined or canceled by Smoke Bomb/Monk cancel).

Transition summary (without tables)
- turnStart
  - If pendingTile: resolveTile(pending) → [combat?] → postCombat → capacity → manage
  - Else if skipNextTurn > 0: decrement and → endTurn
  - Else → manage
- manage → preDuel (by current player’s continue)
- preDuel
  - If duel accepted → duel
  - Else on continue → moveOrSleep
- duel → postCombat → capacity → preDuel (if co-located players present) else → moveOrSleep
- moveOrSleep → resolveTile
- resolveTile
  - If Final and single arrival → game end
  - If Enemy → combat → postCombat → capacity → endTurn
  - Else → capacity → endTurn
- postCombat → capacity
- capacity
  - If from turnStart pending pipeline → manage
  - Else if after duel and still co-located opponents → preDuel
  - Else → endTurn
- endTurn → nextPlayer.turnStart

Validation rules per phase (selected)
- turnStart
  - pendingTile may only exist if the movement that created it happened during another player’s turn.
  - If skipNextTurn consumed, no other actions this turn.
- manage
  - Swaps must end within capacity; cannot drop to bottom here (dropping only at capacity).
- preDuel
  - No duels on Sanctuary; invisible cannot be targeted.
  - Only participants on the same tile may be involved.
- moveOrSleep
  - mustSleepNextTurn prohibits Move.
  - MovementHistory must reflect exact steps; no branch skipping.
- resolveTile
  - Only the destination tile is resolved (pass-over triggers like Ambush are handled by Board/Items specs).
  - Chance movement during your turn resolves immediately; during others’ turns defers to pendingTile.
- combat/duel
  - Round order, simultaneous resolution, and modifiers follow Combat spec.
  - Retreat by current player ends turn immediately.
- postCombat
  - Apply defeat and loot strictly per spec; loot sequence deterministic.
- capacity
  - Must reach legal capacities; co-located pickups must not exceed picker’s capacity.
  - If multiple pickup requests race, resolve deterministically (seat order, then timestamp).
- endTurn
  - Clear all “this turn” flags; do not clear “until your next turn starts” flags (these clear at next turnStart).

Action windows and timing anchors
- Start of your turn: turnStart before pendingTile pipeline begins; items that say “at the start of your turn” can be used here.
- PreDuel: when a duel is offered, Smoke Bomb and Monk Cancel can fire as interrupts.
- Movement timing:
  - Before movement: eligible items (e.g., Instinct pre-move).
  - After movement but before resolving tile: Lamp, Blink Scroll, Instinct post-move (subject to item rules).
- During combat/duel: “during combat” and “this turn” items; Duelist re-roll; Monk cancel only on offer (not during rounds).
- Immediate swap: on drawing/looting Treasure during resolveTile/postCombat; swap only.
- Capacity: drop and co-located pickups.

Reducer sketch (pseudo-logic)
- advance(state):
  - switch (state.phase):
    - case turnStart:
      - clearStartOfTurnFlags()
      - if (pendingTile) runPendingPipeline() // resolveTile → combat? → postCombat → capacity
      - if (skipNextTurn > 0) { skipNextTurn--; return to endTurn }
      - return manage
    - case manage:
      - on ContinueToPreDuel → preDuel
    - case preDuel:
      - on OfferDuel (valid) queue or start duel
      - on AcceptDuel → duel
      - on DeclineDuel → remain preDuel
      - on ContinueToMoveOrSleep → moveOrSleep
    - case duel:
      - resolve rounds / retreat / end → postCombat
    - case moveOrSleep:
      - on ChooseSleep → heal → resolveTile(currentTile)
      - on ChooseMove → roll d4 → move steps (record history) → allow Lamp/Blink/etc → resolveTile(dest)
    - case resolveTile:
      - switch tile.type:
        - Treasure → draw → immediateSwap → capacity
        - Chance → resolve effects (if movement during own turn: immediate; else set pendingTile) → capacity
        - Enemy → combat
        - Sanctuary/Empty → capacity
        - Final → finalize game or finalBracket if applicable
    - case combat:
      - resolve to postCombat or endTurn on retreat
    - case postCombat:
      - apply outcomes/loot → capacity
    - case capacity:
      - if in pending pipeline → manage
      - else if after duel and still co-located opponents → preDuel
      - else → endTurn
    - case endTurn:
      - clearEndOfTurnFlags()
      - nextPlayer.turnStart

What clears when
- At turnStart
  - Invisibility from Fairy Dust (“until your next turn starts”).
  - Per-turn counters that renew at start (e.g., “once per turn” internal flags).
- At endTurn
  - “This turn” effects (Rage Potion, Agility Draught) and combat-only modifiers.
  - noDuelsThisTurn from Smoke Bomb.
  - Immediate-use windows close.
- Persistent flags
  - mustSleepNextTurn remains until consumed at moveOrSleep.
  - Wardstone persists until it prevents damage.
  - Ambush/Trap placements persist until triggered or removed (see Items doc).

Edge cases and rulings
- Chance movement during your turn vs others’ turns
  - During your own turn, resolve resulting tiles immediately (which may chain into fights). During another’s turn, set pendingTile and defer resolution to your next turnStart (except for Final tile tie-bracket, which triggers immediately).
- Lamp timing
  - If your turn would end on a tile with a player or an enemy, you may step back 1 BEFORE resolving that tile. Implement this as an interrupt window between movement end and resolveTile entry.
- Simultaneous arrival at Final
  - Handled immediately via finalBracket; does not wait for pending-tile resolution.
- Retreat interactions
  - Current player retreats: jump directly to endTurn; do not run postCombat or capacity.
  - Non-current retreats from duel: current player proceeds to postCombat → capacity → back to preDuel or moveOrSleep as applicable.
- Sleep on Enemy tile
  - Heal first, then fight. If you lose, you move back 1 and mustSleepNextTurn=true.

Per-phase allowed client actions (names for reference; exact payloads live in Actions doc)
- manage: SwapEquip, UseItem, ContinueToPreDuel
- preDuel: OfferDuel, AcceptDuel, DeclineDuel, ProposeTrade, AcceptTrade, DeclineTrade, UseItem (Smoke Bomb), MonkCancel
- moveOrSleep: ChooseSleep, ChooseMove, ChooseBranch (when prompted), UseItem (Instinct/Blink/Lamp where legal)
- resolveTile: ConfirmDraw, UseItem (Luck Charm as interrupt on Chance), ResolveChance, ConfirmTreasureSwap
- combat: CommitRoll (engine-driven), UseItem, Retreat
- duel: CommitRoll (engine-driven), UseItem, Retreat
- postCombat: AssignLoot (if choice exists), Confirm
- capacity: DropToBottom, PickupDroppedItem, Confirm
- endTurn: Auto; no client action required (engine advances)

Determinism and ordering
- All RNG operations are engine-driven in a fixed order and audited (see RNG doc).
- If two or more players may act in a shared window (preDuel offers, capacity pickups), ordering is:
  - First by phase-defined priority (e.g., you can’t pick up before the current player drops).
  - Then by server-received timestamp.
  - Ties by seat order (ascending).

Worked micro-traces
- Start-of-turn pending fight
  - You were moved onto an Enemy tile by Earthquake during Alice’s turn. Your turnStart runs resolveTile(pending) → combat → postCombat → capacity → manage → preDuel → moveOrSleep …
- Sleep on Enemy tile
  - You ChooseSleep on an Enemy tile → heal to max → resolveTile sees Enemy → combat → postCombat → capacity → endTurn.
- Duel loop
  - manage → preDuel: Bob offers you a duel; you accept → duel → you win → postCombat (no loot unless HP to 0) → capacity → preDuel (still co-located; you could duel again) → continue → moveOrSleep.

Implementation notes
- Represent whether capacity phase was invoked from a pending-tile pipeline to route back to manage.
- Track per-turn flags: noDuelsThisTurn, mustSleepNextTurn, skipNextTurn, usedDuelistRerollThisDuel, usedMonkCancel, invisibility, turnBuffs.
- Ensure resolveTile is idempotent; if a client retries Confirm on the same step, dedupe by phase+step token.
