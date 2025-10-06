# 👑 King of the Mountain

A browser-based, real-time multiplayer board game for 2-6 players. Race to the mountain peak while fighting enemies, collecting treasures, and surviving chaotic events!

![Medieval Adventure Board Game](https://img.shields.io/badge/Status-In%20Development-yellow)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![Firebase](https://img.shields.io/badge/Firebase-RTDB-orange)

## 🎮 Game Overview

**King of the Mountain** is a medieval adventure race where players compete to reach the final tile first. Choose from 7 unique classes, battle enemies, collect powerful items, and engage in player-vs-player duels on a dynamic 20-tile board.

### Key Features

- 🎭 **7 Unique Classes** - Scout, Hunter, Gladiator, Warden, Guard, Monk, Porter
- 🎲 **Turn-Based Gameplay** - Roll dice to move, fight, trade, or rest
- ⚔️ **Combat System** - Battle enemies and other players with strategic dice rolls
- 🎒 **Inventory Management** - Equip weapons and armor, manage limited backpack space
- 🃏 **3-Tier Card System** - 40+ enemy types, 50+ items, 32 luck cards
- 🌐 **Real-Time Multiplayer** - Powered by Firebase Realtime Database
- 🏰 **Medieval Dark Fantasy Theme** - Immersive UI with skeuomorphic design

## 🚀 Quick Start

### Prerequisites

- Node.js v20.19+ or v22.12+
- npm v10+
- Firebase account ([create one free](https://firebase.google.com))

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd king-of-the-mountain

# 2. Install dependencies
npm install

# 3. Set up Firebase
# - Create a new Firebase project at https://console.firebase.google.com
# - Enable Realtime Database (not Firestore)
# - Copy .env.example to .env.local and add your Firebase credentials

cp .env.example .env.local

# 4. Run the development server
npm run dev

# 5. Open http://localhost:3000 in your browser
```

### Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Navigate to **Build > Realtime Database** and click "Create Database"
4. Choose "Start in test mode" for development
5. Go to **Project Settings > Your Apps** and copy your config
6. Paste the config values into `.env.local`:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 🎯 How to Play

### 1. Welcome Screen
- Enter your nickname
- Create a new game or join with a 6-digit code

### 2. Lobby
- Choose your class (each has unique abilities)
- Wait for other players to join (2-6 players)
- Ready up and let the host start the game

### 3. Gameplay
Players take turns in this order:

1. **Pre-Action**: Swap equipped/carried items
2. **Action**: Choose one:
   - 🎲 **Move**: Roll d4 and move forward
   - 😴 **Sleep**: Stay on tile, restore full HP
   - ⚔️ **Duel**: Fight another player on your tile
   - 🤝 **Trade**: Exchange items with another player
3. **Tile Effect**: Resolve the tile you landed on
4. **End Turn**: Next player's turn

### Win Condition
Be the first to reach the **Final Tile (19)** and survive there for one full turn!

## 📁 Project Structure

```
king-of-the-mountain/
├── src/
│   ├── components/      # Reusable React components
│   ├── data/            # Game data (classes, items, enemies)
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Firebase config
│   ├── screens/         # Main game screens
│   ├── state/           # State management
│   ├── types/           # TypeScript definitions
│   └── index.css        # Global styles
├── DEVELOPER_GUIDE.md   # Comprehensive developer documentation
└── package.json
```

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Database**: Firebase Realtime Database
- **Styling**: Custom CSS with CSS Variables
- **State Management**: Firebase RTDB as single source of truth

## 📚 Documentation

- **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** - Complete developer documentation
  - Architecture overview
  - Implementation status
  - How to extend the game
  - Troubleshooting guide

- **[King of the Hill Documentation.md](./King%20of%20the%20Hill%20Documentation.md)** - Original game design document
  - Complete game rules
  - Card descriptions
  - Combat mechanics
  - Turn structure

## 🏗️ Development Status

### ✅ Completed
- Project structure and TypeScript configuration
- All game data (classes, items, enemies, luck cards)
- UI components (Button, Input, Modal, Board, Cards, Dice)
- Three main screens (Welcome, Lobby, Game)
- Firebase integration and real-time state sync
- Medieval dark fantasy styling
- Basic turn system (move, sleep, end turn)
- Event logging

### 🚧 In Progress
- Combat system (PvE and PvP)
- Tile effect resolution
- Inventory drag & drop
- Item special effects
- Luck card effects
- Trading system
- Class special abilities

### 📋 Planned
- Animations and sound effects
- Chat system
- Spectator mode
- Mobile responsiveness
- Player statistics

## 🤝 Contributing

This is a learning project, but contributions are welcome! Here's how you can help:

1. **Pick a feature** from the "In Progress" or "Planned" sections
2. **Read the [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** for implementation details
3. **Create a branch** and implement the feature
4. **Test thoroughly** with multiple players
5. **Submit a pull request** with a clear description

## 🎨 Customization

### Adding New Classes

Edit `src/data/classes.ts`:

```typescript
{
  name: 'YourClass',
  icon: '🎭',
  description: 'One-sentence description',
  specialEffect: 'Detailed ability description',
}
```

### Adding New Items

Edit `src/data/cards.ts`:

```typescript
() => createItem('Item Name', 'holdable', 2, 'Description', {
  attackBonus: 2,
  defenseBonus: 1,
})
```

### Modifying Board Layout

Edit `src/data/BoardLayout.ts` to easily customize:
- **Total number of tiles** (default: 20) - Change `BOARD_CONFIG.totalTiles`
- **Board pattern** - Edit the `BOARD_PATTERN` array to rearrange tiles
- **Sanctuary positions** - Update `BOARD_CONFIG.sanctuaryTiles`

Tile counts are **automatically calculated** from the pattern - no manual counting needed!

## 📜 License

This project is open source and available for educational purposes.

## 🙏 Acknowledgments

- Inspired by classic adventure board games
- Built with ❤️ using modern web technologies
- Designed for learning React, TypeScript, and real-time multiplayer

---

**Ready to climb the mountain? 🏔️⚔️**

For detailed development documentation, see [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
