import { getRoom, joinRoom } from "../../../../lib/serverStore";
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

    const { roomId: rawRoomId, guestId, guestName } = body;

    if (!rawRoomId || !guestId) {
      return Response.json(
        { error: "roomId and guestId are required to join a game" },
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

    // 2. Validate room capacity and status before joining
    if (room.status === "canceled") {
      return Response.json(
        { error: "This game room has been canceled by the host" },
        { status: 400 }
      );
    }

    if (room.guest && room.guest.id !== guestId) {
      return Response.json(
        { error: "This game room is already full (limit 2 players)" },
        { status: 400 }
      );
    }

    // 3. Register the guest player and set status to "playing"
    let updatedRoom;
    try {
      updatedRoom = joinRoom(roomId, guestId, guestName);
    } catch (err) {
      return Response.json(
        { error: err.message },
        { status: 400 }
      );
    }

    // 4. Broadcast the 'guest-joined' event via Pusher (or local fallback logging)
    const channelName = `presence-room-${roomId}`;
    await triggerEvent(channelName, "guest-joined", {
      roomId,
      guest: updatedRoom.guest,
      room: updatedRoom,
    });

    return Response.json({
      success: true,
      message: "Successfully joined the room",
      role: "sticks",
      room: updatedRoom,
    });
  } catch (error) {
    console.error("Error joining room:", error);
    return Response.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
