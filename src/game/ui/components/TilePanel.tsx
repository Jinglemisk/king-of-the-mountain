import { useGameStore } from '../stores/gameStore';
import { BOARD } from '../../data/content';

export function TilePanel() {
  const { gameState, getMyPlayer } = useGameStore();
  const myPlayer = getMyPlayer();

  if (!myPlayer || !gameState) {
    return null;
  }

  const currentTile = BOARD.tiles.find(t => t.id === myPlayer.position);
  if (!currentTile) return null;

  const getTileColor = (type: string) => {
    switch (type) {
      case 'enemy': return 'bg-red-100 dark:bg-red-900/30 border-red-500';
      case 'treasure': return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500';
      case 'chance': return 'bg-purple-100 dark:bg-purple-900/30 border-purple-500';
      case 'sanctuary': return 'bg-green-100 dark:bg-green-900/30 border-green-500';
      case 'empty': return 'bg-gray-100 dark:bg-gray-800 border-gray-400';
      case 'start': return 'bg-blue-100 dark:bg-blue-900/30 border-blue-500';
      case 'final': return 'bg-amber-100 dark:bg-amber-900/30 border-amber-500';
      default: return 'bg-gray-100 dark:bg-gray-800 border-gray-400';
    }
  };

  const getTileIcon = (type: string) => {
    switch (type) {
      case 'enemy': return '⚔️';
      case 'treasure': return '💰';
      case 'chance': return '🎲';
      case 'sanctuary': return '🛡️';
      case 'empty': return '⭕';
      case 'start': return '🏁';
      case 'final': return '👑';
      default: return '❓';
    }
  };

  // Check for other players on this tile
  const playersHere = Object.values(gameState.players).filter(
    p => p.position === myPlayer.position && p.uid !== myPlayer.uid
  );

  // Check for tile state (traps, ambushes, enemies)
  const trap = gameState.tileState?.traps?.[currentTile.id];
  const ambush = gameState.tileState?.ambushes?.[currentTile.id];
  const enemiesQueued = gameState.tileState?.enemies?.[currentTile.id];

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        CURRENT TILE
      </h3>

      <div className={`border-2 rounded-lg p-3 ${getTileColor(currentTile.type)}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getTileIcon(currentTile.type)}</span>
              <div>
                <div className="font-semibold text-gray-800 dark:text-white">
                  Tile #{currentTile.id}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {currentTile.type}
                  {currentTile.tier && ` (Tier ${currentTile.tier})`}
                </div>
              </div>
            </div>

            {/* Tile description */}
            <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              {currentTile.type === 'enemy' && 'Draw and fight enemies when you land here'}
              {currentTile.type === 'treasure' && 'Draw a treasure card when you land here'}
              {currentTile.type === 'chance' && 'Draw a chance card when you land here'}
              {currentTile.type === 'sanctuary' && 'No duels can be initiated here'}
              {currentTile.type === 'empty' && 'No effect'}
              {currentTile.type === 'start' && 'Starting position for all players'}
              {currentTile.type === 'final' && 'First to reach here wins!'}
            </div>
          </div>
        </div>

        {/* Special tile states */}
        {(trap || ambush || enemiesQueued) && (
          <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600 space-y-2">
            {trap && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <span>🪤</span>
                <span>Trap placed by {trap.ownerNickname || 'a player'}</span>
              </div>
            )}

            {ambush && (
              <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
                <span>👤</span>
                <span>Ambush set by {ambush.ownerNickname || 'a player'}</span>
              </div>
            )}

            {enemiesQueued && enemiesQueued.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <span>⚔️</span>
                <span>{enemiesQueued.length} enemies waiting</span>
              </div>
            )}
          </div>
        )}

        {/* Players on this tile */}
        {playersHere.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
              PLAYERS HERE
            </div>
            <div className="space-y-1">
              {playersHere.map(player => (
                <div key={player.uid} className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {player.nickname}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {player.hp}/{player.maxHp} HP
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next tiles */}
        {currentTile.neighbors.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              NEXT TILES
            </div>
            <div className="flex gap-2">
              {currentTile.neighbors.map(neighborId => {
                const neighbor = BOARD.tiles.find(t => t.id === neighborId);
                if (!neighbor) return null;
                return (
                  <div
                    key={neighborId}
                    className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded"
                  >
                    #{neighborId} {getTileIcon(neighbor.type)}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sanctuary reminder */}
      {currentTile.type === 'sanctuary' && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-400 rounded-lg px-3 py-2 text-sm text-green-700 dark:text-green-300">
          🛡️ You are in a Sanctuary
          <ul className="mt-1 text-xs space-y-1">
            <li>• No duels can be initiated here</li>
            <li>• Traps and ambushes cannot be placed</li>
            <li>• You cannot be forced out by cards</li>
          </ul>
        </div>
      )}
    </div>
  );
}