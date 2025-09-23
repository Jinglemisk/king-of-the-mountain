import { useState } from 'react';
import { DiceRoll } from '../components/DiceRoll';

// Simplified duel state for UI
interface DuelState {
  status: 'pending' | 'active';
  round: number;
  currentTurn?: string;
  attacker: {
    uid: string;
    nickname: string;
    hp: number;
    maxHp: number;
    classId: string;
    flags?: any;
  };
  defender: {
    uid: string;
    nickname: string;
    hp: number;
    maxHp: number;
    classId: string;
    flags?: any;
  };
}

interface DuelDialogProps {
  duel: DuelState;
}

export function DuelDialog({ duel }: DuelDialogProps) {
  const [lastRound, setLastRound] = useState<any>(null);
  const [duelistRerollUsed, setDuelistRerollUsed] = useState(false);

  const handleAcceptDuel = () => {
    console.log('Accept duel');
    // Dispatch accept duel action
  };

  const handleDeclineDuel = () => {
    console.log('Decline duel');
    // Dispatch decline duel action
  };

  const handleAdvanceRound = () => {
    console.log('Advance duel round');
    // Simulate dice rolls for demo
    setLastRound({
      attackerAttack: Math.floor(Math.random() * 6) + 1,
      attackerDefense: Math.floor(Math.random() * 6) + 1,
      defenderAttack: Math.floor(Math.random() * 6) + 1,
      defenderDefense: Math.floor(Math.random() * 6) + 1,
    });
  };

  const handleUseDefenseReroll = () => {
    console.log('Use duelist defense reroll');
    setDuelistRerollUsed(true);
    // Dispatch reroll action
  };

  const handleRetreat = () => {
    console.log('Retreat from duel');
    // Dispatch retreat action
  };

  const handleInvokeMonkCancel = () => {
    console.log('Invoke monk cancel');
    // Dispatch monk cancel action
  };

  if (duel.status === 'pending') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4">
          <div className="bg-red-600 text-white px-6 py-4 rounded-t-lg">
            <h2 className="text-2xl font-bold">⚔️ DUEL CHALLENGE</h2>
          </div>

          <div className="p-6 space-y-4">
            <div className="text-center">
              <div className="text-lg text-gray-800 dark:text-white">
                {duel.attacker.nickname} challenges you to a duel!
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Attacker HP: {duel.attacker.hp}/{duel.attacker.maxHp}
              </div>
            </div>

            {/* Monk cancel option */}
            {duel.defender.classId === 'monk' && !duel.defender.flags?.monkCancelUsed && (
              <div className="bg-purple-100 dark:bg-purple-900/30 border border-purple-500 rounded-lg p-3">
                <div className="text-sm text-purple-700 dark:text-purple-300">
                  🧘 Monk Ability: Roll d6 to cancel (5-6 succeeds)
                </div>
                <button
                  onClick={handleInvokeMonkCancel}
                  className="mt-2 w-full bg-purple-500 hover:bg-purple-600 text-white py-2 rounded"
                >
                  Invoke Monk Cancel (Once per game)
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleAcceptDuel}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-lg"
                data-testid="btn-accept-duel"
              >
                Accept
              </button>
              <button
                onClick={handleDeclineDuel}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 rounded-lg"
                data-testid="btn-decline-duel"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="bg-red-600 text-white px-6 py-4 rounded-t-lg">
          <h2 className="text-2xl font-bold">⚔️ DUEL - Round {duel.round}</h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Participants */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`border-2 rounded-lg p-4 ${duel.attacker.uid === duel.currentTurn ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}`}>
              <div className="font-semibold text-gray-800 dark:text-white">
                {duel.attacker.nickname} (Attacker)
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                HP: {duel.attacker.hp}/{duel.attacker.maxHp}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Class: {duel.attacker.classId}
              </div>
              {duel.attacker.classId === 'duelist' && (
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  +1 Attack in duels
                </div>
              )}
            </div>

            <div className={`border-2 rounded-lg p-4 ${duel.defender.uid === duel.currentTurn ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}`}>
              <div className="font-semibold text-gray-800 dark:text-white">
                {duel.defender.nickname} (Defender)
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                HP: {duel.defender.hp}/{duel.defender.maxHp}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Class: {duel.defender.classId}
              </div>
            </div>
          </div>

          {/* Last Round Results */}
          {lastRound && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 dark:text-gray-300 mb-3">
                Last Round Results
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-semibold mb-2">Attacker</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">Attack:</span>
                    <DiceRoll type="d6" value={lastRound.attackerAttack} />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs">Defense:</span>
                    <DiceRoll type="d6" value={lastRound.attackerDefense} />
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold mb-2">Defender</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">Attack:</span>
                    <DiceRoll type="d6" value={lastRound.defenderAttack} />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs">Defense:</span>
                    <DiceRoll type="d6" value={lastRound.defenderDefense} />
                    {duel.defender.classId === 'duelist' && !duelistRerollUsed && (
                      <button
                        onClick={handleUseDefenseReroll}
                        className="ml-2 text-xs bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded"
                      >
                        Reroll
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleAdvanceRound}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-lg transition-colors"
              data-testid="btn-duel-round"
            >
              ⚔️ Next Round
            </button>
            <button
              onClick={handleRetreat}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-8 rounded-lg transition-colors"
              data-testid="btn-retreat"
            >
              🏃 Retreat
            </button>
          </div>

          {/* Duel Rules */}
          <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-3 text-xs text-gray-600 dark:text-gray-400">
            <strong>Duel Rules:</strong>
            <ul className="mt-1 space-y-1">
              <li>• Both players roll simultaneously</li>
              <li>• Loser at 0 HP stays on tile, winner can loot items</li>
              <li>• Retreat moves you back 6 tiles</li>
              {duel.defender.classId === 'duelist' && (
                <li className="text-purple-600 dark:text-purple-400">
                  • Duelist: Can reroll defense once per duel
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}