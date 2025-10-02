/**
 * Game state management functions
 * Provides utilities to update the game state in Firebase Realtime Database
 */

import { ref, set, update, get } from 'firebase/database';
import { database, generateLobbyCode } from '../lib/firebase';
import type {
  GameState,
  Player,
  Tile,
  LogEntry,
  PlayerClass,
  TileType,
} from '../types';
import { buildEnemyDeck } from '../data/enemies';
import { buildTreasureDeck, buildLuckDeck } from '../data/cards';

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
    tiles: generateTiles(),
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

/**
 * Generate the 20 tiles for the game board
 * @returns Array of 20 Tile objects
 */
function generateTiles(): Tile[] {
  // Define tile types in order (0 = start, 19 = final)
  const tileTypes: TileType[] = [
    'start',      // 0
    'treasure1',  // 1
    'enemy1',     // 2
    'luck',       // 3
    'enemy1',     // 4
    'treasure2',  // 5
    'enemy2',     // 6
    'sanctuary',  // 7
    'treasure1',  // 8
    'enemy2',     // 9
    'luck',       // 10
    'enemy2',     // 11
    'treasure2',  // 12
    'enemy3',     // 13
    'luck',       // 14
    'treasure3',  // 15
    'enemy3',     // 16
    'sanctuary',  // 17
    'treasure3',  // 18
    'final',      // 19
  ];

  return tileTypes.map((type, id) => ({ id, type }));
}

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
