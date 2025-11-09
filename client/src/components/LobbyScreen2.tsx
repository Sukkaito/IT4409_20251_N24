import { useState, useEffect, useRef, Fragment } from 'react';
import { Element } from '../types';
import { Chat } from './Chat';

interface LobbyPlayer {
  id: string;
  name: string;
  element: Element | null;
  isReady: boolean;
  isHost: boolean;
}

interface LobbyState {
  roomId: string;
  roomCode: string | null;
  isPrivate: boolean;
  players: LobbyPlayer[];
  maxPlayers: number;
}

interface LobbyScreen2Props {
  lobbyState: LobbyState;
  currentPlayerId: string;
  selectedElement: Element;
  onSelectElement: (element: Element) => void;
  elementAvailability: Record<string, boolean>;
  chatMessages: Array<{ type: 'player' | 'system'; content: string }>;
  onSendChat: (message: string) => void;
  onSetReady: (isReady: boolean) => void;
  onKickPlayer: (playerId: string) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  isReady: boolean;
}

export function LobbyScreen2({
  lobbyState,
  currentPlayerId,
  selectedElement,
  onSelectElement,
  elementAvailability,
  chatMessages,
  onSendChat,
  onSetReady,
  onKickPlayer,
  onStartGame,
  onLeaveRoom,
  isReady
}: LobbyScreen2Props) {
  // Kích thước thiết kế gốc @4x: 1920px x 1080px
  const DESIGN_WIDTH = 480;
  const DESIGN_HEIGHT = 270;
  
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showCodePopup, setShowCodePopup] = useState(false);
  const [chatInputValue, setChatInputValue] = useState('');
  const chatInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Automatically select a random character when joining lobby and no character is selected
  // Logic từ LobbyScreen cũ
  useEffect(() => {
    if (!lobbyState || !currentPlayerId) return;
    
    // Check if current player already has a character
    const currentPlayer = lobbyState.players.find(p => p.id === currentPlayerId);
    if (currentPlayer && currentPlayer.element) {
      // Already has a character, no need to select
      return;
    }
    
    // Get list of already selected characters
    const usedElements = new Set(
      lobbyState.players
        .filter(p => p.id !== currentPlayerId && p.element)
        .map(p => p.element)
    );
    
    // Get list of available characters
    const allElements: Element[] = ['dog', 'duck', 'penguin', 'whale'];
    const availableElements = allElements.filter(
      el => !usedElements.has(el)
    );
    
    // If there are available characters, select randomly
    if (availableElements.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableElements.length);
      const randomElement = availableElements[randomIndex];
      if (randomElement) {
        onSelectElement(randomElement);
      }
    }
  }, [lobbyState, currentPlayerId, onSelectElement]);

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Handle Enter key to focus chat input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (e.target as HTMLElement)?.tagName?.toLowerCase() || '';
      const isTyping = activeTag === 'input' || activeTag === 'textarea' || (e.target as HTMLElement)?.isContentEditable;
      
      if (e.key === 'Enter' && !isTyping) {
        if (document.activeElement === chatInputRef.current && !chatInputValue.trim()) {
          chatInputRef.current?.blur();
        } else {
          setTimeout(() => {
            chatInputRef.current?.focus();
          }, 10);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chatInputValue]);

  const handleChatSend = () => {
    const message = chatInputValue.trim();
    if (message) {
      onSendChat(message);
      setChatInputValue('');
      chatInputRef.current?.blur();
    }
  };

  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (chatInputValue.trim()) {
        handleChatSend();
      } else {
        chatInputRef.current?.blur();
      }
    }
  };

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
      justifyContent: 'center'
    }}>
      <div className="lobby-background"></div>
      
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: `${DESIGN_WIDTH}px`,
          height: `${DESIGN_HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          // Giữ nguyên kích thước thực tế để không ảnh hưởng layout
          flexShrink: 0
        }}
      >
        {lobbyState?.isPrivate === false && (
          <div
            style={{
              position: 'absolute',
              left: '47.75px',  // 191 / 4
              top: '26.25px',   // 105 / 4
              width: '45.25px', // 181 / 4
              height: '93.25px', // 373 / 4
              pointerEvents: 'none',
              zIndex: 50
            }}
          >
            <img 
              src="/elements/LobbyUI/Public@4x.png" 
              alt="Public Room"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block'
              }}
              onError={(e) => {
                // Image failed to load
              }}
            />
          </div>
        )}

        {lobbyState?.isPrivate === true && (
          <div
            style={{
              position: 'absolute',
              left: '47.75px',  // 191 / 4
              top: '26.25px',   // 105 / 4
              width: '45.25px', // 181 / 4
              height: '93.25px', // 373 / 4
              pointerEvents: 'none',
              zIndex: 50
            }}
          >
            <img 
              src="/elements/LobbyUI/Private@4x.png" 
              alt="Private Room"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block'
              }}
              onError={(e) => {
                // Image failed to load
              }}
            />
          </div>
        )}

        <div style={{
          position: 'absolute',
          left: '36.75px',
          top: '26.25px',
          width: '290px',
          height: '154.75px',
          pointerEvents: 'none'
        }}>
          <img 
            src="/elements/LobbyUI/LobbyHolder@4x.png" 
            alt="Lobby Frame"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block'
            }}
            onError={(e) => {
              // Image failed to load
              // Fallback: show a border if image fails to load
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.style.border = '2px solid #fff';
                parent.style.background = 'rgba(255, 255, 255, 0.1)';
              }
            }}
          />
        </div>

        <div
          style={{
            position: 'absolute',
            left: '103.25px',  // 413 / 4
            top: '37.75px',   // 151 / 4
            width: '118.25px', // 473 / 4
            height: '17.5px',  // 70 / 4
            pointerEvents: 'none',
            zIndex: 50
          }}
        >
          <img 
            src="/elements/LobbyUI/roombox@4x.png" 
            alt="Room Box"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block'
            }}
            onError={(e) => {
              // Image failed to load
            }}
          />
        </div>
        
        <div
          style={{
            position: 'absolute',
            left: '103.25px',  // 413 / 4
            top: '37.75px',   // 151 / 4
            width: '118.25px', // 473 / 4
            height: '17.5px',  // 70 / 4
            color: '#000',
            fontSize: '12px', // 48 / 4
            fontWeight: 'bold',
            fontFamily: "'Annie Use Your Telescope', cursive",
            pointerEvents: 'none',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
          }}
        >
          {lobbyState?.players?.find(p => p.isHost)?.name 
            ? `${lobbyState.players.find(p => p.isHost)!.name}'s Room`
            : 'Lobby'}
        </div>
        
        <div
          onClick={() => setShowCodePopup(true)}
          style={{
            position: 'absolute',
            left: '230.75px',  // 923 / 4
            top: '37.5px',    // 150 / 4
            width: '36.5px',  // 146 / 4
            height: '17.5px', // 70 / 4
            pointerEvents: 'auto',
            cursor: 'pointer',
            zIndex: 200
          }}
        >
          <img 
            src="/elements/LobbyUI/CodeButton@4x.png" 
            alt="Code Button"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block'
            }}
            onError={(e) => {
              // Image failed to load
            }}
          />
        </div>
        
        <div
          onClick={onLeaveRoom}
          style={{
            position: 'absolute',
            left: '276.5px',  // 1106 / 4
            top: '37.5px',   // 150 / 4
            width: '36.5px', // 146 / 4
            height: '17.5px', // 70 / 4
            pointerEvents: 'auto',
            cursor: 'pointer'
          }}
        >
          <img 
            src="/elements/LobbyUI/LeaveButton@4x.png" 
            alt="Leave Button"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
              opacity: 1,
              filter: 'none'
            }}
          />
        </div>
        
        <div
          onClick={() => onSetReady(!isReady)}
          style={{
            position: 'absolute',
            left: '350px',    // Điều chỉnh lại, giữa 342.5px và 360px
            top: '200px',     // Đẩy xuống từ 169.5px
            width: '75px',   // 300 / 4
            height: '50px',  // 200 / 4
            cursor: 'pointer',
            pointerEvents: 'auto'
          }}
        >
          <img
            src="/elements/LobbyUI/ReaddyButton@4x.png" 
            alt="Ready Button"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
              opacity: isReady ? 0.7 : 1
            }}
          />
        </div>
        
        <div
          onClick={() => {
            const currentPlayer = lobbyState?.players?.find(p => p.id === currentPlayerId);
            if (currentPlayer?.isHost) {
              onStartGame();
            } else {
              alert('Bạn không phải chủ phòng!');
            }
          }}
          style={{
            position: 'absolute',
            left: '433.75px', // Điều chỉnh lại, giữa 426.25px và 443.75px
            top: '200px',     // Đẩy xuống từ 169.5px
            width: '43.5px',  // 174 / 4
            height: '49.5px', // 198 / 4
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 1000
          }}
        >
          <img
            src="/elements/LobbyUI/StartButton@4x.png" 
            alt="Start Game Button"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </div>
        
        {showCodePopup && (
          <>
            <div
              style={{
                position: 'fixed',
                left: '178px',  // 712 / 4
                top: '96px',   // 384 / 4
                width: '123.5px', // 494 / 4
                height: '78px',   // 312 / 4
                zIndex: 10001,
                pointerEvents: 'none',
                opacity: 0.9
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src="/elements/LobbyUI/codePopUp@4x.png"
                alt="Code Popup Background"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  pointerEvents: 'none'
                }}
              />
              
              <div style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                padding: '10px', // 40 / 4
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none'
              }}>
                <h2 style={{
                  color: '#fff',
                  fontSize: '7px', // 28 / 4
                  marginBottom: '5px', // 20 / 4
                  fontWeight: 'bold',
                  pointerEvents: 'none'
                }}>
                  Room Code
                </h2>
                {lobbyState?.roomCode ? (
                  <div style={{ pointerEvents: 'none' }}>
                    <div style={{
                      color: '#4ecdc4',
                      fontSize: '12px', // 48 / 4
                      fontWeight: 'bold',
                      letterSpacing: '2px', // 8 / 4
                      marginBottom: '2.5px', // 10 / 4
                      fontFamily: 'monospace',
                      textShadow: '0 0 2.5px rgba(78, 205, 196, 0.5)' // 10 / 4
                    }}>
                      {lobbyState.roomCode}
                    </div>
                  </div>
                ) : (
                  <div style={{ pointerEvents: 'none' }}>
                    <div style={{
                      color: '#fff',
                      fontSize: '6px', // 24 / 4
                      marginBottom: '5px' // 20 / 4
                    }}>
                      No Room Code
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div
              onClick={() => setShowCodePopup(false)}
              style={{
                position: 'fixed',
                left: '278.25px', // 1113 / 4
                top: '102.25px',  // 409 / 4
                width: '17.5px',  // 70 / 4
                height: '17.5px', // 70 / 4
                cursor: 'pointer',
                pointerEvents: 'auto',
                zIndex: 10002
              }}
            >
              <img
                src="/elements/LobbyUI/BackButton@4x.png"
                alt="Back Button"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block'
                }}
                onError={(e) => {
                  // Image failed to load
                }}
              />
            </div>
            
            {lobbyState?.roomCode && (
              <div
                onClick={() => {
                  navigator.clipboard.writeText(lobbyState.roomCode || '');
                  alert('Room code copied!');
                }}
                style={{
                  position: 'fixed',
                  left: '210.75px', // 843 / 4
                  top: '149.25px',  // 597 / 4
                  width: '64.75px', // 259 / 4
                  height: '19.5px', // 78 / 4
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  zIndex: 10002
                }}
              >
                <img
                  src="/elements/LobbyUI/CopyCodeButton@4x.png"
                  alt="Copy Code Button"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block'
                  }}
                  onError={(e) => {
                    // Image failed to load
                  }}
                />
              </div>
            )}
          </>
        )}

        <div style={{
          position: 'absolute',
          left: '34.75px',  // 139 / 4
          top: '190px',     // 760 / 4
          width: '292px',   // 1168 / 4
          height: '63.5px', // 254 / 4
          zIndex: 1000,
          pointerEvents: 'none'
        }}>
          <img
            src="/elements/LobbyUI/chatbox@4x.png"
            alt="Chatbox"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </div>

        <div style={{
          position: 'absolute',
          left: '34.75px',  // 139 / 4
          top: '190px',     // 760 / 4
          width: '292px',   // 1168 / 4
          height: '63.5px', // 254 / 4
          zIndex: 1001,
          pointerEvents: 'none',
          background: 'transparent',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            overflowY: 'auto',
            padding: '5px', // 20 / 4
            pointerEvents: 'auto',
            background: 'transparent'
          }}>
            {chatMessages.map((msg, index) => (
              <div
                key={index}
                style={{
                  margin: '1.25px 0', // 5 / 4
                  fontSize: '3.5px',  // 14 / 4
                  color: msg.type === 'system' ? '#4ECDC4' : '#FFEAA7',
                  fontStyle: msg.type === 'system' ? 'italic' : 'normal'
                }}
              >
                {msg.content}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div style={{
          position: 'absolute',
          left: '44px',     // 176 / 4
          top: '230.5px',   // 922 / 4
          width: '241.5px', // 966 / 4
          height: '16.25px', // 65 / 4
          zIndex: 1000,
          pointerEvents: 'none'
        }}>
          <img
            src="/elements/LobbyUI/inputField@4x.png"
            alt="Input Field"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </div>

        <input
          ref={chatInputRef}
          type="text"
          placeholder="Type a message... (Press Enter)"
          value={chatInputValue}
          onChange={(e) => setChatInputValue(e.target.value)}
          onKeyPress={handleChatKeyPress}
          style={{
            position: 'absolute',
            left: '44px',     // 176 / 4
            top: '230.5px',   // 922 / 4
            width: '241.5px', // 966 / 4
            height: '16.25px', // 65 / 4
            padding: '0 5px', // 20 / 4
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '4px', // 16 / 4
            zIndex: 1001,
            outline: 'none'
          }}
        />

        <div
          onClick={handleChatSend}
          style={{
            position: 'absolute',
            left: '299.25px', // 1197 / 4
            top: '230.5px',   // 922 / 4
            width: '15.75px', // 63 / 4
            height: '15.75px', // 63 / 4
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 1001
          }}
        >
          <img
            src="/elements/LobbyUI/sentButton@4x.png"
            alt="Send Button"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </div>

        {[72.5, 99.25, 126.25, 153.25].map((top, index) => {
          const player = lobbyState?.players?.[index];
          const hasPlayer = !!player;
          const isCurrentPlayer = player?.id === currentPlayerId;
          const currentPlayer = lobbyState?.players?.find(p => p.id === currentPlayerId);
          const isHost = currentPlayer?.isHost || false;
          const canKick = isHost && player && player.id !== currentPlayerId;
          
          return (
            <Fragment key={`player-holder-wrapper-${index}`}>
            <div
              key={`player-holder-${index}`}
              style={{
                position: 'absolute',
                left: '93.5px',  // 374 / 4
                top: `${top}px`,
                width: '169px',  // 676 / 4
                height: '21px',  // 84 / 4
                pointerEvents: 'auto',
                opacity: hasPlayer ? 1 : 0.3
              }}
            >
              <img 
                src="/elements/LobbyUI/PlayerHolder_1@4x.png" 
                alt={`Player Holder ${index + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: 1
                }}
              />
              {player && player.element && (() => {
                const iconSizes: Record<Element, { width: number; height: number }> = {
                  penguin: { width: 18, height: 17 },  // 72/4, 68/4
                  whale: { width: 18.5, height: 16.75 }, // 74/4, 67/4
                  duck: { width: 17.75, height: 17.75 }, // 71/4, 71/4
                  dog: { width: 17, height: 17.5 }      // 68/4, 70/4
                };
                
                const iconFiles: Record<Element, string> = {
                  penguin: 'penguin icon@4x.png',
                  whale: 'whale icon@4x.png',
                  duck: 'duck icon@4x.png',
                  dog: 'dog icon@4x.png'
                };
                
                const size = iconSizes[player.element];
                const iconFile = iconFiles[player.element];
                
                return (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(50% - 0.75px)', // -3px / 4
                      left: '7.25px', // 29 / 4
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      zIndex: 10,
                      width: `${size.width}px`,
                      height: `${size.height}px`
                    }}
                  >
                    <img 
                      src={`/elements/LobbyUI/${iconFile}`}
                      alt={player.element}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        display: 'block'
                      }}
                    />
                  </div>
                );
              })()}
              
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: '#000',
                  fontSize: '10px', // 40 / 4
                  fontWeight: 'bold',
                  fontFamily: "'Annie Use Your Telescope', cursive",
                  textAlign: 'center',
                  pointerEvents: 'none',
                  zIndex: 10,
                  textShadow: 'none',
                  width: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {player ? player.name : ''}
              </div>
              
              {player && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(50% - 1.25px)', // -5px / 4
                    right: '16px', // 64 / 4
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    zIndex: 10,
                    width: '35.5px', // 142 / 4
                    height: '10.25px' // 41 / 4
                  }}
                >
                  <img 
                    src="/elements/LobbyUI/ReddyOrNot@4x.png" 
                    alt="Ready or Not"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block',
                      position: 'relative'
                    }}
                  />
                  {!player.isReady && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 11,
                        width: '21.5px' // 86 / 4
                      }}
                    >
                      <img 
                        src="/elements/LobbyUI/NOT@4x.png" 
                        alt="Not Ready"
                        style={{
                          width: '100%',
                          height: 'auto',
                          display: 'block'
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {(() => {
              const currentPlayer = lobbyState?.players?.find(p => p.id === currentPlayerId);
              const isHost = currentPlayer?.isHost || false;
              const canKick = isHost && player && player.id !== currentPlayerId;
              
              if (canKick) {
                return (
                  <div
                    key={`kick-button-${index}`}
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to kick ${player.name}?`)) {
                        onKickPlayer(player.id);
                      }
                    }}
                    style={{
                      position: 'absolute',
                      left: '267.5px', // 1070 / 4 (374 + 676 + 20 = 1070px @4x)
                      top: `${top + 10.5}px`, // top + 42px / 4 (half of playerholder height 84px / 4)
                      transform: 'translateY(-50%)',
                      width: '25px',  // 100 / 4
                      height: '11.25px', // 45 / 4
                      display: 'flex',
                      alignItems: 'center',
                      pointerEvents: 'auto',
                      cursor: 'pointer',
                      zIndex: 200
                    }}
                  >
                    <img 
                      src="/elements/LobbyUI/kickbutton@4x.png" 
                      alt="Kick Button"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        display: 'block'
                      }}
                      onError={(e) => {
                        // Image failed to load
                      }}
                    />
                  </div>
                );
              }
              return null;
            })()}
          </Fragment>
        );
      })}

        {(['penguin', 'whale', 'dog', 'duck'] as Element[]).map((element) => {
          const isSelected = selectedElement === element;
          const isAvailable = elementAvailability[element] !== false;
          
          let left = '0px';
          let bottom = '0px';
          let width = '0px';
          let height = '0px';
          
          if (element === 'penguin') {
            left = '349.25px';
            bottom = '178.5px';
            width = '55.5px';
            height = '52.75px';
          } else if (element === 'whale') {
            left = '427.25px';
            bottom = '178.5px';
            width = '60.5px';
            height = '55.5px';
          } else if (element === 'dog') {
            left = '427.25px';
            bottom = '98.75px';
            width = '55.25px';
            height = '57.25px';
          } else if (element === 'duck') {
            left = '349.25px';
            bottom = '98.75px';
            width = '55.25px';
            height = '55.25px';
          }
          
          return (
            <div
              key={element}
              onClick={() => {
                if (isAvailable) {
                  onSelectElement(element);
                }
              }}
              style={{
                position: 'absolute',
                left,
                bottom,
                width,
                height,
                cursor: isAvailable ? 'pointer' : 'not-allowed',
                pointerEvents: 'auto',
                opacity: isAvailable ? (isSelected ? 1 : 0.7) : 0.3,
                transition: 'opacity 0.2s, transform 0.2s',
                transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                border: isSelected ? '2px solid #4ECDC4' : '2px solid transparent',
                borderRadius: '4px',
                boxShadow: isSelected ? '0 0 8px rgba(78, 205, 196, 0.5)' : 'none'
              }}
            >
              <img 
                src={`/elements/LobbyUI/${element}@4x.png`}
                alt={element.charAt(0).toUpperCase() + element.slice(1)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

