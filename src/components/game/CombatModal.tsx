/**
 * CombatModal component
 * Displays combat between player and enemies/other players
 * Shows both combatants with their stats (HP, ATK, DEF)
 * This is a provisional modal - combat logic will be implemented later
 */

import type { Player, Enemy } from '../../types';
import { Modal } from '../ui/Modal';
import { Card } from './Card';
import { Button } from '../ui/Button';

interface CombatModalProps {
  isOpen: boolean;
  player: Player;
  opponents: (Enemy | Player)[];
  onRetreat?: () => void;
  onClose?: () => void;
}

/**
 * Helper to check if opponent is a Player
 */
function isPlayer(opponent: Enemy | Player): opponent is Player {
  return 'nickname' in opponent;
}

/**
 * Calculate player's total attack and defense from equipment
 */
function calculateStats(player: Player): { attack: number; defense: number } {
  let attack = 1; // Base attack
  let defense = 1; // Base defense

  const equipment = player.equipment || { holdable1: null, holdable2: null, wearable: null };

  if (equipment.holdable1) {
    attack += equipment.holdable1.attackBonus || 0;
    defense += equipment.holdable1.defenseBonus || 0;
  }
  if (equipment.holdable2) {
    attack += equipment.holdable2.attackBonus || 0;
    defense += equipment.holdable2.defenseBonus || 0;
  }
  if (equipment.wearable) {
    attack += equipment.wearable.attackBonus || 0;
    defense += equipment.wearable.defenseBonus || 0;
  }

  return { attack, defense };
}

/**
 * Combat modal for PvE and PvP encounters
 * @param isOpen - Whether modal is visible
 * @param player - The player in combat
 * @param opponents - Array of enemies or players being fought
 * @param onRetreat - Optional callback for retreat action
 * @param onClose - Optional callback when combat ends
 */
export function CombatModal({
  isOpen,
  player,
  opponents,
  onRetreat,
  onClose,
}: CombatModalProps) {
  if (!isOpen || opponents.length === 0) {
    return null;
  }

  const playerStats = calculateStats(player);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose || (() => {})}
      title="⚔️ Combat"
      size="large"
      canClose={false}
    >
      <div className="combat-modal">
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
            {opponents.map((opponent, index) => {
              const isPlayerOpponent = isPlayer(opponent);
              const opponentStats = isPlayerOpponent
                ? calculateStats(opponent)
                : { attack: opponent.attackBonus + 1, defense: opponent.defenseBonus + 1 };

              return (
                <div key={opponent.id || index} className="opponent-card">
                  <h3>{isPlayerOpponent ? opponent.nickname : opponent.name}</h3>
                  {!isPlayerOpponent && (
                    <Card card={opponent} type="enemy" isRevealed={true} />
                  )}
                  <div className="combatant-stats">
                    <div className="stat-row">
                      <span className="stat-label">❤️ HP:</span>
                      <span className="stat-value">
                        {opponent.hp}/{isPlayerOpponent ? opponent.maxHp : (opponent as Enemy).maxHp}
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
                </div>
              );
            })}
          </div>
        </div>

        {/* Provisional message */}
        <div className="combat-placeholder">
          <p>⚠️ Combat system will be implemented in a future update.</p>
          <p>For now, you can retreat to exit combat.</p>
        </div>

        {/* Combat actions */}
        <div className="combat-actions">
          {onRetreat && (
            <Button onClick={onRetreat} variant="danger">
              Retreat (Move back 6 tiles)
            </Button>
          )}
          <Button onClick={onClose} variant="secondary">
            Close (Temporary)
          </Button>
        </div>
      </div>
    </Modal>
  );
}
