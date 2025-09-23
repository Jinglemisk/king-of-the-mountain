import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  writeBatch,
  type Unsubscribe
} from 'firebase/firestore';
import { getDb, getCurrentUser } from './firebase';
import type { RoomDoc, Seat } from './types';

const ROOM_CODE_LENGTH = 6;
const ROOM_EXPIRY_HOURS = 2;

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  const array = new Uint8Array(ROOM_CODE_LENGTH);
  crypto.getRandomValues(array);

  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += chars[array[i] % chars.length];
  }

  return code;
}

export async function createRoom(nickname: string, maxPlayers: number = 6): Promise<string> {
  const db = getDb();
  const user = getCurrentUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  let code: string;
  let attempts = 0;
  const maxAttempts = 10;

  // Try to generate a unique room code
  while (attempts < maxAttempts) {
    code = generateRoomCode();
    const roomRef = doc(db, 'rooms', code);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      // Create the room
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
        uid: user.uid,
        nickname,
        classId: null,
        ready: false,
        lastSeen: Date.now(),
        disconnectedAt: null,
        kicked: false
      };

      const roomData: Omit<RoomDoc, 'createdAt' | 'updatedAt'> = {
        code,
        ownerUid: user.uid,
        status: 'lobby',
        maxPlayers,
        seats,
        minReadyToStart: 2,
        gameId: null,
        expiresAt: null
      };

      await setDoc(roomRef, {
        ...roomData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return code;
    }

    attempts++;
  }

  throw new Error('Failed to generate unique room code');
}

export async function joinRoom(code: string, nickname: string): Promise<number> {
  const db = getDb();
  const user = getCurrentUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const roomRef = doc(db, 'rooms', code.toUpperCase());

  return await runTransaction(db, async (transaction) => {
    const roomDoc = await transaction.get(roomRef);

    if (!roomDoc.exists()) {
      throw new Error('Room not found');
    }

    const roomData = roomDoc.data() as RoomDoc;

    if (roomData.status !== 'lobby') {
      throw new Error('Game already started');
    }

    // Check if user is already in a seat
    const existingSeatIndex = roomData.seats.findIndex(seat => seat.uid === user.uid);
    if (existingSeatIndex !== -1) {
      // Update existing seat
      roomData.seats[existingSeatIndex].nickname = nickname;
      roomData.seats[existingSeatIndex].lastSeen = Date.now();
      roomData.seats[existingSeatIndex].disconnectedAt = null;

      transaction.update(roomRef, {
        seats: roomData.seats,
        updatedAt: serverTimestamp(),
        expiresAt: null // Clear expiry when someone joins
      });

      return existingSeatIndex;
    }

    // Find an empty seat
    const emptySeatIndex = roomData.seats.findIndex(seat => seat.uid === null);
    if (emptySeatIndex === -1) {
      throw new Error('Room is full');
    }

    // Check if user was kicked
    const wasKicked = roomData.seats.some(seat => seat.kicked && seat.uid === user.uid);
    if (wasKicked) {
      throw new Error('You have been kicked from this room');
    }

    // Claim the seat
    roomData.seats[emptySeatIndex] = {
      seatIndex: emptySeatIndex,
      uid: user.uid,
      nickname,
      classId: null,
      ready: false,
      lastSeen: Date.now(),
      disconnectedAt: null,
      kicked: false
    };

    transaction.update(roomRef, {
      seats: roomData.seats,
      updatedAt: serverTimestamp(),
      expiresAt: null // Clear expiry when someone joins
    });

    return emptySeatIndex;
  });
}

export async function leaveRoom(code: string): Promise<void> {
  const db = getDb();
  const user = getCurrentUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const roomRef = doc(db, 'rooms', code.toUpperCase());

  await runTransaction(db, async (transaction) => {
    const roomDoc = await transaction.get(roomRef);

    if (!roomDoc.exists()) {
      return; // Room doesn't exist, nothing to do
    }

    const roomData = roomDoc.data() as RoomDoc;

    // Find user's seat
    const seatIndex = roomData.seats.findIndex(seat => seat.uid === user.uid);
    if (seatIndex === -1) {
      return; // User not in room
    }

    // Clear the seat
    roomData.seats[seatIndex] = {
      seatIndex,
      uid: null,
      nickname: null,
      classId: null,
      ready: false,
      lastSeen: undefined,
      disconnectedAt: null,
      kicked: false
    };

    // Check if room is now empty
    const isEmpty = roomData.seats.every(seat => seat.uid === null);

    const updates: any = {
      seats: roomData.seats,
      updatedAt: serverTimestamp()
    };

    if (isEmpty) {
      // Set expiry time if room is empty
      const expiryTime = new Date();
      expiryTime.setHours(expiryTime.getHours() + ROOM_EXPIRY_HOURS);
      updates.expiresAt = expiryTime;
    }

    // If owner left, assign to next player
    if (user.uid === roomData.ownerUid) {
      const nextPlayer = roomData.seats.find(seat => seat.uid !== null);
      if (nextPlayer) {
        updates.ownerUid = nextPlayer.uid;
      }
    }

    transaction.update(roomRef, updates);
  });
}

export async function updateSeatReady(code: string, ready: boolean): Promise<void> {
  const db = getDb();
  const user = getCurrentUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const roomRef = doc(db, 'rooms', code.toUpperCase());

  await runTransaction(db, async (transaction) => {
    const roomDoc = await transaction.get(roomRef);

    if (!roomDoc.exists()) {
      throw new Error('Room not found');
    }

    const roomData = roomDoc.data() as RoomDoc;
    const seatIndex = roomData.seats.findIndex(seat => seat.uid === user.uid);

    if (seatIndex === -1) {
      throw new Error('User not in room');
    }

    roomData.seats[seatIndex].ready = ready;
    roomData.seats[seatIndex].lastSeen = Date.now();

    transaction.update(roomRef, {
      seats: roomData.seats,
      updatedAt: serverTimestamp()
    });
  });
}

export async function updateSeatClass(code: string, classId: string): Promise<void> {
  const db = getDb();
  const user = getCurrentUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const roomRef = doc(db, 'rooms', code.toUpperCase());

  await runTransaction(db, async (transaction) => {
    const roomDoc = await transaction.get(roomRef);

    if (!roomDoc.exists()) {
      throw new Error('Room not found');
    }

    const roomData = roomDoc.data() as RoomDoc;
    const seatIndex = roomData.seats.findIndex(seat => seat.uid === user.uid);

    if (seatIndex === -1) {
      throw new Error('User not in room');
    }

    // Check if class is already taken
    const classTaken = roomData.seats.some((seat, idx) =>
      idx !== seatIndex && seat.classId === classId && seat.uid !== null
    );

    if (classTaken) {
      throw new Error('Class already taken by another player');
    }

    roomData.seats[seatIndex].classId = classId;
    roomData.seats[seatIndex].lastSeen = Date.now();

    transaction.update(roomRef, {
      seats: roomData.seats,
      updatedAt: serverTimestamp()
    });
  });
}

export async function kickPlayer(code: string, targetSeatIndex: number): Promise<void> {
  const db = getDb();
  const user = getCurrentUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const roomRef = doc(db, 'rooms', code.toUpperCase());

  await runTransaction(db, async (transaction) => {
    const roomDoc = await transaction.get(roomRef);

    if (!roomDoc.exists()) {
      throw new Error('Room not found');
    }

    const roomData = roomDoc.data() as RoomDoc;

    if (roomData.ownerUid !== user.uid) {
      throw new Error('Only room owner can kick players');
    }

    if (targetSeatIndex < 0 || targetSeatIndex >= 6) {
      throw new Error('Invalid seat index');
    }

    const targetSeat = roomData.seats[targetSeatIndex];
    if (!targetSeat.uid) {
      throw new Error('Seat is empty');
    }

    // Mark as kicked and clear the seat
    roomData.seats[targetSeatIndex] = {
      seatIndex: targetSeatIndex,
      uid: null,
      nickname: null,
      classId: null,
      ready: false,
      lastSeen: undefined,
      disconnectedAt: null,
      kicked: true
    };

    transaction.update(roomRef, {
      seats: roomData.seats,
      updatedAt: serverTimestamp()
    });
  });
}

export function subscribeToRoom(code: string, callback: (room: RoomDoc | null) => void): Unsubscribe {
  const db = getDb();
  const roomRef = doc(db, 'rooms', code.toUpperCase());

  return onSnapshot(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as RoomDoc);
    } else {
      callback(null);
    }
  });
}

export async function updateHeartbeat(code: string): Promise<void> {
  const db = getDb();
  const user = getCurrentUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const roomRef = doc(db, 'rooms', code.toUpperCase());

  await runTransaction(db, async (transaction) => {
    const roomDoc = await transaction.get(roomRef);

    if (!roomDoc.exists()) {
      return;
    }

    const roomData = roomDoc.data() as RoomDoc;
    const seatIndex = roomData.seats.findIndex(seat => seat.uid === user.uid);

    if (seatIndex === -1) {
      return;
    }

    roomData.seats[seatIndex].lastSeen = Date.now();
    roomData.seats[seatIndex].disconnectedAt = null;

    transaction.update(roomRef, {
      seats: roomData.seats,
      updatedAt: serverTimestamp()
    });
  });
}

// Aliases for UI components that use different names
export const selectClass = updateSeatClass;
export const toggleReady = (code: string) => updateSeatReady(code, true);

export async function startGame(code: string): Promise<void> {
  // TODO: Create game document and link to room
  console.log('Starting game for room:', code);
}