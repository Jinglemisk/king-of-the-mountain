# King of the Mountain - Development Assistant

## Project Context
Push-your-luck adventure race boardgame for 2-6 players. React + TypeScript frontend with Firebase backend. See `README.md` for complete game design document.

## Architecture
- **Frontend**: React + TypeScript + Vite, Zustand state management, Tailwind CSS
- **Backend**: Firebase Firestore + Anonymous Auth (no custom server)
- **Game Logic**: Client-side with Firestore Security Rules validation

## Development Guidelines

### Key Implementation Principles
- **Pure Engine**: Game logic is Firebase-agnostic for easy testing
- **Client Authority**: All game rules run client-side with optimistic updates
- **Structured Content**: All game content defined in JSON with TypeScript types
- **Real-time Sync**: Firestore handles multiplayer state synchronization

## Key Reminders
- All randomness via `crypto.getRandomValues()` with audit logging
- Combat uses simultaneous attack/defense rolls with modifier stacking
- Movement history tracked for backward movement (retreat, cards)
- 8 unique player classes with passive abilities, no duplicates
- Victory condition: first to Final tile (tie-breaker duels if simultaneous)