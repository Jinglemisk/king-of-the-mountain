/**
 * Lobby Screen
 * Waiting lobby where players select classes and ready up
 */

import { useState } from 'react';
import type { GameState, PlayerClass } from '../types';
import { Button } from '../components/ui/Button';
import { selectClass, startGame } from '../state/gameSlice';
import { PLAYER_CLASSES } from '../data/classes';

interface LobbyScreenProps {
  gameState: GameState;
  playerId: string;
}

/**
 * Lobby screen for class selection and starting the game
 * @param gameState - Current game state
 * @param playerId - This player's ID
 */
export function LobbyScreen({ gameState, playerId }: LobbyScreenProps) {
  const [selectedClass, setSelectedClass] = useState<PlayerClass | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const currentPlayer = gameState.players[playerId];

  // Safety check - if player data is missing, show loading
  if (!currentPlayer) {
    return (
      <div className="screen loading-screen">
        <p>Loading player data...</p>
      </div>
    );
  }

  const allPlayers = Object.values(gameState.players);
  const allReady = allPlayers.every((p) => p.isReady);
  const canStart = currentPlayer.isHost && allPlayers.length >= 2 && allReady;

  /**
   * Handle class selection
   * @param className - The class to select
   */
  const handleSelectClass = async (className: PlayerClass) => {
    setIsLoading(true);
    try {
      await selectClass(gameState.lobbyCode, playerId, className);
      setSelectedClass(className);
    } catch (err) {
      console.error('Error selecting class:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle starting the game (host only)
   */
  const handleStartGame = async () => {
    setIsLoading(true);
    try {
      await startGame(gameState.lobbyCode);
    } catch (err) {
      console.error('Error starting game:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="screen lobby-screen">
      {/* Lobby header */}
      <div className="lobby-header">
        <h1>🏰 Lobby</h1>
        <div className="lobby-code">
          <span>Lobby Code:</span>
          <code>{gameState.lobbyCode}</code>
        </div>
      </div>

      {/* Players list */}
      <div className="players-section">
        <h2>Players ({allPlayers.length}/6)</h2>
        <div className="players-list">
          {allPlayers.map((player) => (
            <div
              key={player.id}
              className={`player-item ${player.isReady ? 'ready' : 'not-ready'}`}
            >
              <span className="player-nickname">
                {player.nickname}
                {player.isHost && ' 👑'}
              </span>
              <span className="player-class">
                {player.class || 'Not selected'}
              </span>
              <span className="player-status">
                {player.isReady ? '✓ Ready' : '⏳ Selecting...'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Class selection */}
      {!currentPlayer.isReady && (
        <div className="class-selection">
          <h2>Choose Your Class</h2>
          <div className="class-grid">
            {PLAYER_CLASSES.map((classInfo) => (
              <div
                key={classInfo.name}
                className={`class-card ${selectedClass === classInfo.name ? 'selected' : ''}`}
                onClick={() => !isLoading && handleSelectClass(classInfo.name)}
              >
                <div className="class-icon">{classInfo.icon}</div>
                <div className="class-name">{classInfo.name}</div>
                <div className="class-description">{classInfo.description}</div>
                <div className="class-special">{classInfo.specialEffect}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Start game button (host only) */}
      {currentPlayer.isHost && (
        <div className="lobby-footer">
          <Button
            onClick={handleStartGame}
            disabled={!canStart || isLoading}
            variant="primary"
            fullWidth
          >
            {isLoading
              ? 'Starting...'
              : !allReady
              ? 'Waiting for players to ready up...'
              : allPlayers.length < 2
              ? 'Need at least 2 players'
              : 'Start Game'}
          </Button>
        </div>
      )}

      {/* Waiting message for non-hosts */}
      {!currentPlayer.isHost && currentPlayer.isReady && (
        <div className="waiting-message">
          <p>✓ You're ready! Waiting for host to start the game...</p>
        </div>
      )}
    </div>
  );
}
