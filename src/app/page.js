"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Lobby from "../components/Lobby";
import RulesModal from "../components/RulesModal";

export default function Home() {
  const router = useRouter();

  const [flyingMode, setFlyingMode] = useState(true);
  const [soundMuted, setSoundMuted] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [playerId, setPlayerId] = useState("");
  const [initialJoinCode, setInitialJoinCode] = useState("");
  const [onlineError, setOnlineError] = useState(null);

  // Initialize unique playerId and handle direct join parameters
  useEffect(() => {
    if (typeof window !== "undefined") {
      let pId = localStorage.getItem("tigarh_player_id");
      if (!pId) {
        pId = "PLAYER_" + Math.random().toString(36).substring(2, 8).toUpperCase();
        localStorage.setItem("tigarh_player_id", pId);
      }
      setPlayerId(pId);

      const params = new URLSearchParams(window.location.search);
      const joinRoomId = params.get("join");
      if (joinRoomId) {
        // Automatically redirect guest to the dynamic online route page!
        router.push(`/play/online/${joinRoomId.toUpperCase()}`);
      }
    }
  }, [router]);

  const handleSelectMode = async (mode, options = {}) => {
    if (mode === "local") {
      router.push(`/play/local?flyingMode=${options.flyingMode !== false}`);
    } else if (mode === "ai") {
      router.push(`/play/ai?flyingMode=${options.flyingMode !== false}`);
    } else if (mode === "online-host") {
      try {
        const name = options.hostName || "Host Player";
        const res = await fetch("/api/game/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hostId: playerId,
            hostName: name,
            flyingMode: options.flyingMode,
          }),
        });
        const data = await res.json();
        if (data.success && data.room) {
          // Go directly to dynamic playground route, marking role as host
          router.push(`/play/online/${data.room.roomId}?role=host`);
        } else {
          setOnlineError(data.error || "Could not create online room.");
        }
      } catch (e) {
        setOnlineError("Network error creating online room.");
      }
    }
  };

  const handleJoinRoomSubmit = async (code, guestName) => {
    try {
      const res = await fetch("/api/game/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: code, guestId: playerId, guestName }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        // Go directly to dynamic playground route
        router.push(`/play/online/${code}`);
      } else {
        setOnlineError(data.error || "Room is full or doesn't exist.");
      }
    } catch (e) {
      setOnlineError("Network error joining online room.");
    }
  };

  const handleClearError = () => {
    setOnlineError(null);
    setInitialJoinCode("");
  };

  return (
    <div className="tigarh-app-wrapper">
      <h1 className="ancient-title">Nine Men's Morris</h1>

      <Lobby
        onSelectMode={handleSelectMode}
        roomId=""
        room={null}
        playerId={playerId}
        onKick={() => {}}
        onCancel={() => {}}
        error={onlineError}
        onClearError={handleClearError}
        onJoinRoomSubmit={handleJoinRoomSubmit}
        flyingMode={flyingMode}
        onToggleFlying={() => setFlyingMode(!flyingMode)}
        initialJoinCode={initialJoinCode}
      />

      <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "center" }}>
        <button className="action-btn" onClick={() => setRulesOpen(true)}>
          📖 Scroll of Rules
        </button>
        <button className="action-btn secondary-btn" onClick={() => setSoundMuted(!soundMuted)}>
          {soundMuted ? "🔇 Sound Muted" : "🔊 Sound Enabled"}
        </button>
      </div>

      <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}
