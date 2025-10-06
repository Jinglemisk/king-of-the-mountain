/**
 * Game Screen
 * Main gameplay screen with board, inventory, combat, and turn management
 */

import { useState, useEffect } from 'react';
import type { GameState, Item, Enemy, LuckCard } from '../types';
import { Board } from '../components/game/Board';
import { Card } from '../components/game/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { CardRevealModal } from '../components/game/CardRevealModal';
import { CombatModal } from '../components/game/CombatModal';
import { InventoryFullModal } from '../components/game/InventoryFullModal';
import { JinnThiefModal } from '../components/game/JinnThiefModal';
import { updateGameState, addLog } from '../state/gameSlice';
import { shouldSkipTurn } from '../utils/tempEffects';

// Import components
import { PlayerStats } from './GameScreen/components/PlayerStats';
import { GameLog } from './GameScreen/components/GameLog';
import { EquipmentSlots } from './GameScreen/components/EquipmentSlots';
import { InventoryGrid } from './GameScreen/components/InventoryGrid';
import { ActionButtons } from './GameScreen/components/ActionButtons';

// Import hooks
import { usePlayerUtils } from './GameScreen/hooks/usePlayerUtils';
import { useInventoryManagement } from './GameScreen/hooks/useInventoryManagement';
import { useEquipmentManagement } from './GameScreen/hooks/useEquipmentManagement';
import { useDragAndDrop } from './GameScreen/hooks/useDragAndDrop';
import { useTurnActions } from './GameScreen/hooks/useTurnActions';
import { useCombat } from './GameScreen/hooks/useCombat';

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
  const [revealCardType, setRevealCardType] = useState<'treasure' | 'enemy' | 'luck' | null>(null);
  const [showCardReveal, setShowCardReveal] = useState(false);
  const [showCombat, setShowCombat] = useState(false);
  const [combatEnemies, setCombatEnemies] = useState<Enemy[]>([]);
  const [showInventoryFull, setShowInventoryFull] = useState(false);
  const [pendingItems, setPendingItems] = useState<Item[]>([]);

  // State for duel
  const [showDuelModal, setShowDuelModal] = useState(false);

  // State for PvP looting
  const [showLootingModal, setShowLootingModal] = useState(false);
  const [defeatedPlayerId, setDefeatedPlayerId] = useState<string | null>(null);

  // State for Jinn Thief item selection
  const [showJinnThiefModal, setShowJinnThiefModal] = useState(false);

  // State for Instinct activation
  const [showInstinctModal, setShowInstinctModal] = useState(false);
  const [instinctPosition, setInstinctPosition] = useState<number>(0);

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

  // Initialize hooks
  const { draggedItem, setDraggedItem, handleDragStart, handleDragOver } = useDragAndDrop();

  const playerUtils = usePlayerUtils({ gameState, playerId, currentPlayer });

  // Equipment management hook
  const equipmentManagement = useEquipmentManagement({
    gameState,
    playerId,
    currentPlayer,
    draggedItem,
    setDraggedItem,
  });

  // Inventory management hook (needs handleUnequipItem from equipment)
  const inventoryManagement = useInventoryManagement({
    gameState,
    playerId,
    currentPlayer,
    setPendingItems,
    setShowInventoryFull,
    draggedItem,
    setDraggedItem,
    handleUnequipItem: equipmentManagement.handleUnequipItem,
  });

  // Turn actions hook - needs to pass handleEndTurn but also get it back
  // We'll use a wrapper to handle this circular dependency
  const turnActionsRef = { current: { handleEndTurn: async () => {} } };

  const turnActions = useTurnActions({
    gameState,
    playerId,
    currentPlayer,
    safeTurnPlayer,
    setRevealedCards,
    setRevealCardType,
    setShowCardReveal,
    setCombatEnemies,
    setShowCombat,
    setShowDuelModal,
    setDefeatedPlayerId,
    setShowLootingModal,
    setPendingItems,
    setShowJinnThiefModal,
    setShowInstinctModal,
    setInstinctPosition,
    handleEndTurn: () => turnActionsRef.current.handleEndTurn(),
  });

  // Update the ref with the actual handleEndTurn
  turnActionsRef.current.handleEndTurn = turnActions.handleEndTurn;

  // Combat hook
  const combat = useCombat({
    gameState,
    playerId,
    currentPlayer,
    setShowCombat,
    setCombatEnemies,
    setDefeatedPlayerId,
    setShowLootingModal,
    setShowCardReveal,
    setPendingItems,
    setShowInventoryFull,
    revealCardType,
    combatEnemies,
    pendingItems,
    addItemToInventory: inventoryManagement.addItemToInventory,
    handleInventoryUpdate: inventoryManagement.handleInventoryUpdate,
  });

  /**
   * Auto-wake unconscious players when their turn starts
   */
  useEffect(() => {
    // Check if it's my turn and I'm unconscious
    if (isMyTurn && !currentPlayer.isAlive && gameState.status === 'active') {
      // Trigger wake-up after a short delay
      const timer = setTimeout(() => {
        turnActions.handleUnconsciousPlayerTurn();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isMyTurn, currentPlayer.isAlive, gameState.status]);

  /**
   * Auto-skip turn if player has skip_turn temp effect
   */
  useEffect(() => {
    // Check if it's my turn, I'm alive, and I should skip
    if (isMyTurn && currentPlayer.isAlive && shouldSkipTurn(currentPlayer) && gameState.status === 'active') {
      // Log the skip message
      addLog(
        gameState.lobbyCode,
        'action',
        `😴 ${currentPlayer.nickname}'s turn was skipped!`,
        playerId,
        true
      );

      // Auto-end turn after a short delay so player sees the message
      const timer = setTimeout(() => {
        turnActions.handleEndTurn();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isMyTurn, currentPlayer.isAlive, currentPlayer.tempEffects, gameState.status]);

  /**
   * Clear invisibility at turn start (Fairy Dust effect)
   */
  useEffect(() => {
    // If it's my turn and I'm invisible, clear invisibility
    if (isMyTurn && currentPlayer.isInvisible && gameState.status === 'active') {
      updateGameState(gameState.lobbyCode, {
        [`players/${playerId}/isInvisible`]: false,
      });

      addLog(
        gameState.lobbyCode,
        'action',
        `✨ ${currentPlayer.nickname}'s invisibility wore off!`,
        playerId
      );
    }
  }, [isMyTurn, currentPlayer.isInvisible, gameState.status]);

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
          <PlayerStats player={currentPlayer} />
        </div>

        {/* Equipment and inventory */}
        <EquipmentSlots
          equipment={currentPlayer.equipment || { holdable1: null, holdable2: null, wearable: null }}
          draggedItem={draggedItem}
          canEquipItemInSlot={equipmentManagement.canEquipItemInSlot}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={equipmentManagement.handleDropOnEquipment}
          onItemClick={setSelectedItem}
        />

        <InventoryGrid
          player={currentPlayer}
          isMyTurn={isMyTurn}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDropOnInventory={inventoryManagement.handleDropOnInventory}
          onItemClick={setSelectedItem}
          onUseTrap={inventoryManagement.handleUseTrap}
        />

        {/* Turn actions */}
        <ActionButtons
          isMyTurn={isMyTurn}
          currentPlayer={currentPlayer}
          turnPlayerNickname={safeTurnPlayer.nickname}
          playersOnSameTile={playerUtils.getPlayersOnSameTile()}
          unconsciousPlayersOnTile={playerUtils.getUnconsciousPlayersOnSameTile()}
          isSanctuary={playerUtils.getCurrentTile()?.type === 'sanctuary'}
          hasAmbush={turnActions.hasAmbush()}
          onMove={turnActions.handleMove}
          onSleep={turnActions.handleSleep}
          onShowDuelModal={() => setShowDuelModal(true)}
          onLootPlayer={turnActions.handleLootPlayer}
          onPlaceAmbush={turnActions.handlePlaceAmbush}
          onEndTurn={turnActions.handleEndTurn}
        />
      </div>

      {/* Logs panel */}
      <div className="game-logs-panel">
        <button className="logs-toggle" onClick={() => setShowLogs(!showLogs)}>
          {showLogs ? 'Hide Logs' : 'Show Logs'}
        </button>
        {showLogs && (
          <GameLog
            logs={gameState.logs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        )}
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
        cardType={revealCardType || 'treasure'}
        onClose={combat.handleCardRevealClose}
      />

      {/* Combat Modal */}
      <CombatModal
        isOpen={showCombat}
        gameState={gameState}
        onAttack={combat.handleCombatAttack}
        onRetreat={combat.handleCombatRetreat}
        onEndCombat={combat.handleCombatEnd}
      />

      {/* Inventory Full Modal */}
      <InventoryFullModal
        isOpen={showInventoryFull}
        currentItems={currentPlayer.inventory || []}
        newItems={pendingItems}
        onDiscard={inventoryManagement.handleInventoryDiscard}
        maxSlots={currentPlayer.inventory ? currentPlayer.inventory.length : 4}
      />

      {/* Jinn Thief Item Selection Modal */}
      <JinnThiefModal
        isOpen={showJinnThiefModal}
        player={currentPlayer}
        onSelectItem={turnActions.handleJinnThiefItemSelection}
      />

      {/* Instinct Activation Modal */}
      <Modal
        isOpen={showInstinctModal}
        onClose={() => {}}
        title="🃏 Use Instinct Card?"
        size="medium"
        canClose={false}
      >
        <div className="instinct-modal">
          <p>You have an Instinct card! Adjust your position by +1 or -1 tile.</p>
          <p>Current position: {instinctPosition}</p>
          <div className="instinct-actions">
            <Button
              onClick={() => turnActions.handleInstinctChoice(-1)}
              variant="primary"
              fullWidth
              disabled={instinctPosition === 0}
            >
              Move Back (-1 tile)
            </Button>
            <Button
              onClick={() => turnActions.handleInstinctChoice(1)}
              variant="primary"
              fullWidth
              disabled={instinctPosition === 19}
            >
              Move Forward (+1 tile)
            </Button>
            <Button
              onClick={() => turnActions.handleInstinctChoice(0)}
              variant="secondary"
              fullWidth
            >
              Skip (Don't Use)
            </Button>
          </div>
        </div>
      </Modal>

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
            {Object.entries(playerUtils.getPlayersOnSameTile()).map(([pid, player]) => (
              <Button
                key={pid}
                onClick={() => turnActions.handleDuel(pid)}
                variant="danger"
                fullWidth
              >
                ⚔️ Duel {player.nickname} (HP: {player.hp}/{player.maxHp})
              </Button>
            ))}
          </div>
          {Object.keys(playerUtils.getPlayersOnSameTile()).length === 0 && (
            <p>No players on this tile to duel.</p>
          )}
        </div>
      </Modal>

      {/* PvP Looting Modal */}
      {showLootingModal && defeatedPlayerId && gameState.players[defeatedPlayerId] && (
        <Modal
          isOpen={showLootingModal}
          onClose={combat.handleLootingFinish}
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
                              const result = inventoryManagement.addItemToInventory([item]);
                              if (result.overflow.length === 0) {
                                inventoryManagement.handleInventoryUpdate(result.inventory);
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
                              const result = inventoryManagement.addItemToInventory([item]);
                              if (result.overflow.length === 0) {
                                inventoryManagement.handleInventoryUpdate(result.inventory);
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
                              const result = inventoryManagement.addItemToInventory([item]);
                              if (result.overflow.length === 0) {
                                inventoryManagement.handleInventoryUpdate(result.inventory);
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
                              const result = inventoryManagement.addItemToInventory([item]);
                              if (result.overflow.length === 0) {
                                inventoryManagement.handleInventoryUpdate(result.inventory);
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
              <Button onClick={combat.handleLootingFinish} variant="primary" fullWidth>
                Finish Looting
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
