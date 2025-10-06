# 🔧 Refactoring Plan - King of the Mountain

**Status:** Ready to Execute
**Created:** 2025-10-06
**Branch:** combat

---

## 📋 Overview

This document outlines the approved refactoring tasks based on code analysis. All changes focus on consolidating duplicate code and removing dead code while preserving future features (Trade, Chat, Luck Cards, Enemy Tiles).

**Total Tasks:** 13
**Estimated Time:** 2-4 hours

---

## ✅ Approved Changes

### Phase 1: Dead Code Removal (Quick Wins)

#### Task 1: Remove Commented calculatePlayerStats() Function
**File:** `src/screens/GameScreen.tsx`
**Lines:** 154-178
**Action:** Delete entire commented function block

```typescript
// DELETE THESE LINES:
// const calculatePlayerStats = (): { attack: number; defense: number } => {
//   let attack = 1; // Base attack
//   ... (entire commented block)
// };
```

**Reason:** This function is duplicated in active code (renderStats at lines 986-1003).

---

#### Task 2: Delete Obsolete TODO Comment
**File:** `src/screens/GameScreen.tsx`
**Line:** 515
**Action:** Delete the comment

```typescript
// DELETE THIS LINE:
// TODO: End turn
```

**Reason:** `handleEndTurn()` function already exists and works (line 761).

---

## 🔄 Phase 2: Consolidate Stats Calculation

### Current State Analysis

**Three implementations exist:**

1. **gameSlice.ts (lines 480-520):** Two separate functions
   - `getClassCombatBonuses()` - returns only bonuses (no base stats)
   - `getEquipmentBonuses()` - returns only bonuses (no base stats)
   - Used in combat execution (lines 594-595, 625-628)

2. **CombatModal.tsx (lines 31-61):** Single combined function
   - `calculateStats()` - returns total attack/defense (base + bonuses)
   - Includes class AND equipment bonuses
   - Used for display (lines 90, 145-149)

3. **GameScreen.tsx (lines 986-1003):** Inline calculation in renderStats()
   - Only calculates equipment bonuses
   - Missing class bonuses (BUG!)
   - Used for stats display

**Key Difference:** gameSlice returns bonuses only, CombatModal returns totals (base + bonuses).

---

### Task 3: Create Shared Stats Utility

**File:** Create `src/utils/playerStats.ts`

```typescript
/**
 * Player stats calculation utilities
 * Consolidates attack/defense calculations from equipment and class bonuses
 */

import type { Player } from '../types';

/**
 * Calculate equipment bonuses for attack and defense
 * @param player - The player
 * @returns Object with attack and defense bonuses from equipment
 */
export function getEquipmentBonuses(player: Player): {
  attackBonus: number;
  defenseBonus: number;
} {
  let attackBonus = 0;
  let defenseBonus = 0;

  const equipment = player.equipment || {
    holdable1: null,
    holdable2: null,
    wearable: null
  };

  if (equipment.holdable1) {
    attackBonus += equipment.holdable1.attackBonus || 0;
    defenseBonus += equipment.holdable1.defenseBonus || 0;
  }
  if (equipment.holdable2) {
    attackBonus += equipment.holdable2.attackBonus || 0;
    defenseBonus += equipment.holdable2.defenseBonus || 0;
  }
  if (equipment.wearable) {
    attackBonus += equipment.wearable.attackBonus || 0;
    defenseBonus += equipment.wearable.defenseBonus || 0;
  }

  return { attackBonus, defenseBonus };
}

/**
 * Calculate class combat bonuses based on combat type
 * @param player - The player
 * @param isVsEnemy - True if fighting enemies, false if fighting players
 * @returns Object with attack and defense bonuses from class
 */
export function getClassCombatBonuses(
  player: Player,
  isVsEnemy: boolean
): {
  attackBonus: number;
  defenseBonus: number;
} {
  let attackBonus = 0;
  let defenseBonus = 0;

  if (isVsEnemy) {
    if (player.class === 'Hunter') attackBonus += 1;
    if (player.class === 'Warden') defenseBonus += 1;
  } else {
    if (player.class === 'Gladiator') attackBonus += 1;
    if (player.class === 'Guard') defenseBonus += 1;
  }

  return { attackBonus, defenseBonus };
}

/**
 * Calculate total attack and defense stats (base + all bonuses)
 * @param player - The player
 * @param isVsEnemy - True if fighting enemies, false if fighting players
 * @param includeClassBonuses - Whether to include class combat bonuses (default true)
 * @returns Object with total attack and defense
 */
export function calculatePlayerStats(
  player: Player,
  isVsEnemy: boolean = true,
  includeClassBonuses: boolean = true
): {
  attack: number;
  defense: number;
} {
  const BASE_ATTACK = 1;
  const BASE_DEFENSE = 1;

  const equipmentBonuses = getEquipmentBonuses(player);
  const classBonuses = includeClassBonuses
    ? getClassCombatBonuses(player, isVsEnemy)
    : { attackBonus: 0, defenseBonus: 0 };

  return {
    attack: BASE_ATTACK + equipmentBonuses.attackBonus + classBonuses.attackBonus,
    defense: BASE_DEFENSE + equipmentBonuses.defenseBonus + classBonuses.defenseBonus,
  };
}
```

**Why This Design:**
- Keeps existing separate functions for gameSlice compatibility
- Adds new unified function for display components
- Allows class bonuses to be optional (for inventory display)

---

### Task 4: Update gameSlice.ts

**File:** `src/state/gameSlice.ts`

**Step 1:** Add import at top of file
```typescript
import { getEquipmentBonuses, getClassCombatBonuses } from '../utils/playerStats';
```

**Step 2:** Delete local implementations (lines 475-520)
```typescript
// DELETE THESE FUNCTIONS:
// function getClassCombatBonuses(player: Player, isVsEnemy: boolean) { ... }
// function getEquipmentBonuses(player: Player) { ... }
```

**Step 3:** Verify usages remain unchanged
- Line 594-595: `getClassCombatBonuses()` and `getEquipmentBonuses()` calls
- Line 625-628: `getClassCombatBonuses()` and `getEquipmentBonuses()` calls
- These will now use the imported functions (same signatures, same behavior)

---

### Task 5: Update CombatModal.tsx

**File:** `src/components/game/CombatModal.tsx`

**Step 1:** Add import at top of file
```typescript
import { calculatePlayerStats } from '../../utils/playerStats';
```

**Step 2:** Delete local implementation (lines 29-61)
```typescript
// DELETE THIS FUNCTION:
// function calculateStats(player: Player, isVsEnemy: boolean) { ... }
```

**Step 3:** Update function calls (lines 90, 145-149)
```typescript
// Change:
const playerStats = calculateStats(player, isVsEnemy);

// To:
const playerStats = calculatePlayerStats(player, isVsEnemy);
```

**Step 4:** Also update line 145-149
```typescript
// Change:
const opponentStats = isPlayerOpponent
  ? calculateStats(opponent as Player, false)
  : { ... };

// To:
const opponentStats = isPlayerOpponent
  ? calculatePlayerStats(opponent as Player, false)
  : { ... };
```

---

### Task 6: Update GameScreen.tsx renderStats()

**File:** `src/screens/GameScreen.tsx`

**Step 1:** Add import at top of file
```typescript
import { calculatePlayerStats } from '../utils/playerStats';
```

**Step 2:** Replace inline calculation (lines 986-1003)
```typescript
const renderStats = () => {
  // REPLACE THIS BLOCK:
  // let totalAttack = 1;
  // let totalDefense = 1;
  // const equipment = currentPlayer.equipment || { ... };
  // if (equipment.holdable1) { ... }
  // ... etc ...

  // WITH THIS:
  const { attack: totalAttack, defense: totalDefense } = calculatePlayerStats(
    currentPlayer,
    true, // isVsEnemy (default context)
    false // Don't include class bonuses for inventory display
  );

  return (
    <div className="player-stats">
      {/* Rest of JSX remains unchanged */}
```

**Note:** Using `includeClassBonuses: false` because inventory screen shows equipment stats only, not combat stats.

---

## 🔀 Phase 3: Consolidate Shuffle Logic

### Current State

Two identical `shuffleDeck()` implementations:
- `src/data/enemies.ts` (lines 148-160)
- `src/data/cards.ts` (lines 337-349)

Both use Fisher-Yates algorithm, both are generic `<T>`.

**Usages:**
- enemies.ts: `buildEnemyDeck()` at line 145
- cards.ts: `buildTreasureDeck()` at line 368 AND `buildLuckDeck()` at line 377

---

### Task 7: Create Shared Shuffle Utility

**File:** Create `src/utils/shuffle.ts`

```typescript
/**
 * Array shuffling utilities
 */

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param deck - Array to shuffle
 * @returns New shuffled array (does not mutate original)
 */
export function shuffleDeck<T>(deck: T[]): T[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
```

---

### Task 8: Update enemies.ts

**File:** `src/data/enemies.ts`

**Step 1:** Add import at top of file
```typescript
import { shuffleDeck } from '../utils/shuffle';
```

**Step 2:** Delete local implementation (lines 148-160)
```typescript
// DELETE THIS FUNCTION:
/**
 * Shuffle an array using Fisher-Yates algorithm
 * ...
 */
// function shuffleDeck<T>(deck: T[]): T[] { ... }
```

**Step 3:** Verify usage at line 145 remains unchanged
```typescript
// This line stays the same:
return shuffleDeck(deck);
```

---

### Task 9: Update cards.ts

**File:** `src/data/cards.ts`

**Step 1:** Add import at top of file
```typescript
import { shuffleDeck } from '../utils/shuffle';
```

**Step 2:** Delete local implementation (lines 337-349)
```typescript
// DELETE THIS FUNCTION:
/**
 * Shuffle an array using Fisher-Yates algorithm
 * ...
 */
// function shuffleDeck<T>(deck: T[]): T[] { ... }
```

**Step 3:** Verify usages remain unchanged
```typescript
// Line 368:
return shuffleDeck(deck); // stays the same

// Line 377:
return shuffleDeck(deck); // stays the same
```

---

## 📦 Phase 4: Streamline Inventory Normalization

### Current State

`normalizeInventory()` is:
- Defined once in GameScreen.tsx (lines 110-121)
- Called 8 times throughout the same file
- Single responsibility: ensure inventory array has correct slot count

**Opportunity:** Extract to utility for reusability and cleaner code.

---

### Task 10: Create Inventory Utility

**File:** Create `src/utils/inventory.ts`

```typescript
/**
 * Inventory management utilities
 */

import type { Item, Player } from '../types';

/**
 * Normalize inventory array to ensure correct number of slots
 * Ensures inventory always has proper length, padding with null if needed
 * @param inventory - Current inventory array (may be incomplete or empty)
 * @param playerClass - Player's class (Porter gets 5 slots, others get 4)
 * @returns Normalized inventory array with proper length
 */
export function normalizeInventory(
  inventory: (Item | null)[] | undefined | null,
  playerClass: Player['class']
): (Item | null)[] {
  const maxSlots = playerClass === 'Porter' ? 5 : 4;
  const currentInventory = inventory || [];

  // Create array with max slots, preserving existing items
  const normalized: (Item | null)[] = [];
  for (let i = 0; i < maxSlots; i++) {
    normalized[i] = currentInventory[i] || null;
  }

  return normalized;
}
```

---

### Task 11: Update GameScreen.tsx

**File:** `src/screens/GameScreen.tsx`

**Step 1:** Add import at top of file
```typescript
import { normalizeInventory } from '../utils/inventory';
```

**Step 2:** Delete local `normalizeInventory()` function (lines 110-121)
```typescript
// DELETE THIS FUNCTION:
// const normalizeInventory = (inventory: ...) => { ... }
```

**Step 3:** Update all 8 call sites

**Call sites to update:**
1. Line 256 (handleEquipItem):
```typescript
// Change:
[`players/${playerId}/inventory`]: normalizeInventory(inventory),
// To:
[`players/${playerId}/inventory`]: normalizeInventory(inventory, currentPlayer.class),
```

2. Line 298 (handleUnequipItem):
```typescript
// Change:
[`players/${playerId}/inventory`]: normalizeInventory(inventory),
// To:
[`players/${playerId}/inventory`]: normalizeInventory(inventory, currentPlayer.class),
```

3. Line 550 (handleInventoryUpdate):
```typescript
// Change:
const normalizedInventory = normalizeInventory(inventory);
// To:
const normalizedInventory = normalizeInventory(inventory, currentPlayer.class);
```

4. Line 571 (handleInventoryDiscard):
```typescript
// Change:
[`players/${playerId}/inventory`]: normalizeInventory(itemsToKeep),
// To:
[`players/${playerId}/inventory`]: normalizeInventory(itemsToKeep, currentPlayer.class),
```

5. Line 618 (handleUseTrap):
```typescript
// Change:
const inventory = normalizeInventory(currentPlayer.inventory);
// To:
const inventory = normalizeInventory(currentPlayer.inventory, currentPlayer.class);
```

6. Line 631 (handleUseTrap):
```typescript
// Change:
[`players/${playerId}/inventory`]: normalizeInventory(inventory),
// To:
[`players/${playerId}/inventory`]: normalizeInventory(inventory, currentPlayer.class),
```

7. Line 935 (renderInventory):
```typescript
// Change:
const inventory = normalizeInventory(currentPlayer.inventory);
// To:
const inventory = normalizeInventory(currentPlayer.inventory, currentPlayer.class);
```

---

## 🧪 Phase 5: Testing

### Task 12: Test All Changes

**Manual Testing Checklist:**

1. **Stats Calculation:**
   - [ ] Combat stats display correctly in GameScreen
   - [ ] Combat stats display correctly in CombatModal
   - [ ] Combat calculations work correctly (PvE and PvP)
   - [ ] Class bonuses apply correctly (Hunter, Warden, Gladiator, Guard)
   - [ ] Equipment bonuses apply correctly

2. **Shuffle:**
   - [ ] Enemy decks are shuffled on game start
   - [ ] Treasure decks are shuffled on game start
   - [ ] Luck deck is shuffled on game start
   - [ ] Reshuffling works when decks run out

3. **Inventory:**
   - [ ] Inventory displays with correct number of slots
   - [ ] Porter gets 5 slots, others get 4
   - [ ] Items can be added to inventory
   - [ ] Inventory full modal appears when appropriate
   - [ ] Inventory normalization works after equipment/unequip

**Test Commands:**
```bash
# Run development server
npm run dev

# Check for TypeScript errors
npm run type-check  # or tsc --noEmit

# Check for build errors
npm run build
```

---

## 📁 Phase 6: GameScreen.tsx Modularization Planning

### Task 13: Create Detailed GameScreen Refactoring Plan

**To be completed after all above tasks are done.**

This will involve:
1. Analyzing remaining GameScreen.tsx code (after utility extractions)
2. Identifying logical component boundaries
3. Planning hook extractions (useInventory, useCombat, useEquipment, etc.)
4. Creating modular folder structure
5. Step-by-step migration plan

**Target:** Reduce GameScreen.tsx from ~1400 lines to <500 lines

---

## 📊 Summary

### Files to Create (3)
- `src/utils/playerStats.ts`
- `src/utils/shuffle.ts`
- `src/utils/inventory.ts`

### Files to Modify (5)
- `src/screens/GameScreen.tsx` (major changes)
- `src/state/gameSlice.ts` (remove duplicates, add import)
- `src/components/game/CombatModal.tsx` (remove duplicate, add import)
- `src/data/enemies.ts` (remove duplicate, add import)
- `src/data/cards.ts` (remove duplicate, add import)

### Lines Removed
- ~25 lines of commented code
- ~40 lines of duplicate stats calculation
- ~26 lines of duplicate shuffle
- ~20 lines of inventory logic moved to utils
- **Total: ~111 lines removed**

### Lines Added
- ~100 lines of utility code (better organized)
- ~15 lines of imports
- **Total: ~115 lines added**

**Net Effect:** Similar LOC but much better organized, no duplication, easier to maintain.

---

## ⚠️ Important Notes

### What NOT to Touch
- ✋ Enemy tile types (keeping for future use)
- ✋ Trade system (will implement later)
- ✋ Chat system (will implement later)
- ✋ Luck card effects (will implement later)
- ✋ Firebase update logic (leave as-is)
- ✋ Magic numbers (leave as-is)
- ✋ Type assertions (leave as-is)

### Breaking Changes
- None expected - all changes are internal refactoring
- Same functionality, just better organized

### Rollback Plan
If issues arise, use git:
```bash
git checkout combat  # Discard all changes
git stash  # Save work for later
```

---

**Ready to Begin:** All tasks are clearly defined with exact line numbers and code examples.
