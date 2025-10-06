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
import { decrementTempEffects, getMovementModifier, isDuelProtected } from '../../../utils/tempEffects';
import { executeEffect } from '../../../services/effectExecutor';

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
  setShowJinnThiefModal: (show: boolean) => void;
  setShowInstinctModal: (show: boolean) => void;
  setInstinctPosition: (position: number) => void;
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
  setShowJinnThiefModal,
  setShowInstinctModal,
  setInstinctPosition,
  handleEndTurn: parentHandleEndTurn,
}: UseTurnActionsParams) {
  /**
   * Resolve tile effects based on tile type
   * @param tile - The tile to resolve effects for
   * @param effectGameState - Optional updated game state to use for effects (defaults to current gameState)
   */
  const resolveTileEffect = async (tile: Tile, effectGameState: GameState = gameState) => {
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

      // Execute Luck Card effect (if not a "keep face down" card)
      // Cards with canBeKept will be executed when player chooses to use them
      if (!luckCard.canBeKept) {
        // Execute effect automatically with updated game state
        const effectResult = await executeEffect(luckCard.effect, {
          gameState: effectGameState, // Use effectGameState instead of stale gameState
          lobbyCode: gameState.lobbyCode,
          playerId,
          value: luckCard.value,
          updateGameState: (updates) => updateGameState(gameState.lobbyCode, updates),
          addLog: (type, message, pid, important) => addLog(gameState.lobbyCode, type, message, pid, important),
          drawCards: (deckType, tier, count) => drawCards(gameState.lobbyCode, deckType, tier, count),
          drawLuckCard: () => drawLuckCard(gameState.lobbyCode),
          startCombat: (attackerId, defenders, canRetreat) => startCombat(gameState.lobbyCode, attackerId, defenders, canRetreat),
          resolveTile: async (position, updatedState) => {
            const tile = gameState.tiles[position];
            if (tile) {
              await resolveTileEffect(tile, updatedState);
            }
          },
        });

        // Handle effects that draw treasures (Covered Pit, Lost Treasure)
        // These effects return treasures in result.data that need to be added to inventory
        if (effectResult.success && effectResult.data?.treasures) {
          const treasures = effectResult.data.treasures as Item[];
          // Show treasures in reveal modal
          setRevealedCards(treasures);
          setRevealCardType('treasure');
          setShowCardReveal(true);
          // Add to inventory via pending items (handles full inventory case)
          setPendingItems(treasures);
        }

        // Handle effects that require player choice (Jinn Thief)
        if (effectResult.success && effectResult.data?.requiresChoice) {
          setShowJinnThiefModal(true);
        }
      }
    }
  };

  /**
   * Check if player has Instinct tempEffect
   */
  const hasInstinct = (player: Player): boolean => {
    return player.tempEffects?.some(effect => effect.type === 'instinct') || false;
  };

  /**
   * Check if player has Ambush tempEffect
   */
  const hasAmbush = (player: Player): boolean => {
    return player.tempEffects?.some(effect => effect.type === 'ambush') || false;
  };

  /**
   * Handle placing an Ambush on the current tile
   */
  const handlePlaceAmbush = async () => {
    if (!hasAmbush(currentPlayer)) {
      return;
    }

    const currentTile = gameState.tiles[currentPlayer.position];

    // Cannot place ambush on Start or Final tiles
    if (currentTile.type === 'start' || currentTile.type === 'final') {
      await addLog(
        gameState.lobbyCode,
        'action',
        `${currentPlayer.nickname} cannot place an ambush on ${currentTile.type} tiles!`,
        playerId
      );
      return;
    }

    // Cannot place ambush if tile already has one
    if (currentTile.hasAmbush) {
      await addLog(
        gameState.lobbyCode,
        'action',
        `${currentPlayer.nickname} cannot place an ambush here - there's already one!`,
        playerId
      );
      return;
    }

    // Remove Ambush tempEffect
    const updatedTempEffects = (currentPlayer.tempEffects || []).filter(
      effect => effect.type !== 'ambush'
    );

    // Update tile with ambush
    const updatedTiles = [...gameState.tiles];
    updatedTiles[currentPlayer.position] = {
      ...currentTile,
      hasAmbush: true,
      ambushOwnerId: playerId,
    };

    await updateGameState(gameState.lobbyCode, {
      [`players/${playerId}/tempEffects`]: updatedTempEffects,
      tiles: updatedTiles,
    });

    await addLog(
      gameState.lobbyCode,
      'action',
      `🃏 ${currentPlayer.nickname} placed an Ambush on tile ${currentPlayer.position}!`,
      playerId,
      true
    );
  };

  /**
   * Continue movement after position update (handles trap, Lamp, tile resolution)
   * Separated to allow Instinct to modify position before continuing
   */
  const continueMovementAfterPosition = async (position: number) => {
    const landedTile = gameState.tiles[position];
    if (!landedTile) return;

    // Create updated gameState with current position
    const updatedGameState: GameState = {
      ...gameState,
      players: {
        ...gameState.players,
        [playerId]: {
          ...currentPlayer,
          position,
          actionTaken: 'move',
        },
      },
    };

    // Check for ambush on the landed tile (happens BEFORE trap check)
    if (landedTile.hasAmbush && landedTile.ambushOwnerId && landedTile.ambushOwnerId !== playerId) {
      const ambusher = gameState.players[landedTile.ambushOwnerId];

      if (ambusher) {
        await addLog(
          gameState.lobbyCode,
          'combat',
          `⚔️ ${currentPlayer.nickname} walked into ${ambusher.nickname}'s ambush!`,
          playerId,
          true
        );

        // Remove ambush from tile
        const updatedTiles = [...gameState.tiles];
        updatedTiles[position] = {
          ...landedTile,
          hasAmbush: false,
          ambushOwnerId: undefined,
        };

        await updateGameState(gameState.lobbyCode, {
          tiles: updatedTiles,
        });

        // Start combat (ambusher is attacker, current player is defender, no retreat)
        await startCombat(gameState.lobbyCode, landedTile.ambushOwnerId, [currentPlayer], false);
        setShowCombat(true);

        // Skip tile effect resolution - ambush combat takes priority
        return;
      }
    }

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
        updatedTiles[position] = {
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

    // Check for Lamp usage (step back before resolving tile with player/enemy)
    const hasLamp = currentPlayer.equipment?.holdable1?.name === 'Lamp' ||
                    currentPlayer.equipment?.holdable2?.name === 'Lamp';

    if (hasLamp) {
      // Check if tile has enemies (enemy tile)
      const isEnemyTile = landedTile.type === 'enemy1' || landedTile.type === 'enemy2' || landedTile.type === 'enemy3';

      // Check if tile has other players on it
      const hasOtherPlayers = Object.values(gameState.players).some(
        p => p.id !== playerId && p.position === position
      );

      // If tile has an encounter, use Lamp automatically (TODO: add prompt UI)
      if (isEnemyTile || hasOtherPlayers) {
        await addLog(
          gameState.lobbyCode,
          'action',
          `🏮 ${currentPlayer.nickname} used their Lamp to step back before encountering ${isEnemyTile ? 'enemies' : 'another player'}!`,
          playerId,
          true
        );

        // Step back 1 tile
        const lampPosition = Math.max(0, position - 1);
        await updateGameState(gameState.lobbyCode, {
          [`players/${playerId}/position`]: lampPosition,
        });

        // Update gameState for the new position
        const lampGameState: GameState = {
          ...gameState,
          players: {
            ...gameState.players,
            [playerId]: {
              ...currentPlayer,
              position: lampPosition,
              actionTaken: 'move',
            },
          },
        };

        // Resolve the NEW tile (where player stepped back to)
        const lampTile = gameState.tiles[lampPosition];
        if (lampTile) {
          await resolveTileEffect(lampTile, lampGameState);
        }

        return; // Skip normal tile resolution
      }
    }

    // Resolve tile effects with updated game state (only reached if no trap or Scout immunity)
    await resolveTileEffect(landedTile, updatedGameState);
  };

  /**
   * Handle player rolling dice to move
   */
  const handleMove = async () => {
    const roll = rollDice(4); // 4-sided die for movement

    // Apply movement modifiers from temp effects (e.g., Beer debuff)
    const movementModifier = getMovementModifier(currentPlayer);
    const totalMovement = Math.max(0, roll + movementModifier);

    // Calculate new position (can't overshoot final tile at 19)
    let newPosition = currentPlayer.position + totalMovement;
    if (newPosition > 19) {
      newPosition = 19;
    }

    // Update player position and mark action as taken
    await updateGameState(gameState.lobbyCode, {
      [`players/${playerId}/position`]: newPosition,
      [`players/${playerId}/actionTaken`]: 'move',
    });

    // Log the move
    const modifierText = movementModifier !== 0 ? ` (${movementModifier > 0 ? '+' : ''}${movementModifier} modifier)` : '';
    await addLog(
      gameState.lobbyCode,
      'action',
      `${currentPlayer.nickname} rolled ${roll}${modifierText} and moved to tile ${newPosition}`,
      playerId
    );

    // Check if player has Instinct - show modal to use it before continuing
    if (hasInstinct(currentPlayer)) {
      setInstinctPosition(newPosition);
      setShowInstinctModal(true);
      return; // Wait for player choice in modal
    }

    // No Instinct - continue normally
    await continueMovementAfterPosition(newPosition);
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
    // Decrement and clean up temp effects for current player
    const updatedTempEffects = decrementTempEffects(currentPlayer);

    // Move to next player in turn order
    const nextIndex = (gameState.currentTurnIndex + 1) % gameState.turnOrder.length;
    const nextPlayerId = gameState.turnOrder[nextIndex];
    const nextPlayer = nextPlayerId ? gameState.players[nextPlayerId] : null;

    await updateGameState(gameState.lobbyCode, {
      currentTurnIndex: nextIndex,
      [`players/${playerId}/actionTaken`]: null,
      [`players/${playerId}/tempEffects`]: updatedTempEffects,
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

    // Check if either player is protected from duels (Smoke Bomb effect)
    if (isDuelProtected(currentPlayer)) {
      await addLog(
        gameState.lobbyCode,
        'action',
        `💣 ${currentPlayer.nickname} has Smoke Bomb active - duels are prevented this turn!`,
        playerId,
        true
      );
      setShowDuelModal(false);
      return;
    }

    if (isDuelProtected(targetPlayer)) {
      await addLog(
        gameState.lobbyCode,
        'action',
        `💣 ${targetPlayer.nickname} has Smoke Bomb active - duels are prevented this turn!`,
        playerId,
        true
      );
      setShowDuelModal(false);
      return;
    }

    // Check if target player is invisible (Fairy Dust effect)
    if (targetPlayer.isInvisible) {
      await addLog(
        gameState.lobbyCode,
        'action',
        `✨ ${targetPlayer.nickname} is invisible - cannot be dueled!`,
        playerId,
        true
      );
      setShowDuelModal(false);
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

  /**
   * Handle Jinn Thief item selection
   * Called when player chooses which item to lose to Jinn Thief
   */
  const handleJinnThiefItemSelection = async (itemId: string) => {
    // Execute stealItem effect with the chosen itemId
    await executeEffect('steal_item', {
      gameState,
      lobbyCode: gameState.lobbyCode,
      playerId,
      itemId,
      updateGameState: (updates) => updateGameState(gameState.lobbyCode, updates),
      addLog: (type, message, pid, important) => addLog(gameState.lobbyCode, type, message, pid, important),
      drawCards: (deckType, tier, count) => drawCards(gameState.lobbyCode, deckType, tier, count),
      drawLuckCard: () => drawLuckCard(gameState.lobbyCode),
      startCombat: (attackerId, defenders, canRetreat) => startCombat(gameState.lobbyCode, attackerId, defenders, canRetreat),
      resolveTile: async (position, updatedState) => {
        const tile = gameState.tiles[position];
        if (tile) {
          await resolveTileEffect(tile, updatedState);
        }
      },
    });

    // Close modal
    setShowJinnThiefModal(false);
  };

  /**
   * Handle Instinct choice (+1, -1, or skip)
   * Called when player chooses to use Instinct card
   */
  const handleInstinctChoice = async (offset: number) => {
    // Close modal first
    setShowInstinctModal(false);

    // Get current position from state
    const currentPosition = currentPlayer.position;

    if (offset !== 0) {
      // Apply offset
      const newPosition = Math.max(0, Math.min(19, currentPosition + offset));

      // Update position
      await updateGameState(gameState.lobbyCode, {
        [`players/${playerId}/position`]: newPosition,
      });

      // Remove Instinct tempEffect
      const updatedTempEffects = (currentPlayer.tempEffects || []).filter(
        effect => effect.type !== 'instinct'
      );
      await updateGameState(gameState.lobbyCode, {
        [`players/${playerId}/tempEffects`]: updatedTempEffects,
      });

      await addLog(
        gameState.lobbyCode,
        'action',
        `🃏 ${currentPlayer.nickname} used Instinct and moved ${offset > 0 ? '+' : ''}${offset} tile to position ${newPosition}!`,
        playerId,
        true
      );

      // Continue with tile resolution at new position
      await continueMovementAfterPosition(newPosition);
    } else {
      // Player chose to skip - continue with current position
      await addLog(
        gameState.lobbyCode,
        'action',
        `${currentPlayer.nickname} chose not to use Instinct`,
        playerId
      );

      await continueMovementAfterPosition(currentPosition);
    }
  };

  return {
    resolveTileEffect,
    handleMove,
    handleSleep,
    handleEndTurn,
    handleDuel,
    handleLootPlayer,
    handleUnconsciousPlayerTurn,
    handleJinnThiefItemSelection,
    handleInstinctChoice,
    handlePlaceAmbush,
    hasAmbush: () => hasAmbush(currentPlayer),
  };
}
