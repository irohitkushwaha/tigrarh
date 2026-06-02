import React from "react";

export default function Dashboard({
  gameState,
  player1Name = "Player 1",
  player2Name = "Player 2",
  flyingMode = true,
  onToggleFlying,
  isOnline = false,
  isAIMode = false,
  aiDifficulty = "hard",
  onChangeAIDifficulty,
  soundMuted = false,
  onToggleSound,
  onReset,
  roomId = "",
  room = null,
  isHost = false,
}) {
  const { currentPlayer, piecesToPlace, piecesActive, pendingRemove, winner } = gameState;
  
  // Calculate captured counts (total pieces are 9, so captured is 9 - active - inHand)
  const captured1 = 9 - piecesActive[2] - piecesToPlace[2]; // Captured sticks (taken by Player 1)
  const captured2 = 9 - piecesActive[1] - piecesToPlace[1]; // Captured pebbles (taken by Player 2)

  const getShareLink = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}?join=${roomId}`;
    }
    return `?join=${roomId}`;
  };

  const copyShareLink = () => {
    const link = getShareLink();
    navigator.clipboard.writeText(link);
    alert("Shareable join link copied to clipboard!");
  };

  // If online game and guest is not connected
  const showInviteBox = isOnline && roomId && (!room || !room.guest || room.status === "waiting");

  return (
    <div className="sidebar">
      {/* SCOREBOARD STATUS & MENU CARD */}
      <div className="glass-panel" style={{ padding: "20px" }}>
        <div className="panel-header">Game Dashboard</div>
        
        {/* Status indicator */}
        <div className="status-banner" style={{ marginBottom: "20px" }}>
          {winner ? (
            <div className="clay-text-glow" style={{ fontWeight: "bold" }}>
              🏆 {winner === 1 ? player1Name : player2Name} Wins!
            </div>
          ) : pendingRemove ? (
            <>
              <div className="pulsing-indicator" style={{ backgroundColor: "var(--color-gold)", boxShadow: "0 0 10px var(--color-gold)" }} />
              <span>Capture an Opponent Piece!</span>
            </>
          ) : showInviteBox ? (
            <>
              <div className="pulsing-indicator" style={{ backgroundColor: "var(--color-gold)" }} />
              <span>Waiting for Guest...</span>
            </>
          ) : (
            <>
              <div className="pulsing-indicator" />
              <span>
                Turn: <strong>{currentPlayer === 1 ? player1Name : player2Name}</strong>
              </span>
            </>
          )}
        </div>

        {/* Player 1 Card (Stones) */}
        <div className={`player-status-card ${!winner && currentPlayer === 1 ? "active" : ""}`} style={{ marginBottom: "12px" }}>
          <div className="player-title">
            <span style={{ fontSize: "1.25rem" }}>⚪</span>
            <span>{player1Name}</span>
          </div>
          <div className="player-score-grid">
            <div>Placing Hand:</div>
            <div style={{ color: "var(--color-gold)", fontWeight: "bold" }}>{piecesToPlace[1]} Left</div>
            <div>On Board:</div>
            <div>{piecesActive[1]} Pieces</div>
            <div>Sticks Captured:</div>
            <div style={{ color: "var(--color-terracotta)", fontWeight: "bold" }}>{captured1} / 9</div>
          </div>
        </div>

        {/* Player 2 Card (Sticks) */}
        <div className={`player-status-card ${!winner && currentPlayer === 2 ? "active" : ""}`}>
          <div className="player-title">
            <span style={{ fontSize: "1.25rem" }}>🪵</span>
            <span>{player2Name}</span>
          </div>
          <div className="player-score-grid">
            <div>Placing Hand:</div>
            <div style={{ color: "var(--color-gold)", fontWeight: "bold" }}>{piecesToPlace[2]} Left</div>
            <div>On Board:</div>
            <div>{piecesActive[2]} Pieces</div>
            <div>Pebbles Captured:</div>
            <div style={{ color: "var(--color-terracotta)", fontWeight: "bold" }}>{captured2} / 9</div>
          </div>
        </div>
      </div>

      {/* SHARE CODE LOBBY BOX (Displays inside playground until guest joins) */}
      {showInviteBox && (
        <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "10px", alignItems: "center", textAlign: "center" }}>
          <div className="panel-header" style={{ width: "100%", marginBottom: "5px" }}>Invite Opponent</div>
          <p style={{ fontSize: "0.82rem", opacity: 0.8, lineHeight: 1.4 }}>
            Share this link or code with your friend to connect instantly:
          </p>
          <div style={{ background: "rgba(0,0,0,0.3)", padding: "10px 20px", borderRadius: "8px", width: "100%", margin: "5px 0" }}>
            <div style={{ fontSize: "0.7rem", textTransform: "uppercase", opacity: 0.6, letterSpacing: "0.05em" }}>Room Code</div>
            <div style={{ fontSize: "1.6rem", fontFamily: "var(--font-cinzel)", fontWeight: "bold", color: "var(--color-gold)" }}>{roomId}</div>
          </div>
          <button className="action-btn" onClick={copyShareLink} style={{ width: "100%", padding: "8px 12px", fontSize: "0.85rem" }}>
            🔗 Copy Invite Link
          </button>
        </div>
      )}

      {/* SETTINGS CARD */}
      <div className="glass-panel" style={{ padding: "20px" }}>
        <div className="panel-header">Settings & Controls</div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {/* Flying Phase Rules Display (Locked during play) */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.9rem", padding: "4px 0" }}>
            <span>Rules:</span>
            <span style={{ color: "var(--color-gold)", fontWeight: "bold" }}>
              {flyingMode ? "✈️ Tournament (Flying)" : "🔒 Rural / Strict (Adjacent)"}
            </span>
          </div>

          {/* AI difficulty select (only in AI mode) */}
          {isAIMode && !winner && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.9rem" }}>
              <span>AI Difficulty:</span>
              <select
                value={aiDifficulty}
                onChange={(e) => onChangeAIDifficulty(e.target.value)}
                style={{
                  padding: "6px 8px",
                  borderRadius: "6px",
                  border: "1px solid rgba(228, 114, 52, 0.3)",
                  background: "var(--color-clay-deep)",
                  color: "#fff",
                  fontSize: "0.8rem",
                  fontFamily: "var(--font-outfit)",
                  outline: "none",
                  cursor: "pointer",
                  minWidth: "120px",
                }}
              >
                <option value="easy">Easy 🤖</option>
                <option value="medium">Medium 🧠</option>
                <option value="hard">Hard 🔮</option>
              </select>
            </div>
          )}

          {/* Sound Toggle */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.9rem" }}>
            <span>Sound Effects:</span>
            <button
              className="action-btn secondary-btn"
              onClick={onToggleSound}
              style={{ padding: "6px 12px", fontSize: "0.8rem", minWidth: "120px" }}
            >
              {soundMuted ? "Muted 🔇" : "Enabled 🔊"}
            </button>
          </div>

          {/* Return to Lobby / Main Menu */}
          <button className="action-btn" onClick={onReset} style={{ width: "100%", marginTop: "10px" }}>
            🚪 Exit to Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
