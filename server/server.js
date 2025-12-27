const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const { v4: uuidv4 } = require('uuid');
const RoomManager = require('./RoomManager');
const authRouter = require('./auth');
const connectDB = require('./database');

const PORT = process.env.PORT || 8080;

// Connect to MongoDB
connectDB();

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Trust proxy - Required for secure cookies behind reverse proxy (Nginx, load balancer, etc.)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Session configuration (must be before passport)
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'drawify-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  proxy: process.env.NODE_ENV === 'production',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain: process.env.API_DOMAIN || undefined
  }
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

// CORS for all routes
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5173'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Mount auth routes
app.use('/api/auth', authRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create WebSocket server
const wss = new WebSocket.Server({ server, perMessageDeflate: false });
const roomManager = new RoomManager();

// Get all active rooms (must be after roomManager initialization)
app.get('/api/rooms', (req, res) => {
  try {
    console.log('GET /api/rooms - Request received');
    const rooms = roomManager.getAllRooms();
    console.log(`GET /api/rooms - Found ${rooms.length} active rooms`);
    res.json({
      success: true,
      rooms: rooms
    });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch rooms',
      message: error.message 
    });
  }
});

// Map to track which room each player is in
const playerRoomMap = new Map(); // playerId -> roomId

// Start HTTP server (which also handles WebSocket)
server.listen(PORT, () => {
  console.log(`Multiplayer Game Server running on port ${PORT}`);
  console.log(`HTTP server: http://localhost:${PORT}`);
  console.log(`WebSocket server: ws://localhost:${PORT}`);
  
  // Check OAuth configuration
  const hasGoogle = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  
  console.log('\nOAuth Providers Status:');
  console.log(`  Google: ${hasGoogle ? '✓ Configured' : '✗ Not configured'}`);
  
  if (!hasGoogle) {
    console.log('\n⚠️  No OAuth providers configured. Please set up environment variables.');
    console.log('   See .env.example for required variables.');
  }
});

wss.on('connection', (ws) => {
    const playerId = uuidv4();
    ws.playerId = playerId;
    console.log(`New WebSocket connection: ${playerId}`);

    ws.on('message', (data) => {
        try {
            console.log(`Raw message received from ${playerId}:`, data.toString());
            const message = JSON.parse(data);
            console.log(`Parsed message from ${playerId}:`, message.type, message);
            handleClientMessage(playerId, ws, message);
        } catch (error) {
            console.error(`Error parsing message from ${playerId}:`, error, 'Raw data:', data.toString());
        }
    });

    ws.on('close', () => {
        handleDisconnect(playerId);
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for player ${playerId}:`, error);
    });
});

function handleClientMessage(playerId, ws, message) {
    console.log(`Received message from ${playerId}:`, message.type, message);
    switch (message.type) {
        case 'JOIN_PUBLIC':
            handleJoinPublic(playerId, ws, message);
            break;
        case 'JOIN_PRIVATE':
            handleJoinPrivate(playerId, ws, message);
            break;
        case 'CREATE_PRIVATE':
            handleCreatePrivate(playerId, ws, message);
            break;
        case 'CREATE_PUBLIC':
            handleCreatePublic(playerId, ws, message);
            break;
        case 'LOBBY_SET_READY':
            handleSetReady(playerId, ws, message);
            break;
        case 'LOBBY_SET_ELEMENT':
            handleLobbySetElement(playerId, ws, message);
            break;
        case 'LOBBY_CHAT':
            handleLobbyChat(playerId, ws, message);
            break;
        case 'KICK_PLAYER':
            handleKickPlayer(playerId, ws, message);
            break;
        case 'START_GAME':
            handleStartGame(playerId, ws);
            break;
        case 'MOVEMENT':
            handleMovement(playerId, ws, message);
            break;
        case 'CHAT_MESSAGE':
            handleChatMessage(playerId, ws, message);
            break;
    }
}

function handleJoinPublic(playerId, ws, message) {
    console.log(`Quick join requested by player ${playerId} (${message.name})`);
    const room = roomManager.findPublicRoom();
    
    if (!room) {
        console.log(`No public room available for quick join`);
        ws.send(JSON.stringify({
            type: 'JOIN_ERROR',
            error: 'NO_PUBLIC_ROOM_AVAILABLE'
        }));
        return;
    }
    
    console.log(`Found public room ${room.id} with ${room.players.size}/${roomManager.MAX_PLAYERS} players`);
    const result = roomManager.addPlayerToRoom(room.id, playerId, ws, message.name, null);
    
    if (result.error) {
        ws.send(JSON.stringify({
            type: 'JOIN_ERROR',
            error: result.error
        }));
        return;
    }

    playerRoomMap.set(playerId, room.id);
    const roomState = roomManager.getRoomLobbyState(room.id);
    
    // Include playerId in the response so client knows which player they are
    ws.send(JSON.stringify({
        type: 'LOBBY_JOINED',
        playerId: playerId,
        lobbyState: roomState
    }));

    // Notify other players
    roomManager.broadcastToRoom(room.id, {
        type: 'LOBBY_PLAYER_JOINED',
        player: {
            id: playerId,
            name: message.name,
            element: null,
            isReady: false,
            isHost: result.player.isHost
        }
    }, playerId);

    // Send updated lobby state to all
    broadcastLobbyState(room.id);
}

function handleJoinPrivate(playerId, ws, message) {
    const room = roomManager.findRoomByCode(message.roomCode);
    
    if (!room) {
        ws.send(JSON.stringify({
            type: 'JOIN_ERROR',
            error: 'ROOM_NOT_FOUND'
        }));
        return;
    }

    const result = roomManager.addPlayerToRoom(room.id, playerId, ws, message.name, null);
    
    if (result.error) {
        ws.send(JSON.stringify({
            type: 'JOIN_ERROR',
            error: result.error
        }));
        return;
    }

    playerRoomMap.set(playerId, room.id);
    const roomState = roomManager.getRoomLobbyState(room.id);
    
    ws.send(JSON.stringify({
        type: 'LOBBY_JOINED',
        playerId: playerId,
        lobbyState: roomState
    }));

    // Notify other players
    roomManager.broadcastToRoom(room.id, {
        type: 'LOBBY_PLAYER_JOINED',
        player: {
            id: playerId,
            name: message.name,
            element: null,
            isReady: false,
            isHost: result.player.isHost
        }
    }, playerId);

    // Send updated lobby state to all
    broadcastLobbyState(room.id);
}

function handleCreatePrivate(playerId, ws, message) {
    const room = roomManager.createRoom(true);
    const result = roomManager.addPlayerToRoom(room.id, playerId, ws, message.name, null);
    
    playerRoomMap.set(playerId, room.id);
    const roomState = roomManager.getRoomLobbyState(room.id);
    
    ws.send(JSON.stringify({
        type: 'LOBBY_JOINED',
        playerId: playerId,
        lobbyState: roomState
    }));
}

function handleCreatePublic(playerId, ws, message) {
    try {
        console.log(`Creating public room for player ${playerId} (${message.name})`);
        
        if (!message.name || message.name.trim() === '') {
            console.error('CREATE_PUBLIC: name is empty');
            ws.send(JSON.stringify({
                type: 'JOIN_ERROR',
                error: 'INVALID_NAME'
            }));
            return;
        }
        
        const room = roomManager.createRoom(false);
        console.log(`Room created: ${room.id}`);
        
        const result = roomManager.addPlayerToRoom(room.id, playerId, ws, message.name, null);
        
        if (result.error) {
            console.error(`Error creating public room: ${result.error}`);
            ws.send(JSON.stringify({
                type: 'JOIN_ERROR',
                error: result.error
            }));
            return;
        }

        playerRoomMap.set(playerId, room.id);
        const roomState = roomManager.getRoomLobbyState(room.id);
        
        console.log(`Public room created: ${room.id}, isPrivate: ${room.isPrivate}, roomCode: ${room.code}`);
        console.log(`Sending LOBBY_JOINED to player ${playerId}`);
        
        const response = {
            type: 'LOBBY_JOINED',
            playerId: playerId,
            lobbyState: roomState
        };
        console.log('LOBBY_JOINED response:', JSON.stringify(response, null, 2));
        
        if (ws.readyState === 1) { // WebSocket.OPEN
            ws.send(JSON.stringify(response));
            console.log('LOBBY_JOINED sent successfully');
        } else {
            console.error(`WebSocket not open, state: ${ws.readyState}`);
        }

        // Notify other players (if any)
        roomManager.broadcastToRoom(room.id, {
            type: 'LOBBY_PLAYER_JOINED',
            player: {
                id: playerId,
                name: message.name,
                element: null,
                isReady: false,
                isHost: result.player.isHost
            }
        }, playerId);

        // Send updated lobby state to all
        broadcastLobbyState(room.id);
    } catch (error) {
        console.error('Error in handleCreatePublic:', error);
        ws.send(JSON.stringify({
            type: 'JOIN_ERROR',
            error: 'SERVER_ERROR',
            message: error.message
        }));
    }
}

function handleSetReady(playerId, ws, message) {
    const roomId = playerRoomMap.get(playerId);
    if (!roomId) return;

    const success = roomManager.setPlayerReady(roomId, playerId, message.isReady);
    if (success) {
        broadcastLobbyState(roomId);
        // Game will only start when host clicks Start Game button
    }
}

function handleLobbySetElement(playerId, ws, message) {
    const roomId = playerRoomMap.get(playerId);
    if (!roomId) return;

    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const player = room.players.get(playerId);
    if (!player) return;

    // Check if element is available (check other players in lobby)
    const isElementTaken = Array.from(room.players.values()).some(
        p => p.playerId !== playerId && p.element === message.element && p.element !== null
    );

    if (isElementTaken) {
        ws.send(JSON.stringify({
            type: 'ELEMENT_SELECTION_ERROR',
            reason: 'ELEMENT_TAKEN'
        }));
        return;
    }

    player.element = message.element;
    broadcastLobbyState(roomId);
}

function handleLobbyChat(playerId, ws, message) {
    const roomId = playerRoomMap.get(playerId);
    if (!roomId) return;

    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const player = room.players.get(playerId);
    if (!player) return;

    roomManager.broadcastToRoom(roomId, {
        type: 'LOBBY_CHAT_MESSAGE',
        playerId: playerId,
        playerName: player.name,
        message: message.message,
        timestamp: Date.now()
    });
}

function handleKickPlayer(playerId, ws, message) {
    const roomId = playerRoomMap.get(playerId);
    if (!roomId) return;

    const result = roomManager.kickPlayer(roomId, playerId, message.targetPlayerId);
    
    if (result.success) {
        playerRoomMap.delete(message.targetPlayerId);
        broadcastLobbyState(roomId);
    } else {
        ws.send(JSON.stringify({
            type: 'KICK_ERROR',
            error: result.error
        }));
    }
}

function handleStartGame(playerId, ws) {
    const roomId = playerRoomMap.get(playerId);
    if (!roomId) {
        ws.send(JSON.stringify({
            type: 'GAME_START_ERROR',
            error: 'ROOM_NOT_FOUND',
            message: 'Room not found'
        }));
        return;
    }

    const room = roomManager.getRoom(roomId);
    if (!room) {
        ws.send(JSON.stringify({
            type: 'GAME_START_ERROR',
            error: 'ROOM_NOT_FOUND',
            message: 'Room not found'
        }));
        return;
    }

    const player = room.players.get(playerId);
    if (!player || !player.isHost) {
        ws.send(JSON.stringify({
            type: 'GAME_START_ERROR',
            error: 'NOT_HOST',
            message: 'Only the host can start the game'
        }));
        return;
    }

    // Check if all players have selected an element
    for (const [pid, playerData] of room.players.entries()) {
        if (!playerData.element) {
            ws.send(JSON.stringify({
                type: 'GAME_START_ERROR',
                error: 'ELEMENT_REQUIRED',
                message: 'All players must select a character before starting'
            }));
            return;
        }
    }

    // Check if all players are ready and at least 2 players
    if (!roomManager.areAllPlayersReady(roomId)) {
        ws.send(JSON.stringify({
            type: 'GAME_START_ERROR',
            error: 'NOT_ALL_READY',
            message: 'All players must be ready before starting'
        }));
        return;
    }

    if (roomManager.getPlayerCount(roomId) < 2) {
        ws.send(JSON.stringify({
            type: 'GAME_START_ERROR',
            error: 'NOT_ENOUGH_PLAYERS',
            message: 'At least 2 players are required to start the game'
        }));
        return;
    }

    startGame(roomId);
}

function startGame(roomId) {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    // Check that all players have selected an element
    for (const [playerId, playerData] of room.players.entries()) {
        if (!playerData.element) {
            // Notify player they need to select an element
            playerData.ws.send(JSON.stringify({
                type: 'GAME_START_ERROR',
                error: 'ELEMENT_REQUIRED',
                message: 'All players must select a character before starting'
            }));
            return;
        }
    }

    // Initialize all players in the game engine
    room.players.forEach((playerData, playerId) => {
        const player = room.gameEngine.addPlayer(playerId, playerData.ws, {
            name: playerData.name,
            element: playerData.element
        });

        const state = room.connectionStates.get(playerId);
        if (state) {
            state.initialized = true;
            state.isSpectator = false;
        }

        // Send INIT to each player
        playerData.ws.send(JSON.stringify({
            type: 'INIT',
            playerId: playerId,
            player: player,
            arena: room.gameEngine.arena
        }));
    });

    // Mark room as game started
    room.gameStarted = true;
    
    // Remove from public rooms list if it's a public room
    if (!room.isPrivate) {
        const index = roomManager.publicRooms.indexOf(roomId);
        if (index > -1) {
            roomManager.publicRooms.splice(index, 1);
        }
    }

    // Broadcast game started
    roomManager.broadcastToRoom(roomId, {
        type: 'GAME_STARTED'
    });

    // Start game loop for this room
    if (!room.gameLoopInterval) {
        let frameCount = 0;
        const FULL_STATE_INTERVAL = 60; // Send full state every 60 frames (~1 second)

        room.gameLoopInterval = setInterval(() => {
            const currentRoom = roomManager.getRoom(roomId);
            if (!currentRoom) return;

            currentRoom.gameEngine.update();
            frameCount++;

            // Send full state periodically for synchronization
            if (frameCount % FULL_STATE_INTERVAL === 0) {
                const gameState = currentRoom.gameEngine.getGameState();
                roomManager.broadcastToRoom(roomId, {
                    type: 'GAME_STATE_UPDATE',
                    gameState: gameState,
                    timestamp: Date.now()
                });
            } else {
                // Send delta updates
                if (currentRoom.gameEngine.hasChanges()) {
                    const delta = currentRoom.gameEngine.getStateDelta();
                    roomManager.broadcastToRoom(roomId, {
                        type: 'GAME_STATE_DELTA',
                        delta: delta,
                        timestamp: Date.now()
                    });
                }
            }
        }, 1000 / 60);
    }
}

function handleMovement(playerId, ws, message) {
    const roomId = playerRoomMap.get(playerId);
    if (!roomId) return;

    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const state = room.connectionStates.get(playerId);
    if (!state || !state.initialized) return;

    room.gameEngine.setPlayerDirection(playerId, message.direction);
}

function handleChatMessage(playerId, ws, message) {
    const roomId = playerRoomMap.get(playerId);
    if (!roomId) return;

    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const state = room.connectionStates.get(playerId);
    if (!state || !state.initialized) return;

    roomManager.broadcastToRoom(roomId, {
        type: 'CHAT_MESSAGE',
        playerId: playerId,
        message: message.message,
        timestamp: Date.now()
    });
}

function handleDisconnect(playerId) {
    const roomId = playerRoomMap.get(playerId);
    if (!roomId) return;

    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const player = room.players.get(playerId);
    if (player) {
        roomManager.removePlayerFromRoom(roomId, playerId);
        playerRoomMap.delete(playerId);
        
        roomManager.broadcastToRoom(roomId, {
            type: 'LOBBY_PLAYER_LEFT',
            playerId: playerId
        });
        
        broadcastLobbyState(roomId);
    }
}

function broadcastLobbyState(roomId) {
    const roomState = roomManager.getRoomLobbyState(roomId);
    if (!roomState) return;

    roomManager.broadcastToRoom(roomId, {
        type: 'LOBBY_STATE_UPDATE',
        lobbyState: roomState
    });
}

// Cleanup intervals on process exit
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    // Clean up all game loops
    roomManager.rooms.forEach((room) => {
        if (room.gameLoopInterval) {
            clearInterval(room.gameLoopInterval);
        }
    });
    process.exit();
});
