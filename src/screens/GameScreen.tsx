/**
 * Game Screen
 * Main gameplay screen with board, inventory, combat, and turn management
 */

import { useState } from 'react';
import type { GameState, Item } from '../types';
import { Board } from '../components/game/Board';
import { Card } from '../components/game/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { updateGameState, addLog, rollDice } from '../state/gameSlice';

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

  // Get current player and turn info
  const currentPlayer = gameState.players[playerId];
  const currentTurnPlayerId = gameState.turnOrder[gameState.currentTurnIndex];
  const isMyTurn = currentTurnPlayerId === playerId;
  const currentTurnPlayer = currentTurnPlayerId ? gameState.players[currentTurnPlayerId] : null;

  // Safety check - if player data is missing, show loading
  if (!currentPlayer || !currentTurnPlayer) {
    return (
      <div className="screen loading-screen">
        <p>Loading player data...</p>
      </div>
    );
  }

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

    // TODO: Resolve tile effects (enemy, treasure, luck, etc.)
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
        `${currentTurnPlayer.nickname}'s turn ended. It's now ${nextPlayer.nickname}'s turn.`
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
          <p>⏳ Waiting for {currentTurnPlayer.nickname}'s turn...</p>
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
    </div>
  );
}
