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
