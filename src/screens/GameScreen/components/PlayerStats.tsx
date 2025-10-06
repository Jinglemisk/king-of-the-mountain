/**
 * PlayerStats Component
 * Displays player's current HP, attack, defense, and class
 */

import type { Player } from '../../../types';
import { calculatePlayerStats } from '../../../utils/playerStats';

interface PlayerStatsProps {
  player: Player;
}

export function PlayerStats({ player }: PlayerStatsProps) {
  // Calculate total attack and defense from equipment only (no class bonuses for inventory display)
  const { attack: totalAttack, defense: totalDefense } = calculatePlayerStats(
    player,
    true, // isVsEnemy (default context)
    false // Don't include class bonuses for inventory display
  );

  return (
    <div className="player-stats">
      <div className="stat">
        <span className="stat-label">HP:</span>
        <span className="stat-value">
          {player.hp}/{player.maxHp}
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
        <span className="stat-value">{player.class}</span>
      </div>
    </div>
  );
}
