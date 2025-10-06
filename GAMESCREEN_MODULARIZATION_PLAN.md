# 📐 GameScreen.tsx Modularization Plan

**Current State:** 1,424 lines in single file
**Target:** <500 lines main file + modular structure
**Estimated Reduction:** ~70% of code moved to separate modules

---

## 📊 Current Analysis

### Functions & Handlers (27 total)
1. `addItemToInventory` - Inventory logic
2. `canEquipItemInSlot` - Equipment validation
3. `handleEquipItem` - Equipment action
4. `handleUnequipItem` - Equipment action
5. `handleSwapEquippedItems` - Equipment action
6. `resolveTileEffect` - Game logic
7. `handleMove` - Turn action
8. `handleSleep` - Turn action
9. `handleCardRevealClose` - Card interaction
10. `handleInventoryUpdate` - Inventory action
11. `handleInventoryDiscard` - Inventory action
12. `handleUseTrap` - Item usage
13. `handleCombatAttack` - Combat action
14. `handleCombatRetreat` - Combat action
15. `handleCombatEnd` - Combat action
16. `handleLootPlayer` - Looting logic
17. `handleLootingFinish` - Looting logic
18. `handleUnconsciousPlayerTurn` - Turn logic
19. `handleEndTurn` - Turn action
20. `handleDragStart` - Drag & drop
21. `handleDragOver` - Drag & drop
22. `handleDropOnEquipment` - Drag & drop
23. `handleDropOnInventory` - Drag & drop
24. `renderEquipment` - UI rendering
25. `renderInventory` - UI rendering
26. `renderStats` - UI rendering
27. `handleDuel` - Turn action
28. `getPlayersOnSameTile` - Utility
29. `getUnconsciousPlayersOnSameTile` - Utility
30. `renderActions` - UI rendering
31. `renderLogs` - UI rendering

---

## 🎯 Proposed Structure

```
src/screens/GameScreen/
├── index.tsx                       (Main orchestrator - ~400 lines)
├── hooks/
│   ├── useInventoryManagement.ts  (~150 lines)
│   ├── useEquipmentManagement.ts  (~200 lines)
│   ├── useTurnActions.ts           (~250 lines)
│   ├── useCombat.ts                (~100 lines)
│   ├── useDragAndDrop.ts           (~120 lines)
│   └── usePlayerUtils.ts           (~80 lines)
└── components/
    ├── PlayerStats.tsx             (~40 lines)
    ├── EquipmentSlots.tsx          (~100 lines)
    ├── InventoryGrid.tsx           (~80 lines)
    ├── ActionButtons.tsx           (~150 lines)
    └── GameLog.tsx                 (~60 lines)
```

**Total Estimated Lines:** ~1,730 lines (well-organized vs 1,424 cramped)

---

## 🔨 Implementation Plan

### Step 1: Extract UI Components (Bottom-Up Approach)

#### 1.1 Create `PlayerStats.tsx`
**Extract:** `renderStats()` function
**Props:** `player: Player`
**Returns:** Stats display JSX

```typescript
// src/screens/GameScreen/components/PlayerStats.tsx
import type { Player } from '../../../types';
import { calculatePlayerStats } from '../../../utils/playerStats';

interface PlayerStatsProps {
  player: Player;
}

export function PlayerStats({ player }: PlayerStatsProps) {
  const { attack, defense } = calculatePlayerStats(player, true, false);

  return (
    <div className="player-stats">
      <div className="stat">
        <span className="stat-label">HP:</span>
        <span className="stat-value">{player.hp}/{player.maxHp}</span>
      </div>
      <div className="stat">
        <span className="stat-label">⚔️ Attack:</span>
        <span className="stat-value">{attack}</span>
      </div>
      <div className="stat">
        <span className="stat-label">🛡️ Defense:</span>
        <span className="stat-value">{defense}</span>
      </div>
      <div className="stat">
        <span className="stat-label">Class:</span>
        <span className="stat-value">{player.class}</span>
      </div>
    </div>
  );
}
```

---

#### 1.2 Create `GameLog.tsx`
**Extract:** `renderLogs()` function
**Props:** `logs: LogEntry[], currentPlayerId: string`
**Returns:** Log display JSX

---

#### 1.3 Create `EquipmentSlots.tsx`
**Extract:** `renderEquipment()` function
**Props:**
- `equipment: Equipment`
- `onEquipItem: (item: Item, slot: string) => void`
- `onUnequipItem: (item: Item) => void`
- `onDragStart: (item: Item, source: string) => void`
- `onDrop: (e: DragEvent, slot: string) => void`

---

#### 1.4 Create `InventoryGrid.tsx`
**Extract:** `renderInventory()` function
**Props:**
- `inventory: (Item | null)[]`
- `playerClass: PlayerClass`
- `onItemClick: (item: Item, index: number) => void`
- `onDragStart: (item: Item, source: string) => void`
- `onDrop: (e: DragEvent) => void`

---

#### 1.5 Create `ActionButtons.tsx`
**Extract:** `renderActions()` function
**Props:**
- `isMyTurn: boolean`
- `currentPlayer: Player`
- `safeTurnPlayer: Player`
- `playersOnSameTile: Player[]`
- `onMove: () => void`
- `onSleep: () => void`
- `onDuel: (targetId: string) => void`
- `onEndTurn: () => void`

---

### Step 2: Extract Custom Hooks (Logic Layer)

#### 2.1 Create `useInventoryManagement.ts`
**Extracts:**
- `addItemToInventory()`
- `handleInventoryUpdate()`
- `handleInventoryDiscard()`

**Returns:**
```typescript
{
  addItemToInventory: (items: Item[]) => {...},
  handleInventoryUpdate: (inventory: (Item | null)[]) => Promise<void>,
  handleInventoryDiscard: (itemsToKeep: (Item | null)[]) => Promise<void>,
}
```

---

#### 2.2 Create `useEquipmentManagement.ts`
**Extracts:**
- `canEquipItemInSlot()`
- `handleEquipItem()`
- `handleUnequipItem()`
- `handleSwapEquippedItems()`

**Returns:**
```typescript
{
  canEquipItemInSlot: (item: Item, slot: string) => boolean,
  handleEquipItem: (item: Item, fromInventoryIndex: number, toSlot: string) => Promise<void>,
  handleUnequipItem: (item: Item) => Promise<void>,
  handleSwapEquippedItems: (fromSlot: string, toSlot: string) => Promise<void>,
}
```

---

#### 2.3 Create `useTurnActions.ts`
**Extracts:**
- `handleMove()`
- `handleSleep()`
- `handleEndTurn()`
- `handleDuel()`
- `handleUnconsciousPlayerTurn()`
- `resolveTileEffect()`

**Returns:**
```typescript
{
  handleMove: () => Promise<void>,
  handleSleep: () => Promise<void>,
  handleEndTurn: () => Promise<void>,
  handleDuel: (targetPlayerId: string) => Promise<void>,
  handleUnconsciousPlayerTurn: () => Promise<void>,
  resolveTileEffect: (tile: Tile) => Promise<void>,
}
```

---

#### 2.4 Create `useCombat.ts`
**Extracts:**
- `handleCombatAttack()`
- `handleCombatRetreat()`
- `handleCombatEnd()`

**Returns:**
```typescript
{
  handleCombatAttack: (targetId?: string) => Promise<void>,
  handleCombatRetreat: () => Promise<void>,
  handleCombatEnd: () => Promise<void>,
}
```

---

#### 2.5 Create `useDragAndDrop.ts`
**Extracts:**
- `handleDragStart()`
- `handleDragOver()`
- `handleDropOnEquipment()`
- `handleDropOnInventory()`

**State:**
- `draggedItem: { item: Item; source: string } | null`

**Returns:**
```typescript
{
  draggedItem: { item: Item; source: string } | null,
  handleDragStart: (item: Item, source: string) => void,
  handleDragOver: (e: React.DragEvent) => void,
  handleDropOnEquipment: (e: React.DragEvent, slot: string) => Promise<void>,
  handleDropOnInventory: (e: React.DragEvent) => Promise<void>,
}
```

---

#### 2.6 Create `usePlayerUtils.ts`
**Extracts:**
- `getPlayersOnSameTile()`
- `getUnconsciousPlayersOnSameTile()`

**Returns:**
```typescript
{
  getPlayersOnSameTile: () => Player[],
  getUnconsciousPlayersOnSameTile: () => Player[],
}
```

---

### Step 3: Create Main Index.tsx

**Responsibilities:**
1. Import all hooks
2. Import all components
3. Manage modal states
4. Manage card reveal states
5. Orchestrate data flow between hooks and components
6. Handle looting state
7. Render layout structure

**Approximate Size:** ~400 lines

---

## 🔄 Migration Steps

### Phase 1: Components (Do First)
1. ✅ Create `PlayerStats.tsx`
2. ✅ Update main file to use `<PlayerStats />`
3. ✅ Delete `renderStats()` from main file
4. ✅ Test compilation

Repeat for each component (GameLog, EquipmentSlots, InventoryGrid, ActionButtons)

### Phase 2: Hooks (Do Second)
1. ✅ Create `usePlayerUtils.ts`
2. ✅ Update main file to use hook
3. ✅ Delete original functions
4. ✅ Test compilation

Repeat for each hook in order of dependencies

### Phase 3: Final Cleanup
1. ✅ Verify all imports
2. ✅ Remove unused code
3. ✅ Run full test suite
4. ✅ Verify build
5. ✅ Update documentation

---

## 📋 Dependencies Between Modules

```
Main Index
├── usePlayerUtils (no dependencies)
├── useInventoryManagement (needs: normalizeInventory util)
├── useEquipmentManagement (needs: normalizeInventory util)
├── useDragAndDrop (needs: useEquipmentManagement, useInventoryManagement)
├── useTurnActions (needs: gameSlice functions, useInventoryManagement)
└── useCombat (needs: gameSlice functions)

Components (all independent, just receive props)
├── PlayerStats
├── GameLog
├── EquipmentSlots
├── InventoryGrid
└── ActionButtons
```

---

## ⚠️ Important Considerations

### Shared State
- Most state remains in main component (gameState, playerId, modal states)
- Hooks receive state via parameters and return handlers
- Components are purely presentational

### Firebase Operations
- Keep all Firebase calls in hooks
- Maintain same error handling patterns
- Don't change business logic

### Event Handlers
- Drag & drop state stays in useDragAndDrop hook
- Modal states stay in main component
- Card reveal state stays in main component

---

## 🎯 Success Criteria

1. ✅ Main GameScreen index.tsx < 500 lines
2. ✅ No duplicate code
3. ✅ All TypeScript types preserved
4. ✅ Build succeeds with no errors
5. ✅ All functionality intact
6. ✅ Improved code organization
7. ✅ Better maintainability

---

## 📊 Before vs After

### Before
```
GameScreen.tsx: 1,424 lines
- Everything in one file
- Hard to navigate
- Difficult to test individual features
- High cognitive load
```

### After
```
GameScreen/
  index.tsx: ~400 lines (main orchestrator)
  hooks/ (6 files): ~900 lines (business logic)
  components/ (5 files): ~430 lines (presentation)

Total: ~1,730 lines
- Well-organized
- Easy to navigate
- Testable modules
- Low cognitive load per file
```

---

## 🚀 Ready to Execute

This plan is complete and ready for implementation. Each step is clearly defined with:
- Exact functions to extract
- Interface definitions
- Dependency information
- Migration order

**Estimated Time:** 4-6 hours for full implementation and testing

---

**Created:** 2025-10-06
**Status:** Ready for execution
