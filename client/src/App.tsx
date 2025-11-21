import { useState, useEffect } from 'react';
import { useGameClient } from './hooks/useGameClient';
import { LoginScreen } from './components/LoginScreen';
import './App.css';

function App() {
  const {
    playerId,
    setPlayerName,
    connectionError,
    isConnecting,
    joinPublicGame,
    joinPrivateGame,
    createPrivateRoom,
    spectate,
    isInLobby,
  } = useGameClient();

  const [showLogin, setShowLogin] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinPublic = (name: string) => {
    setIsLoading(true);
    setLoginError('');
    setPlayerName(name);
    joinPublicGame(name);
  };

  const handleJoinPrivate = (name: string, roomCode: string) => {
    setIsLoading(true);
    setLoginError('');
    setPlayerName(name);
    joinPrivateGame(name, roomCode);
  };

  const handleCreatePrivate = (name: string) => {
    setIsLoading(true);
    setLoginError('');
    setPlayerName(name);
    createPrivateRoom(name);
  };

  const handleSpectate = (name: string) => {
    setIsLoading(true);
    setLoginError('');
    setPlayerName(name);
    spectate(name);
  };

  // Hide login screen when player joins lobby or game
  useEffect(() => {
    if ((playerId && isInLobby) || (playerId && !isInLobby && !showLogin)) {
      setShowLogin(false);
      setIsLoading(false);
    }
  }, [playerId, isInLobby, showLogin]);

  return (
    <div className="App">
      {(
        <LoginScreen
          onJoinPublic={handleJoinPublic}
          onJoinPrivate={handleJoinPrivate}
          onCreatePrivate={handleCreatePrivate}
          onSpectate={handleSpectate}
          error={loginError}
          isLoading={isLoading || isConnecting}
          connectionError={connectionError}
          isConnecting={isConnecting}
        />
      )}
      
    </div>
  );
}

export default App;

