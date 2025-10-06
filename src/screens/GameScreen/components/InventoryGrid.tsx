/**
 * InventoryGrid Component
 * Displays player's carried items with drag-and-drop and trap placement
 */

import type { Item, Player } from '../../../types';
import { Card } from '../../../components/game/Card';
import { normalizeInventory } from '../../../utils/inventory';

interface InventoryGridProps {
  player: Player;
  isMyTurn: boolean;
  onDragStart: (item: Item, source: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDropOnInventory: (e: React.DragEvent) => void;
  onItemClick: (item: Item) => void;
  onUseTrap: (item: Item, index: number) => void;
}

export function InventoryGrid({
  player,
  isMyTurn,
  onDragStart,
  onDragOver,
  onDropOnInventory,
  onItemClick,
  onUseTrap,
}: InventoryGridProps) {
  // Always normalize inventory to ensure correct slot count
  const inventory = normalizeInventory(player.inventory, player.class);

  return (
    <div
      className="inventory-section"
      onDragOver={onDragOver}
      onDrop={onDropOnInventory}
    >
      <h3>Carried Items</h3>
      <div className="inventory-slots">
        {inventory.map((item, index) => (
          <div key={index} className="inventory-slot">
            {item ? (
              <div className="inventory-item-wrapper">
                <div
                  draggable
                  onDragStart={() => onDragStart(item, `inventory-${index}`)}
                  className="draggable-item"
                >
                  <Card
                    card={item}
                    type="treasure"
                    onClick={() => onItemClick(item)}
                  />
                </div>

                {/* Use button for trap items (only on player's turn) */}
                {item.special === 'trap' && isMyTurn && (
                  <button
                    className="use-item-btn"
                    onClick={() => onUseTrap(item, index)}
                    title="Place trap on current tile"
                  >
                    Place Trap
                  </button>
                )}
              </div>
            ) : (
              <div className="empty-slot">Empty</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
