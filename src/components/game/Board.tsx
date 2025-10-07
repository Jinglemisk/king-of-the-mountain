/**
 * Game board component
 * Displays the 40-tile board in a snake layout with player tokens
 */

import type { Tile, Player } from '../../types';
import { PlayerToken } from './PlayerToken';

interface BoardProps {
  tiles: Tile[];
  players: Record<string, Player>;
  currentPlayerId: string | null;
  onTileClick?: (tileId: number) => void;
}

/**
 * Visual representation of the game board
 * @param tiles - Array of 40 tiles
 * @param players - Map of all players
 * @param currentPlayerId - ID of player whose turn it is
 * @param onTileClick - Handler for clicking a tile
 */
export function Board({ tiles, players, currentPlayerId, onTileClick }: BoardProps) {
  /**
   * Get all players currently on a specific tile
   * @param tileId - The tile position
   * @returns Array of players on that tile
   */
  const getPlayersOnTile = (tileId: number): Player[] => {
    return Object.values(players).filter((p) => p.position === tileId);
  };

  /**
   * Get CSS class for tile type
   * @param tile - The tile object
   * @returns CSS class name
   */
  const getTileClass = (tile: Tile): string => {
    const baseClass = 'tile';
    const typeClass = `tile-${tile.type}`;
    const trapClass = tile.hasTrap ? 'has-trap' : '';
    return `${baseClass} ${typeClass} ${trapClass}`.trim();
  };

  /**
   * Get tile label/emoji
   * @param tile - The tile object
   * @returns Display label for the tile
   */
  const getTileLabel = (tile: Tile): string => {
    switch (tile.type) {
      case 'start': return '🏁 Start';
      case 'enemy1': return '⚔️ E1';
      case 'enemy2': return '⚔️ E2';
      case 'enemy3': return '⚔️ E3';
      case 'treasure1': return '📦 T1';
      case 'treasure2': return '📦 T2';
      case 'treasure3': return '📦 T3';
      case 'luck': return '🎲 Luck';
      case 'sanctuary': return '🛡️ Sanctuary';
      case 'final': return '👑 Final';
      default: return '';
    }
  };

  // Split tiles into rows for snake layout (8 rows of 5 tiles each)
  const rows: Tile[][] = [];
  for (let i = 0; i < 8; i++) {
    const row = tiles.slice(i * 5, (i + 1) * 5);
    // Reverse odd rows for snake pattern
    if (i % 2 === 1) {
      row.reverse();
    }
    rows.push(row);
  }

  return (
    <div className="board">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="board-row">
          {row.map((tile) => {
            const playersOnTile = getPlayersOnTile(tile.id);
            return (
              <div
                key={tile.id}
                className={getTileClass(tile)}
                onClick={() => onTileClick?.(tile.id)}
              >
                {/* Tile number and label */}
                <div className="tile-header">
                  <span className="tile-number">{tile.id}</span>
                  <span className="tile-label">{getTileLabel(tile)}</span>
                </div>

                {/* Trap indicator */}
                {tile.hasTrap && <div className="trap-indicator">⚠️</div>}

                {/* Player tokens on this tile */}
                <div className="tile-tokens">
                  {playersOnTile.map((player) => (
                    <PlayerToken
                      key={player.id}
                      player={player}
                      isCurrentTurn={player.id === currentPlayerId}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
