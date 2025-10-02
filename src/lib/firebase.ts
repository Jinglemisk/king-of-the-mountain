/**
 * Firebase configuration and initialization
 * Handles connection to Firebase Realtime Database for multiplayer state sync
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';

/**
 * Firebase configuration from environment variables
 * These should be set in .env.local file (see .env.example)
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/**
 * Initialize Firebase app
 */
const app = initializeApp(firebaseConfig);

/**
 * Get Firebase Realtime Database instance
 * This database will store all game state for real-time synchronization
 */
export const database: Database = getDatabase(app);

/**
 * Generate a random 6-character alphanumeric lobby code
 * Used for creating game lobbies that players can join
 * @returns 6-character uppercase alphanumeric string
 */
export function generateLobbyCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate a unique player ID
 * @returns Unique string identifier for a player
 */
export function generatePlayerId(): string {
  return `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
