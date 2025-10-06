/**
 * usePlayerUtils Hook
 * Provides utility functions for player-related calculations and queries
 */

import type { GameState, Player } from '../../../types';

interface UsePlayerUtilsParams {
  gameState: GameState;
  playerId: string;
  currentPlayer: Player;
}

export function usePlayerUtils({ gameState, playerId, currentPlayer }: UsePlayerUtilsParams) {
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
   * Get the current tile the player is on
   */
  const getCurrentTile = () => {
    return gameState.tiles[currentPlayer.position];
  };

  return {
    getPlayersOnSameTile,
    getUnconsciousPlayersOnSameTile,
    getCurrentTile,
  };
}
