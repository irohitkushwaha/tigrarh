import { createRoom, getRoom } from "../../../../lib/serverStore";

function generateRoomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

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

    const { hostId, hostName, flyingMode } = body;

    if (!hostId) {
      return Response.json(
        { error: "hostId is required to create a game room" },
        { status: 400 }
      );
    }

    // Generate a unique room code
    let roomId = generateRoomCode();
    let collisionCount = 0;
    while (getRoom(roomId) && collisionCount < 10) {
      roomId = generateRoomCode();
      collisionCount++;
    }

    if (collisionCount >= 10) {
      return Response.json(
        { error: "Failed to generate a unique room code. Please try again." },
        { status: 500 }
      );
    }

    // Initialize the room state with the host's rule choice
    const room = createRoom(roomId, hostId, hostName, flyingMode);

    return Response.json({
      success: true,
      message: "Room created successfully",
      room,
    });
  } catch (error) {
    console.error("Error creating room:", error);
    return Response.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
