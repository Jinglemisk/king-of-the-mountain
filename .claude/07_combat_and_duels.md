docs/COMBAT_AND_DUELS.md

Version: 1.0 (aligned to GDD v1.0)

Purpose
- Specify exact, testable rules for PvE combat and PvP duels.
- Define timing windows, modifier stacking, multi-enemy targeting, retreat behavior, defeat outcomes, loot generation, and special cases (Duelist re-roll, Monk cancel, Lamp, tie-at-final bracket).
- Provide deterministic dice/RNG consumption order compatible with docs/RNG_AND_SHUFFLING.md.
- Include worked examples that the test suite must pass.

Glossary
- Combatant: Player or Enemy participating in combat or a duel.
- Fight: Player vs Enemies on a red tile (PvE).
- Duel: Player vs Player on a shared non-Sanctuary tile (PvP).
- Round: One simultaneous exchange of rolls and damage across all active pairs.
- Target: The enemy selected by the player to attack that round.
- Queue order: The order enemies were spawned/queued on the tile (first draw at index 0).
- “This turn” potion: A Drinkable that provides modifiers for the remainder of your current turn (e.g., Rage Potion, Agility Draught).

1. High-level rules
- Combat is simultaneous: Attack and Defense dice are rolled, then damage is computed simultaneously for all relevant comparisons.
- Damage per comparison is always 1 HP on a strict greater-than check (Attacker Attack > Defender Defense).
- There are no critical hits, multi-damage hits, or damage overflow.
- The player’s base HP max is 5 unless altered by items.
- Bonuses are additive to a single die result (never add extra dice).
- Unless an effect says otherwise, you only attack one enemy per round in PvE.
- Retreat is allowed from both fights and duels.
- Sanctuary exception: No duels can be initiated on Sanctuary tiles.
- Lamp exception: Lamp may prevent a fight/duel from starting (pre-resolution) but cannot be used once a fight/duel has already begun.

2. Dice and RNG consumption order (deterministic)
- Dice source and audit are covered in docs/RNG_AND_SHUFFLING.md. This section defines consumption order so replays reproduce exactly.

Single-enemy fight, per round:
1) Player Attack d6
2) Player Defense d6
3) Enemy Attack d6
4) Enemy Defense d6

Multi-enemy fight, per round:
- Player selects one target (by index in enemy queue).
- For each round:
  1) Player Attack d6
  2) Player Defense d6
  3) For each enemy in queue order (index 0..n-1):
     - Roll Enemy Attack d6 (for all enemies)
  4) Roll Defense d6 only for the targeted enemy

Duel (PvP), per round:
1) Attacker (the player whose turn it is) Attack d6
2) Attacker Defense d6
3) Defender Attack d6
4) Defender Defense d6
5) If Duelist re-roll is invoked on Defender’s Defense, consume 1 additional d6 for that re-roll

Notes:
- If any re-roll effects (e.g., Duelist) apply, they consume dice immediately at the time of re-roll.
- If a round is canceled by retreat after dice were rolled, those rolls are still recorded in rngAudit but do not apply to HP (see retreat timing below).
- In multi-enemy fights, only the targeted enemy rolls Defense. All enemies roll Attack.

3. Modifiers and stacking (Order of Operations)
3.1 Categories
- Class passives (always-on):
  - Hunter: +1 Attack vs creatures (fights only)
  - Guardian: +1 Defense vs creatures (fights only)
  - Duelist: +1 Attack in duels; once per duel, may re-roll your Defense die
  - Alchemist: +1 Bandolier capacity (inventory doc); Potions: +1 heal after caps; “this turn” potion effects also apply to the first round of any combat started the same turn if used before the fight starts
  - Porter: +1 Backpack capacity (inventory doc)
  - Scout: Ignore Traps/Ambushes (Movement/Items doc)
  - Raider: Post-victory loot roll (see end of combat/duel)
- Equipment and items:
  - Attack bonuses (e.g., Dagger +1, Lord’s Sword +2, Dragonfang +3, Boogey-Bane +2 vs creatures only)
  - Defense bonuses (e.g., Wooden Shield +1, Silver Shield +2, Heirloom Armor +2, Royal Aegis +3)
  - Wards/interrupts (Wardstone: prevent 1 HP loss, then discard)
  - “This turn” potions (Rage Potion +1 Attack rolls this turn; Agility Draught +1 Defense rolls this turn)
- Temporary effects/status:
  - “This turn” windows end at endTurn.
  - Invisibility from Fairy Dust affects only dueling eligibility, not combat math.

3.2 Stacking and application
- All applicable bonuses are additive and stack unless they contradict capacity/uniqueness rules (e.g., you can benefit from two equipped Attack-boosting Holdables since you have 2 Holdable slots).
- Vs creatures/enemies only: Apply only in fights (PvE), not in duels.
- “This turn” potions:
  - Apply to all relevant dice rolls for the current turn.
  - Can be used at any time during YOUR turn. They are not “play any time” unless explicitly marked; therefore, if you are the defender in a duel on someone else’s turn, you cannot use non-interrupt Drinkables then (Smoke Bomb is explicitly an interrupt).
  - Alchemist extension: If used before a fight/duel starts, the potion’s effect also applies to the first combat round of that fight/duel; if used mid-combat, it applies to remaining rounds this turn.
- Wardstone:
  - The next time you would lose HP from any source (combat or duel), prevent 1 HP loss and discard Wardstone. If multiple simultaneous HP losses would occur (e.g., multi-enemy attacks), you prevent exactly 1 HP loss; the owner chooses which loss to prevent after seeing all comparisons for that round but before applying HP changes.
- Compute each rolled value as:
  - Attack = d6 + (sum of Attack item bonuses) + (class passive vs. appropriate target) + (this turn Attack effects)
  - Defense = d6 + (sum of Defense item bonuses) + (class passive vs. appropriate target) + (this turn Defense effects)
- There is no cap on Attack/Defense other than integer bounds.

3.3 Timing windows overview
- Pre-combat start window:
  - Before a fight/duel starts, the current player may use permitted items/effects (e.g., Rage Potion, Agility Draught). If Alchemist, these pre-start buffs extend to the first round of the upcoming combat.
  - Lamp can be used here to step back 1 tile before resolving a red tile or before dueling on a shared tile with a player (thus aborting the upcoming fight/duel).
  - Smoke Bomb may be played when a duel is offered to you to prevent any duels for the remainder of the current turn (return to bottom of T2).
- Round windows:
  - Start of round (before any dice): either participant may declare retreat.
  - After dice are rolled but before damage is applied:
    - Defender Duelist may choose to re-roll their Defense die once per duel.
    - Wardstone holder chooses which single HP loss to prevent (if any).
    - Either participant may declare retreat; if declared now, cancel the entire round’s damage application.
  - After damage is applied:
    - Remove 0-HP enemies immediately.
    - Check end conditions (combat end, loot rolls).
- End of combat window:
  - If the player won a fight or duel, Raider may roll for bonus Treasure (see Raider passive in 7.4).
  - Capacity enforcement and item pickup/loot are handled in postCombat/capacity phases later in the turn/phase machine.

4. Fights (PvE)
4.1 Start and spawning
- When a player enters an Enemy tile:
  - If no enemy queue is present on that tile, draw composition according to tile tier and place a queue on the tile (see Content Catalog and RNG doc).
  - If an enemy queue already exists (e.g., multiple players converged; or a pending spawned queue), use that queue; enemy HP is tracked per-combat instance, not in tile state (see 4.6).
- The fight starts immediately unless the player uses Lamp to step back 1 tile.

4.2 Targeting and multiple enemies
- Each round, the player must select one enemy in the queue as the target for their Attack comparison.
- All living enemies in the queue attack the player each round.
- Simultaneous resolution: resolve the target pair comparison and all enemy Attacks vs player Defense in the same round.

4.3 Round algorithm (PvE)
- Pre-round:
  1) Optional: declare retreat (ends combat; see 4.5).
  2) Confirm modifiers active this round (class passives, equipment, this-turn potions).
  3) Target selection (if multiple enemies).
- Dice (see RNG order section):
  4) Roll Player Attack d6, Player Defense d6.
  5) For each enemy in queue order, roll Enemy Attack d6. For the targeted enemy, also roll Enemy Defense d6.
- Compute results:
  6) Player deals 1 damage to targeted enemy if Player Attack > Target Enemy Defense.
  7) For each enemy, player suffers 1 damage if Enemy Attack > Player Defense.
  8) Before applying damage, Wardstone may prevent one impending HP loss for its holder (the player); choice is made by the holder.
- Apply damage simultaneously:
  9) Reduce HP accordingly for the player and targeted enemy. Other enemies take no damage unless a specific card/effect says otherwise.
- Remove 0-HP enemies:
  10) Enemies that reach 0 HP are removed immediately.
- Loot:
  11) For each enemy removed this round, roll drop(s) as per enemy tier and award to the player who triggered the tile (immediately). See 7.3 for loot details.
- Check end conditions:
  12) If the player HP is 0 or less, they lose the fight (see 4.4).
  13) If no enemies remain, the player wins the fight and combat ends.
  14) Otherwise, go to next round.

4.4 Losing a fight
- If the player reaches 0 HP during a fight:
  - The fight ends immediately.
  - The player is moved 1 tile backward along the board (use movement rules in BOARD_AND_MOVEMENT_SPEC.md).
  - The player must Sleep on their next turn.
  - The player does not drop any items due to losing PvE.
  - Any enemies reduced to 0 HP in the round still die and loot was already rolled/awarded in step 11. Remaining enemies persist on the tile (see 4.6).

4.5 Retreat (PvE)
- The player may retreat:
  - At the start of any round before rolling dice, or
  - After all dice are rolled but before damage is applied.
- If retreat is declared:
  - Cancel any pending damage from the current round (no one takes damage this round).
  - Move the player 6 tiles backward following their movement history stack (see BOARD_AND_MOVEMENT_SPEC.md). If the history is exhausted, continue along reverse edges by tie-breaking rules.
  - End the player’s turn immediately; do not resolve the tile you land on due to retreat. That tile, if needed, is resolved at Step 1 of the player’s next turn (pending-tile resolution).
- Enemies remaining on the tile persist (see 4.6).

4.6 Enemy persistence and HP between combats
- The tile’s enemy queue persists until cleared (all enemies defeated).
- Enemy HP is tracked per active CombatState only; if combat ends prematurely (retreat or player defeat), surviving enemies on the tile reset to full HP for the next combat that starts on that tile.
- If multiple players enter at different times, each starts a fresh CombatState against the persistent queue (full HP each time), until the queue is cleared.

4.7 Special PvE notes
- Hunter and Guardian passives apply in fights only.
- Boogey-Bane (+2 Attack vs creatures) applies in fights only.
- Lamp is not usable once combat has already started.
- “This turn” potions used by the player apply throughout the ongoing fight until endTurn.
- Alchemist pre-fight potions extend to the first round of the fight.

5. Duels (PvP)
5.1 Initiation
- Duels may be offered during Step 3 (preDuel phase) on a shared non-Sanctuary tile.
- Either party may initiate. Multiple trades may also occur by consent during this phase (not part of combat).
- The player whose turn it is is considered the Attacker in the duel for RNG ordering purposes. This has no other mechanical benefit except ordering.
- Smoke Bomb: The defender (or target) may play Smoke Bomb when a duel is offered to prevent any duels for the remainder of the current turn (card returns to bottom of T2).
- Monk cancel: Once per game, when you are offered a duel, you may roll d6; on 5–6, cancel that duel entirely (see 8.2 for Final tile bracket exception).

5.2 Round algorithm (PvP)
- Pre-round:
  1) Start-of-round retreat option (either player).
  2) Confirm modifiers (equipment, Duelist, potions). Note: Only the current player can use non-interrupt “this turn” potions mid-duel; the defender can only use interrupt items (e.g., Smoke Bomb before duel start) or passives (e.g., Wardstone). If the defender had used potions earlier this same turn (because it was their turn), those effects continue.
- Dice:
  3) Attacker rolls Attack, then Defense.
  4) Defender rolls Attack, then Defense.
  5) If the Defender is a Duelist and invokes the once-per-duel re-roll, roll a new Defense d6 and replace the previous Defender Defense die (before damage application).
- Compute results:
  6) Defender loses 1 HP if Attacker Attack > Defender Defense.
  7) Attacker loses 1 HP if Defender Attack > Attacker Defense.
  8) Apply Wardstone (either participant) to prevent exactly one impending HP loss (owner chooses if both are at risk).
- Apply damage simultaneously.
- Check end conditions:
  9) If one participant is at 0 HP and the other is above 0, the one at 0 loses the duel.
  10) If both reach 0 HP simultaneously, see 8.1 (duel double-KO).
  11) Otherwise, continue to next round.

5.3 Retreat (PvP)
- Either participant may retreat at the start of a round or after dice are rolled but before applying damage.
- Retreat ends the duel immediately and moves the retreating player 6 tiles backward along their movement history; end their turn; do not resolve the new tile until Step 1 of their next turn.

5.4 Losing a duel and looting
- If you lose a duel by reaching 0 HP:
  - You remain on this tile at 0 HP; you do not move.
  - The winner may immediately loot any or all of your items (equipped or in inventory), up to their capacity; excess capacity is enforced later (Step 6 capacity). Items not looted remain with you.
  - On your next turn, you must Sleep to recover (fully heal up to your current max HP).
  - If the winner cannot carry everything, dropped items go to the bottom of their respective decks per normal capacity enforcement rules unless another player on the tile picks them up immediately.

6. Damage timing and resolution
- “Strictly greater than”:
  - Attacker Attack > Defender Defense deals 1 HP to Defender.
  - If equal, no damage.
- Simultaneous application:
  - In a given round, all comparisons are computed before any HP is adjusted.
  - Wardstone choices are made after seeing all pending losses but before applying any.
  - Apply all HP changes simultaneously, then remove dead enemies and check win/loss conditions.

7. Loot rules and post-combat rewards
7.1 Enemy loot in fights
- For each enemy that died this round, roll for drop(s) immediately using the tier-based table:
  - T1 enemy: 50% chance 1× T1 Treasure.
  - T2 enemy: 70% chance 1× T2 Treasure; 15% chance 1× T1 Treasure; 15% nothing.
  - T3 enemy: 80% chance 1× T3 Treasure; 20% chance 1× T2 Treasure.
- The player who triggered the Enemy tile receives the loot by default.
- If multiple enemies die in the same round (edge-case due to non-standard effects), process loot in queue order (lowest index first).
- Items are awarded immediately and may trigger “immediate swap when drawing/looting” (see Items/Inventory doc). Capacity enforcement occurs at Step 6 of the turn.

7.2 Retreat effect on loot
- Loot already gained remains with the player even if they later retreat or subsequently lose the fight. There is no retroactive loss of loot due to retreat or defeat in PvE.

7.3 Tile enemy persistence and loot ownership
- Enemies that survive persist on the tile as a queue for future combats. Their HP resets for future combats.
- If a new player later triggers the same tile and defeats the remaining enemies, they get the loot for those enemies.

7.4 Raider passive after victories
- When you win any fight or duel:
  - Roll d6; on 5–6, draw 1 Treasure.
  - If the win was a fight on an Enemy tile, draw from that tile’s Treasure tier; otherwise (e.g., victorious duel), draw Tier 1.
  - This roll and draw occur after the victory is confirmed and before moving to postCombat/capacity.

8. Edge cases and special rulings
8.1 Duel double-KO
- If both duelists reach 0 HP in the same round:
  - The duel has no winner; no looting occurs.
  - Both remain at 0 HP on the tile.
  - On their next turns, each must Sleep.
  - If this occurs during a Final tile tiebreaker, see 8.3.

8.2 Monk cancel
- Standard duels: Monk may use the once-per-game cancel when offered a duel; roll d6, on 5–6 the duel is canceled.
- Final tile bracket exception: Monk cancel cannot be used to cancel a bracket duel required to decide the winner. Bracket duels are mandatory; Monk cancel is disabled for them.

8.3 Duels at Final (tiebreaker bracket)
- If multiple players arrive at the Final tile from the same single effect resolution, freeze normal turn order and run a single-elimination bracket in seat order among tied players.
- Each match in the bracket is a standard duel with the following clarifications:
  - Monk cancel is disabled (see 8.2).
  - If a match ends in a double-KO, re-run the match immediately (reset both to their pre-duel HP; do not require Sleep; treat this as a special tiebreaker state). Repeat until there is a winner.
  - Duelist re-roll works as normal.
- The bracket winner wins the game immediately.

8.4 Lamp interactions
- Lamp may be used if your turn would end on a tile with a player (duel risk) or an enemy (fight).
  - It triggers before resolving that tile, allowing you to step back 1 tile and avoid starting the combat/duel.
- Lamp cannot be used if the combat/duel has already started.
- Lamp cannot be used when you are moved during someone else’s turn; it only works on your own turn when your turn “would end” on such a tile.
- Lamp has no effect during Final tile tiebreaker duels (the combat is already in progress and not a tile resolution).

8.5 Multi-kill loot order
- In the unusual case where more than one enemy dies in the same round (e.g., via a special effect that damages multiple enemies at once), resolve loot in queue order from lowest to highest index (spawn order).

8.6 Zero-HP timing
- Enemy removal timing: Enemies at 0 HP are removed immediately after simultaneous damage application of a round, before the next round begins.
- Player zero in PvE: If the player hits 0 HP in the same round that the last enemy dies, the player still loses the fight (apply 4.4) but any loot for enemies killed that round was already awarded.
- Player zero in duel: See 5.4 and 8.1.

8.7 Potions and “whose turn is it”
- Non-interrupt Drinkables (e.g., Rage, Agility, Beer) can be used only during your own turn.
- Interrupt items explicitly say when they can be used (e.g., Smoke Bomb “when someone offers a duel to you”).
- Alchemist extension applies regardless of whether the combat is PvE or PvP, as long as the potion was used before the combat starts on the same turn.

9. Formal round flow (reference)
PvE round (with N enemies, one target):
- Window A: Retreat allowed (no dice consumed if retreat).
- Apply static modifiers and current “this turn” effects.
- Roll player Attack, player Defense.
- For each enemy i in queue order: roll enemy[i] Attack.
- Roll Defense for targeted enemy only.
- Determine pending HP losses:
  - Targeted enemy loses 1 HP if playerAttack > targetEnemyDefense.
  - Player loses 1 HP for each enemy i with enemyAttack[i] > playerDefense.
- Wardstone prevention choice (if applicable).
- Apply HP changes simultaneously.
- Remove 0-HP enemies; roll loot for each removed enemy in queue order.
- End check:
  - If player HP <= 0: apply losing-a-fight (4.4).
  - Else if enemies remain: next round.
  - Else: fight won.

PvP round:
- Window A: Retreat allowed.
- Apply static modifiers and current “this turn” effects.
- Attacker rolls Attack, then Defense.
- Defender rolls Attack, then Defense.
- Defender Duelist may re-roll Defense (once per duel) after seeing rolls.
- Determine pending HP losses:
  - Defender loses 1 if attackerAttack > defenderDefense.
  - Attacker loses 1 if defenderAttack > attackerDefense.
- Wardstone prevention choices (both sides may have one).
- Apply HP changes simultaneously.
- End check:
  - One at 0: loser determined; apply looting rules.
  - Both at 0: double-KO; see 8.1.
  - Else: next round.

10. Worked examples (deterministic tests)
For these examples, assume no hidden modifiers unless specified. All examples must be reproducible with a seeded RNG that consumes dice in the order listed earlier.

Example 1: Single-enemy basic win
- Setup: Player HP 5, Dagger (+1 Attack). Enemy: Goblin HP 1 (Atk +1, Def +0).
- Round 1 rolls (order: PAtk=4, PDef=3, EAtk=2, EDef=1):
  - Player Attack = 4 + 1 = 5; Enemy Defense = 1 + 0 = 1; 5 > 1 ⇒ Enemy −1 HP ⇒ 0 → removed.
  - Enemy Attack = 2 + 1 = 3; Player Defense = 3 + 0 = 3; 3 > 3? No ⇒ Player no damage.
- Result: Player wins in 1 round; roll T1 enemy loot table once.

Example 2: Single-enemy mutual miss
- Setup: Player no items; Enemy: Skeleton HP 1 (Atk +1, Def +1).
- Round 1 rolls (PAtk=2, PDef=4, EAtk=5, EDef=5):
  - Player Attack = 2; Enemy Defense = 5+1=6 ⇒ 2>6? No.
  - Enemy Attack = 5+1=6; Player Defense = 4 ⇒ 6>4 ⇒ Player −1 HP.
- Result: Player HP 4; enemy still alive; continue to round 2.

Example 3: Multi-enemy two attackers
- Setup: Enemies: [Goblin HP1, Wolf HP1]. Player targets Wolf.
- Round 1 rolls (PAtk=3, PDef=4, GoblinAtk=2, WolfAtk=5, WolfDef=2):
  - Attack on Wolf: Player Attack 3 vs Wolf Defense (2−1=1? Careful: Wolf Def −1; Defense die was 2; total Defense 1). 3 > 1 ⇒ Wolf −1 ⇒ 0 ⇒ removed.
  - Incoming:
    - Goblin Attack = 2+1=3 vs Player Defense 4 ⇒ 3>4? No.
    - Wolf Attack = 5+2=7 vs Player Defense 4 ⇒ 7>4 ⇒ Player −1 HP (but since Wolf is killed this round, does its attack still apply? Yes—damage is simultaneous; Wolf’s attack still counts this round).
- Result: Wolf dies; roll T1 loot once. Player HP now 4. Goblin remains; next round vs Goblin alone.

Example 4: Wardstone vs multiple hits
- Setup: Enemies: [T1 Bandit HP1, T1 Skeleton HP1]. Player has Wardstone.
- Round 1 rolls (PAtk=1, PDef=2, BanditAtk=6, SkeletonAtk=4, Target=Bandit, BanditDef=1):
  - Player→Bandit: 1 vs 1+1=2 ⇒ no damage.
  - Incoming:
    - Bandit: 6+1=7 vs 2 ⇒ hit
    - Skeleton: 4+1=5 vs 2 ⇒ hit
  - Two pending HP losses. Wardstone prevents one (player chooses which—identical either way).
- Apply: Player loses 1 (not 2). Wardstone is discarded. Next round continues with both enemies alive.

Example 5: Retreat after seeing dice
- Setup: Single Orc HP2 (Atk +2, Def +1).
- Round 1 rolls (PAtk=2, PDef=1, EAtk=6, EDef=5):
  - Before applying damage, player declares retreat.
  - Result: No damage applied. Player moves 6 tiles backward using path history; turn ends. Orc remains on tile; its HP resets to 2 for next fight.

Example 6: Player and last enemy both hit 0 in PvE
- Setup: Player HP 1, Troll HP2 (Atk +3, Def 0), targeted; previous round reduced Troll to HP1.
- Round n rolls (PAtk=6, PDef=2, EAtk=5, EDef=2):
  - Player Attack = 6 vs Troll Defense 2 ⇒ Troll −1 ⇒ 0.
  - Troll Attack = 5+3=8 vs Player Defense 2 ⇒ Player −1 ⇒ 0.
  - Apply simultaneously: both reach 0.
  - Remove enemy: Troll dies; roll loot once (awarded).
  - Player loses the fight: move back 1 tile; must Sleep next turn.

Example 7: Duelist re-roll saves the day
- Setup duel: Attacker has Lord’s Sword (+2). Defender is Duelist with Wooden Shield (+1). Both HP 5.
- Round 1 rolls (AttAtk=3, AttDef=2, DefAtk=4, DefDef=4):
  - Without re-roll:
    - Defender Defense = 4 + 1 = 5 vs Attacker Attack 3+2=5 ⇒ Attacker Attack 5 > 5? No
    - Defender Attack 4 vs Attacker Defense 2 ⇒ hit; Attacker −1
  - Duelist chooses not to re-roll.
- Round 2 rolls (AttAtk=6, AttDef=5, DefAtk=3, DefDef=3):
  - Attacker Attack = 8 vs Defender Defense 4 ⇒ Defender would lose 1.
  - Defender Attack = 3 vs Attacker Defense 5 ⇒ miss.
  - Duelist re-roll Defense: new DefDef d6=5 ⇒ Defense total = 6. Now Attacker Attack 8 > 6 ⇒ still a hit; Defender −1 HP.
- Result after two rounds: both at HP 4.

Example 8: Smoke Bomb cancels duel offers
- Setup: Two players share a non-Sanctuary tile. Current player offers duel to the other.
- Defender plays Smoke Bomb on offer. No duels may occur this turn. Proceed with Step 4 of turn (move or sleep). No dice consumed for duel.

Example 9: Alchemist pre-fight potion
- Setup: Alchemist uses Rage Potion during Step 2 (manage) and then moves onto a red tile starting a fight.
- Round 1:
  - Rage (+1 Attack this turn) applies due to Alchemist extension. Player also keeps +1 Attack for the rest of the turn (subsequent rounds).
- Round 2+:
  - Rage continues to apply (it lasts “this turn”).

Example 10: Final-tile bracket double-KO
- Setup: Tie at Final triggers bracket. Match A vs B.
- Round 1 rolls cause both to hit 0 simultaneously (double-KO).
- Rule: Re-run the entire duel immediately; reset to pre-duel HP; no Sleep required for tiebreaker loop. Monk cancel is disabled. Repeat until one wins.

11. Validation checklist (for tests)
- Simultaneous damage application per round; Wardstone prevention selection before apply.
- Multi-enemy: one target receives potential damage; all enemies attack player; targeted enemy still deals damage if killed in same round.
- Retreat at start of round and after dice before damage; cancels entire round’s damage.
- PvE defeat: lose at 0 HP even if last enemy died; loot for enemies that died is still awarded.
- Enemy queue persistence on tile and HP reset behavior across combats.
- Duels: defender’s Duelist re-roll once per duel on Defense die only; choose after dice.
- Duels: loss → 0 HP loser stays on tile; winner loots up to capacity; loser must Sleep next turn.
- Double-KO in duel → draw; both must Sleep unless in Final bracket; no looting.
- Smoke Bomb cancels duels offered that turn; Monk cancel chance on standard duels; disabled in Final bracket.
- Lamp usable only pre-resolution on your turn; not once combat starts; does not apply to movements during others’ turns.
- Raider bonus roll triggers after winning fight or duel; correct tier for treasure.
- RNG consumption order matches this spec.

12. Implementation notes
- Engine should represent CombatState with:
  - type: ‘pve’ | ‘pvp’
  - participants: { playerId } or { attackerId, defenderId }
  - enemyQueue (for PvE): list of enemy ids/types and their current HP for this combat instance only
  - round number
  - active modifiers context snapshot (for audit)
- The engine must:
  - Enforce windows (no late potions beyond allowed timing, no Lamp mid-combat).
  - Apply Wardstone as a prevention, not a heal; it cannot reduce damage below 0.
  - Emit deterministic events (e.g., CombatRoundRolled, DamageApplied, EnemyDefeated, LootGranted, DuelistRerolled, RetreatExecuted, CombatEnded, DuelEnded).
- The UI must:
  - Indicate the target enemy selection if multiple.
  - Show all rolled values and modifiers in the log.
  - Provide clear retreat and re-roll prompts in the correct windows.
