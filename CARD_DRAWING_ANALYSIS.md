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

### **Phase 1 - Infrastructure (COMPLETED ✅)**
**What it did:** Built the receiving infrastructure for events but didn't connect the actual event flow
1. **Created event bridge structure** - Added `processGameEvents()` and `processEngineEvent()` methods in SyncManager
2. **Fixed LogPanel component** - Now reads from `gameStore.logs` instead of hardcoded entries
3. **Added UI state methods** - Implemented `showCardDialog()`, `hideCardDialog()`, `addLogEntry()`, `setLogs()` in GameStore
4. **Created event conversion logic** - Added `eventToLogEntry()` and `mapLogType()` for when events arrive

**What it DIDN'T fix:** Card drawing still doesn't work because events aren't actually reaching the infrastructure we built

### **Phase 2 - Event Connection (PENDING)**
**What it will do:** Actually connect the game engine events to the infrastructure from Phase 1
5. **Capture and propagate TreasureDrawn events** - Ensure events from tile resolution reach our event bridge
6. **Capture and propagate ChanceCardResolved events** - Ensure chance card events trigger the dialog
7. **Capture and propagate DiceRolled events** - Connect dice rolls to logging system
8. **Capture and propagate Movement events** - Connect movement to logging system

### **Phase 3 - Testing & Verification**
9. **Test complete flow** - Verify card drawing shows UI and logs properly
10. **Verify all game events appear in logs** - Ensure comprehensive event logging

## 7. Specific Files Modified in Phase 1

### Files Successfully Updated:
1. **`src/game/ui/components/LogPanel.tsx`** ✅
   - Removed hardcoded entries
   - Now uses `useGameStore(state => state.logs)` for dynamic logs
   - Auto-scrolls to new entries

2. **`src/game/net/syncManager.ts`** ✅
   - Added `processGameEvents()` to handle domain events from game state
   - Added `eventToLogEntry()` to convert events to readable logs
   - Added `processEngineEvent()` to handle events during action execution
   - Modified `subscribeToGame()` to sync Firestore logs with UI store
   - Added `mapLogType()` to categorize log types for UI

3. **`src/game/ui/stores/gameStore.ts`** ✅
   - Added `logs: LogEntry[]` state
   - Added `setLogs()` for initial log sync
   - Added `addLogEntry()` for appending new logs
   - Added `showCardDialog()` and `hideCardDialog()` for card UI

### Integration Points Established:
- ✅ `SyncManager.handleGameUpdate()` now calls `processGameEvents()`
- ✅ `GameStore` has `showCardDialog()` and `addLogEntry()` methods
- ✅ `LogPanel` subscribes to GameStore log state
- ✅ Events flow: Engine → SyncManager → GameStore → UI Components

## Current Status After Phase 1

### What's Fixed:
- ✅ **Infrastructure ready** - Event bridge, UI methods, and log display components are in place
- ✅ **LogPanel connected** - Will display logs when they arrive
- ✅ **Event processing ready** - Can handle events when they flow through

### What's Still Broken:
- ❌ **Events not flowing** - Game engine events aren't reaching our new infrastructure
- ❌ **No card dialogs** - DrawDialog never triggers because events don't arrive
- ❌ **No event logs** - Events aren't being captured to create log entries

### The Remaining Gap:
Phase 1 built the **receiving end** of the event pipeline (SyncManager → GameStore → UI), but the **sending end** (GameEngine → Events) isn't connected to it. The events are generated in the engine but disappear before reaching our infrastructure.

## Conclusion

The card drawing system is **architecturally sound** at the engine level and now has **proper UI infrastructure** (Phase 1), but still has a **critical connection gap** between the engine events and the UI infrastructure. Phase 2 will bridge this gap by ensuring events generated during gameplay actually flow through to the UI components.