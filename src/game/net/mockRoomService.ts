import type { RoomDoc, Seat } from './types';

// LocalStorage key for rooms
const STORAGE_KEY = 'kotm_mock_rooms';

// In-memory cache synced with localStorage
const mockRooms = new Map<string, RoomDoc>();
const roomSubscribers = new Map<string, Set<(room: RoomDoc | null) => void>>();

// Load rooms from localStorage on startup
function loadRoomsFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const rooms = JSON.parse(stored);
      mockRooms.clear();
      Object.entries(rooms).forEach(([code, room]) => {
        // Convert date strings back to Date objects
        const roomDoc = room as RoomDoc;
        roomDoc.createdAt = new Date(roomDoc.createdAt as any);
        roomDoc.updatedAt = new Date(roomDoc.updatedAt as any);
        if (roomDoc.expiresAt) {
          roomDoc.expiresAt = new Date(roomDoc.expiresAt as any);
        }
        mockRooms.set(code, roomDoc);
      });
    }
  } catch (err) {
    console.error('[Mock] Failed to load rooms from storage:', err);
  }
}

// Save rooms to localStorage
function saveRoomsToStorage() {
  try {
    const rooms: Record<string, RoomDoc> = {};
    mockRooms.forEach((room, code) => {
      rooms[code] = room;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));

    // Dispatch custom event for other tabs
    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEY,
      newValue: JSON.stringify(rooms),
      url: window.location.href
    }));
  } catch (err) {
    console.error('[Mock] Failed to save rooms to storage:', err);
  }
}

// Listen for changes from other tabs
function setupStorageListener() {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      loadRoomsFromStorage();
      // Notify all subscribers about potential changes
      mockRooms.forEach((room, code) => {
        notifySubscribers(code);
      });
    }
  });
}

// Initialize on module load
loadRoomsFromStorage();
setupStorageListener();

function notifySubscribers(code: string) {
  const room = mockRooms.get(code.toUpperCase());
  const subscribers = roomSubscribers.get(code.toUpperCase());
  if (subscribers) {
    subscribers.forEach(callback => callback(room || null));
  }
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);

  for (let i = 0; i < 6; i++) {
    code += chars[array[i] % chars.length];
  }

  return code;
}

export async function createRoom(nickname: string, userId: string, maxPlayers: number = 6): Promise<string> {
  let code: string;
  let attempts = 0;

  // Generate unique room code
  do {
    code = generateRoomCode();
    attempts++;
  } while (mockRooms.has(code) && attempts < 10);

  if (attempts >= 10) {
    throw new Error('Failed to generate unique room code');
  }

  // Create seats array
  const seats: Seat[] = Array.from({ length: 6 }, (_, i) => ({
    seatIndex: i,
    uid: null,
    nickname: null,
    classId: null,
    ready: false,
    lastSeen: undefined,
    disconnectedAt: null,
    kicked: false
  }));

  // Owner takes seat 0
  seats[0] = {
    seatIndex: 0,
    uid: userId,
    nickname,
    classId: null,
    ready: false,
    lastSeen: Date.now(),
    disconnectedAt: null,
    kicked: false
  };

  // Create room
  const room: RoomDoc = {
    code,
    ownerUid: userId,
    status: 'lobby',
    maxPlayers,
    seats,
    minReadyToStart: 2,
    gameId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: null
  };

  mockRooms.set(code, room);
  saveRoomsToStorage();

  console.log('[Mock] Room created:', code);

  // Notify any existing subscribers
  notifySubscribers(code);

  return code;
}

export async function joinRoom(code: string, nickname: string, userId: string): Promise<number> {
  const upperCode = code.toUpperCase();
  const room = mockRooms.get(upperCode);

  if (!room) {
    throw new Error('Room not found');
  }

  if (room.status !== 'lobby') {
    throw new Error('Game already started');
  }

  // Check if user already in room
  const existingSeatIndex = room.seats.findIndex(seat => seat.uid === userId);
  if (existingSeatIndex !== -1) {
    room.seats[existingSeatIndex].nickname = nickname;
    room.seats[existingSeatIndex].lastSeen = Date.now();
    room.seats[existingSeatIndex].disconnectedAt = null;
    room.updatedAt = new Date();
    saveRoomsToStorage();

    notifySubscribers(upperCode);
    return existingSeatIndex;
  }

  // Find empty seat
  const emptySeatIndex = room.seats.findIndex(seat => seat.uid === null);
  if (emptySeatIndex === -1) {
    throw new Error('Room is full');
  }

  // Take the seat
  room.seats[emptySeatIndex] = {
    seatIndex: emptySeatIndex,
    uid: userId,
    nickname,
    classId: null,
    ready: false,
    lastSeen: Date.now(),
    disconnectedAt: null,
    kicked: false
  };

  room.updatedAt = new Date();
  saveRoomsToStorage();

  console.log('[Mock] User joined room:', upperCode, 'seat:', emptySeatIndex);

  notifySubscribers(upperCode);
  return emptySeatIndex;
}

export async function leaveRoom(code: string, userId: string): Promise<void> {
  const upperCode = code.toUpperCase();
  const room = mockRooms.get(upperCode);

  if (!room) return;

  const seatIndex = room.seats.findIndex(seat => seat.uid === userId);
  if (seatIndex === -1) return;

  // Clear the seat
  room.seats[seatIndex] = {
    seatIndex,
    uid: null,
    nickname: null,
    classId: null,
    ready: false,
    lastSeen: undefined,
    disconnectedAt: null,
    kicked: false
  };

  // If owner left, assign to next player
  if (userId === room.ownerUid) {
    const nextPlayer = room.seats.find(seat => seat.uid !== null);
    if (nextPlayer && nextPlayer.uid) {
      room.ownerUid = nextPlayer.uid;
    }
  }

  room.updatedAt = new Date();
  saveRoomsToStorage();

  console.log('[Mock] User left room:', upperCode);

  notifySubscribers(upperCode);
}

export async function updateSeatReady(code: string, ready: boolean, userId: string): Promise<void> {
  const upperCode = code.toUpperCase();
  const room = mockRooms.get(upperCode);

  if (!room) throw new Error('Room not found');

  const seatIndex = room.seats.findIndex(seat => seat.uid === userId);
  if (seatIndex === -1) throw new Error('User not in room');

  room.seats[seatIndex].ready = ready;
  room.seats[seatIndex].lastSeen = Date.now();
  room.updatedAt = new Date();
  saveRoomsToStorage();

  console.log('[Mock] User ready state:', ready);

  notifySubscribers(upperCode);
}

export async function updateSeatClass(code: string, classId: string, userId: string): Promise<void> {
  const upperCode = code.toUpperCase();
  const room = mockRooms.get(upperCode);

  if (!room) throw new Error('Room not found');

  const seatIndex = room.seats.findIndex(seat => seat.uid === userId);
  if (seatIndex === -1) throw new Error('User not in room');

  // Check if class already taken
  const classTaken = room.seats.some((seat, idx) =>
    idx !== seatIndex && seat.classId === classId && seat.uid !== null
  );

  if (classTaken) {
    throw new Error('Class already taken by another player');
  }

  room.seats[seatIndex].classId = classId;
  room.seats[seatIndex].lastSeen = Date.now();
  room.updatedAt = new Date();
  saveRoomsToStorage();

  console.log('[Mock] User selected class:', classId);

  notifySubscribers(upperCode);
}

export async function kickPlayer(code: string, targetSeatIndex: number, userId: string): Promise<void> {
  const upperCode = code.toUpperCase();
  const room = mockRooms.get(upperCode);

  if (!room) throw new Error('Room not found');

  if (room.ownerUid !== userId) {
    throw new Error('Only room owner can kick players');
  }

  if (targetSeatIndex < 0 || targetSeatIndex >= 6) {
    throw new Error('Invalid seat index');
  }

  const targetSeat = room.seats[targetSeatIndex];
  if (!targetSeat.uid) {
    throw new Error('Seat is empty');
  }

  // Mark as kicked and clear seat
  room.seats[targetSeatIndex] = {
    seatIndex: targetSeatIndex,
    uid: null,
    nickname: null,
    classId: null,
    ready: false,
    lastSeen: undefined,
    disconnectedAt: null,
    kicked: true
  };

  room.updatedAt = new Date();
  saveRoomsToStorage();

  notifySubscribers(upperCode);
}

export function subscribeToRoom(code: string, callback: (room: RoomDoc | null) => void): () => void {
  const upperCode = code.toUpperCase();

  if (!roomSubscribers.has(upperCode)) {
    roomSubscribers.set(upperCode, new Set());
  }

  const subscribers = roomSubscribers.get(upperCode)!;
  subscribers.add(callback);

  // Immediately send current room state
  // First reload from storage to get latest state
  loadRoomsFromStorage();
  const room = mockRooms.get(upperCode);
  callback(room || null);

  // Poll for changes every second (for cross-tab sync)
  const intervalId = setInterval(() => {
    const prevRoom = mockRooms.get(upperCode);
    loadRoomsFromStorage();
    const newRoom = mockRooms.get(upperCode);

    // Check if room changed
    if (JSON.stringify(prevRoom) !== JSON.stringify(newRoom)) {
      callback(newRoom || null);
    }
  }, 1000);

  // Return unsubscribe function
  return () => {
    clearInterval(intervalId);
    subscribers.delete(callback);
    if (subscribers.size === 0) {
      roomSubscribers.delete(upperCode);
    }
  };
}

export async function updateHeartbeat(code: string, userId: string): Promise<void> {
  const upperCode = code.toUpperCase();
  const room = mockRooms.get(upperCode);

  if (!room) return;

  const seatIndex = room.seats.findIndex(seat => seat.uid === userId);
  if (seatIndex === -1) return;

  room.seats[seatIndex].lastSeen = Date.now();
  room.seats[seatIndex].disconnectedAt = null;
  room.updatedAt = new Date();
  saveRoomsToStorage();
}

export async function startGame(code: string): Promise<string> {
  const upperCode = code.toUpperCase();
  const room = mockRooms.get(upperCode);

  if (!room) throw new Error('Room not found');

  // Create the game using gameService
  const { createGame } = await import('./mockGameService');
  const gameId = await createGame(room);

  room.status = 'in-game';
  room.gameId = gameId;
  room.updatedAt = new Date();
  saveRoomsToStorage();

  console.log('[Mock] Game started for room:', upperCode, 'gameId:', gameId);

  notifySubscribers(upperCode);

  return gameId;
}

// Export for debugging
export function debugGetAllRooms() {
  loadRoomsFromStorage();
  return Array.from(mockRooms.entries());
}

// Clear all rooms (useful for testing)
export function clearAllRooms() {
  mockRooms.clear();
  localStorage.removeItem(STORAGE_KEY);
  roomSubscribers.forEach((subscribers, code) => {
    subscribers.forEach(callback => callback(null));
  });
  console.log('[Mock] All rooms cleared');
}

// Clean up old rooms (older than 2 hours)
export function cleanupOldRooms() {
  const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
  let cleaned = 0;

  mockRooms.forEach((room, code) => {
    const roomAge = new Date(room.updatedAt).getTime();
    if (roomAge < twoHoursAgo) {
      mockRooms.delete(code);
      cleaned++;
    }
  });

  if (cleaned > 0) {
    saveRoomsToStorage();
    console.log(`[Mock] Cleaned up ${cleaned} old rooms`);
  }
}

// Run cleanup on startup
setTimeout(cleanupOldRooms, 1000);