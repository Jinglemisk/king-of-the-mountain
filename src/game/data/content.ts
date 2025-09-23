import type {
  Tier, ItemCategory,
  EnemyInstance, ItemInstance
} from '../types';
import { generateUID } from '../util/rng';

// Using string types instead of specific ID types that don't exist
export interface ClassDefinition {
  id: string;
  name: string;
  passive: string;
  startItems?: string[];
}

export interface ItemDefinition {
  id: string;
  name: string;
  category: ItemCategory;
  tier: Tier;
  tags?: string[];
  rulesText?: string;
  attackBonus?: number;
  defenseBonus?: number;
  movementBonus?: number;
  healAmount?: number;
  copies: number;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  tier: Tier;
  hp: number;
  attack: number;
  defense: number;
  tags: string[];
}

export interface ChanceDefinition {
  id: string;
  name: string;
  rulesText: string;
  tier: Tier;
  copies: number;
}

export const CLASSES: Record<string, ClassDefinition> = {
  'scout': {
    id: 'scout',
    name: 'Scout',
    passive: 'Ignores Ambush and Trap effects'
  },
  'hunter': {
    id: 'hunter',
    name: 'Hunter',
    passive: '+1 Attack vs creatures'
  },
  'guardian': {
    id: 'guardian',
    name: 'Guardian',
    passive: '+1 Defense vs creatures'
  },
  'duelist': {
    id: 'duelist',
    name: 'Duelist',
    passive: '+1 Attack in duels; once per duel may reroll your Defense die'
  },
  'alchemist': {
    id: 'alchemist',
    name: 'Alchemist',
    passive: '+1 Bandolier capacity; Potions heal +1; This-turn potions extend to first combat round'
  },
  'monk': {
    id: 'monk',
    name: 'Monk',
    passive: 'Once per game when offered a duel: roll d6, on 5-6 cancel it'
  },
  'raider': {
    id: 'raider',
    name: 'Raider',
    passive: 'After winning a fight or duel: roll d6, on 5-6 draw 1 Treasure'
  },
  'porter': {
    id: 'porter',
    name: 'Porter',
    passive: '+1 Backpack capacity'
  }
};

export const TREASURES: Record<string, ItemDefinition> = {
  'dagger': {
    id: 'dagger',
    name: 'Dagger',
    category: 'holdable',
    tier: 1,
    tags: ['weapon'],
    attackBonus: 1,
    rulesText: '+1 Attack',
    copies: 3
  },
  'wooden-shield': {
    id: 'wooden-shield',
    name: 'Wooden Shield',
    category: 'holdable',
    tier: 1,
    tags: ['shield'],
    defenseBonus: 1,
    rulesText: '+1 Defense',
    copies: 3
  },
  'healing-potion': {
    id: 'healing-potion',
    name: 'Healing Potion',
    category: 'drinkable',
    tier: 1,
    tags: ['potion'],
    healAmount: 3,
    rulesText: 'Drink to heal 3 HP (Alchemist: 4 HP)',
    copies: 4
  },
  'beer': {
    id: 'beer',
    name: 'Beer',
    category: 'drinkable',
    tier: 1,
    tags: ['potion'],
    healAmount: 1,
    rulesText: 'Drink to heal 1 HP',
    copies: 3
  },
  'ambush': {
    id: 'ambush',
    name: 'Ambush',
    category: 'small',
    tier: 1,
    tags: ['trap'],
    rulesText: 'Play when someone enters your tile to send them to Start (Scout immune)',
    copies: 2
  },
  'lamp': {
    id: 'lamp',
    name: 'Lamp',
    category: 'small',
    tier: 1,
    tags: ['utility'],
    rulesText: 'Use before resolving a tile to step back 1 space',
    copies: 2
  },
  'lords-sword': {
    id: 'lords-sword',
    name: "Lord's Sword",
    category: 'holdable',
    tier: 2,
    tags: ['weapon'],
    attackBonus: 2,
    rulesText: '+2 Attack',
    copies: 2
  },
  'silver-shield': {
    id: 'silver-shield',
    name: 'Silver Shield',
    category: 'holdable',
    tier: 2,
    tags: ['shield'],
    defenseBonus: 2,
    rulesText: '+2 Defense',
    copies: 2
  },
  'heirloom-armor': {
    id: 'heirloom-armor',
    name: 'Heirloom Armor',
    category: 'wearable',
    tier: 2,
    tags: ['armor'],
    defenseBonus: 2,
    rulesText: '+2 Defense',
    copies: 2
  },
  'rage-potion': {
    id: 'rage-potion',
    name: 'Rage Potion',
    category: 'drinkable',
    tier: 2,
    tags: ['potion'],
    rulesText: 'Drink for +1 Attack this turn',
    copies: 2
  },
  'agility-draught': {
    id: 'agility-draught',
    name: 'Agility Draught',
    category: 'drinkable',
    tier: 2,
    tags: ['potion'],
    rulesText: 'Drink for +1 Defense this turn',
    copies: 2
  },
  'boogey-bane': {
    id: 'boogey-bane',
    name: 'Boogey Bane',
    category: 'holdable',
    tier: 2,
    tags: ['weapon'],
    attackBonus: 2,
    rulesText: '+2 Attack vs creatures only',
    copies: 2
  },
  'smoke-bomb': {
    id: 'smoke-bomb',
    name: 'Smoke Bomb',
    category: 'drinkable',
    tier: 2,
    tags: ['interrupt'],
    rulesText: 'Play when offered a duel to prevent all duels this turn',
    copies: 2
  },
  'instinct': {
    id: 'instinct',
    name: 'Instinct',
    category: 'small',
    tier: 2,
    tags: ['utility'],
    rulesText: 'When entering an Enemy tile: roll d6, on 4-6 skip the fight',
    copies: 2
  },
  'wardstone': {
    id: 'wardstone',
    name: 'Wardstone',
    category: 'small',
    tier: 2,
    tags: ['passive'],
    rulesText: 'Prevent the next 1 HP loss, then discard',
    copies: 2
  },
  'dragonfang': {
    id: 'dragonfang',
    name: 'Dragonfang',
    category: 'holdable',
    tier: 3,
    tags: ['weapon'],
    attackBonus: 3,
    rulesText: '+3 Attack',
    copies: 1
  },
  'royal-aegis': {
    id: 'royal-aegis',
    name: 'Royal Aegis',
    category: 'holdable',
    tier: 3,
    tags: ['shield'],
    defenseBonus: 3,
    rulesText: '+3 Defense',
    copies: 1
  },
  'fairy-dust': {
    id: 'fairy-dust',
    name: 'Fairy Dust',
    category: 'drinkable',
    tier: 3,
    tags: ['potion'],
    rulesText: 'Invisible until next turn (cannot be dueled)',
    copies: 1
  }
};

export const ENEMIES: Record<string, EnemyDefinition> = {
  'goblin': {
    id: 'goblin',
    name: 'Goblin',
    tier: 1,
    hp: 1,
    attack: 1,
    defense: 0,
    tags: ['creature']
  },
  'skeleton': {
    id: 'skeleton',
    name: 'Skeleton',
    tier: 1,
    hp: 1,
    attack: 1,
    defense: 1,
    tags: ['creature', 'undead']
  },
  'bandit': {
    id: 'bandit',
    name: 'Bandit',
    tier: 1,
    hp: 1,
    attack: 1,
    defense: 1,
    tags: ['creature', 'humanoid']
  },
  'wolf': {
    id: 'wolf',
    name: 'Wolf',
    tier: 2,
    hp: 1,
    attack: 2,
    defense: -1,
    tags: ['creature', 'beast']
  },
  'orc': {
    id: 'orc',
    name: 'Orc',
    tier: 2,
    hp: 2,
    attack: 2,
    defense: 1,
    tags: ['creature', 'humanoid']
  },
  'troll': {
    id: 'troll',
    name: 'Troll',
    tier: 3,
    hp: 2,
    attack: 3,
    defense: 0,
    tags: ['creature']
  },
  'dragon-whelp': {
    id: 'dragon-whelp',
    name: 'Dragon Whelp',
    tier: 3,
    hp: 3,
    attack: 3,
    defense: 2,
    tags: ['creature', 'dragon']
  }
};

export const CHANCE_CARDS: Record<string, ChanceDefinition> = {
  'white-bearded-spirit': {
    id: 'white-bearded-spirit',
    name: 'White-Bearded Spirit',
    rulesText: 'Move forward 6 spaces',
    tier: 1,
    copies: 2
  },
  'wind-of-fate': {
    id: 'wind-of-fate',
    name: 'Wind of Fate',
    rulesText: 'Roll d6: 1-3 move back 3 spaces, 4-6 move forward 3 spaces',
    tier: 1,
    copies: 2
  },
  'treasure-hoard': {
    id: 'treasure-hoard',
    name: 'Treasure Hoard',
    rulesText: 'Draw 2 Treasures from any tier',
    tier: 2,
    copies: 1
  },
  'divine-blessing': {
    id: 'divine-blessing',
    name: 'Divine Blessing',
    rulesText: 'Heal to full HP',
    tier: 2,
    copies: 2
  },
  'shadow-step': {
    id: 'shadow-step',
    name: 'Shadow Step',
    rulesText: 'Move to the tile of the nearest player',
    tier: 2,
    copies: 2
  },
  'black-hole': {
    id: 'black-hole',
    name: 'Black Hole',
    rulesText: 'Everyone moves back d4 spaces',
    tier: 2,
    copies: 1
  },
  'duel-of-fates': {
    id: 'duel-of-fates',
    name: 'Duel of Fates',
    rulesText: 'Immediately duel the nearest player',
    tier: 3,
    copies: 1
  },
  'time-warp': {
    id: 'time-warp',
    name: 'Time Warp',
    rulesText: 'Skip your next turn',
    tier: 1,
    copies: 2
  }
};

export function createItemInstance(itemId: string): ItemInstance {
  const def = TREASURES[itemId];
  if (!def) throw new Error(`Unknown item: ${itemId}`);

  return {
    instanceId: generateUID(),
    defId: itemId
  };
}

export function createEnemyInstance(enemyId: string): EnemyInstance {
  const def = ENEMIES[enemyId];
  if (!def) throw new Error(`Unknown enemy: ${enemyId}`);

  return {
    instanceId: generateUID(),
    defId: enemyId,
    currentHp: def.hp
  };
}

export function getEnemyComposition(tier: Tier): string[] {
  switch (tier) {
    case 1:
      const t1Options: string[][] = [
        ['goblin'],
        ['skeleton'],
        ['bandit'],
        ['goblin', 'skeleton']
      ];
      return t1Options[Math.floor(Math.random() * t1Options.length)];

    case 2:
      const t2Options: string[][] = [
        ['wolf'],
        ['orc'],
        ['wolf', 'bandit'],
        ['orc', 'goblin']
      ];
      return t2Options[Math.floor(Math.random() * t2Options.length)];

    case 3:
      const t3Options: string[][] = [
        ['troll'],
        ['dragon-whelp'],
        ['troll', 'orc'],
        ['dragon-whelp']
      ];
      return t3Options[Math.floor(Math.random() * t3Options.length)];

    default:
      return ['goblin'];
  }
}

export function getTreasureDeck(tier: Tier): string[] {
  const deck: string[] = [];

  for (const [id, def] of Object.entries(TREASURES)) {
    if (def.tier === tier) {
      for (let i = 0; i < def.copies; i++) {
        deck.push(id);
      }
    }
  }

  return deck;
}

export function getChanceDeck(): string[] {
  const deck: string[] = [];

  for (const [id, def] of Object.entries(CHANCE_CARDS)) {
    for (let i = 0; i < def.copies; i++) {
      deck.push(id);
    }
  }

  return deck;
}

export function getEnemyDeck(tier: Tier): string[] {
  const deck: string[] = [];
  const enemiesInTier = Object.values(ENEMIES).filter(e => e.tier === tier);

  for (const enemy of enemiesInTier) {
    for (let i = 0; i < 3; i++) {
      deck.push(enemy.id);
    }
  }

  return deck;
}

// Export BOARD from engine for UI components
export { BOARD } from '../engine/board';

// ITEMS is an alias for TREASURES for UI compatibility
export const ITEMS = TREASURES;