import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { DiceRoll } from './DiceRoll';
import { BOARD } from '../../data/content';

export function TurnControls() {
  const gameStore = useGameStore();
  const {
    gameState,
    myUid,
    getMyPlayer,
    isMyTurn,
    getCurrentPhase,
    ui,
    setDiceRolling,
    setLastDiceResult,
    setActiveDialog,
  } = gameStore;

  const [showDuelMenu, setShowDuelMenu] = useState(false);

  const myPlayer = getMyPlayer();
  const phase = getCurrentPhase();
  const isCurrentPlayer = isMyTurn();
  const currentTile = BOARD.tiles.find(t => t.id === myPlayer?.position);

  // Debug logging
  console.log('[TurnControls] Current phase:', phase, 'Is my turn:', isCurrentPlayer);
  console.log('[TurnControls] MyUid:', myUid, 'Current player:', gameState?.currentPlayerUid);

  // Check for other players on the same tile
  const playersOnTile = Object.values(gameState?.players || {})
    .filter(p => p.position === myPlayer?.position && p.uid !== myPlayer?.uid);

  const canOfferDuel = phase === 'preDuel' &&
    isCurrentPlayer &&
    playersOnTile.length > 0 &&
    currentTile?.type !== 'sanctuary';

  const canSleep = phase === 'moveOrSleep' && isCurrentPlayer;
  const canMove = phase === 'moveOrSleep' && isCurrentPlayer;
  const canRetreat = (phase === 'combat' || phase === 'duel') && isCurrentPlayer;
  const canEndTurn = phase === 'endTurn' && isCurrentPlayer;
  // Allow ending turn from capacity phase after movement/sleep
  const canEndFromCapacity = phase === 'capacity' && isCurrentPlayer;
  // Need to continue through automatic phases (including turnStart)
  const needsContinue = (phase === 'turnStart' || phase === 'manage' || phase === 'preDuel') && isCurrentPlayer;
  // Handle resolveTile phase separately for clarity
  const needsResolve = phase === 'resolveTile' && isCurrentPlayer;

  const handleSleep = async () => {
    console.log('[TurnControls] Sleep button clicked');
    try {
      await gameStore.performSleep();
      console.log('[TurnControls] Sleep action completed');
    } catch (error) {
      console.error('[TurnControls] Failed to sleep:', error);
      alert(`Failed to sleep: ${error}`);
    }
  };

  const handleMove = async () => {
    console.log('[TurnControls] Move button clicked');
    try {
      setDiceRolling(true);
      // The actual dice roll will be handled by the server
      await gameStore.performMove();
      // Server will handle dice result and update game state
      setDiceRolling(false);
      console.log('[TurnControls] Move action completed');
    } catch (error) {
      console.error('[TurnControls] Failed to move:', error);
      setDiceRolling(false);
      alert(`Failed to move: ${error}`);
    }
  };

  const handleOfferDuel = async (targetUid: string) => {
    try {
      setShowDuelMenu(false);
      await gameStore.performDuelOffer(targetUid);
    } catch (error) {
      console.error('Failed to offer duel:', error);
    }
  };

  const handleRetreat = async () => {
    try {
      await gameStore.performRetreat();
    } catch (error) {
      console.error('Failed to retreat:', error);
    }
  };

  const handleEndTurn = async () => {
    try {
      await gameStore.performEndTurn();
    } catch (error) {
      console.error('Failed to end turn:', error);
    }
  };

  const handleContinue = async () => {
    console.log('[TurnControls] Continue button clicked, current phase:', phase);
    try {
      await gameStore.performContinue();
    } catch (error) {
      console.error('Failed to continue:', error);
      alert(`Failed to continue: ${error}`);
    }
  };

  if (!isCurrentPlayer) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">
          Waiting for {gameState?.players[gameState.currentPlayerUid]?.nickname || 'player'}'s turn...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Phase indicator */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Current Phase: <span className="font-semibold">{phase}</span>
      </div>

      {/* Main action buttons */}
      <div className="flex gap-3 items-center">
        {/* Sleep button */}
        {canSleep && (
          <button
            onClick={handleSleep}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            data-testid="btn-sleep"
          >
            😴 Sleep (Heal to full)
          </button>
        )}

        {/* Move button */}
        {canMove && (
          <button
            onClick={handleMove}
            disabled={ui.diceRolling}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            data-testid="btn-move"
          >
            🎲 Move (Roll d4)
          </button>
        )}

        {/* Duel button */}
        {canOfferDuel && (
          <div className="relative">
            <button
              onClick={() => setShowDuelMenu(!showDuelMenu)}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
              data-testid="btn-offer-duel"
            >
              ⚔️ Offer Duel
            </button>

            {showDuelMenu && (
              <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 min-w-[200px]">
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Choose opponent:
                </div>
                {playersOnTile.map(player => (
                  <button
                    key={player.uid}
                    onClick={() => handleOfferDuel(player.uid)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    <div className="font-semibold">{player.nickname}</div>
                    <div className="text-xs text-gray-500">
                      {player.hp}/{player.maxHp} HP
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Retreat button */}
        {canRetreat && (
          <button
            onClick={handleRetreat}
            className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            data-testid="btn-retreat"
          >
            🏃 Retreat (Move back 6)
          </button>
        )}

        {/* End Turn button */}
        {canEndTurn && (
          <button
            onClick={handleEndTurn}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            data-testid="btn-end-turn"
          >
            ✅ End Turn
          </button>
        )}

        {/* End Turn from Capacity phase (after movement/sleep) */}
        {canEndFromCapacity && (
          <button
            onClick={handleEndTurn}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            data-testid="btn-end-turn-capacity"
          >
            ✅ End Turn
          </button>
        )}

        {/* Continue button for automatic phases */}
        {needsContinue && (
          <button
            onClick={handleContinue}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            data-testid="btn-continue"
          >
            ➡️ Continue
          </button>
        )}

        {/* End turn button for resolveTile phase */}
        {needsResolve && (
          <button
            onClick={handleEndTurn}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            data-testid="btn-end-turn-resolve"
          >
            ✅ End Turn
          </button>
        )}

        {/* Dice display */}
        {ui.diceRolling && (
          <div className="ml-4">
            <DiceRoll type="d4" value={0} animated={true} />
          </div>
        )}

        {ui.lastDiceResult && !ui.diceRolling && (
          <div className="ml-4">
            <DiceRoll
              type={ui.lastDiceResult.type}
              value={ui.lastDiceResult.value}
              animated={false}
            />
          </div>
        )}
      </div>

      {/* Additional info */}
      {phase === 'moveOrSleep' && currentTile?.type === 'enemy' && (
        <div className="text-sm text-yellow-600 dark:text-yellow-400">
          ⚠️ Warning: If you sleep on an enemy tile, you'll still have to fight after healing!
        </div>
      )}

      {phase === 'preDuel' && currentTile?.type === 'sanctuary' && (
        <div className="text-sm text-green-600 dark:text-green-400">
          🛡️ You are in a Sanctuary - no duels can be initiated here
        </div>
      )}

      {phase === 'combat' && (
        <div className="text-sm text-red-600 dark:text-red-400">
          ⚔️ You are in combat! Fight or retreat!
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        Keyboard shortcuts: [M] Move • [S] Sleep • [D] Duel • [R] Retreat
      </div>
    </div>
  );
}
