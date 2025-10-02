/**
 * Custom React hook for subscribing to Firebase Realtime Database game state
 * Provides real-time updates whenever the game state changes
 */

import { useState, useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { database } from '../lib/firebase';
import type { GameState } from '../types';

/**
 * Subscribe to game state changes in Firebase
 * @param lobbyCode - The 6-character lobby code
 * @returns The current game state or null if not found/loading
 */
export function useGameState(lobbyCode: string | null): GameState | null {
  const [gameState, setGameState] = useState<GameState | null>(null);

  useEffect(() => {
    // If no lobby code, don't subscribe
    if (!lobbyCode) {
      setGameState(null);
      return;
    }

    // Create reference to the game state in Firebase
    const gameRef = ref(database, `games/${lobbyCode}`);

    // Subscribe to value changes
    onValue(gameRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setGameState(data as GameState);
      } else {
        setGameState(null);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      off(gameRef);
    };
  }, [lobbyCode]);

  return gameState;
}
