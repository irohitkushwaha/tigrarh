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
