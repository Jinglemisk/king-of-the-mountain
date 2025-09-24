docs/TEST_PLAN_AND_FIXTURES.md

Purpose
- Convert the GDD and subsystem specs into deterministic, executable acceptance tests with fixtures and golden logs.
- Ensure movement, combat, duels, items/timing, RNG determinism, Sanctuary constraints, and final-tile tie-breakers behave exactly as specified.
- Provide test IDs, fixtures, and pass/fail criteria so an agent can generate tests and validate correctness.

Test strategy
- Levels
  - Unit: pure functions (selectors, reducers, RNG helpers, board/path utilities).
  - Integration: engine reducers across phases, combat/duel loops, tile resolution, inventory enforcement, multi-actor Chance effects.
  - E2E (headless): scripted players dispatch actions; engine emits events and logs; run with seeded RNG and fixed decks; verify golden logs.
- Determinism
  - All tests run with explicit RNG seed or deterministic RNG source stub.
  - Decks pre-seeded as explicit arrays (no runtime shuffle) unless a test is specifically verifying shuffling.
  - Weighted picks verified with a fixed “roll index” from RNG and audit entries captured.
- Golden logs
  - Verification compares structured log entries (event name + payload) not human text. Human-readable message templates can be snapshot-tested separately if needed.

Fixtures catalog
- Naming convention
  - Board fixture IDs: FB-001, FB-002
  - Deck fixture IDs: FD-*, per deck
  - RNG seeds: FR-*
  - Player/setup fixtures: FP-*
- Core fixtures
  - FB-001 Board v1.0
    - The canonical 68-node board as listed in GDD. Nodes 0–53 main path; 54–59 Shortcut A; 60–67 Shortcut B. Use the given neighbors and tile metadata.
  - FR-DEFAULT
    - RNG seeded to a constant (e.g., seed: 0xC0FFEE00) with fixed consumption order: dice → weightedPick → shuffle. Provide rngAudit array in GameState for all draws with: kind, scope, inputs, roll, result, cursor.
  - FP-BASE4
    - 4 players seated in order P1–P4, start positions tile 0, all HP 5/5, no items, classes unassigned.
  - FP-CLASSES6
    - 6 players P1–P6 with different classes: P1 Scout, P2 Hunter, P3 Raider, P4 Guardian, P5 Duelist, P6 Alchemist. All 5/5 HP; Guardian starts with Wooden Shield equipped; Scout starts with 1 Trap in bandolier; Alchemist has Bandolier capacity 2; Porter not present in this fixture (use FP-PORTER where needed).
  - FP-PORTER
    - Like FP-BASE4 but P1 is Porter (Backpack capacity 2).
  - FD-TREASURE-T1-ORDERED
    - Tier 1 deck top→bottom: [Dagger, Wooden Shield, Robe, Crude Axe, Lamp, Trap, Luck Charm, Beer, Agility Draught, Dagger, Wooden Shield, Trap, Beer, Luck Charm, Crude Axe, Robe, Lamp, Trap, Dagger, Wooden Shield, Robe, Crude Axe, Dagger, Wooden Shield]. Discard piles start empty.
  - FD-TREASURE-T2-ORDERED
    - Top→bottom: [Heirloom Armor, Silver Shield, Lord’s Sword, Boogey-Bane, Velvet Cloak, Rage Potion, Fairy Dust, Smoke Bomb, Heirloom Armor, Silver Shield, Lord’s Sword, Boogey-Bane, Velvet Cloak, Rage Potion, Heirloom Armor, Silver Shield, Lord’s Sword, Boogey-Bane].
  - FD-TREASURE-T3-ORDERED
    - Top→bottom: [Royal Aegis, Essence, Dragonfang, Blink Scroll, Wardstone, Royal Aegis, Essence, Dragonfang, Blink Scroll, Wardstone].
  - FD-CHANCE-ORDERED
    - Top→bottom: [Exhaustion, Cave-in, Faint, Vital Energy, Earthquake, Lost Treasure, Jinn Thief, Sprained Wrist, Covered Pit, White-Bearded Spirit, Mystic Wave, Nefarious Spirit, Ambush Opportunity, Instinct, Exhaustion, Cave-in, Vital Energy, Earthquake, Mystic Wave, Instinct, Sprained Wrist, Covered Pit, Jinn Thief, Lost Treasure, White-Bearded Spirit, Faint, Ambush Opportunity, Earthquake, Mystic Wave, Instinct, Sprained Wrist, Covered Pit]
  - FD-ENEMY-T1-ORDERED
    - Top→bottom: [Goblin, Wolf, Skeleton, Bandit, Goblin, Wolf, Skeleton, Bandit, Goblin, Wolf, Skeleton, Bandit, Goblin, Wolf, Skeleton, Bandit, Goblin, Wolf]
  - FD-ENEMY-T2-ORDERED
    - Top→bottom: [Orc, Troll, Cultist, Ogre, Orc, Troll, Cultist, Ogre, Orc, Troll, Orc, Troll]
  - FD-ENEMY-T3-ORDERED
    - Top→bottom: [Dragon Whelp, Lich, Demon, Giant, Dragon Whelp, Lich, Demon, Giant, Dragon Whelp, Giant]
- Special RNG cursor fixtures (when testing weighted picks)
  - FR-WP-E2-LOW
    - Set weightedPick roll in [0, 0.7) to force “2×T1” for E2 tiles.
  - FR-WP-E2-HIGH
    - Set weightedPick roll in [0.7,1) to force “1×T2” for E2 tiles.
  - FR-WP-E3-BRANCHES
    - Sequence of rolls to hit 70% (2×T2), 20% (1×T2+1×T1), 10% (1×T3) in order.
- Minimal combat dice sequences fixtures
  - FR-DICE-SEQS-A
    - Preload round-by-round d6 pairs for Attack/Defense in order of consumption with labels for participant and phase. E.g., [P1.atk=4, E1.def=2, E1.atk=3, P1.def=1, ...].

Harness requirements
- Provide test helper buildGame(fixtures...) that returns a ready GameState with:
  - Loaded board (FB-001), decks (FD-*), players (FP-*), rng seed (FR-*), and empty log.
- Provide step helpers:
  - dispatch(action) returns engine events and updates state.
  - nextPhase(), roll(type, sides), forceRngCursor(value) for deterministic control.
  - withDeckTop(deckId, cardIds[]), withEnemyCompRolls(values[]).
- Provide assertions:
  - expectState(selector) equals.
  - expectLogMatches(eventSequence).
  - expectRngAuditContains(entries).
- All Given/When/Then steps below assume these helpers exist.

Test cases
Note: Each test is independent; unless stated, use FB-001, FR-DEFAULT, FD-*-ORDERED, and FP-BASE4.

A. Turn/phase machine and action gating
- TSM-001 Phase order happy path
  - Given P1 at 0, phase turnStart
  - When P1 takes no pending tile and advances through manage → preDuel → moveOrSleep(move) → resolveTile(empty) → capacity → endTurn
  - Then phase cycles to P2 turnStart; all per-turn flags cleared; version incremented
- TSM-002 Pending tile defers to Step 1 only
  - Given P2 was moved by another’s Chance to tile 3 on P1’s turn
  - When P2’s turn starts
  - Then P2 resolves tile 3 (Treasure t1) at Step 1 before manage
- TSM-003 Action gating by phase
  - Given P1 at manage
  - When P1 attempts to move or sleep
  - Then action rejected with validation error “illegal in manage”
- TSM-004 Over-capacity enforcement window
  - Given P1 has 3 Holdables with 2 Holdable slots after resolveTile
  - When capacity phase runs
  - Then P1 must drop to 2; drops offered to co-located players before returning to deck bottom
- TSM-005 EndTurn clears per-turn modifiers
  - Given P1 used Beer (-1 next move) and Agility Draught (+1 defense this turn)
  - When endTurn
  - Then “this turn” potion expires; Beer’s -1 remains until next movement roll, then clears

B. RNG determinism and audit
- RNG-001 Dice determinism by seed
  - Given FR-DEFAULT
  - When P1 rolls movement then P2 rolls movement
  - Then dice results match snapshot and rngAudit has entries with kind=d4, actor, roll
- RNG-002 Weighted pick determinism E2 low
  - Given P1 lands on E2 tile and FR-WP-E2-LOW
  - When resolveTile
  - Then enemy composition is 2×T1 with rngAudit entry kind=weightedPick, scope=E2, roll in [0,0.7)
- RNG-003 Weighted pick determinism E2 high
  - Same as RNG-002 but FR-WP-E2-HIGH; expect 1×T2
- RNG-004 Shuffle determinism
  - Given a test that triggers a reshuffle (deck emptied)
  - When shuffle runs
  - Then rngAudit has kind=shuffle with input list and output order matches seeded Fisher-Yates

C. Movement and board traversal
- MOV-001 Forward movement with branch choice
  - Given P1 at tile 10 (branch A start)
  - When P1 rolls 1 and chooses neighbor 54
  - Then movementHistory records [11? no; chosen 54], P1 at 54
- MOV-002 Backward along history
  - Given P1 moved 10→54→55→56 this turn
  - When a card moves P1 back 2
  - Then P1 goes to 55 then 54 by popping history; history updated accordingly
- MOV-003 Backward beyond history fallback
  - Given P1’s history is exhausted (start of turn, no moves yet) and a card moves back 3 from tile 6
  - When fallback applies
  - Then algorithm follows reverse edges preferring lastFrom else lower tile id; final tile matches board spec
- MOV-004 No pass-through resolution except Ambush
  - Given P1 moves 3 tiles passing over Treasure then stopping on Enemy
  - Then only Enemy resolves; no pass-through effects, except separately tested Ambush
- MOV-005 Beer can cause 0 movement
  - Given P1 drank Beer previously and rolls 1 on d4
  - Then net movement is 0; position unchanged; Beer modifier cleared
- MOV-006 Movement modifiers stack additively
  - Given P1 has Velvet Cloak (+1) and Royal Aegis (−1)
  - When P1 rolls movement
  - Then net modifier is 0; no other impacts

D. Lamp timing and interactions
- LMP-001 Lamp avoids fight
  - Given P1 ends movement on a red tile with Lamp in hand
  - When applying Lamp trigger “would end on tile with an enemy”
  - Then P1 steps back 1 tile before any tile resolution; no fight starts; Lamp remains equipped/held (Lamp has no charges)
- LMP-002 Lamp avoids duel on occupied tile
  - Given P1 would end on a tile with P2
  - When Lamp trigger fires
  - Then P1 steps back 1; no duel offer/auto-duel occurs; log shows LampUsed before resolveTile
- LMP-003 Lamp vs Ambush precedence
  - Given P2 has an Ambush Opportunity placed on tile X; P1 would end on X
  - When end of movement
  - Then Lamp trigger happens before Ambush; P1 may step back and avoid the ambush duel; if P1 declines Lamp or lacks it, Ambush may immediately start a duel before tile resolves

E. Chance cards and pending resolution
- CH-001 Exhaustion moves 1 back, Step 1 resolution on next turn
  - Given P1 draws Exhaustion on P1’s own turn
  - When moved back 1 during their turn
  - Then P1 does not resolve the new tile this turn (movement by own turn effect during resolveTile); turn proceeds to capacity/endTurn; no Step 1 flag set
- CH-002 Cave-in during another’s turn sets pending
  - Given P1 draws Cave-in that targets P2 on P1’s turn
  - When P2 is moved
  - Then P2 does not resolve now; pendingTile flag set; P2 resolves it at next turnStep1
- CH-003 Earthquake simultaneous backward movement
  - Given P1 triggers Earthquake
  - When all players roll d4 backward in seat order
  - Then no duels during these moves; pending tiles set for each impacted player; rngAudit records each player’s d4
- CH-004 Mystic Wave can move into Sanctuary
  - Given P1 draws Mystic Wave; nearest is P2 in Sanctuary
  - When swap resolves
  - Then swap occurs; Sanctuary rule allows because P1 affects self; no duels start on Sanctuary; pending resolution per Step 1
- CH-005 Nefarious Spirit respects Sanctuary
  - Given nearest target P2 is within 6 but on Sanctuary
  - When move to P2 occurs
  - Then no duel starts due to Sanctuary; pending tile applies to P1’s next turn
- CH-006 Luck Charm cancels freshly drawn Chance
  - Given P1 draws Sprained Wrist and holds Luck Charm
  - When P1 plays Luck Charm as interrupt
  - Then Sprained Wrist is cancelled; Luck Charm returns to bottom of T1; log shows ItemUsed and ChanceCancelled
- CH-007 Luck Charm cancels another’s revealed Chance
  - Given P1 reveals Earthquake; P2 has Luck Charm
  - When P2 interrupts
  - Then Earthquake cancelled; no movements occur; Charm to bottom T1
- CH-008 Ambush Opportunity placement and trigger
  - Given P1 holds Ambush Opportunity face down
  - When P1’s next turn starts, P1 places it on current non-Sanctuary tile
  - Then when another player enters that tile during movement later, a duel can start immediately before tile resolves; after duel, card is discarded

F. Combat: PvE basics and modifiers
- COM-001 Single enemy fight, no modifiers
  - Given P1 lands on E1; draws Goblin(HP1,Atk+1,Def+0)
  - When combat rounds resolve per FR-DICE-SEQS-A
  - Then HP changes and enemy death timing match sequence; combat ends when enemy HP 0 or P1 HP 0
- COM-002 Class passives in fights only
  - Given P2 Hunter (+1 Attack vs creatures) and P3 Guardian (+1 Defense vs creatures)
  - When fighting enemies
  - Then passives apply; verify they do not apply in duels (covered in DUEL-004)
- COM-003 Potion “this turn” applies only this turn
  - Given P1 uses Rage Potion (+1 Attack this turn)
  - When P1 fights an enemy started the same turn
  - Then +1 applies all combat rounds of that fight; expires at endTurn
- COM-004 Alchemist potion transfer
  - Given P6 Alchemist used Rage Potion before a fight starts this turn
  - When the fight starts
  - Then the Rage bonus also applies to first round of the combat per class passive
- COM-005 Multi-enemy composition E2 branches
  - Given FR-WP-E2-LOW and FR-WP-E2-HIGH in two tests
  - When landing on E2
  - Then composition matches 2×T1 or 1×T2; queue order equals drawn order
- COM-006 Target selection and simultaneous resolution
  - Given 2 enemies on tile; P1 targets one per round
  - When resolving a round where both comparisons cause damage
  - Then both sides may lose 1 HP; zero-HP enemies removed immediately after round resolution
- COM-007 Retreat path and no tile resolution
  - Given P1 retreats during combat
  - When moving back 6 along history (with fallback if needed)
  - Then combat ends; turn ends; no tile resolves now and no pending tile is created
- COM-008 Loot rolls per enemy and order
  - Given P1 defeats 2 enemies in one fight
  - When resolving drops
  - Then roll per enemy; resolve in enemy-queue order; loot cards drawn from tier per rules; rngAudit tracks each drop roll
- COM-009 Wardstone prevents 1 HP loss
  - Given P1 has Wardstone
  - When P1 would take 1 HP loss
  - Then loss prevented; Wardstone discarded; log shows DamagePrevented and ItemConsumed
- COM-010 Zero-HP tie in PvE
  - Given a round where both P1 and enemy drop to 0 HP in same resolution window
  - Then player loses the fight; apply “lose PvE” outcome (move back 1 tile, must Sleep next turn); no loot

G. Duels: offers, re-rolls, cancel, retreat
- DUEL-001 Offer/accept/decline on shared non-Sanctuary
  - Given P1 and P2 on same non-Sanctuary tile at preDuel
  - When P1 offers; P2 accepts
  - Then duel starts; if declines, no duel
- DUEL-002 Sanctuary forbids duel
  - Given both on Sanctuary
  - When P1 offers
  - Then action invalid
- DUEL-003 Duelist re-roll defense once
  - Given P5 Duelist in a duel
  - When P5 triggers once-per-duel defense re-roll
  - Then defense die replaced; further attempts blocked
- DUEL-004 Class passives not in duels (Hunter/Guardian)
  - Given P2 Hunter or P4 Guardian in duel
  - Then their creature-only bonuses do not apply
- DUEL-005 Monk cancel once per game
  - Given P? Monk is offered a duel
  - When Monk rolls cancel d6 and hits 5–6
  - Then duel cancelled; flag “monkCancelUsed” true; on 1–4 duel proceeds
- DUEL-006 Smoke Bomb cancels duels for rest of turn
  - Given P2 is offered a duel and holds Smoke Bomb
  - When P2 plays it
  - Then duel immediately cancelled and no additional duels can be started this turn; card goes to bottom of T2
- DUEL-007 Retreat from duel
  - Given duel in progress
  - When P1 retreats
  - Then move back 6 along history; duel ends; turn ends
- DUEL-008 Losing a duel at 0 HP
  - Given P1 hits 0 HP in a duel
  - Then P1 stays on tile at 0; winner may loot any/all P1 items; on P1’s next turn must Sleep

H. Inventory, equipment, and capacity
- INV-001 Step 2 swapping only
  - Given P1 with multiple items equipped and in inventory
  - When in manage step, P1 swaps freely
  - Then during rest of turn no swapping except immediate-on-draw window
- INV-002 Immediate swap on Treasure draw
  - Given P1 draws Lord’s Sword with full Holdable slots
  - When immediate swap window opens
  - Then P1 can swap an equipped Holdable for the new one, moving old one to backpack/bandolier if capacity allows
- INV-003 Over capacity enforcement and co-located pickup
  - Given P1 over capacity entering capacity phase; P2 on same tile
  - When P1 drops excess items
  - Then P2 may pick them up before they return to bottom of the same tier deck
- INV-004 Visibility rules
  - Given P1 equips Robe; holds Beer in bandolier
  - Then other players see Robe equipped but not the Beer’s exact name (unless rule text allows public)
- INV-005 Scout ignores Trap and can pick it up
  - Given P1 Scout steps on a tile with a Trap
  - Then P1 may pick it up to bandolier instead of triggering it; otherwise ignore its skip effect
- INV-006 Backpack/Bandolier capacities by class
  - Given P6 Alchemist and P? Porter
  - Then Alchemist bandolier capacity=2; Porter backpack capacity=2; enforce in capacity phase
- INV-007 Jinn Thief returns item to deck bottom
  - Given P1 draws Jinn Thief
  - When P1 chooses an item (equipped or inventory)
  - Then that item is removed and returned to bottom of matching tier deck; logs reflect

I. Items timing and edge rulings
- ITM-001 Fairy Dust invisibility end conditions
  - Given P1 uses Fairy Dust before choosing Sleep
  - Then P1 cannot be dueled until next turn starts or if any effect moves P1; verify that a movement effect ends invisibility immediately
- ITM-002 Blink Scroll +2 or −2 before resolving tile
  - Given P1 holds Blink Scroll after movement
  - When P1 plays it for +2 to land on a new tile
  - Then pass-through effects ignored; cannot use it to violate Sanctuary protection rules against being forced out by others’ effects; if P1 self-plays outside Sanctuary, effect is allowed
- ITM-003 Rage and Agility stack additively with items
  - Given P1 has Lord’s Sword (+2 Attack) and uses Rage Potion (+1 Attack this turn)
  - Then Attack rolls are d6+3; verify Defense similarly with Agility Draught

J. Enemy drop tables and loot flows
- DROP-001 T1 enemy drop 50%
  - Given defeat a T1 enemy
  - When drop roll is high/low via seed
  - Then either draw 1×T1 Treasure or nothing; rngAudit recorded
- DROP-002 T2 enemy drop 70/15/15
  - Given defeat a T2 enemy
  - Then 70% T2, 15% T1, 15% none confirmed via FR seeds
- DROP-003 T3 enemy drop 80/20
  - Given defeat a T3 enemy
  - Then 80% T3, 20% T2 confirmed via FR seeds

K. Sanctuary rules
- SAN-001 No duels may be initiated on Sanctuary
  - Given both players share Sanctuary
  - Then any duel attempt is invalid
- SAN-002 Traps and Ambush cannot be placed on Sanctuary
  - Given P1 attempts placement
  - Then action invalid; error surfaced
- SAN-003 Cannot be forced out by other players’ cards
  - Given a card would move P2 from Sanctuary and is controlled by P1 (other player)
  - Then movement prevented; if card affects only the actor themself (self-play), allow if consistent with item/card text (e.g., Mystic Wave allowed)

L. Final tile and tie-breaker
- FIN-001 Single arrival wins instantly
  - Given P1 reaches Final by movement
  - Then winner declared, game ended
- FIN-002 Simultaneous arrival bracket
  - Given an artificial simultaneous arrival for P1 and P2 via a test harness helper (resolveSimultaneousArrival([P1,P2,P3?]))
  - When running tie-breaker in seat order single-elimination
  - Then the bracket resolves deterministically via seeded dice; winner declared; game ended; normal turn cycle frozen during bracket

M. Logging and ordering
- LOG-001 Action → events → log ordering
  - Given an action like MoveRequested
  - When reducer runs
  - Then emitted events are ordered and logged as: DiceRolled → PlayerMoved → TileEntered → TileResolved (or CombatStarted)
- LOG-002 Idempotent action handling
  - Given duplicate MoveRequested with same nonce
  - Then second is ignored; log includes DuplicateActionIgnored
- LOG-003 Combat round summary logging
  - Given a round resolves
  - Then log includes AttackRoll and DefenseRoll for each participant, modifiers breakdown, net damage applied

N. Networking consistency (engine-level acceptance without Firestore)
- NET-001 Current player gating
  - Given an action from a non-current player that would progress phase
  - Then action rejected
- NET-002 Version bump and conflict resolution (headless)
  - Given two actions with same base version
  - Then later write rejected in-memory; suggest retry; order preserved in log

Example golden logs (structure)
- For a simple move to empty tile:
  - DiceRolled {actor:P1, kind:d4, value:3, modifiers:+1 Velvet Cloak, total:4}
  - PlayerMoved {actor:P1, from:1, to:5, path:[2,3,4,5]}
  - TileEntered {actor:P1, tileId:5, tileType:enemy, tier:1}
  - ItemTriggerConsidered {actor:P1, itemId:item.lamp.v1, trigger:isEndingOnEnemy, used:false}
  - CombatStarted {actor:P1, tileId:5, enemies:[{id:enemy.goblin.v1, hp:1, atk:1, def:0}]}
- For a cancelled Chance:
  - ChanceDrawn {actor:P1, cardId:chance.earthquake.v1}
  - InterruptPlayed {actor:P2, itemId:item.luck_charm.v1, targetAction:ChanceDrawn}
  - ChanceCancelled {actor:P1, cardId:chance.earthquake.v1}
  - ItemReturnedToDeckBottom {actor:P2, itemId:item.luck_charm.v1, deck:treasure.t1}

Coverage goals for MVP
- Turn/phase: 100% of phase transitions and guard conditions covered by at least one test (TSM-001..004).
- Movement: 100% of forward/branch/backward/overflow cases including history exhaustion and Lamp precedence (MOV-* and LMP-*).
- Chance: at least one test per unique effect behavior cluster (move self, move others, global, duels, invisibility interactions) (CH-*).
- Combat: single enemy, multi-enemy, retreat, zero-HP tie, class passives, potion timing (COM-*).
- Duels: offer/accept/decline, Sanctuary, re-roll, cancel, retreat, defeat outcomes (DUEL-*).
- Items/inventory: slot capacities, swap windows, immediate-on-draw, over-capacity, special items (INV-*, ITM-*).
- Loot tables: each branch of tiered drop distributions (DROP-*).
- Sanctuary: all restrictions enforced (SAN-*).
- Final tile: instant win and bracket (FIN-*).
- Logging and RNG audit: representative flows snapshot-verified (RNG-*, LOG-*).

Test data and IDs (canonical)
- Use canonical IDs as in CONTENT_CATALOG.md
  - Items: item.dagger.v1, item.wooden_shield.v1, item.robe.v1, item.crude_axe.v1, item.lamp.v1, item.trap.v1, item.luck_charm.v1, item.beer.v1, item.agility_draught.v1, item.heirloom_armor.v1, item.silver_shield.v1, item.lords_sword.v1, item.boogey_bane.v1, item.velvet_cloak.v1, item.rage_potion.v1, item.fairy_dust.v1, item.smoke_bomb.v1, item.royal_aegis.v1, item.essence.v1, item.dragonfang.v1, item.blink_scroll.v1, item.wardstone.v1
  - Chance: chance.exhaustion.v1, chance.cave_in.v1, chance.faint.v1, chance.vital_energy.v1, chance.earthquake.v1, chance.lost_treasure.v1, chance.jinn_thief.v1, chance.sprained_wrist.v1, chance.covered_pit.v1, chance.white_bearded_spirit.v1, chance.mystic_wave.v1, chance.nefarious_spirit.v1, chance.ambush_opportunity.v1, chance.instinct.v1
  - Enemies: enemy.goblin.v1, enemy.wolf.v1, enemy.skeleton.v1, enemy.bandit.v1, enemy.orc.v1, enemy.troll.v1, enemy.cultist.v1, enemy.ogre.v1, enemy.dragon_whelp.v1, enemy.lich.v1, enemy.demon.v1, enemy.giant.v1
  - Tiles reference FB-001 ids
- Ensure these IDs match CONTENT_CATALOG.md and are used in fixtures and logs.

Acceptance criteria
- All tests above pass consistently under the same seed(s) on repeated runs.
- No nondeterministic flakes; rngAudit length and contents stable per test.
- Log sequences match expected event order for each scenario.
- Engine enforces all invariants:
  - HP bounds 0..maxHp
  - Slot capacities by class and item type
  - Visibility rules respected in logs
  - Sanctuary rules (no duels, no forced movement by others’ cards, no trap/ambush placement)
  - Phase guard validation rejects illegal actions
- Weighted enemy compositions and drop tables hit all branches across RNG fixtures.
- Final-tile bracket deterministically produces a winner with seeded dice.

Suggested folder layout for fixtures (if stored as JSON/TS)
- tests/fixtures/board/FB-001.board.json
- tests/fixtures/decks/FD-TREASURE-T1-ORDERED.json
- tests/fixtures/decks/FD-TREASURE-T2-ORDERED.json
- tests/fixtures/decks/FD-TREASURE-T3-ORDERED.json
- tests/fixtures/decks/FD-CHANCE-ORDERED.json
- tests/fixtures/decks/FD-ENEMY-T1-ORDERED.json
- tests/fixtures/decks/FD-ENEMY-T2-ORDERED.json
- tests/fixtures/decks/FD-ENEMY-T3-ORDERED.json
- tests/fixtures/players/FP-BASE4.json
- tests/fixtures/players/FP-CLASSES6.json
- tests/fixtures/players/FP-PORTER.json
- tests/fixtures/rng/FR-DEFAULT.json
- tests/fixtures/rng/FR-WP-E2-LOW.json
- tests/fixtures/rng/FR-WP-E2-HIGH.json
- tests/fixtures/rng/FR-WP-E3-BRANCHES.json
- tests/fixtures/combat/FR-DICE-SEQS-A.json

Implementation notes and open points linked to other docs
- Lamp vs Ambush ordering is specified here as Lamp first; confirm and mirror in ITEMS_INVENTORY_AND_TIMING.md.
- Blink Scroll Sanctuary wording: this plan assumes self-play may move in/out of Sanctuary; only “forced by another” is prohibited. Confirm in ITEMS_INVENTORY_AND_TIMING.md.
- Simultaneous arrival to Final uses a harness helper to simulate multi-arrival; UI contract will specify the mini-bracket flow (UI_COMPONENT_CONTRACT.md).
- Logging event names and payloads to be finalized in ACTIONS_EVENTS_AND_LOGGING.md; tests should reference the canonical names there once authored.
