/**
 * InventoryFullModal component
 * Shown when player needs to discard items due to inventory overflow
 * Player must choose which items to drop to make room for new items
 */

import type { Item } from '../../types';
import { Modal } from '../ui/Modal';
import { Card } from './Card';
import { Button } from '../ui/Button';
import { useState } from 'react';

interface InventoryFullModalProps {
  isOpen: boolean;
  currentItems: (Item | null)[];
  newItems: Item[];
  onDiscard: (itemsToKeep: (Item | null)[]) => void;
  maxSlots: number;
}

/**
 * Modal for handling inventory overflow
 * @param isOpen - Whether modal is visible
 * @param currentItems - Current inventory items (includes nulls for empty slots)
 * @param newItems - New items trying to be added
 * @param onDiscard - Callback with final items to keep
 * @param maxSlots - Maximum inventory slots available
 */
export function InventoryFullModal({
  isOpen,
  currentItems,
  newItems,
  onDiscard,
  maxSlots,
}: InventoryFullModalProps) {
  // Combine current non-null items with new items
  const allItems = [
    ...currentItems.filter((item): item is Item => item !== null),
    ...newItems,
  ];

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const handleConfirm = () => {
    // Keep only selected items, up to maxSlots
    const itemsToKeep = allItems.filter(item => selectedItems.has(item.id));

    // Pad with nulls to reach maxSlots
    const paddedItems: (Item | null)[] = [...itemsToKeep];
    while (paddedItems.length < maxSlots) {
      paddedItems.push(null);
    }

    onDiscard(paddedItems.slice(0, maxSlots));
  };

  const canConfirm = selectedItems.size <= maxSlots && selectedItems.size >= 0;
  const itemsToDiscard = allItems.length - selectedItems.size;

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
          <p>You have {allItems.length} items but can only carry {maxSlots}.</p>
          <p>Select up to {maxSlots} items to keep. The rest will be discarded.</p>
          <p className="selection-count">
            Selected: {selectedItems.size}/{maxSlots}
            {itemsToDiscard > 0 && ` (${itemsToDiscard} will be discarded)`}
          </p>
        </div>

        <div className="items-grid">
          {allItems.map((item) => {
            const isSelected = selectedItems.has(item.id);
            const isNewItem = newItems.some(newItem => newItem.id === item.id);

            return (
              <div
                key={item.id}
                className={`item-choice ${isSelected ? 'selected' : ''} ${isNewItem ? 'new-item' : ''}`}
                onClick={() => toggleItemSelection(item.id)}
              >
                <Card card={item} type="treasure" isRevealed={true} />
                <div className="item-status">
                  {isNewItem && <span className="badge new">NEW</span>}
                  {isSelected ? '✓ Keep' : '✗ Discard'}
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
