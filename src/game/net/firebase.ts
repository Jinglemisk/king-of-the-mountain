import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  type Auth,
  type User
} from 'firebase/auth';
import {
  getFirestore,
  enableNetwork,
  disableNetwork,
  type Firestore
} from 'firebase/firestore';

// Firebase configuration - these should be stored in environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'dummy-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'dummy.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'dummy-project',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'dummy.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:abcdef'
};

// Check if we're in mock mode (no real Firebase credentials)
const isMockMode = !import.meta.env.VITE_FIREBASE_API_KEY ||
                   import.meta.env.VITE_FIREBASE_API_KEY === 'your-api-key';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let currentUser: User | null = null;

export function initializeFirebase(): void {
  if (app) return; // Already initialized

  if (isMockMode) {
    console.warn('🔧 Firebase running in mock mode - no real connection');
    console.warn('To connect to Firebase, create a .env file with real credentials');
    // Don't initialize Firebase in mock mode
    return;
  }

  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    console.warn('Running in offline mode');
  }
}

export async function signInAsAnonymous(): Promise<User> {
  if (isMockMode) {
    // Return a mock user for local development
    const mockUser = {
      uid: 'local-user-' + Math.random().toString(36).substr(2, 9),
      isAnonymous: true,
      emailVerified: false,
      metadata: {},
      providerData: [],
      refreshToken: '',
      tenantId: null,
      delete: async () => {},
      getIdToken: async () => 'mock-token',
      getIdTokenResult: async () => ({ token: 'mock-token' } as any),
      reload: async () => {},
      toJSON: () => ({}),
      displayName: null,
      email: null,
      phoneNumber: null,
      photoURL: null,
      providerId: 'anonymous'
    } as User;
    currentUser = mockUser;
    return mockUser;
  }

  if (!auth) {
    throw new Error('Firebase not initialized');
  }

  const userCredential = await signInAnonymously(auth);
  currentUser = userCredential.user;
  return userCredential.user;
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  if (isMockMode) {
    // In mock mode, immediately callback with the current user
    setTimeout(() => callback(currentUser), 0);
    // Return a no-op unsubscribe function
    return () => {};
  }

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
  if (isMockMode) {
    throw new Error('Firestore not available in mock mode - UI should handle this gracefully');
  }
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  return db;
}

export function getAuthInstance(): Auth {
  if (isMockMode) {
    throw new Error('Auth not available in mock mode - UI should handle this gracefully');
  }
  if (!auth) {
    throw new Error('Firebase not initialized');
  }
  return auth;
}

export async function goOnline(): Promise<void> {
  if (isMockMode) {
    console.log('Mock mode: goOnline (no-op)');
    return;
  }
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  await enableNetwork(db);
}

export async function goOffline(): Promise<void> {
  if (isMockMode) {
    console.log('Mock mode: goOffline (no-op)');
    return;
  }
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  await disableNetwork(db);
}

export function isInitialized(): boolean {
  return isMockMode || (app !== null && auth !== null && db !== null);
}

export function isInMockMode(): boolean {
  return isMockMode;
}