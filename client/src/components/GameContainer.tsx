import { useEffect } from 'react';
import { GameState, TimerSync } from '../types';
import { Chat } from './Chat';
import { Scoreboard } from './Scoreboard';
import { TimerOverlay } from './TimerOverlay';

interface GameContainerProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  gameState: GameState;
  playerId: string | null;
  isSpectator: boolean;
  timerSync: TimerSync | null;
  chatMessages: Array<{ type: 'player' | 'system'; content: string }>;
  onSendChatMessage: (message: string) => void;
  onLeaveGame?: () => void;
}

export function GameContainer({
  canvasRef,
  gameState,
  playerId,
  isSpectator,
  timerSync,
  chatMessages,
  onSendChatMessage,
  onLeaveGame
}: GameContainerProps) {
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = 1440;
        canvasRef.current.height = 810;
      }
    };

    updateCanvasSize();
    
    // Update on window resize
    window.addEventListener('resize', updateCanvasSize);
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [canvasRef]);

  return (
    <div id="gameContainer" style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div className="game-background"></div>
      
      <TimerOverlay gameState={gameState} timerSync={timerSync} />
      <Scoreboard gameState={gameState} playerId={playerId} />
      
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        display: 'flex',
        gap: '12px',
        zIndex: 1000
      }}>
        <button
          onClick={() => {
            // Settings button - placeholder for now, will be implemented later
            // TODO: Add settings functionality
            console.log('Settings clicked - functionality to be added');
          }}
          style={{
            padding: '12px 24px',
            background: 'rgba(0, 0, 0, 0.75)',
            border: '2px solid rgba(255, 255, 255, 0.4)',
            borderRadius: '10px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.75)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
          }}
        >
          <span style={{ fontSize: '20px' }}>⚙️</span>
          <span>Settings</span>
        </button>
        <button
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
            padding: '12px 24px',
            background: 'rgba(255, 77, 77, 0.85)',
            border: '2px solid rgba(255, 255, 255, 0.4)',
            borderRadius: '10px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(255, 77, 77, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 77, 77, 1)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 77, 77, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 77, 77, 0.85)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 77, 77, 0.3)';
          }}
        >
          <span style={{ fontSize: '20px' }}>🚪</span>
          <span>Exit</span>
        </button>
      </div>
      
      <canvas
        ref={canvasRef}
        id="gameCanvas"
        width={1440}
        height={810}
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'block',
          maxWidth: '100%',
          height: 'auto'
        }}
      />
      <Chat chatMessages={chatMessages} onSendMessage={onSendChatMessage} />
    </div>
  );
}

