/**
 * Card component
 * Displays treasure, enemy, and luck cards
 */

import type { Item, Enemy, LuckCard } from '../../types';

interface CardProps {
  card: Item | Enemy | LuckCard | null;
  type: 'treasure' | 'enemy' | 'luck';
  isRevealed?: boolean;
  onClick?: () => void;
}

/**
 * Visual representation of a game card
 * @param card - The card data (Item, Enemy, or LuckCard)
 * @param type - Card type
 * @param isRevealed - Whether card is face-up
 * @param onClick - Click handler
 */
export function Card({ card, type, isRevealed = true, onClick }: CardProps) {
  if (!card) {
    return (
      <div className={`card card-${type} card-back`} onClick={onClick}>
        <div className="card-back-design">?</div>
      </div>
    );
  }

  // Show card back if not revealed
  if (!isRevealed) {
    return (
      <div className={`card card-${type} card-back`} onClick={onClick}>
        <div className="card-back-design">
          {type === 'treasure' && '📦'}
          {type === 'enemy' && '⚔️'}
          {type === 'luck' && '🎲'}
        </div>
      </div>
    );
  }

  // Render based on card type
  if (type === 'treasure' && 'tier' in card && !('maxHp' in card)) {
    const item = card as Item;
    return (
      <div className={`card card-treasure tier-${item.tier}`} onClick={onClick}>
        <div className="card-header">
          <span className="card-name">{item.name}</span>
          <span className="card-tier">T{item.tier}</span>
        </div>
        <div className="card-body">
          <div className="card-category">{item.category}</div>
          <div className="card-stats">
            {item.attackBonus && <span className="stat-attack">⚔️ +{item.attackBonus}</span>}
            {item.defenseBonus && <span className="stat-defense">🛡️ +{item.defenseBonus}</span>}
            {item.movementBonus && <span className="stat-movement">👟 {item.movementBonus > 0 ? '+' : ''}{item.movementBonus}</span>}
          </div>
          <div className="card-description">{item.description}</div>
        </div>
      </div>
    );
  }

  if (type === 'enemy' && 'maxHp' in card) {
    const enemy = card as Enemy;
    return (
      <div className={`card card-enemy tier-${enemy.tier}`} onClick={onClick}>
        <div className="card-header">
          <span className="card-name">{enemy.name}</span>
          <span className="card-tier">T{enemy.tier}</span>
        </div>
        <div className="card-body">
          <div className="card-stats">
            <span className="stat-hp">❤️ {enemy.hp}/{enemy.maxHp}</span>
            <span className="stat-attack">⚔️ +{enemy.attackBonus}</span>
            <span className="stat-defense">🛡️ {enemy.defenseBonus > 0 ? '+' : ''}{enemy.defenseBonus}</span>
          </div>
          {enemy.special && <div className="card-special">{enemy.special}</div>}
        </div>
      </div>
    );
  }

  if (type === 'luck') {
    const luck = card as LuckCard;
    return (
      <div className="card card-luck" onClick={onClick}>
        <div className="card-header">
          <span className="card-name">{luck.name}</span>
        </div>
        <div className="card-body">
          <div className="card-description">{luck.description}</div>
        </div>
      </div>
    );
  }

  return null;
}
