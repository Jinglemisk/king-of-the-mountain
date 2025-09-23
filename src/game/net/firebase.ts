import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInAnonymously,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';

// Firebase configuration - these should be stored in environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let currentUser: User | null = null;

export function initializeFirebase(): void {
  if (app) return; // Already initialized

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export async function signInAsAnonymous(): Promise<User> {
  if (!auth) {
    throw new Error('Firebase not initialized');
  }

  const userCredential = await signInAnonymously(auth);
  currentUser = userCredential.user;
  return userCredential.user;
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  if (!auth) {
    throw new Error('Firebase not initialized');
  }

  return onAuthStateChanged(auth, (user) => {
    currentUser = user;
    callback(user);
  });
}

export function getCurrentUser(): User | null {
  return currentUser;
}

export function getDb(): Firestore {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  return db;
}

export function getAuthInstance(): Auth {
  if (!auth) {
    throw new Error('Firebase not initialized');
  }
  return auth;
}

export async function goOnline(): Promise<void> {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  await enableNetwork(db);
}

export async function goOffline(): Promise<void> {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  await disableNetwork(db);
}

export function isInitialized(): boolean {
  return app !== null && auth !== null && db !== null;
}