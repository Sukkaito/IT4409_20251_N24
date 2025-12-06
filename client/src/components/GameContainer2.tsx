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
  countdown: number | null;
}

export function GameContainer2({
  canvasRef,
  gameState,
  playerId,
  isSpectator,
  timerSync,
  chatMessages,
  onSendChatMessage,
  onLeaveGame,
  countdown
}: GameContainer2Props) {
  const DESIGN_WIDTH = 960;
  const DESIGN_HEIGHT = 540;
  
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showChatBox, setShowChatBox] = useState(false);
  const [chatInputValue, setChatInputValue] = useState('');
  const chatInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const previousMessageCountRef = useRef(0);

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

  // Initialize message count on mount
  useEffect(() => {
    previousMessageCountRef.current = chatMessages.length;
  }, []);

  useEffect(() => {
    if (showChatBox && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      // Reset new message indicator when chat box is opened
      setHasNewMessage(false);
      previousMessageCountRef.current = chatMessages.length;
    }
  }, [chatMessages, showChatBox]);

  // Detect new messages when chat box is closed
  useEffect(() => {
    if (!showChatBox && chatMessages.length > previousMessageCountRef.current) {
      setHasNewMessage(true);
      previousMessageCountRef.current = chatMessages.length;
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
    // Don't show timer during countdown
    if (countdown !== null) return 0;
    
    if (!gameState) return 10 * 1000;
    
    const defaultTime = 10 * 1000;
    let timeRemaining = typeof gameState.timeRemaining === 'number'
      ? gameState.timeRemaining
      : defaultTime;

    // Only use timerSync if countdown is finished
    if (countdown === null && timerSync && typeof timerSync.remainingMs === 'number') {
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

        {/* Timer - chỉ hiển thị khi không đang countdown */}
        {countdown === null && (
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
        )}

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
                  color: '#FFFFFF',
                  fontWeight: 'bold',
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <div style={{ 
                    fontSize: '50px', 
                    lineHeight: '1.2',
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontWeight: 'bold',
                    color: '#FFFFFF'
                  }}>
                    {player.name || player.id?.substring(0, 8) || 'Player'}
                  </div>
                  <div style={{ 
                    fontSize: '45px', 
                    lineHeight: '1.2',
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontWeight: 'bold',
                    color: '#FFFFFF'
                  }}>
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
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img
            src="/elements/IngameUI/EnterChat@4x.png"
            alt="Enter Chat"
            style={{
              display: 'block',
              transition: 'transform 0.3s ease'
            }}
          />
          {hasNewMessage && !showChatBox && (
            <img
              src="/elements/IngameUI/Notify@4x.png"
              alt="New Message"
              style={{
                position: 'absolute',
                top: '0',
                right: '0',
                width: 'auto',
                height: 'auto',
                transform: 'translate(25%, -25%)',
                pointerEvents: 'none',
                zIndex: 1001
              }}
            />
          )}
        </div>
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
              maxHeight: '250px',
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
              alignItems: 'center',
              marginTop: 'auto',
              paddingTop: '10px'
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
                  backgroundImage: 'url(/elements/IngameUI/input@2x.png)',
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  border: 'none',
                  borderRadius: '0',
                  color: '#000000',
                  fontSize: '14px',
                  outline: 'none',
                  minHeight: '45px',
                  boxSizing: 'border-box'
                }}
              />
              <button
                onClick={handleSendChat}
                style={{
                  width: 'auto',
                  height: 'auto',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.2s ease',
                  transform: 'scale(0.5)',
                  transformOrigin: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(0.525)'; // 0.5 * 1.05
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(0.5)';
                }}
              >
                <img
                  src="/elements/IngameUI/sent@2x.png"
                  alt="Send"
                  style={{
                    width: 'auto',
                    height: 'auto',
                    display: 'block'
                  }}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Countdown overlay - hiển thị ở giữa màn hình */}
      {countdown !== null && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 5000,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              fontSize: '120px',
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 700,
              color: '#FFFFFF',
              textShadow: '0 0 20px rgba(78, 205, 196, 0.8), 0 0 40px rgba(78, 205, 196, 0.6), 0 4px 8px rgba(0, 0, 0, 0.5)',
              animation: 'countdownPulse 0.5s ease-in-out',
              lineHeight: 1
            }}
          >
            {countdown}
          </div>
        </div>
      )}

      {/* Winner Popup */}
      {isGameOver && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5000,
            pointerEvents: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              backgroundColor: '#292c31',
              padding: '40px 60px',
              borderRadius: '16px',
              border: '2px solid #16213e',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              minWidth: '400px',
              textAlign: 'center',
              pointerEvents: 'auto',
              fontFamily: "'Bricolage Grotesque', sans-serif",
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                color: '#fff',
                fontSize: '36px',
                marginBottom: 0,
                marginTop: 0,
                fontWeight: 'bold',
                fontFamily: "'Bricolage Grotesque', sans-serif",
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {winnerName ? `${winnerName} Wins!` : 'Match Ended'}
            </h2>
            <div
              onClick={() => {
                if (onLeaveGame) {
                  onLeaveGame();
                }
              }}
              style={{
                cursor: 'pointer',
                marginTop: '60px',
                display: 'inline-block',
                transition: 'transform 0.2s ease',
                transform: 'scale(0.25)',
                transformOrigin: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(0.2625)'; // 0.25 * 1.05
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(0.25)';
              }}
            >
              <img
                src="/elements/IngameUI/returntolobbyButton@2x.png"
                alt="Return to Lobby"
                style={{
                  width: 'auto',
                  height: 'auto',
                  display: 'block'
                }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

