Title: ITEMS_INVENTORY_AND_TIMING.md
Version: 1.0

Purpose
- Define slot rules, capacities, swap windows, and play timings for all items.
- Clarify visibility and logging for equipped vs hidden inventory.
- Specify Sanctuary restrictions, trap/ambush interactions, and item-specific rulings.
- Provide deterministic timing windows and pseudo-logic so the engine and UI can validate plays consistently.

1) Glossary and item categories
- Categories
  - Wearable: armor/cloaks that modify Defense and/or movement roll. Must be equipped to apply.
  - Holdable: weapons/shields/talismans that modify Attack/Defense and/or special rules. Must be equipped to apply.
  - Small: single-use or passive trinkets. Kept in Bandolier; may be interrupts or passives.
  - Drinkable: single-use potions and consumables. Kept in Bandolier.
- Visibility
  - Equipped: always public to all.
  - Inventory (Bandolier, Backpack): hidden from other players unless a play must be public (most are public; “hidden use” only if card text explicitly allows).
- Turn steps reference (canonical)
  1. turnStart: resolve pending tile (if moved on another’s turn).
  2. manage: equipment swaps and stash/equip.
  3. preDuel: duel offers and trades on shared non-Sanctuary tiles.
  4. moveOrSleep: choose sleep or roll d4 and move.
  5. resolveTile: resolve the tile you end on.
  6. capacity: enforce inventory caps (others may pick dropped items if co-located).
  7. endTurn: advance seat; clear per-turn flags.

2) Slots and capacities
- Equipped slots
  - 1 Wearable
  - 2 Holdables
- Inventory capacity
  - Bandolier: 1 slot for Drinkable or Small
    - Alchemist passive: Bandolier holds 2 (not 1).
  - Backpack: 1 slot for Wearable or Holdable
    - Porter passive: Backpack holds 2 (not 1).
- Where items can live
  - Wearable: Equip slot or Backpack only.
  - Holdable: Equip slot or Backpack only.
  - Small: Bandolier only (cannot be equipped; no effect from Backpack).
  - Drinkable: Bandolier only.
- Invariants
  - You cannot use an item that is not in a legal container (e.g., Drinkable from Backpack is illegal).
  - Passive bonuses from Wearable/Holdable apply only while equipped.
  - Inventory must be within capacity at end of your turn (Step 6).

3) Swap windows and arrangement rules
- Free swap window
  - Step 2 (manage): You may freely move items between equipped slots and inventory (within slot rules), including unequip/equip/swap/drop to tile (but drops finalize at Step 6).
- Immediate arrangement window on draw/loot
  - When you draw or loot a Treasure in Step 5, you may immediately rearrange to fit it:
    - You may equip it, stash it (Bandolier/Backpack if legal), or initiate a swap with currently equipped/inventory items.
    - This is a one-time atomic arrangement specific to that draw/loot and ends once you confirm. You cannot open a general swap after that (except Step 2 next turn).
- Outside your turn
  - No equipping or rearranging except the co-located pickup window (see capacity enforcement). Outside-turn pickups must obey capacity without rearranging equipped slots.

4) Capacity enforcement and drop/pickup policy
- When enforced
  - Step 6 of your turn.
- Enforcement logic
  - If you exceed any capacity, you must drop items until all capacities are satisfied.
  - Dropped items go to a temporary “tile drop pool” for your current tile.
- Co-located pickup window
  - If other players share your tile at Step 6:
    - In seating order starting with the next player after you, each may pick from the tile drop pool.
    - They may only pick items if they have capacity immediately; they cannot rearrange equipped slots (no Step 2 for them). They may stash in Backpack/Bandolier if legal.
    - After each player chooses, repeat for the next co-located player. Continue round-robin until all pass or the pool is empty (MVP: one pass ends that player’s chance this Step).
  - After the pickup window, any remaining items return to the bottom of their originating Treasure tier deck (unless a card specifies otherwise).
- Special case: dropping during Step 2
  - You may voluntarily discard to the bottom of the matching deck at Step 2 to make room. Co-located players do NOT get a pickup window for voluntary Step 2 discards; pickups only occur during Step 6 over-capacity resolution or as a card effect that explicitly drops to tile.

Pseudo-logic: capacity enforcement
```
function enforceCapacity(activePlayer, tileDropPool, coLocatedPlayersInSeatOrder) {
  // 1) Active player must select drops until under capacity
  const over = getOverages(activePlayer);
  while (over.exists()) {
    const itemId = activePlayer.chooseItemToDrop(over);
    moveItemToTilePool(activePlayer, itemId, tileDropPool);
  }

  // 2) Co-located pickup window
  for (const uid of coLocatedPlayersInSeatOrder) {
    let picked = false;
    do {
      const pickable = tileDropPool.filter(item => playerHasCapacity(uid, item));
      const choice = askPickOneOrPass(uid, pickable);
      if (choice.type === 'pick') {
        moveItemToInventory(uid, choice.item, preferLegalContainer(uid, choice.item));
        picked = true;
      } else {
        picked = false;
      }
    } while (picked);
  }

  // 3) Return leftovers to bottom of respective tier deck
  for (const item of tileDropPool.remaining()) {
    returnItemToTierBottom(item);
  }
}
```

5) Use timing model (global)
- Use windows for items
  - On your turn, any time: Bandolier items (Drinkable, Small) unless the card text further restricts timing (e.g., “before choosing Sleep,” “before resolving your tile”).
  - Interrupts: Some Smalls explicitly play off-turn when their trigger occurs (e.g., Luck Charm, Smoke Bomb).
  - Before resolving your tile: Window exists after movement ends but before Step 5 tile resolution; used by Lamp checks and Blink Scroll.
  - During combat/duel: Only items whose text explicitly affects combat/duel can be used at that time. Equipping during combat is not allowed.
- Duration definitions
  - “This turn”: clears at endTurn for the current player, after Step 6.
  - “Next movement roll”: persists until the next time you roll for movement in Step 4; can carry across turns if you Sleep or otherwise don’t roll.
  - “Until your next turn starts”: clears at turnStart for that player (Step 1), or earlier if explicitly stated (e.g., if moved by any effect).
- Sanctuary restrictions (global)
  - You cannot place Traps or Ambush on Sanctuary tiles.
  - You may still use other items on Sanctuary (e.g., potions), but no duels can be initiated there.

6) Item timing and rulings by card
Notes:
- Unless a card says “play any time,” Bandolier items are usable during your turn only.
- Unless a card says otherwise, using an item reveals its name in the log.

Wearables (passive, when equipped)
- Robe (+1 Defense), Heirloom Armor (+2 Defense), Royal Aegis (+3 Defense, −1 movement)
  - Timing: Equip/unequip only during Step 2 or immediately when drawn/looted.
  - Effects apply continuously while equipped.
  - Movement penalties/bonuses stack additively with other movement modifiers (see Movement modifiers below).

Holdables (passive, when equipped)
- Dagger/Crude Axe (+1 Attack), Lord’s Sword (+2 Attack), Dragonfang Greatsword (+3 Attack)
- Wooden Shield (+1 Defense), Silver Shield (+2 Defense)
- Boogey-Bane (+2 Attack vs creatures only)
  - Timing: Equip/unequip only during Step 2 or immediately when drawn/looted.
  - Effects apply only while equipped.
  - “Vs creatures only” applies to PvE fights, not duels.

Drinkables (Bandolier; on your turn)
- Beer: Heal 3 HP; −1 to your next movement roll
  - When: Your turn, any step before you roll movement if you want the −1 to affect this turn; healing may be used any time.
  - Duration: Healing immediate; −1 persists until your next movement roll (can carry over to a future turn).
  - Logging: Public (name shown).
- Agility Draught: +1 to all your Defense rolls this turn
  - When: Your turn, any time. Applies to all Defense rolls this turn, including duels/fights this turn.
  - Alchemist: Also applies to the first round of any combat started on this turn if used before the fight begins.
  - Logging: Public.
- Rage Potion: +1 to all your Attack rolls this turn
  - When/Duration: Same as Agility Draught.
  - Alchemist: Same extension to first combat round if used before entering the fight.
- Essence of the Mysterious Flower: Fully heal to max
  - When: Your turn, any time; before or after movement is allowed.
  - Logging: Public.

Smalls (Bandolier; mix of on-turn and interrupts)
- Lamp: If your turn would end on a tile with a player or an enemy, you may step back 1 tile before resolving that tile
  - When: Your turn only, immediately after your movement ends and before tile resolution (Step 5).
  - Trigger: Ending position contains any enemy (red tile with queued enemies) or any other player.
  - Effect: Move back exactly 1 tile along the path you just traversed (use movement history).
  - Chain use: If after stepping back you still would end on a tile with a player or an enemy, the condition occurs again; you may choose to step back again (repeat as needed), bounded by your movement history (cannot go before Start).
  - Interactions:
    - Ambush: Ambush triggers on entering the tile during movement before the Lamp window; Lamp cannot retroactively avoid an already-triggered Ambush.
    - Sanctuary: Allowed to step off or onto Sanctuary (you affect yourself). Sanctuary rules don’t block Lamp.
    - Combat: If you Lamp off an Enemy tile, you avoid starting that fight.
  - Logging: Public (show that Lamp was used and new tile).
- Trap: Place on your current non-Sanctuary tile; next player who lands here skips their next turn (visible)
  - When: Your turn only, any step while you are on a non-Sanctuary tile.
  - Placement: One Trap per tile (MVP rule to avoid stacking). If a tile already has a Trap, placement is illegal.
  - Trigger: The next player (any, including you) who lands on that tile via movement or effects loses their next turn, then the Trap is removed.
  - Scout: May pick up a Trap they step onto instead of triggering it, if they have Bandolier capacity; if no capacity, they may not pick it up and may choose whether to trigger it or not? Ruling: If no capacity, Scout may still choose to pick up and immediately drop something at Step 6; but the skip-turn happens only if they choose not to pick up.
  - Disposition: After triggering or being picked up, the Trap is discarded to T1 discard (reshuffle when empty).
  - Logging: Placement is public; triggering shows victim.
- Luck Charm: Cancel a Chance card you just drew or another player just revealed; play immediately as an interrupt; then return to bottom of T1
  - When: Interrupt window on Chance reveal (own or others’). Can be off-turn.
  - Target: Exactly one Chance card at the moment it is revealed, before it resolves.
  - Resolution: The canceled card is moved to Chance discard (normal) and Luck Charm returns to bottom of T1.
  - Logging: Public (both card names shown). This is not a “hidden use.”
- Fairy Dust: Use before choosing Sleep; you become invisible to other players until your next turn starts or if any effect moves you; cannot be dueled while invisible
  - When: Step 4, before declaring Sleep. If you choose Move, you cannot play Fairy Dust this turn.
  - Effect: While invisible, other players cannot initiate a duel with you; Ambush targeting you is disabled; you can still move and resolve tiles normally. If any effect moves you (including Chance), invisibility ends immediately.
  - End: Clears at the start of your next turn (Step 1) or upon any movement caused by any effect (including your own items).
  - Logging: Public that you became invisible; suppress targetability checks.
- Smoke Bomb: When someone offers a duel to you, play to prevent any duels for the remainder of the current turn; return to bottom of T2
  - When: Interrupt on being offered a duel (Step 3 on that player’s turn). Can be off-turn.
  - Effect: Prevent any duels from starting for the rest of the current turn (global duels lockout).
  - Scope: Does not cancel a duel already in progress; prevents new offers. Does not affect PvE fights.
  - Final tile tie-breaker: Does not prevent the mandatory bracket (no “offer” exists there); Smoke Bomb cannot be used to avoid final tie-break duels.
  - Disposition: Returns to bottom of T2.
  - Logging: Public.
- Blink Scroll: Move yourself +2 or −2 tiles before resolving your tile; ignore pass-through effects; cannot move into or out of Sanctuary if a card/effect would force you
  - When: Before resolving your tile. Windows:
    - Your turn: after movement ends and Lamp windows have resolved/declined, but before Step 5 tile resolution.
    - TurnStart pending-tile: at Step 1, before resolving the pending tile moved onto last turn.
  - Direction:
    - +2 forward along directed edges; if multiple branch choices exist, you choose the path as if moving.
    - −2 backward using your movement history stack for the prior steps; once history exhausts, continue along reverse edges (see movement spec).
  - Pass-through ignores: Do not trigger Ambush, Traps, or “pass-over” effects on the intermediate tile. Only the destination tile is considered for resolution.
  - Sanctuary restriction: You may not enter or exit a Sanctuary tile due to Blink (the card/effect restriction). If both +2 and −2 routes would force crossing into or out of Sanctuary, the play is illegal.
  - Logging: Public.
- Wardstone: The next time you would lose HP, prevent 1 HP loss, then discard
  - When: Automatic trigger the next time you would lose HP from any source (combat, Chance, items). Can trigger off-turn.
  - Choice: No choice; it auto-fires. If you hold multiple Wardstones, only one fires per damage instance.
  - Scope: Prevents only 1 HP of loss per instance; excess damage still applies.
  - Disposition: When triggered, discard to T3 discard.
  - Logging: Public that “a Wardstone prevented 1 HP” (by rule; not hidden).
- Velvet Cloak: Wearable with +1 to movement roll (passive while equipped)
  - Movement modifier: stacks with other movement modifiers.
  - See movement modifiers below.

7) Movement modifiers and stacking
- Movement die is d4. Bonuses and penalties are additive to this single result.
- Known modifiers
  - Velvet Cloak: +1 to movement (equipped).
  - Royal Aegis: −1 to movement (equipped).
  - Beer: −1 to your next movement roll (consumed).
- Stacking rules
  - Add all relevant modifiers to the d4 result.
  - Minimum movement after modifiers: 1. Movement cannot be reduced below 1 unless a card explicitly says “do not move.” This prevents degenerate “stay on tile” loops from stacking negatives.
  - Apply modifiers before any Lamp/Blink decisions.
- Logging
  - Log the d4, each modifier source, and the final movement result.

8) Combat/duel item use windows (summary)
- Allowed during your turn’s combat/duel (if started this turn)
  - “This turn” potions (Rage, Agility) used before combat will apply. If used mid-combat, they apply from the next roll onwards in that turn (MVP: apply immediately for simplicity if used prior to Round 1; otherwise apply starting next round).
  - Equipping during combat is illegal.
- Allowed during an opponent’s turn’s duel with you
  - Only interrupts that explicitly allow off-turn use (e.g., Smoke Bomb to stop the duel from starting; but once a duel started, Smoke Bomb does nothing).
  - Wardstone triggers automatically when you would lose HP.
  - Luck Charm does nothing (unless a Chance reveal occurs mid-turn; rare).
- Alchemist passive
  - If a “this turn” potion was used before entering a combat on the same turn, its +Attack/+Defense also applies to your first round of that combat, then it continues to apply for the rest of your turn as normal, as long as the duration hasn’t ended.

9) Sanctuary-specific rules for items
- Illegal on Sanctuary tiles
  - Trap placement.
  - Ambush placement (Chance card).
- Legal on Sanctuary tiles
  - All other item plays (potions, Lamp, Blink, etc.), subject to their own restrictions.
- Duels
  - No duels can be initiated on Sanctuary, so Smoke Bomb has no trigger there.
  - Cards that move yourself (Blink) are still legal, but Blink cannot force you into/out of Sanctuary.

10) Pending tile at turnStart and item plays
- If you were moved onto a tile by someone else’s effect, you resolve that tile at Step 1 of your next turn.
- Before resolving that pending tile at Step 1:
  - You may use “before resolving your tile” items (Blink) and perform Lamp checks (Lamp is your turn only; applicable at Step 1).
  - You may use potions “on your turn any time” (Beer, Rage, Agility, Essence).
  - You may not open the Step 2 swap window until after Step 1 completes.

11) Validation rules and engine checks
- Legality filters
  - Container legality: Items must be in legal containers to be used (e.g., Drinkable in Bandolier).
  - Timing legality: Action must be in a valid window per item text and turn step.
  - Target legality: E.g., Trap placement requires current tile non-Sanctuary and has no existing Trap.
  - Movement legality: Blink cannot cross into/out of Sanctuary; Lamp requires player/enemy on the landing tile; Lamp steps must follow movement history.
  - Capacity legality: Pickups during co-located window require immediate capacity.
- Idempotency
  - Interrupts hook into specific event ids (e.g., ChanceReveal#id). Once resolved, replays of the same interrupt against the same id must be ignored.

12) Logging rules (items)
- Public vs hidden
  - All items listed above log their name on use except where a card explicitly allows hidden use. In the current catalog, none of the Treasure items allow hidden use by text; Wardstone is public when it triggers; Luck Charm/Smoke Bomb/Lamp/Blink/Traps/Fairy Dust all log their names.
- Standard fields
  - ts, actorUid, itemId, itemName, actionType (Used/Equipped/Unequipped/Placed/Triggered), payload (healed, prevented, movement deltas, destination tile), message.

13) Worked examples (legal and illegal)
- Legal
  - During Step 2, you unequip Wooden Shield, equip Silver Shield, and move Wooden Shield to Backpack.
  - You land on Treasure t2, draw Lord’s Sword, immediately swap out Dagger from Holdable slot to Backpack to equip Lord’s Sword.
  - You roll d4=3 while wearing Royal Aegis (−1) and Velvet Cloak (+1) and having drunk Beer (−1). Net: 3 −1 +1 −1 = 2. Move 2.
  - You end on an Enemy tile. Before resolving the tile, you Lamp back 1 to avoid the fight. The previous tile is Sanctuary; Lamp is allowed.
  - Opponent reveals “Cave-in” from Chance. You play Luck Charm immediately; the Cave-in is canceled; your Charm goes to bottom of T1.
  - Opponent offers you a duel on their turn. You play Smoke Bomb; no duels may start for the rest of their turn.
  - At Step 1 (turnStart), you were moved onto an Enemy tile by Earthquake last turn. You drink Agility Draught now (your turn), then Blink −2 before resolving; you avoid that Enemy tile entirely.
  - You place a Trap on your current non-Sanctuary tile during Step 2. The next player who lands there later skips their next turn; Trap is discarded.
  - As Scout, you step onto a trapped tile and choose to pick up the Trap instead of triggering it (you have Bandolier space).
- Illegal
  - Equipping a new weapon in the middle of combat.
  - Using Fairy Dust after choosing Move (it requires “before choosing Sleep”).
  - Placing a Trap on a Sanctuary tile, or on a tile that already has a Trap.
  - Using Blink to enter or exit a Sanctuary tile (forbidden by the card).
  - Using Lamp on someone else’s turn (it’s “your turn would end on a tile…” only).
  - Picking up an item from someone’s Step 6 drops when you have no capacity and attempting to rearrange equipped slots off-turn.
  - Using Beer stored in Backpack (Drinkable must be in Bandolier).
  - Attempting to Smoke Bomb the final-tile duel bracket.

14) Edge cases and rulings
- Lamp vs Ambush
  - Ambush (Chance card) triggers immediately upon entering the tile during movement, before the Lamp window. If Ambush fires, Lamp cannot be used to step back to avoid that duel.
- Lamp chaining safety
  - You may chain Lamp steps as the condition repeats. You cannot Lamp past Start. After Lamp finishes, resolve the tile you finally end on.
- Movement history and Blink/Lamp
  - Lamp −1 always uses your immediate prior step from the current movement. Blink −2 uses your stored movement history stack (and reverse edges when exhausted). Neither triggers pass-over effects for the skipped tiles (Blink explicitly; Lamp steps back 1 and immediately resolves the new tile).
- Multiple Wardstones
  - Only one Wardstone triggers per damage instance. The engine consumes the earliest-acquired one first (stable order) for determinism.
- “This turn” potions used mid-combat
  - If used after Round 1 begins, they apply starting with the next roll in that combat, and to the rest of your turn (engine may implement “apply immediately next roll” for simplicity).
- Beer −1 expiration
  - Persists until the next time you roll for movement in Step 4. It does not expire at endTurn if you did not roll this turn.
- Movement minimum
  - Movement after modifiers is floored at 1 unless a card says “do not move.”
- Co-located pickups vs Sanctuary
  - Co-located pickups at Step 6 are allowed on Sanctuary tiles (Sanctuary forbids duels/traps, not item exchange).

15) Engine-facing timing API (events to hook interrupts)
- Events to expose
  - AboutToChooseSleepOrMove(playerId)
  - AboutToRollMovement(playerId)
  - MovementRolled(playerId, roll, modifiers, result)
  - AboutToResolveTile(playerId, tileId, reason: 'movement' | 'pendingTile' | 'blink' | 'lamp')
  - ChanceRevealed(actorId, cardId, instanceId)
  - DuelOffered(attackerId, defenderId, tileId, instanceId)
  - DamageWouldBeApplied(targetId, amount, source)
  - ItemDrawn(playerId, itemId, tier, instanceId)
  - OverCapacityCheck(playerId)
- Interrupts mapping
  - Luck Charm: on ChanceRevealed
  - Smoke Bomb: on DuelOffered
  - Wardstone: on DamageWouldBeApplied
  - Blink: on AboutToResolveTile (self-only)
  - Lamp: on AboutToResolveTile (self-only; auto-check condition)
  - Fairy Dust: on AboutToChooseSleepOrMove (before selecting Sleep)
- Determinism
  - Each interrupt binds to a specific event instanceId for idempotency.

16) Minimal UI prompts (to connect to UI contract)
- Step 2 manage: show Equip/Unequip/Move to Backpack/Bandolier/Drop controls; show class capacity mods.
- On draw/loot: present inline “Arrange to fit” dialog with legal spots highlighted and illegal grayed out.
- Before tile resolution: If Lamp condition true, prompt “Use Lamp to step back 1?”; show Blink button if available.
- Off-turn interrupts:
  - On another player’s Chance reveal: flash “Play Luck Charm?” if you have it.
  - On duel offer to you: flash “Play Smoke Bomb?” if you have it.
- Step 6: drop picker for the active player; pickup window for co-located players showing current capacity limits.
- Wardstone: no prompt needed; show toast/log when it triggers.

17) Test hooks (see TEST_PLAN for full scenarios)
- Given/When/Then cases to include
  - Arrange-to-fit on draw with full Bandolier/Backpack.
  - Lamp chain back through two tiles (both with players), then resolve a third.
  - Blink −2 over a trapped tile (no pass-over trigger), landing on Sanctuary should be blocked.
  - Smoke Bomb prevents a second duel attempt in the same turn.
  - Luck Charm cancels Earthquake; verify no movement occurs.
  - Wardstone prevents 1 damage from Sprained Wrist Chance.
  - Capacity enforcement with two co-located players picking in seat order.
  - Beer −1 persisting across a turn where you Slept.

18) Open questions to finalize (flagged for future revisions)
- Scout picking up a Trap with no Bandolier space: current ruling allows picking it up and resolving over-capacity at Step 6; confirm desired UX (or require space to pick).
- Movement minimum floor: set at 1 in this document. If design wants zero-move outcomes, update here and in movement spec.
- Immediate apply of “this turn” potions mid-combat: we selected “next roll onward” for clarity; confirm with combat spec.
