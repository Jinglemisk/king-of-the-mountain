import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  writeBatch,
  query,
  orderBy,
  limit,
  type Unsubscribe,
  type QuerySnapshot,
  type DocumentData
} from 'firebase/firestore';
import { getDb, getCurrentUser, isInMockMode } from './firebase';
import * as mockGameService from './mockGameService';
import boardDataV1 from '../data/board.v1.json';
import type {
  GameDoc,
  NetworkPlayerState,
  LogEntry,
  ChatMessage,
  ClientAction,
  RoomDoc,
  DeckState,
  TileEnemies,
  TileAttachments,
  CombatState,
  FinalTileTie,
  CardId
} from './types';
import type { GameState } from '../types';
import { GameEngine } from '../engine/GameEngine';
import { rollD6 } from '../util/rng';

const SCHEMA_VERSION = '1.0.0';

export async function startGame(roomCode: string): Promise<string> {
  const user = getCurrentUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Use mock service in mock mode
  if (isInMockMode()) {
    // Get room data from localStorage
    const roomsData = localStorage.getItem('kotm_mock_rooms');
    if (!roomsData) throw new Error('No rooms found');

    const rooms = JSON.parse(roomsData);
    const roomData = rooms[roomCode.toUpperCase()];
    if (!roomData) throw new Error('Room not found');

    return mockGameService.createGame(roomData);
  }

  const db = getDb();

  const roomRef = doc(db, 'rooms', roomCode.toUpperCase());

  return await runTransaction(db, async (transaction) => {
    const roomDoc = await transaction.get(roomRef);

    if (!roomDoc.exists()) {
      throw new Error('Room not found');
    }

    const roomData = roomDoc.data() as RoomDoc;

    if (roomData.ownerUid !== user.uid) {
      throw new Error('Only room owner can start the game');
    }

    if (roomData.status !== 'lobby') {
      throw new Error('Game already started');
    }

    // Validate ready status and minimum players
    const activePlayers = roomData.seats.filter(seat => seat.uid !== null);
    if (activePlayers.length < 2) {
      throw new Error('Need at least 2 players to start');
    }

    const notReady = activePlayers.filter(seat => !seat.ready);
    if (notReady.length > 0) {
      throw new Error('All players must be ready');
    }

    // Check for duplicate classes
    const classes = activePlayers.map(seat => seat.classId).filter(Boolean);
    const uniqueClasses = new Set(classes);
    if (classes.length !== uniqueClasses.size) {
      throw new Error('Duplicate classes not allowed');
    }

    // Create game ID
    const gameId = `${roomCode}_${Date.now()}`;

    // Determine turn order
    const turnOrderRolls = activePlayers.map(player => ({
      uid: player.uid!,
      nickname: player.nickname!,
      classId: player.classId!,
      roll: rollD6()
    }));

    // Sort by roll (highest first), handle ties
    turnOrderRolls.sort((a, b) => b.roll - a.roll);

    // Resolve ties with re-rolls
    let i = 0;
    while (i < turnOrderRolls.length - 1) {
      const tiedPlayers = [turnOrderRolls[i]];
      let j = i + 1;

      while (j < turnOrderRolls.length && turnOrderRolls[j].roll === turnOrderRolls[i].roll) {
        tiedPlayers.push(turnOrderRolls[j]);
        j++;
      }

      if (tiedPlayers.length > 1) {
        // Re-roll for tied players
        tiedPlayers.forEach(player => {
          player.roll = rollD6();
        });
        tiedPlayers.sort((a, b) => b.roll - a.roll);

        // Replace in main array
        for (let k = 0; k < tiedPlayers.length; k++) {
          turnOrderRolls[i + k] = tiedPlayers[k];
        }
      } else {
        i = j;
      }
    }

    const turnOrder = turnOrderRolls.map(p => p.uid);

    // Initialize player states
    const players: { [uid: string]: NetworkPlayerState } = {};
    for (const player of turnOrderRolls) {
      players[player.uid] = {
        uid: player.uid,
        nickname: player.nickname,
        classId: player.classId,
        hp: 5,
        maxHp: 5,
        position: 0, // Start tile
        flags: {},
        inventory: {
          equipped: {
            wearable: null,
            holdableA: null,
            holdableB: null
          },
          bandolier: [],
          backpack: []
        },
        movementHistory: [],
        perTurn: {}
      };

      // Apply class starting items
      if (player.classId === 'class.scout.v1') {
        players[player.uid].inventory.bandolier.push('item.trap.v1');
      } else if (player.classId === 'class.guardian.v1') {
        players[player.uid].inventory.equipped.holdableA = 'item.woodenShield.v1';
      }
    }

    // Initialize decks (simplified - should be shuffled content from catalog)
    const initializeDeck = (cards: CardId[]): DeckState => ({
      draw: [...cards],
      discard: []
    });

    // Create game document
    const gameDoc: Omit<GameDoc, 'createdAt' | 'updatedAt' | 'startedAt'> = {
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      status: 'playing',
      createdBy: user.uid,
      endedAt: null,

      currentPlayerUid: turnOrder[0],
      phase: 'turnStart',
      turnOrder,
      turnNumber: 1,

      board: {
        id: 'board.v1',
        graph: boardDataV1 as any, // Include the actual board graph data
        playerPositions: Object.fromEntries(turnOrder.map(uid => [uid, 0]))
      },

      players,

      decks: {
        treasure: {
          t1: initializeDeck([]), // Will be populated from content catalog
          t2: initializeDeck([]),
          t3: initializeDeck([])
        },
        chance: {
          main: initializeDeck([])
        },
        enemies: {
          t1: initializeDeck([]),
          t2: initializeDeck([]),
          t3: initializeDeck([])
        }
      },

      tileState: {
        enemies: {},
        attachments: {
          traps: {},
          ambushes: {}
        }
      },

      combat: null,
      finalTileTie: null,
      rngAudit: [],
      analytics: {
        tilesMoved: {},
        enemiesDefeated: {},
        duelsWon: {},
        duelsLost: {},
        itemsAcquired: 0,
        itemsConsumed: 0,
        totalTurns: 0
      }
    };

    // Create game document
    const gameRef = doc(db, 'games', gameId);
    transaction.set(gameRef, {
      ...gameDoc,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      startedAt: serverTimestamp()
    });

    // Update room status
    transaction.update(roomRef, {
      status: 'playing',
      gameId,
      updatedAt: serverTimestamp()
    });

    // Add initial log entry
    const logRef = doc(collection(db, 'games', gameId, 'log'));
    transaction.set(logRef, {
      ts: serverTimestamp(),
      seq: 1,
      actorUid: user.uid,
      type: 'GameStarted',
      message: `Game started with ${activePlayers.length} players`,
      payload: { turnOrder, roomCode },
      visibility: 'public'
    });

    return gameId;
  });
}

export async function applyGameAction(
  gameId: string,
  action: Omit<ClientAction, 'ts'>,
  engineTransform: (state: GameState) => GameState
): Promise<void> {
  // Use mock service in mock mode
  if (isInMockMode()) {
    return mockGameService.applyGameAction(gameId, action, engineTransform);
  }

  const db = getDb();
  const user = getCurrentUser();

  if (!user || user.uid !== action.uid) {
    throw new Error('User authentication mismatch');
  }

  const gameRef = doc(db, 'games', gameId);

  await runTransaction(db, async (transaction) => {
    const gameDoc = await transaction.get(gameRef);

    if (!gameDoc.exists()) {
      throw new Error('Game not found');
    }

    const currentState = gameDoc.data() as GameDoc;

    // Verify current player
    if (currentState.currentPlayerUid !== user.uid) {
      throw new Error('Not your turn');
    }

    // Convert network state to engine state
    const engineState = convertNetworkToEngineState(currentState);

    // Apply engine transformation
    const newEngineState = engineTransform(engineState);

    // Convert back to network state
    const newNetworkState = convertEngineToNetworkState(newEngineState, currentState);

    // Increment version
    newNetworkState.version = currentState.version + 1;

    // Update game document
    transaction.update(gameRef, {
      ...newNetworkState,
      updatedAt: serverTimestamp()
    });

    // Add action log
    const actionRef = doc(collection(db, 'games', gameId, 'actions'));
    transaction.set(actionRef, {
      ...action,
      ts: serverTimestamp()
    });
  });
}

export function subscribeToGame(
  gameId: string,
  callback: (game: GameDoc | null) => void
): Unsubscribe {
  // Use mock service in mock mode
  if (isInMockMode()) {
    return mockGameService.subscribeToGame(gameId, callback);
  }

  const db = getDb();
  const gameRef = doc(db, 'games', gameId);

  return onSnapshot(gameRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as GameDoc);
    } else {
      callback(null);
    }
  });
}

export function subscribeToGameLog(
  gameId: string,
  callback: (logs: LogEntry[]) => void,
  limitCount: number = 50
): Unsubscribe {
  // Use mock service in mock mode
  if (isInMockMode()) {
    return mockGameService.subscribeToGameLog(gameId, callback, limitCount);
  }

  const db = getDb();
  const logQuery = query(
    collection(db, 'games', gameId, 'log'),
    orderBy('ts', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(logQuery, (snapshot: QuerySnapshot<DocumentData>) => {
    const logs = snapshot.docs.map(doc => doc.data() as LogEntry);
    callback(logs.reverse()); // Reverse to get chronological order
  });
}

export function subscribeToChat(
  gameId: string,
  callback: (messages: ChatMessage[]) => void,
  limitCount: number = 100
): Unsubscribe {
  // Use mock service in mock mode
  if (isInMockMode()) {
    return mockGameService.subscribeToChat(gameId, callback, limitCount);
  }

  const db = getDb();
  const chatQuery = query(
    collection(db, 'games', gameId, 'chat'),
    orderBy('ts', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(chatQuery, (snapshot: QuerySnapshot<DocumentData>) => {
    const messages = snapshot.docs.map(doc => doc.data() as ChatMessage);
    callback(messages.reverse());
  });
}

export async function sendChatMessage(gameId: string, text: string, nickname: string): Promise<void> {
  const user = getCurrentUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Use mock service in mock mode
  if (isInMockMode()) {
    return mockGameService.sendChatMessage(gameId, text, nickname, user.uid);
  }

  const db = getDb();

  const chatRef = collection(db, 'games', gameId, 'chat');
  await addDoc(chatRef, {
    ts: serverTimestamp(),
    uid: user.uid,
    nickname,
    text
  });
}

export async function addGameLog(
  gameId: string,
  logType: string,
  message: string,
  payload?: any
): Promise<void> {
  const user = getCurrentUser();

  // Use mock service in mock mode
  if (isInMockMode()) {
    return mockGameService.addGameLog(gameId, logType, message, payload, user?.uid);
  }

  const db = getDb();

  const logRef = collection(db, 'games', gameId, 'log');
  await addDoc(logRef, {
    ts: serverTimestamp(),
    actorUid: user?.uid || null,
    type: logType,
    message,
    payload,
    visibility: 'public'
  });
}

// Helper functions for state conversion
function convertNetworkToEngineState(networkState: GameDoc): GameState {
  // This is a simplified conversion - full implementation would map all fields
  return {
    currentPlayerIndex: networkState.turnOrder.indexOf(networkState.currentPlayerUid),
    phase: networkState.phase as any,
    turnNumber: networkState.turnNumber,
    players: Object.values(networkState.players).map(p => ({
      id: p.uid,
      name: p.nickname,
      classId: p.classId,
      position: p.position,
      hp: p.hp,
      maxHp: p.maxHp,
      inventory: p.inventory as any,
      movementHistory: p.movementHistory,
      flags: p.flags as any,
      temporaryEffects: p.perTurn as any
    })),
    board: {
      tiles: [] // Would need to load from board data
    },
    decks: networkState.decks as any,
    tileStates: {} as any, // Would need to convert
    combat: networkState.combat as any,
    turnOrder: networkState.turnOrder,
    finalTileTie: networkState.finalTileTie as any,
    winner: null
  } as GameState;
}

function convertEngineToNetworkState(
  engineState: GameState,
  previousNetworkState: GameDoc
): Partial<GameDoc> {
  // This is a simplified conversion - full implementation would map all fields
  const players: { [uid: string]: NetworkPlayerState } = {};

  for (const player of engineState.players) {
    players[player.id] = {
      uid: player.id,
      nickname: player.name,
      classId: player.classId,
      hp: player.hp,
      maxHp: player.maxHp,
      position: player.position,
      flags: player.flags as any,
      inventory: player.inventory as any,
      movementHistory: player.movementHistory,
      perTurn: player.temporaryEffects as any
    };
  }

  return {
    currentPlayerUid: engineState.turnOrder[engineState.currentPlayerIndex],
    phase: engineState.phase as any,
    turnNumber: engineState.turnNumber,
    players,
    decks: engineState.decks as any,
    tileState: {
      enemies: {} as TileEnemies, // Would need to convert
      attachments: {} as TileAttachments // Would need to convert
    },
    combat: engineState.combat as any,
    finalTileTie: engineState.finalTileTie as any,
    status: engineState.winner ? 'ended' : 'playing'
  };
}