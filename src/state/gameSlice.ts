/**
 * Game state management functions
 * Provides utilities to update the game state in Firebase Realtime Database
 */

import { ref, set, update, get } from 'firebase/database';
import { database, generateLobbyCode } from '../lib/firebase';
import type {
  GameState,
  Player,
  LogEntry,
  PlayerClass,
  Enemy,
  CombatState,
  CombatLogEntry,
  Item,
} from '../types';
import { buildEnemyDeck, getEnemyComposition } from '../data/enemies';
import { buildTreasureDeck, buildLuckDeck } from '../data/cards';
import { generateBoardTiles } from '../data/BoardLayout';
import { rollDice as rollDiceFromEngine } from '../services/combat/combatEngine';

/**
 * Create a new game lobby with initial state
 * @param hostPlayerId - ID of the player creating the lobby
 * @param hostNickname - Nickname of the host player
 * @returns The lobby code for other players to join
 */
export async function createGameLobby(
  hostPlayerId: string,
  hostNickname: string
): Promise<string> {
  const lobbyCode = generateLobbyCode();

  // Create initial player (host)
  const hostPlayer: Player = {
    id: hostPlayerId,
    nickname: hostNickname,
    class: null, // Will be selected in lobby
    position: 0,
    hp: 5,
    maxHp: 5,
    equipment: {
      holdable1: null,
      holdable2: null,
      wearable: null,
    },
    inventory: [null, null, null, null], // 4 slots by default
    isReady: false,
    isHost: true,
    isAlive: true,
    actionTaken: null,
    tempEffects: [],
  };

  // Create initial game state
  const initialState: GameState = {
    lobbyCode,
    status: 'waiting',
    players: {
      [hostPlayerId]: hostPlayer,
    },
    turnOrder: [],
    currentTurnIndex: 0,
    tiles: generateBoardTiles(),
    enemyDeck1: [],
    enemyDeck2: [],
    enemyDeck3: [],
    treasureDeck1: [],
    treasureDeck2: [],
    treasureDeck3: [],
    luckDeck: [],
    enemyDiscard1: [],
    enemyDiscard2: [],
    enemyDiscard3: [],
    treasureDiscard1: [],
    treasureDiscard2: [],
    treasureDiscard3: [],
    luckDiscard: [],
    combat: null,
    trade: null,
    logs: [
      createLogEntry('system', `${hostNickname} created the lobby. Code: ${lobbyCode}`),
    ],
    winnerId: null,
  };

  // Save to Firebase
  await set(ref(database, `games/${lobbyCode}`), initialState);

  return lobbyCode;
}

/**
 * Join an existing game lobby
 * @param lobbyCode - The lobby code to join
 * @param playerId - ID of the joining player
 * @param nickname - Nickname of the joining player
 * @returns True if successfully joined, false if lobby doesn't exist
 */
export async function joinGameLobby(
  lobbyCode: string,
  playerId: string,
  nickname: string
): Promise<boolean> {
  const gameRef = ref(database, `games/${lobbyCode}`);
  const snapshot = await get(gameRef);

  if (!snapshot.exists()) {
    return false; // Lobby doesn't exist
  }

  const gameState = snapshot.val() as GameState;

  // Check if game already started
  if (gameState.status !== 'waiting') {
    return false; // Can't join a game in progress
  }

  // Check if already 6 players
  if (Object.keys(gameState.players).length >= 6) {
    return false; // Lobby full
  }

  // Create new player
  const newPlayer: Player = {
    id: playerId,
    nickname,
    class: null,
    position: 0,
    hp: 5,
    maxHp: 5,
    equipment: {
      holdable1: null,
      holdable2: null,
      wearable: null,
    },
    inventory: [null, null, null, null],
    isReady: false,
    isHost: false,
    isAlive: true,
    actionTaken: null,
    tempEffects: [],
  };

  // Add player to game state
  await update(gameRef, {
    [`players/${playerId}`]: newPlayer,
    logs: [
      ...gameState.logs,
      createLogEntry('system', `${nickname} joined the lobby`),
    ],
  });

  return true;
}

/**
 * Update a player's class selection and ready status
 * @param lobbyCode - The lobby code
 * @param playerId - The player's ID
 * @param selectedClass - The class they selected
 */
export async function selectClass(
  lobbyCode: string,
  playerId: string,
  selectedClass: PlayerClass
): Promise<void> {
  const gameRef = ref(database, `games/${lobbyCode}`);
  const snapshot = await get(gameRef);
  const gameState = snapshot.val() as GameState;

  await update(gameRef, {
    [`players/${playerId}/class`]: selectedClass,
    [`players/${playerId}/isReady`]: true,
    logs: [
      ...gameState.logs,
      createLogEntry('system', `${gameState.players[playerId].nickname} selected ${selectedClass}`),
    ],
  });
}

/**
 * Start the game (initialize decks, roll for turn order, etc.)
 * @param lobbyCode - The lobby code
 */
export async function startGame(lobbyCode: string): Promise<void> {
  const gameRef = ref(database, `games/${lobbyCode}`);
  const snapshot = await get(gameRef);
  const gameState = snapshot.val() as GameState;

  // Build all card decks
  const enemyDeck1 = buildEnemyDeck(1);
  const enemyDeck2 = buildEnemyDeck(2);
  const enemyDeck3 = buildEnemyDeck(3);
  const treasureDeck1 = buildTreasureDeck(1);
  const treasureDeck2 = buildTreasureDeck(2);
  const treasureDeck3 = buildTreasureDeck(3);
  const luckDeck = buildLuckDeck();

  // Apply class-specific bonuses (e.g., Porter gets +1 inventory slot)
  const updatedPlayers: Record<string, Player> = {};
  Object.entries(gameState.players).forEach(([playerId, player]) => {
    updatedPlayers[playerId] = {
      ...player,
      inventory: player.inventory ? [...player.inventory] : [null, null, null, null],
      equipment: player.equipment || {
        holdable1: null,
        holdable2: null,
        wearable: null,
      },
    };

    if (player.class === 'Porter') {
      updatedPlayers[playerId].inventory.push(null); // Add 5th slot
    }
  });

  // Roll dice for turn order (simplified - just random order for now)
  const playerIds = Object.keys(updatedPlayers);
  const turnOrder = playerIds.sort(() => Math.random() - 0.5);

  // Update game state
  await update(gameRef, {
    status: 'active',
    players: updatedPlayers,
    enemyDeck1,
    enemyDeck2,
    enemyDeck3,
    treasureDeck1,
    treasureDeck2,
    treasureDeck3,
    luckDeck,
    // Initialize all discard piles as empty arrays
    enemyDiscard1: [],
    enemyDiscard2: [],
    enemyDiscard3: [],
    treasureDiscard1: [],
    treasureDiscard2: [],
    treasureDiscard3: [],
    luckDiscard: [],
    turnOrder,
    currentTurnIndex: 0,
    logs: [
      ...gameState.logs,
      createLogEntry('system', '🎲 Game started! Rolling for turn order...', true),
      createLogEntry('system', `Turn order: ${turnOrder.map(id => updatedPlayers[id].nickname).join(' → ')}`, true),
    ],
  });
}

/**
 * Update the entire game state (use sparingly - prefer targeted updates)
 * @param lobbyCode - The lobby code
 * @param updates - Partial game state to update
 */
export async function updateGameState(
  lobbyCode: string,
  updates: Partial<GameState>
): Promise<void> {
  const gameRef = ref(database, `games/${lobbyCode}`);
  await update(gameRef, updates);
}

/**
 * Update game state and add log entry in a single atomic operation (PERFORMANCE OPTIMIZED)
 * This avoids the extra read that addLog() normally does
 * @param lobbyCode - The lobby code
 * @param updates - Partial game state to update
 * @param logType - Log entry type
 * @param logMessage - Log message
 * @param playerId - Optional player ID associated with log
 * @param isImportant - Whether to highlight this log
 * @param currentLogs - Current logs array from game state
 */
export async function updateGameStateWithLog(
  lobbyCode: string,
  updates: Partial<GameState>,
  logType: 'action' | 'combat' | 'system' | 'chat',
  logMessage: string,
  currentLogs: LogEntry[],
  playerId?: string,
  isImportant?: boolean
): Promise<void> {
  const gameRef = ref(database, `games/${lobbyCode}`);
  const newLog = createLogEntry(logType, logMessage, isImportant, playerId);

  // Combine state updates with log update in single operation
  await update(gameRef, {
    ...updates,
    logs: [...currentLogs, newLog],
  });
}

/**
 * Add a log entry to the game
 * @param lobbyCode - The lobby code
 * @param type - Log entry type
 * @param message - Log message
 * @param playerId - Optional player ID associated with log
 * @param isImportant - Whether to highlight this log
 * @param currentLogs - Optional current logs array to avoid extra read (performance optimization)
 */
export async function addLog(
  lobbyCode: string,
  type: 'action' | 'combat' | 'system' | 'chat',
  message: string,
  playerId?: string,
  isImportant?: boolean,
  currentLogs?: LogEntry[]
): Promise<void> {
  const gameRef = ref(database, `games/${lobbyCode}`);

  let logs: LogEntry[];
  if (currentLogs) {
    // Use provided logs to avoid extra read
    logs = currentLogs;
  } else {
    // Fall back to reading logs if not provided
    const snapshot = await get(gameRef);
    const gameState = snapshot.val() as GameState;
    logs = gameState.logs;
  }

  const newLog = createLogEntry(type, message, isImportant, playerId);

  await update(gameRef, {
    logs: [...logs, newLog],
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Note: Board tile generation has been moved to /src/data/BoardLayout.ts
// Use generateBoardTiles() from BoardLayout for board generation

/**
 * Create a log entry
 * @param type - Log type
 * @param message - Log message
 * @param isImportant - Whether to highlight
 * @param playerId - Associated player ID
 * @returns LogEntry object
 */
function createLogEntry(
  type: 'action' | 'combat' | 'system' | 'chat',
  message: string,
  isImportant?: boolean,
  playerId?: string
): LogEntry {
  const entry: LogEntry = {
    id: `log-${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
    type,
    message,
  };

  // Only include optional fields if they have values
  if (playerId !== undefined) {
    entry.playerId = playerId;
  }
  if (isImportant !== undefined) {
    entry.isImportant = isImportant;
  }

  return entry;
}

/**
 * Roll a dice with specified number of sides
 * @param sides - Number of sides (e.g., 4 or 6)
 * @returns Random number from 1 to sides
 */
export function rollDice(sides: number): number {
  // Re-export from combat engine for backward compatibility
  return rollDiceFromEngine(sides);
}

/**
 * Draw cards from a treasure or enemy deck (with auto-reshuffle)
 * @param lobbyCode - The lobby code
 * @param deckType - Type of deck ('treasure' or 'enemy')
 * @param tier - Deck tier (1, 2, or 3)
 * @param count - Number of cards to draw
 * @returns Array of drawn cards (Items or Enemies)
 */
export async function drawCards(
  lobbyCode: string,
  deckType: 'treasure' | 'enemy',
  tier: 1 | 2 | 3,
  count: number
): Promise<any[]> {
  const gameRef = ref(database, `games/${lobbyCode}`);
  const snapshot = await get(gameRef);
  const gameState = snapshot.val() as GameState;

  const deckKey = `${deckType}Deck${tier}` as keyof GameState;
  const discardKey = `${deckType}Discard${tier}` as keyof GameState;

  let deck = Array.isArray(gameState[deckKey]) ? [...(gameState[deckKey] as any[])] : [];
  let discard = Array.isArray(gameState[discardKey]) ? [...(gameState[discardKey] as any[])] : [];
  const drawnCards: any[] = [];
  const logsToAdd: LogEntry[] = [];

  for (let i = 0; i < count; i++) {
    // If deck is empty, reshuffle discard pile back into deck
    if (deck.length === 0) {
      if (discard.length === 0) {
        // Both deck and discard are empty - rebuild entire deck
        if (deckType === 'treasure') {
          deck = buildTreasureDeck(tier);
        } else {
          deck = buildEnemyDeck(tier);
        }
        logsToAdd.push(createLogEntry('system', `${deckType} Tier ${tier} deck was empty and has been rebuilt.`));
      } else {
        // Shuffle discard pile back into deck
        deck = [...discard];
        discard.length = 0;
        // Shuffle the deck
        for (let j = deck.length - 1; j > 0; j--) {
          const k = Math.floor(Math.random() * (j + 1));
          [deck[j], deck[k]] = [deck[k], deck[j]];
        }
        logsToAdd.push(createLogEntry('system', `${deckType} Tier ${tier} deck reshuffled from discard pile.`));
      }
    }

    // Draw from top of deck
    const card = deck.shift();
    if (card) {
      drawnCards.push(card);
    }
  }

  // Update game state with new deck, discard, and logs in single operation
  const updates: any = {
    [deckKey]: deck,
    [discardKey]: discard,
  };

  if (logsToAdd.length > 0) {
    updates.logs = [...gameState.logs, ...logsToAdd];
  }

  await update(gameRef, updates);

  return drawnCards;
}

/**
 * Draw a Luck Card from the deck (with auto-reshuffle)
 * @param lobbyCode - The lobby code
 * @returns The drawn LuckCard
 */
export async function drawLuckCard(lobbyCode: string): Promise<any> {
  const gameRef = ref(database, `games/${lobbyCode}`);
  const snapshot = await get(gameRef);
  const gameState = snapshot.val() as GameState;

  let luckDeck = Array.isArray(gameState.luckDeck) ? [...gameState.luckDeck] : [];
  let luckDiscard = Array.isArray(gameState.luckDiscard) ? [...gameState.luckDiscard] : [];
  const logsToAdd: LogEntry[] = [];

  // If deck is empty, reshuffle discard pile
  if (luckDeck.length === 0) {
    if (luckDiscard.length === 0) {
      // Both empty - rebuild entire deck
      luckDeck = buildLuckDeck();
      logsToAdd.push(createLogEntry('system', 'Luck Card deck was empty and has been rebuilt.'));
    } else {
      // Shuffle discard back into deck
      luckDeck = [...luckDiscard];
      luckDiscard = [];
      // Shuffle
      for (let i = luckDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [luckDeck[i], luckDeck[j]] = [luckDeck[j], luckDeck[i]];
      }
      logsToAdd.push(createLogEntry('system', 'Luck Card deck reshuffled from discard pile.'));
    }
  }

  // Draw from top of deck
  const drawnCard = luckDeck.shift();

  // Update game state with deck, discard, and logs in single operation
  const updates: any = {
    luckDeck,
    luckDiscard,
  };

  if (logsToAdd.length > 0) {
    updates.logs = [...gameState.logs, ...logsToAdd];
  }

  await update(gameRef, updates);

  return drawnCard;
}

/**
 * Get enemies to draw based on tile tier using composition logic
 * @param lobbyCode - The lobby code
 * @param tier - Enemy tile tier (1, 2, or 3)
 * @returns Array of drawn Enemy cards
 */
export async function drawEnemiesForTile(
  lobbyCode: string,
  tier: 1 | 2 | 3
): Promise<any[]> {
  const composition = getEnemyComposition(tier);
  const allEnemies: any[] = [];

  for (const comp of composition) {
    const enemies = await drawCards(lobbyCode, 'enemy', comp.tier, comp.count);
    allEnemies.push(...enemies);
  }

  return allEnemies;
}

// ============================================================================
// COMBAT FUNCTIONS
// ============================================================================

/**
 * Start combat between a player and enemies or other players
 * @param lobbyCode - The lobby code
 * @param attackerId - ID of the attacking player
 * @param defenders - Array of enemies or players being fought
 * @param canRetreat - Whether the player can retreat (true for PvE, false for PvP duel)
 */
export async function startCombat(
  lobbyCode: string,
  attackerId: string,
  defenders: (Enemy | Player)[],
  canRetreat: boolean = true
): Promise<void> {
  const gameRef = ref(database, `games/${lobbyCode}`);
  const snapshot = await get(gameRef);
  const gameState = snapshot.val() as GameState;

  const attacker = gameState.players[attackerId];
  const defenderIds = defenders.map(d => d.id);

  const combatState: CombatState = {
    isActive: true,
    attackerId,
    defenderIds,
    defenders,
    currentRound: 0,
    combatLog: [],
    canRetreat,
  };

  await update(gameRef, {
    combat: combatState,
  });

  await addLog(
    lobbyCode,
    'combat',
    `⚔️ ${attacker.nickname} entered combat!`,
    attackerId,
    true
  );
}

/**
 * Execute a single round of combat
 * @param lobbyCode - The lobby code
 * @param targetId - ID of the target to attack (for multiple enemies)
 * @returns Combat result for this round
 */
export async function executeCombatRound(
  lobbyCode: string,
  targetId?: string
): Promise<CombatLogEntry> {
  const gameRef = ref(database, `games/${lobbyCode}`);
  const snapshot = await get(gameRef);
  const gameState = snapshot.val() as GameState;

  if (!gameState.combat || !gameState.combat.isActive) {
    throw new Error('No active combat');
  }

  const combat = gameState.combat;
  const attacker = gameState.players[combat.attackerId];

  // Use combat engine to calculate round results
  const { executeCombatRound: calculateRound } = await import('../services/combat');
  const roundResult = calculateRound(
    attacker,
    combat.defenders,
    combat.currentRound,
    targetId
  );

  // Update combat state with new log entry
  const updatedCombat: CombatState = {
    ...combat,
    currentRound: roundResult.logEntry.round,
    combatLog: [...(combat.combatLog || []), roundResult.logEntry],
    defenders: combat.defenders.map(d => {
      const defUpdate = roundResult.defenderUpdates.get(d.id);
      return defUpdate ? { ...d, hp: defUpdate.hp } : d;
    }),
  };

  // Build Firebase updates
  const updates: any = {
    combat: updatedCombat,
    [`players/${attacker.id}/hp`]: roundResult.attackerUpdates.hp,
  };

  // Apply attacker updates
  if (roundResult.attackerUpdates.specialAbilityUsed !== undefined) {
    updates[`players/${attacker.id}/specialAbilityUsed`] = roundResult.attackerUpdates.specialAbilityUsed;
  }
  if (roundResult.attackerUpdates.tempEffects !== undefined) {
    updates[`players/${attacker.id}/tempEffects`] = roundResult.attackerUpdates.tempEffects;
  }
  if (roundResult.attackerUpdates.skipNextTileEffect !== undefined) {
    updates[`players/${attacker.id}/skipNextTileEffect`] = roundResult.attackerUpdates.skipNextTileEffect;
  }

  // Apply defender updates (for player defenders)
  for (const [defenderId, defUpdate] of roundResult.defenderUpdates.entries()) {
    const isPlayer = 'nickname' in combat.defenders.find(d => d.id === defenderId)!;
    if (isPlayer) {
      updates[`players/${defenderId}/hp`] = defUpdate.hp;
      if (defUpdate.specialAbilityUsed !== undefined) {
        updates[`players/${defenderId}/specialAbilityUsed`] = defUpdate.specialAbilityUsed;
      }
      if (defUpdate.tempEffects !== undefined) {
        updates[`players/${defenderId}/tempEffects`] = defUpdate.tempEffects;
      }
    }
  }

  await update(gameRef, updates);

  // Add log messages
  if (attacker.skipNextTileEffect && combat.currentRound === 0) {
    await addLog(lobbyCode, 'combat', `⚠️ ${attacker.nickname} is trapped and cannot attack this round!`);
  }

  // Log Wardstone messages
  for (const message of roundResult.wardstoneMessages) {
    await addLog(lobbyCode, 'combat', message, attacker.id, true);
  }

  // Log damage
  for (const result of roundResult.logEntry.results) {
    if (result.hpLost > 0) {
      await addLog(
        lobbyCode,
        'combat',
        `💥 ${result.entityName} took ${result.hpLost} damage! (${result.hpRemaining} HP remaining)`
      );
    }
  }

  return roundResult.logEntry;
}

/**
 * End combat and handle victory/defeat
 * @param lobbyCode - The lobby code
 * @param retreated - True if player retreated
 * @returns Loot dropped by defeated enemies (if any)
 */
export async function endCombat(
  lobbyCode: string,
  retreated: boolean = false
): Promise<Item[]> {
  const gameRef = ref(database, `games/${lobbyCode}`);
  const snapshot = await get(gameRef);
  const gameState = snapshot.val() as GameState;

  if (!gameState.combat) {
    return [];
  }

  const combat = gameState.combat;
  const attacker = gameState.players[combat.attackerId];
  const loot: Item[] = [];

  // Handle retreat
  if (retreated) {
    const newPosition = Math.max(0, attacker.position - 6);
    await update(gameRef, {
      [`players/${attacker.id}/position`]: newPosition,
      combat: null,
    });
    await addLog(lobbyCode, 'combat', `🏃 ${attacker.nickname} retreated from combat!`, attacker.id, true);
    return [];
  }

  // Determine combat outcome
  const attackerDefeated = attacker.hp === 0;
  const defendersDefeated = combat.defenders.every(d => d.hp === 0);

  // Check if fighting enemies
  const firstDefender = combat.defenders[0];
  const isVsEnemy = 'attackBonus' in firstDefender;

  if (isVsEnemy) {
    // PvE combat
    if (attackerDefeated) {
      // Player lost - move back 1 tile, become unconscious
      const newPosition = Math.max(0, attacker.position - 1);
      const nextIndex = (gameState.currentTurnIndex + 1) % gameState.turnOrder.length;
      const nextPlayerId = gameState.turnOrder[nextIndex];

      await update(gameRef, {
        [`players/${attacker.id}/position`]: newPosition,
        [`players/${attacker.id}/hp`]: 0,
        [`players/${attacker.id}/isAlive`]: false,
        [`players/${attacker.id}/actionTaken`]: 'sleep',
        currentTurnIndex: nextIndex,
        combat: null,
      });

      await addLog(lobbyCode, 'combat', `💀 ${attacker.nickname} was defeated! Moved back 1 tile and is unconscious.`, attacker.id, true);

      const nextPlayer = nextPlayerId ? gameState.players[nextPlayerId] : null;
      if (nextPlayer) {
        await addLog(lobbyCode, 'system', `${attacker.nickname}'s turn ended. It's now ${nextPlayer.nickname}'s turn.`);
      }
    } else if (defendersDefeated) {
      // Player won - roll for loot using combat persistence
      const { rollLootForEnemies } = await import('../services/combat/combatPersistence');
      const enemies = combat.defenders as Enemy[];
      const droppedLoot = await rollLootForEnemies(lobbyCode, enemies);
      loot.push(...droppedLoot);

      await update(gameRef, { combat: null });

      await addLog(lobbyCode, 'combat', `🏆 ${attacker.nickname} defeated all enemies!`, attacker.id, true);

      if (loot.length > 0) {
        await addLog(lobbyCode, 'combat', `💎 Loot dropped: ${loot.map(l => l.name).join(', ')}`);
      }
    }
  } else {
    // PvP combat
    if (attackerDefeated) {
      // Attacker lost - become unconscious
      const nextIndex = (gameState.currentTurnIndex + 1) % gameState.turnOrder.length;
      const nextPlayerId = gameState.turnOrder[nextIndex];

      await update(gameRef, {
        [`players/${attacker.id}/hp`]: 0,
        [`players/${attacker.id}/isAlive`]: false,
        [`players/${attacker.id}/actionTaken`]: 'sleep',
        currentTurnIndex: nextIndex,
        combat: null,
      });

      await addLog(lobbyCode, 'combat', `💀 ${attacker.nickname} lost the duel and is unconscious!`, attacker.id, true);

      const nextPlayer = nextPlayerId ? gameState.players[nextPlayerId] : null;
      if (nextPlayer) {
        await addLog(lobbyCode, 'system', `${attacker.nickname}'s turn ended. It's now ${nextPlayer.nickname}'s turn.`);
      }
    } else if (defendersDefeated) {
      // Attacker won PvP
      const nextIndex = (gameState.currentTurnIndex + 1) % gameState.turnOrder.length;
      const nextPlayerId = gameState.turnOrder[nextIndex];

      const updates: any = {
        combat: null,
        currentTurnIndex: nextIndex,
      };

      // Set all defeated defenders as unconscious
      for (const defender of combat.defenders) {
        if ('nickname' in defender) {
          updates[`players/${defender.id}/hp`] = 0;
          updates[`players/${defender.id}/isAlive`] = false;
          updates[`players/${defender.id}/actionTaken`] = 'sleep';
        }
      }

      await update(gameRef, updates);
      await addLog(lobbyCode, 'combat', `🏆 ${attacker.nickname} won the duel!`, attacker.id, true);

      const nextPlayer = nextPlayerId ? gameState.players[nextPlayerId] : null;
      if (nextPlayer) {
        await addLog(lobbyCode, 'system', `${attacker.nickname}'s turn ended. It's now ${nextPlayer.nickname}'s turn.`);
      }
    }
  }

  return loot;
}

/**
 * Roll for loot drops from defeated enemies
 * @param lobbyCode - The lobby code
 * @param enemyTier - Tier of defeated enemy
 * @returns Array of dropped items
 * @deprecated Use rollLootForEnemies from combat/combatPersistence instead
 */
export async function rollEnemyLoot(
  lobbyCode: string,
  enemyTier: 1 | 2 | 3
): Promise<Item[]> {
  // Re-export for backward compatibility
  const { rollLootForEnemies } = await import('../services/combat/combatPersistence');
  return rollLootForEnemies(lobbyCode, [{ tier: enemyTier } as Enemy]);
}
