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
  initialJoinCode = "",
}) {
  // Navigation states: 'lobby_menu', 'jump_question', 'online_select', 'online_jump_question', 'host_name', 'join_name', 'join_code'
  const [currentStep, setCurrentStep] = useState(initialJoinCode ? "join_name" : "lobby_menu");
  const [pendingMode, setPendingMode] = useState(""); // 'local' or 'ai'

  const [joinCode, setJoinCode] = useState(initialJoinCode || "");
  const [guestNameInput, setGuestNameInput] = useState("");
  const [hostNameInput, setHostNameInput] = useState("");

  // Sync join code if it loads late
  React.useEffect(() => {
    if (initialJoinCode) {
      setJoinCode(initialJoinCode);
      setCurrentStep("join_name");
    }
  }, [initialJoinCode]);

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    onJoinRoomSubmit(joinCode.trim().toUpperCase(), guestNameInput.trim() || "Guest Player");
  };

  const handleHostSubmit = (e) => {
    e.preventDefault();
    onSelectMode("online-host", {
      hostName: hostNameInput.trim() || "Host Player",
      flyingMode: flyingMode,
    });
  };

  const goBack = () => {
    if (currentStep === "jump_question") {
      setCurrentStep("lobby_menu");
    } else if (currentStep === "online_select") {
      setCurrentStep("lobby_menu");
    } else if (currentStep === "online_jump_question") {
      setCurrentStep("online_select");
    } else if (currentStep === "host_name") {
      setCurrentStep("online_jump_question");
    } else if (currentStep === "join_name") {
      setCurrentStep("online_select");
    } else if (currentStep === "join_code") {
      setCurrentStep("join_name");
    }
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

  // STEP: JUMP RULES QUESTION (for Local and AI modes)
  if (currentStep === "jump_question") {
    return (
      <div className="lobby-card glass-panel" style={{ maxWidth: "520px" }}>
        <div className="lobby-opt-icon">✈️</div>
        <h2 className="clay-text-glow" style={{ fontSize: "1.6rem", margin: "10px 0" }}>Rule Configuration</h2>
        <p className="lobby-subtitle" style={{ marginBottom: "20px" }}>
          Do you want to allow Jump (flying) if a party has left 3 elements?
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", maxWidth: "320px", margin: "0 auto" }}>
          <button
            className="action-btn"
            onClick={() => {
              if (flyingMode === false) onToggleFlying(); // Make sure it is true
              onSelectMode(pendingMode, { flyingMode: true });
            }}
          >
            Yes (Tournament Rule)
          </button>
          <button
            className="action-btn secondary-btn"
            onClick={() => {
              if (flyingMode === true) onToggleFlying(); // Make sure it is false
              onSelectMode(pendingMode, { flyingMode: false });
            }}
          >
            No (Rural Strict Rule)
          </button>
          <button className="action-btn secondary-btn" onClick={goBack} style={{ marginTop: "10px", borderColor: "rgba(255,255,255,0.08)" }}>
            Back
          </button>
        </div>
      </div>
    );
  }

  // STEP: PLAY ONLINE MENU
  if (currentStep === "online_select") {
    return (
      <div className="lobby-card glass-panel" style={{ maxWidth: "520px" }}>
        <div className="lobby-opt-icon">📡</div>
        <h2 className="clay-text-glow" style={{ fontSize: "1.6rem", margin: "10px 0" }}>Play Online</h2>
        <p className="lobby-subtitle" style={{ marginBottom: "20px" }}>
          Host a new match or join a friend's active room.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", maxWidth: "320px", margin: "0 auto" }}>
          <button className="action-btn" onClick={() => setCurrentStep("online_jump_question")}>
            📡 Host Online Game
          </button>
          <button className="action-btn secondary-btn" onClick={() => setCurrentStep("join_name")}>
            🔑 Join the Game
          </button>
          <button className="action-btn secondary-btn" onClick={goBack} style={{ marginTop: "10px", borderColor: "rgba(255,255,255,0.08)" }}>
            Back
          </button>
        </div>
      </div>
    );
  }

  // STEP: ONLINE RULES QUESTION (for Host)
  if (currentStep === "online_jump_question") {
    return (
      <div className="lobby-card glass-panel" style={{ maxWidth: "520px" }}>
        <div className="lobby-opt-icon">✈️</div>
        <h2 className="clay-text-glow" style={{ fontSize: "1.6rem", margin: "10px 0" }}>Rule Configuration</h2>
        <p className="lobby-subtitle" style={{ marginBottom: "20px" }}>
          Do you want to allow Jump (flying) if a party has left 3 elements?
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", maxWidth: "320px", margin: "0 auto" }}>
          <button
            className="action-btn"
            onClick={() => {
              if (flyingMode === false) onToggleFlying(); // force true
              setCurrentStep("host_name");
            }}
          >
            Yes (Tournament Rule)
          </button>
          <button
            className="action-btn secondary-btn"
            onClick={() => {
              if (flyingMode === true) onToggleFlying(); // force false
              setCurrentStep("host_name");
            }}
          >
            No (Rural Strict Rule)
          </button>
          <button className="action-btn secondary-btn" onClick={goBack} style={{ marginTop: "10px", borderColor: "rgba(255,255,255,0.08)" }}>
            Back
          </button>
        </div>
      </div>
    );
  }

  // STEP: HOST NICKNAME
  if (currentStep === "host_name") {
    return (
      <div className="lobby-card glass-panel" style={{ maxWidth: "480px" }}>
        <div className="lobby-opt-icon">👤</div>
        <h2 className="clay-text-glow">Your Nickname</h2>
        <p className="lobby-subtitle">Enter your name to create the game lobby.</p>
        
        <form onSubmit={handleHostSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "10px" }}>
          <input
            type="text"
            placeholder="Nickname (e.g. Master Player)"
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
            required
          />
          <div style={{ display: "flex", gap: "10px" }}>
            <button type="submit" className="action-btn" style={{ flex: 1 }}>
              Next (Enter Playground)
            </button>
            <button type="button" className="action-btn secondary-btn" onClick={goBack}>
              Back
            </button>
          </div>
        </form>
      </div>
    );
  }

  // STEP: GUEST NICKNAME
  if (currentStep === "join_name") {
    return (
      <div className="lobby-card glass-panel" style={{ maxWidth: "480px" }}>
        <div className="lobby-opt-icon">👤</div>
        <h2 className="clay-text-glow">Your Nickname</h2>
        <p className="lobby-subtitle">Enter your nickname to join the game.</p>
        
        <form onSubmit={(e) => {
          e.preventDefault();
          onJoinRoomSubmit(joinCode || "auto", guestNameInput.trim() || "Guest Player");
        }} style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "10px" }}>
          <input
            type="text"
            placeholder="Nickname (e.g. Challenger)"
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
            autoFocus
            required
          />
          <div style={{ display: "flex", gap: "10px" }}>
            <button type="submit" className="action-btn" style={{ flex: 1 }}>
              Join Match
            </button>
            <button type="button" className="action-btn secondary-btn" onClick={goBack}>
              Back
            </button>
          </div>
        </form>
      </div>
    );
  }

  // DEFAULT MAIN SCREEN: 3 Options
  return (
    <div className="lobby-card glass-panel">
      <div className="lobby-options" style={{ gridTemplateColumns: "1fr" }}>
        {/* Pass & Play */}
        <button
          className="lobby-opt-btn"
          onClick={() => {
            setPendingMode("local");
            setCurrentStep("jump_question");
          }}
          style={{ flexDirection: "row", justifyContent: "flex-start", gap: "25px", padding: "20px 30px" }}
        >
          <div className="lobby-opt-icon" style={{ fontSize: "2.5rem" }}>👥</div>
          <div style={{ textAlign: "left" }}>
            <div className="lobby-opt-title">Pass & Play</div>
            <div className="lobby-opt-desc" style={{ marginTop: "4px" }}>Play locally on the same screen.</div>
          </div>
        </button>

        {/* Vs Computer AI */}
        <button
          className="lobby-opt-btn"
          onClick={() => {
            setPendingMode("ai");
            setCurrentStep("jump_question");
          }}
          style={{ flexDirection: "row", justifyContent: "flex-start", gap: "25px", padding: "20px 30px" }}
        >
          <div className="lobby-opt-icon" style={{ fontSize: "2.5rem" }}>🤖</div>
          <div style={{ textAlign: "left" }}>
            <div className="lobby-opt-title">Vs Computer AI</div>
            <div className="lobby-opt-desc" style={{ marginTop: "4px" }}>Challenge the strategic computer opponent.</div>
          </div>
        </button>

        {/* Play Online */}
        <button
          className="lobby-opt-btn"
          onClick={() => {
            setCurrentStep("online-host"); // Wait, we set to online_select
            setCurrentStep("online_select");
          }}
          style={{ flexDirection: "row", justifyContent: "flex-start", gap: "25px", padding: "20px 30px" }}
        >
          <div className="lobby-opt-icon" style={{ fontSize: "2.5rem" }}>📡</div>
          <div style={{ textAlign: "left" }}>
            <div className="lobby-opt-title">Play Online</div>
            <div className="lobby-opt-desc" style={{ marginTop: "4px" }}>Host or Join an online game via shared room link/code.</div>
          </div>
        </button>
      </div>
    </div>
  );
}
