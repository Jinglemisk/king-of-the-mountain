# Firebase Setup & Network Instructions

## Current Status: Mock Mode (Local Development)

The app currently runs in **mock mode** for local development without requiring Firebase setup. This allows you to:
- Test the game locally without cloud services
- Create and join rooms using localStorage (persists across tabs)
- Develop features without Firebase dependencies
- See real-time updates across multiple browser tabs
- Rooms persist even after page refresh

## How the System Works

### Automatic Mode Detection
The app automatically detects which mode to use based on your `.env` file:
- **Mock Mode**: When Firebase credentials are placeholders (`your-api-key`)
- **Firebase Mode**: When real Firebase credentials are provided

### Service Architecture
```
roomService.ts (main interface)
  ├── Checks isInMockMode()
  ├── If true  → mockRoomService.ts (local in-memory)
  └── If false → Firebase Firestore (cloud database)
```

## Setting Up Firebase (When Ready for Production)

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project"
3. Enter project name (e.g., "king-of-the-mountain")
4. Disable Google Analytics (optional)
5. Click "Create project"

### Step 2: Enable Required Services

#### Enable Anonymous Authentication
1. In Firebase Console → Authentication
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Anonymous" provider
5. Click "Save"

#### Enable Firestore Database
1. In Firebase Console → Firestore Database
2. Click "Create database"
3. Choose "Start in production mode"
4. Select your preferred region
5. Click "Enable"

### Step 3: Get Your Configuration

1. In Firebase Console → Project Settings (gear icon)
2. Scroll to "Your apps" section
3. Click "</>" (Add web app)
4. Register app with a nickname
5. Copy the configuration object

### Step 4: Update Environment Variables

Replace placeholder values in `.env`:

```env
# Replace these with your actual Firebase config
VITE_FIREBASE_API_KEY=AIzaSy...your-actual-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### Step 5: Configure Security Rules

In Firestore → Rules tab, add these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Rooms collection
    match /rooms/{roomCode} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && (
        // Owner can update
        resource.data.ownerUid == request.auth.uid ||
        // Players in room can update their own seats
        request.auth.uid in resource.data.seats[*].uid
      );
      allow delete: if false; // Prevent deletion
    }

    // Games collection
    match /games/{gameId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
        request.auth.uid in resource.data.players[*].uid;
      allow delete: if false;
    }
  }
}
```

Click "Publish" to activate the rules.

### Step 6: Test Your Setup

1. Restart your dev server: `npm run dev`
2. Check console for "Firebase initialized" (not "Mock mode")
3. Create a room and verify it works
4. Open another browser and join with the room code

## Firestore Data Structure

### Rooms Collection
```typescript
/rooms/{roomCode}
{
  code: string           // 6-char room code
  ownerUid: string      // UID of room creator
  status: 'lobby' | 'in-game' | 'finished'
  maxPlayers: number    // Max players (2-6)
  seats: Seat[]         // Array of player seats
  gameId: string | null // Link to game doc when started
  createdAt: Timestamp
  updatedAt: Timestamp
  expiresAt: Timestamp | null
}
```

### Seats Structure
```typescript
{
  seatIndex: number
  uid: string | null
  nickname: string | null
  classId: string | null
  ready: boolean
  lastSeen: number
  disconnectedAt: number | null
  kicked: boolean
}
```

## Common Issues & Solutions

### Issue: "Failed to create room" in localhost
**Mock Mode Issues:**
- Check browser console for specific errors
- Verify you're in mock mode (console shows "[Mock] Room created")
- Clear browser cache and retry

**Firebase Mode Issues:**
- Verify `.env` has correct Firebase credentials
- Check Firebase Console for quota limits
- Ensure Anonymous auth is enabled
- Verify Firestore security rules are published

### Issue: Room updates not showing
**Mock Mode:** Updates only work within the same browser tab/window
**Firebase Mode:**
- Check network connection
- Verify Firestore rules allow updates
- Check browser console for permission errors

### Issue: Can't join room
- Verify room code is correct (6 characters, uppercase)
- Check if room is full (max 6 players)
- In Firebase mode, check if Firestore is accessible

## Development Tips

### Testing Multiplayer Locally
In **mock mode**:
- Open multiple browser tabs
- Each tab acts as a different player
- All tabs share the same localStorage
- Updates sync across tabs every second
- Rooms persist until manually cleared

In **Firebase mode**:
- Open different browsers (Chrome, Firefox, etc.)
- Use incognito/private windows
- Each gets a unique anonymous user

### Debugging
Enable verbose logging:
```javascript
// In browser console
localStorage.setItem('debug', 'true');
```

Check room state (mock mode only):
```javascript
// In browser console
import('./src/game/net/mockRoomService').then(m =>
  console.log(m.debugGetAllRooms())
);
```

Clear all rooms (mock mode only):
```javascript
// In browser console
import('./src/game/net/mockRoomService').then(m =>
  m.clearAllRooms()
);
```

View raw localStorage data:
```javascript
// In browser console
console.log(JSON.parse(localStorage.getItem('kotm_mock_rooms')));
```

## Migration Path

1. **Start Development** → Use mock mode (default)
2. **Test Multiplayer** → Set up Firebase locally
3. **Deploy to Staging** → Use Firebase test project
4. **Go to Production** → Use Firebase prod project

Each environment can have its own `.env` file:
- `.env.local` - Mock mode for development
- `.env.staging` - Firebase test project
- `.env.production` - Firebase production project

## Future Enhancements

Potential improvements to consider:
- **Persistence**: Save mock rooms to localStorage
- **Firebase Emulator**: Test Firebase locally without cloud
- **Room Expiry**: Auto-delete inactive rooms
- **Reconnection**: Handle disconnects gracefully
- **Spectator Mode**: Allow watching ongoing games
- **Room Settings**: Customizable game rules per room