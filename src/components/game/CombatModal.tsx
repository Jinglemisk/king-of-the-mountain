/**
 * CombatModal component
 * Interactive combat system for PvE and PvP
 * Displays combatants, allows attacking with target selection, shows combat log
 */

import { useState } from 'react';
import type { Player, Enemy, GameState } from '../../types';
import { Modal } from '../ui/Modal';
import { Card } from './Card';
import { Button } from '../ui/Button';
import { calculatePlayerStats } from '../../utils/playerStats';

interface CombatModalProps {
  isOpen: boolean;
  gameState: GameState;
  onAttack: (targetId?: string) => void;
  onRetreat: () => void;
  onEndCombat: () => void;
}

/**
 * Helper to check if opponent is a Player
 */
function isPlayer(opponent: Enemy | Player): opponent is Player {
  return 'nickname' in opponent;
}

/**
 * Combat modal for PvE and PvP encounters with full combat logic
 */
export function CombatModal({
  isOpen,
  gameState,
  onAttack,
  onRetreat,
  onEndCombat,
}: CombatModalProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  if (!isOpen || !gameState.combat || !gameState.combat.isActive) {
    return null;
  }

  const combat = gameState.combat;
  const player = gameState.players[combat.attackerId];
  const opponents = combat.defenders;

  // Check if combat is over
  const playerDefeated = player.hp === 0;
  const opponentsDefeated = opponents.every(o => o.hp === 0);
  const combatOver = playerDefeated || opponentsDefeated;

  // Determine if fighting enemies
  const isVsEnemy = opponents.length > 0 && 'attackBonus' in opponents[0];
  const playerStats = calculatePlayerStats(player, isVsEnemy);

  // Auto-select target if only one opponent
  const needsTargetSelection = opponents.filter(o => o.hp > 0).length > 1;
  const effectiveTarget = needsTargetSelection ? selectedTarget : opponents.find(o => o.hp > 0)?.id || null;

  const handleAttack = () => {
    if (needsTargetSelection && !effectiveTarget) {
      alert('Please select a target!');
      return;
    }
    onAttack(effectiveTarget || undefined);
    setSelectedTarget(null); // Reset selection after attack
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={combatOver ? onEndCombat : undefined}
      title="⚔️ Combat"
      size="large"
      canClose={combatOver}
    >
      <div className="combat-modal">
        {/* Combat Arena */}
        <div className="combat-arena">
          {/* Player side */}
          <div className="combatant player-side">
            <h3>{player.nickname}</h3>
            <div className="combatant-stats">
              <div className="stat-row">
                <span className="stat-label">❤️ HP:</span>
                <span className="stat-value">{player.hp}/{player.maxHp}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">⚔️ ATK:</span>
                <span className="stat-value">{playerStats.attack}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">🛡️ DEF:</span>
                <span className="stat-value">{playerStats.defense}</span>
              </div>
            </div>
            <div className="player-class">
              <span>Class: {player.class}</span>
            </div>
          </div>

          <div className="combat-vs">VS</div>

          {/* Opponent side */}
          <div className="combatant opponent-side">
            {opponents.map((opponent) => {
              const isPlayerOpponent = isPlayer(opponent);
              const opponentStats = isPlayerOpponent
                ? calculatePlayerStats(opponent as Player, false)
                : {
                    attack: (opponent as Enemy).attackBonus + 1,
                    defense: (opponent as Enemy).defenseBonus + 1,
                  };

              const isDefeated = opponent.hp === 0;
              const isSelected = needsTargetSelection && selectedTarget === opponent.id;

              return (
                <div
                  key={opponent.id}
                  className={`opponent-card ${isDefeated ? 'defeated' : ''} ${isSelected ? 'selected' : ''} ${
                    needsTargetSelection && !isDefeated ? 'selectable' : ''
                  }`}
                  onClick={() => {
                    if (needsTargetSelection && !isDefeated && !combatOver) {
                      setSelectedTarget(opponent.id);
                    }
                  }}
                >
                  <h3>
                    {isPlayerOpponent ? (opponent as Player).nickname : (opponent as Enemy).name}
                    {isDefeated && ' 💀'}
                  </h3>
                  {!isPlayerOpponent && (
                    <Card card={opponent as Enemy} type="enemy" isRevealed={true} />
                  )}
                  <div className="combatant-stats">
                    <div className="stat-row">
                      <span className="stat-label">❤️ HP:</span>
                      <span className="stat-value">
                        {opponent.hp}/
                        {isPlayerOpponent ? (opponent as Player).maxHp : (opponent as Enemy).maxHp}
                      </span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">⚔️ ATK:</span>
                      <span className="stat-value">{opponentStats.attack}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">🛡️ DEF:</span>
                      <span className="stat-value">{opponentStats.defense}</span>
                    </div>
                  </div>
                  {isSelected && <div className="target-indicator">🎯 TARGET</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Combat Log */}
        {combat.combatLog && combat.combatLog.length > 0 && (
          <div className="combat-log">
            <h4>Combat Log (Round {combat.currentRound})</h4>
            <div className="combat-log-entries">
              {combat.combatLog.slice(-3).map((entry, index) => (
                <div key={index} className="combat-log-entry">
                  <div className="log-round">Round {entry.round}</div>
                  <div className="log-rolls">
                    <div className="log-attacker">
                      {entry.attackerRoll.entityName}: 🎲 ATK {entry.attackerRoll.attackDie}+
                      {entry.attackerRoll.attackBonus} = {entry.attackerRoll.totalAttack}, DEF{' '}
                      {entry.attackerRoll.defenseDie}+{entry.attackerRoll.defenseBonus} ={' '}
                      {entry.attackerRoll.totalDefense}
                    </div>
                    {entry.defenderRolls.map((roll, i) => (
                      <div key={i} className="log-defender">
                        {roll.entityName}: 🎲 ATK {roll.attackDie}+{roll.attackBonus} ={' '}
                        {roll.totalAttack}, DEF {roll.defenseDie}+{roll.defenseBonus} ={' '}
                        {roll.totalDefense}
                      </div>
                    ))}
                  </div>
                  <div className="log-results">
                    {entry.results.map((result, i) => (
                      <div key={i} className={result.hpLost > 0 ? 'damage-dealt' : ''}>
                        {result.hpLost > 0
                          ? `💥 ${result.entityName} took ${result.hpLost} damage!`
                          : `${result.entityName} defended successfully!`}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Target selection hint */}
        {needsTargetSelection && !combatOver && (
          <div className="target-hint">
            <p>⚠️ Multiple enemies alive! Click on an enemy to select your target.</p>
          </div>
        )}

        {/* Combat result message */}
        {combatOver && (
          <div className="combat-result">
            {playerDefeated && <p className="defeat-message">💀 You were defeated!</p>}
            {opponentsDefeated && <p className="victory-message">🏆 Victory! All enemies defeated!</p>}
          </div>
        )}

        {/* Combat actions */}
        <div className="combat-actions">
          {!combatOver && (
            <>
              <Button onClick={handleAttack} variant="primary">
                ⚔️ Attack{needsTargetSelection ? ' Selected Target' : ''}
              </Button>
              {combat.canRetreat && (
                <Button onClick={onRetreat} variant="danger">
                  🏃 Retreat (Move back 6 tiles)
                </Button>
              )}
            </>
          )}
          {combatOver && (
            <Button onClick={onEndCombat} variant="primary">
              Continue
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
