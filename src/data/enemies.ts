/**
 * Enemy card definitions
 * Enemies are organized by tier and drawn when players land on Enemy tiles
 * Easily editable - add/remove/modify enemies by editing the arrays below
 */

import type { Enemy } from '../types';
import { shuffleDeck } from '../utils/shuffle';

/**
 * Creates a new enemy instance with a unique ID
 * @param name - Enemy name
 * @param tier - Enemy tier (1, 2, or 3)
 * @param maxHp - Maximum hit points
 * @param attackBonus - Attack modifier
 * @param defenseBonus - Defense modifier
 * @param special - Optional special ability description
 * @returns A new Enemy object
 */
function createEnemy(
  name: string,
  tier: 1 | 2 | 3,
  maxHp: number,
  attackBonus: number,
  defenseBonus: number,
  special?: string
): Enemy {
  const enemy: Enemy = {
    id: `${name}-${Date.now()}-${Math.random()}`, // Unique ID
    name,
    tier,
    hp: maxHp,
    maxHp,
    attackBonus,
    defenseBonus,
  };

  // Only include special field if it has a value
  if (special !== undefined) {
    enemy.special = special;
  }

  return enemy;
}

/**
 * TIER 1 ENEMIES (approx 18 total)
 * Weak enemies encountered early in the game
 */
export const TIER_1_ENEMIES = [
  // Goblin: HP 1, Atk +1, Def +0 (6 copies)
  () => createEnemy('Goblin', 1, 1, 1, 0),
  () => createEnemy('Goblin', 1, 1, 1, 0),
  () => createEnemy('Goblin', 1, 1, 1, 0),
  () => createEnemy('Goblin', 1, 1, 1, 0),
  () => createEnemy('Goblin', 1, 1, 1, 0),
  () => createEnemy('Goblin', 1, 1, 1, 0),

  // Wolf: HP 1, Atk +2, Def -1 (4 copies)
  () => createEnemy('Wolf', 1, 1, 2, -1),
  () => createEnemy('Wolf', 1, 1, 2, -1),
  () => createEnemy('Wolf', 1, 1, 2, -1),
  () => createEnemy('Wolf', 1, 1, 2, -1),

  // Skeleton: HP 1, Atk +1, Def +1 (4 copies)
  () => createEnemy('Skeleton', 1, 1, 1, 1),
  () => createEnemy('Skeleton', 1, 1, 1, 1),
  () => createEnemy('Skeleton', 1, 1, 1, 1),
  () => createEnemy('Skeleton', 1, 1, 1, 1),

  // Bandit: HP 1, Atk +1, Def +0 (4 copies)
  () => createEnemy('Bandit', 1, 1, 1, 0),
  () => createEnemy('Bandit', 1, 1, 1, 0),
  () => createEnemy('Bandit', 1, 1, 1, 0),
  () => createEnemy('Bandit', 1, 1, 1, 0),
];

/**
 * TIER 2 ENEMIES (approx 12 total)
 * Medium difficulty enemies
 */
export const TIER_2_ENEMIES = [
  // Orc: HP 2, Atk +2, Def +1 (4 copies)
  () => createEnemy('Orc', 2, 2, 2, 1),
  () => createEnemy('Orc', 2, 2, 2, 1),
  () => createEnemy('Orc', 2, 2, 2, 1),
  () => createEnemy('Orc', 2, 2, 2, 1),

  // Troll: HP 2, Atk +3, Def 0 (4 copies)
  () => createEnemy('Troll', 2, 2, 3, 0),
  () => createEnemy('Troll', 2, 2, 3, 0),
  () => createEnemy('Troll', 2, 2, 3, 0),
  () => createEnemy('Troll', 2, 2, 3, 0),

  // Cultist: HP 2, Atk +1, Def +2 (2 copies)
  () => createEnemy('Cultist', 2, 2, 1, 2),
  () => createEnemy('Cultist', 2, 2, 1, 2),

  // Ogre: HP 3, Atk +2, Def +1 (2 copies)
  () => createEnemy('Ogre', 2, 3, 2, 1),
  () => createEnemy('Ogre', 2, 3, 2, 1),
];

/**
 * TIER 3 ENEMIES (approx 10 total)
 * Powerful late-game enemies
 */
export const TIER_3_ENEMIES = [
  // Dragon Whelp: HP 3, Atk +3, Def +2 (3 copies)
  () => createEnemy('Dragon Whelp', 3, 3, 3, 2),
  () => createEnemy('Dragon Whelp', 3, 3, 3, 2),
  () => createEnemy('Dragon Whelp', 3, 3, 3, 2),

  // Lich: HP 3, Atk +2, Def +3 (2 copies)
  () => createEnemy('Lich', 3, 3, 2, 3),
  () => createEnemy('Lich', 3, 3, 2, 3),

  // Demon: HP 4, Atk +3, Def +1 (2 copies)
  () => createEnemy('Demon', 3, 4, 3, 1),
  () => createEnemy('Demon', 3, 4, 3, 1),

  // Giant: HP 4, Atk +2, Def +2 (3 copies)
  () => createEnemy('Giant', 3, 4, 2, 2),
  () => createEnemy('Giant', 3, 4, 2, 2),
  () => createEnemy('Giant', 3, 4, 2, 2),
];

/**
 * Build a shuffled enemy deck for a given tier
 * @param tier - The enemy tier (1, 2, or 3)
 * @returns Shuffled array of Enemy objects
 */
export function buildEnemyDeck(tier: 1 | 2 | 3): Enemy[] {
  let enemyFactories: (() => Enemy)[];

  if (tier === 1) {
    enemyFactories = TIER_1_ENEMIES;
  } else if (tier === 2) {
    enemyFactories = TIER_2_ENEMIES;
  } else {
    enemyFactories = TIER_3_ENEMIES;
  }

  // Create instances and shuffle
  const deck = enemyFactories.map(factory => factory());
  return shuffleDeck(deck);
}

/**
 * Determine which enemies to draw for an Enemy tile
 * @param tier - Tile tier (1, 2, or 3)
 * @returns Description of enemy composition to draw
 */
export function getEnemyComposition(tier: 1 | 2 | 3): { tier: 1 | 2 | 3; count: number }[] {
  if (tier === 1) {
    // Tier 1 tile (E1): Draw 1× T1 enemy
    return [{ tier: 1, count: 1 }];
  } else if (tier === 2) {
    // Tier 2 tile (E2): 70% draw 2× T1; 30% draw 1× T2
    const roll = Math.random();
    if (roll < 0.7) {
      return [{ tier: 1, count: 2 }];
    } else {
      return [{ tier: 2, count: 1 }];
    }
  } else {
    // Tier 3 tile (E3): 70% draw 2× T2; 20% draw 1× T2 + 1× T1; 10% draw 1× T3
    const roll = Math.random();
    if (roll < 0.7) {
      return [{ tier: 2, count: 2 }];
    } else if (roll < 0.9) {
      return [{ tier: 2, count: 1 }, { tier: 1, count: 1 }];
    } else {
      return [{ tier: 3, count: 1 }];
    }
  }
}
