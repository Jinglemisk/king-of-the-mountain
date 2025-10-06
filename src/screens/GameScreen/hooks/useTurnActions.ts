/**
 * useTurnActions Hook
 * Handles all turn-related actions (move, sleep, duel, end turn, etc.)
 */

import type { GameState, Player, Item, Enemy, LuckCard, Tile } from '../../../types';
import {
  updateGameState,
  addLog,
  rollDice,
  drawCards,
  drawLuckCard,
  drawEnemiesForTile,
  startCombat,
} from '../../../state/gameSlice';

interface UseTurnActionsParams {
  gameState: GameState;
  playerId: string;
  currentPlayer: Player;
  safeTurnPlayer: Player;
  setRevealedCards: (cards: (Item | Enemy | LuckCard)[]) => void;
  setRevealCardType: (type: 'treasure' | 'enemy' | 'luck' | null) => void;
  setShowCardReveal: (show: boolean) => void;
  setCombatEnemies: (enemies: Enemy[]) => void;
  setShowCombat: (show: boolean) => void;
  setShowDuelModal: (show: boolean) => void;
  setDefeatedPlayerId: (id: string | null) => void;
  setShowLootingModal: (show: boolean) => void;
  setPendingItems: (items: Item[]) => void;
  handleEndTurn: () => Promise<void>;
}

export function useTurnActions({
  gameState,
  playerId,
  currentPlayer,
  safeTurnPlayer,
  setRevealedCards,
  setRevealCardType,
  setShowCardReveal,
  setCombatEnemies,
  setShowCombat,
  setShowDuelModal,
  setDefeatedPlayerId,
  setShowLootingModal,
  setPendingItems,
  handleEndTurn: parentHandleEndTurn,
}: UseTurnActionsParams) {
  /**
   * Resolve tile effects based on tile type
   */
  const resolveTileEffect = async (tile: Tile) => {
    const tileType = tile.type;

    // Start tile and Final tile have no draw effects
    if (tileType === 'start' || tileType === 'final' || tileType === 'sanctuary') {
      return;
    }

    // Enemy tiles - draw enemies and start combat
    if (tileType === 'enemy1' || tileType === 'enemy2' || tileType === 'enemy3') {
      const tier = parseInt(tileType.replace('enemy', '')) as 1 | 2 | 3;
      const enemies = await drawEnemiesForTile(gameState.lobbyCode, tier);

      await addLog(
        gameState.lobbyCode,
        'combat',
        `${currentPlayer.nickname} encountered ${enemies.length} enemy/enemies on Tier ${tier} tile!`,
        playerId,
        true
      );

      // Show enemies in reveal modal first
      setRevealedCards(enemies);
      setRevealCardType('enemy');
      setShowCardReveal(true);

      // Store enemies for combat modal
      setCombatEnemies(enemies as Enemy[]);
    }

    // Treasure tiles - draw treasures and add to inventory
    if (tileType === 'treasure1' || tileType === 'treasure2' || tileType === 'treasure3') {
      const tier = parseInt(tileType.replace('treasure', '')) as 1 | 2 | 3;
      const treasures = await drawCards(gameState.lobbyCode, 'treasure', tier, 1);

      await addLog(
        gameState.lobbyCode,
        'action',
        `${currentPlayer.nickname} found a Tier ${tier} treasure!`,
        playerId
      );

      // Show treasure in reveal modal
      setRevealedCards(treasures);
      setRevealCardType('treasure');
      setShowCardReveal(true);

      // Try to add to inventory
      setPendingItems(treasures as Item[]);
    }

    // Luck tile - draw Luck Card
    if (tileType === 'luck') {
      const luckCard = await drawLuckCard(gameState.lobbyCode);

      await addLog(
        gameState.lobbyCode,
        'action',
        `${currentPlayer.nickname} drew a Luck Card: ${luckCard.name}`,
        playerId,
        true
      );

      // Show Luck Card in reveal modal
      setRevealedCards([luckCard]);
      setRevealCardType('luck');
      setShowCardReveal(true);

      // TODO: Apply Luck Card effects (future implementation)
    }
  };

  /**
   * Handle player rolling dice to move
   */
  const handleMove = async () => {
    const roll = rollDice(4); // 4-sided die for movement

    // Calculate new position (can't overshoot final tile at 19)
    let newPosition = currentPlayer.position + roll;
    if (newPosition > 19) {
      newPosition = 19;
    }

    // Update player position and mark action as taken
    await updateGameState(gameState.lobbyCode, {
      [`players/${playerId}/position`]: newPosition,
      [`players/${playerId}/actionTaken`]: 'move',
    });

    // Log the move
    await addLog(
      gameState.lobbyCode,
      'action',
      `${currentPlayer.nickname} rolled ${roll} and moved to tile ${newPosition}`,
      playerId
    );

    // Get the landed tile
    const landedTile = gameState.tiles[newPosition];
    if (!landedTile) return;

    // Check for trap on the landed tile
    if (landedTile.hasTrap && landedTile.trapOwnerId !== playerId) {
      // Check if player is Scout (immune to traps)
      if (currentPlayer.class === 'Scout') {
        await addLog(
          gameState.lobbyCode,
          'action',
          `${currentPlayer.nickname} is a Scout and avoided the trap! 🏹`,
          playerId,
          true
        );
        // Scout continues to tile effect resolution
      } else {
        // Non-Scout triggers trap - skip tile effect
        await addLog(
          gameState.lobbyCode,
          'combat',
          `${currentPlayer.nickname} triggered a trap! They cannot resolve this tile's effect. ⚠️`,
          playerId,
          true
        );

        // Remove trap from tile
        const updatedTiles = [...gameState.tiles];
        updatedTiles[newPosition] = {
          ...landedTile,
          hasTrap: false,
          trapOwnerId: undefined,
        };

        await updateGameState(gameState.lobbyCode, {
          tiles: updatedTiles,
        });

        // Skip tile effect resolution by returning early
        return;
      }
    }

    // Resolve tile effects (only reached if no trap or Scout immunity)
    await resolveTileEffect(landedTile);
  };

  /**
   * Handle player choosing Sleep action
   */
  const handleSleep = async () => {
    // Restore to full HP and mark action as taken
    await updateGameState(gameState.lobbyCode, {
      [`players/${playerId}/hp`]: currentPlayer.maxHp,
      [`players/${playerId}/actionTaken`]: 'sleep',
    });

    await addLog(
      gameState.lobbyCode,
      'action',
      `${currentPlayer.nickname} rested and restored to full HP`,
      playerId
    );
  };

  /**
   * Handle ending the current turn
   */
  const handleEndTurn = async () => {
    // Move to next player in turn order
    const nextIndex = (gameState.currentTurnIndex + 1) % gameState.turnOrder.length;
    const nextPlayerId = gameState.turnOrder[nextIndex];
    const nextPlayer = nextPlayerId ? gameState.players[nextPlayerId] : null;

    await updateGameState(gameState.lobbyCode, {
      currentTurnIndex: nextIndex,
      [`players/${playerId}/actionTaken`]: null,
      [`players/${nextPlayerId}/actionTaken`]: null,
    });

    if (nextPlayer) {
      await addLog(
        gameState.lobbyCode,
        'system',
        `${safeTurnPlayer.nickname}'s turn ended. It's now ${nextPlayer.nickname}'s turn.`
      );
    }
  };

  /**
   * Handle duel initiation with another player
   */
  const handleDuel = async (targetPlayerId: string) => {
    const targetPlayer = gameState.players[targetPlayerId];

    // Check sanctuary tiles
    const currentTile = gameState.tiles[currentPlayer.position];
    if (currentTile.type === 'sanctuary') {
      alert('Cannot duel on Sanctuary tiles!');
      return;
    }

    // Start PvP combat (canRetreat = false for duels)
    await startCombat(gameState.lobbyCode, playerId, [targetPlayer], false);
    await updateGameState(gameState.lobbyCode, {
      [`players/${playerId}/actionTaken`]: 'duel',
    });
    setShowDuelModal(false);
    setShowCombat(true);
  };

  /**
   * Handle looting an unconscious player on the same tile
   */
  const handleLootPlayer = (targetPlayerId: string) => {
    setDefeatedPlayerId(targetPlayerId);
    setShowLootingModal(true);
  };

  /**
   * Handle unconscious player's turn - auto-wake them
   */
  const handleUnconsciousPlayerTurn = async () => {
    // Wake up unconscious player - restore HP and set alive
    await updateGameState(gameState.lobbyCode, {
      [`players/${playerId}/hp`]: currentPlayer.maxHp,
      [`players/${playerId}/isAlive`]: true,
      [`players/${playerId}/actionTaken`]: null,
    });

    await addLog(
      gameState.lobbyCode,
      'system',
      `💫 ${currentPlayer.nickname} woke up from unconsciousness with full HP!`,
      playerId,
      true
    );

    // Auto-end turn after waking
    setTimeout(() => {
      parentHandleEndTurn();
    }, 2000); // 2 second delay so players can see the wake-up message
  };

  return {
    resolveTileEffect,
    handleMove,
    handleSleep,
    handleEndTurn,
    handleDuel,
    handleLootPlayer,
    handleUnconsciousPlayerTurn,
  };
}
