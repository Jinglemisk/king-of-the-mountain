# Card Status Documentation

This document contains a comprehensive breakdown of all cards in the game, how they work mechanically in the codebase, and their current testing status.

---

## TIER 1 TREASURE CARDS (24 total)

### 1. Dagger (4 copies)
**Category:** Holdable
**Stats:** +1 Attack when equipped
**Type:** Permanent equipment

**How It Works:**
1. Defined in `cards.ts:58-61` as a factory function
2. When drawn from treasure deck, shown in CardRevealModal via `useTurnActions.ts:95-116`
3. Player can equip to holdable1 or holdable2 slot via drag-and-drop in `useEquipmentManagement.ts`
4. Attack bonus automatically calculated during combat via `playerStats.ts` using `item.attackBonus`
5. Bonus remains active while equipped in equipment slot

**WORKING?:**

---

### 2. Wooden Shield (4 copies)
**Category:** Holdable
**Stats:** +1 Defense when equipped
**Type:** Permanent equipment

**How It Works:**
1. Defined in `cards.ts:64-67`
2. Same draw/equip flow as Dagger
3. Defense bonus applied via `playerStats.ts` reading `item.defenseBonus`
4. Used in combat defense rolls automatically when equipped

**WORKING?:**

---

### 3. Robe (3 copies)
**Category:** Wearable
**Stats:** +1 Defense when equipped
**Type:** Permanent equipment

**How It Works:**
1. Defined in `cards.ts:70-72`
2. Drawn from treasure deck → CardRevealModal
3. Can only be equipped to wearable slot (enforced by `useEquipmentManagement.ts:canEquipItemInSlot`)
4. Defense bonus calculated same as Wooden Shield

**WORKING?:**

---

### 4. Crude Axe (3 copies)
**Category:** Holdable
**Stats:** +1 Attack when equipped
**Type:** Permanent equipment

**How It Works:**
1. Defined in `cards.ts:75-77`
2. Same mechanical flow as Dagger (holdable weapon with attack bonus)
3. Can be dual-wielded with another holdable in two slots

**WORKING?:**

---

### 5. Lamp (2 copies)
**Category:** Holdable
**Stats:** None
**Special:** step_back_before_resolve
**Type:** Passive equipment effect

**How It Works:**
1. Defined in `cards.ts:80-85` with `special: 'step_back_before_resolve'`
2. When equipped and player lands on tile with enemies or other players:
   - Checked in `useTurnActions.ts:347-397` during movement resolution
   - Automatically triggers step back by 1 tile BEFORE tile resolution
   - Player resolves the tile they stepped back to instead
3. Effect implemented via conditional logic, not effect executor
4. No effect handler in `itemEffects.ts`, handled inline in turn logic

**WORKING?:**

---

### 6. Trap (3 copies)
**Category:** Small
**Stats:** None
**Special:** trap
**Type:** Consumable placeable

**How It Works:**
1. Defined in `cards.ts:88-99` with `special: 'trap'` and `isConsumable: true`
2. Stored in inventory (not equipment)
3. Player can use via inventory click → triggers `useInventoryManagement.ts:102-154` (`handleUseTrap`)
4. Places trap on current tile:
   - Sets `tile.hasTrap = true` and `tile.trapOwnerId = playerId`
   - Cannot be placed on Start or Sanctuary tiles
5. When another player lands on trap:
   - Checked in `useTurnActions.ts:308-345`
   - Non-Scout players: skip tile effect, trap is removed
   - Scout players: immune, trap still removed but they resolve tile
6. Item is consumed when placed (removed from inventory)

**WORKING?:**

---

### 7. Luck Charm (2 copies)
**Category:** Small
**Stats:** None
**Special:** luck_cancel
**Type:** Consumable interrupt

**How It Works:**
1. Defined in `cards.ts:102-109` with `special: 'luck_cancel'`
2. Stored in inventory
3. **INTERRUPT MECHANIC:** Player can use when Luck card is drawn (by self or others)
4. Effect in `itemEffects.ts:105-129` (`luckCancel`)
   - Cancels the Luck card effect
   - Returns Luck Charm to bottom of T1 treasure deck (`result.data.requiresReturn`)
5. **NOTE:** UI for interrupt timing not fully implemented - this is partially working

**WORKING?:**

---

### 8. Beer (2 copies)
**Category:** Small
**Stats:** None
**Special:** heal_3_debuff_move
**Type:** Consumable with side effect

**How It Works:**
1. Defined in `cards.ts:112-119` with `special: 'heal_3_debuff_move'`
2. Stored in inventory, used via click
3. Effect in `consumableEffects.ts:16-53` (`heal3DebuffMove`):
   - Heals 3 HP (capped at maxHp)
   - Adds tempEffect: `beer_debuff` with duration 1
   - Updates `player.hp` and `player.tempEffects` in Firebase
4. Debuff applied on next movement:
   - `useTurnActions.ts:410` uses `getMovementModifier` from `tempEffects.ts:132-144`
   - Returns -1 if `beer_debuff` is active
   - Decremented at end of turn via `decrementTempEffects` in `useTurnActions.ts:467`

**WORKING?:**

---

### 9. Agility Draught (1 copy)
**Category:** Small
**Stats:** None
**Special:** temp_defense_1
**Type:** Consumable temporary buff

**How It Works:**
1. Defined in `cards.ts:122-125` with `special: 'temp_defense_1'`
2. Stored in inventory, used via click
3. Effect in `consumableEffects.ts:102-135` (`tempDefense1`):
   - Adds tempEffect: `agility_draught` with `duration: 1`, `defenseBonus: 1`
   - Updates `player.tempEffects`
4. Bonus applied in combat:
   - `tempEffects.ts:17-34` (`getTempEffectCombatBonuses`) calculates bonus
   - Added to defense rolls during combat in `useCombat.ts`
5. Expires at end of turn (duration decremented)

**WORKING?:**

---

## TIER 2 TREASURE CARDS (18 total)

### 10. Heirloom Armor (3 copies)
**Category:** Wearable
**Stats:** +2 Defense when equipped
**Type:** Permanent equipment

**How It Works:**
1. Defined in `cards.ts:134-136`
2. Same flow as Robe but with +2 defense bonus
3. Equipped to wearable slot only
4. Replaces any existing wearable when equipped

**WORKING?:**

---

### 11. Silver Shield (3 copies)
**Category:** Holdable
**Stats:** +2 Defense when equipped
**Type:** Permanent equipment

**How It Works:**
1. Defined in `cards.ts:139-141`
2. Same flow as Wooden Shield but +2 defense
3. Can be equipped alongside another holdable

**WORKING?:**

---

### 12. Lord's Sword (3 copies)
**Category:** Holdable
**Stats:** +2 Attack when equipped
**Type:** Permanent equipment

**How It Works:**
1. Defined in `cards.ts:144-146`
2. Same flow as Dagger/Crude Axe but +2 attack
3. Holdable weapon with higher damage

**WORKING?:**

---

### 13. Boogey-Bane (2 copies)
**Category:** Holdable
**Stats:** +2 Attack vs creatures only
**Special:** creatures_only
**Type:** Permanent equipment with restriction

**How It Works:**
1. Defined in `cards.ts:149-156` with `special: 'creatures_only'`
2. +2 attack bonus when equipped
3. **RESTRICTION:** Bonus only applies vs enemies, NOT vs players
4. **NOTE:** Combat system needs to check `item.special === 'creatures_only'` and conditionally apply bonus
5. Check `useCombat.ts` for implementation of this restriction in PvE vs PvP combat

**WORKING?:**

---

### 14. Velvet Cloak (2 copies)
**Category:** Wearable
**Stats:** +1 movement roll
**Type:** Permanent equipment

**How It Works:**
1. Defined in `cards.ts:159-160` with `movementBonus: 1`
2. Equipped to wearable slot
3. Movement bonus applied when rolling movement:
   - Bonus should be read from equipped wearable's `movementBonus` field
   - Added to dice roll in `useTurnActions.ts:410` (currently only checks tempEffects)
   - **NOTE:** Need to verify if equipment movement bonuses are implemented alongside temp effect bonuses

**WORKING?:**

---

### 15. Rage Potion (2 copies)
**Category:** Small
**Stats:** None
**Special:** temp_attack_1
**Type:** Consumable temporary buff

**How It Works:**
1. Defined in `cards.ts:163-170` with `special: 'temp_attack_1'`
2. Effect in `consumableEffects.ts:142-175` (`tempAttack1`):
   - Adds tempEffect: `rage_potion` with `duration: 1`, `attackBonus: 1`
3. Bonus applied via `getTempEffectCombatBonuses` during all attack rolls this turn
4. Expires at end of turn

**WORKING?:**

---

### 16. Fairy Dust (2 copies)
**Category:** Small
**Stats:** None
**Special:** invisibility
**Type:** Consumable status effect

**How It Works:**
1. Defined in `cards.ts:173-180` with `special: 'invisibility'`
2. Must be used BEFORE choosing Sleep action (per description)
3. Effect in `itemEffects.ts:175-199` (`invisibility`):
   - Sets `player.isInvisible = true`
4. Invisibility effects:
   - Player cannot be dueled: checked in `useTurnActions.ts:537-547`
   - Cleared at turn start: `GameScreen.tsx:214-228` auto-clears when turn begins
   - Cleared if moved by effect: `luckEffects.ts:31-33` and `luckEffects.ts:71-73`
5. Visual effect should hide player from other players (UI implementation)

**WORKING?:**

---

### 17. Smoke Bomb (1 copy)
**Category:** Small
**Stats:** None
**Special:** prevent_duel
**Type:** Consumable interrupt

**How It Works:**
1. Defined in `cards.ts:183-186` with `special: 'prevent_duel'`
2. **INTERRUPT:** Used when someone offers a duel
3. Effect in `itemEffects.ts:136-168` (`preventDuel`):
   - Adds tempEffect: `smoke_bomb` with `duration: 1`
   - Returns to bottom of T2 deck after use
4. Prevents all duels this turn:
   - Checked via `isDuelProtected` in `useTurnActions.ts:512-534`
   - Blocks both player's initiated duels and received duels
5. Expires at end of turn

**WORKING?:**

---

## TIER 3 TREASURE CARDS (10 total)

### 18. Royal Aegis (2 copies)
**Category:** Wearable
**Stats:** +3 Defense, -1 movement
**Type:** Permanent equipment with trade-off

**How It Works:**
1. Defined in `cards.ts:195-202` with `defenseBonus: 3`, `movementBonus: -1`
2. Equipped to wearable slot
3. Defense bonus applied via standard equipment bonus system
4. Movement penalty should reduce all movement rolls by 1
5. Same verification needed as Velvet Cloak for movement bonus implementation

**WORKING?:**

---

### 19. Essence of the Mysterious Flower (2 copies)
**Category:** Small
**Stats:** None
**Special:** full_heal
**Type:** Consumable healing

**How It Works:**
1. Defined in `cards.ts:205-212` with `special: 'full_heal'`
2. Effect in `consumableEffects.ts:60-95` (`fullHeal`):
   - Sets `player.hp = player.maxHp`
   - If already at full HP, still consumes item but logs different message
3. Instant full restore, no duration or temp effect

**WORKING?:**

---

### 20. Dragonfang Greatsword (2 copies)
**Category:** Holdable
**Stats:** +3 Attack when equipped
**Type:** Permanent equipment

**How It Works:**
1. Defined in `cards.ts:215-216`
2. Same flow as other holdable weapons
3. Highest attack bonus equipment in game (+3)

**WORKING?:**

---

### 21. Blink Scroll (2 copies)
**Category:** Small
**Stats:** None
**Special:** blink
**Type:** Consumable teleport

**How It Works:**
1. Defined in `cards.ts:219-226` with `special: 'blink'`
2. Description says: "Move +2 or -2 tiles before resolving tile; ignore pass-through effects"
3. Effect in `itemEffects.ts:16-60` (`blink`):
   - Takes `value` parameter (+2 or -2, determined by UI choice)
   - Updates `player.position` (clamped 0-19)
   - **SANCTUARY CHECK:** Cannot blink into or out of Sanctuary
   - Ignores pass-through effects (no trap/ambush checks during teleport)
4. **NOTE:** UI for choosing direction (+2 vs -2) needs to be implemented

**WORKING?:**

---

### 22. Wardstone (2 copies)
**Category:** Small
**Stats:** None
**Special:** prevent_1_hp
**Type:** Consumable protection

**How It Works:**
1. Defined in `cards.ts:229-236` with `special: 'prevent_1_hp'`
2. Effect in `itemEffects.ts:67-98` (`prevent1Hp`):
   - Adds tempEffect: `wardstone` with `duration: 99` (persists until used)
   - Does NOT auto-expire at turn end
3. Protection triggered when taking damage:
   - Check `hasWardstoneProtection` in `tempEffects.ts:151-153`
   - During damage calculation in combat, reduce damage by 1 if wardstone active
   - Remove wardstone effect after preventing damage
4. **NOTE:** Combat system must check for wardstone before applying damage

**WORKING?:**

---

## LUCK CARDS (32 total)

### 23. Exhaustion (4 copies)
**Effect:** move_back
**Value:** 1 tile

**How It Works:**
1. Defined in `cards.ts:276-279` with `effect: 'move_back'`, `value: 1`
2. Drawn when landing on luck tile via `useTurnActions.ts:119-176`
3. Effect auto-executed in `luckEffects.ts:16-49` (`moveBack`):
   - Updates `player.position` (max 0)
   - Clears invisibility if player was invisible
4. No tile resolution at new position (just moves back)

**WORKING?:**

---

### 24. Cave-in (3 copies)
**Effect:** move_back
**Value:** 3 tiles

**How It Works:**
1. Defined in `cards.ts:282-284` with `effect: 'move_back'`, `value: 3`
2. Same `moveBack` effect as Exhaustion but moves 3 tiles instead of 1

**WORKING?:**

---

### 25. Faint (2 copies)
**Effect:** skip_turn

**How It Works:**
1. Defined in `cards.ts:287-288` with `effect: 'skip_turn'`
2. Effect in `luckEffects.ts:96-127` (`skipTurn`):
   - Adds tempEffect: `skip_turn` with `duration: 1`
3. Turn skip enforced at turn start:
   - `GameScreen.tsx:190-209` checks `shouldSkipTurn` from `tempEffects.ts:123-125`
   - Auto-ends turn immediately with log message
   - Duration decremented, so only skips NEXT turn, not current

**WORKING?:**

---

### 26. Vital Energy (2 copies)
**Effect:** roll_again

**How It Works:**
1. Defined in `cards.ts:291-292` with `effect: 'roll_again'`
2. Effect in `luckEffects.ts:134-177` (`rollAgain`):
   - Rolls 4-sided die for new movement
   - Updates `player.position` with new roll
   - **IMPORTANT:** Calls `resolveTile` for the NEW tile landed on
3. This means player can chain into another luck card, treasure, or enemy encounter

**WORKING?:**

---

### 27. Lost Treasure (2 copies)
**Effect:** skip_draw_t1
**Value:** 2 treasures

**How It Works:**
1. Defined in `cards.ts:295-296` with `effect: 'skip_draw_t1'`, `value: 2`
2. Effect in `luckEffects.ts:184-219` (`skipDrawT1`):
   - Adds `skip_turn` tempEffect
   - Draws 2 Tier 1 treasures via `drawCards`
   - Returns treasures in `result.data.treasures`
3. Treasures shown in CardRevealModal and added to inventory (handled in `useTurnActions.ts:161-169`)

**WORKING?:**

---

### 28. Jinn Thief (3 copies)
**Effect:** steal_item
**Options:** requiresChoice: true

**How It Works:**
1. Defined in `cards.ts:299-301` with `effect: 'steal_item'`, `requiresChoice: true`
2. Effect in `luckEffects.ts:226-307` (`stealItem`):
   - If player has no items, effect fizzles (logs but nothing happens)
   - If no `itemId` provided: returns `requiresChoice: true` in result data
   - If `itemId` provided: removes item from inventory or equipment
3. UI flow:
   - Effect returns requiresChoice → triggers `setShowJinnThiefModal(true)` in `useTurnActions.ts:172-174`
   - Modal shown via `GameScreen.tsx:386-390` (JinnThiefModal component)
   - Player selects item → calls `handleJinnThiefItemSelection` in `useTurnActions.ts:595-617`
   - Re-executes effect with chosen itemId
4. Item returns to bottom of matching treasure tier deck (not implemented yet)

**WORKING?:**

---

### 29. Sprained Wrist (3 copies)
**Effect:** lose_hp
**Value:** 1 HP

**How It Works:**
1. Defined in `cards.ts:304-306` with `effect: 'lose_hp'`, `value: 1`
2. Effect in `luckEffects.ts:314-357` (`loseHp`):
   - Reduces `player.hp` by value (min 0)
   - **MONK SPECIAL:** If HP would drop to 0 and player is Monk who hasn't used ability:
     - Sets HP to 1 instead
     - Sets `specialAbilityUsed = true`
   - Logs damage taken
3. Should check for Wardstone protection before applying damage (not currently implemented)

**WORKING?:**

---

### 30. Covered Pit (3 copies)
**Effect:** draw_t1
**Value:** 1 treasure

**How It Works:**
1. Defined in `cards.ts:309-311` with `effect: 'draw_t1'`, `value: 1`
2. Effect in `luckEffects.ts:364-385` (`drawT1`):
   - Draws 1 Tier 1 treasure via `drawCards`
   - Returns treasure in `result.data.treasures`
3. Treasure shown in CardRevealModal and added to inventory (same flow as Lost Treasure)

**WORKING?:**

---

### 31. White-Bearded Spirit (2 copies)
**Effect:** move_forward
**Value:** 2 tiles

**How It Works:**
1. Defined in `cards.ts:314-315` with `effect: 'move_forward'`, `value: 2`
2. Effect in `luckEffects.ts:56-89` (`moveForward`):
   - Updates `player.position` forward by 2 (max 19)
   - Clears invisibility if active
3. No tile resolution at new position (just moves forward)

**WORKING?:**

---

### 32. Mystic Wave (2 copies)
**Effect:** swap_position
**Options:** requiresChoice: true

**How It Works:**
1. Defined in `cards.ts:318-319` with `effect: 'swap_position'`, `requiresChoice: true`
2. Effect in `luckEffects.ts:392-449` (`swapPosition`):
   - Finds nearest player by distance
   - If ties, random selection (not fully implemented)
   - Swaps positions between current player and target
   - **SANCTUARY ALLOWED:** Description says allowed because you affect yourself
3. If no other players, effect fizzles
4. Swap is instant, no tile resolution at new positions

**WORKING?:**

---

### 33. Nefarious Spirit (2 copies)
**Effect:** forced_duel

**How It Works:**
1. Defined in `cards.ts:322-323` with `effect: 'forced_duel'`
2. Effect in `luckEffects.ts:456-512` (`forcedDuel`):
   - Finds all players within 6 tiles
   - If none found, effect fizzles
   - Finds nearest player among those in range
   - Moves current player to target's position
   - Starts combat via `startCombat` with `canRetreat: false` (forced duel, no retreat)
3. Combat modal automatically shown after effect

**WORKING?:**

---

### 34. Ambush Opportunity (2 copies)
**Effect:** ambush
**Options:** canBeKept: true

**How It Works:**
1. Defined in `cards.ts:326-327` with `effect: 'ambush'`, `canBeKept: true`
2. **KEEP FACE DOWN:** Card not immediately discarded
3. Effect in `luckEffects.ts:519-551` (`ambush`):
   - Adds tempEffect: `ambush` with `duration: 99` (persists until used)
4. Player can place ambush on tile:
   - Button shown in ActionButtons if `hasAmbush()` returns true
   - Calls `handlePlaceAmbush` in `useTurnActions.ts:196-251`
   - Sets `tile.hasAmbush = true` and `tile.ambushOwnerId = playerId`
   - Cannot place on Start/Final tiles or tiles with existing ambush
5. Ambush triggers when another player enters tile:
   - Checked BEFORE trap in `useTurnActions.ts:274-306`
   - Starts combat (ambusher attacks, no retreat for victim)
   - Ambush removed from tile after triggering

**WORKING?:**

---

### 35. Instinct (2 copies)
**Effect:** instinct
**Options:** canBeKept: true

**How It Works:**
1. Defined in `cards.ts:330-331` with `effect: 'instinct'`, `canBeKept: true`
2. **KEEP FACE DOWN:** Card not immediately discarded
3. Effect in `luckEffects.ts:558-590` (`instinct`):
   - Adds tempEffect: `instinct` with `duration: 99` (persists until used)
4. Instinct activates after movement roll:
   - Checked in `useTurnActions.ts:433-438` via `hasInstinct`
   - Shows InstinctModal (GameScreen.tsx:393-429) with options: +1, -1, or skip
   - Calls `handleInstinctChoice` in `useTurnActions.ts:623-666`
   - Modifies position by offset, removes instinct effect
   - Continues with tile resolution at adjusted position
5. Single use - consumed when activated or skipped

**WORKING?:**

---

## NOTES ON IMPLEMENTATION STATUS

### Fully Implemented Mechanics
- Basic equipment bonuses (attack/defense from items)
- Temporary effects system (duration tracking, turn cleanup)
- Most consumable items (healing, buffs)
- Movement effects (move forward/back, teleport)
- Skip turn mechanics
- Invisibility status
- Trap placement and triggering

### Partially Implemented Mechanics
- **Luck Charm interrupt:** Effect exists but UI for interrupt timing incomplete
- **Smoke Bomb interrupt:** Same as Luck Charm
- **Blink Scroll direction choice:** Effect exists but UI for +2/-2 choice needed
- **Equipment movement bonuses:** Defined in items but may not be applied in movement calculation
- **Boogey-Bane restriction:** Defined but combat system needs to check creatures_only
- **Wardstone protection:** Effect exists but damage system needs to check/consume it
- **Jinn Thief deck return:** Item removed but not returned to deck bottom

### Not Yet Implemented
- Some card-specific UI interactions (modals for choices)
- Full sanctuary protection mechanics
- Some edge cases in card interactions

---

## CODE FLOW SUMMARY

### Drawing Cards
1. Land on treasure/luck tile → `useTurnActions.ts:resolveTileEffect`
2. Treasure: `drawCards` → CardRevealModal → Inventory system
3. Luck: `drawLuckCard` → CardRevealModal → `executeEffect` → specific effect handler

### Using Items
1. Click item in inventory → `useInventoryManagement.ts:handleUseItem`
2. Check if consumable and has special effect
3. Call `executeEffect` with item's special string
4. Effect handler executes logic, updates game state
5. Remove item from inventory if consumed

### Equipment
1. Drag item from inventory to equipment slot
2. `useEquipmentManagement.ts` validates category (holdable/wearable)
3. Update player.equipment in Firebase
4. Bonuses automatically calculated during combat/movement via `playerStats.ts`

### Temporary Effects
1. Effect adds entry to `player.tempEffects[]` with type, duration, bonuses
2. Bonuses read during relevant actions (combat, movement)
3. Duration decremented at end of turn via `decrementTempEffects`
4. Effects with duration <= 0 removed automatically
