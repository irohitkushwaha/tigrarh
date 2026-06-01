import { getRoom, kickGuest } from "../../../../lib/serverStore";
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

    const { roomId: rawRoomId, hostId } = body;

    if (!rawRoomId || !hostId) {
      return Response.json(
        { error: "roomId and hostId are required to kick a guest" },
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

    // 2. Validate that the requester is the host of this room
    if (room.host.id !== hostId) {
      return Response.json(
        { error: "Unauthorized: Only the host can kick players from this room" },
        { status: 403 }
      );
    }

    // 3. Reset the room back to "Waiting for Guest"
    const kickedGuestInfo = room.guest;
    if (!kickedGuestInfo) {
      return Response.json({
        success: true,
        message: "No guest player in the room to kick",
        room,
      });
    }

    const updatedRoom = kickGuest(roomId);

    // 4. Broadcast the 'guest-kicked' event via Pusher (or local fallback logging)
    const channelName = `presence-room-${roomId}`;
    await triggerEvent(channelName, "guest-kicked", {
      roomId,
      kickedGuestId: kickedGuestInfo.id,
      room: updatedRoom,
    });

    return Response.json({
      success: true,
      message: `Player '${kickedGuestInfo.name}' was successfully kicked from the lobby`,
      room: updatedRoom,
    });
  } catch (error) {
    console.error("Error kicking guest:", error);
    return Response.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
