// In-memory room store for Tigarh multiplayer sessions.
// Uses a global map to survive Next.js hot reloads in development.
if (!global.roomsStore) {
  global.roomsStore = new Map();
}

const rooms = global.roomsStore;

/**
 * Initializes a new room with a host player.
 */
export function createRoom(roomId, hostId, hostName, flyingMode = true) {
  const room = {
    roomId,
    flyingMode: flyingMode !== false, // Persist flyingMode selection set by host
    host: {
      id: hostId,
      name: hostName || "Host Player",
      role: "tigers",
    },
    guest: null,
    players: [
      { id: hostId, name: hostName || "Host Player", role: "tigers" }
    ],
    status: "waiting", // 'waiting', 'playing', 'canceled', 'finished'
    gameState: {
      board: {
        // Tigarh board grid representation (e.g. vertices 0-23 for Nine Men's Morris style grid, or similar)
        // We'll initialize an empty map of node index -> piece occupant
        // Occupants can be null, 'tiger', or 'stick'
        nodes: Array(24).fill(null),
        tigers: [], // e.g. indices of tigers
        sticks: [], // e.g. indices of sticks
        capturedSticks: 0,
        placedSticks: 0,
        placedTigers: 0,
        maxSticks: 15,
        maxTigers: 3,
        phase: "placement", // 'placement' (dropping pieces) or 'movement' (sliding/jumping)
      },
      turn: "tigers", // Tigers start the game
      winner: null,
      moveHistory: [],
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  rooms.set(roomId, room);
  return room;
}

/**
 * Retrieves an active room state.
 */
export function getRoom(roomId) {
  return rooms.get(roomId) || null;
}

/**
 * Updates a room state directly.
 */
export function updateRoom(roomId, updates) {
  const room = rooms.get(roomId);
  if (!room) return null;

  const updatedRoom = {
    ...room,
    ...updates,
    updatedAt: Date.now(),
  };
  rooms.set(roomId, updatedRoom);
  return updatedRoom;
}

/**
 * Registers a guest player to join a room, checking capacity.
 */
export function joinRoom(roomId, guestId, guestName) {
  const room = rooms.get(roomId);
  if (!room) {
    throw new Error("Room not found");
  }
  if (room.status === "canceled") {
    throw new Error("Room has been canceled by the host");
  }
  if (room.guest && room.guest.id !== guestId) {
    throw new Error("Room is already full (limit 2 players)");
  }

  const guestPlayer = {
    id: guestId,
    name: guestName || "Guest Player",
    role: "sticks",
  };

  room.guest = guestPlayer;
  
  // Verify guest is added to the players array without duplication
  if (!room.players.some(p => p.id === guestId)) {
    room.players.push(guestPlayer);
  }

  room.status = "playing";
  room.updatedAt = Date.now();

  rooms.set(roomId, room);
  return room;
}

/**
 * Host kicks the guest player, resetting the room to lobby state.
 */
export function kickGuest(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  room.guest = null;
  room.players = room.players.filter(p => p.role !== "sticks");
  room.status = "waiting";
  room.updatedAt = Date.now();

  rooms.set(roomId, room);
  return room;
}

/**
 * Host deletes/cancels the room.
 */
export function deleteRoom(roomId) {
  return rooms.delete(roomId);
}

/**
 * Finds the first active room that is waiting for a guest player.
 */
export function findWaitingRoom() {
  for (const [roomId, room] of rooms.entries()) {
    if (room.status === "waiting") {
      return room;
    }
  }
  return null;
}

/**
 * Clears expired rooms to save server memory (optional cleanup helper).
 */
export function cleanExpiredRooms(maxAgeMs = 4 * 60 * 60 * 1000) { // 4 hours
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    if (now - room.updatedAt > maxAgeMs) {
      rooms.delete(roomId);
    }
  }
}
