import { getRoom } from "../../../../lib/serverStore";
import { pusher } from "../../../../lib/pusher";

export async function POST(request) {
  try {
    let socketId, channelName, userId, username, role;

    // 1. Robust request parsing (JSON, FormData, or URL params)
    const contentType = request.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      const body = await request.json();
      socketId = body.socket_id;
      channelName = body.channel_name;
      userId = body.userId || body.user_id;
      username = body.username || body.name;
      role = body.role;
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      socketId = formData.get("socket_id");
      channelName = formData.get("channel_name");
      userId = formData.get("userId") || formData.get("user_id");
      username = formData.get("username") || formData.get("name");
      role = formData.get("role");
    } else {
      // Fallback to URL search parameters
      const url = new URL(request.url);
      socketId = url.searchParams.get("socket_id");
      channelName = url.searchParams.get("channel_name");
      userId = url.searchParams.get("userId") || url.searchParams.get("user_id");
      username = url.searchParams.get("username") || url.searchParams.get("name");
      role = url.searchParams.get("role");
    }

    // 2. Validate input parameters
    if (!socketId || !channelName) {
      return Response.json(
        { error: "Missing socket_id or channel_name parameters" },
        { status: 400 }
      );
    }

    // Parse Room ID from presence channel (presence-room-${roomId})
    const match = channelName.match(/^presence-room-(.+)$/);
    if (!match) {
      return Response.json(
        { error: "Invalid channel name format. Must be 'presence-room-${roomId}'" },
        { status: 400 }
      );
    }
    const roomId = match[1];

    // 3. Look up active room state
    const room = getRoom(roomId);
    if (!room) {
      return Response.json({ error: "Room not found" }, { status: 404 });
    }

    // Ensure we have a valid identifier for the authenticating user
    if (!userId) {
      return Response.json(
        { error: "userId or user_id is required to authenticate for presence channels" },
        { status: 400 }
      );
    }

    const isHost = room.host.id === userId;
    const isGuest = room.guest && room.guest.id === userId;

    // 4. Strict Capacity Enforcement
    // Only registered host or registered guest are permitted to join this room's channel.
    // If a third player tries to authenticate, they get a 403 Forbidden.
    if (!isHost && !isGuest) {
      return Response.json(
        { error: "Forbidden: Room capacity reached (strict limit of 2 players)" },
        { status: 403 }
      );
    }

    // Determine the user's role and display name
    const resolvedRole = isHost ? "tigers" : "sticks";
    const resolvedName = username || (isHost ? room.host.name : room.guest.name);

    const presenceData = {
      user_id: userId,
      user_info: {
        name: resolvedName,
        role: resolvedRole,
      },
    };

    // 5. Authenticate via Pusher or fall back to local mock response
    if (pusher) {
      const authResponse = pusher.authorizeChannel(socketId, channelName, presenceData);
      return Response.json(authResponse);
    } else {
      // Mock authorization signature for offline multi-tab testing
      return Response.json({
        auth: `mock-auth-sig-for-${roomId}-${userId}`,
        channel_data: JSON.stringify(presenceData),
        mock: true,
        info: "Operating in smart fallback mode (no Pusher credentials)."
      });
    }
  } catch (error) {
    console.error("Error in Pusher auth Route Handler:", error);
    return Response.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
