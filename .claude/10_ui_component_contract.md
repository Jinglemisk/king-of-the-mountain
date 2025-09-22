UI_COMPONENT_CONTRACT.md

Version: 1.0 (matches GDD v1.0 board and rules)
Audience: UI engineers, rules engine implementers, test authors
Purpose: Define the UI surface as an interface: component catalog and props, screen flows, and user actions mapped to engine actions (doc 5). This lets the agent scaffold UI stubs that line up with engine and networking.

1) Principles and scope

- Scope
  - Screens: Lobby, Game, End/Bracket overlays.
  - Major components: Board, HUD/Inventory, Tile/Combat panels, Duel dialogs, Chat/Log.
  - For each component: inputs (props), emitted user actions (mapped to canonical action names), states (idle/loading/error/empty), and accessibility notes.
  - Flows: Turn sequence, branch choice, item use/swap, tile resolution (Treasure/Chance/Enemy), combat, duels, interrupts (Lamp, Smoke Bomb, Luck Charm, Wardstone), ambush/trap placement, capacity enforcement, final tie-breaker bracket.

- Authoritative state
  - The engine owns truth. UI is read-only except dispatching actions. UI must gate buttons by phase and authorization (current player, duel target, etc.), and show pending indicators until the engine confirms via state changes or log.

- Visibility
  - Equipped items of all players are public.
  - Inventory is hidden. UI must never render other players’ inventory contents or counts. If a hidden item is used and its text allows hidden use, log shows “used a hidden item” (per GDD).

- Phases and gating
  - Buttons and input affordances appear only in phases where they are legal (see doc 4). UI should not rely solely on disabling; it should not render disallowed actions.

- Accessibility
  - Keyboard: tab order through all actionable elements; Enter/Space activates focused element; Escape closes modals.
  - Modals: focus trap, return focus on close, aria-modal and labelled-by attributes.
  - Announcements: dice results, combat round outcomes, card reveals announced via aria-live=polite; errors via aria-live=assertive.
  - Color: tile types must be distinguishable by color and shape/icon; maintain 4.5:1 contrast for text.

2) High-level app tree

- AppShell
  - Router → LobbyScreen | GameScreen
  - Global providers: Auth, Firestore subscriptions, Sound (muted by default), Toasts, Hotkeys
  - Global overlays: ErrorBoundaryOverlay, DisconnectedOverlay, SettingsPopover

3) Screens

3.1 LobbyScreen

- Responsibilities
  - Join/leave seats, set nickname, select unique class, ready toggle, start match (owner).
- Inputs
  - roomId, roomCode
  - seats: array of up to 6 { seatIndex, occupantUid?, nickname?, classId?, ready }
  - me: { uid, isOwner, seatIndex? }
  - classOptions: list of classIds and descriptions; disabled flags for already chosen classes
  - status: lobby | starting | error
- Emits (actions)
  - room.joinSeat { seatIndex, nickname }
  - room.leaveSeat { seatIndex }
  - room.selectClass { classId }
  - room.toggleReady {}
  - room.startGame {} (owner only; requires 2–6 ready)
- States
  - Loading: seats unknown
  - Empty: seats list shows all open
  - Error: toast and inline message on write errors
- Accessibility
  - Live region updates when seats change; unique class labels with disabled reason

3.2 GameScreen

- Responsibilities
  - Primary game UI with board, HUD/Inventory, tile/combat panels, chat/log, and contextual prompts (branch, item draws, combat/duel, capacity).
- Inputs
  - gameId, version, status: playing | ended
  - currentPlayerUid, phase (turnStart | manage | preDuel | moveOrSleep | resolveTile | combat | duel | postCombat | capacity | endTurn)
  - me: { uid, classId, flags (alchemist, porter, monkCancelUsed, invisible?), equipped, inventory, hp, maxHp, position, movementHistory }
  - players: array with public info { uid, nickname, seatIndex, classId, hp, maxHp, position, equipped, flags public }
  - board: { nodes: tiles with id, type, tier; edges; special: startId, finalId; tileState: traps, ambushes, enemies queue by tile }
  - combat/duel state if present
  - deckCounts: approximate counts for visible decks (optional)
  - pendingDialogs: draw/equip/store decisions, capacity enforcement, lamp/blink prompts, chance choices, loot choices
  - finalTileBracket state if active
  - network: isOnline, writePending
- Emits (actions)
  - See component sections below; all actions must be gated by phase and authorization.
- States
  - Loading: board or playerStates not ready
  - Error: network or action errors
  - DisconnectedOverlay when offline

4) Shared primitives

- ModalDialog
  - Inputs: title, body, primary/secondary buttons, disabled states
  - Emits: onPrimary, onSecondary, onClose
- DiceRoll
  - Inputs: dieType (d4/d6), value, animated: boolean
  - Accessibility: announce “Rolled X on dY”
- HPBar
  - Inputs: current, max, low-health threshold
  - Accessibility: aria-valuenow/max, label
- ItemChip
  - Inputs: itemId, name, slotType, tierColor, visible (true for equipped, false for hidden inventory for others), isSmall/isDrinkable flags
  - Emits: onClick for details if owner or equipped; no click for others’ hidden items
- Toast
  - Inputs: severity (info/success/warn/error), text

5) Component catalog

5.1 BoardCanvas

- Responsibilities
  - Render board graph, player tokens, tile overlays (traps, ambushes, enemy queue indicators), branch-choice highlights.
- Inputs
  - board: nodes/edges; start/final ids
  - players: uid → position; seating order for draw order rendering
  - tileState: traps [{ tileId, ownerUid }], ambushes [{ tileId, ownerUid }], enemies [{ tileId, queueCount, tierHint? }]
  - currentPlayerUid, me.uid
  - branchChoice: active? { fromTileId, options: [toTileId...] }
  - highlightPath (optional): path array of tile ids
- Emits (actions)
  - game.movement.chooseBranch { fromTileId, toTileId } (current player during move; only if branchChoice active)
- States
  - Idle; branchChoice overlay active; animation for movement steps
- Accessibility
  - Provide list view of neighbors for keyboard users when branchChoice is active: “From tile 10, choose next node: 11 or 54.”

5.2 TurnControls (ActionBar)

- Responsibilities
  - Gate the top-level per-phase controls: Manage info, Duel offers, Sleep/Move, Retreat (during fights/duels).
- Inputs
  - phase, currentPlayerUid, me.uid, onTile type, sharedTilePlayerIds (excluding me), canOfferDuel, canTrade, canSleep, canMove, canRetreat
- Emits (actions)
  - preDuel.offerDuel { targetUid }
  - preDuel.openTradeDialog {}
  - moveOrSleep.sleep {}
  - moveOrSleep.rollMovement {} (d4 roll initiated by engine on receive; UI just dispatches intent)
  - combat.retreat {} or duel.retreat {}
- States
  - Disabled if not current player or not legal by phase
- Accessibility
  - Label buttons with phase and hotkeys (M to Move, S to Sleep, R to Retreat)

5.3 BranchChoicePrompt

- Responsibilities
  - Secondary prompt listing neighbor options when at a split after a movement roll.
- Inputs
  - active: boolean, fromTileId, options: [toTileId], recommended (optional) path
- Emits (actions)
  - game.movement.chooseBranch { fromTileId, toTileId }
- States
  - Blocks other inputs until resolved
- Accessibility
  - Radio list with confirm; or direct click on BoardCanvas

5.4 TilePanel

- Responsibilities
  - Show the tile you’re on: type, tier, any enemies queued or traps/ambushes present, Sanctuary rule reminder.
- Inputs
  - tileId, tileType, tier, enemiesQueue, trapPresent, ambushPresent, sharedPlayers
- Emits
  - None (informational)
- States
  - For Enemy tile, shows “Fight will begin” banner when entering resolveTile

5.5 PlayerHUD

- Responsibilities
  - Show my HP, class, passive reminders, per-class flags (Monk cancel used), active temporary effects (+Atk/+Def this turn), invisible status.
- Inputs
  - me: hp/maxHp, classId, flags, tempEffects
- Emits
  - OpenClassHelp (local UI), no engine actions
- Accessibility
  - Live update hp changes

5.6 InventoryPanel

- Responsibilities
  - Show equipped and hidden inventory for me; show equipped only for others on hover or in inspection.
  - Drag-drop or click-to-equip swap during Step 2 and when immediate swap is allowed on draw/loot.
- Inputs
  - me.equipped: wearable (1), holdable (2), modifiers; me.inventory: bandolier slots, backpack slots; capacities by class (alchemist, porter)
  - phase, canSwapNow (true during Step 2 or immediate-on-draw)
- Emits (actions)
  - manage.equipItem { itemId, slotType }
  - manage.unequipItem { slotType }
  - manage.swapEquipment { from: {slotType or inventorySlotId}, to: {slotType or inventorySlotId} }
  - items.dropItem { itemId } (only when prompted by capacity or voluntarily in manage)
  - items.useItem { itemId } (if small/drinkable and timing allows)
- States
  - Disabled outside allowed windows
- Accessibility
  - Provide non-drag alternative (select source/target lists); announce capacity overflows

5.7 DrawDialog (Treasure/Chance)

- Responsibilities
  - Reveal drawn card and present legal choices: equip/store/drop for treasure; resolve text for chance.
- Inputs
  - type: treasure or chance; tier (if treasure); card: { id, name, text, itemType? } (the engine must avoid leaking hidden info to others until resolved)
  - swapWindow: canArrangeNow = true (treasure draw)
- Emits (actions)
  - draw.chooseTreasurePlacement { choice: equip | backpack | bandolier | drop }
  - chance.resolve { cardInstanceId, choices? } (if card needs a choice like target player or move +/-)
  - items.useItem { itemId } for cards that are keep-in-hand smalls (e.g., Ambush Opportunity, Instinct) when used immediately; otherwise they go to inventory
- States
  - Blocks until resolved; ensures capacity or immediate drop if no space
- Accessibility
  - Announce reveal

5.8 CombatPanel

- Responsibilities
  - PvE fight UI: show enemy queue, round rolls, modifiers, allow target selection for multi-enemy, allow retreat, potions, class passives.
- Inputs
  - combatState: participants [{ uid: me }, enemies [{ enemyId, name, hp, atkBonus, defBonus }]], roundNumber, canSelectTarget, selectedTargetId, myTempEffects, classPassives (e.g., Hunter +1 Atk vs creatures; Guardian +1 Def vs creatures), alchemistBoost if applicable, duelMode: false
  - dice: latest rolled values for both sides and accumulated modifiers
  - allowRetreat: boolean
- Emits (actions)
  - combat.selectTarget { enemyId }
  - combat.advanceRound {} (engine rolls atk/def and resolves)
  - combat.usePotion { itemId } (Rage/Agility/Beer/Essence), only legal windows
  - combat.retreat {}
- States
  - Show results per round; enemy death removals immediately; loot prompts queued after combat ends
- Accessibility
  - Announce “Round N: You rolled A/D, Enemy rolled A/D; You took X damage, Enemy took Y”

5.9 DuelDialog

- Responsibilities
  - Offer/accept/decline duels; run duel rounds; support Monk cancel roll and Duelist defense re-roll.
- Inputs
  - offer: { fromUid, toUid } when active
  - duelState: similar to combat but participants are two players; include class passives (Duelist +1 Atk); flags: duelistDefenseRerollAvailable, monkCancelAvailable (only on receiving an offer once per game)
  - dice: rolled values with modifiers
  - allowRetreat: true
- Emits (actions)
  - duel.offer { toUid }
  - duel.accept { offerId }
  - duel.decline { offerId }
  - duel.invokeMonkCancel {} (triggers a d6; engine resolves 5–6 => cancel)
  - duel.advanceRound {}
  - duel.useDefenseReroll {} (Duelist once per duel; only after defense roll is visible and before damage resolves)
  - duel.usePotion { itemId } (as legal)
  - duel.retreat {}
- States
  - If Smoke Bomb interrupt is played by defender, close offers and disable new offers for the rest of current turn
- Accessibility
  - Announce results and end-of-duel loot selection to winner

5.10 LootDropModal

- Responsibilities
  - Resolve loot drops per enemy defeated and Raider passive rolls.
- Inputs
  - lootQueue: array of draws to resolve { source: enemyTier | raiderPassive, deckTier, count } resolved one by one
  - drawnCards: as they are revealed, with equip/store flow
- Emits (actions)
  - loot.drawNext {} (engine pulls from deck according to RNG/shuffle)
  - draw.chooseTreasurePlacement { equip|backpack|bandolier|drop }
- States
  - Progress through multiple enemies; close when complete

5.11 CapacityDialog

- Responsibilities
  - Enforce capacity at Step 6; allow drop decisions; handle shared-tile pickups by others before bottoming.
- Inputs
  - overBy: number; current equipment/inventory; coLocatedPlayers: [{ uid, nickname }]
- Emits (actions)
  - items.dropItem { itemId }
  - capacity.confirmResolved {}
  - pickUp.pickItem { itemId } (for another player on the tile; only appears on their UI while window active)
- States
  - Block endTurn until resolved
- Accessibility
  - Warn about items going to bottom of deck when window closes

5.12 TrapPlacementPrompt

- Responsibilities
  - Place a Trap item on current non-Sanctuary tile (Scout may pick up trap they step onto).
- Inputs
  - canPlace: boolean (not Sanctuary); hasTrapCard: boolean
- Emits (actions)
  - trap.place { itemId, tileId }
  - scout.pickUpTrapOnTile {} (when stepping onto a trap tile; alternative to triggering)
- States
  - Show tile highlight; hide on Sanctuary

5.13 AmbushPlacementPrompt

- Responsibilities
  - Place Ambush Opportunity kept card face-down on your current non-Sanctuary tile from the start of your next turn onward; and prompt ambush owner to start a duel when a player enters that tile during movement.
- Inputs
  - canPlaceNow: boolean; tileId; hasAmbushCard
  - triggerEvent: when another player enters your ambush tile, show “Start duel before tile resolves?”
- Emits (actions)
  - ambush.place { cardInstanceId, tileId }
  - ambush.triggerDuel { targetUid }
  - ambush.pass {}
- States
  - Blocks tile resolution until resolved (trigger or pass)
- Accessibility
  - Announce prompt only to ambush owner

5.14 InterruptPrompts

- Responsibilities
  - Generic interrupt window for hidden-play items: Luck Charm, Smoke Bomb, Wardstone, Lamp, Blink Scroll.
- Inputs
  - interruptType: luckCharm | smokeBomb | wardstone | lamp | blinkScroll
  - context: varies (e.g., for Lamp, “you would end on Enemy or Player tile X”; for Luck Charm, “cancel card ‘Cave-in’ revealed by P?”)
  - hasEligibleItem: boolean; equippedOnly for Lamp; inventory for others
- Emits (actions)
  - items.useItem { itemId, context } (Luck Charm, Smoke Bomb, Wardstone)
  - lamp.use {} (if treated as a passive trigger on equipped holdable; payload may be implicit)
  - blinkScroll.use { delta: +2 | -2 }
  - interrupt.pass {}
- States
  - Timely; blocks only the affected resolution until all relevant players either act or pass
- Accessibility
  - High-priority aria-live for time-sensitive decisions

5.15 ChanceCardReveal

- Responsibilities
  - Show chance card and resolve any immediate effects (movement, draws, skips). Support Luck Charm interrupts.
- Inputs
  - card: { id, name, text, type: immediate | keep }
  - choices (if any)
- Emits (actions)
  - chance.resolve { cardInstanceId, chosen? }
- States
  - If keep, move to inventory; if immediate, apply and queue movement effects for Step 1 of next turn if moved by others’ turns

5.16 EnemyQueuePanel

- Responsibilities
  - Show enemies queued on current tile; allow target selection.
- Inputs
  - enemies: list with hp, atk/def, currentTargetId
- Emits (actions)
  - combat.selectTarget { enemyId }

5.17 ChatPanel

- Responsibilities
  - Per-game chat with filters (All | System | Combat).
- Inputs
  - messages: [{ msgId, ts, uid, nickname, text }]
  - typingIndicator (optional)
- Emits (actions)
  - chat.send { text }
- States
  - Loading history; error send with retry
- Accessibility
  - aria-live region separate from system log

5.18 LogPanel

- Responsibilities
  - Action log: dice results, tile entries, card names and effects, item equips/uses that are public, HP changes, combat summaries, loot.
- Inputs
  - entries: [{ entryId, ts, message, type, payload }]
- Emits
  - filter.toggle { types }
- Accessibility
  - Announce important engine events; provide search

5.19 SettingsPopover

- Responsibilities
  - Sound toggle (muted by default), colorblind palette toggle (UI-only), help links.
- Inputs
  - muted: boolean
- Emits
  - settings.setMuted { value }

5.20 TieBreakerBracket

- Responsibilities
  - Final-tile tie bracket flow: show bracket in seat order, run sequential duels until winner declared.
- Inputs
  - bracket: { participants: [uids], matches: list of pairings, currentMatch }
- Emits (actions)
  - duel.accept/decline per match; duel.advanceRound, retreat (per standard duel rules)
- States
  - Freezes normal turn cycle; only bracket-related actions enabled

6) UI → engine action mapping and constraints

Note: These action names must exactly match doc 5. The UI must only expose them in the phases and roles listed.

- room.joinSeat { seatIndex, nickname } — lobby only; any unaffiliated user
- room.leaveSeat { seatIndex } — lobby only; occupant or owner
- room.selectClass { classId } — lobby; occupant
- room.toggleReady {} — lobby; occupant
- room.startGame {} — lobby; owner; requires 2–6 ready and unique class choices

- manage.equipItem { itemId, slotType } — manage phase or immediate-on-draw; current player
- manage.unequipItem { slotType } — manage phase; current player
- manage.swapEquipment { from, to } — manage phase; current player
- items.dropItem { itemId } — manage or capacity phase; owner
- items.pickUpItem { itemId } — capacity phase; co-located players only; window open before deck return
- items.useItem { itemId, context? } — owner; timing depends on item:
  - On your turn, any time: drinkables/smalls that say “on your turn” or “this turn”
  - Interrupt windows: Luck Charm (chance reveal), Smoke Bomb (duel offered to you), Wardstone (prevent damage event), Lamp (pre-tile-resolution on equipped holdable), Blink Scroll (pre-tile-resolution)
  - Not allowed on Sanctuary if restricted (Trap, Ambush)

- preDuel.offerDuel { toUid } — preDuel phase; current player on shared non-Sanctuary tile
- preDuel.acceptDuel { offerId } — receiver or mutual consent if both initiate
- preDuel.declineDuel { offerId } — receiver only
- preDuel.openTradeDialog {} — preDuel phase; current player on shared tile
- trade.propose { toUid, giveItemIds: [], receiveItemIds: [] } — preDuel; both must have capacity to accept
- trade.accept { tradeId }
- trade.decline { tradeId }
- trade.cancel { tradeId } — proposer

- moveOrSleep.sleep {} — moveOrSleep; current player
- moveOrSleep.rollMovement {} — moveOrSleep; current player
- movement.chooseBranch { fromTileId, toTileId } — during movement; current player

- lamp.use {} — auto-eligible only if equipped and conditions met; treated as interrupt; current player
- blinkScroll.use { delta: +2 | -2 } — owner; interrupt; blocks tile resolution

- chance.resolve { cardInstanceId, choices? } — card owner; per-card timing rules
- trap.place { itemId, tileId } — owner; not on Sanctuary
- ambush.place { cardInstanceId, tileId } — owner; from start of next turn; not on Sanctuary
- ambush.triggerDuel { targetUid } — owner; when someone lands on ambush tile; before tile resolves
- ambush.pass {} — owner; allow tile to resolve without duel

- combat.selectTarget { enemyId } — combat; current player
- combat.advanceRound {} — combat; current player (engine rolls and resolves)
- combat.usePotion { itemId } — legal windows (this turn potions before or during combat; alchemist boost applied)
- combat.retreat {} — combat; current player

- duel.invokeMonkCancel {} — on receiving a duel offer; monk once per game
- duel.accept { offerId } / duel.decline { offerId } — receiver
- duel.advanceRound {} — duel; both parties roll and resolve simultaneously via engine
- duel.useDefenseReroll {} — Duelist once per duel; after seeing defense roll
- duel.usePotion { itemId } — legal windows
- duel.retreat {} — duel; either participant

- loot.drawNext {} — after combat or duel win if Raider
- draw.chooseTreasurePlacement { equip|backpack|bandolier|drop } — when a treasure is granted

- capacity.confirmResolved {} — capacity phase; current player

- chat.send { text } — any time

7) Phase-driven UI flow (textual wireflows)

- Start of turn (turnStart)
  - If pending tile from external movement, show TilePanel for that tile, process its effect (Treasure/Chance/Enemy). If Enemy, jump to CombatPanel. After resolution, continue to manage.

- Manage (Step 2)
  - InventoryPanel unlocked; equip/swap freely. After done, proceed to preDuel automatically when the player clicks “Continue” or after a dedicated “Done Managing” control.

- PreDuel (Step 3)
  - If shared tile and not Sanctuary: TurnControls shows Offer Duel and Trade. Opponent sees incoming offer; if defender is Monk, show invokeMonkCancel. Smoke Bomb interrupt offered to defender on offer reception. After offers and trades end, proceed to moveOrSleep.

- MoveOrSleep (Step 4)
  - Choose Sleep: confirm and apply full heal; if on Enemy tile, show banner that fight will still trigger at Step 5.
  - Choose Move: dispatch rollMovement; DiceRoll displays; BoardCanvas animates along path; when at split, BranchChoicePrompt appears. After final step, check Lamp interrupt (equipped): if destination has an enemy or player, prompt to step back 1; if yes, move back 1 and go to Step 5 for new tile; if no, proceed to resolveTile.

- ResolveTile (Step 5)
  - Treasure: DrawDialog; immediate swap allowed; enforce capacity if needed.
  - Chance: ChanceCardReveal; allow Luck Charm interrupts (self or other players); apply effects. Movement pushed by others’ Chance resolves on their turn but the tile effect waits for your next turn Step 1.
  - Sanctuary: show reminder (no duels here).
  - Enemy: enter CombatPanel. Multi-enemy queue shown; target selection allowed.

- Combat/Duel
  - Show class passives and temporary effects; show Retreat button.
  - Each round: engine rolls atk/def for both sides. In Duel, allow Duelist defense re-roll prompt between seeing roll and applying damage. Apply Wardstone prompt on damage events if owner holds one. Alchemist boosts apply automatically.
  - Continue until one side at 0 HP or retreat. On PvE loss: move back 1 tile, flag Sleep next turn. On duel loss: stay at 0 HP, winner may loot items via LootDropModal (visibility rules: looted items become public if equipped).
  - On victory: resolve loot drops via LootDropModal; apply Raider bonus roll if applicable.

- PostCombat → Capacity (Steps 7–8)
  - If over capacity, show CapacityDialog; allow co-located pickups before bottoming.
  - Confirm to end turn.

- End turn
  - Advance currentPlayer; clear per-turn flags and potions.

- Final tile tie-breaker
  - If multiple arrive simultaneously by one effect, freeze normal turns. TieBreakerBracket overlay appears with pairings in seat order. Duels run through DuelDialog until one winner remains.

8) Visibility and info integrity

- Others’ hidden inventory:
  - Never render names/icons. When they use a hidden item and its text permits hidden use, log shows “P used a hidden item.” If the item’s effect inherently reveals itself (e.g., Blink Scroll moves ±2), show effect, not the item name.
- Deck counts:
  - Optional approximate counts can be shown as “low/med/high” or numbers for own reference; avoid leaking precise order.
- RNG:
  - Show dice outcomes publicly in LogPanel and context panels. In dev mode, show rngAudit if enabled.

9) Error, loading, offline

- Loading
  - LobbyScreen: skeleton rows for seats. GameScreen: skeleton BoardCanvas, HUD placeholders.
- Offline/disconnected
  - DisconnectedOverlay with retry; queue user inputs disabled; no optimistic actions.
- Action errors
  - Toast and inline hint e.g., “Action not allowed in this phase”; do not retry automatically.

10) Accessibility notes

- Keyboard shortcuts
  - M Move, S Sleep, R Retreat, D Offer Duel, A Accept, N Decline, C Continue/Confirm in dialogs; only active when visible.
- ARIA labels
  - Board tiles: label “Tile 10: Enemy Tier 2; neighbors 11 and 54.”
  - Dice: announce “Rolled 3 on d4.”
  - Log entries: categorize with role=status for system updates.
- Color/shape
  - Tile icons: Enemy (sword), Treasure (chest), Chance (?), Sanctuary (shield), Empty (dot). Combine color and icon to avoid color-only cues.

11) Component data contracts (props as simple lists; align names with TS types in doc 2)

- Common types referenced (for clarity)
  - PlayerPublic: uid, nickname, seatIndex, classId, hp, maxHp, position, equipped, flags public
  - MePrivate: adds inventory hidden, tempEffects, movementHistory, flags private (monkCancelUsed)
  - BoardGraph: nodes [{ id, type, tier? }], edges [{ from, to }]
  - TileState: traps [{ tileId, ownerUid }], ambushes [{ tileId, ownerUid }], enemies [{ tileId, queue: [{ enemyId, hp }] }]
  - CombatState: type: pve | duel; participants; round; dice; modifiers; options (canRetreat, canSelectTarget)
  - BracketState: participants [uid], matches [{ aUid, bUid, status }], currentMatch index

- For each component above, the Inputs lists define required shapes. These mirror or derive from GameState and ViewModel selectors in doc 2.

12) Interrupt timing windows the UI must support

- Luck Charm
  - When: Immediately on revealing any Chance card by its owner or another player.
  - Who: Any player who holds it; UI displays prompt only to those players.
  - Effect: Cancel that card; return Luck Charm to bottom of Tier 1.

- Smoke Bomb
  - When: When someone offers you a duel this preDuel phase.
  - Who: Defender with Smoke Bomb in inventory.
  - Effect: Prevent any duels for the remainder of the current turn; return to bottom of Tier 2.

- Wardstone
  - When: Each time you would lose HP (combat/duel/chance).
  - Who: Owner with Wardstone in inventory.
  - Effect: Prevent 1 HP loss; consume.

- Lamp (equipped holdable)
  - When: If your turn would end on a tile with a player or an enemy, before resolving that tile.
  - Who: Current player with Lamp equipped.
  - Effect: Step back 1 tile; then resolve the new tile.

- Blink Scroll
  - When: Before resolving your tile on your turn.
  - Who: Owner with Blink in inventory.
  - Effect: Move +2 or −2; ignore pass-through effects; cannot move into or out of Sanctuary if effect would force.

- Scout vs Trap tile
  - When: On landing on a trapped tile.
  - Who: Scout only.
  - Effect: Option to pick up the trap instead of triggering it.

- Monk cancel
  - When: On receiving a duel offer once per game.
  - Who: Monk only.
  - Effect: Roll d6; on 5–6 cancel that duel.

- Duelist re-roll
  - When: During a duel, after seeing defense roll and before damage resolution.
  - Who: Duelist only, once per duel.
  - Effect: Re-roll defense die.

13) Board and movement UI specifics

- Movement preview
  - After roll, animate step-by-step; at splits, pause and show BranchChoicePrompt; BoardCanvas highlights options and shows counts to final (optional).
- Backward movement
  - Effects like “move 3 back”: animate rewinding along player’s movement history; if exhausted, follow reverse edges; UI shows “Rewinding along history…” explanation in TilePanel.

14) Legal/illegal interactions examples for the UI to enforce

- Cannot offer duel on Sanctuary tiles: Hide Offer Duel button.
- Cannot place Trap/Ambush on Sanctuary: Disable placement prompt; show tooltip “Not allowed on Sanctuary.”
- Cannot use Backpack stowed items in combat unless equipped first: InventoryPanel disables Use on backpack items during combat; equip swaps disallowed during combat unless a rule allows.
- Immediate swap on treasure draw: After DrawDialog for treasure, InventoryPanel allows equip/store; all other actions disabled until resolved.
- Over capacity at end of turn: CapacityDialog blocks endTurn; disable other actions; allow co-located pickups.
- Invisible (Fairy Dust): Hide duel offer and disallow others to offer to you; show “Invisible” tag in your HUD; ends on move or next turn start.

15) Performance and resilience

- LogPanel and ChatPanel should virtualize long lists.
- BoardCanvas should throttle animations and support reduced motion preference (CSS prefers-reduced-motion).
- All repeated server writes must be idempotent on the engine side; UI should surface pending state but avoid duplicate sends (disable button until response).

16) Event → UI reaction (illustrative; detailed payloads in doc 5)

- GamePhaseChanged → Update TurnControls, enable/disable InventoryPanel, show appropriate prompts.
- MovementRolled { value } → DiceRoll animation, BoardCanvas movement.
- EnteredTile { tileId } → TilePanel update; check Lamp interrupt conditions.
- ChanceDrawn { card } → ChanceCardReveal; open Luck Charm interrupt windows for eligible holders.
- EnemySpawned { tileId, enemies } → TilePanel enemiesQueue; auto-enter CombatPanel if on your tile in resolveTile.
- CombatRoundResolved { results } → CombatPanel update; announce damage; check Wardstone prompt if damage to owner.
- DuelOffered { from, to } → DuelDialog; show Smoke Bomb and Monk cancel prompts for defender.
- DuelEnded { winnerUid } → LootDropModal if PvP; tile/HP updates.
- LootGranted { deckTier } → LootDropModal; then DrawDialog.
- CapacityEnforcementStarted → CapacityDialog.
- FinalTieBracketStarted → TieBreakerBracket overlay.
- DeckShuffled → LogPanel entry.
- RNGRolled { die, value, context } → DiceRoll banner and LogPanel entry.

17) Minimal theming tokens (recommendations, not binding)

- Tile color/icon
  - Enemy: red + crossed swords
  - Treasure: yellow + chest
  - Chance: purple + question
  - Sanctuary: green + shield
  - Empty: gray + dot
- Item tier accents
  - T1 pale gold, T2 bronze, T3 royal purple accents (combine color + tier badge for accessibility)

18) QA hooks

- Each actionable element must have a data-testid:
  - Buttons: data-testid="btn-move", "btn-sleep", "btn-offer-duel", "btn-retreat", "btn-accept-duel", "btn-use-potion-Rage", etc.
  - Modals: data-testid="modal-draw", "modal-capacity", "modal-combat", "modal-duel", "modal-branch"
  - Board tiles: data-testid="tile-<id>"
  - Inventory slots: data-testid="slot-wearable", "slot-holdable-1", "slot-bandolier-1", "slot-backpack-1"
- Accessibility checks in CI: run axe-core on major screens.

19) Open questions to settle in doc 5/2 alignment (UI blockers)

- Whether items.useItem is a single action for all item effects or effect-specific action names exist; UI assumes a single items.useItem with context payload when needed.
- Whether combat/duel rounds are advanced by a “advanceRound” command or auto-run with user-held interrupts; UI assumes explicit advanceRound to provide clear interrupt windows.
- Specific shape for trade actions and capacity checks; UI assumes engine validates and returns errors with reasons to display.
