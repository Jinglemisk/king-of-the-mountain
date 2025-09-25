# King of the Hill

## High concept

- Push-your-luck, lightweight adventure race for 2–6 players. Roll d4 to advance along a branching track. Land on Treasure, Chance, Sanctuary, Enemy, or Empty tiles. Fight enemies, duel other players, use items, and reach the final tile first. Shortcuts exist but are riskier (higher-tier enemies and better rewards).

## Target platform

- Desktop web browser. Mobile not prioritized in MVP.

## Match length

- Target 20–30 minutes with d4 movement and a 68-tile board graph that includes two shortcuts.

## Players per room

- 2–6. No spectators. Room owner can kick.

## Identity and rooms

- Nickname-only. Players join a room via a 6-character uppercase alphanumeric code.
- Rooms auto-delete if empty for 2 hours.
- Reconnect: a seat stays reserved for the same anonymous user id until the match ends.

## Core stats

- Player HP: max 5 by default (cap can be altered by items).
- Attack/Defense rolls: d6 each round of combat.
- Movement: d4 (all the time).
- Bonuses are additive to a single die result (no extra dice).

## Inventory and equipment

- Equipped:
    - 1 Wearable (armor/cloak, etc.)
    - 2 Holdable (weapon/shield/talisman, etc.)
- Inventory:
    - Bandolier: 1 Drinkable or Small item (usable during your turn at any time; exceptions may specify “play any time”).
    - Backpack: 1 Wearable or Holdable (cannot be used in combat unless equipped first).
- Equipped items are visible to all. Inventory is hidden.
- You can swap equipped items:
    - During Step 2 of your turn (before moving/resting), and
    - Immediately when you draw/loot a Treasure (to arrange space).
- If over capacity at the end of your turn, you must drop down to capacity. Dropped items go to the bottom of their deck unless otherwise stated. If another player is on the same tile, they can pick up before it returns to the bottom.

## Classes

Each class has a passive. Some start with a simple item. No duplicates allowed.

1. Scout
    
    Passive: You ignore Traps and Ambush; you may pick up a Trap you step onto instead of triggering it.
    
    Start: 1 Trap (Small).
    
2. Hunter
    
    Passive: +1 Attack vs creatures during fights.
    
3. Raider
    
    Passive: When you win any fight or duel, roll d6. On 5–6, draw 1 Treasure. If you won a fight on an Enemy tile, draw from that tile’s Treasure tier; otherwise draw Tier 1.
    
4. Guardian
    
    Passive: +1 Defense vs creatures during fights.
    
    Start: Wooden Shield (+1 Defense Holdable).
    
5. Duelist
    
    Passive: +1 Attack in duels.
    
    Per-duel: Once per duel, you may re-roll your Defense die.
    
6. Alchemist
    
    Passive: +1 Bandolier capacity (Bandolier holds 2).
    
    Potions boost: When you use a Drinkable that heals, heal +1 extra HP (after caps). When you use a “this turn” potion (for example, +Attack/+Defense), it also applies to your first round of any combat started on the same turn (if used before the fight).
    
7. Porter
    
    Passive: +1 Backpack capacity (Backpack holds 2).
    
8. Monk
    
    Passive: Once per game, when offered a duel, roll d6; on 5–6 you cancel that duel.
    

## Turn order and flow

### Determine turn order

- All roll d6; ties among highest re-roll. Order is fixed for the match.

### Your turn

Step 1. Resolve any pending tile effect you were moved onto by someone else’s Chance card during their turn.

Step 2. Manage equipment: freely swap your equipped items and inventory. After this step, you cannot swap again this turn except immediately when drawing/looting.

Step 3. If you share a tile with another player, you may offer a duel. Either party can initiate. Multiple trades are allowed by mutual consent. No duels on Sanctuary tiles.

Step 4. Choose one:

- Sleep: Fully heal to your current max HP. Note: If you are on an Enemy tile, Step 5 will still trigger a fight after sleeping.
- Move: Roll d4 and move that many tiles forward along chosen path.

Step 5. Resolve the tile you ended on:

- Treasure tile: draw Treasure of that tile’s tier.
- Chance tile: draw and resolve immediately.
- Sanctuary tile: no duels can be initiated here; players cannot be forced out by other players’ cards or effects. You can still voluntarily move away on your next turn.
- Enemy tile: start a fight (see Combat). If a tile spawns multiple enemies, resolve using the multi-enemy rules.
- Empty tile: no effect.
- Important: You only resolve the tile you stop on (not those you pass through), except for special pass-over triggers like Ambush.

Step 6. If you are over capacity, drop down to capacity. If another player is present, they may immediately pick up the dropped item(s) before they go to the bottom of the deck.

End turn.

## Movement and board graph

- Movement is always d4.
- Movement history: For each player, record the exact forward path taken this turn to support effects that move you backward. When moving backward, follow and pop from your personal path history stack. If the history stack empties, continue backwards along the most natural reverse of the graph (previous node along the path you came from).

### Branches and shortcuts

- The board is a directed graph with 68 tiles total, Start and Final included. Two shortcut branches exist:
    - Shortcut A branches off early-mid and re-joins later; it is shorter than the main route by about 3 tiles and contains higher-tier tiles.
    - Shortcut B branches off late and re-joins near the end; it is shorter than the main route by about 3 tiles and is even riskier.

### Simultaneous arrival at the final tile

- If 2 or more players land on the Final tile from the same single effect resolution, those players must duel to decide the winner using a single-elimination mini-bracket in turn order.
- Otherwise, if a single player reaches the Final tile on their own, they immediately win.

### Tile types and colors

- Red = Enemy (tiered: 1, 2, 3)
- Yellow = Treasure (tiered: 1, 2, 3)
- Purple = Chance
- Green = Sanctuary
- Gray/White = Empty
- Start and Final are special tiles.

## Board map v1.0 (68 tiles)

IDs are integers. neighbors is the forward edge list. Start is 0. Final is 53. Branch tiles are 54–59 (Shortcut A) and 60–67 (Shortcut B).

For brevity, each tile lists: id, type, tier (if applicable), neighbors.

### Main path 0–53

0 start -> [1]

1 chance -> [2]

2 enemy t1 -> [3]

3 treasure t1 -> [4]

4 empty -> [5]

5 enemy t1 -> [6]

6 treasure t1 -> [7]

7 chance -> [8]

8 sanctuary -> [9]

9 enemy t1 -> [10]

10 chance (branch A start) -> [11,54]

11 treasure t1 -> [12]

12 enemy t1 -> [13]

13 empty -> [14]

14 chance -> [15]

15 enemy t1 -> [16]

16 treasure t1 -> [17]

17 sanctuary -> [18]

18 enemy t2 (branch A rejoin target) -> [19]

19 empty -> [20]

20 empty -> [21]

21 treasure t1 -> [22]

22 enemy t2 -> [23]

23 chance -> [24]

24 treasure t1 -> [25]

25 sanctuary -> [26]

26 treasure t2 -> [27]

27 enemy t2 -> [28]

28 chance -> [29]

29 enemy t1 -> [30]

30 treasure t1 -> [31]

31 sanctuary -> [32]

32 chance -> [33]

33 enemy t2 -> [34]

34 empty -> [35]

35 treasure t2 -> [36]

36 chance (branch B start) -> [37,60]

37 chance -> [38]

38 treasure t2 -> [39]

39 sanctuary -> [40]

40 enemy t2 -> [41]

41 sanctuary -> [42]

42 treasure t2 -> [43]

43 enemy t3 -> [44]

44 treasure t2 -> [45]

45 chance -> [46]

46 enemy t2 (branch B rejoin target) -> [47]

47 treasure t3 -> [48]

48 enemy t3 -> [49]

49 sanctuary -> [50]

50 chance -> [51]

51 empty -> [52]

52 enemy t3 -> [53]

53 final -> []

### Shortcut A 54–59 (10 branches to 18)

54 enemy t2 -> [55]

55 treasure t2 -> [56]

56 enemy t2 -> [57]

57 chance -> [58]

58 enemy t3 -> [59]

59 treasure t2 -> [18]

### Shortcut B 60–67 (36 branches to 46)

60 enemy t2 -> [61]

61 treasure t2 -> [62]

62 enemy t3 -> [63]

63 chance -> [64]

64 treasure t3 -> [65]

65 enemy t3 -> [66]

66 sanctuary -> [67]

67 enemy t2 -> [46]

## Decks and tiers

### Treasure decks

Three separate Treasure decks by tier. Reshuffle discards when empty. Unless a card says otherwise, “return to bottom of deck” means bottom of the same tier deck.

Tier 1 (24 cards)

- Dagger: Holdable, +1 Attack (4)
- Wooden Shield: Holdable, +1 Defense (4)
- Robe: Wearable, +1 Defense (3)
- Crude Axe: Holdable, +1 Attack (3)
- Lamp: Holdable, if your turn would end on a tile with a player or an enemy, you may step back 1 tile BEFORE resolving that tile (2)
- Trap: Small, place on your current tile; the next player who lands here skips their next turn (visible) (3)
- Luck Charm: Small, cancel a Chance card you just drew or another player just revealed; play immediately as an interrupt; then return to bottom of T1 (2)
- Beer: Drinkable, heal 3 HP; −1 to your next movement roll (2)
- Agility Draught: Drinkable, +1 to all your Defense rolls this turn (1)

Tier 2 (18 cards)

- Heirloom Armor: Wearable, +2 Defense (3)
- Silver Shield: Holdable, +2 Defense (3)
- Lord’s Sword: Holdable, +2 Attack (3)
- Boogey-Bane: Holdable, +2 Attack vs creatures only (2)
- Velvet Cloak: Wearable, +1 to movement roll (2)
- Rage Potion: Drinkable, +1 to all your Attack rolls this turn (2)
- Fairy Dust: Small, use before choosing Sleep; you become invisible to other players until your next turn starts or if any effect moves you; cannot be dueled while invisible (2)
- Smoke Bomb: Small, when someone offers a duel to you, play to prevent any duels for the remainder of the current turn; return to bottom of T2 (1)

Tier 3 (10 cards)

- Royal Aegis: Wearable, +3 Defense, −1 to movement roll (2)
- Essence of the Mysterious Flower: Drinkable, fully heal to max (2)
- Dragonfang Greatsword: Holdable, +3 Attack (2)
- Blink Scroll: Small, move yourself +2 or −2 tiles before resolving your tile; ignore pass-through effects; cannot move into or out of Sanctuary if a card/effect would force you (2)
- Wardstone: Small, the next time you would lose HP, prevent 1 HP loss, then discard (2)

### Chance deck (example 32-card set)

- Exhaustion: move 1 back (4)
- Cave-in: move 3 back (3)
- Faint: skip your next turn (2)
- Vital Energy: roll movement again immediately and move (2)
- Earthquake!: everyone rolls d4 and moves backward that much (resolve in seating order; effectively simultaneous; no intermediate duels) (2)
- Lost Treasure: skip next turn; draw 2 Tier 1 Treasures now (2)
- Jinn Thief: choose one of your items (equipped or in inventory) and return it to the bottom of the matching Treasure tier deck (3)
- Sprained Wrist: lose 1 HP (3)
- Covered Pit: draw 1 Tier 1 Treasure now (3)
- White-Bearded Spirit: move 2 forward (2)
- Mystic Wave: swap positions with the nearest player (tie breaks random; Sanctuary allowed because you affect yourself) (2)
- Nefarious Spirit: if any player is within 6 tiles, move to that player and immediately start a duel (nearest; tie random) (2)
- Ambush Opportunity: keep face down; starting next turn, place it on your current non-Sanctuary tile; the next time a player enters that tile during movement, you may immediately start a duel before the tile resolves; then discard (2)
- Instinct: keep face down; once on your turn, move yourself +1 or −1 tile before or after your movement roll; single use (2)

### Enemy decks and tiers

General rules

- Enemy cards are separate decks by tier. Shuffle each at game start; reshuffle when empty.
- Each enemy has: name, HP, Attack bonus, Defense bonus, and optional rule.
- When you land on an Enemy tile, draw the composition for that tile’s tier and place enemies in a queue on the tile.

Enemy tile compositions by tile tier

- Tier 1 tile (E1): Draw 1× T1 enemy.
- Tier 2 tile (E2): 70% draw 2× T1; 30% draw 1× T2.
- Tier 3 tile (E3): 70% draw 2× T2; 20% draw 1× T2 + 1× T1; 10% draw 1× T3.

Enemy deck examples

Tier 1 (approx 18)

- Goblin: HP 1, Atk +1, Def +0 (6)
- Wolf: HP 1, Atk +2, Def −1 (4)
- Skeleton: HP 1, Atk +1, Def +1 (4)
- Bandit: HP 1, Atk +1, Def +0 (4)

Tier 2 (approx 12)

- Orc: HP 2, Atk +2, Def +1 (4)
- Troll: HP 2, Atk +3, Def 0 (4)
- Cultist: HP 2, Atk +1, Def +2 (2)
- Ogre: HP 3, Atk +2, Def +1 (2)

Tier 3 (approx 10)

- Dragon Whelp: HP 3, Atk +3, Def +2 (3)
- Lich: HP 3, Atk +2, Def +3 (2)
- Demon: HP 4, Atk +3, Def +1 (2)
- Giant: HP 4, Atk +2, Def +2 (3)

### Loot drops from enemies

- The player who triggered the Enemy tile gets all loot by default. Others may duel them to contest, as per normal rules.
- Per enemy defeated, roll for a drop:
    - T1 enemy: 50% chance 1× T1 Treasure.
    - T2 enemy: 70% chance 1× T2 Treasure; 15% chance 1× T1 Treasure; 15% nothing.
    - T3 enemy: 80% chance 1× T3 Treasure; 20% chance 1× T2 Treasure.
- If multiple enemies are defeated in the same combat, resolve each drop separately.

## Combat and duels

Start

- Fights: If you land on an Enemy tile, you must fight before ending your turn.
- Duels: During Step 3 on a shared non-Sanctuary tile, a duel may be offered by either player.

Round structure (both fights and duels)

- Each round, both sides roll Attack (d6 + modifiers) and Defense (d6 + modifiers).
- Compare simultaneously:
    - If Attacker’s Attack > Defender’s Defense, Defender loses 1 HP.
    - If Defender’s Attack > Attacker’s Defense, Attacker loses 1 HP.
    - If equal, no damage.
- Repeat until at least one side is at 0 HP or someone retreats.

Multiple-enemy fight

- On your turn, you choose one enemy to target each round.
- Each enemy targets the current fighter unless co-op assistance is present.
- Resolve simultaneous comparisons for each attacker/defender pair.
- Enemies with 0 HP are removed immediately. Continue until all enemies are dead, you retreat, or you drop to 0 HP.

Retreat

- At any point in a fight or a duel, a participant may retreat. They immediately move 6 tiles backward along their movement history, end their turn, and the combat ends. No extra penalty.
- Retreat is allowed from both PvE and duels.

Losing

- If you lose a PvE fight on a red tile: move back 1 tile and you must Sleep on your next turn. You do not drop items.
- If you lose a duel by reaching 0 HP: you stay on this tile at 0 HP. The winner may loot any or all of your items. Items not looted remain with you. On your next turn you must Sleep to recover.

Lamp timing

- If your turn would end on a tile with a player or an enemy, Lamp lets you step back 1 tile before resolving that tile. This can avoid a fight or a duel. Can be used every time the condition occurs.

## Sanctuary rules

- No duels may be initiated on Sanctuary.
- Traps and Ambush cannot be placed here.
- You cannot be forced out of Sanctuary by other players’ cards. Cards that move yourself still work if you play them on yourself.

## Chance effects pushing you around

- If you are moved to a new tile during someone else’s turn, you do not resolve that tile immediately. You resolve it at Step 1 of your next turn.

## Final tile

- First to the Final tile wins instantly unless multiple players arrive there simultaneously from one effect; if so, run the tie-breaker duel bracket.

## Chat, log, and transparency

- Chat panel per room.
- Public action log shows dice results, tiles entered, card names and effects, item equips/uses that are public, HP changes, combat round summaries, and loot assignment.
- Hidden inventory uses show “used a hidden item” only if the effect’s text allows hidden use; otherwise show the card’s name.

## Analytics (match summary)

- Keep a summary only for the life of the match, then discard: turns taken, total tiles moved, enemies defeated by tier, duels won/lost, items acquired/consumed, time elapsed.

## Kicking and moderation

- Room owner can kick from lobby or in-game. The seat becomes open for reconnection by the same joining code+id. No profanity filter in MVP.

## Implementation brief

### Architecture

- Frontend: React + TypeScript + Vite. State management with Zustand or Redux Toolkit. UI with CSS modules or Tailwind. Web Audio API hooks (mute by default; stub SFX).
- Backend: Firebase Firestore + Firebase Anonymous Auth. No custom server. All game logic on clients with lightweight validation via Security Rules and optimistic concurrency.

### Why Firestore

- Simple hosting, real-time updates, low-cost hobby use. Rules constrain who can write room/game docs, though not bulletproof. Acceptable for non-commercial casual play.

### Project structure

- /src/app: routing, providers
- /src/game:
    - /engine: pure TypeScript rules engine
    - /data: board JSON, item definitions, enemy decks, chance deck, class definitions
    - /ui: components (board, hand/inventory, combat panel, chat, log, dialogs)
    - /net: firestore adapters, room API
    - /state: client state slices
    - /assets: placeholder art and SFX
    - /util: RNG, dice helpers, path utils
- /functions: none in MVP

## Data model (Firestore)

Collections and documents

- rooms/{roomId}
    - code, ownerUid, createdAt, updatedAt
    - status: lobby | playing | ended
    - maxPlayers
    - seats: up to 6
    - gameId
- games/{gameId}
    - version, status, currentPlayerUid, phase
    - board: static id reference and per-player positions
    - playerStates: position, hp, maxHp, classId, inventory, flags, movementHistory
    - decks: treasureT1/T2/T3, chance, enemyT1/T2/T3, discards
    - tileState: traps, ambushes, enemies
    - combat: type, participants, round, pendingRolls
    - finalTileTie: uids
    - rngAudit: optional
- games/{gameId}/log/{entryId}
    - ts, actorUid, type, payload, message
- games/{gameId}/chat/{msgId}
    - ts, uid, nickname, text
- games/{gameId}/actions/{actionId}
    - ts, uid, type, payload

## Security rules (high-level)

- rooms: anyone with code may read; owner controls kicks and owner-only fields; authenticated user can claim a free seat and set nickname/ready.
- games: read only to seated players; writes restricted by phase; only currentPlayerUid progresses turn; anyone can write chat/log; owner can set ended as fallback.

## RNG

- Use crypto.getRandomValues for d4/d6. Write all rolls to action log with actorUid. Optional per-game seed in dev for deterministic tests.

## Turn/phase state machine

1. turnStart: resolve pending tile from external movement; then manage.
2. manage: equipment swaps; then preDuel.
3. preDuel: duel offers and trades on shared non-Sanctuary tiles; then moveOrSleep.
4. moveOrSleep: choose sleep or move; roll d4 if moving; store movementHistory; then resolveTile.
5. resolveTile: apply tile logic; enemy leads to combat; otherwise capacity.
6. combat/duel: resolve until end; then postCombat or endTurn as specified.
7. postCombat: if applicable; then capacity.
8. capacity: enforce inventory caps and pickups; then endTurn.
9. endTurn: advance to next player; clear per-turn flags; version++.

## Board routing and backward movement

- Forward: choose a neighbor; append to movementHistory.
- Backward: pop movementHistory for up to N steps; if empty, use reverse edges; for multiple predecessors, prefer lastFrom, else lower tile id.

## Trading

- Step 3 only, on shared tiles. Items transfer directly if capacity allows; excess drops are handled at Step 6.

## Dueling at the final tile in tie cases

- Freeze normal turn cycle, run bracket in seat order among tied players, declare winner, set game status to ended.

## UI flows

Lobby

- Enter nickname and room code; seat selection; class selection (no duplicates); ready toggles; owner start when all ready and 2–6 seated.

Game

- Left: board and tokens; branch decision UI at splits.
- Right: HP, class, equipped/inventory, visible items on others, current tile info, enemies present.
- Bottom: chat and action log with filters.
- Popups: draw/equip/store/use/drop; combat roller; duel offers; tie-at-final bracket.

## Accessibility and aesthetics

- Color-blind friendly palette and clear icons. Minimal medieval placeholder art. Sound hooks present but muted by default with a simple toggle.
