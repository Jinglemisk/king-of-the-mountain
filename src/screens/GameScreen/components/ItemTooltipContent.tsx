import type { Item } from '../../../types';

interface ItemTooltipContentProps {
  item: Item;
}

export function ItemTooltipContent({ item }: ItemTooltipContentProps) {
  const statBadges: string[] = [];

  if (item.attackBonus) {
    statBadges.push(`⚔️ +${item.attackBonus} Attack`);
  }
  if (item.defenseBonus) {
    statBadges.push(`🛡️ ${item.defenseBonus > 0 ? '+' : ''}${item.defenseBonus} Defense`);
  }
  if (item.movementBonus) {
    statBadges.push(`👟 ${item.movementBonus > 0 ? '+' : ''}${item.movementBonus} Movement`);
  }
  return (
    <div className="item-tooltip">
      <div className="item-tooltip__header">
        <span className="item-tooltip__name">{item.name}</span>
        <span className="item-tooltip__tier">Tier {item.tier}</span>
      </div>
      <div className="item-tooltip__category">{item.category}</div>
      {statBadges.length > 0 && (
        <div className="item-tooltip__stats">
          {statBadges.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      )}
      {item.description && (
        <p className="item-tooltip__description">{item.description}</p>
      )}
      {item.special && (
        <p className="item-tooltip__special">{item.special}</p>
      )}
    </div>
  );
}
