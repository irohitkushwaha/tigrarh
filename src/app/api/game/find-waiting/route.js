import { findWaitingRoom } from "../../../../lib/serverStore";

export async function GET(request) {
  try {
    const room = findWaitingRoom();
    if (room) {
      return Response.json({
        success: true,
        roomId: room.roomId,
      });
    } else {
      return Response.json({
        success: false,
        error: "No active waiting rooms found. Please host a game instead!",
      });
    }
  } catch (error) {
    console.error("Error finding waiting room:", error);
    return Response.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
