import { getRoom, createRoom } from "../../../../lib/serverStore";
import { getChannelInfo } from "../../../../lib/pusher";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const rawRoomId = url.searchParams.get("roomId");

    if (!rawRoomId) {
      return Response.json(
        { error: "roomId query parameter is required" },
        { status: 400 }
      );
    }

    const roomId = rawRoomId.trim().toUpperCase();

    // 1. Look up the room in our global server store (with serverless self-healing)
    let room = getRoom(roomId);

    if (!room) {
      const channelName = `presence-room-${roomId}`;
      const channelInfo = await getChannelInfo(channelName);
      
      if (channelInfo.occupied && channelInfo.user_count > 0) {
        // Re-hydrate the room structure in ephemeral memory
        room = createRoom(roomId, "HOST_ID_REHYDRATED", "Host Player", true);
        if (channelInfo.user_count >= 2) {
          room.status = "playing";
        }
      } else {
        return Response.json(
          { error: `Room '${roomId}' not found or has been deleted` },
          { status: 404 }
        );
      }
    }

    // 2. Return the current game state, turn, and players
    return Response.json({
      success: true,
      room,
    });
  } catch (error) {
    console.error("Error fetching room state:", error);
    return Response.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
