/**
 * CardRevealModal component
 * Displays revealed cards (treasure, enemy, or Luck Cards) to the player
 * Supports showing multiple cards side-by-side
 */

import type { Item, Enemy, LuckCard } from '../../types';
import { Modal } from '../ui/Modal';
import { Card } from './Card';
import { Button } from '../ui/Button';

interface CardRevealModalProps {
  isOpen: boolean;
  cards: (Item | Enemy | LuckCard)[];
  cardType: 'treasure' | 'enemy' | 'luck';
  onClose: () => void;
  title?: string;
}

/**
 * Modal to reveal drawn cards to the player
 * @param isOpen - Whether modal is visible
 * @param cards - Array of cards to display
 * @param cardType - Type of cards being shown
 * @param onClose - Callback when modal is closed
 * @param title - Optional custom title
 */
export function CardRevealModal({
  isOpen,
  cards,
  cardType,
  onClose,
  title,
}: CardRevealModalProps) {
  if (!isOpen || cards.length === 0) {
    return null;
  }

  const defaultTitle = cardType === 'treasure'
    ? '📦 Treasure Found!'
    : cardType === 'enemy'
    ? '⚔️ Enemy Encounter!'
    : '🎲 Luck Card Drawn!';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || defaultTitle}
      size={cards.length > 1 ? 'large' : 'medium'}
      canClose={false}
    >
      <div className="card-reveal-modal">
        <div className={`cards-container ${cards.length > 1 ? 'multi-card' : 'single-card'}`}>
          {cards.map((card, index) => (
            <div key={card.id || index} className="revealed-card">
              <Card card={card} type={cardType} isRevealed={true} />
              <div className="card-details">
                <h3>{card.name}</h3>
                {'tier' in card && <p className="card-tier-label">Tier {card.tier}</p>}
                <p className="card-effect">
                  {'description' in card ? card.description : ''}
                  {'special' in card && card.special ? card.special : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <Button onClick={onClose} variant="primary" fullWidth>
            Continue
          </Button>
        </div>
      </div>
    </Modal>
  );
}
