import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameClient } from './hooks/useGameClient';
import { StartupScreen } from './components/StartupScreen';
import { LoginScreen } from './components/LoginScreen';
import { RoomListScreen } from './components/RoomListScreen';
import { LobbyScreen2 } from './components/LobbyScreen2';
import { GameContainer2 } from './components/GameContainer2';
import { ProfileScreen } from './components/ProfileScreen';
import { LeaderboardScreen } from './components/LeaderboardScreen';
import { Element } from './types';
import './App.css';

type ScreenType = 'startup' | 'login' | 'room-list' | 'lobby' | 'game' | 'profile' | 'leaderboard';

type UserProfile = {
  id?: string;
  name?: string;
  nickname?: string;
  email?: string;
  avatar?: string;
  provider?: string;
  createdAt?: string;
  stats?: {
    gamesPlayed?: number;
    gamesWon?: number;
    totalScore?: number;
    winRate?: number;
    favoriteElement?: string;
  };
};

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
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('startup');
  const [showStartup, setShowStartup] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showRoomList, setShowRoomList] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<Array<{ time: string; message: string; type: 'log' | 'error' | 'warn' }>>([]);
  const [isMusicMuted, setIsMusicMuted] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState('');
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [leaderboardError, setLeaderboardError] = useState('');
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [hasReportedMatch, setHasReportedMatch] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const isNavigatingRef = useRef(false); // Prevent infinite loops
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const lastScreenRef = useRef<ScreenType>('startup');

  const fetchUserProfile = useCallback(async () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    try {
      setIsProfileLoading(true);
      setProfileError('');

      const res = await fetch(`${apiUrl}/api/auth/user`, {
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Không tải được hồ sơ người dùng');
      }

      const data = await res.json();
      let mergedStats = data.stats || {};

      // Fetch stats detail if available
      try {
        const statsRes = await fetch(`${apiUrl}/api/auth/user/stats`, {
          credentials: 'include'
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          mergedStats = { ...mergedStats, ...statsData };
        }
      } catch (e) {
        // ignore stats fetch errors but keep base profile
      }

      setUserProfile((prev) => ({
        ...prev,
        ...data,
        stats: mergedStats
      }));

      if (!playerName && (data.nickname || data.name)) {
        setPlayerName(data.nickname || data.name);
      }
    } catch (error: any) {
      setProfileError(error.message || 'Không tải được hồ sơ');
    } finally {
      setIsProfileLoading(false);
    }
  }, [playerName, setPlayerName]);

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
  }, [fetchUserProfile]);

  // Auto scroll to bottom when new log arrives
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Attempt to restore session and profile on load
  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  // Helper function to navigate and update browser history
  const navigateTo = (screen: ScreenType, skipHistory = false) => {
    if (isNavigatingRef.current) return;
    
    isNavigatingRef.current = true;

    // Control background music based on screen
    const audio = backgroundMusicRef.current;
    if (audio) {
      if (screen === 'startup' || isMusicMuted) {
        // Pause music when returning to startup screen or when muted
        audio.pause();
      } else {
        // Try to play music when entering any other screen
        const playPromise = audio.play();
        if (playPromise) {
          playPromise.catch((err) => {
            console.warn('Unable to start background music:', err);
          });
        }
      }
    }
    
    // Update state
    setShowStartup(screen === 'startup');
    setShowLogin(screen === 'login');
    setShowRoomList(screen === 'room-list');
    setCurrentScreen(screen);
    
    // Update browser history
    if (!skipHistory) {
      const url = screen === 'startup' ? '/' : `/${screen}`;
      window.history.pushState({ screen }, '', url);
    }
    
    // Reset flag after a short delay
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 100);
  };

  // Handle browser back/forward buttons
  useEffect(() => {
    // Initialize history on mount, but preserve OAuth callback params
    if (currentScreen === 'startup') {
      const hasOAuthParams = window.location.search.includes('provider=') || 
                             window.location.search.includes('auth_error=');
      if (!hasOAuthParams) {
        window.history.replaceState({ screen: 'startup' }, '', '/');
      }
    }

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as { screen?: ScreenType } | null;
      const screen = state?.screen || 'startup';
      
      // Determine screen from URL if state is missing
      const path = window.location.pathname;
      let targetScreen: ScreenType = 'startup';
      
      if (path === '/login' || path.startsWith('/login')) {
        targetScreen = 'login';
      } else if (path === '/room-list' || path.startsWith('/room-list')) {
        targetScreen = 'room-list';
      } else if (path === '/lobby' || path.startsWith('/lobby')) {
        targetScreen = 'lobby';
      } else if (path === '/game' || path.startsWith('/game')) {
        targetScreen = 'game';
      } else if (path === '/profile' || path.startsWith('/profile')) {
        targetScreen = 'profile';
      } else {
        targetScreen = screen || 'startup';
      }
      
      isNavigatingRef.current = true;
      navigateTo(targetScreen, true);
      
      // Handle special cases
      if (targetScreen === 'login' && (isInLobby || playerId)) {
        // If user is in lobby/game, go back to login but don't disconnect
        setShowLogin(true);
        setShowRoomList(false);
      } else if (targetScreen === 'startup') {
        // Reset to startup
        setShowStartup(true);
        setShowLogin(false);
        setShowRoomList(false);
      }
      
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 100);
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [currentScreen, isInLobby, playerId]);

  // Handle OAuth callback from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const provider = urlParams.get('provider');
    const name = urlParams.get('name');
    const id = urlParams.get('id');
    const authError = urlParams.get('auth_error');
    console.log('URL Params:', urlParams.toString());
    console.log('OAuth callback params:', { provider, name, id, authError });

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
      // joinPublicGame(sanitizedName);
      console.log("Login with google as " + sanitizedName);
      fetchUserProfile();
      setIsLoading(false);
    }
  }, []);

  const handleJoinPublic = (name: string) => {
    setIsLoading(true);
    setLoginError('');
    setPlayerName(name);
    joinPublicGame(name);
    // Navigation will happen automatically when lobby/game state changes
  };

  const handleJoinPrivate = (name: string, roomCode: string) => {
    setIsLoading(true);
    setLoginError('');
    setPlayerName(name);
    joinPrivateGame(name, roomCode);
    // Navigation will happen automatically when lobby/game state changes
  };

  const handleCreatePrivate = (name: string) => {
    setIsLoading(true);
    setLoginError('');
    setPlayerName(name);
    createPrivateRoom(name);
    // Navigation will happen automatically when lobby/game state changes
  };

  const handleCreatePublic = (name: string) => {
    setIsLoading(true);
    setLoginError('');
    setPlayerName(name);
    createPublicRoom(name);
    // Navigation will happen automatically when lobby/game state changes
  };

  const openProfile = () => {
    lastScreenRef.current = currentScreen;
    navigateTo('profile');
  };

  const closeProfile = () => {
    const fallback: ScreenType = isInLobby ? 'lobby' : (playerId ? 'game' : 'login');
    const target = lastScreenRef.current && lastScreenRef.current !== 'profile'
      ? lastScreenRef.current
      : fallback;
    navigateTo(target);
  };

  const handleOpenProfileFromIcon = () => {
    if (!userProfile) {
      window.alert('Bạn chưa đăng nhập');
      return;
    }
    fetchUserProfile();
    openProfile();
  };

  const handleLogout = useCallback(async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      await fetch(`${apiUrl}/api/auth/logout`, {
        method: 'GET',
        credentials: 'include'
      });
    } catch (e) {
      // ignore errors; still clear local state
    } finally {
      leaveRoom();
      setUserProfile(null);
      setPlayerName('');
      setLobbyReady(false);
      setLobbyElement('dog');
      setShowRoomList(false);
      setShowLogin(true);
      setShowStartup(false);
      setShowProfileMenu(false);
      navigateTo('login');
    }
  }, [leaveRoom, navigateTo, setLobbyElement, setLobbyReady, setPlayerName]);

  const fetchLeaderboard = useCallback(async () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    try {
      setIsLeaderboardLoading(true);
      setLeaderboardError('');
      const res = await fetch(`${apiUrl}/api/auth/leaderboard`, {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error('Failed to load leaderboard');
      }
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    } catch (err: any) {
      setLeaderboardError(err?.message || 'Failed to load leaderboard');
      setLeaderboard([]);
    } finally {
      setIsLeaderboardLoading(false);
    }
  }, []);

  const openLeaderboard = () => {
    lastScreenRef.current = currentScreen;
    fetchLeaderboard();
    navigateTo('leaderboard');
  };

  const closeLeaderboard = () => {
    const fallback: ScreenType = isInLobby ? 'lobby' : (playerId ? 'game' : 'login');
    const target = lastScreenRef.current && lastScreenRef.current !== 'leaderboard'
      ? lastScreenRef.current
      : fallback;
    navigateTo(target);
  };

  // Report match result to server for logged-in users when game ends
  useEffect(() => {
    if (!gameState || !gameState.gameOver || !playerId || !userProfile || hasReportedMatch) {
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    const player = gameState.players[playerId];
    if (!player) return;

    const score = player.area || 0;
    const won = !!gameState.winnerName && gameState.winnerName === (player.name || playerId);
    const element = player.element || null;

    (async () => {
      try {
        await fetch(`${apiUrl}/api/auth/user/stats/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ won, score, element })
        });
      } catch (err) {
        // Ignore errors; stats are optional
        console.warn('Failed to update user stats', err);
      } finally {
        setHasReportedMatch(true);
      }
    })();
  }, [gameState, playerId, userProfile, hasReportedMatch]);

  // Reset match-report flag when a new game starts (gameOver turns false again)
  useEffect(() => {
    if (gameState && !gameState.gameOver && hasReportedMatch) {
      setHasReportedMatch(false);
    }
  }, [gameState, hasReportedMatch]);

  const handleSpectate = (name: string) => {
    setIsLoading(true);
    setLoginError('');
    setPlayerName(name);
    spectate(name);
    // Navigation will happen automatically when game state changes
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
        setUserProfile(data.user);
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
        setUserProfile(data.user);
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
    if (playerId && isInLobby && currentScreen !== 'lobby') {
      navigateTo('lobby');
      setIsLoading(false);
    } else if (playerId && !isInLobby && !showLogin && currentScreen !== 'game') {
      navigateTo('game');
      setIsLoading(false);
    }
  }, [playerId, isInLobby, showLogin, currentScreen]);

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
    navigateTo('login');
    setLoginError('');
  };

  const toggleMusic = () => {
    setIsMusicMuted((prev) => {
      const next = !prev;
      const audio = backgroundMusicRef.current;
      if (audio) {
        if (next) {
          audio.pause();
        } else {
          const playPromise = audio.play();
          if (playPromise) {
            playPromise.catch((err) => {
              console.warn('Unable to start background music:', err);
            });
          }
        }
      }
      return next;
    });
  };

  const showTopCenterBar = currentScreen === 'login' || currentScreen === 'lobby';

  return (
    <div className="App">
      {/* Background music */}
      <audio
        ref={backgroundMusicRef}
        src="/background%20music/pianoBackgroundMusic.mp3"
        loop
      />

      {/* Top-center bar: leaderboard, profile, sound for login & lobby */}
      {showTopCenterBar && (
        <div
          style={{
            position: 'fixed',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            zIndex: 2500
          }}
        >
          {/* Leaderboard button (Asset 246) - placeholder for future leaderboard screen */}
          <button
            onClick={openLeaderboard}
            style={{
              width: '40px',
              height: '40px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer'
            }}
          >
            <img
              src="/elements/Asset 246@2x.png"
              alt="Leaderboard"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </button>

          {/* Profile button (Asset 247) with menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowProfileMenu((prev) => !prev)}
              style={{
                width: '40px',
                height: '40px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer'
              }}
            >
              <img
                src="/elements/Asset 247@2x.png"
                alt="Profile"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </button>

            {showProfileMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '48px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  minWidth: '140px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
                  zIndex: 2600
                }}
              >
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    handleOpenProfileFromIcon();
                  }}
                  style={{
                    padding: '8px 10px',
                    border: 'none',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  Profile
                </button>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    handleLogout();
                  }}
                  style={{
                    padding: '8px 10px',
                    border: 'none',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#fecdd3',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Sound button (shared icon) */}
          <button
            onClick={toggleMusic}
            style={{
              width: '40px',
              height: '40px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer'
            }}
          >
            <img
              src={isMusicMuted ? '/elements/Asset 244@2x.png' : '/elements/Asset 245@2x.png'}
              alt={isMusicMuted ? 'Unmute music' : 'Mute music'}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </button>
        </div>
      )}

      {/* Music toggle button - top-right corner on other screens */}
      {!showTopCenterBar && currentScreen !== 'startup' && currentScreen !== 'leaderboard' && currentScreen !== 'profile' && (
        <button
          onClick={toggleMusic}
          style={{
            position: 'fixed',
            top: '20px',
            right: currentScreen === 'game' ? '140px' : '16px',
            width: '32px',
            height: '32px',
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            zIndex: 2000
          }}
        >
          <img
            src={isMusicMuted ? '/elements/Asset 244@2x.png' : '/elements/Asset 245@2x.png'}
            alt={isMusicMuted ? 'Unmute music' : 'Mute music'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        </button>
      )}

      {currentScreen === 'profile' ? (
        <ProfileScreen
          profile={userProfile}
          isLoading={isProfileLoading}
          error={profileError || connectionError}
          onRetry={fetchUserProfile}
          onBack={closeProfile}
        />
      ) : currentScreen === 'leaderboard' ? (
        <LeaderboardScreen
          entries={leaderboard}
          isLoading={isLeaderboardLoading}
          error={leaderboardError || connectionError}
          onRetry={fetchLeaderboard}
          onBack={closeLeaderboard}
        />
      ) : showStartup ? (
        <StartupScreen 
          onStart={() => {
            navigateTo('login');
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
            setPlayerName(''); // Reset playerName to show full login options
            navigateTo('login');
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
            navigateTo('room-list');
          }}
          onShowProfile={handleOpenProfileFromIcon}
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
            navigateTo('login');
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
            navigateTo('login');
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

