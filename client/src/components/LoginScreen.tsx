import { useState } from 'react';

interface LoginScreenProps {
  onJoinPublic: (name: string) => void;
  onJoinPrivate: (name: string, roomCode: string) => void;
  onCreatePrivate: (name: string) => void;
  onCreatePublic: (name: string) => void;
  onSpectate: (name: string) => void;
  onSocialLogin: (provider: 'google') => void;
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, nickname: string, email: string, password: string) => Promise<void>;
  onShowRoomList: (playerName: string) => void;
  onShowProfile?: () => void;
  error: string;
  isLoading: boolean;
  connectionError?: string;
  isConnecting?: boolean;
  loggedInUser?: string; // Nickname của user đã đăng nhập
}

export function LoginScreen({
  onJoinPublic,
  onJoinPrivate,
  onCreatePrivate,
  onCreatePublic,
  onSpectate,
  onSocialLogin,
  onLogin,
  onRegister,
  onShowRoomList,
  onShowProfile,
  error,
  isLoading,
  connectionError,
  isConnecting,
  loggedInUser
}: LoginScreenProps) {
  const [guestNickname, setGuestNickname] = useState(loggedInUser || '');
  const [showJoinCode, setShowJoinCode] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [showRoomTypePopup, setShowRoomTypePopup] = useState(false);
  
  // Login/Register states
  const [isLoginMode, setIsLoginMode] = useState(true); // true = login, false = register
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const sanitizePlayerName = (name: string): string => {
    const trimmed = name.trim().substring(0, 12);
    const cleaned = trimmed.replace(/[<>]/g, '').replace(/[^\p{L}\p{N}\s_\-]/gu, '');
    return cleaned || '';
  };

  const handleQuickJoin = () => {
    const name = loggedInUser || guestNickname;
    const sanitized = sanitizePlayerName(name);
    if (!sanitized) {
      return;
    }
    onJoinPublic(sanitized);
  };

  const handleCreateRoomClick = () => {
    const name = loggedInUser || guestNickname;
    const sanitized = sanitizePlayerName(name);
    if (!sanitized) {
      return;
    }
    setShowRoomTypePopup(true);
  };

  const handleCreatePrivateRoom = () => {
    const name = loggedInUser || guestNickname;
    const sanitized = sanitizePlayerName(name);
    if (!sanitized) {
      return;
    }
    setShowRoomTypePopup(false);
    onCreatePrivate(sanitized);
  };

  const handleCreatePublicRoom = () => {
    const name = loggedInUser || guestNickname;
    const sanitized = sanitizePlayerName(name);
    if (!sanitized) {
      return;
    }
    setShowRoomTypePopup(false);
    onCreatePublic(sanitized);
  };

  const handleJoinWithCode = () => {
    const name = loggedInUser || guestNickname;
    const sanitized = sanitizePlayerName(name);
    if (!sanitized || !roomCode.trim()) {
      return;
    }
    onJoinPrivate(sanitized, roomCode.trim().toUpperCase());
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    if (!username.trim() || !password.trim()) {
      setAuthError('Please fill in all required fields');
      return;
    }

    setIsAuthLoading(true);
    try {
      await onLogin(username.trim(), password);
    } catch (err: any) {
      setAuthError(err.message || 'Login failed');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    // Validation
    if (!username.trim() || !nickname.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setAuthError('Please fill in all required fields');
      return;
    }

    if (username.length < 3 || username.length > 20) {
      setAuthError('Username must be between 3-20 characters');
      return;
    }

    if (nickname.length < 2 || nickname.length > 20) {
      setAuthError('Nickname must be between 2-20 characters');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setAuthError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }

    setIsAuthLoading(true);
    try {
      await onRegister(username.trim(), nickname.trim(), email.trim(), password);
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed');
    } finally {
      setIsAuthLoading(false);
    }
  };

  return (
    <div className="drawify-login-screen">
      <div className="login-background"></div>
      
      <div className="login-header">
        <div className="logo-container">
          <img src="/elements/MainMenuUI/Logo@4x.png" alt="Logo" className="logo-image" />
        </div>
      </div>

      <div className="login-panels">
        {/* Guest Panel - Left (Hidden when in register mode, or show when logged in) */}
        {(isLoginMode || loggedInUser) && (
        <div className="panel guest-panel">
          <div className="panel-header">
            <h2 className="panel-title">{loggedInUser ? 'Welcome!' : 'Play as Guest'}</h2>
          </div>
          <div className="panel-content">
            {loggedInUser && (
              <p style={{
                color: '#fff',
                fontSize: '14px',
                marginBottom: '15px',
                textAlign: 'center',
                opacity: 0.9
              }}>
                Choose how to join:
              </p>
            )}
            {!loggedInUser && (
              <input
                type="text"
                className="nickname-input"
                placeholder="Enter your nickname..."
                value={guestNickname}
                onChange={(e) => setGuestNickname(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !showJoinCode) {
                    handleQuickJoin();
                  } else if (e.key === 'Enter' && showJoinCode) {
                    handleJoinWithCode();
                  }
                }}
                maxLength={12}
              />
            )}
            
            {!showJoinCode ? (
              <>
                <div className="button-group-vertical">
                  <button
                    className="btn btn-primary"
                    onClick={handleCreateRoomClick}
                    disabled={isLoading || (!loggedInUser && !guestNickname.trim())}
                  >
                    Create Room
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleQuickJoin}
                    disabled={isLoading || (!loggedInUser && !guestNickname.trim())}
                  >
                    Quick Join
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowJoinCode(true)}
                    disabled={isLoading || (!loggedInUser && !guestNickname.trim())}
                  >
                    Join Room with Code
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      const name = loggedInUser || guestNickname.trim();
                      if (name) {
                        onShowRoomList(name);
                      }
                    }}
                    disabled={isLoading || (!loggedInUser && !guestNickname.trim())}
                  >
                    Room List
                  </button>
                </div>
              </>
            ) : (
              <>
                <input
                  type="text"
                  className="room-code-input"
                  placeholder="Enter 6-character room code"
                  value={roomCode}
                  onChange={(e) => {
                    const inputValue = e.target.value.toUpperCase();
                    const alphanumericValue = inputValue.replace(/[^A-Z0-9]/g, '');
                    if (alphanumericValue.length <= 6) {
                      setRoomCode(alphanumericValue);
                    }
                  }}
                  maxLength={6}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleJoinWithCode();
                    }
                  }}
                />
                <p className="panel-hint" style={{ fontSize: '12px', marginTop: '-10px', marginBottom: '10px' }}>
                  Room code is 6 characters (letters and numbers)
                </p>
                <div className="button-group">
                  <button
                    className="btn btn-primary"
                    onClick={handleJoinWithCode}
                    disabled={isLoading || (!loggedInUser && !guestNickname.trim()) || roomCode.length !== 6}
                  >
                    Join Room
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowJoinCode(false);
                      setRoomCode('');
                    }}
                    disabled={isLoading}
                  >
                    Back
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        )}

        {/* Login/Register Panel - Right (Hidden when logged in) */}
        {!loggedInUser && (
        <div className="panel guest-panel">
          <div className="panel-header">
            <h2 className="panel-title">{isLoginMode ? 'Login' : 'Register'}</h2>
          </div>
          <div className="panel-content">

            {/* Auth Error Message */}
            {authError && (
              <div style={{
                padding: '10px',
                marginBottom: '15px',
                backgroundColor: 'rgba(255, 0, 0, 0.2)',
                border: '1px solid rgba(255, 0, 0, 0.5)',
                borderRadius: '6px',
                color: '#ff6b6b',
                fontSize: '14px',
                textAlign: 'center'
              }}>
                {authError}
              </div>
            )}

            {/* Login/Register Form */}
            <form onSubmit={isLoginMode ? handleLogin : handleRegister}>
              {isLoginMode ? (
                // Login Form
                <>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{
                      display: 'block',
                      color: '#fff',
                      fontSize: '14px',
                      marginBottom: '8px',
                      fontWeight: '500'
                    }}>
                      Username <span style={{ color: '#ff6b6b' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="nickname-input"
                      placeholder="Nhập username..."
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isAuthLoading || isLoading}
                      maxLength={20}
                      style={{ width: '100%' }}
                      required
                    />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{
                      display: 'block',
                      color: '#fff',
                      fontSize: '14px',
                      marginBottom: '8px',
                      fontWeight: '500'
                    }}>
                      Password <span style={{ color: '#ff6b6b' }}>*</span>
                    </label>
                    <input
                      type="password"
                      className="nickname-input"
                      placeholder="Nhập mật khẩu..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isAuthLoading || isLoading}
                      style={{ width: '100%' }}
                      required
                    />
                  </div>
                </>
              ) : (
                // Register Form
                <>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{
                      display: 'block',
                      color: '#fff',
                      fontSize: '14px',
                      marginBottom: '5px',
                      fontWeight: '500'
                    }}>
                      Tên đăng nhập <span style={{ color: '#ff6b6b' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="nickname-input"
                      placeholder="Nhập tên đăng nhập..."
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isAuthLoading || isLoading}
                      maxLength={20}
                      style={{ width: '100%' }}
                      required
                    />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{
                      display: 'block',
                      color: '#fff',
                      fontSize: '14px',
                      marginBottom: '5px',
                      fontWeight: '500'
                    }}>
                      Nickname <span style={{ color: '#ff6b6b' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="nickname-input"
                      placeholder="Nhập nickname..."
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      disabled={isAuthLoading || isLoading}
                      maxLength={20}
                      style={{ width: '100%' }}
                      required
                    />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{
                      display: 'block',
                      color: '#fff',
                      fontSize: '14px',
                      marginBottom: '5px',
                      fontWeight: '500'
                    }}>
                      Email <span style={{ color: '#ff6b6b' }}>*</span>
                    </label>
                    <input
                      type="email"
                      className="nickname-input"
                      placeholder="Nhập email..."
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isAuthLoading || isLoading}
                      style={{ width: '100%' }}
                      required
                    />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{
                      display: 'block',
                      color: '#fff',
                      fontSize: '14px',
                      marginBottom: '5px',
                      fontWeight: '500'
                    }}>
                      Mật khẩu <span style={{ color: '#ff6b6b' }}>*</span>
                    </label>
                    <input
                      type="password"
                      className="nickname-input"
                      placeholder="Nhập mật khẩu..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isAuthLoading || isLoading}
                      style={{ width: '100%' }}
                      required
                    />
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{
                      display: 'block',
                      color: '#fff',
                      fontSize: '14px',
                      marginBottom: '5px',
                      fontWeight: '500'
                    }}>
                      Xác nhận mật khẩu <span style={{ color: '#ff6b6b' }}>*</span>
                    </label>
                    <input
                      type="password"
                      className="nickname-input"
                      placeholder="Nhập lại mật khẩu..."
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isAuthLoading || isLoading}
                      style={{ width: '100%' }}
                      required
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  isAuthLoading || isLoading || 
                  (isLoginMode 
                    ? (!username.trim() || !password.trim())
                    : (!username.trim() || !nickname.trim() || !email.trim() || !password.trim() || !confirmPassword.trim())
                  )
                }
                style={{ width: '100%', marginBottom: '10px' }}
              >
                {isAuthLoading ? 'Processing...' : (isLoginMode ? 'Login' : 'Register')}
              </button>
            </form>

            {/* Toggle between Login and Register */}
            <div style={{
              textAlign: 'center',
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              {isLoginMode ? (
                <p style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '14px',
                  margin: 0
                }}>
                  Don't have an account?{' '}
                  <button
                    onClick={() => {
                      setIsLoginMode(false);
                      setAuthError('');
                      setUsername('');
                      setNickname('');
                      setEmail('');
                      setPassword('');
                      setConfirmPassword('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4ECDC4',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontSize: '14px',
                      padding: 0,
                      fontWeight: 'bold'
                    }}
                  >
                    Register
                  </button>
                </p>
              ) : (
                <p style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '14px',
                  margin: 0
                }}>
                  Already have an account?{' '}
                  <button
                    onClick={() => {
                      setIsLoginMode(true);
                      setAuthError('');
                      setUsername('');
                      setNickname('');
                      setEmail('');
                      setPassword('');
                      setConfirmPassword('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4ECDC4',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontSize: '14px',
                      padding: 0,
                      fontWeight: 'bold'
                    }}
                  >
                    Login
                  </button>
                </p>
              )}
            </div>

            {/* Google OAuth - Chỉ hiển thị khi ở chế độ login */}
            {isLoginMode && (
              <div style={{
                marginTop: '10px',
                paddingTop: '10px',
                borderTop: '2px solid rgba(255, 255, 255, 0.2)'
              }}>
                <p style={{
                  color: '#fff',
                  fontSize: '14px',
                  marginBottom: '15px',
                  textAlign: 'center',
                  opacity: 0.9
                }}>
                  Or login with:
                </p>
                <button
                  onClick={() => onSocialLogin('google')}
                  disabled={isLoading || isAuthLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    padding: '12px 20px',
                    backgroundColor: '#4285F4',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: (isLoading || isAuthLoading) ? 'not-allowed' : 'pointer',
                    opacity: (isLoading || isAuthLoading) ? 0.6 : 1,
                    transition: 'all 0.3s',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading && !isAuthLoading) {
                      e.currentTarget.style.backgroundColor = '#357AE8';
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoading && !isAuthLoading) {
                      e.currentTarget.style.backgroundColor = '#4285F4';
                      e.currentTarget.style.transform = 'scale(1)';
                    }
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Login with Google
                </button>
              </div>
            )}
          </div>
        </div>
        )}

      </div>

      {showRoomTypePopup && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000,
            pointerEvents: 'auto'
          }}
          onClick={() => setShowRoomTypePopup(false)}
        >
          <div
            style={{
              backgroundColor: '#1a1a2e',
              padding: '40px',
              borderRadius: '16px',
              border: '2px solid #16213e',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              minWidth: '400px',
              textAlign: 'center',
              pointerEvents: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              color: '#fff',
              fontSize: '28px',
              marginBottom: '20px',
              fontWeight: 'bold'
            }}>
              Select Room Type
            </h2>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '15px',
              marginTop: '30px'
            }}>
              <button
                className="btn btn-primary"
                onClick={handleCreatePublicRoom}
                disabled={isLoading}
                style={{ width: '100%' }}
              >
                Public Room
                <div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.8 }}>
                  Players can join via Quick Join or room code
                </div>
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleCreatePrivateRoom}
                disabled={isLoading}
                style={{ width: '100%' }}
              >
                Private Room
                <div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.8 }}>
                  can only join with code
                </div>
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowRoomTypePopup(false)}
                disabled={isLoading}
                style={{ width: '100%', marginTop: '10px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {(error || connectionError) && (
        <div className="error-message-global">
          {error || connectionError}
        </div>
      )}
    </div>
  );
}
