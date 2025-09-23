import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';

export function CapacityDialog() {
  const { getMyPlayer, setActiveDialog, gameState } = useGameStore();
  const [itemsToDrop, setItemsToDrop] = useState<string[]>([]);

  const myPlayer = getMyPlayer();
  if (!myPlayer) return null;

  const bandolierCapacity = myPlayer.classId === 'alchemist' ? 2 : 1;
  const backpackCapacity = myPlayer.classId === 'porter' ? 2 : 1;

  const bandolierOverage = (myPlayer.inventory?.bandolier?.length || 0) - bandolierCapacity;
  const backpackOverage = (myPlayer.inventory?.backpack?.length || 0) - backpackCapacity;
  const totalOverage = Math.max(0, bandolierOverage) + Math.max(0, backpackOverage);

  const handleToggleDrop = (itemId: string) => {
    setItemsToDrop(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleConfirm = () => {
    console.log('Drop items:', itemsToDrop);
    // Dispatch drop items action
    setActiveDialog(null);
  };

  const allItems = [
    ...(myPlayer.inventory?.bandolier || []).map(id => ({ id, location: 'bandolier' })),
    ...(myPlayer.inventory?.backpack || []).map(id => ({ id, location: 'backpack' })),
  ];

  // Check for other players on tile who can pick up
  const playersOnTile = Object.values(gameState?.players || {})
    .filter(p => p.position === myPlayer.position && p.uid !== myPlayer.uid);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="bg-red-600 text-white px-6 py-4 rounded-t-lg">
          <h2 className="text-xl font-bold">⚠️ OVER CAPACITY</h2>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-500 rounded-lg p-3">
            <div className="text-red-700 dark:text-red-300 font-semibold">
              You must drop {totalOverage} item{totalOverage > 1 ? 's' : ''} to continue
            </div>
            <div className="text-xs text-red-600 dark:text-red-400 mt-1">
              {bandolierOverage > 0 && `Bandolier: ${bandolierOverage} over`}
              {bandolierOverage > 0 && backpackOverage > 0 && ' • '}
              {backpackOverage > 0 && `Backpack: ${backpackOverage} over`}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Select items to drop:
            </div>

            {allItems.map(({ id, location }) => (
              <div
                key={id}
                className={`
                  border rounded-lg p-3 cursor-pointer transition-all
                  ${itemsToDrop.includes(id)
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/30'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }
                `}
                onClick={() => handleToggleDrop(id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-gray-800 dark:text-white">
                      Item #{id}
                    </div>
                    <div className="text-xs text-gray-500">
                      In {location}
                    </div>
                  </div>
                  <div className="text-sm">
                    {itemsToDrop.includes(id) ? '❌ Drop' : '✅ Keep'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {playersOnTile.length > 0 && (
            <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-500 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
              <div className="font-semibold mb-1">Players on this tile can pick up dropped items:</div>
              <ul className="text-xs">
                {playersOnTile.map(p => (
                  <li key={p.uid}>• {p.nickname}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={itemsToDrop.length !== totalOverage}
              className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-bold py-2 rounded-lg transition-colors"
            >
              Drop {itemsToDrop.length}/{totalOverage} Items
            </button>
          </div>

          {itemsToDrop.length !== totalOverage && (
            <div className="text-xs text-center text-gray-500 dark:text-gray-400">
              Select exactly {totalOverage} item{totalOverage > 1 ? 's' : ''} to drop
            </div>
          )}
        </div>
      </div>
    </div>
  );
}