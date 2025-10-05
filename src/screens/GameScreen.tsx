/**
 * Game Screen
 * Main gameplay screen with board, inventory, combat, and turn management
 */

import { useState, useEffect } from 'react';
import type { GameState, Item, Enemy, LuckCard, Tile } from '../types';
import { Board } from '../components/game/Board';
import { Card } from '../components/game/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { CardRevealModal } from '../components/game/CardRevealModal';
import { CombatModal } from '../components/game/CombatModal';
import { InventoryFullModal } from '../components/game/InventoryFullModal';
import {
  updateGameState,
  addLog,
  rollDice,
  drawCards,
  drawLuckCard,
  drawEnemiesForTile,
  startCombat,
  executeCombatRound,
  endCombat,
} from '../state/gameSlice';

interface GameScreenProps {
  gameState: GameState;
  playerId: string;
}

/**
 * Main game screen where gameplay happens
 * @param gameState - Current game state
 * @param playerId - This player's ID
 */
export function GameScreen({ gameState, playerId }: GameScreenProps) {
  // State for UI interactions
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'chat'>('logs');

  // State for modals
  const [revealedCards, setRevealedCards] = useState<(Item | Enemy | LuckCard)[]>([]);
  const [revealCardType, setRevealCardType] = useState<'treasure' | 'enemy' | 'luck'>('treasure');
  const [showCardReveal, setShowCardReveal] = useState(false);
  const [showCombat, setShowCombat] = useState(false);
  const [combatEnemies, setCombatEnemies] = useState<Enemy[]>([]);
  const [showInventoryFull, setShowInventoryFull] = useState(false);
  const [pendingItems, setPendingItems] = useState<Item[]>([]);

  // State for drag-and-drop
  const [draggedItem, setDraggedItem] = useState<{ item: Item; source: string } | null>(null);

  // State for duel
  const [showDuelModal, setShowDuelModal] = useState(false);

  // State for PvP looting
  const [showLootingModal, setShowLootingModal] = useState(false);
  const [defeatedPlayerId, setDefeatedPlayerId] = useState<string | null>(null);

  // Get current player and turn info
  const currentPlayer = gameState.players[playerId];
  const currentTurnPlayerId = gameState.turnOrder[gameState.currentTurnIndex];
  const isMyTurn = currentTurnPlayerId === playerId;
  const currentTurnPlayer = currentTurnPlayerId ? gameState.players[currentTurnPlayerId] : null;

  // Safety check - if player data is missing or incomplete, show loading
  if (!currentPlayer) {
    return (
      <div className="screen loading-screen">
        <p>Loading player data...</p>
      </div>
    );
  }

  // Safety check - if game hasn't started yet, no turn player exists
  if (gameState.status === 'active' && !currentTurnPlayer) {
    return (
      <div className="screen loading-screen">
        <p>Loading turn data...</p>
      </div>
    );
  }

  // Provide default turn player for non-active games
  const safeTurnPlayer = currentTurnPlayer || currentPlayer;

  /**
   * Auto-wake unconscious players when their turn starts
   */
  useEffect(() => {
    // Check if it's my turn and I'm unconscious
    if (isMyTurn && !currentPlayer.isAlive && gameState.status === 'active') {
      // Trigger wake-up after a short delay
      const timer = setTimeout(() => {
        handleUnconsciousPlayerTurn();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isMyTurn, currentPlayer.isAlive, gameState.status]);

  /**
   * Helper: Normalize inventory array to always have correct number of slots
   * Ensures inventory is always an array with 4 slots (or 5 for Porter), padding with null
   * @param inventory - Current inventory array (may be incomplete or empty)
   * @returns Normalized inventory array with proper length
   */
  const normalizeInventory = (inventory: (Item | null)[] | undefined | null): (Item | null)[] => {
    const maxSlots = currentPlayer.class === 'Porter' ? 5 : 4;
    const currentInventory = inventory || [];

    // Create array with max slots, preserving existing items
    const normalized: (Item | null)[] = [];
    for (let i = 0; i < maxSlots; i++) {
      normalized[i] = currentInventory[i] || null;
    }

    return normalized;
  };

  /**
   * Helper: Add items to first available inventory slots
   * @param items - Items to add
   * @returns Object with modified inventory, items that fit, and items that overflow
   */
  const addItemToInventory = (items: Item[]): { inventory: (Item | null)[]; added: Item[]; overflow: Item[] } => {
    // Normalize inventory to ensure proper slot count
    const inventory = normalizeInventory(currentPlayer.inventory);

    const added: Item[] = [];
    const overflow: Item[] = [];

    for (const item of items) {
      // Find first null/empty slot
      const emptyIndex = inventory.findIndex(slot => slot === null);
      if (emptyIndex !== -1) {
        inventory[emptyIndex] = item;
        added.push(item);
      } else {
        // All slots full - item overflows
        overflow.push(item);
      }
    }

    return { inventory, added, overflow };
  };

  /**
   * Helper: Calculate player's total attack and defense from equipment
   * Note: This function is kept for future use in combat logic
   */
  // const calculatePlayerStats = (): { attack: number; defense: number } => {
  //   let attack = 1; // Base attack
  //   let defense = 1; // Base defense

  //   if (!currentPlayer.equipment) {
  //     return { attack, defense };
  //   }

  //   const equipment = currentPlayer.equipment;

  //   if (equipment.holdable1) {
  //     attack += equipment.holdable1.attackBonus || 0;
  //     defense += equipment.holdable1.defenseBonus || 0;
  //   }
  //   if (equipment.holdable2) {
  //     attack += equipment.holdable2.attackBonus || 0;
  //     defense += equipment.holdable2.defenseBonus || 0;
  //   }
  //   if (equipment.wearable) {
  //     attack += equipment.wearable.attackBonus || 0;
  //     defense += equipment.wearable.defenseBonus || 0;
  //   }

  //   return { attack, defense };
  // };

  /**
   * Validation: Check if an item can be equipped in a specific slot
   * @param item - The item to validate
   * @param slot - The target equipment slot
   * @returns True if valid, false otherwise
   */
  const canEquipItemInSlot = (item: Item, slot: 'holdable1' | 'holdable2' | 'wearable'): boolean => {
    // Small items (consumables) cannot be equipped
    if (item.category === 'small') {
      return false;
    }

    // Holdable items (weapons, shields) can only go in hand slots
    if (item.category === 'holdable' && (slot === 'holdable1' || slot === 'holdable2')) {
      return true;
    }

    // Wearable items (armor, cloaks) can only go in armor slot
    if (item.category === 'wearable' && slot === 'wearable') {
      return true;
    }

    return false;
  };

  /**
   * Handle equipping an item from inventory to equipment slot
   * @param item - The item to equip
   * @param inventoryIndex - The inventory index where the item is
   * @param equipmentSlot - The equipment slot to equip to
   */
  const handleEquipItem = async (
    item: Item,
    inventoryIndex: number,
    equipmentSlot: 'holdable1' | 'holdable2' | 'wearable'
  ) => {
    // Validate the item can be equipped in this slot
    if (!canEquipItemInSlot(item, equipmentSlot)) {
      return;
    }

    const equipment = currentPlayer.equipment || { holdable1: null, holdable2: null, wearable: null };
    const inventory = currentPlayer.inventory ? [...currentPlayer.inventory] : [null, null, null, null];

    // Check if the equipment slot is already occupied
    const currentlyEquippedItem = equipment[equipmentSlot];

    // If slot is occupied, swap items (move equipped item to inventory)
    if (currentlyEquippedItem) {
      inventory[inventoryIndex] = currentlyEquippedItem;
      await addLog(
        gameState.lobbyCode,
        'action',
        `${currentPlayer.nickname} swapped ${currentlyEquippedItem.name} with ${item.name} in ${equipmentSlot === 'wearable' ? 'Armor' : equipmentSlot === 'holdable1' ? 'Hand 1' : 'Hand 2'}`,
        playerId
      );
    } else {
      // Slot is empty, just remove from inventory
      inventory[inventoryIndex] = null;
      await addLog(
        gameState.lobbyCode,
        'action',
        `${currentPlayer.nickname} equipped ${item.name} in ${equipmentSlot === 'wearable' ? 'Armor' : equipmentSlot === 'holdable1' ? 'Hand 1' : 'Hand 2'}`,
        playerId
      );
    }

    // Update equipment
    const updatedEquipment = {
      ...equipment,
      [equipmentSlot]: item,
    };

    // Update Firebase with normalized inventory
    await updateGameState(gameState.lobbyCode, {
      [`players/${playerId}/equipment`]: updatedEquipment,
      [`players/${playerId}/inventory`]: normalizeInventory(inventory),
    });
  };

  /**
   * Handle unequipping an item from equipment slot to inventory
   * @param item - The item to unequip
   * @param equipmentSlot - The equipment slot to unequip from
   */
  const handleUnequipItem = async (
    item: Item,
    equipmentSlot: 'holdable1' | 'holdable2' | 'wearable'
  ) => {
    const equipment = currentPlayer.equipment || { holdable1: null, holdable2: null, wearable: null };
    const inventory = currentPlayer.inventory ? [...currentPlayer.inventory] : [null, null, null, null];

    // Find first empty inventory slot
    const emptySlotIndex = inventory.findIndex(slot => slot === null);

    if (emptySlotIndex === -1) {
      // No space in inventory - cannot unequip
      await addLog(
        gameState.lobbyCode,
        'action',
        `${currentPlayer.nickname} tried to unequip ${item.name} but inventory is full!`,
        playerId
      );
      return;
    }

    // Move item to inventory
    inventory[emptySlotIndex] = item;

    // Clear equipment slot
    const updatedEquipment = {
      ...equipment,
      [equipmentSlot]: null,
    };

    // Update Firebase with normalized inventory
    await updateGameState(gameState.lobbyCode, {
      [`players/${playerId}/equipment`]: updatedEquipment,
      [`players/${playerId}/inventory`]: normalizeInventory(inventory),
    });

    await addLog(
      gameState.lobbyCode,
      'action',
      `${currentPlayer.nickname} unequipped ${item.name} to inventory`,
      playerId
    );
  };

  /**
   * Handle swapping items between two equipment slots
   * @param fromSlot - Source equipment slot
   * @param toSlot - Target equipment slot
   */
  const handleSwapEquippedItems = async (
    fromSlot: 'holdable1' | 'holdable2' | 'wearable',
    toSlot: 'holdable1' | 'holdable2' | 'wearable'
  ) => {
    const equipment = currentPlayer.equipment || { holdable1: null, holdable2: null, wearable: null };
    const fromItem = equipment[fromSlot];
    const toItem = equipment[toSlot];

    if (!fromItem) return;

    // Validate the item can be equipped in the target slot
    if (!canEquipItemInSlot(fromItem, toSlot)) {
      return;
    }

    // Swap items
    const updatedEquipment = {
      ...equipment,
      [fromSlot]: toItem,
      [toSlot]: fromItem,
    };

    // Update Firebase
    await updateGameState(gameState.lobbyCode, {
      [`players/${playerId}/equipment`]: updatedEquipment,
    });

    await addLog(
      gameState.lobbyCode,
      'action',
      `${currentPlayer.nickname} swapped ${fromItem.name} between equipment slots`,
      playerId
    );
  };

  /**
   * Resolve tile effects based on tile type
   * @param tile - The tile to resolve
   */
  const resolveTileEffect = async (tile: Tile) => {
    const tileType = tile.type;

    // Start tile and Final tile have no draw effects
    if (tileType === 'start' || tileType === 'final' || tileType === 'sanctuary') {
      return;
    }

    // Enemy tiles - draw enemies and start combat
    if (tileType === 'enemy1' || tileType === 'enemy2' || tileType === 'enemy3') {
      const tier = parseInt(tileType.replace('enemy', '')) as 1 | 2 | 3;
      const enemies = await drawEnemiesForTile(gameState.lobbyCode, tier);

      await addLog(
        gameState.lobbyCode,
        'combat',
        `${currentPlayer.nickname} encountered ${enemies.length} enemy/enemies on Tier ${tier} tile!`,
        playerId,
        true
      );

      // Show enemies in reveal modal first
      setRevealedCards(enemies);
      setRevealCardType('enemy');
      setShowCardReveal(true);

      // Store enemies for combat modal
      setCombatEnemies(enemies as Enemy[]);
    }

    // Treasure tiles - draw treasures and add to inventory
    if (tileType === 'treasure1' || tileType === 'treasure2' || tileType === 'treasure3') {
      const tier = parseInt(tileType.replace('treasure', '')) as 1 | 2 | 3;
      const treasures = await drawCards(gameState.lobbyCode, 'treasure', tier, 1);

      await addLog(
        gameState.lobbyCode,
        'action',
        `${currentPlayer.nickname} found a Tier ${tier} treasure!`,
        playerId
      );

      // Show treasure in reveal modal
      setRevealedCards(treasures);
      setRevealCardType('treasure');
      setShowCardReveal(true);

      // Try to add to inventory
      setPendingItems(treasures as Item[]);
    }

    // Luck tile - draw Luck Card
    if (tileType === 'luck') {
      const luckCard = await drawLuckCard(gameState.lobbyCode);

      await addLog(
        gameState.lobbyCode,
        'action',
        `${currentPlayer.nickname} drew a Luck Card: ${luckCard.name}`,
        playerId,
        true
      );

      // Show Luck Card in reveal modal
      setRevealedCards([luckCard]);
      setRevealCardType('luck');
      setShowCardReveal(true);

      // TODO: Apply Luck Card effects (future implementation)
    }
  };

  /**
   * Handle player rolling dice to move
   */
  const handleMove = async () => {
    const roll = rollDice(4); // 4-sided die for movement

    // Calculate new position (can't overshoot final tile at 19)
    let newPosition = currentPlayer.position + roll;
    if (newPosition > 19) {
      newPosition = 19;
    }

    // Update player position and mark action as taken
    await updateGameState(gameState.lobbyCode, {
      [`players/${playerId}/position`]: newPosition,
      [`players/${playerId}/actionTaken`]: 'move',
    });

    // Log the move
    await addLog(
      gameState.lobbyCode,
      'action',
      `${currentPlayer.nickname} rolled ${roll} and moved to tile ${newPosition}`,
      playerId
    );

    // Get the landed tile
    const landedTile = gameState.tiles[newPosition];
    if (!landedTile) return;

    // Check for trap on the landed tile
    if (landedTile.hasTrap && landedTile.trapOwnerId !== playerId) {
      // Check if player is Scout (immune to traps)
      if (currentPlayer.class === 'Scout') {
        await addLog(
          gameState.lobbyCode,
          'action',
          `${currentPlayer.nickname} is a Scout and avoided the trap! 🏹`,
          playerId,
          true
        );
        // Scout continues to tile effect resolution
      } else {
        // Non-Scout triggers trap - skip tile effect
        await addLog(
          gameState.lobbyCode,
          'combat',
          `${currentPlayer.nickname} triggered a trap! They cannot resolve this tile's effect. ⚠️`,
          playerId,
          true
        );

        // Remove trap from tile
        const updatedTiles = [...gameState.tiles];
        updatedTiles[newPosition] = {
          ...landedTile,
          hasTrap: false,
          trapOwnerId: undefined,
        };

        await updateGameState(gameState.lobbyCode, {
          tiles: updatedTiles,
        });

        // Skip tile effect resolution by returning early
        return;
      }
    }

    // Resolve tile effects (only reached if no trap or Scout immunity)
    await resolveTileEffect(landedTile);
  };

  /**
   * Handle player choosing Sleep action
   */
  const handleSleep = async () => {
    // Restore to full HP and mark action as taken
    await updateGameState(gameState.lobbyCode, {
      [`players/${playerId}/hp`]: currentPlayer.maxHp,
      [`players/${playerId}/actionTaken`]: 'sleep',
    });

    await addLog(
      gameState.lobbyCode,
      'action',
      `${currentPlayer.nickname} rested and restored to full HP`,
      playerId
    );

    // TODO: End turn
  };

  /**
   * Handle card reveal modal close
   */
  const handleCardRevealClose = async () => {
    setShowCardReveal(false);

    // If it was an enemy reveal, start combat
    if (revealCardType === 'enemy' && combatEnemies.length > 0) {
      await startCombat(gameState.lobbyCode, playerId, combatEnemies, true);
      setShowCombat(true);
    }

    // If it was a treasure reveal, try to add to inventory
    if (revealCardType === 'treasure' && pendingItems.length > 0) {
      const result = addItemToInventory(pendingItems);

      if (result.overflow.length > 0) {
        // Inventory full - show discard modal
        setShowInventoryFull(true);
      } else {
        // All items fit - update inventory with the modified inventory array
        handleInventoryUpdate(result.inventory);
      }
    }
  };

  /**
   * Handle inventory update after adding items
   * @param inventory - The updated inventory array to save
   */
  const handleInventoryUpdate = async (inventory: (Item | null)[]) => {
    // Normalize before saving to ensure proper slot count
    const normalizedInventory = normalizeInventory(inventory);

    await updateGameState(gameState.lobbyCode, {
      [`players/${playerId}/inventory`]: normalizedInventory,
    });

    await addLog(
      gameState.lobbyCode,
      'action',
      `${currentPlayer.nickname} added item(s) to inventory`,
      playerId
    );

    setPendingItems([]);
  };

  /**
   * Handle inventory full modal - player selected which items to keep
   */
  const handleInventoryDiscard = async (itemsToKeep: (Item | null)[]) => {
    await updateGameState(gameState.lobbyCode, {
      [`players/${playerId}/inventory`]: normalizeInventory(itemsToKeep),
    });

    await addLog(
      gameState.lobbyCode,
      'action',
      `${currentPlayer.nickname} reorganized inventory`,
      playerId
    );

    setShowInventoryFull(false);
    setPendingItems([]);
  };

  /**
   * Handle using a Trap item - place it on current tile
   * @param item - The Trap item being used
   * @param inventoryIndex - The inventory index where the trap is
   */
  const handleUseTrap = async (item: Item, inventoryIndex: number) => {
    if (item.special !== 'trap') return;

    const currentTile = gameState.tiles[currentPlayer.position];

    // Cannot place trap on Start or Sanctuary tiles
    if (currentTile.type === 'start' || currentTile.type === 'sanctuary') {
      await addLog(
        gameState.lobbyCode,
        'action',
        `${currentPlayer.nickname} cannot place a trap on ${currentTile.type} tiles!`,
        playerId
      );
      return;
    }

    // Cannot place trap if tile already has a trap
    if (currentTile.hasTrap) {
      await addLog(
        gameState.lobbyCode,
        'action',
        `${currentPlayer.nickname} cannot place a trap here - there's already one!`,
        playerId
      );
      return;
    }

    // Remove trap from inventory
    const inventory = normalizeInventory(currentPlayer.inventory);
    inventory[inventoryIndex] = null;

    // Update tile with trap
    const updatedTiles = [...gameState.tiles];
    updatedTiles[currentPlayer.position] = {
      ...currentTile,
      hasTrap: true,
      trapOwnerId: playerId,
    };

    // Update Firebase with normalized inventory
    await updateGameState(gameState.lobbyCode, {
      [`players/${playerId}/inventory`]: normalizeInventory(inventory),
      tiles: updatedTiles,
    });

    await addLog(
      gameState.lobbyCode,
      'action',
      `${currentPlayer.nickname} placed a Trap on tile ${currentPlayer.position}! ⚠️`,
      playerId,
      true
    );
  };

  /**
   * Handle attack action in combat
   * @param targetId - Optional target ID for multiple enemies
   */
  const handleCombatAttack = async (targetId?: string) => {
    try {
      await executeCombatRound(gameState.lobbyCode, targetId);
    } catch (error) {
      console.error('Combat round error:', error);
    }
  };

  /**
   * Handle combat retreat
   */
  const handleCombatRetreat = async () => {
    await endCombat(gameState.lobbyCode, true);
    setShowCombat(false);
    setCombatEnemies([]);
  };

  /**
   * Handle combat end (victory or defeat)
   */
  const handleCombatEnd = async () => {
    // Check if it was PvP combat
    const combat = gameState.combat;
    if (combat && combat.defenders.length > 0) {
      const firstDefender = combat.defenders[0];
      const isPvP = 'nickname' in firstDefender;

      if (isPvP) {
        // Check if player won (defender defeated)
        const defenderDefeated = combat.defenders.every(d => d.hp === 0);
        const playerDefeated = currentPlayer.hp === 0;

        if (defenderDefeated && !playerDefeated) {
          // Player won - show looting interface
          const defeatedId = combat.defenders[0].id;
          setDefeatedPlayerId(defeatedId);
          setShowCombat(false);
          setShowLootingModal(true);
          return;
        }
      }
    }

    // PvE combat or player lost - get loot and end
    const loot = await endCombat(gameState.lobbyCode, false);

    setShowCombat(false);
    setCombatEnemies([]);

    // If there's loot, try to add to inventory
    if (loot.length > 0) {
      const result = addItemToInventory(loot);

      if (result.overflow.length > 0) {
        setPendingItems(loot);
        setShowInventoryFull(true);
      } else {
        await handleInventoryUpdate(result.inventory);
      }
    }
  };

  /**
   * Handle looting an unconscious player on the same tile
   * @param targetPlayerId - ID of unconscious player to loot
   */
  const handleLootPlayer = (targetPlayerId: string) => {
    setDefeatedPlayerId(targetPlayerId);
    setShowLootingModal(true);
  };

  /**
   * Handle finishing looting from defeated player
   */
  const handleLootingFinish = async () => {
    // Check if this was post-combat looting (combat state exists) or on-tile looting
    if (gameState.combat && gameState.combat.isActive) {
      // Post-combat looting - end combat
      await endCombat(gameState.lobbyCode, false);
    }
    // For on-tile looting, just close modal (no combat to end)
    setShowLootingModal(false);
    setDefeatedPlayerId(null);
  };

  /**
   * Handle unconscious player's turn - auto-wake them
   */
  const handleUnconsciousPlayerTurn = async () => {
    // Wake up unconscious player - restore HP and set alive
    await updateGameState(gameState.lobbyCode, {
      [`players/${playerId}/hp`]: currentPlayer.maxHp,
      [`players/${playerId}/isAlive`]: true,
      [`players/${playerId}/actionTaken`]: null,
    });

    await addLog(
      gameState.lobbyCode,
      'system',
      `💫 ${currentPlayer.nickname} woke up from unconsciousness with full HP!`,
      playerId,
      true
    );

    // Auto-end turn after waking
    setTimeout(() => {
      handleEndTurn();
    }, 2000); // 2 second delay so players can see the wake-up message
  };

  /**
   * Handle ending the current turn
   */
  const handleEndTurn = async () => {
    // Move to next player in turn order
    const nextIndex = (gameState.currentTurnIndex + 1) % gameState.turnOrder.length;
    const nextPlayerId = gameState.turnOrder[nextIndex];
    const nextPlayer = nextPlayerId ? gameState.players[nextPlayerId] : null;

    await updateGameState(gameState.lobbyCode, {
      currentTurnIndex: nextIndex,
      [`players/${playerId}/actionTaken`]: null,
      [`players/${nextPlayerId}/actionTaken`]: null,
    });

    if (nextPlayer) {
      await addLog(
        gameState.lobbyCode,
        'system',
        `${safeTurnPlayer.nickname}'s turn ended. It's now ${nextPlayer.nickname}'s turn.`
      );
    }
  };

  /**
   * Handle drag start event
   * @param item - The item being dragged
   * @param source - Source location (equipment slot or inventory index)
   */
  const handleDragStart = (item: Item, source: string) => {
    setDraggedItem({ item, source });
  };

  /**
   * Handle drag over event (allow drop)
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
  };

  /**
   * Handle drop on equipment slot
   * @param equipmentSlot - The equipment slot being dropped on
   */
  const handleDropOnEquipment = async (
    e: React.DragEvent,
    equipmentSlot: 'holdable1' | 'holdable2' | 'wearable'
  ) => {
    e.preventDefault();

    if (!draggedItem) return;

    const { item, source } = draggedItem;

    // Determine if dragging from inventory or equipment
    if (source.startsWith('inventory-')) {
      // Dragging from inventory to equipment
      const inventoryIndex = parseInt(source.replace('inventory-', ''));
      await handleEquipItem(item, inventoryIndex, equipmentSlot);
    } else if (source.startsWith('equipment-')) {
      // Dragging from equipment to equipment (swap)
      const fromSlot = source.replace('equipment-', '') as 'holdable1' | 'holdable2' | 'wearable';
      await handleSwapEquippedItems(fromSlot, equipmentSlot);
    }

    setDraggedItem(null);
  };

  /**
   * Handle drop on inventory
   */
  const handleDropOnInventory = async (e: React.DragEvent) => {
    e.preventDefault();

    if (!draggedItem) return;

    const { item, source } = draggedItem;

    // Only handle unequipping from equipment to inventory
    if (source.startsWith('equipment-')) {
      const equipmentSlot = source.replace('equipment-', '') as 'holdable1' | 'holdable2' | 'wearable';
      await handleUnequipItem(item, equipmentSlot);
    }

    setDraggedItem(null);
  };

  /**
   * Render player's equipment
   */
  const renderEquipment = () => {
    const equipment = currentPlayer.equipment || { holdable1: null, holdable2: null, wearable: null };

    return (
      <div className="equipment-section">
        <h3>Equipped Items</h3>
        <div className="equipment-slots">
          {/* Holdable slots */}
          <div
            className={`equipment-slot ${draggedItem && canEquipItemInSlot(draggedItem.item, 'holdable1') ? 'drop-zone-valid' : ''} ${draggedItem && !canEquipItemInSlot(draggedItem.item, 'holdable1') && draggedItem.source !== 'equipment-holdable1' ? 'drop-zone-invalid' : ''}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropOnEquipment(e, 'holdable1')}
          >
            <label>Hand 1</label>
            {equipment.holdable1 ? (
              <div
                draggable
                onDragStart={() => handleDragStart(equipment.holdable1!, 'equipment-holdable1')}
                className="draggable-item"
              >
                <Card
                  card={equipment.holdable1}
                  type="treasure"
                  onClick={() => setSelectedItem(equipment.holdable1)}
                />
              </div>
            ) : (
              <div className="empty-slot">Empty</div>
            )}
          </div>

          <div
            className={`equipment-slot ${draggedItem && canEquipItemInSlot(draggedItem.item, 'holdable2') ? 'drop-zone-valid' : ''} ${draggedItem && !canEquipItemInSlot(draggedItem.item, 'holdable2') && draggedItem.source !== 'equipment-holdable2' ? 'drop-zone-invalid' : ''}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropOnEquipment(e, 'holdable2')}
          >
            <label>Hand 2</label>
            {equipment.holdable2 ? (
              <div
                draggable
                onDragStart={() => handleDragStart(equipment.holdable2!, 'equipment-holdable2')}
                className="draggable-item"
              >
                <Card
                  card={equipment.holdable2}
                  type="treasure"
                  onClick={() => setSelectedItem(equipment.holdable2)}
                />
              </div>
            ) : (
              <div className="empty-slot">Empty</div>
            )}
          </div>

          {/* Wearable slot */}
          <div
            className={`equipment-slot ${draggedItem && canEquipItemInSlot(draggedItem.item, 'wearable') ? 'drop-zone-valid' : ''} ${draggedItem && !canEquipItemInSlot(draggedItem.item, 'wearable') && draggedItem.source !== 'equipment-wearable' ? 'drop-zone-invalid' : ''}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropOnEquipment(e, 'wearable')}
          >
            <label>Armor</label>
            {equipment.wearable ? (
              <div
                draggable
                onDragStart={() => handleDragStart(equipment.wearable!, 'equipment-wearable')}
                className="draggable-item"
              >
                <Card
                  card={equipment.wearable}
                  type="treasure"
                  onClick={() => setSelectedItem(equipment.wearable)}
                />
              </div>
            ) : (
              <div className="empty-slot">Empty</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render player's inventory (backpack)
   */
  const renderInventory = () => {
    // Always normalize inventory to ensure correct slot count
    const inventory = normalizeInventory(currentPlayer.inventory);

    return (
      <div
        className="inventory-section"
        onDragOver={handleDragOver}
        onDrop={handleDropOnInventory}
      >
        <h3>Carried Items</h3>
        <div className="inventory-slots">
          {inventory.map((item, index) => (
            <div key={index} className="inventory-slot">
              {item ? (
                <div className="inventory-item-wrapper">
                  <div
                    draggable
                    onDragStart={() => handleDragStart(item, `inventory-${index}`)}
                    className="draggable-item"
                  >
                    <Card
                      card={item}
                      type="treasure"
                      onClick={() => setSelectedItem(item)}
                    />
                  </div>

                  {/* Use button for trap items (only on player's turn) */}
                  {item.special === 'trap' && isMyTurn && (
                    <button
                      className="use-item-btn"
                      onClick={() => handleUseTrap(item, index)}
                      title="Place trap on current tile"
                    >
                      Place Trap
                    </button>
                  )}
                </div>
              ) : (
                <div className="empty-slot">Empty</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  /**
   * Render player stats
   */
  const renderStats = () => {
    // Calculate total attack and defense from equipment
    let totalAttack = 1; // Base attack
    let totalDefense = 1; // Base defense

    const equipment = currentPlayer.equipment || { holdable1: null, holdable2: null, wearable: null };

    if (equipment.holdable1) {
      totalAttack += equipment.holdable1.attackBonus || 0;
      totalDefense += equipment.holdable1.defenseBonus || 0;
    }
    if (equipment.holdable2) {
      totalAttack += equipment.holdable2.attackBonus || 0;
      totalDefense += equipment.holdable2.defenseBonus || 0;
    }
    if (equipment.wearable) {
      totalAttack += equipment.wearable.attackBonus || 0;
      totalDefense += equipment.wearable.defenseBonus || 0;
    }

    return (
      <div className="player-stats">
        <div className="stat">
          <span className="stat-label">HP:</span>
          <span className="stat-value">
            {currentPlayer.hp}/{currentPlayer.maxHp}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">⚔️ Attack:</span>
          <span className="stat-value">{totalAttack}</span>
        </div>
        <div className="stat">
          <span className="stat-label">🛡️ Defense:</span>
          <span className="stat-value">{totalDefense}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Class:</span>
          <span className="stat-value">{currentPlayer.class}</span>
        </div>
      </div>
    );
  };

  /**
   * Handle duel initiation with another player
   * @param targetPlayerId - ID of player to duel
   */
  const handleDuel = async (targetPlayerId: string) => {
    const targetPlayer = gameState.players[targetPlayerId];

    // Check sanctuary tiles
    const currentTile = gameState.tiles[currentPlayer.position];
    if (currentTile.type === 'sanctuary') {
      alert('Cannot duel on Sanctuary tiles!');
      return;
    }

    // Start PvP combat (canRetreat = false for duels)
    await startCombat(gameState.lobbyCode, playerId, [targetPlayer], false);
    await updateGameState(gameState.lobbyCode, {
      [`players/${playerId}/actionTaken`]: 'duel',
    });
    setShowDuelModal(false);
    setShowCombat(true);
  };

  /**
   * Get alive players on the same tile as current player (excluding self)
   * Used for dueling
   */
  const getPlayersOnSameTile = (): typeof gameState.players => {
    const playersHere: typeof gameState.players = {};
    Object.entries(gameState.players).forEach(([pid, player]) => {
      if (pid !== playerId && player.position === currentPlayer.position && player.isAlive) {
        playersHere[pid] = player;
      }
    });
    return playersHere;
  };

  /**
   * Get unconscious players on the same tile as current player (excluding self)
   * Used for looting
   */
  const getUnconsciousPlayersOnSameTile = (): typeof gameState.players => {
    const unconsciousPlayers: typeof gameState.players = {};
    Object.entries(gameState.players).forEach(([pid, player]) => {
      if (pid !== playerId && player.position === currentPlayer.position && !player.isAlive) {
        unconsciousPlayers[pid] = player;
      }
    });
    return unconsciousPlayers;
  };

  /**
   * Render action buttons for current player's turn
   */
  const renderActions = () => {
    if (!isMyTurn) {
      return (
        <div className="turn-info">
          <p>⏳ Waiting for {safeTurnPlayer.nickname}'s turn...</p>
        </div>
      );
    }

    // If player is unconscious, show waking up message
    if (!currentPlayer.isAlive) {
      return (
        <div className="turn-info unconscious-wake">
          <h3>💫 Waking Up...</h3>
          <p>You are regaining consciousness and will be restored to full HP!</p>
        </div>
      );
    }

    const hasActed = currentPlayer.actionTaken !== null && currentPlayer.actionTaken !== undefined;
    const playersOnSameTile = getPlayersOnSameTile();
    const unconsciousPlayersOnTile = getUnconsciousPlayersOnSameTile();
    const canDuel = Object.keys(playersOnSameTile).length > 0 && !hasActed;
    const canLoot = Object.keys(unconsciousPlayersOnTile).length > 0;
    const currentTile = gameState.tiles[currentPlayer.position];
    const isSanctuary = currentTile.type === 'sanctuary';

    return (
      <div className="action-buttons">
        <h3>Your Turn!</h3>
        <div className="actions-grid">
          <Button onClick={handleMove} variant="primary" disabled={hasActed}>
            🎲 Roll & Move
          </Button>
          <Button onClick={handleSleep} variant="secondary" disabled={hasActed}>
            😴 Sleep (Restore HP)
          </Button>
          <Button
            onClick={() => setShowDuelModal(true)}
            variant="secondary"
            disabled={!canDuel || isSanctuary}
          >
            ⚔️ Duel {isSanctuary ? '(Sanctuary)' : canDuel ? '' : '(No players)'}
          </Button>
          {canLoot && (
            <Button
              onClick={() => {
                const firstUnconsciousId = Object.keys(unconsciousPlayersOnTile)[0];
                handleLootPlayer(firstUnconsciousId);
              }}
              variant="secondary"
            >
              💰 Loot Unconscious Player
            </Button>
          )}
          <Button onClick={() => {}} variant="secondary" disabled>
            🤝 Trade (Coming soon)
          </Button>
        </div>
        <div className="end-turn-section">
          <Button onClick={handleEndTurn} variant="danger" fullWidth>
            End Turn
          </Button>
        </div>
      </div>
    );
  };

  /**
   * Render game logs
   */
  const renderLogs = () => {
    // Get last 20 logs, most recent first
    const recentLogs = [...gameState.logs].reverse().slice(0, 20);

    return (
      <div className="logs-section">
        <div className="logs-header">
          <button
            className={activeTab === 'logs' ? 'active' : ''}
            onClick={() => setActiveTab('logs')}
          >
            📜 Event Logs
          </button>
          <button
            className={activeTab === 'chat' ? 'active' : ''}
            onClick={() => setActiveTab('chat')}
          >
            💬 Chat (Coming soon)
          </button>
        </div>
        <div className="logs-content">
          {activeTab === 'logs' && (
            <div className="event-logs">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className={`log-entry log-${log.type} ${log.isImportant ? 'important' : ''}`}
                >
                  <span className="log-time">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'chat' && (
            <div className="chat-placeholder">
              <p>Chat functionality coming soon...</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Check for winner
  if (gameState.winnerId) {
    const winner = gameState.players[gameState.winnerId];
    if (winner) {
      return (
        <div className="screen game-screen">
          <div className="victory-screen">
            <h1>👑 {winner.nickname} Wins!</h1>
            <p>Congratulations on reaching the mountain peak!</p>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="screen game-screen">
      {/* Game board */}
      <div className="game-board-section">
        <Board
          tiles={gameState.tiles}
          players={gameState.players}
          currentPlayerId={currentTurnPlayerId}
        />
      </div>

      {/* Side panel */}
      <div className="game-side-panel">
        {/* Player info and stats */}
        <div className="player-info-section">
          <h2>{currentPlayer.nickname}</h2>
          {renderStats()}
        </div>

        {/* Equipment and inventory */}
        {renderEquipment()}
        {renderInventory()}

        {/* Turn actions */}
        {renderActions()}
      </div>

      {/* Logs panel */}
      <div className="game-logs-panel">
        <button className="logs-toggle" onClick={() => setShowLogs(!showLogs)}>
          {showLogs ? 'Hide Logs' : 'Show Logs'}
        </button>
        {showLogs && renderLogs()}
      </div>

      {/* Item detail modal */}
      {selectedItem && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedItem(null)}
          title={selectedItem.name}
        >
          <Card card={selectedItem} type="treasure" />
        </Modal>
      )}

      {/* Combat modal (if active) */}
      {gameState.combat && gameState.combat.isActive && (
        <Modal
          isOpen={true}
          onClose={() => {}}
          title="⚔️ Combat"
          canClose={false}
          size="large"
        >
          <div className="combat-modal">
            <p>Combat system coming soon...</p>
            <p>Fighting: {gameState.combat.defenderIds.join(', ')}</p>
          </div>
        </Modal>
      )}

      {/* Trade modal (if active) */}
      {gameState.trade && gameState.trade.isActive && (
        <Modal
          isOpen={true}
          onClose={() => {}}
          title="🤝 Trade"
          canClose={false}
          size="large"
        >
          <div className="trade-modal">
            <p>Trading system coming soon...</p>
          </div>
        </Modal>
      )}

      {/* Card Reveal Modal */}
      <CardRevealModal
        isOpen={showCardReveal}
        cards={revealedCards}
        cardType={revealCardType}
        onClose={handleCardRevealClose}
      />

      {/* Combat Modal */}
      <CombatModal
        isOpen={showCombat}
        gameState={gameState}
        onAttack={handleCombatAttack}
        onRetreat={handleCombatRetreat}
        onEndCombat={handleCombatEnd}
      />

      {/* Inventory Full Modal */}
      <InventoryFullModal
        isOpen={showInventoryFull}
        currentItems={currentPlayer.inventory || []}
        newItems={pendingItems}
        onDiscard={handleInventoryDiscard}
        maxSlots={currentPlayer.inventory ? currentPlayer.inventory.length : 4}
      />

      {/* Duel Target Selection Modal */}
      <Modal
        isOpen={showDuelModal}
        onClose={() => setShowDuelModal(false)}
        title="⚔️ Choose Duel Target"
        size="medium"
      >
        <div className="duel-target-selection">
          <p>Select a player to duel:</p>
          <div className="duel-targets">
            {Object.entries(getPlayersOnSameTile()).map(([pid, player]) => (
              <Button
                key={pid}
                onClick={() => handleDuel(pid)}
                variant="danger"
                fullWidth
              >
                ⚔️ Duel {player.nickname} (HP: {player.hp}/{player.maxHp})
              </Button>
            ))}
          </div>
          {Object.keys(getPlayersOnSameTile()).length === 0 && (
            <p>No players on this tile to duel.</p>
          )}
        </div>
      </Modal>

      {/* PvP Looting Modal */}
      {showLootingModal && defeatedPlayerId && gameState.players[defeatedPlayerId] && (
        <Modal
          isOpen={showLootingModal}
          onClose={handleLootingFinish}
          title={gameState.combat?.isActive ? "🏆 Victory! Loot the Defeated" : "💰 Loot Unconscious Player"}
          size="large"
          canClose={true}
        >
          <div className="looting-modal">
            <p className="looting-message">
              {gameState.combat?.isActive
                ? `You defeated ${gameState.players[defeatedPlayerId]?.nickname}! You may take any items from their inventory or equipment.`
                : `${gameState.players[defeatedPlayerId]?.nickname} is unconscious! You may take any items from their inventory or equipment.`
              }
            </p>
            <div className="looting-interface">
              <div className="looting-section">
                <h4>🎒 Defeated Player's Inventory</h4>
                <div className="looting-items">
                  <div className="looting-equipment">
                    <h5>Equipped:</h5>
                    {gameState.players[defeatedPlayerId].equipment?.holdable1 && (
                      <div className="loot-item">
                        <Card
                          card={gameState.players[defeatedPlayerId].equipment?.holdable1!}
                          type="treasure"
                        />
                        <Button
                          onClick={() => {
                            const item = gameState.players[defeatedPlayerId].equipment?.holdable1;
                            if (item) {
                              const result = addItemToInventory([item]);
                              if (result.overflow.length === 0) {
                                handleInventoryUpdate(result.inventory);
                                updateGameState(gameState.lobbyCode, {
                                  [`players/${defeatedPlayerId}/equipment/holdable1`]: null,
                                });
                              }
                            }
                          }}
                          variant="primary"
                        >
                          Take
                        </Button>
                      </div>
                    )}
                    {gameState.players[defeatedPlayerId].equipment?.holdable2 && (
                      <div className="loot-item">
                        <Card
                          card={gameState.players[defeatedPlayerId].equipment?.holdable2!}
                          type="treasure"
                        />
                        <Button
                          onClick={() => {
                            const item = gameState.players[defeatedPlayerId].equipment?.holdable2;
                            if (item) {
                              const result = addItemToInventory([item]);
                              if (result.overflow.length === 0) {
                                handleInventoryUpdate(result.inventory);
                                updateGameState(gameState.lobbyCode, {
                                  [`players/${defeatedPlayerId}/equipment/holdable2`]: null,
                                });
                              }
                            }
                          }}
                          variant="primary"
                        >
                          Take
                        </Button>
                      </div>
                    )}
                    {gameState.players[defeatedPlayerId].equipment?.wearable && (
                      <div className="loot-item">
                        <Card
                          card={gameState.players[defeatedPlayerId].equipment?.wearable!}
                          type="treasure"
                        />
                        <Button
                          onClick={() => {
                            const item = gameState.players[defeatedPlayerId].equipment?.wearable;
                            if (item) {
                              const result = addItemToInventory([item]);
                              if (result.overflow.length === 0) {
                                handleInventoryUpdate(result.inventory);
                                updateGameState(gameState.lobbyCode, {
                                  [`players/${defeatedPlayerId}/equipment/wearable`]: null,
                                });
                              }
                            }
                          }}
                          variant="primary"
                        >
                          Take
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="looting-carried">
                    <h5>Carried:</h5>
                    {gameState.players[defeatedPlayerId].inventory?.map((item, index) => {
                      if (!item) return null;
                      return (
                        <div key={index} className="loot-item">
                          <Card card={item} type="treasure" />
                          <Button
                            onClick={() => {
                              const result = addItemToInventory([item]);
                              if (result.overflow.length === 0) {
                                handleInventoryUpdate(result.inventory);
                                const newInventory = [
                                  ...gameState.players[defeatedPlayerId].inventory,
                                ];
                                newInventory[index] = null;
                                updateGameState(gameState.lobbyCode, {
                                  [`players/${defeatedPlayerId}/inventory`]: newInventory,
                                });
                              }
                            }}
                            variant="primary"
                          >
                            Take
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="looting-actions">
              <Button onClick={handleLootingFinish} variant="primary" fullWidth>
                Finish Looting
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
