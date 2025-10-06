/**
 * EquipmentSlots Component
 * Displays and manages player's equipped items (Holdable x2, Wearable x1)
 */

import type { Equipment, Item } from '../../../types';
import { Card } from '../../../components/game/Card';

interface EquipmentSlotsProps {
  equipment: Equipment;
  draggedItem: { item: Item; source: string } | null;
  canEquipItemInSlot: (item: Item, slot: 'holdable1' | 'holdable2' | 'wearable') => boolean;
  onDragStart: (item: Item, source: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, slot: 'holdable1' | 'holdable2' | 'wearable') => void;
  onItemClick: (item: Item) => void;
}

export function EquipmentSlots({
  equipment,
  draggedItem,
  canEquipItemInSlot,
  onDragStart,
  onDragOver,
  onDrop,
  onItemClick,
}: EquipmentSlotsProps) {
  return (
    <div className="equipment-section">
      <h3>Equipped Items</h3>
      <div className="equipment-slots">
        {/* Holdable slot 1 */}
        <div
          className={`equipment-slot ${draggedItem && canEquipItemInSlot(draggedItem.item, 'holdable1') ? 'drop-zone-valid' : ''} ${draggedItem && !canEquipItemInSlot(draggedItem.item, 'holdable1') && draggedItem.source !== 'equipment-holdable1' ? 'drop-zone-invalid' : ''}`}
          onDragOver={onDragOver}
          onDrop={(e) => onDrop(e, 'holdable1')}
        >
          <label>Hand 1</label>
          {equipment.holdable1 ? (
            <div
              draggable
              onDragStart={() => onDragStart(equipment.holdable1!, 'equipment-holdable1')}
              className="draggable-item"
            >
              <Card
                card={equipment.holdable1}
                type="treasure"
                onClick={() => onItemClick(equipment.holdable1!)}
              />
            </div>
          ) : (
            <div className="empty-slot">Empty</div>
          )}
        </div>

        {/* Holdable slot 2 */}
        <div
          className={`equipment-slot ${draggedItem && canEquipItemInSlot(draggedItem.item, 'holdable2') ? 'drop-zone-valid' : ''} ${draggedItem && !canEquipItemInSlot(draggedItem.item, 'holdable2') && draggedItem.source !== 'equipment-holdable2' ? 'drop-zone-invalid' : ''}`}
          onDragOver={onDragOver}
          onDrop={(e) => onDrop(e, 'holdable2')}
        >
          <label>Hand 2</label>
          {equipment.holdable2 ? (
            <div
              draggable
              onDragStart={() => onDragStart(equipment.holdable2!, 'equipment-holdable2')}
              className="draggable-item"
            >
              <Card
                card={equipment.holdable2}
                type="treasure"
                onClick={() => onItemClick(equipment.holdable2!)}
              />
            </div>
          ) : (
            <div className="empty-slot">Empty</div>
          )}
        </div>

        {/* Wearable slot */}
        <div
          className={`equipment-slot ${draggedItem && canEquipItemInSlot(draggedItem.item, 'wearable') ? 'drop-zone-valid' : ''} ${draggedItem && !canEquipItemInSlot(draggedItem.item, 'wearable') && draggedItem.source !== 'equipment-wearable' ? 'drop-zone-invalid' : ''}`}
          onDragOver={onDragOver}
          onDrop={(e) => onDrop(e, 'wearable')}
        >
          <label>Armor</label>
          {equipment.wearable ? (
            <div
              draggable
              onDragStart={() => onDragStart(equipment.wearable!, 'equipment-wearable')}
              className="draggable-item"
            >
              <Card
                card={equipment.wearable}
                type="treasure"
                onClick={() => onItemClick(equipment.wearable!)}
              />
            </div>
          ) : (
            <div className="empty-slot">Empty</div>
          )}
        </div>
      </div>
    </div>
  );
}
