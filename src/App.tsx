/**
 * Main App component
 * Handles routing between Welcome, Lobby, and Game screens
 */

import { useState } from 'react';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { GameScreen } from './screens/GameScreen';
import { useGameState } from './hooks/useGameState';
import './index.css';

type Screen = 'welcome' | 'lobby' | 'game';

/**
 * Main application component
 * Manages screen navigation and player session state
 */
function App() {
  // Current screen state
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');

  // Player session data (persists across screens)
  const [lobbyCode, setLobbyCode] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);

  // Subscribe to game state from Firebase
  const gameState = useGameState(lobbyCode);

  /**
   * Handle lobby creation
   * @param code - The generated lobby code
   * @param id - The player's ID
   * @param name - The player's nickname (stored in Firebase, not needed in local state)
   */
  const handleLobbyCreated = (code: string, id: string, _name: string) => {
    setLobbyCode(code);
    setPlayerId(id);
    setCurrentScreen('lobby');
  };

  /**
   * Handle joining a lobby
   * @param code - The lobby code to join
   * @param id - The player's ID
   * @param name - The player's nickname (stored in Firebase, not needed in local state)
   */
  const handleLobbyJoined = (code: string, id: string, _name: string) => {
    setLobbyCode(code);
    setPlayerId(id);
    setCurrentScreen('lobby');
  };

  // Automatically transition to game screen when game starts
  if (gameState?.status === 'active' && currentScreen === 'lobby') {
    setCurrentScreen('game');
  }

  // Render appropriate screen
  if (currentScreen === 'welcome') {
    return (
      <WelcomeScreen
        onLobbyCreated={handleLobbyCreated}
        onLobbyJoined={handleLobbyJoined}
      />
    );
  }

  if (currentScreen === 'lobby') {
    if (!gameState || !playerId) {
      return (
        <div className="screen loading-screen">
          <p>Loading lobby...</p>
        </div>
      );
    }

    return <LobbyScreen gameState={gameState} playerId={playerId} />;
  }

  if (currentScreen === 'game') {
    if (!gameState || !playerId) {
      return (
        <div className="screen loading-screen">
          <p>Loading game...</p>
        </div>
      );
    }

    return <GameScreen gameState={gameState} playerId={playerId} />;
  }

  return null;
}

export default App;
