# King of the Mountain - Card Drawing & Logging Analysis Report

## Executive Summary

After thorough investigation, I found that **card drawing logic works correctly at the engine level**, but there are **critical disconnects** between the game engine events and the UI components. Players can proceed as if they drew cards because the game state updates properly, but **no UI feedback is shown** and **logs are completely static**.

## 1. Card Drawing Flow Analysis

### ✅ **What Works**
- **Game Engine (`tileResolver.ts:45-105`)**: Card drawing is fully implemented
  - Enemy tiles spawn 1-3 enemies based on tier and dice rolls (`tileResolver.ts:107-185`)
  - Treasure tiles draw 1 card and add to player inventory (`tileResolver.ts:187-292`)
  - Chance tiles draw and resolve cards immediately (`tileResolver.ts:294-370`)
  - All generate proper `DomainEvent`s (TreasureDrawn, EnemySpawned, TileEntered)

### ❌ **What's Broken**
- **UI Event Connection**: Game events aren't flowing to UI components
- **Dialog Triggering**: `DrawDialog` exists but never gets activated
- **Card Display**: No visual feedback when cards are drawn

## 2. UI Components Analysis

### Existing Components
- **`DrawDialog.tsx`**: Well-designed card display dialog with placement options
  - Handles treasure card placement (equip/bandolier/backpack/drop)
  - Shows chance card effects with continue button
  - **Issue**: Never gets triggered by game events

- **`GameScreen.tsx:117-123`**: Has conditional rendering for card dialogs
  ```tsx
  {ui.activeDialog === 'treasure' && ui.pendingCard && (
    <DrawDialog type="treasure" card={ui.pendingCard} />
  )}
  ```
  - **Issue**: `ui.activeDialog` and `ui.pendingCard` never get set

## 3. Logging System Issues

### ❌ **Critical Problem: Static LogPanel**
The `LogPanel.tsx` component is **completely disconnected** from real game events:

```tsx
const [entries, setEntries] = useState<LogEntry[]>([
  {
    id: '1',
    timestamp: Date.now(),
    type: 'system',
    message: 'Game started - waiting for player action', // HARDCODED
  },
]);
```

### ❌ **Missing Event Integration**
- Game engine generates events like `DiceRolled`, `TreasureDrawn`, `Moved`
- `ActionHandlers` calls `addGameLog()` with messages like "rolled dice for movement"
- `SyncManager` subscribes to game logs (`subscribeToGameLog`)
- But **LogPanel doesn't consume these logs**

## 4. Dead Code & Disconnected Systems

### Disconnected Systems
1. **Event Generation ↛ UI Updates**: Events generated but don't trigger UI changes
2. **Game Logs ↛ LogPanel**: Logs written to Firebase but not displayed
3. **Card Data ↛ Dialog Display**: Card information doesn't reach DrawDialog
4. **State Management Gap**: GameStore has UI state fields but they're not updated

### Partially Dead Code
- `DrawDialog`: Functional but never activated
- Log subscription in `SyncManager.ts:75-80`: Subscribed but not used by UI
- UI state fields in `gameStore.ts:38-39`: `activeDialog`, `pendingCard` - defined but never set

## 5. Root Cause Analysis

The core issue is a **missing event-to-UI bridge**. The flow should be:

```
GameEngine → Events → SyncManager → GameStore → UI Components
```

**Currently:** GameEngine → Events → ~~[BREAK]~~ ~~GameStore~~ ~~UI Components~~

## 6. Priority Todo List

### **High Priority**
1. **Connect game events to UI state management** - Create event bridge in SyncManager
2. **Fix LogPanel to consume real game logs** - Replace hardcoded entries with live log subscription
3. **Add card drawing event handlers** - Trigger DrawDialog when cards are drawn

### **Medium Priority**
4. **Implement event listener in SyncManager** - Process domain events and update GameStore UI state
5. **Connect dice roll events to logging** - Show "Player rolled a 3" messages
6. **Implement proper event-to-log conversion** - Transform domain events into readable log messages

### **Low Priority**
7. **Test complete flow** - Verify card drawing shows UI and logs properly

## 7. Specific Files That Need Changes

### Critical Files to Modify:
1. **`src/game/ui/components/LogPanel.tsx`** - Remove hardcoded entries, connect to real logs
2. **`src/game/net/syncManager.ts`** - Add event processing to update UI state
3. **`src/game/ui/stores/gameStore.ts`** - Add methods to handle UI state updates from events
4. **`src/game/ui/screens/GameScreen.tsx`** - Ensure proper event subscription setup

### Key Integration Points:
- `SyncManager.handleGameUpdate()` should process events and trigger UI updates
- `GameStore` needs methods like `showCardDialog()`, `addLogEntry()`
- `LogPanel` should subscribe to GameStore log state instead of using static data

## Conclusion

The card drawing system is **architecturally sound** but suffers from **integration gaps**. The game logic works perfectly - players can draw cards and game state updates correctly. However, **visual feedback is completely missing** due to disconnected event flow between the engine and UI components. This is a **UI/UX integration issue**, not a core game logic problem.