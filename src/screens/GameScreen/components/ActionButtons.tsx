/**
 * ActionButtons Component
 * Displays available actions for the current player's turn
 */

import type { Player } from '../../../types';
import { Button } from '../../../components/ui/Button';

interface ActionButtonsProps {
  isMyTurn: boolean;
  currentPlayer: Player;
  turnPlayerNickname: string;
  playersOnSameTile: Record<string, Player>;
  unconsciousPlayersOnTile: Record<string, Player>;
  isSanctuary: boolean;
  onMove: () => void;
  onSleep: () => void;
  onShowDuelModal: () => void;
  onLootPlayer: (playerId: string) => void;
  onEndTurn: () => void;
}

export function ActionButtons({
  isMyTurn,
  currentPlayer,
  turnPlayerNickname,
  playersOnSameTile,
  unconsciousPlayersOnTile,
  isSanctuary,
  onMove,
  onSleep,
  onShowDuelModal,
  onLootPlayer,
  onEndTurn,
}: ActionButtonsProps) {
  if (!isMyTurn) {
    return (
      <div className="turn-info">
        <p>⏳ Waiting for {turnPlayerNickname}'s turn...</p>
      </div>
    );
  }

  // If player is unconscious, show waking up message
  if (!currentPlayer.isAlive) {
    return (
      <div className="turn-info unconscious-wake">
        <h3>💫 Waking Up...</h3>
        <p>You are regaining consciousness and will be restored to full HP!</p>
      </div>
    );
  }

  const hasActed = currentPlayer.actionTaken !== null && currentPlayer.actionTaken !== undefined;
  const canDuel = Object.keys(playersOnSameTile).length > 0 && !hasActed;
  const canLoot = Object.keys(unconsciousPlayersOnTile).length > 0;

  return (
    <div className="action-buttons">
      <h3>Your Turn!</h3>
      <div className="actions-grid">
        <Button onClick={onMove} variant="primary" disabled={hasActed}>
          🎲 Roll & Move
        </Button>
        <Button onClick={onSleep} variant="secondary" disabled={hasActed}>
          😴 Sleep (Restore HP)
        </Button>
        <Button
          onClick={onShowDuelModal}
          variant="secondary"
          disabled={!canDuel || isSanctuary}
        >
          ⚔️ Duel {isSanctuary ? '(Sanctuary)' : canDuel ? '' : '(No players)'}
        </Button>
        {canLoot && (
          <Button
            onClick={() => {
              const firstUnconsciousId = Object.keys(unconsciousPlayersOnTile)[0];
              onLootPlayer(firstUnconsciousId);
            }}
            variant="secondary"
          >
            💰 Loot Unconscious Player
          </Button>
        )}
        <Button onClick={() => {}} variant="secondary" disabled>
          🤝 Trade (Coming soon)
        </Button>
      </div>
      <div className="end-turn-section">
        <Button onClick={onEndTurn} variant="danger" fullWidth>
          End Turn
        </Button>
      </div>
    </div>
  );
}
