/**
 * Player class definitions
 * Each class has unique abilities and starting equipment
 * These can be easily edited to add new classes or modify existing ones
 */

import type { ClassDefinition } from '../types';

/**
 * All available player classes
 * Easily add or modify classes by editing this array
 */
export const PLAYER_CLASSES: ClassDefinition[] = [
  {
    name: 'Scout',
    icon: '🏹', // Placeholder emoji
    description: 'Swift and cautious, avoiding danger.',
    specialEffect: 'Immune to Trap items. You cannot be affected by traps placed on tiles.',
  },
  {
    name: 'Hunter',
    icon: '🎯', // Placeholder emoji
    description: 'Expert at hunting beasts and monsters.',
    specialEffect: '+1 Attack bonus when fighting Enemies (does not apply to player duels).',
  },
  {
    name: 'Gladiator',
    icon: '⚔️', // Placeholder emoji
    description: 'Trained in arena combat against other warriors.',
    specialEffect: '+1 Attack bonus when fighting other Players (does not apply to enemies).',
  },
  {
    name: 'Warden',
    icon: '🛡️', // Placeholder emoji
    description: 'Protector against creatures of the wild.',
    specialEffect: '+1 Defence bonus when fighting Enemies (does not apply to player duels).',
  },
  {
    name: 'Guard',
    icon: '🗡️', // Placeholder emoji
    description: 'Skilled defender in battles against foes.',
    specialEffect: '+1 Defence bonus when fighting other Players (does not apply to enemies).',
  },
  {
    name: 'Monk',
    icon: '🙏', // Placeholder emoji
    description: 'Blessed with divine resilience.',
    specialEffect: 'Once per game, when your HP would drop to 0, restore it to 1 HP instead. This effect expires after one use.',
  },
  {
    name: 'Porter',
    icon: '🎒', // Placeholder emoji
    description: 'Carries extra supplies for the journey.',
    specialEffect: '+1 slot for Carried Items (total of 5 slots instead of 4).',
  },
];

/**
 * Get class definition by name
 * @param className - The name of the class to retrieve
 * @returns The class definition or undefined if not found
 */
export function getClassByName(className: string): ClassDefinition | undefined {
  return PLAYER_CLASSES.find(c => c.name === className);
}
