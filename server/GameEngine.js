class GameEngine {
    constructor() {
        this.players = new Map();
        this.spectators = new Map(); // spectatorId -> { id, name }
        this.cellSize = 48;
        this.playerSize = 48;
        // Calculate arena size to be exactly divisible by cellSize for all 4 edges
        // Target: approximately 2880x1800 (90% of original 3200x2000), but adjusted to be divisible by cellSize
        const targetCols = Math.floor(2880 / this.cellSize);
        const targetRows = Math.floor(1800 / this.cellSize);
        this.cols = targetCols;
        this.rows = targetRows;
        this.arena = { width: this.cols * this.cellSize, height: this.rows * this.cellSize };
        this.respawnDelay = 2000;
        this.elements = ['dog', 'duck', 'penguin', 'whale'];
        this.elementColors = {
            dog: '#8B4513',
            duck: '#FFD700',
            penguin: '#000000',
            whale: '#4682B4'
        };
        this.oppositeDirections = {
            UP: 'DOWN',
            DOWN: 'UP',
            LEFT: 'RIGHT',
            RIGHT: 'LEFT'
        };
        // Match duration: 10 seconds
        this.matchDuration = 10 * 1000; // 10 seconds in ms
        this.matchStartTime = null;
        this.gameState = {
            players: {},
            cells: this.createEmptyGrid(),
            trails: {}, // Trails overlay - Key: "row:col", Value: {ownerId, color}
            gameTime: 0,
            timeRemaining: this.matchDuration,
            gameOver: false,
            winnerId: null,
            winnerName: null
        };
        this.lastUpdateTime = Date.now();
        this.previousPlayerStates = {}; // Track previous player states for delta
        this.previousGameState = null; // Track previous gameState for trail comparison
        this.changedCells = new Set(); // Track changed cells
    }

    createEmptyGrid() {
        return Array.from({ length: this.rows }, () =>
            Array.from({ length: this.cols }, () => null)
        );
    }

    addPlayer(playerId, ws, config = {}) {
        const spawn = this.getRandomSpawn(1);
        const preferredElement = config.element;
        const element = this.selectElementForNewPlayer(preferredElement, playerId);
        
        const playerName = config.name ? this.sanitizeName(config.name, playerId) : this.generateDefaultName(playerId);
        const player = {
            id: playerId,
            name: playerName,
            element: element,
            color: this.elementColors[element],
            area: 0,
            col: spawn.col,
            row: spawn.row,
            x: spawn.x,
            y: spawn.y,
            direction: 'NONE',
            // Higher moveInterval -> slower movement between cells
            // 208 -> 188 (~10% faster movement)
            moveInterval: 188,
            moveProgress: 0,
            isMoving: false,
            fromX: spawn.x,
            fromY: spawn.y,
            targetX: spawn.x,
            targetY: spawn.y,
            targetCol: spawn.col,
            targetRow: spawn.row,
            isOutside: false,
            trail: new Set(),
            isRespawning: false,
            respawnTimeout: null,
            ws
        };

        const wasEmpty = this.players.size === 0;
        this.players.set(playerId, player);
        this.createSafeZone(player, 1);
        this.updatePlayerSnapshot(playerId);
        if (wasEmpty) {
            this.startMatchTimer();
        }

        return this.getPlayerSnapshot(playerId);
    }

    removePlayer(playerId) {
        this.clearTerritory(playerId);
        const player = this.players.get(playerId);
        if (player && player.respawnTimeout) {
            clearTimeout(player.respawnTimeout);
        }
        this.players.delete(playerId);
        delete this.gameState.players[playerId];
        if (this.players.size === 0) {
            this.resetMatchTimerState();
        }
    }

    addSpectator(spectatorId, name) {
        this.spectators.set(spectatorId, {
            id: spectatorId,
            name: name
        });
    }

    removeSpectator(spectatorId) {
        this.spectators.delete(spectatorId);
    }

    getPlayerCount() {
        return this.players.size;
    }

    setPlayerDirection(playerId, direction) {
        if (this.gameState.gameOver) return;
        const player = this.players.get(playerId);
        if (!player) return;
        const normalizedDirection = direction || 'NONE';

        if (this.isOppositeDirection(normalizedDirection, player.direction)) {
            return;
        }

        player.direction = normalizedDirection;
        // If the player is currently stationary, start moving immediately.
        // If already moving, let the current step finish and the new direction
        // will be picked up automatically by movePlayers() on the next cell.
        if (!player.isMoving) {
            this.tryStartMove(player);
        }
    }

    claimCell(player) {
        const col = player.col;
        const row = player.row;

        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;

        const currentOwner = this.gameState.cells[row][col];
        const trailKey = this.getCellKey(row, col);
        const existingTrail = this.gameState.trails[trailKey];
        
        console.log(`[claimCell] Player ${player.id} at [${row},${col}], currentOwner:`, currentOwner ? `${currentOwner.ownerId}` : 'null', `trail:`, existingTrail ? `${existingTrail.ownerId}` : 'none');

        // Check if hitting own trail (from trails overlay)
        if (existingTrail && existingTrail.ownerId === player.id) {
            console.log(`[claimCell] Player ${player.id} hit own trail at [${row},${col}]`);
            this.resetPlayer(player.id);
            return;
        }

        // Check if hitting another player's trail
        if (existingTrail && existingTrail.ownerId !== player.id) {
            console.log(`[claimCell] Player ${player.id} hit ${existingTrail.ownerId}'s trail at [${row},${col}]`);
            this.handleTrailHit(existingTrail.ownerId, player.id, row, col);
            // Don't return here - continue to claim the cell after knocking the victim
            // The victim's trail will be removed by resetPlayer, so we can claim this cell
            // Re-check the trail state after handleTrailHit (it has been cleared)
            // Update existingTrail to reflect the current state (trail is now gone)
            const trailAfterHit = this.gameState.trails[trailKey];
            // Trail should be gone now, so we can proceed to add our own trail
        }

        // Check if hitting own territory (completed)
        if (currentOwner && currentOwner.ownerId === player.id && !currentOwner.isTrail) {
            this.completePlayerTrail(player);
            this.fillCapturedAreas(player.id);
            return;
        }

        const isTrail = !currentOwner || currentOwner.ownerId !== player.id;
        
        if (isTrail) {
            // Check self collision BEFORE adding trail
            // Check if this position already has a trail (from previous moves)
            const key = this.getCellKey(row, col);
            const alreadyHasTrail = player.trail.has(key) || 
                                   (this.gameState.trails[key] && this.gameState.trails[key].ownerId === player.id);
            
            if (alreadyHasTrail) {
                // Player hit their own trail - reset
                console.log(`[claimCell] Player ${player.id} hit own trail at [${row},${col}] - self collision detected`);
                this.resetPlayer(player.id);
                return;
            }
            
            // Add to trails overlay instead of modifying cells
            // IMPORTANT: Do NOT modify cells when drawing trail - trail is just an overlay
            // If trail is drawn over another player's territory, that territory remains untouched
            this.gameState.trails[trailKey] = {
                ownerId: player.id,
                color: player.color
            };
            this.changedCells.add(`${row}:${col}`); // Track change for trail rendering
            
            // Log if drawing over another player's territory
            if (currentOwner && currentOwner.ownerId !== player.id) {
                console.log(`[claimCell] Trail overlay: Player ${player.id} drawing trail over ${currentOwner.ownerId}'s territory at [${row},${col}] - territory remains untouched`);
            }
            
            player.isOutside = true;
            player.trail.add(trailKey);
        } else {
            // Only reach here if currentOwner.ownerId === player.id (claiming own territory)
            // Claiming own territory - convert to owned cell
            const cellData = {
                ownerId: player.id,
                color: player.color,
                isTrail: false
            };
            this.gameState.cells[row][col] = cellData;
            this.changedCells.add(`${row}:${col}`);
            player.area += 1;
        }
        
        this.updatePlayerSnapshot(player.id);
    }

    clearTerritory(playerId) {
        let clearedSafe = 0;
        
        console.log(`[clearTerritory] Starting clearTerritory for player ${playerId}`);
        
        // Clear owned cells (territory only - trails are in overlay)
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = this.gameState.cells[row][col];
                if (cell && cell.ownerId === playerId && !cell.isTrail) {
                    clearedSafe += 1;
                    this.gameState.cells[row][col] = null;
                    this.changedCells.add(`${row}:${col}`);
                }
            }
        }
        
        // Remove all trails of this player from overlay (simple - just delete from trails object)
        // IMPORTANT: Only remove trails overlay, do NOT touch cells underneath
        // If trail was drawn over another player's territory, that territory remains untouched
        const trailsToRemove = [];
        for (const [key, trail] of Object.entries(this.gameState.trails)) {
            if (trail.ownerId === playerId) {
                trailsToRemove.push(key);
                
                // Log if trail was over another player's territory
                const [row, col] = key.split(':').map(Number);
                const cell = this.gameState.cells[row] && this.gameState.cells[row][col];
                if (cell && cell.ownerId !== playerId) {
                    console.log(`[clearTerritory] Removing trail overlay at [${row},${col}] - territory of player ${cell.ownerId} remains untouched`);
                }
            }
        }
        
        for (const key of trailsToRemove) {
            delete this.gameState.trails[key];
            const [row, col] = key.split(':').map(Number);
            this.changedCells.add(`${row}:${col}`);
        }
        
        console.log(`[clearTerritory] Cleared ${clearedSafe} territory cells and ${trailsToRemove.length} trail cells for player ${playerId}`);

        const player = this.players.get(playerId);
        if (player) {
            player.area = Math.max(0, player.area - clearedSafe);
            player.trail.clear();
            player.isOutside = false;
            this.updatePlayerSnapshot(playerId);
        }
    }

    update() {
        const now = Date.now();
        const deltaTime = now - this.lastUpdateTime;
        this.lastUpdateTime = now;

        this.gameState.gameTime += deltaTime;
        this.updateMatchTimer();
        if (this.gameState.gameOver) {
            return;
        }
        this.movePlayers(deltaTime);
    }

    movePlayers(deltaTime) {
        this.players.forEach(player => {
            if (player.isRespawning) {
                return;
            }

            // Check if player has no territory (area = 0) - auto respawn
            if (player.area <= 0) {
                console.log(`[movePlayers] Player ${player.id} has no territory (area = ${player.area}), auto respawning`);
                this.resetPlayer(player.id);
                return;
            }

            if (!player.isMoving) {
                this.tryStartMove(player);
            }

            if (!player.isMoving) {
                this.updatePlayerSnapshot(player.id);
                return;
            }

            player.moveProgress += deltaTime / player.moveInterval;

            while (player.moveProgress >= 1) {
                player.moveProgress -= 1;
                this.finishMove(player);
                if (!this.tryStartMove(player)) {
                    player.moveProgress = 0;
                    break;
                }
            }

            if (player.isMoving) {
                // Smooth movement between cells using linear interpolation
                // Keep exact float positions here; rendering will handle pixel rounding
                player.x = this.lerp(player.fromX, player.targetX, player.moveProgress);
                player.y = this.lerp(player.fromY, player.targetY, player.moveProgress);
            }

            this.updatePlayerSnapshot(player.id);
        });
    }

    getDirectionDelta(direction) {
        switch (direction) {
            case 'UP': return { x: 0, y: -1 };
            case 'DOWN': return { x: 0, y: 1 };
            case 'LEFT': return { x: -1, y: 0 };
            case 'RIGHT': return { x: 1, y: 0 };
            default: return null;
        }
    }

    getAlignedPosition(col, row) {
        // Since playerSize equals cellSize, no padding needed - align directly to grid
        // Round to ensure perfect integer alignment
        return {
            x: Math.round(col * this.cellSize),
            y: Math.round(row * this.cellSize)
        };
    }

    getRandomSpawn(radius = 1) {
        const attempts = 50;
        for (let i = 0; i < attempts; i++) {
            const col = this.getRandomCoordinate(this.cols, radius);
            const row = this.getRandomCoordinate(this.rows, radius);
            if (this.isZoneAvailable(col, row, radius)) {
                return { col, row, ...this.getAlignedPosition(col, row) };
            }
        }
        const fallbackCol = this.getRandomCoordinate(this.cols, radius);
        const fallbackRow = this.getRandomCoordinate(this.rows, radius);
        return { col: fallbackCol, row: fallbackRow, ...this.getAlignedPosition(fallbackCol, fallbackRow) };
    }

    getRandomCoordinate(max, radius) {
        const min = radius;
        const limit = Math.max(radius, max - radius - 1);
        return Math.floor(Math.random() * (limit - min + 1)) + min;
    }

    isZoneAvailable(centerCol, centerRow, radius) {
        for (let row = centerRow - radius; row <= centerRow + radius; row++) {
            if (row < 0 || row >= this.rows) continue;
            for (let col = centerCol - radius; col <= centerCol + radius; col++) {
                if (col < 0 || col >= this.cols) continue;
                if (this.gameState.cells[row][col]) {
                    return false;
                }
            }
        }
        return true;
    }

    fillCapturedAreas(playerId) {
        const player = this.players.get(playerId);
        if (!player) return;

        const visited = Array.from({ length: this.rows }, () =>
            Array(this.cols).fill(false)
        );
        const queue = [];

        const enqueueIfOpen = (row, col) => {
            if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
            if (visited[row][col]) return;
            if (this.isPlayerCell(row, col, playerId)) return;
            visited[row][col] = true;
            queue.push({ row, col });
        };

        for (let col = 0; col < this.cols; col++) {
            enqueueIfOpen(0, col);
            enqueueIfOpen(this.rows - 1, col);
        }
        for (let row = 0; row < this.rows; row++) {
            enqueueIfOpen(row, 0);
            enqueueIfOpen(row, this.cols - 1);
        }

        while (queue.length > 0) {
            const { row, col } = queue.shift();
            enqueueIfOpen(row - 1, col);
            enqueueIfOpen(row + 1, col);
            enqueueIfOpen(row, col - 1);
            enqueueIfOpen(row, col + 1);
        }

        let captured = 0;
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (visited[row][col]) continue;

                const cell = this.gameState.cells[row] && this.gameState.cells[row][col];
                if (cell && cell.ownerId === playerId) continue;

                // Claim the cell - even if it belongs to another player
                // If cell belongs to another player, decrement their area
                if (cell && cell.ownerId !== playerId) {
                    this.decrementOwnerArea(cell.ownerId);
                }
                
                // Claim the cell (whether empty or belongs to another player)
                this.gameState.cells[row][col] = {
                    ownerId: playerId,
                    color: player.color
                };
                this.changedCells.add(`${row}:${col}`); // Track cell change
                captured += 1;
            }
        }

        if (captured > 0) {
            player.area += captured;
            this.updatePlayerSnapshot(playerId);
        }
    }

    isPlayerCell(row, col, playerId) {
        const cell = this.gameState.cells[row][col];
        return cell && cell.ownerId === playerId;
    }

    getRandomColor() {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    handleTrailHit(victimId, attackerId, row, col) {
        const victim = this.players.get(victimId);
        if (!victim) return;

        // Check trails overlay instead of cells
        const trailKey = this.getCellKey(row, col);
        const trail = this.gameState.trails[trailKey];
        if (!trail || trail.ownerId !== victimId) {
            return;
        }

        // Player hit another player's trail - victim dies
        console.log(`[handleTrailHit] Player ${attackerId} hit ${victimId}'s trail at [${row},${col}]`);
        this.resetPlayer(victimId);
    }

    tryStartMove(player) {
        if (player.direction === 'NONE') return false;
        const delta = this.getDirectionDelta(player.direction);
        if (!delta) return false;

        const newCol = player.col + delta.x;
        const newRow = player.row + delta.y;

        if (newCol < 0 || newCol >= this.cols || newRow < 0 || newRow >= this.rows) {
            player.direction = 'NONE';
            return false;
        }

        const alignedCurrent = this.getAlignedPosition(player.col, player.row);
        const alignedTarget = this.getAlignedPosition(newCol, newRow);

        player.fromX = alignedCurrent.x;
        player.fromY = alignedCurrent.y;
        player.targetX = alignedTarget.x;
        player.targetY = alignedTarget.y;
        player.targetCol = newCol;
        player.targetRow = newRow;
        player.isMoving = true;
        player.moveProgress = 0;
        return true;
    }

    finishMove(player) {
        player.col = player.targetCol;
        player.row = player.targetRow;
        // Ensure player position is exactly aligned with grid (col * cellSize)
        player.x = player.targetCol * this.cellSize;
        player.y = player.targetRow * this.cellSize;
        player.isMoving = false;
        this.claimCell(player);
    }

    lerp(a, b, t) {
        return a + (b - a) * Math.min(Math.max(t, 0), 1);
    }

    resetPlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player) {
            console.log(`[resetPlayer] Player ${playerId} not found`);
            return;
        }

        console.log(`[resetPlayer] Resetting player ${playerId}`);
        this.clearTerritory(playerId);

        delete this.gameState.players[playerId];

        player.direction = 'NONE';
        player.isMoving = false;
        player.moveProgress = 0;
        player.trail.clear();
        player.isOutside = false;
        player.area = 0;
        player.isRespawning = true;

        if (player.respawnTimeout) {
            clearTimeout(player.respawnTimeout);
        }

        player.respawnTimeout = setTimeout(() => {
            this.finishRespawn(playerId);
        }, this.respawnDelay);
    }

    finishRespawn(playerId) {
        const player = this.players.get(playerId);
        if (!player) return;

        const spawn = this.getRandomSpawn(1);
        player.col = spawn.col;
        player.row = spawn.row;
        // Ensure spawn position is exactly aligned with grid (col * cellSize)
        player.x = spawn.col * this.cellSize;
        player.y = spawn.row * this.cellSize;
        player.direction = 'NONE';
        player.isMoving = false;
        player.moveProgress = 0;
        player.fromX = spawn.x;
        player.fromY = spawn.y;
        player.targetX = spawn.x;
        player.targetY = spawn.y;
        player.targetCol = spawn.col;
        player.targetRow = spawn.row;
        player.trail.clear();
        player.isOutside = false;
        player.area = 0;
        player.isRespawning = false;
        player.respawnTimeout = null;

        this.createSafeZone(player, 1);
    }

    completePlayerTrail(player) {
        if (!player.trail.size) {
            player.isOutside = false;
            return;
        }

        let promoted = 0;

        player.trail.forEach(key => {
            const { row, col } = this.parseCellKey(key);
            
            // Remove from trails overlay
            if (this.gameState.trails[key]) {
                delete this.gameState.trails[key];
            }
            
            // Claim the cell - even if it belongs to another player
            const currentCell = this.gameState.cells[row] && this.gameState.cells[row][col];
            
            // If cell belongs to another player, decrement their area
            if (currentCell && currentCell.ownerId !== player.id) {
                this.decrementOwnerArea(currentCell.ownerId);
            }
            
            // Claim the cell (whether empty or belongs to another player)
            const cellData = {
                ownerId: player.id,
                color: player.color,
                isTrail: false
            };
            this.gameState.cells[row][col] = cellData;
            this.changedCells.add(`${row}:${col}`);
            promoted += 1;
        });

        if (promoted > 0) {
            player.area += promoted;
        }

        player.trail.clear();
        player.isOutside = false;
    }

    decrementOwnerArea(ownerId) {
        const owner = this.players.get(ownerId);
        if (owner && owner.area > 0) {
            owner.area -= 1;
            this.updatePlayerSnapshot(ownerId);
        }
    }

    getCellKey(row, col) {
        return `${row}:${col}`;
    }

    parseCellKey(key) {
        const [row, col] = key.split(':').map(Number);
        return { row, col };
    }

    isSelfTrailCollision(player, row, col) {
        const key = this.getCellKey(row, col);
        // Check both player.trail Set and trails overlay
        return player.trail.has(key) || 
               (this.gameState.trails[key] && this.gameState.trails[key].ownerId === player.id);
    }

    createSafeZone(player, radius = 1) {
        player.isOutside = false;
        player.trail.clear();

        for (let row = player.row - radius; row <= player.row + radius; row++) {
            if (row < 0 || row >= this.rows) continue;

            for (let col = player.col - radius; col <= player.col + radius; col++) {
                if (col < 0 || col >= this.cols) continue;

                const cell = this.gameState.cells[row][col];
                if (cell && cell.ownerId === player.id && !cell.isTrail) {
                    continue;
                }

                if (cell && cell.ownerId !== player.id) {
                    this.decrementOwnerArea(cell.ownerId);
                }

                const isNewCell = !cell || cell.ownerId !== player.id;
                this.gameState.cells[row][col] = {
                    ownerId: player.id,
                    color: player.color,
                    isTrail: false
                };
                this.changedCells.add(`${row}:${col}`); // Track cell change

                if (isNewCell) {
                    player.area += 1;
                }
            }
        }

        this.updatePlayerSnapshot(player.id);
    }

    getPlayerSnapshot(playerId) {
        const player = this.players.get(playerId);
        if (!player) return null;

        return {
            id: player.id,
            name: player.name,
            x: player.x,
            y: player.y,
            direction: player.direction,
            color: player.color,
            area: player.area,
            element: player.element
        };
    }

    updatePlayerSnapshot(playerId) {
        const snapshot = this.getPlayerSnapshot(playerId);
        if (snapshot) {
            this.gameState.players[playerId] = snapshot;
        }
    }

    getGameState() {
        return this.gameState;
    }

    setPlayerName(playerId, rawName) {
        const player = this.players.get(playerId);
        if (!player) return;
        const sanitized = this.sanitizeName(rawName, playerId);
        player.name = sanitized;
        this.updatePlayerSnapshot(playerId);
        return sanitized;
    }

    setPlayerElement(playerId, element) {
        if (!this.elements.includes(element)) {
            return { success: false, reason: 'INVALID_ELEMENT' };
        }
        const player = this.players.get(playerId);
        if (!player) {
            return { success: false, reason: 'PLAYER_NOT_FOUND' };
        }
        if (player.element === element) {
            return {
                success: true,
                element: player.element,
                color: player.color
            };
        }

        if (!this.isElementAvailable(element, playerId)) {
            return { success: false, reason: 'ELEMENT_TAKEN' };
        }

        player.element = element;
        player.color = this.elementColors[element] || player.color;
        this.applyPlayerColorToCells(playerId, player.color);
        this.updatePlayerSnapshot(playerId);
        return {
            success: true,
            element: player.element,
            color: player.color
        };
    }

    applyPlayerColorToCells(playerId, color) {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = this.gameState.cells[row][col];
                if (cell && cell.ownerId === playerId) {
                    cell.color = color;
                }
            }
        }
    }

    selectElementForNewPlayer(preferredElement, playerId) {
        if (preferredElement && this.isElementAvailable(preferredElement, playerId)) {
            return preferredElement;
        }
        const available = this.elements.find(el => this.isElementAvailable(el, playerId));
        return available || this.elements[0];
    }

    isElementAvailable(element, excludePlayerId = null) {
        if (!this.elements.includes(element)) return false;
        for (const player of this.players.values()) {
            if (player.element === element && player.id !== excludePlayerId) {
                return false;
            }
        }
        return true;
    }

    getElementAvailability() {
        const availability = {};
        this.elements.forEach(element => {
            availability[element] = this.isElementAvailable(element);
        });
        return availability;
    }

    isOppositeDirection(dirA, dirB) {
        if (!dirA || !dirB) return false;
        if (dirA === 'NONE' || dirB === 'NONE') return false;
        return this.oppositeDirections[dirA] === dirB || this.oppositeDirections[dirB] === dirA;
    }

    sanitizeName(name, playerId) {
        const fallback = this.generateDefaultName(playerId);
        if (!name) return fallback;
        const trimmed = name.trim().substring(0, 9);
        const cleaned = trimmed.replace(/[<>]/g, '').replace(/[^\p{L}\p{N}\s_\-]/gu, '');
        return cleaned || fallback;
    }

    generateDefaultName(playerId) {
        return `Player${playerId.slice(0, 4)}`;
    }

    updateMatchTimer() {
        if (this.gameState.gameOver) {
            this.gameState.timeRemaining = 0;
            return;
        }
        if (!this.matchStartTime) {
            // Timer not started yet – show full duration
            this.gameState.timeRemaining = this.matchDuration;
            return;
        }
        const elapsed = Date.now() - this.matchStartTime;
        const remaining = Math.max(0, this.matchDuration - elapsed);
        this.gameState.timeRemaining = remaining;

        if (remaining <= 0) {
            this.endMatch();
        }
    }

    endMatch() {
        if (this.gameState.gameOver) return;
        this.gameState.gameOver = true;
        const winner = this.determineWinner();
        this.gameState.winnerId = winner ? winner.id : null;
        this.gameState.winnerName = winner ? winner.name : null;

        this.players.forEach(player => {
            player.direction = 'NONE';
            player.isMoving = false;
            player.moveProgress = 0;
            this.updatePlayerSnapshot(player.id);
        });
    }

    determineWinner() {
        let winner = null;
        this.players.forEach(player => {
            if (!winner || (player.area || 0) > (winner.area || 0)) {
                winner = player;
            }
        });
        return winner;
    }

    startMatchTimer() {
        this.matchStartTime = Date.now();
        this.gameState.timeRemaining = this.matchDuration;
        this.gameState.gameOver = false;
        this.gameState.winnerId = null;
        this.gameState.winnerName = null;
    }

    resetMatchTimerState() {
        this.matchStartTime = null;
        this.gameState.timeRemaining = this.matchDuration;
        this.gameState.gameOver = false;
        this.gameState.winnerId = null;
        this.gameState.winnerName = null;
    }

    getStateDelta() {
        const delta = {
            players: {},
            cells: [],
            trails: {}, // Add trails to delta
            gameTime: this.gameState.gameTime,
            timeRemaining: this.gameState.timeRemaining,
            gameOver: this.gameState.gameOver,
            winnerId: this.gameState.winnerId,
            winnerName: this.gameState.winnerName
        };

        // Check for changed players
        for (const playerId in this.gameState.players) {
            const currentPlayer = this.gameState.players[playerId];
            const previousPlayer = this.previousPlayerStates[playerId];

            if (!previousPlayer ||
                currentPlayer.x !== previousPlayer.x ||
                currentPlayer.y !== previousPlayer.y ||
                currentPlayer.direction !== previousPlayer.direction ||
                currentPlayer.area !== previousPlayer.area) {
                delta.players[playerId] = currentPlayer;
            }
        }

        // Check for removed players
        for (const playerId in this.previousPlayerStates) {
            if (!this.gameState.players[playerId]) {
                delta.players[playerId] = null; // Mark as removed
            }
        }

        // Get changed cells and trails
        this.changedCells.forEach(cellKey => {
            const [row, col] = cellKey.split(':').map(Number);
            const cell = this.gameState.cells[row]?.[col];
            delta.cells.push({
                row,
                col,
                cell: cell || null
            });
            
            // Also check if trail changed
            const trailKey = cellKey;
            if (this.gameState.trails[trailKey]) {
                delta.trails[trailKey] = this.gameState.trails[trailKey];
            } else if (this.previousGameState && this.previousGameState.trails && this.previousGameState.trails[trailKey]) {
                // Trail was removed
                delta.trails[trailKey] = null;
            }
        });

        // Update previous states
        this.previousPlayerStates = JSON.parse(JSON.stringify(this.gameState.players));
        // Store previous gameState for trail comparison
        if (!this.previousGameState) {
            this.previousGameState = { trails: {} };
        }
        this.previousGameState.trails = JSON.parse(JSON.stringify(this.gameState.trails || {}));
        this.changedCells.clear();

        return delta;
    }

    hasChanges() {
        // Check if there are any changes to send
        for (const playerId in this.gameState.players) {
            const currentPlayer = this.gameState.players[playerId];
            const previousPlayer = this.previousPlayerStates[playerId];

            if (!previousPlayer ||
                currentPlayer.x !== previousPlayer.x ||
                currentPlayer.y !== previousPlayer.y ||
                currentPlayer.direction !== previousPlayer.direction ||
                currentPlayer.area !== previousPlayer.area) {
                return true;
            }
        }

        for (const playerId in this.previousPlayerStates) {
            if (!this.gameState.players[playerId]) {
                return true;
            }
        }

        return this.changedCells.size > 0;
    }
}

module.exports = GameEngine;
