import { useEffect, useState, useRef } from 'react';
import { GameState, TimerSync, Element, Player } from '../types';

interface GameContainer2Props {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  gameState: GameState;
  playerId: string | null;
  isSpectator: boolean;
  timerSync: TimerSync | null;
  chatMessages: Array<{ type: 'player' | 'system'; content: string }>;
  onSendChatMessage: (message: string) => void;
  onLeaveGame?: () => void;
}

export function GameContainer2({
  canvasRef,
  gameState,
  playerId,
  isSpectator,
  timerSync,
  chatMessages,
  onSendChatMessage,
  onLeaveGame
}: GameContainer2Props) {
  const DESIGN_WIDTH = 960;
  const DESIGN_HEIGHT = 540;
  
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showChatBox, setShowChatBox] = useState(false);
  const [chatInputValue, setChatInputValue] = useState('');
  const chatInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = 1440;
        canvasRef.current.height = 810;
      }
    };

    updateCanvasSize();
    
    window.addEventListener('resize', updateCanvasSize);
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [canvasRef]);


  useEffect(() => {
    const updateScale = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      const scaleX = viewportWidth / DESIGN_WIDTH;
      const scaleY = viewportHeight / DESIGN_HEIGHT;
      const newScale = Math.min(scaleX, scaleY);
      
      setScale(newScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const players = gameState?.players ? Object.values(gameState.players) : [];
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (e.target as HTMLElement)?.tagName?.toLowerCase() || '';
      const isTyping = activeTag === 'input' || activeTag === 'textarea' || (e.target as HTMLElement)?.isContentEditable;
      
      if (e.key === 'Enter' && !isTyping) {
        if (showChatBox) {
          if (chatInputValue.trim()) {
            handleSendChat();
          } else {
            setShowChatBox(false);
            chatInputRef.current?.blur();
          }
        } else {
          setShowChatBox(true);
          setTimeout(() => {
            chatInputRef.current?.focus();
          }, 10);
        }
      }
      
      if (e.key === 'Escape' && showChatBox) {
        setShowChatBox(false);
        chatInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showChatBox, chatInputValue]);

  const handleSendChat = () => {
    const message = chatInputValue.trim();
    if (message) {
      onSendChatMessage(message);
      setChatInputValue('');
      setShowChatBox(false);
      chatInputRef.current?.blur();
    }
  };

  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (chatInputValue.trim()) {
        handleSendChat();
      } else {
        setShowChatBox(false);
        chatInputRef.current?.blur();
      }
    }
  };

  useEffect(() => {
    if (showChatBox && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, showChatBox]);

  const sortedPlayers = [...players].sort((a, b) => (b.area || 0) - (a.area || 0));
  
  const getLeaderboardImage = (element?: Element): string => {
    switch (element) {
      case 'dog':
        return '/elements/IngameUI/leaderBoardDog@4x.png';
      case 'whale':
        return '/elements/IngameUI/leaderBoardWhale@4x.png';
      case 'duck':
        return '/elements/IngameUI/leaderBoardDuck@4x.png';
      case 'penguin':
        return '/elements/IngameUI/leaderBoardPenguin@4x.png';
      default:
        return '/elements/IngameUI/leaderBoard@4x.png';
    }
  };

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const getTimeRemaining = (): number => {
    if (!gameState) return 10 * 1000;
    
    const defaultTime = 10 * 1000;
    let timeRemaining = typeof gameState.timeRemaining === 'number'
      ? gameState.timeRemaining
      : defaultTime;

    if (timerSync && typeof timerSync.remainingMs === 'number') {
      const elapsed = performance.now() - timerSync.syncedAt;
      timeRemaining = Math.max(0, timerSync.remainingMs - elapsed);
    }

    return timeRemaining;
  };

  const timeRemaining = getTimeRemaining();
  const winnerName = gameState?.winnerName;
  const isGameOver = gameState?.gameOver;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.position = 'fixed';
    document.documentElement.style.width = '100%';
    document.documentElement.style.height = '100%';
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.position = '';
      document.documentElement.style.width = '';
      document.documentElement.style.height = '';
    };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      touchAction: 'none',
      overscrollBehavior: 'none'
    }}>
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: 'center center',
        zIndex: 0,
        pointerEvents: 'none'
      }}>
        <img
          src="/elements/IngameUI/Background1.png"
          alt="Background 1"
          style={{
            display: 'block'
          }}
        />
      </div>
      
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: 'center center',
        width: `${855 * 1.5}px`,
        height: `${480.9375 * 1.5}px`,
        zIndex: 5,
        pointerEvents: 'none'
      }}>
        <img
          src="/elements/IngameUI/background2.png"
          alt="Background 2"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block'
          }}
        />
      </div>
      
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: `${DESIGN_WIDTH}px`,
          height: `${DESIGN_HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          flexShrink: 0,
          zIndex: 10
        }}
      >
        <canvas
          ref={canvasRef}
          id="gameCanvas"
          width={1440}
          height={810}
          style={{
            position: 'absolute',
            left: '52.5px',
            top: '29.53125px',
            width: '855px',
            height: '480.9375px',
            zIndex: 100,
            display: 'block'
          }}
        />

        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%) scale(0.5)',
          transformOrigin: 'top center',
          zIndex: 1000,
          pointerEvents: 'none',
          opacity: 0.9
        }}>
          <img
            src="/elements/IngameUI/Timer.png"
            alt="Timer"
            style={{
              width: 'auto',
              height: 'auto',
              display: 'block',
              imageRendering: 'auto'
            }}
          />
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none'
          }}>
            <div style={{
              fontSize: '24px',
              color: '#000000',
              fontWeight: 'bold'
            }}>{formatTime(timeRemaining)}</div>
            {isGameOver && (
              <div style={{
                fontSize: '12px',
                marginTop: '3px',
                color: '#000000',
                fontWeight: 'bold'
              }}>
                {winnerName ? `${winnerName} wins!` : 'Match ended'}
              </div>
            )}
          </div>
        </div>

      </div>
      
      {sortedPlayers.length > 0 && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 1000,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          transform: `scale(${scale * 0.25 * 0.9 * 0.9})`,
          transformOrigin: 'top left'
        }}>
            {sortedPlayers.map((player, index) => {
              return (
              <div
                key={player.id}
                style={{
                  position: 'relative',
                  transform: 'none',
                  transformOrigin: 'top left',
                  marginBottom: '0px',
                  marginTop: '0px',
                  lineHeight: '0',
                  display: 'block'
                }}
              >
                <img
                  src={getLeaderboardImage(player.element)}
                  alt={`Leaderboard ${player.element || 'default'}`}
                  style={{
                    display: 'block',
                    width: 'auto',
                    height: 'auto',
                    margin: '0',
                    padding: '0',
                    verticalAlign: 'top',
                    lineHeight: '0'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '60%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  pointerEvents: 'none',
                  color: '#000000',
                  fontWeight: 'bold',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <div style={{ fontSize: '40px', lineHeight: '1.2' }}>
                    {player.name || player.id?.substring(0, 8) || 'Player'}
                  </div>
                  <div style={{ fontSize: '36px', lineHeight: '1.2' }}>
                    {player.area || 0}
                  </div>
                </div>
              </div>
              );
            })}
        </div>
      )}

      <div
        onClick={() => {
          setShowChatBox(!showChatBox);
          if (!showChatBox) {
            setTimeout(() => {
              chatInputRef.current?.focus();
            }, 10);
          }
        }}
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          cursor: 'pointer',
          pointerEvents: 'auto',
          zIndex: 1000,
          transform: `scale(${scale * 0.25 * 0.8})`,
          transformOrigin: 'bottom left'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = `scale(${scale * 0.25 * 0.8 * 1.05})`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = `scale(${scale * 0.25 * 0.8})`;
        }}
      >
        <img
          src="/elements/IngameUI/EnterChat@4x.png"
          alt="Enter Chat"
          style={{
            display: 'block',
            transition: 'transform 0.3s ease'
          }}
        />
      </div>

      <div
        onClick={() => {
          const confirmed = window.confirm('Bạn có muốn thoát phòng không?');
          if (confirmed) {
            if (onLeaveGame) {
              onLeaveGame();
            } else {
              window.location.reload();
            }
          }
        }}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          cursor: 'pointer',
          pointerEvents: 'auto',
          zIndex: 1000,
          transform: `scale(${scale * 0.14})`,
          transformOrigin: 'top right'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = `scale(${scale * 0.14 * 1.05})`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = `scale(${scale * 0.14})`;
        }}
      >
        <img
          src="/elements/IngameUI/leaveRoomButton@4x.png"
          alt="Leave Room"
          style={{
            display: 'block',
            transition: 'transform 0.3s ease'
          }}
        />
      </div>

      {showChatBox && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          zIndex: 1001,
          transform: `scale(${scale})`,
          transformOrigin: 'bottom left',
          pointerEvents: 'auto',
          willChange: 'transform'
        }}>
          <div style={{
            position: 'relative',
            width: '400px',
            height: '400px',
            maxHeight: '400px',
            background: 'rgba(20, 25, 40, 0.95)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            overflow: 'hidden'
          }}>
            <div style={{
              flex: 1,
              minHeight: 0,
              maxHeight: '300px',
              overflowY: 'auto',
              overflowX: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '10px',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '8px',
              marginBottom: '10px'
            }}>
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  style={{
                    padding: '8px 12px',
                    background: msg.type === 'system' 
                      ? 'rgba(255, 193, 7, 0.2)' 
                      : 'rgba(102, 126, 234, 0.2)',
                    borderRadius: '8px',
                    borderLeft: `3px solid ${msg.type === 'system' ? '#ffc107' : '#667eea'}`,
                    color: 'white',
                    fontSize: '13px',
                    lineHeight: '1.4',
                    wordWrap: 'break-word'
                  }}
                >
                  {msg.content}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center'
            }}>
              <input
                ref={chatInputRef}
                type="text"
                placeholder="Type a message..."
                value={chatInputValue}
                onChange={(e) => setChatInputValue(e.target.value)}
                onKeyPress={handleChatKeyPress}
                style={{
                  flex: 1,
                  padding: '12px 15px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                }}
                onBlur={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }}
              />
              <button
                onClick={handleSendChat}
                style={{
                  width: '45px',
                  height: '45px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {isGameOver && (
        <div
          style={{
            position: 'fixed',
            bottom: '40px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '16px',
            zIndex: 2000
          }}
        >
          <button
            onClick={() => {
              // Quick reset: reload page and reconnect
              window.location.reload();
            }}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              border: '2px solid #000',
              background: '#4ECDC4',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Reset Game
          </button>
          <button
            onClick={() => {
              if (onLeaveGame) {
                onLeaveGame();
              } else {
                window.location.reload();
              }
            }}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              border: '2px solid #000',
              background: '#FF6B6B',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Leave Lobby
          </button>
        </div>
      )}

    </div>
  );
}

