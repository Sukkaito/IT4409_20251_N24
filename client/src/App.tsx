import { useState, useEffect, useRef } from 'react';
import { useGameClient } from './hooks/useGameClient';
import { StartupScreen } from './components/StartupScreen';
import { LoginScreen } from './components/LoginScreen';
import { RoomListScreen } from './components/RoomListScreen';
import { LobbyScreen2 } from './components/LobbyScreen2';
import { GameContainer2 } from './components/GameContainer2';
import { Element } from './types';
import './App.css';

function App() {
  const {
    canvasRef,
    gameState,
    playerId,
    playerName,
    setPlayerName,
    selectedElement,
    setSelectedElement,
    isSpectator,
    elementAvailability,
    timerSync,
    chatMessages,
    connectionError,
    isConnecting,
    isKicked,
    setIsKicked,
    joinPublicGame,
    joinPrivateGame,
    createPrivateRoom,
    createPublicRoom,
    spectate,
    sendChatMessage,
    lobbyState,
    isInLobby,
    isReady,
    setLobbyReady,
    setLobbyElement,
    sendLobbyChat,
    kickPlayer,
    startGame,
    leaveRoom
  } = useGameClient();

  const [showStartup, setShowStartup] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showRoomList, setShowRoomList] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<Array<{ time: string; message: string; type: 'log' | 'error' | 'warn' }>>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Capture console logs
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args: any[]) => {
      originalLog(...args);
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
      setLogs(prev => {
        const newLogs = [...prev, { 
          time: new Date().toLocaleTimeString(), 
          message, 
          type: 'log' as const 
        }];
        // Keep only last 50 logs
        return newLogs.slice(-50);
      });
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
      setLogs(prev => {
        const newLogs = [...prev, { 
          time: new Date().toLocaleTimeString(), 
          message, 
          type: 'error' as const 
        }];
        return newLogs.slice(-50);
      });
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args);
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
      setLogs(prev => {
        const newLogs = [...prev, { 
          time: new Date().toLocaleTimeString(), 
          message, 
          type: 'warn' as const 
        }];
        return newLogs.slice(-50);
      });
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  // Auto scroll to bottom when new log arrives
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Handle OAuth callback from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const provider = urlParams.get('provider');
    const name = urlParams.get('name');
    const id = urlParams.get('id');
    const authError = urlParams.get('auth_error');

    if (authError) {
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      setLoginError('Login failed. Please try again.');
      setIsLoading(false);
      return;
    }

    if (provider && name && id) {
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Auto join with OAuth user info
      setIsLoading(true);
      setLoginError('');
      const sanitizedName = name.substring(0, 12); // Limit name length
      setPlayerName(sanitizedName);
      joinPublicGame(sanitizedName);
    }
  }, [joinPublicGame, setPlayerName]);

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

  const handleCreatePublic = (name: string) => {
    setIsLoading(true);
    setLoginError('');
    setPlayerName(name);
    createPublicRoom(name);
  };

  const handleSpectate = (name: string) => {
    setIsLoading(true);
    setLoginError('');
    setPlayerName(name);
    spectate(name);
  };

  const handleSocialLogin = (provider: 'google') => {
    setIsLoading(true);
    setLoginError('');
    
    // Redirect to OAuth endpoint
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    const oauthUrl = `${apiUrl}/api/auth/${provider}`;
    window.location.href = oauthUrl;
  };

  const handleLogin = async (username: string, password: string) => {
    setIsLoading(true);
    setLoginError('');
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Đăng nhập thất bại');
      }

      if (data.success && data.user) {
        setPlayerName(data.user.nickname || data.user.name);
        // User is logged in, they can now join/create rooms
        setIsLoading(false);
      }
    } catch (error: any) {
      setLoginError(error.message || 'Đăng nhập thất bại');
      setIsLoading(false);
      throw error;
    }
  };

  const handleRegister = async (username: string, nickname: string, email: string, password: string) => {
    setIsLoading(true);
    setLoginError('');
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      console.log('Registering with:', { apiUrl, username });
      
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, nickname, email, password }),
      });

      console.log('Register response status:', response.status);

      if (!response.ok) {
        let errorMessage = 'Registration failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Register success:', data);

      if (data.success && data.user) {
        setPlayerName(data.user.name);
        // User is registered and logged in
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('Register error:', error);
      const errorMessage = error.message || 'Registration failed. Please check if the server is running.';
      setLoginError(errorMessage);
      setIsLoading(false);
      throw error;
    }
  };

  // Hide login screen when player joins lobby or game
  useEffect(() => {
    if ((playerId && isInLobby) || (playerId && !isInLobby && !showLogin)) {
      setShowLogin(false);
      setIsLoading(false);
    }
  }, [playerId, isInLobby, showLogin]);

  // Reset loading state when connection error occurs
  useEffect(() => {
    if (connectionError && isLoading) {
      // Small delay to ensure error message is displayed
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [connectionError, isLoading]);

  // Calculate element availability from lobby state
  const getElementAvailability = () => {
    if (!lobbyState || !lobbyState.players) {
      return { dog: true, duck: true, penguin: true, whale: true };
    }
    const usedElements = new Set(
      lobbyState.players
        .filter((p: any) => p.id !== playerId)
        .map((p: any) => p.element)
    );
    const available: Record<string, boolean> = {};
    ['dog', 'duck', 'penguin', 'whale'].forEach((el) => {
      available[el] = !usedElements.has(el);
    });
    return available;
  };

  const handleKickedClose = () => {
    setIsKicked(false);
    setShowLogin(true);
    setLoginError('');
  };

  return (
    <div className="App">
      {showStartup ? (
        <StartupScreen 
          onStart={() => {
            setShowStartup(false);
            setShowLogin(true);
          }}
        />
      ) : isKicked ? (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: '#F5F5DC',
            padding: '40px',
            borderRadius: '20px',
            maxWidth: '500px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <h2 style={{
              margin: '0 0 20px 0',
              fontSize: '28px',
              color: '#FF6B6B',
              fontWeight: 'bold'
            }}>
              ⚠️ You Have Been Kicked
            </h2>
            <p style={{
              margin: '0 0 30px 0',
              fontSize: '18px',
              color: '#333',
              lineHeight: '1.5'
            }}>
              You have been removed from the room by the host.
            </p>
            <button
              onClick={handleKickedClose}
              style={{
                padding: '15px 40px',
                background: '#4ECDC4',
                border: '2px solid #000',
                borderRadius: '15px',
                color: '#000',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#3AB8B0';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#4ECDC4';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Return to Menu
            </button>
          </div>
        </div>
      ) : showRoomList ? (
        <RoomListScreen
          onBack={() => {
            setShowRoomList(false);
            setShowLogin(true);
          }}
          onJoinRoom={(roomCode, playerName) => {
            setShowRoomList(false);
            handleJoinPrivate(playerName, roomCode);
          }}
          playerName={playerName || ''}
          isLoading={isLoading || isConnecting}
        />
      ) : showLogin ? (
        <LoginScreen
          onLogin={handleLogin}
          onRegister={handleRegister}
          onJoinPublic={handleJoinPublic}
          onJoinPrivate={handleJoinPrivate}
          onCreatePrivate={handleCreatePrivate}
          onCreatePublic={handleCreatePublic}
          onSpectate={handleSpectate}
          onSocialLogin={handleSocialLogin}
          onShowRoomList={(playerName) => {
            setPlayerName(playerName);
            setShowLogin(false);
            setShowRoomList(true);
          }}
          error={loginError}
          isLoading={isLoading || isConnecting}
          connectionError={connectionError}
          isConnecting={isConnecting}
          loggedInUser={playerName || undefined}
        />
      ) : (isInLobby && lobbyState) ? (
        <LobbyScreen2
          lobbyState={lobbyState}
          currentPlayerId={playerId || ''}
          selectedElement={selectedElement}
          onSelectElement={(el) => {
            setLobbyElement(el);
            setSelectedElement(el);
          }}
          elementAvailability={getElementAvailability()}
          chatMessages={chatMessages}
          onSendChat={sendLobbyChat}
          onSetReady={setLobbyReady}
          onKickPlayer={kickPlayer}
          onStartGame={startGame}
          onLeaveRoom={() => {
            leaveRoom();
            setShowLogin(true);
          }}
          isReady={isReady}
        />
      ) : (
        <GameContainer2
          canvasRef={canvasRef}
          gameState={gameState}
          playerId={playerId}
          isSpectator={isSpectator}
          timerSync={timerSync}
          chatMessages={chatMessages}
          onSendChatMessage={sendChatMessage}
          onLeaveGame={() => {
            leaveRoom();
            setShowLogin(true);
          }}
        />
      )}

      {/* Logging Display - Hidden */}
      {false && (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        width: '500px',
        maxHeight: '400px',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        borderRadius: '8px',
        padding: '15px',
        overflowY: 'auto',
        zIndex: 10000,
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#fff',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
          paddingBottom: '10px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Console Logs</div>
          <button
            onClick={() => setLogs([])}
            style={{
              padding: '4px 12px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '11px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            Clear
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {logs.map((log, index) => (
            <div
              key={index}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                backgroundColor: log.type === 'error' 
                  ? 'rgba(255, 0, 0, 0.2)' 
                  : log.type === 'warn'
                  ? 'rgba(255, 165, 0, 0.2)'
                  : 'rgba(255, 255, 255, 0.05)',
                wordBreak: 'break-word',
                lineHeight: '1.4'
              }}
            >
              <span style={{ 
                color: '#888', 
                fontSize: '10px',
                marginRight: '8px'
              }}>
                [{log.time}]
              </span>
              <span style={{
                color: log.type === 'error' 
                  ? '#ff6b6b' 
                  : log.type === 'warn'
                  ? '#ffa500'
                  : '#fff'
              }}>
                {log.message}
              </span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>
      )}
    </div>
  );
}

export default App;

