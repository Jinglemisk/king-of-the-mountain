/**
 * Array shuffling utilities
 */

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param deck - Array to shuffle
 * @returns New shuffled array (does not mutate original)
 */
export function shuffleDeck<T>(deck: T[]): T[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
