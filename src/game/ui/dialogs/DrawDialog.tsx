import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';

interface DrawDialogProps {
  type: 'treasure' | 'chance';
  card: any; // TODO: Use proper card type
}

export function DrawDialog({ type, card }: DrawDialogProps) {
  const { setActiveDialog, getMyPlayer } = useGameStore();
  const [placement, setPlacement] = useState<'equip' | 'bandolier' | 'backpack' | 'drop' | null>(null);

  const myPlayer = getMyPlayer();

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 1: return 'border-tier-1 bg-yellow-50 dark:bg-yellow-900/20';
      case 2: return 'border-tier-2 bg-amber-50 dark:bg-amber-900/20';
      case 3: return 'border-tier-3 bg-purple-50 dark:bg-purple-900/20';
      default: return 'border-gray-300 bg-gray-50 dark:bg-gray-800';
    }
  };

  const handlePlacement = (choice: 'equip' | 'bandolier' | 'backpack' | 'drop') => {
    setPlacement(choice);
    console.log(`Place ${card.name} in ${choice}`);
    // Dispatch placement action
    setTimeout(() => {
      setActiveDialog(null);
    }, 500);
  };

  const handleResolveChance = () => {
    console.log('Resolve chance card:', card.name);
    // Dispatch resolve chance action
    setActiveDialog(null);
  };

  if (type === 'chance') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4">
          <div className="bg-purple-600 text-white px-6 py-4 rounded-t-lg">
            <h2 className="text-2xl font-bold">🎲 CHANCE CARD</h2>
          </div>

          <div className="p-6 space-y-4">
            <div className="text-center">
              <div className="text-2xl mb-2">🎲</div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                {card.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {card.effect}
              </p>
            </div>

            {card.keepInHand ? (
              <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-500 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
                This card will be kept in your inventory for later use.
              </div>
            ) : (
              <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-500 rounded-lg p-3 text-sm text-yellow-700 dark:text-yellow-300">
                This effect will be applied immediately.
              </div>
            )}

            <button
              onClick={handleResolveChance}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 rounded-lg transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Treasure card
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4">
        <div className="bg-yellow-600 text-white px-6 py-4 rounded-t-lg">
          <h2 className="text-2xl font-bold">💰 TREASURE DRAWN</h2>
        </div>

        <div className="p-6 space-y-4">
          <div className={`border-2 rounded-lg p-4 ${getTierColor(card.tier || 1)}`}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                  {card.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {card.effect}
                </p>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Type: {card.type} • Tier {card.tier}
                </div>
              </div>
              <div className="text-2xl">
                {card.type === 'wearable' && '🎽'}
                {card.type === 'holdable' && '🗡️'}
                {card.type === 'drinkable' && '🧪'}
                {card.type === 'small' && '📦'}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Where would you like to place this item?
            </div>

            {/* Equip option (if applicable) */}
            {(card.type === 'wearable' || card.type === 'holdable') && (
              <button
                onClick={() => handlePlacement('equip')}
                className="w-full bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 py-2 rounded-lg transition-colors text-left px-4"
              >
                <span className="font-semibold">Equip Now</span>
                <span className="text-xs ml-2">
                  ({card.type === 'wearable' ? 'Replace current armor' : 'Replace holdable slot'})
                </span>
              </button>
            )}

            {/* Bandolier option (if applicable) */}
            {(card.type === 'drinkable' || card.type === 'small') && (
              <button
                onClick={() => handlePlacement('bandolier')}
                className="w-full bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 py-2 rounded-lg transition-colors text-left px-4"
                disabled={!myPlayer || (myPlayer.inventory?.bandolier?.length || 0) >= (myPlayer.classId === 'alchemist' ? 2 : 1)}
              >
                <span className="font-semibold">Store in Bandolier</span>
                <span className="text-xs ml-2">
                  (Quick access • {myPlayer?.inventory?.bandolier?.length || 0}/{myPlayer?.classId === 'alchemist' ? 2 : 1} slots)
                </span>
              </button>
            )}

            {/* Backpack option */}
            {(card.type === 'wearable' || card.type === 'holdable') && (
              <button
                onClick={() => handlePlacement('backpack')}
                className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg transition-colors text-left px-4"
                disabled={!myPlayer || (myPlayer.inventory?.backpack?.length || 0) >= (myPlayer.classId === 'porter' ? 2 : 1)}
              >
                <span className="font-semibold">Store in Backpack</span>
                <span className="text-xs ml-2">
                  (Storage • {myPlayer?.inventory?.backpack?.length || 0}/{myPlayer?.classId === 'porter' ? 2 : 1} slots)
                </span>
              </button>
            )}

            {/* Drop option */}
            <button
              onClick={() => handlePlacement('drop')}
              className="w-full bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 py-2 rounded-lg transition-colors text-left px-4"
            >
              <span className="font-semibold">Drop Item</span>
              <span className="text-xs ml-2">(Returns to deck bottom)</span>
            </button>
          </div>

          {placement && (
            <div className="bg-green-100 dark:bg-green-900/30 border border-green-500 rounded-lg p-3 text-sm text-green-700 dark:text-green-300 text-center">
              ✓ {card.name} will be {placement === 'equip' ? 'equipped' : placement === 'drop' ? 'dropped' : `stored in ${placement}`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}