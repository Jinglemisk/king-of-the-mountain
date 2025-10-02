/**
 * Welcome Screen
 * First screen players see - enter nickname or join with code
 */

import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { createGameLobby, joinGameLobby } from '../state/gameSlice';
import { generatePlayerId } from '../lib/firebase';

interface WelcomeScreenProps {
  onLobbyCreated: (lobbyCode: string, playerId: string, nickname: string) => void;
  onLobbyJoined: (lobbyCode: string, playerId: string, nickname: string) => void;
}

/**
 * Welcome screen where players enter nickname or join a lobby
 * @param onLobbyCreated - Callback when player creates a new lobby
 * @param onLobbyJoined - Callback when player joins an existing lobby
 */
export function WelcomeScreen({ onLobbyCreated, onLobbyJoined }: WelcomeScreenProps) {
  const [nickname, setNickname] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handle creating a new game lobby
   */
  const handleCreateLobby = async () => {
    // Validate nickname
    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const playerId = generatePlayerId();
      const lobbyCode = await createGameLobby(playerId, nickname.trim());
      onLobbyCreated(lobbyCode, playerId, nickname.trim());
    } catch (err) {
      console.error('Error creating lobby:', err);
      setError('Failed to create lobby. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle joining an existing lobby
   */
  const handleJoinLobby = async () => {
    // Validate inputs
    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }
    if (!joinCode.trim() || joinCode.length !== 6) {
      setError('Please enter a valid 6-character lobby code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const playerId = generatePlayerId();
      const success = await joinGameLobby(
        joinCode.toUpperCase().trim(),
        playerId,
        nickname.trim()
      );

      if (success) {
        onLobbyJoined(joinCode.toUpperCase().trim(), playerId, nickname.trim());
      } else {
        setError('Lobby not found or game already started');
      }
    } catch (err) {
      console.error('Error joining lobby:', err);
      setError('Failed to join lobby. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="screen welcome-screen">
      <div className="welcome-container">
        {/* Game title */}
        <h1 className="game-title">👑 King of the Mountain</h1>
        <p className="game-subtitle">Medieval adventure race for 2-6 players</p>

        {/* Error message */}
        {error && <div className="error-message">{error}</div>}

        {/* Nickname input */}
        <div className="input-group">
          <label htmlFor="nickname">Your Nickname</label>
          <Input
            value={nickname}
            onChange={setNickname}
            placeholder="Enter your nickname"
            maxLength={20}
            disabled={isLoading}
            autoFocus
          />
        </div>

        {/* Create lobby button */}
        <div className="button-group">
          <Button
            onClick={handleCreateLobby}
            disabled={isLoading}
            fullWidth
            variant="primary"
          >
            {isLoading ? 'Creating...' : 'Create New Game'}
          </Button>
        </div>

        {/* Divider */}
        <div className="divider">
          <span>OR</span>
        </div>

        {/* Join lobby section */}
        <div className="input-group">
          <label htmlFor="joinCode">Join with Code</label>
          <Input
            value={joinCode}
            onChange={setJoinCode}
            placeholder="Enter 6-digit code"
            maxLength={6}
            disabled={isLoading}
          />
        </div>

        <div className="button-group">
          <Button
            onClick={handleJoinLobby}
            disabled={isLoading}
            fullWidth
            variant="secondary"
          >
            {isLoading ? 'Joining...' : 'Join Game'}
          </Button>
        </div>
      </div>
    </div>
  );
}
