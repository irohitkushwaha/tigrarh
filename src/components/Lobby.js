import React, { useState } from "react";

export default function Lobby({
  onSelectMode,
  roomId,
  room,
  playerId,
  onKick,
  onCancel,
  error,
  onClearError,
  onJoinRoomSubmit,
  flyingMode = true,
  onToggleFlying,
}) {
  const [joinCode, setJoinCode] = useState("");
  const [guestNameInput, setGuestNameInput] = useState("");
  const [hostNameInput, setHostNameInput] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isHosting, setIsHosting] = useState(false);

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    onJoinRoomSubmit(joinCode.trim().toUpperCase(), guestNameInput.trim() || "Guest Player");
  };

  const handleHostSubmit = (e) => {
    e.preventDefault();
    onSelectMode("online-host", { 
      hostName: hostNameInput.trim() || "Host Player", 
      flyingMode: flyingMode 
    });
  };

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

  // If there's an error panel (e.g. room full)
  if (error) {
    return (
      <div className="lobby-card glass-panel">
        <div className="lobby-opt-icon">⚠️</div>
        <h2 className="clay-text-glow">Failed to Join</h2>
        <p className="lobby-subtitle" style={{ color: "var(--color-slate-light)" }}>
          {error}
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "15px" }}>
          <button className="action-btn" onClick={onClearError}>
            Return to Modes
          </button>
        </div>
      </div>
    );
  }

  // If the host is waiting in the online lobby
  if (roomId && room && room.status === "waiting" && room.host.id === playerId) {
    return (
      <div className="lobby-card glass-panel" style={{ maxWidth: "580px" }}>
        <div className="pulsing-indicator" style={{ width: "16px", height: "16px", margin: "0 auto 10px" }} />
        <h2 className="clay-text-glow">Waiting for Guest</h2>
        <p className="lobby-subtitle">
          Share the room code or invitation link with your opponent to start playing.
        </p>

        <div style={{ background: "rgba(0, 0, 0, 0.25)", padding: "20px", borderRadius: "12px", margin: "10px 0" }}>
          <div style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7 }}>
            Room Code
          </div>
          <div style={{ fontSize: "2.4rem", fontFamily: "var(--font-cinzel)", fontWeight: "bold", color: "var(--color-gold)", margin: "5px 0" }}>
            {roomId}
          </div>
          <button className="action-btn secondary-btn" onClick={copyShareLink} style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
            Copy Invitation Link
          </button>
        </div>

        <div className="rules-text" style={{ fontSize: "0.85rem", borderTop: "1px solid rgba(228, 114, 52, 0.15)", paddingTop: "15px" }}>
          <p>🧑‍💻 <strong>Host (You)</strong>: {room.host.name || "Host Player"} (Pebbles)</p>
          <p>👤 <strong>Guest</strong>: Waiting to join...</p>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginTop: "10px" }}>
          <button className="action-btn secondary-btn" onClick={onCancel}>
            Cancel Lobby
          </button>
        </div>
      </div>
    );
  }

  // If a guest has joined, but we are displaying lobby detail (e.g. Host options before pressing start, or player listing)
  if (roomId && room && room.status === "playing") {
    const isHost = room.host.id === playerId;
    return (
      <div className="lobby-card glass-panel" style={{ maxWidth: "580px" }}>
        <div className="lobby-opt-icon">⚔️</div>
        <h2 className="clay-text-glow">Room Connected</h2>
        <p className="lobby-subtitle">
          Opponent has joined! The match is ready.
        </p>

        <div style={{ background: "rgba(0, 0, 0, 0.2)", padding: "16px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "10px", margin: "10px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>⚪ <strong>Host (Stones)</strong>: {room.host.name}</span>
            {isHost && <span style={{ fontSize: "0.8rem", color: "var(--color-gold)" }}>(You)</span>}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>🪵 <strong>Guest (Sticks)</strong>: {room.guest?.name || "Joining..."}</span>
            {!isHost && <span style={{ fontSize: "0.8rem", color: "var(--color-gold)" }}>(You)</span>}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginTop: "10px" }}>
          {isHost ? (
            <>
              <button className="action-btn" onClick={() => onSelectMode("online-active")}>
                Start Match
              </button>
              <button className="action-btn secondary-btn" style={{ borderColor: "#cc3333" }} onClick={onKick}>
                Kick Guest
              </button>
            </>
          ) : (
            <p className="lobby-subtitle" style={{ fontStyle: "italic" }}>
              Waiting for the Host to start the match...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Active choices setup panels
  if (isHosting) {
    return (
      <div className="lobby-card glass-panel" style={{ maxWidth: "480px" }}>
        <h2 className="clay-text-glow">Create Online Room</h2>
        <p className="lobby-subtitle">Enter your nickname to create a secure game room.</p>
        
        <form onSubmit={handleHostSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "10px" }}>
          <input
            type="text"
            placeholder="Nickname (e.g. Chhattisgarhi Warrior)"
            value={hostNameInput}
            onChange={(e) => setHostNameInput(e.target.value)}
            maxLength={20}
            style={{
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid rgba(228, 114, 52, 0.3)",
              background: "rgba(0, 0, 0, 0.4)",
              color: "#fff",
              fontSize: "1rem",
              outline: "none"
            }}
            autoFocus
          />
          <div style={{ display: "flex", gap: "10px" }}>
            <button type="submit" className="action-btn" style={{ flex: 1 }}>
              Host Game
            </button>
            <button type="button" className="action-btn secondary-btn" onClick={() => setIsHosting(false)}>
              Back
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (isJoining) {
    return (
      <div className="lobby-card glass-panel" style={{ maxWidth: "480px" }}>
        <h2 className="clay-text-glow">Join Online Room</h2>
        <p className="lobby-subtitle">Enter the 6-character room code and your nickname.</p>
        
        <form onSubmit={handleJoinSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "10px" }}>
          <input
            type="text"
            placeholder="Room Code (e.g. AB12CD)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            style={{
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid rgba(228, 114, 52, 0.3)",
              background: "rgba(0, 0, 0, 0.4)",
              color: "#ffcb74",
              fontSize: "1.2rem",
              fontFamily: "var(--font-cinzel)",
              fontWeight: "bold",
              textAlign: "center",
              letterSpacing: "0.2em",
              outline: "none"
            }}
            autoFocus
            required
          />
          <input
            type="text"
            placeholder="Your Nickname"
            value={guestNameInput}
            onChange={(e) => setGuestNameInput(e.target.value)}
            maxLength={20}
            style={{
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid rgba(228, 114, 52, 0.3)",
              background: "rgba(0, 0, 0, 0.4)",
              color: "#fff",
              fontSize: "1rem",
              outline: "none"
            }}
            required
          />
          <div style={{ display: "flex", gap: "10px" }}>
            <button type="submit" className="action-btn" style={{ flex: 1 }}>
              Join Match
            </button>
            <button type="button" className="action-btn secondary-btn" onClick={() => setIsJoining(false)}>
              Back
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Default room mode selection
  return (
    <div className="lobby-card glass-panel">
      <h1 className="ancient-title">TIGARH</h1>
      <p className="lobby-subtitle">
        A magnificent ancient Indian game of geometry and wits. Form lines of 3 to capture and trap your opponent!
      </p>

      {/* Global Ruleset Configurator (Locked once game starts) */}
      <div style={{ 
        background: "rgba(0, 0, 0, 0.22)", 
        padding: "14px 20px", 
        borderRadius: "12px", 
        border: "1px solid rgba(228, 114, 52, 0.15)",
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        maxWidth: "480px",
        margin: "10px auto 5px",
        width: "100%",
        fontSize: "0.9rem"
      }}>
        <span style={{ fontWeight: "500", color: "#f7ede2" }}>🛡️ Ruleset (Set before starting):</span>
        <button
          type="button"
          className="action-btn secondary-btn"
          onClick={onToggleFlying}
          style={{ padding: "6px 12px", fontSize: "0.8rem", minWidth: "160px" }}
        >
          {flyingMode ? "Tournament ✈️ (Flying)" : "Rural / Strict 🔒 (Adjacent)"}
        </button>
      </div>

      <div className="lobby-options">
        {/* local pass & play */}
        <button className="lobby-opt-btn" onClick={() => onSelectMode("local")}>
          <div className="lobby-opt-icon">👥</div>
          <div className="lobby-opt-title">Pass & Play</div>
          <div className="lobby-opt-desc">Play locally with a friend on the same screen.</div>
        </button>

        {/* vs ai */}
        <button className="lobby-opt-btn" onClick={() => onSelectMode("ai")}>
          <div className="lobby-opt-icon">🤖</div>
          <div className="lobby-opt-title">Vs Computer AI</div>
          <div className="lobby-opt-desc">Challenge the smart computer with 3 difficulty modes.</div>
        </button>

        {/* host online */}
        <button className="lobby-opt-btn" onClick={() => setIsHosting(true)}>
          <div className="lobby-opt-icon">📡</div>
          <div className="lobby-opt-title">Host Online</div>
          <div className="lobby-opt-desc">Create a room and invite a friend using a shareable link.</div>
        </button>

        {/* join online */}
        <button className="lobby-opt-btn" onClick={() => setIsJoining(true)}>
          <div className="lobby-opt-icon">🔑</div>
          <div className="lobby-opt-title">Join Online</div>
          <div className="lobby-opt-desc">Enter a room code sent by your friend to join.</div>
        </button>
      </div>
    </div>
  );
}
