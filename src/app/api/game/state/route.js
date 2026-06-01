import { getRoom } from "../../../../lib/serverStore";

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

    // 1. Look up the room in our global server store
    const room = getRoom(roomId);

    if (!room) {
      return Response.json(
        { error: `Room '${roomId}' not found or has been deleted` },
        { status: 404 }
      );
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
