import { useGameStore } from '../stores/gameStore';
import { BOARD } from '../../data/content';

interface BranchChoicePromptProps {
  fromTileId: number;
  options: number[];
}

export function BranchChoicePrompt({ fromTileId, options }: BranchChoicePromptProps) {
  const { setBranchOptions, setActiveDialog } = useGameStore();

  const handleChoice = (tileId: number) => {
    console.log(`Choose branch from ${fromTileId} to ${tileId}`);
    // Dispatch branch choice action
    setBranchOptions(null);
    setActiveDialog(null);
  };

  const getTileInfo = (tileId: number) => {
    const tile = BOARD.tiles.find(t => t.id === tileId);
    if (!tile) return null;

    const icon = {
      'enemy': '⚔️',
      'treasure': '💰',
      'chance': '🎲',
      'sanctuary': '🛡️',
      'empty': '⭕',
      'final': '👑',
    }[tile.type] || '❓';

    const color = {
      'enemy': 'bg-red-100 dark:bg-red-900/30 border-red-500',
      'treasure': 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500',
      'chance': 'bg-purple-100 dark:bg-purple-900/30 border-purple-500',
      'sanctuary': 'bg-green-100 dark:bg-green-900/30 border-green-500',
      'empty': 'bg-gray-100 dark:bg-gray-800 border-gray-400',
      'final': 'bg-amber-100 dark:bg-amber-900/30 border-amber-500',
    }[tile.type] || 'bg-gray-100 dark:bg-gray-800 border-gray-400';

    return { tile, icon, color };
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-lg w-full mx-4">
        <div className="bg-blue-600 text-white px-6 py-4 rounded-t-lg">
          <h2 className="text-xl font-bold">🔀 CHOOSE YOUR PATH</h2>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-center text-gray-700 dark:text-gray-300">
            You've reached a branch! Choose which path to take:
          </div>

          <div className="space-y-3">
            {options.map(tileId => {
              const info = getTileInfo(tileId);
              if (!info) return null;

              const { tile, icon, color } = info;

              return (
                <button
                  key={tileId}
                  onClick={() => handleChoice(tileId)}
                  className={`
                    w-full border-2 rounded-lg p-4 transition-all hover:shadow-lg
                    ${color}
                  `}
                  data-testid={`branch-option-${tileId}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{icon}</span>
                      <div className="text-left">
                        <div className="font-semibold text-gray-800 dark:text-white">
                          Tile #{tileId}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                          {tile.type}
                          {tile.tier && ` (Tier ${tile.tier})`}
                        </div>
                      </div>
                    </div>
                    <div className="text-2xl text-gray-400">
                      →
                    </div>
                  </div>

                  {/* Path preview */}
                  {tile.neighbors.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-300/50 dark:border-gray-600/50">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Next: {tile.neighbors.map(nId => {
                          const neighbor = BOARD.tiles.find(t => t.id === nId);
                          return neighbor ? `#${nId} (${neighbor.type})` : `#${nId}`;
                        }).join(', ')}
                      </div>
                    </div>
                  )}

                  {/* Special indicators */}
                  {tile.type === 'final' && (
                    <div className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      🏆 WIN CONDITION - Reach here first to win!
                    </div>
                  )}
                  {tile.neighbors.some(nId => {
                    const n = BOARD.tiles.find(t => t.id === nId);
                    return n?.type === 'final';
                  }) && (
                    <div className="mt-2 text-xs font-semibold text-green-600 dark:text-green-400">
                      ✨ This path leads closer to the final tile!
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-xs text-center text-gray-500 dark:text-gray-400">
            Tip: Shortcuts are riskier but faster!
          </div>
        </div>
      </div>
    </div>
  );
}