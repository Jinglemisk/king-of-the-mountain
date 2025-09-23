import { useMemo } from 'react';
import { useGameStore } from '../stores/gameStore';
import { BOARD } from '../../data/content';

interface TilePosition {
  x: number;
  y: number;
}

const TILE_SIZE = 60;
const TILE_SPACING = 80;

export function BoardCanvas() {
  const { gameState, myUid, ui, setHoveredTile, setBranchOptions } = useGameStore();

  // Calculate tile positions for rendering
  const tilePositions = useMemo(() => {
    const positions: Record<number, TilePosition> = {};

    // Main path layout (simplified grid)
    // This creates a winding path layout
    const rows = 9;
    const cols = 8;

    BOARD.tiles.forEach((tile) => {
      // Simple grid layout - you can make this more sophisticated
      if (tile.id <= 53) {
        // Main path
        const row = Math.floor(tile.id / cols);
        const col = tile.id % cols;
        const zigzag = row % 2 === 1;

        positions[tile.id] = {
          x: zigzag ? (cols - col - 1) * TILE_SPACING + 50 : col * TILE_SPACING + 50,
          y: row * TILE_SPACING + 50,
        };
      } else if (tile.id >= 54 && tile.id <= 59) {
        // Shortcut A
        const offset = tile.id - 54;
        positions[tile.id] = {
          x: 250 + offset * 40,
          y: 150 + offset * 30,
        };
      } else if (tile.id >= 60 && tile.id <= 67) {
        // Shortcut B
        const offset = tile.id - 60;
        positions[tile.id] = {
          x: 450 + offset * 40,
          y: 350 + offset * 30,
        };
      }
    });

    return positions;
  }, []);

  const getTileColor = (type: string, tier?: number) => {
    switch (type) {
      case 'enemy': return 'bg-tile-enemy';
      case 'treasure': return 'bg-tile-treasure';
      case 'chance': return 'bg-tile-chance';
      case 'sanctuary': return 'bg-tile-sanctuary';
      case 'empty': return 'bg-tile-empty';
      case 'start': return 'bg-tile-start';
      case 'final': return 'bg-tile-final';
      default: return 'bg-gray-400';
    }
  };

  const getTileIcon = (type: string) => {
    switch (type) {
      case 'enemy': return '⚔️';
      case 'treasure': return '💰';
      case 'chance': return '🎲';
      case 'sanctuary': return '🛡️';
      case 'empty': return '';
      case 'start': return '🏁';
      case 'final': return '👑';
      default: return '';
    }
  };

  const getPlayerTokens = (tileId: number) => {
    if (!gameState) return [];
    return Object.entries(gameState.players)
      .filter(([_, player]) => player.position === tileId)
      .map(([uid, player]) => ({
        uid,
        nickname: player.nickname || 'Player',
        isMe: uid === myUid,
        hp: player.hp,
        maxHp: player.maxHp,
      }));
  };

  const handleTileClick = (tileId: number) => {
    // Handle branch choice if active
    if (ui.branchOptions?.includes(tileId)) {
      // Dispatch branch choice action
      console.log('Choose branch:', tileId);
    }
  };

  return (
    <div className="flex-1 overflow-auto relative bg-gray-50 dark:bg-gray-900 p-4">
      <svg
        width="100%"
        height="800"
        className="absolute top-0 left-0 pointer-events-none"
      >
        {/* Draw connections between tiles */}
        {BOARD.tiles.map((tile) =>
          tile.neighbors.map((neighborId) => {
            const from = tilePositions[tile.id];
            const to = tilePositions[neighborId];
            if (!from || !to) return null;

            return (
              <line
                key={`${tile.id}-${neighborId}`}
                x1={from.x + TILE_SIZE / 2}
                y1={from.y + TILE_SIZE / 2}
                x2={to.x + TILE_SIZE / 2}
                y2={to.y + TILE_SIZE / 2}
                stroke="rgb(156, 163, 175)"
                strokeWidth="2"
                strokeDasharray="4 4"
                opacity="0.5"
              />
            );
          })
        )}
      </svg>

      {/* Render tiles */}
      {BOARD.tiles.map((tile) => {
        const pos = tilePositions[tile.id];
        if (!pos) return null;

        const tokens = getPlayerTokens(tile.id);
        const isHovered = ui.hoveredTile === tile.id;
        const isBranchOption = ui.branchOptions?.includes(tile.id);

        return (
          <div
            key={tile.id}
            className={`
              absolute rounded-lg border-2 cursor-pointer transition-all
              ${getTileColor(tile.type, tile.tier)}
              ${isHovered ? 'scale-110 z-10' : ''}
              ${isBranchOption ? 'ring-4 ring-yellow-400 animate-pulse-glow' : ''}
              ${tile.type === 'sanctuary' ? 'border-green-600' : 'border-gray-600'}
            `}
            style={{
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              width: `${TILE_SIZE}px`,
              height: `${TILE_SIZE}px`,
            }}
            onClick={() => handleTileClick(tile.id)}
            onMouseEnter={() => setHoveredTile(tile.id)}
            onMouseLeave={() => setHoveredTile(null)}
            data-testid={`tile-${tile.id}`}
          >
            {/* Tile content */}
            <div className="flex flex-col items-center justify-center h-full relative">
              {/* Tile ID */}
              <div className="absolute top-0 left-1 text-xs text-white/70">
                {tile.id}
              </div>

              {/* Tile icon */}
              <div className="text-2xl">{getTileIcon(tile.type)}</div>

              {/* Tier indicator */}
              {tile.tier && (
                <div className="absolute bottom-0 right-1 text-xs text-white/70">
                  T{tile.tier}
                </div>
              )}

              {/* Tile state indicators */}
              {gameState?.tileState?.traps?.[tile.id] && (
                <div className="absolute top-0 right-0 text-xs">🪤</div>
              )}
              {gameState?.tileState?.ambushes?.[tile.id] && (
                <div className="absolute top-0 right-0 text-xs">👤</div>
              )}
            </div>

            {/* Player tokens */}
            {tokens.length > 0 && (
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                {tokens.map((token) => (
                  <div
                    key={token.uid}
                    className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${token.isMe
                        ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                        : 'bg-gray-600 text-white'
                      }
                      ${token.hp <= 1 ? 'opacity-50' : ''}
                    `}
                    title={`${token.nickname} (${token.hp}/${token.maxHp} HP)`}
                  >
                    {token.nickname[0].toUpperCase()}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 rounded-lg p-3 text-xs">
        <h3 className="font-semibold mb-2">Legend</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 bg-tile-enemy rounded"></span>
            <span>Enemy</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 bg-tile-treasure rounded"></span>
            <span>Treasure</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 bg-tile-chance rounded"></span>
            <span>Chance</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 bg-tile-sanctuary rounded"></span>
            <span>Sanctuary</span>
          </div>
        </div>
      </div>
    </div>
  );
}