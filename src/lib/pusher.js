import Pusher from "pusher";

const hasPusherConfig = 
  process.env.PUSHER_APP_ID &&
  process.env.NEXT_PUBLIC_PUSHER_KEY &&
  process.env.PUSHER_SECRET &&
  process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

let pusherInstance = null;

if (hasPusherConfig) {
  try {
    pusherInstance = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      useTLS: true,
    });
  } catch (error) {
    console.error("⚠️ Failed to initialize Pusher server SDK:", error);
  }
} else {
  console.warn("ℹ️ Pusher environment variables are not fully configured. Using Smart Fallback Mode (polling state from /api/game/state).");
}

export const pusher = pusherInstance;
export const isPusherAvailable = !!pusher;

/**
 * Broadcasts an event to a channel via Pusher if available, or logs it to console in fallback mode.
 * 
 * @param {string} channelName The Pusher channel (e.g. 'presence-room-XYZ')
 * @param {string} eventName The event identifier (e.g. 'game-updated', 'guest-joined')
 * @param {object} data The event payload
 */
export async function triggerEvent(channelName, eventName, data) {
  if (pusher) {
    try {
      await pusher.trigger(channelName, eventName, data);
      return { success: true, mode: "pusher" };
    } catch (error) {
      console.error(`❌ Pusher broadcast failed for ${channelName} -> ${eventName}:`, error);
      return { success: false, mode: "pusher_failed", error: error.message };
    }
  }

// Smart Fallback behavior: log events on the server so engineers see synchronization triggers.
  // The client will pick up updates automatically by polling the in-memory server state.
  console.log(`📡 [Smart Fallback Mode] Broadcast on channel "${channelName}" - Event "${eventName}":`, JSON.stringify(data, null, 2));
  return { success: true, mode: "fallback", event: eventName };
}

/**
 * Queries Pusher's REST API to check the active status of a channel (e.g. user_count).
 * Acts as our serverless, real-time database room occupancy check!
 * 
 * @param {string} channelName The full channel name (e.g. 'presence-room-ABCDEF')
 * @returns {Promise<{ occupied: boolean, user_count: number, success: boolean, fallback?: boolean }>}
 */
export function getChannelInfo(channelName) {
  return new Promise((resolve) => {
    if (!pusher) {
      // In local fallback mode (no Pusher keys), pretend the room exists and has 1 occupant (the Host)
      // to let local tabs join successfully.
      resolve({ occupied: true, user_count: 1, success: true, fallback: true });
      return;
    }

    pusher.get({
      path: `/channels/${channelName}`,
      params: { info: "user_count" }
    }, (err, request, response) => {
      if (err) {
        console.error(`❌ Pusher API channel query failed for ${channelName}:`, err);
        resolve({ occupied: false, user_count: 0, success: false, error: err.message });
      } else if (response.statusCode !== 200) {
        resolve({ occupied: false, user_count: 0, success: true });
      } else {
        try {
          const body = JSON.parse(response.body);
          resolve({
            occupied: body.occupied || false,
            user_count: body.user_count || 0,
            success: true
          });
        } catch (e) {
          resolve({ occupied: false, user_count: 0, success: false, error: e.message });
        }
      }
    });
  });
}
