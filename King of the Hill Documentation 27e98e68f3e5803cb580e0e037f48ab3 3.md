# King of the Hill Documentation

<aside>
💡

Medieval adventure race for 2-6 players. Advance through the tiles and be the first player to reach the end tile. Fight enemies, discover loot, and experience chaotic events based on the tile you land. 

</aside>

# Features

- Classes: Players can pick from several different classes that determine their starting gear and playstyle.
- Roll to Move: Players roll a 4-sided dice to move. They can land on different tiles:
    - Enemy Tile: Draw n-amount of t-tier ENEMY-type cards, based on the tile
    - Treasure Tile: Draw n-amount of t-tier TREASURE-type cards, based on the tile
    - Luck Tile: Draw a LUCK card.
    - Sanctuary Tile: No Duels can be initiated here and it trumps every other card and effect.
    - Final Tile: Reaching here and staying alive for a full turn wins the game!
- Combat: Players can fight Enemies when they land on an Enemy tile. Players can fight other Players when they are on the same tile.
- Inventory: Players carry equipment that are actively Equipped or Carried in a backpack. Equipped Items contribute to the Player’s stats (like increased Damage or Health). Carried items can be equipped/swapped at the start of the player’s turn.
- Logs: Every action and their results are logged neatly in a universal logger that is streamed to the players in a chat box.

## Technical Specifications

- Typescript, React, Vite
- **Game State Management**: The entire game state (player positions, inventories, card decks, etc.) will be managed using a single JSON object in **Firebase Realtime Database (RTDB)**. Client applications will listen for changes to this object and write updates directly to it, allowing for simple, real-time synchronization between all players
- Simple browser game to be hosted on a static website
- Players enter lobby via 6-digit alphanumeric invite code
- Cards (therefore Enemies, Treasures, Luck Cards ,etc.) and Classes must be easily editable.
- Responsive laptop screen layout. No mobile considerations necessary

## Repo Structure

king-of-the-hill/
├── public/                // Static assets (favicon, background images, etc.)
│   └── background.png
│
├── src/
│   ├── assets/            // Assets imported into components (SVGs, sound effects)
│   │   ├── sword-hit.mp3
│   │   └── token-scout.svg
│   │
│   ├── components/        // Reusable React components
│   │   ├── game/          // Components specific to the game screen
│   │   │   ├── Board.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Dice.tsx
│   │   │   └── PlayerToken.tsx
│   │   │
│   │   └── ui/            // General-purpose UI components
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       └── Modal.tsx
│   │
│   ├── data/              // "Easily editable" game data
│   │   ├── cards.ts       // Treasure, Luck, etc.
│   │   ├── classes.ts
│   │   └── enemies.ts
│   │
│   ├── hooks/             // Custom React hooks
│   │   └── useGameState.ts  // Hook to subscribe to Firebase RTDB
│   │
│   ├── lib/               // Libraries and external service configs
│   │   └── firebase.ts    // Firebase initialization and config
│   │
│   ├── screens/           // Top-level components for each game screen
│   │   ├── WelcomeScreen.tsx
│   │   ├── LobbyScreen.tsx
│   │   └── GameScreen.tsx
│   │
│   ├── state/             // Global state management logic
│   │   └── gameSlice.ts   // Functions to update the game state in Firebase
│   │
│   ├── types/             // TypeScript type definitions
│   │   └── index.ts       // Interfaces for Player, Card, GameState, etc.
│   │
│   ├── App.tsx            // Main app component, handles routing between screens
│   ├── main.tsx           // Application entry point
│   └── index.css          // Global styles
│
├── .env.local             // Environment variables (Firebase API keys)
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts

## Design Direction

- Medieval adventure aesthetic
- Rocky, mountainous themes, colors
- Dark fantasy - skeuomorphic UI elements

## Assets

- Provisions for sound effects, images and svg files.
- Placeholder with emojis until assets are in place.

# Screens

## Welcome Screen

This is the first screen anyone sees when they visit [localhost](http://localhost) / the associated domain

- Players must write Nickname or enter an invite code
- When they write their Name they can click start.

## Lobby Screen

This is the waiting lobby screen where the players can pick a Class

- 6-digit alphanumeric code generated with the first player opening the lobby (after the previous screen)
    - Other players can then input the displayed invite code to join the same lobby
- Class Selection Screen: Classes are displayed with an icon, their name, 1-sentence description and their special effect
- After picking a Class, the player is considered “Readied up”
- The host can then press “start game” to start the game and move to the Game Screen

## Game Screen

This is where the game is actually played. 

Upon entering, players roll dice to determine turn start order. Tied players roll again. This is repeated once and the turn order applies for the entire game. 

- Game Board: Made of 20 tiles that go linearly from start to finish in a snake layout (to preserve space). Tiles are colored differently to indicate their type. Enemy and Treasure tiles have 1-2-3 tiers. Player tokens are visible on the game board.
- Inventory: This shows the player’s Equipped & Carried items. It also shows the Equipped Items of other players on the same tile. It also shows the Equipped + Carried items of players with 0 HP on the same tile.
    - Equipped Items: 2 holdable, 1 wearable
    - Carried Items: Can contain 4 small/consumable items, 2 small/consumable + 1 wearable/holdable item, or 2 wearable/holdable items.
- Logs / Chat Screen: A tab that lets you switch between lobby chat and event logs (Player threw this dice, landed on that tile, etc.)
- Cards: Treasure Deck, Enemy Deck and Luck Deck are shown next to each other. Hovering reveals the amount of cards left.
- Initiative Modal: Where all players simultaneously roll dice to determine starting order.
- Trade Modal: Players can carry items into this modal box to trade.
- Duel Modal: When a Duel is initiated, a modal pops showcasing each player’s Health, Equipped Items, Attack and Defence scores.
- Hovering: Hovering over a tile or an item (on the inventory tab) will reveal it’s name and full effect in a tooltip.

# Turn Structure

1. Before the player can take any action, they can swap between their Equipped and Carried Items, or use a Consumable Item. 
2. Possible Actions are:
    1. Move: Roll a 4-sided die to determine how many tiles you will move forward.
    2. Sleep: This skips any movement. Player stays on the same tile but restores to full HP at the end of their turn. 
    3. Duel: A player can begin a Duel with another player on their Tile.
    4. Trade: Two players on the same tile can trade items. 
        1. Players drag & drop the items they want to trade.
        2. Both players must click “accept” before trade finalizes.
        3. Any addition / removal of items resets the “accept” condition.
3. If the player has moved, the effects of the landed tile will take place (Draw Treasure card if on Treasure tile, etc.).
4. If the inventory is full, players must “Drop” items from their inventory before ending their turn. 
5. The player then presses “End Turn”

Notes: 

- Pass-through: No effects are triggered when moving over the tiles, only landed tiles have their effects triggered. Retreat obeys this rule as well.
- Final Tile cannot be overshot: If you rolled more, then you automatically stop at the Final tile. Remaining here for a full turn wins you the game.

# Combat

Combat works the same for player vs. enemy and player vs. player. 

1. Starting Combat
    1. Vs. Enemies: When a Player lands on an enemy Tile, they draw n-amount of t-tier Enemy cards to face off.
    2. Vs. Other Players: When a Player lands on a tile with another player, they can initiate a duel. (Sanctuary Tiles prevent this)
2. Combat Rounds
    1. Each round, both sides roll a 6-sided Attack die and 6-sided Defence die
    2. All bonuses from Equipped Items or the Player’s Class are added to this calculation.
    3. Each Player’s Attack score is compared with the opposing Player’s Defence score.
        1. If Attack > Defence, 1 HP is lost in that round.
        2. If Attack ≤ Defence, no HP is lost
    4. Combat continues until one side is reduced to 0 HP or one player uses the “Retreat” action in-between combat rounds.
        1. Retreat: Immediately cease combat and move back 6 tiles. 
3. Multiple Enemies
    1. If a Player is facing multiple Enemies, they must choose which target to attack in that round. Multiple Enemies can attack the same player in the same round. 
    2. Duels can take place featuring multiple Players. Each round, the player must choose whom to attack.
    3. Fight continues until all Enemies are at 0 HP or the player chooses the Retreat action. 
4. Losing the Fight
    1. If the player’s HP is reduced to 0 when fighting Enemies, they immediately move 1 tile back and take the “Sleep” action. No Items are dropped.
    2. If the player’s HP is reduced to 0 during a Duel, the player stays on that tile and takes the “Sleep” action. The winning Player is now free to choose among the losing Player’s Inventory (both Equipment and Carried). They can pick and swap as many items as they’d like provided they don’t exceed their Inventory capacity.
5. Aftermath
    1. If a Player lost a combat against Enemies, the Enemies despawn and Enemy cards go back under the deck. 

# Classes and Stats

## Base Stats

- Every player has 5 HP
- Every player has +1 Attack, +1 Defence (at base level)
- Every player has 1 Wearable, 2 Holdable Item capacity in their Equipment.
- Every player has 4 “slots” in their Carried Items
    - Wearable and Holdable Items (swords, armor) occupy 2 slots.
    - Small / consumable items occupy 1 slot.

## Classes

- Scout: Immune to Traps.
- Hunter: +1 Attack bonus when fighting Enemies.
- Gladiator: +1 Attack bonus when fighting Players.
- Warden: +1 Defence bonus when fighting Enemies
- Guard: +1 Defence bonus when fighting Players
- Monk: For once in the entire game, when your HP drops to 0, restore it back to 1 HP. Then expire this effect.
- Porter: +1 Slot for Carried Items (4→5)

# Cards

All cards are discarded after use. When the deck is finished, all discarded cards are mixed again and a new deck is formed.

## Enemies

### Enemy decks and tiers

General rules

- Enemy cards are separate decks by tier. Shuffle each at game start; reshuffle when empty.
- Each enemy has: name, HP, Attack bonus, Defense bonus
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

## Treasure decks

Three separate Treasure decks by tier. Reshuffle discards when empty. Unless a card says otherwise, “return to bottom of deck” means bottom of the same tier deck.

Tier 1 (24 cards)

- Dagger: Holdable, +1 Attack (4)
- Wooden Shield: Holdable, +1 Defense (4)
- Robe: Wearable, +1 Defense (3)
- Crude Axe: Holdable, +1 Attack (3)
- Lamp: Holdable, if your turn would end on a tile with a player or an enemy, you may step back 1 tile BEFORE resolving that tile (2)
- Trap: Small, place on your current tile; the next player who lands here skips their next turn (visible) (3)
- Luck Charm: Small, cancel a Luck card you just drew or another player just revealed; play immediately as an interrupt; then return to bottom of T1 (2)
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
- When you and on an Enemy tile, draw the composition for that tile’s tier and place enemies in a queue on the tile.

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