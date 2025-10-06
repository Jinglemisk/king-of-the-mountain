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
  CombatRoll,
  CombatResult,
  CombatLogEntry,
  Item,
} from '../types';
import { buildEnemyDeck, getEnemyComposition } from '../data/enemies';
import { buildTreasureDeck, buildLuckDeck } from '../data/cards';
import { generateBoardTiles } from '../data/BoardLayout';
import { getEquipmentBonuses, getClassCombatBonuses } from '../utils/playerStats';
import { getTempEffectCombatBonuses, removeTempEffect, hasWardstoneProtection } from '../utils/tempEffects';

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
 * Add a log entry to the game
 * @param lobbyCode - The lobby code
 * @param type - Log entry type
 * @param message - Log message
 * @param playerId - Optional player ID associated with log
 * @param isImportant - Whether to highlight this log
 */
export async function addLog(
  lobbyCode: string,
  type: 'action' | 'combat' | 'system' | 'chat',
  message: string,
  playerId?: string,
  isImportant?: boolean
): Promise<void> {
  const gameRef = ref(database, `games/${lobbyCode}`);
  const snapshot = await get(gameRef);
  const gameState = snapshot.val() as GameState;

  const newLog = createLogEntry(type, message, isImportant, playerId);

  await update(gameRef, {
    logs: [...gameState.logs, newLog],
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
  return Math.floor(Math.random() * sides) + 1;
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
        await addLog(lobbyCode, 'system', `${deckType} Tier ${tier} deck was empty and has been rebuilt.`);
      } else {
        // Shuffle discard pile back into deck
        deck = [...discard];
        discard.length = 0;
        // Shuffle the deck
        for (let j = deck.length - 1; j > 0; j--) {
          const k = Math.floor(Math.random() * (j + 1));
          [deck[j], deck[k]] = [deck[k], deck[j]];
        }
        await addLog(lobbyCode, 'system', `${deckType} Tier ${tier} deck reshuffled from discard pile.`);
      }
    }

    // Draw from top of deck
    const card = deck.shift();
    if (card) {
      drawnCards.push(card);
    }
  }

  // Update game state with new deck and discard
  await update(gameRef, {
    [deckKey]: deck,
    [discardKey]: discard,
  });

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

  // If deck is empty, reshuffle discard pile
  if (luckDeck.length === 0) {
    if (luckDiscard.length === 0) {
      // Both empty - rebuild entire deck
      luckDeck = buildLuckDeck();
      await addLog(lobbyCode, 'system', 'Luck Card deck was empty and has been rebuilt.');
    } else {
      // Shuffle discard back into deck
      luckDeck = [...luckDiscard];
      luckDiscard = [];
      // Shuffle
      for (let i = luckDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [luckDeck[i], luckDeck[j]] = [luckDeck[j], luckDeck[i]];
      }
      await addLog(lobbyCode, 'system', 'Luck Card deck reshuffled from discard pile.');
    }
  }

  // Draw from top of deck
  const drawnCard = luckDeck.shift();

  // Update game state
  await update(gameRef, {
    luckDeck,
    luckDiscard,
  });

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

  // Check if player is trapped and this is round 1
  const skipPlayerAttack = attacker.skipNextTileEffect && combat.currentRound === 0;

  // Determine if fighting enemies (all defenders are enemies if first defender is enemy)
  const firstDefender = combat.defenders[0];
  const isVsEnemy = 'attackBonus' in firstDefender && 'defenseBonus' in firstDefender;

  // Get class, equipment, and temp effect bonuses for attacker
  const classBonuses = getClassCombatBonuses(attacker, isVsEnemy);
  const equipmentBonuses = getEquipmentBonuses(attacker, isVsEnemy);
  const tempEffectBonuses = getTempEffectCombatBonuses(attacker);

  // Roll for attacker
  const attackerRoll: CombatRoll = {
    entityId: attacker.id,
    entityName: attacker.nickname,
    attackDie: skipPlayerAttack ? 0 : rollDice(6),
    defenseDie: rollDice(6),
    attackBonus: classBonuses.attackBonus + equipmentBonuses.attackBonus + tempEffectBonuses.attackBonus,
    defenseBonus: classBonuses.defenseBonus + equipmentBonuses.defenseBonus + tempEffectBonuses.defenseBonus,
    totalAttack: 0,
    totalDefense: 0,
  };

  attackerRoll.totalAttack = 1 + attackerRoll.attackDie + attackerRoll.attackBonus;
  attackerRoll.totalDefense = 1 + attackerRoll.defenseDie + attackerRoll.defenseBonus;

  // Roll for each defender
  const defenderRolls: CombatRoll[] = [];
  const results: CombatResult[] = [];

  for (const defender of combat.defenders) {
    const isPlayer = 'nickname' in defender;
    const defenderName = isPlayer ? (defender as Player).nickname : (defender as Enemy).name;

    // Get bonuses
    let defAttackBonus = 0;
    let defDefenseBonus = 0;

    if (isPlayer) {
      const defPlayer = defender as Player;
      const defClassBonuses = getClassCombatBonuses(defPlayer, false); // PvP - fighting another player
      const defEquipmentBonuses = getEquipmentBonuses(defPlayer, false); // PvP - creatures_only items don't work
      const defTempEffectBonuses = getTempEffectCombatBonuses(defPlayer);
      defAttackBonus = defClassBonuses.attackBonus + defEquipmentBonuses.attackBonus + defTempEffectBonuses.attackBonus;
      defDefenseBonus = defClassBonuses.defenseBonus + defEquipmentBonuses.defenseBonus + defTempEffectBonuses.defenseBonus;
    } else {
      const enemy = defender as Enemy;
      defAttackBonus = enemy.attackBonus;
      defDefenseBonus = enemy.defenseBonus;
    }

    const defenderRoll: CombatRoll = {
      entityId: defender.id,
      entityName: defenderName,
      attackDie: rollDice(6),
      defenseDie: rollDice(6),
      attackBonus: defAttackBonus,
      defenseBonus: defDefenseBonus,
      totalAttack: 1 + rollDice(6) + defAttackBonus,
      totalDefense: 1 + rollDice(6) + defDefenseBonus,
    };

    defenderRolls.push(defenderRoll);

    // Determine if attacker hits this defender (only if we're targeting it or there's only one)
    let attackerHits = false;
    if (combat.defenders.length === 1 || targetId === defender.id) {
      attackerHits = !skipPlayerAttack && attackerRoll.totalAttack > defenderRoll.totalDefense;
    }

    // Determine if defender hits attacker
    const defenderHits = defenderRoll.totalAttack > attackerRoll.totalDefense;

    // Calculate damage
    let defenderHpLost = attackerHits ? 1 : 0;
    let attackerHpLost = defenderHits ? 1 : 0;

    // Check Wardstone protection for attacker
    if (attackerHpLost > 0 && hasWardstoneProtection(attacker)) {
      attackerHpLost = 0; // Prevent HP loss
      attacker.tempEffects = removeTempEffect(attacker, 'wardstone');
      await addLog(lobbyCode, 'combat', `🛡️ ${attacker.nickname}'s Wardstone absorbed the damage!`, attacker.id, true);
    }

    // Check Wardstone protection for defender (if player)
    const isDefenderPlayer = 'nickname' in defender;
    if (isDefenderPlayer && defenderHpLost > 0 && hasWardstoneProtection(defender as Player)) {
      defenderHpLost = 0; // Prevent HP loss
      (defender as Player).tempEffects = removeTempEffect(defender as Player, 'wardstone');
      await addLog(lobbyCode, 'combat', `🛡️ ${(defender as Player).nickname}'s Wardstone absorbed the damage!`, defender.id, true);
    }

    // Update HP
    const newDefenderHp = Math.max(0, defender.hp - defenderHpLost);
    const newAttackerHp = Math.max(0, attacker.hp - attackerHpLost);

    // Check Monk revival for attacker
    let monkRevived = false;
    if (newAttackerHp === 0 && attacker.class === 'Monk' && !attacker.specialAbilityUsed) {
      attacker.hp = 1;
      attacker.specialAbilityUsed = true;
      monkRevived = true;
    } else {
      attacker.hp = newAttackerHp;
    }

    // Check Monk revival for defender (if player)
    if (isPlayer) {
      const defPlayer = defender as Player;
      if (newDefenderHp === 0 && defPlayer.class === 'Monk' && !defPlayer.specialAbilityUsed) {
        defender.hp = 1;
        (defender as Player).specialAbilityUsed = true;
      } else {
        defender.hp = newDefenderHp;
      }
    } else {
      defender.hp = newDefenderHp;
    }

    // Create result for defender
    results.push({
      entityId: defender.id,
      entityName: defenderName,
      hpLost: defenderHpLost,
      hpRemaining: defender.hp,
      isDefeated: defender.hp === 0,
    });

    // Create result for attacker (only once)
    if (defenderRolls.length === 1 || results.length === combat.defenders.length) {
      results.push({
        entityId: attacker.id,
        entityName: attacker.nickname,
        hpLost: attackerHpLost,
        hpRemaining: attacker.hp,
        isDefeated: attacker.hp === 0 && !monkRevived,
      });
    }
  }

  // Create combat log entry
  const roundNumber = combat.currentRound + 1;
  const logEntry: CombatLogEntry = {
    round: roundNumber,
    attackerRoll,
    defenderRolls,
    results,
  };

  // Update combat state
  const updatedCombat: CombatState = {
    ...combat,
    currentRound: roundNumber,
    combatLog: [...(combat.combatLog || []), logEntry],
    defenders: combat.defenders, // Updated HP values are in the objects
  };

  // Update game state
  const updates: any = {
    combat: updatedCombat,
    [`players/${attacker.id}/hp`]: attacker.hp,
  };

  // Clear trap flag if this was round 1
  if (combat.currentRound === 0 && attacker.skipNextTileEffect) {
    updates[`players/${attacker.id}/skipNextTileEffect`] = false;
  }

  // Update Monk ability usage
  if (attacker.specialAbilityUsed) {
    updates[`players/${attacker.id}/specialAbilityUsed`] = true;
  }

  // Update defender HP
  for (const defender of combat.defenders) {
    const isPlayer = 'nickname' in defender;
    if (isPlayer) {
      updates[`players/${defender.id}/hp`] = defender.hp;
      if ((defender as Player).specialAbilityUsed) {
        updates[`players/${defender.id}/specialAbilityUsed`] = true;
      }
    }
  }

  await update(gameRef, updates);

  // Add log messages
  if (skipPlayerAttack) {
    await addLog(lobbyCode, 'combat', `⚠️ ${attacker.nickname} is trapped and cannot attack this round!`);
  }

  for (const result of results) {
    if (result.hpLost > 0) {
      await addLog(
        lobbyCode,
        'combat',
        `💥 ${result.entityName} took ${result.hpLost} damage! (${result.hpRemaining} HP remaining)`
      );
    }
  }

  return logEntry;
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

  // Determine combat outcome
  const attackerDefeated = attacker.hp === 0;
  const defendersDefeated = combat.defenders.every(d => d.hp === 0);

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

  // Check if fighting enemies
  const firstDefender = combat.defenders[0];
  const isVsEnemy = 'attackBonus' in firstDefender;

  if (isVsEnemy) {
    // PvE combat
    if (attackerDefeated) {
      // Player lost - move back 1 tile, become unconscious (keep HP at 0, set isAlive=false)
      const newPosition = Math.max(0, attacker.position - 1);

      // Auto-advance turn so defeated player's turn ends
      const nextIndex = (gameState.currentTurnIndex + 1) % gameState.turnOrder.length;
      const nextPlayerId = gameState.turnOrder[nextIndex];

      await update(gameRef, {
        [`players/${attacker.id}/position`]: newPosition,
        [`players/${attacker.id}/hp`]: 0, // Keep at 0 until they wake
        [`players/${attacker.id}/isAlive`]: false, // Set unconscious state
        [`players/${attacker.id}/actionTaken`]: 'sleep',
        currentTurnIndex: nextIndex,
        combat: null,
      });

      await addLog(lobbyCode, 'combat', `💀 ${attacker.nickname} was defeated! Moved back 1 tile and is unconscious.`, attacker.id, true);

      const nextPlayer = nextPlayerId ? gameState.players[nextPlayerId] : null;
      if (nextPlayer) {
        await addLog(
          lobbyCode,
          'system',
          `${attacker.nickname}'s turn ended. It's now ${nextPlayer.nickname}'s turn.`
        );
      }
    } else if (defendersDefeated) {
      // Player won - roll for loot
      for (const defender of combat.defenders) {
        const enemy = defender as Enemy;
        const droppedLoot = await rollEnemyLoot(lobbyCode, enemy.tier);
        loot.push(...droppedLoot);
      }

      await update(gameRef, {
        combat: null,
      });

      await addLog(lobbyCode, 'combat', `🏆 ${attacker.nickname} defeated all enemies!`, attacker.id, true);

      if (loot.length > 0) {
        await addLog(lobbyCode, 'combat', `💎 Loot dropped: ${loot.map(l => l.name).join(', ')}`);
      }
    }
  } else {
    // PvP combat
    if (attackerDefeated) {
      // Attacker lost - stay on tile, become unconscious (keep HP at 0, set isAlive=false)

      // Auto-advance turn so defeated player's turn ends
      const nextIndex = (gameState.currentTurnIndex + 1) % gameState.turnOrder.length;
      const nextPlayerId = gameState.turnOrder[nextIndex];

      await update(gameRef, {
        [`players/${attacker.id}/hp`]: 0, // Keep at 0 until they wake
        [`players/${attacker.id}/isAlive`]: false, // Set unconscious state
        [`players/${attacker.id}/actionTaken`]: 'sleep',
        currentTurnIndex: nextIndex,
        combat: null,
      });

      await addLog(lobbyCode, 'combat', `💀 ${attacker.nickname} lost the duel and is unconscious!`, attacker.id, true);

      const nextPlayer = nextPlayerId ? gameState.players[nextPlayerId] : null;
      if (nextPlayer) {
        await addLog(
          lobbyCode,
          'system',
          `${attacker.nickname}'s turn ended. It's now ${nextPlayer.nickname}'s turn.`
        );
      }
    } else if (defendersDefeated) {
      // Attacker won PvP - set defenders as unconscious and end attacker's turn

      // Auto-advance turn so attacker's turn ends after looting
      const nextIndex = (gameState.currentTurnIndex + 1) % gameState.turnOrder.length;
      const nextPlayerId = gameState.turnOrder[nextIndex];

      const updates: any = {
        combat: null,
        currentTurnIndex: nextIndex,
      };

      // Set all defeated defenders as unconscious
      for (const defender of combat.defenders) {
        if ('nickname' in defender) { // Is player
          updates[`players/${defender.id}/hp`] = 0;
          updates[`players/${defender.id}/isAlive`] = false;
          updates[`players/${defender.id}/actionTaken`] = 'sleep';
        }
      }

      await update(gameRef, updates);
      await addLog(lobbyCode, 'combat', `🏆 ${attacker.nickname} won the duel!`, attacker.id, true);

      const nextPlayer = nextPlayerId ? gameState.players[nextPlayerId] : null;
      if (nextPlayer) {
        await addLog(
          lobbyCode,
          'system',
          `${attacker.nickname}'s turn ended. It's now ${nextPlayer.nickname}'s turn.`
        );
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
 */
export async function rollEnemyLoot(
  lobbyCode: string,
  enemyTier: 1 | 2 | 3
): Promise<Item[]> {
  const loot: Item[] = [];
  const roll = Math.random();

  if (enemyTier === 1) {
    // T1: 50% chance for 1× T1 treasure
    if (roll < 0.5) {
      const items = await drawCards(lobbyCode, 'treasure', 1, 1);
      loot.push(...items);
    }
  } else if (enemyTier === 2) {
    // T2: 70% T2, 15% T1, 15% nothing
    if (roll < 0.7) {
      const items = await drawCards(lobbyCode, 'treasure', 2, 1);
      loot.push(...items);
    } else if (roll < 0.85) {
      const items = await drawCards(lobbyCode, 'treasure', 1, 1);
      loot.push(...items);
    }
  } else if (enemyTier === 3) {
    // T3: 80% T3, 20% T2
    if (roll < 0.8) {
      const items = await drawCards(lobbyCode, 'treasure', 3, 1);
      loot.push(...items);
    } else {
      const items = await drawCards(lobbyCode, 'treasure', 2, 1);
      loot.push(...items);
    }
  }

  return loot;
}
