/**
 * InventoryFullModal component
 * Shown when player needs to discard items due to inventory overflow
 * Player must choose which items to drop to make room for new items
 * Players can also equip items directly in this modal
 */

import type { Item, Equipment } from '../../types';
import { Modal } from '../ui/Modal';
import { Card } from './Card';
import { Button } from '../ui/Button';
import { useState } from 'react';

interface InventoryFullModalProps {
  isOpen: boolean;
  currentItems: (Item | null)[];
  newItems: Item[];
  equipment: Equipment;
  onDiscard: (itemsToKeep: (Item | null)[], updatedEquipment: Equipment) => void;
  maxSlots: number;
}

/**
 * Modal for handling inventory overflow
 * @param isOpen - Whether modal is visible
 * @param currentItems - Current inventory items (includes nulls for empty slots)
 * @param newItems - New items trying to be added
 * @param equipment - Current equipment state
 * @param onDiscard - Callback with final items to keep and updated equipment
 * @param maxSlots - Maximum inventory slots available
 */
export function InventoryFullModal({
  isOpen,
  currentItems,
  newItems,
  equipment,
  onDiscard,
  maxSlots,
}: InventoryFullModalProps) {
  // Combine current non-null items with new items
  const allItems = [
    ...currentItems.filter((item): item is Item => item !== null),
    ...newItems,
  ];

  // Initialize equipment with defaults if not provided
  const defaultEquipment: Equipment = {
    holdable1: null,
    holdable2: null,
    wearable: null,
  };

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [tempEquipment, setTempEquipment] = useState<Equipment>(equipment || defaultEquipment);

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  // Check if item can be equipped in slot
  const canEquipInSlot = (item: Item, slot: 'holdable1' | 'holdable2' | 'wearable'): boolean => {
    if (slot === 'wearable') return item.category === 'wearable';
    return item.category === 'holdable';
  };

  // Handle equipping an item
  const handleEquipItem = (item: Item, slot: 'holdable1' | 'holdable2' | 'wearable') => {
    if (!canEquipInSlot(item, slot)) return;

    // If slot occupied, unequip that item first (remove from equipped, doesn't auto-select)
    if (tempEquipment[slot]) {
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(tempEquipment[slot]!.id);
        return newSet;
      });
    }

    // Equip new item (remove from selection pool)
    setTempEquipment(prev => ({ ...prev, [slot]: item }));
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(item.id);
      return newSet;
    });
  };

  // Handle unequipping an item
  const handleUnequipItem = (slot: 'holdable1' | 'holdable2' | 'wearable') => {
    const item = tempEquipment[slot];
    if (!item) return;

    setTempEquipment(prev => ({ ...prev, [slot]: null }));
    // Item goes back to available pool (not auto-selected)
  };

  const handleConfirm = () => {
    // Keep items that are selected for backpack BUT NOT equipped
    // Equipped items go only to equipment slots, not backpack
    const itemsToKeep = allItems.filter(item => {
      const isEquipped = Object.values(tempEquipment).some(eq => eq?.id === item.id);
      return selectedItems.has(item.id) && !isEquipped;
    });

    // Pad with nulls to reach maxSlots
    const paddedItems: (Item | null)[] = [...itemsToKeep];
    while (paddedItems.length < maxSlots) {
      paddedItems.push(null);
    }

    onDiscard(paddedItems.slice(0, maxSlots), tempEquipment);
  };

  const equippedCount = Object.values(tempEquipment).filter(item => item !== null).length;
  const canConfirm = selectedItems.size <= maxSlots;
  const itemsToDiscard = allItems.length - selectedItems.size - equippedCount;

  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      title="⚠️ Inventory Full!"
      size="large"
      canClose={false}
    >
      <div className="inventory-full-modal">
        <div className="modal-message">
          <p>
            Your inventory is full! You have {currentItems.filter(i => i !== null).length} items
            {newItems.length > 0 && ` and found ${newItems.length} new item${newItems.length > 1 ? 's' : ''}`}.
          </p>
          <p>You can only carry {maxSlots} items total in your backpack.</p>
          <p>Select items to keep in backpack, or equip them. Equipped items don't use backpack slots!</p>
          <p className="selection-count">
            Backpack: {selectedItems.size}/{maxSlots} | Equipped: {equippedCount}/3 | Total keeping: {selectedItems.size + equippedCount}
            {itemsToDiscard > 0 && ` (${itemsToDiscard} will be discarded)`}
          </p>
        </div>

        <div className="equipment-preview">
          <h4>Equipment Slots</h4>
          <div className="equipment-mini-slots">
            {/* Hand 1 */}
            <div className="mini-slot" onClick={() => handleUnequipItem('holdable1')}>
              <label>Hand 1</label>
              {tempEquipment.holdable1 ? (
                <Card card={tempEquipment.holdable1} type="treasure" isRevealed={true} />
              ) : (
                <div className="empty-mini-slot">Empty</div>
              )}
            </div>

            {/* Hand 2 */}
            <div className="mini-slot" onClick={() => handleUnequipItem('holdable2')}>
              <label>Hand 2</label>
              {tempEquipment.holdable2 ? (
                <Card card={tempEquipment.holdable2} type="treasure" isRevealed={true} />
              ) : (
                <div className="empty-mini-slot">Empty</div>
              )}
            </div>

            {/* Armor */}
            <div className="mini-slot" onClick={() => handleUnequipItem('wearable')}>
              <label>Armor</label>
              {tempEquipment.wearable ? (
                <Card card={tempEquipment.wearable} type="treasure" isRevealed={true} />
              ) : (
                <div className="empty-mini-slot">Empty</div>
              )}
            </div>
          </div>
        </div>

        <div className="items-grid">
          {allItems.map((item) => {
            const isSelected = selectedItems.has(item.id);
            const isEquipped = Object.values(tempEquipment).some(eq => eq?.id === item.id);
            const isNewItem = newItems.some(newItem => newItem.id === item.id);
            const canEquip = item.category === 'holdable' || item.category === 'wearable';

            return (
              <div
                key={item.id}
                className={`item-choice ${isSelected ? 'selected' : ''} ${isEquipped ? 'equipped' : ''} ${isNewItem ? 'new-item' : ''}`}
              >
                <Card card={item} type="treasure" isRevealed={true} />

                <div className="item-actions">
                  {isNewItem && <span className="badge new">NEW</span>}

                  {isEquipped ? (
                    <span className="status equipped">⚡ Equipped</span>
                  ) : (
                    <>
                      <button
                        onClick={() => toggleItemSelection(item.id)}
                        className="action-btn"
                      >
                        {isSelected ? '✓ Keep' : '✗ Discard'}
                      </button>

                      {canEquip && (
                        <div className="equip-options">
                          {item.category === 'holdable' && (
                            <>
                              <button onClick={() => handleEquipItem(item, 'holdable1')} className="equip-btn">
                                Equip Hand 1
                              </button>
                              <button onClick={() => handleEquipItem(item, 'holdable2')} className="equip-btn">
                                Equip Hand 2
                              </button>
                            </>
                          )}
                          {item.category === 'wearable' && (
                            <button onClick={() => handleEquipItem(item, 'wearable')} className="equip-btn">
                              Equip Armor
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="modal-actions">
          <Button
            onClick={handleConfirm}
            variant="primary"
            fullWidth
            disabled={!canConfirm}
          >
            Confirm Selection
          </Button>
        </div>
      </div>
    </Modal>
  );
}
