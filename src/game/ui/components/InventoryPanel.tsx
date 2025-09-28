import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { ITEMS } from '../../data/content';

// Simplified item type for UI
interface Item {
  id: string;
  name: string;
  type: 'wearable' | 'holdable' | 'drinkable' | 'small';
  tier?: number;
  effect?: string;
  timing?: string;
}

export function InventoryPanel() {
  const { getMyPlayer, isMyTurn, getCurrentPhase, gameState } = useGameStore();
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const myPlayer = getMyPlayer();
  const canSwap = isMyTurn() && getCurrentPhase() === 'manage';

  if (!myPlayer) return null;

  const getItemData = (itemId: string): Item | undefined => {
    return Object.values(ITEMS).flat().find(item => item.id === itemId);
  };

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 1: return 'border-tier-1 bg-yellow-50 dark:bg-yellow-900/20';
      case 2: return 'border-tier-2 bg-amber-50 dark:bg-amber-900/20';
      case 3: return 'border-tier-3 bg-purple-50 dark:bg-purple-900/20';
      default: return 'border-gray-300 bg-gray-50 dark:bg-gray-800';
    }
  };

  const handleEquip = (itemId: string, slot: string) => {
    if (!canSwap) return;
    console.log('Equip item:', itemId, 'to slot:', slot);
    // Dispatch equip action
  };

  const handleUnequip = (slot: string) => {
    if (!canSwap) return;
    console.log('Unequip from slot:', slot);
    // Dispatch unequip action
  };

  const handleUseItem = (itemId: string) => {
    const item = getItemData(itemId);
    if (!item) return;

    // Check if item can be used now
    if (item.type === 'drinkable' || (item.type === 'small' && item.timing === 'anytime')) {
      console.log('Use item:', itemId);
      // Dispatch use item action
    }
  };

  const handleDropItem = (itemId: string) => {
    if (!canSwap) return;
    console.log('Drop item:', itemId);
    // Dispatch drop action
  };

  const ItemCard = ({ itemId, slot, canUse = false }: { itemId: string; slot?: string; canUse?: boolean }) => {
    const item = getItemData(itemId);
    if (!item) return null;

    return (
      <div
        className={`
          border-2 rounded-lg p-2 cursor-pointer transition-all
          ${getTierColor(item.tier || 1)}
          ${selectedItem === itemId ? 'ring-2 ring-blue-500' : ''}
          hover:shadow-md
        `}
        onClick={() => setSelectedItem(itemId)}
        data-testid={`item-${itemId}`}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="font-semibold text-sm text-gray-800 dark:text-white">
              {item.name}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {item.type === 'wearable' && item.effect}
              {item.type === 'holdable' && item.effect}
              {item.type === 'drinkable' && item.effect}
              {item.type === 'small' && item.effect}
            </div>
          </div>
          <div className="text-xs text-gray-500 ml-2">
            T{item.tier}
          </div>
        </div>

        {selectedItem === itemId && (
          <div className="mt-2 flex gap-1">
            {canUse && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUseItem(itemId);
                }}
                className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded"
              >
                Use
              </button>
            )}
            {canSwap && slot && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnequip(slot);
                }}
                className="text-xs bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded"
              >
                Unequip
              </button>
            )}
            {canSwap && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDropItem(itemId);
                }}
                className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
              >
                Drop
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const EmptySlot = ({ label, type }: { label: string; type: string }) => (
    <div
      className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3 text-center text-gray-400 dark:text-gray-500 text-sm"
      data-testid={`slot-${type}`}
    >
      {label}
    </div>
  );

  // Calculate capacities
  const bandolierCapacity = myPlayer.classId === 'alchemist' ? 2 : 1;
  const backpackCapacity = myPlayer.classId === 'porter' ? 2 : 1;

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          INVENTORY
        </h3>
        {canSwap && (
          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
            Can swap items
          </span>
        )}
      </div>

      {/* Equipped Items */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
          EQUIPPED
        </div>

        {/* Wearable */}
        <div>
          <div className="text-xs text-gray-500 mb-1">Wearable</div>
          {myPlayer.inventory?.equipped?.wearable ? (
            <ItemCard itemId={myPlayer.inventory.equipped.wearable} slot="wearable" />
          ) : (
            <EmptySlot label="Empty (Armor/Cloak)" type="wearable" />
          )}
        </div>

        {/* Holdables */}
        <div>
          <div className="text-xs text-gray-500 mb-1">Holdable (2 slots)</div>
          <div className="grid grid-cols-2 gap-2">
            {myPlayer.inventory?.equipped?.holdableA ? (
              <ItemCard itemId={myPlayer.inventory.equipped.holdableA} slot="holdableA" />
            ) : (
              <EmptySlot label="Empty" type="holdable-A" />
            )}
            {myPlayer.inventory?.equipped?.holdableB ? (
              <ItemCard itemId={myPlayer.inventory.equipped.holdableB} slot="holdableB" />
            ) : (
              <EmptySlot label="Empty" type="holdable-B" />
            )}
          </div>
        </div>
      </div>

      {/* Inventory Items */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
          INVENTORY (Hidden from others)
        </div>

        {/* Bandolier */}
        <div>
          <div className="text-xs text-gray-500 mb-1">
            Bandolier ({myPlayer.inventory?.bandolier?.length || 0}/{bandolierCapacity})
          </div>
          <div className={`grid grid-cols-${bandolierCapacity} gap-2`}>
            {Array.from({ length: bandolierCapacity }).map((_, idx) => {
              const item = myPlayer.inventory?.bandolier?.[idx];
              return item ? (
                <ItemCard key={idx} itemId={item} canUse={true} />
              ) : (
                <EmptySlot key={idx} label="Drinkable/Small" type={`bandolier-${idx}`} />
              );
            })}
          </div>
        </div>

        {/* Backpack */}
        <div>
          <div className="text-xs text-gray-500 mb-1">
            Backpack ({myPlayer.inventory?.backpack?.length || 0}/{backpackCapacity})
          </div>
          <div className={`grid grid-cols-${backpackCapacity} gap-2`}>
            {Array.from({ length: backpackCapacity }).map((_, idx) => {
              const item = myPlayer.inventory?.backpack?.[idx];
              return item ? (
                <ItemCard key={idx} itemId={item} />
              ) : (
                <EmptySlot key={idx} label="Wearable/Holdable" type={`backpack-${idx}`} />
              );
            })}
          </div>
        </div>
      </div>

      {/* Capacity Warning */}
      {myPlayer.inventory && (
        (myPlayer.inventory.bandolier?.length > bandolierCapacity ||
         myPlayer.inventory.backpack?.length > backpackCapacity) && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-500 rounded-lg px-3 py-2 text-sm text-red-700 dark:text-red-300">
            ⚠️ Over capacity! Drop items at end of turn.
          </div>
        )
      )}
    </div>
  );
}