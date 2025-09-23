interface DiceRollProps {
  type: 'd4' | 'd6';
  value: number;
  animated?: boolean;
}

export function DiceRoll({ type, value, animated = false }: DiceRollProps) {
  const getDiceFace = () => {
    if (animated || value === 0) {
      return '?';
    }

    // Unicode dice faces for d6
    const d6Faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

    if (type === 'd6' && value >= 1 && value <= 6) {
      return d6Faces[value - 1];
    }

    // For d4, just show the number
    return value.toString();
  };

  return (
    <div
      className={`
        inline-flex items-center justify-center
        w-12 h-12 rounded-lg border-2 border-gray-600
        bg-white dark:bg-gray-800 text-2xl font-bold
        ${animated ? 'animate-dice-roll' : ''}
        ${type === 'd4' ? 'text-blue-600' : 'text-red-600'}
      `}
      role="img"
      aria-label={`${type} showing ${value}`}
    >
      {getDiceFace()}
    </div>
  );
}