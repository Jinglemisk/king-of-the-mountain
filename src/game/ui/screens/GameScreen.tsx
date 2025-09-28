import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { BoardCanvas } from '../components/BoardCanvas';
import { PlayerHUD } from '../components/PlayerHUD';
import { InventoryPanel } from '../components/InventoryPanel';
import { TurnControls } from '../components/TurnControls';
import { TilePanel } from '../components/TilePanel';
import { ChatPanel } from '../components/ChatPanel';
import { LogPanel } from '../components/LogPanel';
import { CombatPanel } from '../components/CombatPanel';
import { DuelDialog } from '../dialogs/DuelDialog';
import { DrawDialog } from '../dialogs/DrawDialog';
import { CapacityDialog } from '../dialogs/CapacityDialog';
import { BranchChoicePrompt } from '../dialogs/BranchChoicePrompt';
import { subscribeToGame } from '../../net/gameService';
import { getSyncManager } from '../../net/syncManager';

export function GameScreen() {
  const { gameId } = useParams();
  const {
    gameState,
    myUid,
    ui,
    setGameState,
    getMyPlayer,
    isMyTurn,
    getCurrentPhase
  } = useGameStore();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId || !myUid) return;

    // Initialize syncManager with the game
    const syncManager = getSyncManager();
    syncManager.subscribeToGame(gameId);

    // Subscribe to game updates for the UI
    const unsubscribe = subscribeToGame(gameId, (newGameState) => {
      setGameState(newGameState);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      syncManager.unsubscribeFromGame();
    };
  }, [gameId, myUid, setGameState]);

  const myPlayer = getMyPlayer();
  const phase = getCurrentPhase();

  if (loading || !gameState) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-2xl text-gray-600 dark:text-gray-400 animate-pulse">
          Loading game...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Left Side - Board and Log */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Board */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <BoardCanvas />
        </div>

        {/* Game Log - Below Board */}
        <div className="h-32 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 overflow-hidden">
          <LogPanel />
        </div>

        {/* Bottom Controls */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3">
          <TurnControls />
        </div>
      </div>

      {/* Right Side Panel */}
      <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
        {/* Player HUD */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <PlayerHUD />
        </div>

        {/* Inventory */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <InventoryPanel />
        </div>

        {/* Current Tile Info */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <TilePanel />
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col min-h-0">
          <ChatPanel />
        </div>
      </div>

      {/* Dialogs / Overlays */}
      {ui.activeDialog === 'combat' && gameState.combat && (
        <CombatPanel combat={gameState.combat} />
      )}

      {ui.activeDialog === 'duel' && gameState.duel && (
        <DuelDialog duel={gameState.duel} />
      )}

      {ui.activeDialog === 'treasure' && ui.pendingCard && (
        <DrawDialog type="treasure" card={ui.pendingCard} />
      )}

      {ui.activeDialog === 'chance' && ui.pendingCard && (
        <DrawDialog type="chance" card={ui.pendingCard} />
      )}

      {ui.activeDialog === 'capacity' && (
        <CapacityDialog />
      )}

      {ui.activeDialog === 'branch' && ui.branchOptions && (
        <BranchChoicePrompt
          fromTileId={myPlayer?.position || 0}
          options={ui.branchOptions}
        />
      )}
    </div>
  );
}

