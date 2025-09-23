import { useState } from 'react';
import { DiceRoll } from './DiceRoll';

// Simplified combat state for UI
interface CombatState {
  round: number;
  enemies: Array<{
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    attackBonus: number;
    defenseBonus: number;
  }>;
  player: {
    hp: number;
    maxHp: number;
    attackBonus?: number;
    defenseBonus?: number;
  };
}

interface CombatPanelProps {
  combat: CombatState;
}

export function CombatPanel({ combat }: CombatPanelProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [lastRound, setLastRound] = useState<any>(null);

  const handleSelectTarget = (enemyId: string) => {
    setSelectedTarget(enemyId);
    console.log('Select target:', enemyId);
    // Dispatch select target action
  };

  const handleAdvanceRound = () => {
    console.log('Advance combat round');
    // Dispatch advance round action
    // Simulate dice rolls for demo
    setLastRound({
      playerAttack: Math.floor(Math.random() * 6) + 1,
      playerDefense: Math.floor(Math.random() * 6) + 1,
      enemyAttack: Math.floor(Math.random() * 6) + 1,
      enemyDefense: Math.floor(Math.random() * 6) + 1,
    });
  };

  const handleRetreat = () => {
    console.log('Retreat from combat');
    // Dispatch retreat action
  };

  const handleUsePotion = (itemId: string) => {
    console.log('Use potion:', itemId);
    // Dispatch use potion action
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-red-600 text-white px-6 py-4 rounded-t-lg">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            ⚔️ COMBAT - Round {combat.round}
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Enemy Queue */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
              Enemies
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {combat.enemies.map((enemy) => (
                <div
                  key={enemy.id}
                  className={`
                    border-2 rounded-lg p-3 cursor-pointer transition-all
                    ${selectedTarget === enemy.id
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/30'
                      : 'border-gray-300 dark:border-gray-600 hover:border-red-400'
                    }
                    ${enemy.hp <= 0 ? 'opacity-50 line-through' : ''}
                  `}
                  onClick={() => enemy.hp > 0 && handleSelectTarget(enemy.id)}
                >
                  <div className="font-semibold text-gray-800 dark:text-white">
                    {enemy.name}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    HP: {enemy.hp}/{enemy.maxHp}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Atk: +{enemy.attackBonus} | Def: +{enemy.defenseBonus}
                  </div>
                  {selectedTarget === enemy.id && (
                    <div className="text-xs text-red-600 dark:text-red-400 mt-2">
                      🎯 TARGET
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Combat Stats */}
          <div className="grid grid-cols-2 gap-4">
            {/* Player Stats */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                Your Stats
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>HP:</span>
                  <span className="font-semibold">{combat.player.hp}/{combat.player.maxHp}</span>
                </div>
                <div className="flex justify-between">
                  <span>Attack Bonus:</span>
                  <span className="font-semibold">+{combat.player.attackBonus || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Defense Bonus:</span>
                  <span className="font-semibold">+{combat.player.defenseBonus || 0}</span>
                </div>
              </div>
            </div>

            {/* Last Round Results */}
            {lastRound && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 dark:text-gray-300 mb-2">
                  Last Round
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Your Attack:</span>
                    <DiceRoll type="d6" value={lastRound.playerAttack} />
                    <span className="text-xs">vs</span>
                    <DiceRoll type="d6" value={lastRound.enemyDefense} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Enemy Attack:</span>
                    <DiceRoll type="d6" value={lastRound.enemyAttack} />
                    <span className="text-xs">vs</span>
                    <DiceRoll type="d6" value={lastRound.playerDefense} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Items */}
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-gray-300 mb-2">
              Quick Items
            </h4>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleUsePotion('rage-potion')}
                className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 text-sm"
              >
                🧪 Rage Potion
              </button>
              <button
                onClick={() => handleUsePotion('agility-draught')}
                className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 text-sm"
              >
                🧪 Agility Draught
              </button>
              <button
                onClick={() => handleUsePotion('beer')}
                className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/50 text-sm"
              >
                🍺 Beer
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleAdvanceRound}
              disabled={!selectedTarget || combat.enemies.every(e => e.hp <= 0)}
              className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-bold py-3 px-8 rounded-lg transition-colors"
              data-testid="btn-attack"
            >
              ⚔️ Attack Round
            </button>
            <button
              onClick={handleRetreat}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-8 rounded-lg transition-colors"
              data-testid="btn-retreat"
            >
              🏃 Retreat
            </button>
          </div>

          {/* Combat Tips */}
          <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-3 text-xs text-gray-600 dark:text-gray-400">
            <strong>Combat Tips:</strong>
            <ul className="mt-1 space-y-1">
              <li>• Each round, both sides roll Attack (d6 + modifiers) and Defense (d6 + modifiers)</li>
              <li>• If Attack {'>'} Defense, deal 1 damage</li>
              <li>• Select a target before attacking (for multi-enemy fights)</li>
              <li>• Retreat moves you back 6 tiles and ends your turn</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}