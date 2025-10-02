/**
 * Game Screen
 * Main gameplay screen with board, inventory, combat, and turn management
 */

import { useState } from 'react';
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
   * Helper: Add items to first available inventory slots
   * @param items - Items to add
   * @returns Object with items that fit and items that overflow
   */
  const addItemToInventory = (items: Item[]): { added: Item[]; overflow: Item[] } => {
    // Get inventory, ensure it's properly initialized with null slots
    let inventory = currentPlayer.inventory ? [...currentPlayer.inventory] : [null, null, null, null];

    // If inventory is empty array, initialize it with null slots
    if (inventory.length === 0) {
      inventory = [null, null, null, null];
    }

    const added: Item[] = [];
    const overflow: Item[] = [];

    for (const item of items) {
      // Find first null/empty slot
      const emptyIndex = inventory.findIndex(slot => slot === null);
      if (emptyIndex !== -1) {
        inventory[emptyIndex] = item;
        added.push(item);
      } else {
        // Check if we can expand inventory (shouldn't normally happen)
        if (inventory.length < (currentPlayer.class === 'Porter' ? 5 : 4)) {
          inventory.push(item);
          added.push(item);
        } else {
          overflow.push(item);
        }
      }
    }

    return { added, overflow };
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

    // Resolve tile effects
    const landedTile = gameState.tiles[newPosition];
    if (landedTile) {
      await resolveTileEffect(landedTile);
    }
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
  const handleCardRevealClose = () => {
    setShowCardReveal(false);

    // If it was an enemy reveal, show combat modal
    if (revealCardType === 'enemy' && combatEnemies.length > 0) {
      setShowCombat(true);
    }

    // If it was a treasure reveal, try to add to inventory
    if (revealCardType === 'treasure' && pendingItems.length > 0) {
      const result = addItemToInventory(pendingItems);

      if (result.overflow.length > 0) {
        // Inventory full - show discard modal
        setShowInventoryFull(true);
      } else {
        // All items fit - update inventory
        handleInventoryUpdate(result.added);
      }
    }
  };

  /**
   * Handle inventory update after adding items
   */
  const handleInventoryUpdate = async (items: Item[]) => {
    // Get inventory, ensure it's properly initialized
    let inventory = currentPlayer.inventory ? [...currentPlayer.inventory] : [null, null, null, null];

    // If inventory is empty array, initialize it with null slots
    if (inventory.length === 0) {
      inventory = [null, null, null, null];
    }

    for (const item of items) {
      const emptyIndex = inventory.findIndex(slot => slot === null);
      if (emptyIndex !== -1) {
        inventory[emptyIndex] = item;
      }
    }

    await updateGameState(gameState.lobbyCode, {
      [`players/${playerId}/inventory`]: inventory,
    });

    await addLog(
      gameState.lobbyCode,
      'action',
      `${currentPlayer.nickname} added ${items.length} item(s) to inventory`,
      playerId
    );

    setPendingItems([]);
  };

  /**
   * Handle inventory full modal - player selected which items to keep
   */
  const handleInventoryDiscard = async (itemsToKeep: (Item | null)[]) => {
    await updateGameState(gameState.lobbyCode, {
      [`players/${playerId}/inventory`]: itemsToKeep,
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
   * Handle combat retreat
   */
  const handleCombatRetreat = async () => {
    // Move back 6 tiles
    const newPosition = Math.max(0, currentPlayer.position - 6);

    await updateGameState(gameState.lobbyCode, {
      [`players/${playerId}/position`]: newPosition,
    });

    await addLog(
      gameState.lobbyCode,
      'combat',
      `${currentPlayer.nickname} retreated to tile ${newPosition}`,
      playerId
    );

    setShowCombat(false);
    setCombatEnemies([]);
  };

  /**
   * Handle combat close (temporary until combat is implemented)
   */
  const handleCombatClose = () => {
    setShowCombat(false);
    setCombatEnemies([]);
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
   * Render player's equipment
   */
  const renderEquipment = () => {
    const equipment = currentPlayer.equipment || { holdable1: null, holdable2: null, wearable: null };

    return (
      <div className="equipment-section">
        <h3>Equipped Items</h3>
        <div className="equipment-slots">
          {/* Holdable slots */}
          <div className="equipment-slot">
            <label>Hand 1</label>
            {equipment.holdable1 ? (
              <Card
                card={equipment.holdable1}
                type="treasure"
                onClick={() => setSelectedItem(equipment.holdable1)}
              />
            ) : (
              <div className="empty-slot">Empty</div>
            )}
          </div>

          <div className="equipment-slot">
            <label>Hand 2</label>
            {equipment.holdable2 ? (
              <Card
                card={equipment.holdable2}
                type="treasure"
                onClick={() => setSelectedItem(equipment.holdable2)}
              />
            ) : (
              <div className="empty-slot">Empty</div>
            )}
          </div>

          {/* Wearable slot */}
          <div className="equipment-slot">
            <label>Armor</label>
            {equipment.wearable ? (
              <Card
                card={equipment.wearable}
                type="treasure"
                onClick={() => setSelectedItem(equipment.wearable)}
              />
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
    const inventory = currentPlayer.inventory || [null, null, null, null];

    return (
      <div className="inventory-section">
        <h3>Carried Items</h3>
        <div className="inventory-slots">
          {inventory.map((item, index) => (
            <div key={index} className="inventory-slot">
              {item ? (
                <Card
                  card={item}
                  type="treasure"
                  onClick={() => setSelectedItem(item)}
                />
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

    const hasActed = currentPlayer.actionTaken !== null && currentPlayer.actionTaken !== undefined;

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
          <Button onClick={() => {}} variant="secondary" disabled>
            ⚔️ Duel (Coming soon)
          </Button>
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
        player={currentPlayer}
        opponents={combatEnemies}
        onRetreat={handleCombatRetreat}
        onClose={handleCombatClose}
      />

      {/* Inventory Full Modal */}
      <InventoryFullModal
        isOpen={showInventoryFull}
        currentItems={currentPlayer.inventory || []}
        newItems={pendingItems}
        onDiscard={handleInventoryDiscard}
        maxSlots={currentPlayer.inventory ? currentPlayer.inventory.length : 4}
      />
    </div>
  );
}
