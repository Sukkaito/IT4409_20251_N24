import { useState, useEffect } from 'react';

interface Room {
  id: string;
  code: string;
  isPrivate: boolean;
  playerCount: number;
  maxPlayers: number;
  createdAt: number;
}

interface RoomListScreenProps {
  onBack: () => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
  playerName: string;
  isLoading: boolean;
}

export function RoomListScreen({
  onBack,
  onJoinRoom,
  playerName,
  isLoading
}: RoomListScreenProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [error, setError] = useState('');

  const fetchRooms = async () => {
    setIsLoadingRooms(true);
    setError('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      console.log('Fetching rooms from:', `${apiUrl}/api/rooms`);
      
      const response = await fetch(`${apiUrl}/api/rooms`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      console.log('Rooms response status:', response.status);

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Rooms data:', data);
      
      if (data.success) {
        data.rooms = data.rooms || [];
        data.rooms = data.rooms.filter((room: Room) => {
          return room.isPrivate === false;
        });
        setRooms(data.rooms);
      } else {
        setError(data.error || 'Failed to load rooms');
      }
    } catch (err: any) {
      console.error('Error fetching rooms:', err);
      const errorMessage = err.message || 'Failed to connect to server. Please check if the server is running.';
      setError(errorMessage);
    } finally {
      setIsLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    // Refresh rooms every 3 seconds
    const interval = setInterval(fetchRooms, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleJoinRoom = (roomCode: string) => {
    if (!playerName.trim()) {
      setError('Please enter your name first');
      return;
    }
    onJoinRoom(roomCode, playerName.trim());
  };

  return (
    <div className="drawify-login-screen">
      <div className="login-background"></div>
      
      <div className="login-header">
        <div className="logo-container">
          <img src="/elements/MainMenuUI/Logo@4x.png" alt="Logo" className="logo-image" />
        </div>
      </div>

      <div className="login-panels" style={{ maxWidth: '800px' }}>
        <div className="panel guest-panel" style={{ width: '100%' }}>
          <div className="panel-header">
            <h2 className="panel-title">Active Rooms</h2>
            <button
              onClick={onBack}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: '#fff',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '14px',
                marginLeft: 'auto'
              }}
            >
              Back
            </button>
          </div>
          <div className="panel-content">
            {error && (
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
                {error}
              </div>
            )}

            {isLoadingRooms ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: 'rgba(255, 255, 255, 0.7)'
              }}>
                Loading rooms...
              </div>
            ) : rooms.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: 'rgba(255, 255, 255, 0.7)'
              }}>
                No active rooms available
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                      e.currentTarget.style.borderColor = 'rgba(78, 205, 196, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '8px'
                      }}>
                        <span style={{
                          color: '#fff',
                          fontSize: '18px',
                          fontWeight: 'bold',
                          fontFamily: 'monospace',
                          letterSpacing: '2px'
                        }}>
                          {room.code}
                        </span>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          backgroundColor: room.isPrivate 
                            ? 'rgba(255, 107, 107, 0.2)' 
                            : 'rgba(78, 205, 196, 0.2)',
                          color: room.isPrivate ? '#ff6b6b' : '#4ECDC4',
                          border: `1px solid ${room.isPrivate ? '#ff6b6b' : '#4ECDC4'}`
                        }}>
                          {room.isPrivate ? 'Private' : 'Public'}
                        </span>
                      </div>
                      <div style={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '14px'
                      }}>
                        Players: {room.playerCount} / {room.maxPlayers}
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoinRoom(room.code)}
                      disabled={isLoading || room.playerCount >= room.maxPlayers || !playerName.trim()}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: room.playerCount >= room.maxPlayers 
                          ? 'rgba(255, 255, 255, 0.1)' 
                          : '#4ECDC4',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: (isLoading || room.playerCount >= room.maxPlayers || !playerName.trim()) 
                          ? 'not-allowed' 
                          : 'pointer',
                        opacity: (isLoading || room.playerCount >= room.maxPlayers || !playerName.trim()) 
                          ? 0.5 
                          : 1,
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={(e) => {
                        if (!isLoading && room.playerCount < room.maxPlayers && playerName.trim()) {
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      {room.playerCount >= room.maxPlayers ? 'Full' : 'Join'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{
              marginTop: '20px',
              paddingTop: '20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              textAlign: 'center'
            }}>
              <button
                onClick={fetchRooms}
                disabled={isLoadingRooms}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '14px',
                  cursor: isLoadingRooms ? 'not-allowed' : 'pointer',
                  opacity: isLoadingRooms ? 0.5 : 1
                }}
              >
                {isLoadingRooms ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

