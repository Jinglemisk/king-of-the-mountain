# King of the Mountain - Turn System Diagnostic Report

## Executive Summary
The turn system is **largely functional** with a well-structured phase-based architecture. However, there are **critical issues** with turn order management, state field mismatches, and incomplete action handlers that prevent proper turn progression.

## 🟢 What's Working

1. **Phase System Architecture**
   - Well-defined phases: `turnStart`, `manage`, `preDuel`, `moveOrSleep`, `resolveTile`, `combat`, `duel`, `postCombat`, `capacity`, `endTurn`, `finalTieBreaker`
   - Clear phase transitions in `phases.ts:getNextPhase()`
   - Phase guards properly restrict actions per phase

2. **Action Type Definitions**
   - Comprehensive action types defined in `types.ts:98-222`
   - Actions properly typed with payloads
   - Base action structure includes required fields (id, ts, type, uid)

3. **Core Turn Flow Logic**
   - Turn advancement logic exists in `phases.ts:270-309`
   - Phase transition events properly emitted
   - Turn start cleanup (movement history, per-turn effects)

## 🔴 Critical Issues

1. **State Field Mismatch - currentPlayer vs currentPlayerUid**
   - **Engine** uses `currentPlayer` (PlayerId)
   - **Network/UI** uses `currentPlayerUid` (string)
   - **SyncManager** attempts conversion (`syncManager.ts:156-230`) but inconsistent
   - Causes turn ownership checks to fail

2. **Turn Order Management Confusion**
   - **Engine** expects `order: { seats: PlayerId[], currentIdx: number }`
   - **Network** provides `turnOrder: PlayerId[]` array
   - Missing `currentIdx` tracking in network state
   - Turn rotation logic in `phases.ts:273-276` depends on proper order structure

3. **Action Handler Issues in commands/**
   - `combat.ts:26` and `items.ts:21,32,42,61,131,169` use undefined `state.turnOrder[state.currentTurn]`
   - Should use `state.currentPlayer` or `state.order.seats[state.order.currentIdx]`
   - This breaks all combat and item actions

4. **Missing Action Implementations**
   - `startCombat` and `rollCombat` handlers incomplete
   - Combat targeting logic references wrong state fields
   - Missing proper enemy spawn and combat resolution

## 🟡 Partial Implementations

1. **Action Handlers (actionHandlers.ts)**
   - Basic structure exists for all actions
   - Missing proper engine action construction
   - `continuePhase` method tries to handle automatic progression but uses wrong action

2. **UI Turn Controls (TurnControls.tsx)**
   - Shows correct buttons per phase
   - Continue button for automatic phases
   - But relies on broken state fields

3. **Phase Progression**
   - Automatic phase transitions defined
   - But `endTurn` action used incorrectly for progression
   - Should have separate internal progression mechanism

## Root Causes

1. **Dual State Schema**: Game migrated from one state structure to another without complete conversion
2. **Incomplete Refactoring**: Action handlers still reference old field names
3. **Missing Middleware**: No proper state transformation layer between engine and network

## Recommended Fixes (Priority Order)

1. **Immediate - Fix State Field References**
   - Update all `state.turnOrder[state.currentTurn]` to `state.currentPlayer`
   - Ensure consistent field naming throughout

2. **Critical - Standardize State Schema**
   - Choose either engine schema or network schema
   - Create proper conversion functions
   - Apply consistently in SyncManager

3. **Important - Fix Turn Rotation**
   - Ensure `order.currentIdx` properly tracked
   - Fix player advancement in `phases.ts:273-276`
   - Verify turn order initialization

4. **Important - Complete Action Handlers**
   - Fix combat action handlers
   - Implement missing action types
   - Add proper validation

5. **Nice-to-Have - Improve Phase Flow**
   - Add explicit phase progression action instead of overloading `endTurn`
   - Separate user-initiated vs automatic transitions
   - Add phase skip functionality

## Testing Checklist
- [ ] Turn advances correctly after player ends turn
- [ ] Current player indicator updates properly
- [ ] Actions restricted to current player
- [ ] Phase transitions occur smoothly
- [ ] Combat actions execute without errors
- [ ] Item management works during manage phase
- [ ] Duel offers/accepts process correctly
- [ ] Movement and tile resolution complete