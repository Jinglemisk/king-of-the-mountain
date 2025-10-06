/**
 * JinnThiefModal component
 * Shown when Jinn Thief Luck Card is drawn
 * Player must choose one item to discard (stolen by Jinn)
 */

import type { Item, Player } from '../../types';
import { Modal } from '../ui/Modal';
import { Card } from './Card';
import { Button } from '../ui/Button';
import { useState } from 'react';

interface JinnThiefModalProps {
  isOpen: boolean;
  player: Player;
  onSelectItem: (itemId: string) => void;
}

/**
 * Modal for Jinn Thief item selection
 * @param isOpen - Whether modal is visible
 * @param player - The player who must choose an item to lose
 * @param onSelectItem - Callback with selected item ID to steal
 */
export function JinnThiefModal({
  isOpen,
  player,
  onSelectItem,
}: JinnThiefModalProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Collect all items from inventory and equipment
  const allItems: { item: Item; source: string }[] = [];

  // Add inventory items
  player.inventory?.forEach((item, index) => {
    if (item !== null) {
      allItems.push({ item, source: `Inventory Slot ${index + 1}` });
    }
  });

  // Add equipment items
  if (player.equipment?.holdable1) {
    allItems.push({ item: player.equipment.holdable1, source: 'Holdable 1' });
  }
  if (player.equipment?.holdable2) {
    allItems.push({ item: player.equipment.holdable2, source: 'Holdable 2' });
  }
  if (player.equipment?.wearable) {
    allItems.push({ item: player.equipment.wearable, source: 'Wearable' });
  }

  const handleConfirm = () => {
    if (selectedItemId) {
      onSelectItem(selectedItemId);
      setSelectedItemId(null);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      title="👻 Jinn Thief!"
      size="large"
      canClose={false}
    >
      <div className="jinn-thief-modal">
        <div className="modal-message">
          <p>A Jinn Thief has appeared and will steal one of your items!</p>
          <p>Choose one item to lose:</p>
        </div>

        <div className="items-grid">
          {allItems.map(({ item, source }) => {
            const isSelected = selectedItemId === item.id;

            return (
              <div
                key={item.id}
                className={`item-choice ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedItemId(item.id)}
              >
                <Card card={item} type="treasure" isRevealed={true} />
                <div className="item-status">
                  <span className="badge source">{source}</span>
                  {isSelected && <span className="selected-indicator">✓ Selected</span>}
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
            disabled={!selectedItemId}
          >
            Discard Selected Item
          </Button>
        </div>
      </div>
    </Modal>
  );
}
