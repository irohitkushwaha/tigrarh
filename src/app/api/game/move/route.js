import { getRoom, updateRoom } from "../../../../lib/serverStore";
import { triggerEvent } from "../../../../lib/pusher";

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return Response.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { roomId: rawRoomId, playerId, role, move, boardState, winner } = body;

    if (!rawRoomId || !playerId || !role) {
      return Response.json(
        { error: "roomId, playerId, and role are required to make a move" },
        { status: 400 }
      );
    }

    const roomId = rawRoomId.trim().toUpperCase();

    // 1. Validate that the room exists
    const room = getRoom(roomId);
    if (!room) {
      return Response.json(
        { error: `Room '${roomId}' not found` },
        { status: 404 }
      );
    }

    // 2. Validate that the room is actively being played
    if (room.status !== "playing") {
      return Response.json(
        { error: `Cannot make a move. Game status is currently '${room.status}'` },
        { status: 400 }
      );
    }

    // 3. Verify the player belongs in this room and matches the specified role
    const isHost = room.host.id === playerId;
    const isGuest = room.guest && room.guest.id === playerId;

    if (!isHost && !isGuest) {
      return Response.json(
        { error: "Unauthorized: Player is not registered in this game room" },
        { status: 403 }
      );
    }

    const resolvedRole = isHost ? "tigers" : "sticks";
    if (resolvedRole !== role) {
      return Response.json(
        { error: `Role mismatch: You are registered as '${resolvedRole}', not '${role}'` },
        { status: 400 }
      );
    }

    // 4. Strict Turn Enforcement
    if (room.gameState.turn !== role) {
      return Response.json(
        { error: `It is not your turn. Current turn is '${room.gameState.turn}'` },
        { status: 400 }
      );
    }

    // 5. Update the game state
    // We update the board layout, record the move, toggle the turn, and check for win conditions.
    const currentGameState = { ...room.gameState };

    // Update board state if the client passes an authoritative new board state (standard flexible architecture)
    if (boardState) {
      currentGameState.board = {
        ...currentGameState.board,
        ...boardState,
      };
    } else if (move) {
      // If the client passes a move object directly, we apply simple transformations or record it
      // Standard board transformations can also be handled on the client-side board logic.
      if (move.to !== undefined && currentGameState.board.nodes) {
        const nodes = [...currentGameState.board.nodes];
        
        // Remove from old node if it is a slide/movement move
        if (move.from !== null && move.from !== undefined) {
          nodes[move.from] = null;
        }

        // Place on new node
        nodes[move.to] = role === "tigers" ? "tiger" : "stick";
        currentGameState.board.nodes = nodes;

        // If it is a capture move, update captured sticks count
        if (move.captured !== null && move.captured !== undefined) {
          nodes[move.captured] = null; // Remove captured stick
          currentGameState.board.capturedSticks = (currentGameState.board.capturedSticks || 0) + 1;
        }
      }
    }

    // Record the move in history
    if (move) {
      const moveRecord = {
        playerId,
        role,
        move,
        timestamp: Date.now(),
      };
      currentGameState.moveHistory = [...(currentGameState.moveHistory || []), moveRecord];
    }

    // Toggle turn: tigers -> sticks -> tigers
    currentGameState.turn = role === "tigers" ? "sticks" : "tigers";

    // Enforce win condition rules or record winner if passed/calculated
    if (winner) {
      currentGameState.winner = winner;
    } else {
      // Server-side win checks for Tigarh:
      // Tigers win if they capture 5 sticks/goats
      if (currentGameState.board.capturedSticks >= 5) {
        currentGameState.winner = "tigers";
      }
      // Sticks win if all 3 tigers are trapped (can be flagged by client or evaluated)
      // We will respect a client-triggered victory condition or allow them to pass it.
    }

    // Mark room status as finished if a winner is declared
    let roomStatus = "playing";
    if (currentGameState.winner) {
      roomStatus = "finished";
    }

    // Save updated room state back to memory
    const updatedRoom = updateRoom(roomId, {
      gameState: currentGameState,
      status: roomStatus,
    });

    // 6. Broadcast the 'game-updated' event to all other clients in the Presence Channel
    const channelName = `presence-room-${roomId}`;
    await triggerEvent(channelName, "game-updated", {
      roomId,
      room: updatedRoom,
      lastMove: move,
    });

    return Response.json({
      success: true,
      message: "Move applied and state broadcasted successfully",
      room: updatedRoom,
    });
  } catch (error) {
    console.error("Error making move:", error);
    return Response.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
