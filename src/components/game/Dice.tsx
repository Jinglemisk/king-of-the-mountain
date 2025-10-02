/**
 * Dice component
 * Animated dice roller for movement and combat
 */

import { useState } from 'react';

interface DiceProps {
  sides: 4 | 6; // 4-sided for movement, 6-sided for combat
  value?: number; // Current dice value (if already rolled)
  onRoll?: (value: number) => void; // Callback when dice is rolled
  isRolling?: boolean; // Animation state
}

/**
 * Dice roller component with animation
 * @param sides - Number of sides (4 or 6)
 * @param value - Current value showing on dice
 * @param onRoll - Callback when roll completes
 * @param isRolling - Whether dice is currently rolling
 */
export function Dice({ sides, value, onRoll, isRolling = false }: DiceProps) {
  const [displayValue, setDisplayValue] = useState<number | null>(value || null);

  // Handle dice roll
  const handleRoll = () => {
    if (isRolling || !onRoll) return;

    // Roll the dice (1 to sides)
    const result = Math.floor(Math.random() * sides) + 1;

    // Animate (simplified - just show result after brief delay)
    setTimeout(() => {
      setDisplayValue(result);
      onRoll(result);
    }, 300);
  };

  return (
    <div className={`dice dice-${sides}${isRolling ? ' rolling' : ''}`} onClick={handleRoll}>
      <div className="dice-face">
        {displayValue !== null ? displayValue : '?'}
      </div>
      {sides === 4 && <div className="dice-label">d4</div>}
      {sides === 6 && <div className="dice-label">d6</div>}
    </div>
  );
}
