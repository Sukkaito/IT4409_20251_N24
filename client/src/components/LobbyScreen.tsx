import { useState, useEffect, useRef, Fragment } from 'react';
import { Element } from '../types';
import { Chat } from './Chat';

function useViewportScale(baseWidth: number = 1600, baseHeight: number = 900) {
  const [scale, setScale] = useState(1);
  const [viewportWidth, setViewportWidth] = useState(baseWidth);
  const [viewportHeight, setViewportHeight] = useState(baseHeight);

  useEffect(() => {
    const updateScale = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setViewportWidth(width);
      setViewportHeight(height);
      
      const baseAspectRatio = baseWidth / baseHeight;
      const viewportAspectRatio = width / height;
      
      let newScale: number;
      
      if (Math.abs(viewportAspectRatio - baseAspectRatio) < 0.1) {
        const scaleX = width / baseWidth;
        const scaleY = height / baseHeight;
        newScale = Math.min(scaleX, scaleY, 1);
      } else if (viewportAspectRatio > baseAspectRatio) {
        newScale = Math.min(height / baseHeight, 1);
      } else {
        newScale = Math.min(width / baseWidth, 1);
      }
      
      setScale(newScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [baseWidth, baseHeight]);

  return { scale, viewportWidth, viewportHeight };
}

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

interface LobbyScreenProps {
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

export function LobbyScreen({
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
}: LobbyScreenProps) {
  const [showCodePopup, setShowCodePopup] = useState(false);
  const { scale } = useViewportScale(1600, 900);

  // Automatically select a random character when joining lobby and no character is selected
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

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div className="lobby-background"></div>
      
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '1600px',
        height: '900px',
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: 'center center',
        overflow: 'visible'
      }}>
      
      {lobbyState?.isPrivate === false && (
        <div
          style={{
            position: 'absolute',
            left: '191px',
            top: '105px',
            width: '181px',
            height: '373px',
            pointerEvents: 'none',
            zIndex: 50
          }}
        >
          <img 
            src="/elements/LobbyUI/Public@4x.png" 
            alt="Public Room"
            style={{
              maxWidth: '100%',
              height: 'auto',
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
            left: '191px',
            top: '105px',
            width: '181px',
            height: '373px',
            pointerEvents: 'none',
            zIndex: 50
          }}
        >
          <img 
            src="/elements/LobbyUI/Private@4x.png" 
            alt="Private Room"
            style={{
              maxWidth: '100%',
              height: 'auto',
              objectFit: 'contain',
              display: 'block'
            }}
            onError={(e) => {
              // Image failed to load
            }}
          />
        </div>
      )}
      
      <div
        style={{
          position: 'absolute',
          left: '413px',
          top: '151px',
          width: '473px',
          height: '70px',
          pointerEvents: 'none',
          zIndex: 50
        }}
      >
        <img 
          src="/elements/LobbyUI/roombox@4x.png" 
          alt="Room Box"
          style={{
            maxWidth: '100%',
            height: 'auto',
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
          left: '413px',
          top: '151px',
          width: '473px',
          height: '70px',
          color: '#000',
          fontSize: '48px',
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
          left: '923px',
          top: '150px',
          width: '146px',
          height: '70px',
          pointerEvents: 'auto',
          cursor: 'pointer',
          zIndex: 200
        }}
      >
        <img 
          src="/elements/LobbyUI/CodeButton@4x.png" 
          alt="Code Button"
          style={{
            maxWidth: '100%',
            height: 'auto',
            objectFit: 'contain',
            display: 'block'
          }}
          onError={(e) => {
            // Image failed to load
          }}
        />
      </div>
      
      {showCodePopup && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              zIndex: 10000,
              pointerEvents: 'auto'
            }}
            onClick={() => setShowCodePopup(false)}
          />
          
          <div
            style={{
              position: 'fixed',
              left: '712px',
              top: '384px',
              width: '494px',
              height: '312px',
              zIndex: 10001,
              pointerEvents: 'none'
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
                maxWidth: '100%',
                height: 'auto',
                objectFit: 'contain',
                display: 'block',
                pointerEvents: 'none'
              }}
            />
            
            <div style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              padding: '40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none'
            }}>
              <h2 style={{
                color: '#fff',
                fontSize: '28px',
                marginBottom: '20px',
                fontWeight: 'bold',
                pointerEvents: 'none'
              }}>
                Room Code
              </h2>
              {lobbyState?.roomCode ? (
                <div style={{ pointerEvents: 'none' }}>
                  <div style={{
                    color: '#4ecdc4',
                    fontSize: '48px',
                    fontWeight: 'bold',
                    letterSpacing: '8px',
                    marginBottom: '10px',
                    fontFamily: 'monospace',
                    textShadow: '0 0 10px rgba(78, 205, 196, 0.5)'
                  }}>
                    {lobbyState.roomCode}
                  </div>
                </div>
              ) : (
                <div style={{ pointerEvents: 'none' }}>
                  <div style={{
                    color: '#fff',
                    fontSize: '24px',
                    marginBottom: '20px'
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
              left: '1113px',
              top: '409px',
              width: '70px',
              height: '70px',
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
                left: '843px',
                top: '597px',
                width: '259px',
                height: '78px',
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
      
      <div
        onClick={onLeaveRoom}
        style={{
          position: 'absolute',
          left: '1106px',
          top: '150px',
          width: '146px',
          height: '70px',
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

      <div style={{
        position: 'absolute',
        left: '147px',
        top: '105px',
        width: '1160px',
        height: '619px',
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
        onClick={() => onSelectElement('penguin')}
        style={{
          position: 'absolute',
          left: '1372px',
          top: '121px',
          width: '222px',
          height: '211px',
          cursor: 'pointer',
          pointerEvents: 'auto'
        }}
      >
        <img 
          src="/elements/LobbyUI/penguin@4x.png" 
          alt="Penguin"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block'
          }}
        />
      </div>

      <div
        onClick={() => onSelectElement('whale')}
        style={{
          position: 'absolute',
          left: '1653px',
          top: '119px',
          width: '242px',
          height: '222px',
          cursor: 'pointer',
          pointerEvents: 'auto'
        }}
      >
        <img 
          src="/elements/LobbyUI/whale@4x.png" 
          alt="Whale"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block'
          }}
        />
      </div>

      <div
        onClick={() => onSelectElement('dog')}
        style={{
          position: 'absolute',
          left: '1650px',
          top: '383px',
          width: '221px',
          height: '229px',
          cursor: 'pointer',
          pointerEvents: 'auto'
        }}
      >
        <img 
          src="/elements/LobbyUI/dog@4x.png" 
          alt="Dog"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block'
          }}
        />
      </div>

      <div
        onClick={() => onSelectElement('duck')}
        style={{
          position: 'absolute',
          left: '1373px',
          top: '395px',
          width: '221px',
          height: '221px',
          cursor: 'pointer',
          pointerEvents: 'auto'
        }}
      >
        <img 
          src="/elements/LobbyUI/duck@4x.png" 
          alt="Duck"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block'
          }}
        />
      </div>
      
      {[290, 397, 505, 613].map((top, index) => {
        const player = lobbyState?.players?.[index];
        const currentPlayer = lobbyState?.players?.find(p => p.id === currentPlayerId);
        const isHost = currentPlayer?.isHost || false;
        // Only show kickbutton when: is host, has player in slot, and not yourself
        const canKick = isHost && player && player.id !== currentPlayerId;
        const hasPlayer = !!player;
        const isCurrentPlayer = player?.id === currentPlayerId;
        
        return (
          <Fragment key={`player-holder-wrapper-${index}`}>
            <div
              key={`player-holder-${index}`}
              style={{
                position: 'absolute',
                left: '374px',
                top: `${top}px`,
                width: '676px',
                height: '84px',
                pointerEvents: 'auto',
                opacity: hasPlayer ? 1 : 0.3,
                borderRadius: isCurrentPlayer ? '8px' : '0',
                boxShadow: 'none'
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
                penguin: { width: 72, height: 68 },
                whale: { width: 74, height: 67 },
                duck: { width: 71, height: 71 },
                dog: { width: 68, height: 70 }
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
                    top: 'calc(50% - 3px)',
                    left: '29px',
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
                fontSize: '40px',
                fontWeight: 'bold',
                fontFamily: "'Annie Use Your Telescope', cursive",
                textAlign: 'center',
                pointerEvents: 'none',
                zIndex: 10,
                textShadow: 'none',
                width: '100%'
              }}
            >
              {player ? player.name : ''}
            </div>
            {player && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(50% - 5px)',
                  right: '64px',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  zIndex: 10,
                  width: '142px',
                  height: '41px'
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
                      width: '86px'
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
            
            {canKick && player && (
              <div
                key={`kick-button-${index}`}
                onClick={() => {
                  if (window.confirm(`Are you sure you want to kick ${player.name}?`)) {
                    onKickPlayer(player.id);
                  }
                }}
                style={{
                  position: 'absolute',
                  left: '1070px', // 374 + 676 + 20 = 1070px (cạnh phải holder + 20px)
                  top: `calc(${top}px + 42px)`, // top + 42px (half of playerholder height 84px)
                  transform: 'translateY(-50%)', // Center theo chiều dọc với playerholder
                  width: '100px',
                  height: '45px',
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
            )}
          </Fragment>
        );
      })}

      {false && (
        <div
                      style={{
            position: 'absolute',
            left: '200px',
            top: '150px',
            width: '300px',
            height: '100px',
            background: '#ffffff',
            borderRadius: '8px',
            padding: '15px',
            display: 'flex',
            flexDirection: 'column',
                        gap: '10px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            pointerEvents: 'auto'
                      }}
                    >
                      <div style={{
            fontSize: '16px',
                        fontWeight: 'bold',
            color: '#000'
          }}>
            Room Information
                      </div>
                      <div style={{
                        fontSize: '14px',
            color: '#666'
          }}>
            Room ID: {lobbyState?.roomId?.substring(0, 8) || 'N/A'}
                      </div>
          {lobbyState?.roomCode && (
                      <div style={{
              fontSize: '18px',
                        fontWeight: 'bold',
              color: '#2196f3',
              letterSpacing: '3px'
            }}>
              Room Code: {lobbyState.roomCode}
            </div>
          )}
          {!lobbyState?.roomCode && (
            <div style={{
                        fontSize: '14px',
              color: '#999',
              fontStyle: 'italic'
            }}>
              Public Room
            </div>
          )}
                      </div>
      )}

      {false && lobbyState?.players && lobbyState.players.map((player, index) => {
        const elementNames: Record<Element, string> = {
          dog: 'Dog',
          duck: 'Duck',
          penguin: 'Penguin',
          whale: 'Whale'
        };
        
        return (
          <div
            key={player.id}
                              style={{
              position: 'absolute',
              left: `${200 + index * 300}px`, // Vị trí ngang, cách nhau 300px
              top: '300px', // Vị trí dọc
              width: '250px',
              height: '120px',
              background: '#ffffff',
              borderRadius: '8px',
              padding: '15px',
                                display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              pointerEvents: 'auto'
            }}
          >
                            <div style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {player.name}
              {player.isHost && (
                <span style={{
                  fontSize: '12px',
                  background: '#ffd700',
                  color: '#000',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>HOST</span>
              )}
            </div>

            <div style={{
              fontSize: '14px',
              color: player.isReady ? '#4caf50' : '#ff9800'
            }}>
              {player.isReady ? '✓ Ready' : '○ Not Ready'}
          </div>

            <div style={{
              fontSize: '14px',
              color: '#666'
            }}>
              Character: {player.element ? elementNames[player.element] : 'Not Selected'}
            </div>
          </div>
        );
      })}

      <div
        onClick={() => onSetReady(!isReady)}
                    style={{
          position: 'absolute',
          left: '1370px',
          top: '678px',
          width: '300px',
          height: '200px',
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

      {false && (
            <button
          onClick={onLeaveRoom}
              style={{
            position: 'absolute',
            left: '200px',
            top: '500px',
            padding: '12px 24px',
            background: '#ff6b6b',
                border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.2s',
            pointerEvents: 'auto'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#ff5252';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ff6b6b';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          Leave Room
              </button>
            )}
      
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
          left: '1705px',
          top: '678px',
          width: '174px',
          height: '198px',
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

      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        color: '#fff',
        fontSize: '14px',
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '10px',
        borderRadius: '5px',
        zIndex: 1000
      }}>
        <div>Lobby Active</div>
        <div>Players: {lobbyState?.players?.length || 0}/{lobbyState?.maxPlayers || 4}</div>
        {lobbyState?.roomCode && <div>Room Code: {lobbyState.roomCode}</div>}
        <div>Ready: {isReady ? 'Yes' : 'No'}</div>
        <div>Is Host: {lobbyState?.players?.find(p => p.id === currentPlayerId)?.isHost ? 'Yes' : 'No'}</div>
        <div>Current Player ID: {currentPlayerId}</div>
        {lobbyState?.players?.map((p, idx) => (
          <div key={idx}>
            Player {idx}: {p.name} (ID: {p.id.substring(0, 8)}...) 
            {p.id === currentPlayerId && ' [YOU]'}
            {p.isHost && ' [HOST]'}
          </div>
        ))}
      </div>
      </div>

      <Chat chatMessages={chatMessages} onSendMessage={onSendChat} />
    </div>
  );
}
