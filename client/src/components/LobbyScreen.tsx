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
