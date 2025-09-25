import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { LobbyScreen } from './game/ui/screens/LobbyScreen';
import { GameScreen } from './game/ui/screens/GameScreen';
import { useGameStore } from './game/ui/stores/gameStore';
import { initializeFirebase, signInAsAnonymous } from './game/net/firebase';

function App() {
  const setMyUid = useGameStore((state) => state.setMyUid);

  useEffect(() => {
    // Initialize Firebase
    initializeFirebase();

    // Sign in anonymously
    signInAsAnonymous()
      .then((user) => {
        console.log('Signed in:', user.uid);
        setMyUid(user.uid);
      })
      .catch((error) => {
        console.error('Error signing in:', error);
        // Set a local uid for development even if Firebase fails
        const localUid = 'local-' + Math.random().toString(36).substr(2, 9);
        console.log('Using local uid:', localUid);
        setMyUid(localUid);
      });
  }, [setMyUid]);

  return (
    <BrowserRouter>
      <div className="w-full h-screen">
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