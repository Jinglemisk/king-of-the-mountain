# King of the Mountain - Networking Module

This module handles all Firebase/Firestore integration for multiplayer functionality.

## Architecture Overview

### Core Components

1. **Firebase Configuration** (`firebase.ts`)
   - Firebase app initialization
   - Anonymous authentication
   - Firestore database access
   - Connection management

2. **Room Service** (`roomService.ts`)
   - Room creation with unique 6-character codes
   - Player seat management
   - Ready status and class selection
   - Heartbeat updates
   - Owner moderation (kick players)

3. **Game Service** (`gameService.ts`)
   - Game state synchronization
   - Turn-based action processing
   - Optimistic concurrency control
   - Log and chat management
   - State conversion between network and engine formats

4. **Connection Manager** (`connectionManager.ts`)
   - Automatic heartbeat system (30-second intervals)
   - Visibility API integration (pause when tab hidden)
   - Auth state monitoring
   - Graceful disconnect handling

5. **Sync Manager** (`syncManager.ts`)
   - Real-time subscription management
   - Game state synchronization
   - Action queue and pending state
   - Turn notifications
   - Error recovery

6. **Action Handlers** (`actionHandlers.ts`)
   - High-level game action API
   - Engine integration
   - Log generation
   - Error handling

## Data Flow

```
User Action → Action Handler → Sync Manager → Game Service → Firestore
                                     ↓
                              Game Engine
                                     ↓
                            State Validation
                                     ↓
                           Firestore Update → All Clients
```

## Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Anonymous Authentication
3. Create a Firestore database
4. Copy `.env.example` to `.env` and fill in your Firebase config
5. Deploy security rules: `firebase deploy --only firestore:rules`

## Usage Examples

### Initialize Firebase
```typescript
import { initializeFirebase, signInAsAnonymous } from './game/net';

// Initialize on app start
initializeFirebase();

// Sign in anonymously
const user = await signInAsAnonymous();
```

### Create and Join Rooms
```typescript
import { createRoom, joinRoom, subscribeToRoom } from './game/net';

// Create a room
const roomCode = await createRoom('PlayerNickname', 6);

// Join a room
const seatIndex = await joinRoom(roomCode, 'PlayerNickname');

// Subscribe to room updates
const unsubscribe = subscribeToRoom(roomCode, (room) => {
  console.log('Room updated:', room);
});
```

### Start and Play Game
```typescript
import { startGame, getSyncManager, getActionHandlers } from './game/net';

// Start game (owner only)
const gameId = await startGame(roomCode);

// Get sync manager
const syncManager = getSyncManager({
  onGameUpdate: (game) => console.log('Game updated:', game),
  onLogUpdate: (logs) => console.log('New logs:', logs),
  onChatUpdate: (messages) => console.log('New messages:', messages)
});

// Execute game actions
const actions = getActionHandlers();
await actions.chooseMoveOrSleep('move');
await actions.rollMovement();
await actions.endTurn();
```

### Connection Management
```typescript
import { getConnectionManager } from './game/net';

const connectionManager = getConnectionManager();

// Start heartbeat for a room
connectionManager.start(roomCode);

// Check connection status
if (connectionManager.isConnected()) {
  console.log('Connected to room:', connectionManager.getRoomCode());
}

// Stop heartbeat when leaving
connectionManager.stop();
```

## Security

The module implements several security measures:

1. **Authentication Required**: All operations require Firebase Auth
2. **Turn-Based Authority**: Only current player can modify game state
3. **Version Control**: Optimistic concurrency prevents conflicts
4. **Owner Privileges**: Room owner has moderation capabilities
5. **Seat Protection**: Players can only modify their own seats
6. **State Validation**: Engine validates all state transitions

## Testing

Run tests with:
```bash
npm test src/game/net
```

## Performance Considerations

- Heartbeats are throttled to 30-second intervals
- Subscriptions are automatically managed and cleaned up
- Document size is kept under Firestore's 1MB limit
- Logs use subcollections for scalability
- Connection pauses when tab is hidden

## Error Handling

The module provides comprehensive error handling:

- Network failures trigger automatic retries
- Version conflicts are resolved through re-fetch and retry
- Auth failures provide clear error messages
- Invalid operations are rejected before network calls

## Future Enhancements

- [ ] Spectator mode support
- [ ] Replay system using action logs
- [ ] Advanced matchmaking
- [ ] Tournament brackets
- [ ] Cloud Functions for server validation
- [ ] Push notifications for turn alerts