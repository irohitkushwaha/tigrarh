import { getRoom, deleteRoom, updateRoom } from "../../../../lib/serverStore";
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
        { error: "roomId and hostId are required to cancel a game room" },
        { status: 400 }
      );
    }

    const roomId = rawRoomId.trim().toUpperCase();

    // 1. Validate that the room exists
    const room = getRoom(roomId);
    if (!room) {
      return Response.json(
        { error: `Room '${roomId}' not found or already deleted` },
        { status: 404 }
      );
    }

    // 2. Validate that the requester is the host of this room
    if (room.host.id !== hostId) {
      return Response.json(
        { error: "Unauthorized: Only the host can cancel or delete this room" },
        { status: 403 }
      );
    }

    // 3. Mark the room status as canceled
    const canceledRoom = updateRoom(roomId, { status: "canceled" });

    // 4. Broadcast the 'room-deleted' event via Pusher (or local fallback logging)
    const channelName = `presence-room-${roomId}`;
    await triggerEvent(channelName, "room-deleted", {
      roomId,
      message: "The host has deleted this game room.",
      room: canceledRoom,
    });

    // 5. Invalidate the room by removing it from the store
    deleteRoom(roomId);

    return Response.json({
      success: true,
      message: "Room deleted and invalidated successfully",
      room: canceledRoom,
    });
  } catch (error) {
    console.error("Error canceling room:", error);
    return Response.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
