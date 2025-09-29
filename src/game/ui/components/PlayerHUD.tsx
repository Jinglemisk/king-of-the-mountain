import { useGameStore } from '../stores/gameStore';
import { CLASSES } from '../../data/content';
import { getPhaseInfo } from '../utils/phaseDescriptions';

export function PlayerHUD() {
  const { getMyPlayer, isMyTurn, getCurrentPhase, gameState } = useGameStore();
  const myPlayer = getMyPlayer();
  const currentPhase = getCurrentPhase();
  const phaseInfo = currentPhase ? getPhaseInfo(currentPhase) : null;

  if (!myPlayer) {
    return (
      <div className="p-4">
        <div className="text-gray-500">Loading player data...</div>
      </div>
    );
  }

  const classData = CLASSES[myPlayer.classId];
  const hpPercentage = (myPlayer.hp / myPlayer.maxHp) * 100;
  const isLowHealth = myPlayer.hp <= 2;

  return (
    <div className="p-4 space-y-4">
      {/* Turn Indicator */}
      {isMyTurn() && phaseInfo && (
        <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-500 rounded-lg px-3 py-2 text-sm text-blue-700 dark:text-blue-300 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="text-lg">{phaseInfo.icon}</span>
            <span>It's your turn! - {phaseInfo.displayName}</span>
          </div>
        </div>
      )}

      {/* Player Info */}
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              {myPlayer.nickname}
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {classData?.name || 'Unknown Class'}
            </div>
          </div>

          {/* Position */}
          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Tile #{myPlayer.position}
            </div>
          </div>
        </div>

        {/* HP Bar */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">HP</span>
            <span className={`font-semibold ${isLowHealth ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
              {myPlayer.hp} / {myPlayer.maxHp}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isLowHealth ? 'bg-red-500' : 'bg-green-500'
              }`}
              style={{ width: `${hpPercentage}%` }}
              role="progressbar"
              aria-valuenow={myPlayer.hp}
              aria-valuemin={0}
              aria-valuemax={myPlayer.maxHp}
            />
          </div>
        </div>

        {/* Class Passive */}
        {classData && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              CLASS PASSIVE
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {classData.passive}
            </div>

            {/* Class-specific flags */}
            {myPlayer.classId === 'monk' && myPlayer.flags?.monkCancelUsed && (
              <div className="mt-2 text-xs text-red-500">
                ⚠️ Cancel ability used
              </div>
            )}

            {myPlayer.classId === 'alchemist' && (
              <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                +1 Bandolier slot • Potion boost active
              </div>
            )}

            {myPlayer.classId === 'porter' && (
              <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                +1 Backpack slot
              </div>
            )}
          </div>
        )}

        {/* Temporary Effects */}
        {myPlayer.tempEffects && Object.keys(myPlayer.tempEffects).length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 rounded-lg p-3">
            <div className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-1">
              ACTIVE EFFECTS
            </div>
            <div className="space-y-1">
              {myPlayer.tempEffects.attackBonus && (
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  ⚔️ +{myPlayer.tempEffects.attackBonus} Attack this turn
                </div>
              )}
              {myPlayer.tempEffects.defenseBonus && (
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  🛡️ +{myPlayer.tempEffects.defenseBonus} Defense this turn
                </div>
              )}
              {myPlayer.tempEffects.movementMod && (
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  🎲 {myPlayer.tempEffects.movementMod > 0 ? '+' : ''}{myPlayer.tempEffects.movementMod} Movement
                </div>
              )}
            </div>
          </div>
        )}

        {/* Invisible Status */}
        {myPlayer.flags?.invisible && (
          <div className="bg-purple-100 dark:bg-purple-900/30 border border-purple-500 rounded-lg px-3 py-2 text-sm text-purple-700 dark:text-purple-300">
            👻 You are invisible (cannot be dueled)
          </div>
        )}
      </div>

      {/* Other Players Summary */}
      <div className="border-t pt-3">
        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
          OTHER PLAYERS
        </div>
        <div className="space-y-1">
          {Object.entries(gameState?.players || {})
            .filter(([uid]) => uid !== getMyPlayer()?.uid)
            .map(([uid, player]) => (
              <div key={uid} className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {player.nickname}
                </span>
                <span className="text-gray-500 dark:text-gray-500">
                  {player.hp}/{player.maxHp} HP • Tile {player.position}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}