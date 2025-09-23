# Firebase Deployment Instructions for King of the Mountain

This guide walks you through setting up Firebase for your King of the Mountain multiplayer game.

## Prerequisites

- Node.js installed (v18+ recommended)
- A Google account
- Git installed (for deployment)

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Create a project"** or **"Add project"**
3. Enter project name: `king-of-the-mountain` (or your preferred name)
4. **Disable Google Analytics** for now (you can enable later if needed)
5. Click **"Create project"** and wait for setup

## Step 2: Enable Anonymous Authentication

1. In Firebase Console, select your project
2. In left sidebar, click **"Authentication"**
3. Click **"Get started"** if first time
4. Go to **"Sign-in method"** tab
5. Find **"Anonymous"** in the providers list
6. Click it and toggle **"Enable"**
7. Click **"Save"**

## Step 3: Create Firestore Database

1. In left sidebar, click **"Firestore Database"**
2. Click **"Create database"**
3. Choose **"Start in production mode"** (we'll add proper rules)
4. Select your preferred location (choose closest to your users):
   - For US: `us-central1` or `us-east1`
   - For Europe: `europe-west1`
   - For Asia: `asia-southeast1`
5. Click **"Enable"**

## Step 4: Get Firebase Configuration

1. In Firebase Console, click the **gear icon** → **"Project settings"**
2. Scroll down to **"Your apps"** section
3. Click **"</> Web"** icon to add a web app
4. Register app with nickname: `king-of-the-mountain-web`
5. **Don't check** "Firebase Hosting" for now
6. Click **"Register app"**
7. Copy the configuration object shown:

```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

## Step 5: Configure Your Local Project

1. In your project root, create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

2. Open `.env` and fill in your Firebase config:

```env
VITE_FIREBASE_API_KEY=your-actual-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

3. **IMPORTANT**: Make sure `.env` is in your `.gitignore` file (it should be already)

## Step 6: Install Firebase CLI Tools

1. Install Firebase CLI globally:

```bash
npm install -g firebase-tools
```

2. Login to Firebase:

```bash
firebase login
```

3. Initialize Firebase in your project:

```bash
firebase init
```

Select the following options:
- **Which Firebase features?** Select `Firestore` and `Hosting` (use spacebar to select, then Enter)
- **Select existing project**: Choose your `king-of-the-mountain` project
- **Firestore Rules**: Keep default `firestore.rules`
- **Firestore Indexes**: Keep default `firestore.indexes.json`
- **Public directory**: Type `dist` (this is where Vite builds to)
- **Single-page app**: Type `y` (yes)
- **GitHub deploys**: Type `n` (no, for now)
- **Overwrite dist/index.html**: Type `n` (no)

## Step 7: Deploy Security Rules

1. The security rules are already created in `firestore.rules`
2. Deploy them:

```bash
firebase deploy --only firestore:rules
```

3. Verify in Firebase Console → Firestore Database → Rules tab

## Step 8: Build and Test Locally

1. Install dependencies if not already:

```bash
npm install
```

2. Run development server:

```bash
npm run dev
```

3. Test that Firebase connects properly:
   - Open browser console
   - Should see no Firebase errors
   - Try creating a room to test connection

## Step 9: Deploy to Firebase Hosting (Optional)

If you want to host the game on Firebase:

1. Build the production version:

```bash
npm run build
```

2. Deploy to Firebase Hosting:

```bash
firebase deploy --only hosting
```

3. Your game will be available at:
   - `https://your-project-id.web.app`
   - `https://your-project-id.firebaseapp.com`

## Step 10: Monitor and Manage

### Useful Firebase Console Sections:

- **Authentication → Users**: See anonymous users who have connected
- **Firestore Database → Data**: Browse rooms and games in real-time
- **Firestore Database → Usage**: Monitor read/write operations
- **Project Settings → Usage and billing**: Track free tier limits

### Free Tier Limits (as of 2024):

- **Firestore**:
  - 50K reads/day
  - 20K writes/day
  - 20K deletes/day
  - 1GB storage
- **Authentication**:
  - Unlimited anonymous auth
- **Hosting**:
  - 10GB storage
  - 360MB/day bandwidth

These limits are more than sufficient for development and small-scale play.

## Troubleshooting

### Common Issues:

1. **"Permission denied" errors**
   - Check that security rules are deployed
   - Ensure user is authenticated (even anonymously)
   - Verify room/game IDs match

2. **"Firebase not initialized" errors**
   - Check `.env` file has correct values
   - Ensure `.env` is in project root
   - Restart dev server after changing `.env`

3. **"Network error" or timeouts**
   - Check Firebase project is active
   - Verify Firestore database is created
   - Check browser console for CORS issues

4. **Anonymous users not persisting**
   - Firebase anonymous auth persists per browser
   - Clearing cookies/storage will create new user
   - Use browser's incognito mode to test multiple users

### Testing Multiplayer Locally:

1. Open game in multiple browser tabs/windows
2. Use different browsers for different players
3. Or use regular + incognito windows
4. Each will get different anonymous user IDs

## Security Considerations

1. **Never commit `.env` file** to version control
2. **Use environment variables** for all sensitive config
3. **Restrict API keys** in Google Cloud Console (optional):
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Select your project
   - Go to "APIs & Services" → "Credentials"
   - Click on your API key
   - Add application restrictions (HTTP referrers)
   - Add your domains: `localhost:*`, `*.web.app`, `*.firebaseapp.com`

## Next Steps

1. **Set up GitHub Actions** for automatic deployment (optional)
2. **Enable Firebase Analytics** for player metrics (optional)
3. **Add custom domain** via Firebase Hosting (optional)
4. **Set up billing alerts** before going to production
5. **Create backup/export strategy** for game data

## Support Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Pricing Calculator](https://firebase.google.com/pricing)
- [Firebase Status Dashboard](https://status.firebase.google.com)

## Quick Command Reference

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy everything
firebase deploy

# Deploy only rules
firebase deploy --only firestore:rules

# Deploy only hosting
firebase deploy --only hosting

# Run local emulators (for testing)
firebase emulators:start

# View deployment history
firebase hosting:releases:list
```

---

**Remember**: The free tier is generous for development. You'll only need to upgrade to a paid plan if your game becomes very popular (>50K reads/day).

## Phase 4 UI Implementation Summary

### Completed UI Components

The UI implementation (Phase 4) has been completed with the following structure:

#### Technology Stack
- **React** with TypeScript for component development
- **React Router** for navigation between Lobby and Game screens
- **Zustand** for client-side state management
- **Tailwind CSS** for styling (with custom game-specific colors)
- **Firebase** integration for authentication and real-time data

#### Component Architecture

```
src/game/ui/
├── screens/
│   ├── LobbyScreen.tsx      # Room creation/joining, seat selection, class picking
│   └── GameScreen.tsx        # Main game interface with all game components
├── components/
│   ├── BoardCanvas.tsx       # Visual game board with 68 tiles and player tokens
│   ├── PlayerHUD.tsx         # HP, class info, status effects
│   ├── InventoryPanel.tsx    # Equipment and inventory management
│   ├── TurnControls.tsx      # Action buttons (Move/Sleep/Duel/Retreat)
│   ├── TilePanel.tsx         # Current tile information
│   ├── CombatPanel.tsx       # PvE combat interface
│   ├── ChatPanel.tsx         # Real-time chat
│   ├── LogPanel.tsx          # Action history log
│   └── DiceRoll.tsx          # Animated dice display
├── dialogs/
│   ├── DuelDialog.tsx        # PvP duel interface
│   ├── DrawDialog.tsx        # Treasure/Chance card reveals
│   ├── CapacityDialog.tsx    # Inventory overflow management
│   └── BranchChoicePrompt.tsx # Path selection at board splits
└── stores/
    └── gameStore.ts          # Zustand store for UI state

```

#### Visual Design Without External Assets

Since no external assets were available, the UI uses:
- **Color-coded tiles**: Red (Enemy), Yellow (Treasure), Purple (Chance), Green (Sanctuary)
- **Unicode symbols**: ⚔️ (combat), 🛡️ (sanctuary), 💰 (treasure), 🎲 (dice), 👑 (final)
- **CSS animations**: Dice rolling, token movement, pulse effects
- **Tier coloring**: Gold (T1), Amber (T2), Purple (T3) for items

#### Development Server

The application runs on Vite development server:
```bash
npm run dev
# Access at http://localhost:5173/
```

### Connecting UI to Backend

To fully activate the multiplayer game:

1. **Firebase Configuration**: The UI expects Firebase credentials in `.env` file (see Step 5 above)

2. **Component-Engine Connection Points**: All UI components have console.log statements showing where to dispatch actions to the game engine

3. **Real-time Sync**: The UI is prepared to subscribe to Firestore collections for:
   - Room updates (lobby state)
   - Game state changes
   - Chat messages
   - Action logs

### Testing the UI

1. **Single Player Testing**:
   - Run `npm run dev`
   - Navigate through screens
   - All UI interactions work but don't persist without Firebase

2. **Multiplayer Testing** (after Firebase setup):
   - Open multiple browser tabs
   - Use incognito windows for different players
   - Each gets a unique anonymous auth ID

### UI Features Implemented

✅ **Lobby Features**:
- Room creation with 6-character codes
- Seat selection (up to 6 players)
- Class selection (8 unique classes, no duplicates)
- Ready status toggle
- Owner controls for starting game

✅ **Game Board**:
- 68 tiles with visual connections
- Player tokens with initials
- Tile state indicators (traps, ambushes)
- Branch choice highlighting
- Zoom/pan capable canvas

✅ **Player Management**:
- HP bars with low-health warnings
- Class passive reminders
- Temporary effect indicators
- Equipment display

✅ **Combat System**:
- Enemy queue display
- Target selection
- Dice roll animations
- Round-by-round results
- Retreat options

✅ **Inventory System**:
- Drag-and-drop equipment management
- Capacity indicators (Alchemist +1 bandolier, Porter +1 backpack)
- Item tier visual coding
- Quick-use potion buttons

✅ **Real-time Features**:
- Turn indicators
- Chat system
- Action logging with filters
- Phase-appropriate controls

### Performance Considerations

- Components use React.memo where appropriate
- Virtual scrolling ready for long chat/log lists
- Optimistic UI updates prepared
- Minimal re-renders with Zustand state slicing

### Accessibility Features

- Keyboard navigation support
- ARIA labels for screen readers
- Color-blind friendly palette option
- Focus management for dialogs
- Semantic HTML structure

### Next Development Steps

1. **Connect Firebase services** to enable real multiplayer
2. **Wire up game engine actions** to replace console.log placeholders
3. **Add sound effects** using Web Audio API (optional)
4. **Implement keyboard shortcuts** for common actions
5. **Add tutorial/help overlay** for new players