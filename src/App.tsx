import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { LobbyScreen } from './game/ui/screens/LobbyScreen';
import { GameScreen } from './game/ui/screens/GameScreen';
import { useGameStore } from './game/ui/stores/gameStore';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase config (you'll need to add your config)
const firebaseConfig = {
  // Add your Firebase configuration here
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

function App() {
  const setMyUid = useGameStore((state) => state.setMyUid);

  useEffect(() => {
    // Sign in anonymously
    signInAnonymously(auth)
      .then((userCredential) => {
        console.log('Signed in anonymously:', userCredential.user.uid);
        setMyUid(userCredential.user.uid);
      })
      .catch((error) => {
        console.error('Error signing in:', error);
      });
  }, [setMyUid]);

  return (
    <BrowserRouter>
      <div className="w-full h-screen bg-gray-100 dark:bg-gray-900">
        <Routes>
          <Route path="/" element={<Navigate to="/lobby" replace />} />
          <Route path="/lobby" element={<LobbyScreen />} />
          <Route path="/lobby/:roomCode" element={<LobbyScreen />} />
          <Route path="/game/:gameId" element={<GameScreen />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;