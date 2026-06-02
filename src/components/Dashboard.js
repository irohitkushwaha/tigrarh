import React from "react";

/**
 * PlayerDetailsBar - Horizontal details bar for Opponent (top) and Player (bottom).
 * Shows Name, Placing Hand, On board, and Opponent Captured.
 */
export function PlayerDetailsBar({
  name,
  isTurn,
  piecesToPlaceCount,
  piecesActiveCount,
  capturedCount,
  icon = "⚪",
  isMe = false,
}) {
  return (
    <div className={`horizontal-player-card ${isTurn ? "active-turn" : ""}`}>
      {/* Name and Icon */}
      <div className="player-title" style={{ gap: "12px" }}>
        <span style={{ fontSize: "1.3rem" }}>{icon}</span>
        <span>
          {name} {isMe && <span style={{ fontSize: "0.8rem", color: "var(--color-gold)", opacity: 0.8 }}>(You)</span>}
        </span>
      </div>

      {/* Turn indicator label */}
      {isTurn && (
        <div className="flicker-turn-text">
          ⭐ {isMe ? "YOUR TURN" : "OPPONENT TURN"}
        </div>
      )}

      {/* Metrics Row */}
      <div className="player-details-row">
        <div>
          Placing Hand: <strong>{piecesToPlaceCount}/9</strong>
        </div>
        <div>
          On Board: <strong>{piecesActiveCount}/9</strong>
        </div>
        <div>
          Captured: <strong>{capturedCount}/9</strong>
        </div>
      </div>
    </div>
  );
}

/**
 * GameControlsHeader - Minimalist header containing settings and sound toggle.
 */
export function GameControlsHeader({
  soundMuted,
  onToggleSound,
  onReset,
  roomId = "",
  room = null,
  isOnline = false,
}) {
  const getShareLink = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/play/online/${roomId}`;
    }
    return `/play/online/${roomId}`;
  };

  const copyShareLink = () => {
    const link = getShareLink();
    navigator.clipboard.writeText(link);
    alert("Shareable join link copied to clipboard!");
  };

  const showInviteBox = false;

  if (!isOnline) {
    return (
      <div style={{
        width: "100%",
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        marginBottom: "10px",
        fontSize: "0.9rem"
      }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            className="action-btn secondary-btn"
            onClick={onToggleSound}
            title="Toggle Sound"
            style={{ padding: "6px 10px", fontSize: "0.85rem", borderRadius: "6px" }}
          >
            {soundMuted ? "🔇 Muted" : "🔊 Sound"}
          </button>
          <button
            className="action-btn"
            onClick={onReset}
            style={{ padding: "6px 12px", fontSize: "0.85rem", borderRadius: "6px" }}
          >
            🚪 Exit
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Right side: volume and exit controls absolute top right in online play */}
      <div style={{
        position: "absolute",
        top: "20px",
        right: "20px",
        display: "flex",
        gap: "8px",
        alignItems: "center",
        zIndex: 100
      }}>
        <button
          className="action-btn secondary-btn"
          onClick={onToggleSound}
          title="Toggle Sound"
          style={{ padding: "6px 10px", fontSize: "0.85rem", borderRadius: "6px" }}
        >
          {soundMuted ? "🔇 Muted" : "🔊 Sound"}
        </button>
        <button
          className="action-btn"
          onClick={onReset}
          style={{ padding: "6px 12px", fontSize: "0.85rem", borderRadius: "6px" }}
        >
          🚪 Exit
        </button>
      </div>
    </>
  );
}
