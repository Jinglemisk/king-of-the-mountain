/**
 * Player token component
 * Displays a player's token on the game board
 */

import type { Player } from '../../types';

interface PlayerTokenProps {
  player: Player;
  isCurrentTurn?: boolean;
}

/**
 * Visual representation of a player on the board
 * @param player - Player object
 * @param isCurrentTurn - Whether it's this player's turn
 */
export function PlayerToken({ player, isCurrentTurn = false }: PlayerTokenProps) {
  // Get first letter of nickname for token
  const initial = player.nickname.charAt(0).toUpperCase();

  // Determine token color based on player state
  const tokenClass = isCurrentTurn ? 'player-token active' : 'player-token';
  const aliveClass = player.isAlive ? '' : 'dead';

  return (
    <div
      className={`${tokenClass} ${aliveClass}`}
      title={`${player.nickname} - HP: ${player.hp}/${player.maxHp}`}
    >
      <div className="token-initial">{initial}</div>
      <div className="token-hp">{player.hp}</div>
    </div>
  );
}
