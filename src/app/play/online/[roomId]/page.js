"use client";

import React, { useState, useEffect, useRef, use, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlayerDetailsBar, GameControlsHeader } from "../../../../components/Dashboard";
import GameBoard from "../../../../components/GameBoard";
import {
  playPebbleThud,
  playStickClick,
  playTigaChime,
  playCaptureShatter,
} from "../../../../lib/soundSynth";
import {
  applyMove,
  isGameOver,
} from "../../../../lib/gameLogic";

function OnlinePlayContent({ params }) {
  const unwrappedParams = use(params);
  const roomId = unwrappedParams.roomId.toUpperCase();
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL flags
  const isHostQuery = searchParams.get("role") === "host";

  // Core identifiers
  const [playerId, setPlayerId] = useState("");
  const [myRole, setMyRole] = useState(isHostQuery ? "tigers" : "sticks");
  const [guestNameInput, setGuestNameInput] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingError, setOnboardingError] = useState("");

  // Game state
  const [gameState, setGameState] = useState({
    board: Array(24).fill(null),
    currentPlayer: 1, // 1 (Stones/Pebbles), 2 (Sticks/Wood)
    piecesToPlace: { 1: 9, 2: 9 },
    piecesActive: { 1: 0, 2: 0 },
    pendingRemove: false,
    winner: null,
  });

  const [flyingMode, setFlyingMode] = useState(true);
  const [player1Name, setPlayer1Name] = useState("Host Player");
  const [player2Name, setPlayer2Name] = useState("Waiting for Guest...");
  const [room, setRoom] = useState(null);
  const [soundMuted, setSoundMuted] = useState(false);

  // Calculate captured counts
  const captured1 = 9 - gameState.piecesActive[2] - gameState.piecesToPlace[2]; // Captured sticks (taken by Player 1 - Host)
  const captured2 = 9 - gameState.piecesActive[1] - gameState.piecesToPlace[1]; // Captured pebbles (taken by Player 2 - Guest)

  const [pendingLocalMove, setPendingLocalMove] = useState(null);

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const pendingLocalMoveRef = useRef(pendingLocalMove);
  pendingLocalMoveRef.current = pendingLocalMove;

  const pollingRef = useRef(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      let pId = localStorage.getItem("tigarh_player_id");
      if (!pId) {
        pId = "PLAYER_" + Math.random().toString(36).substring(2, 8).toUpperCase();
        localStorage.setItem("tigarh_player_id", pId);
      }
      setPlayerId(pId);
    }
  }, []);

  // --- VERIFY ROOM MEMBERSHIP ONCE PLAYER ID IS LOADED ---
  useEffect(() => {
    if (!playerId) return;
    checkRoomStatus();
  }, [playerId]);

  // --- POLL STATE DURING MATCH ---
  useEffect(() => {
    if (!showOnboarding && playerId && roomId) {
      fetchRoomState();
      pollingRef.current = setInterval(fetchRoomState, 1500);
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [showOnboarding, playerId, roomId]);

  const checkRoomStatus = async () => {
    try {
      const res = await fetch(`/api/game/state?roomId=${roomId}`);
      const data = await res.json();
      if (data.success && data.room) {
        const roomData = data.room;
        setRoom(roomData);
        setFlyingMode(roomData.flyingMode);

        // Check if I am the Host
        if (roomData.host.id === playerId) {
          setMyRole("tigers");
          setShowOnboarding(false);
          return;
        }

        // Check if I am the already-joined Guest
        if (roomData.guest && roomData.guest.id === playerId) {
          setMyRole("sticks");
          setShowOnboarding(false);
          return;
        }

        // If I am neither, and room is full: block
        if (roomData.guest && roomData.guest.id !== playerId) {
          setOnboardingError("This game room is already full (limit 2 players).");
          setShowOnboarding(true);
          return;
        }

        // If Guest slot is empty: show name onboarding screen
        setMyRole("sticks");
        setShowOnboarding(true);
      } else {
        setOnboardingError(data.error || "Room not found.");
        setShowOnboarding(true);
      }
    } catch (e) {
      setOnboardingError("Failed to connect to server.");
      setShowOnboarding(true);
    }
  };

  const fetchRoomState = async () => {
    try {
      // AVOID OVERWRITING ACTIVE LOCAL MILL TRANSACTION
      // If the local player has formed a mill and is selecting a piece to capture,
      // skip updating local gameState until the combined placement/movement and capture
      // transaction is completed and sent to the server.
      if (pendingLocalMoveRef.current || gameStateRef.current.pendingRemove) {
        return;
      }

      const res = await fetch(`/api/game/state?roomId=${roomId}`);
      const data = await res.json();
      if (data.success && data.room) {
        setRoom(data.room);
        setFlyingMode(data.room.flyingMode);

        if (data.room.status === "waiting" || data.room.status === "playing" || data.room.status === "finished") {
          const serverState = data.room.gameState;
          const mappedNodes = serverState.board.nodes.map(node => {
            if (node === "tiger") return 1;
            if (node === "stick") return 2;
            return null;
          });

          const mappedTurn = serverState.turn === "tigers" ? 1 : 2;
          const mappedWinner = serverState.winner === "tigers" ? 1 : serverState.winner === "sticks" ? 2 : null;

          const p1Placed = serverState.board.placedTigers || 0;
          const p2Placed = serverState.board.placedSticks || 0;

          // Double check transaction flag again before setting state
          if (pendingLocalMoveRef.current) return;

          setGameState({
            board: mappedNodes,
            currentPlayer: mappedTurn,
            piecesToPlace: {
              1: 9 - p1Placed,
              2: 9 - p2Placed,
            },
            piecesActive: {
              1: mappedNodes.filter(x => x === 1).length,
              2: mappedNodes.filter(x => x === 2).length,
            },
            pendingRemove: false, // Server authoritative
            winner: mappedWinner,
          });

          setPlayer1Name(data.room.host.name);
          setPlayer2Name(data.room.guest?.name || "Waiting for Guest...");
        } else if (data.room.status === "canceled") {
          alert("The Host has canceled this game room.");
          router.push("/");
        }
      }
    } catch (e) {
      console.warn("Error polling state:", e);
    }
  };

  const handleJoinOnboardingSubmit = async (e) => {
    e.preventDefault();
    if (!guestNameInput.trim()) return;

    try {
      const res = await fetch("/api/game/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          guestId: playerId,
          guestName: guestNameInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowOnboarding(false);
        setOnboardingError("");
        fetchRoomState();
        playStickClick();
      } else {
        setOnboardingError(data.error || "Could not join room.");
      }
    } catch (err) {
      setOnboardingError("Network error. Please try again.");
    }
  };

  const handleMakeMove = async (moveInfo) => {
    if (!room || !room.guest) return; // Wait for both players

    const activeRole = gameState.currentPlayer === 1 ? "tigers" : "sticks";
    if (activeRole !== myRole) return; // Not my turn

    if (moveInfo.type === "place" || moveInfo.type === "move") {
      const { board: newBoard, state: nextState } = applyMove(
        gameState.board,
        moveInfo,
        gameState
      );

      const checkGameOver = isGameOver(
        newBoard,
        nextState.currentPlayer,
        nextState.piecesToPlace[nextState.currentPlayer],
        nextState.piecesActive[nextState.currentPlayer]
      );

      if (checkGameOver.gameOver) {
        nextState.winner = checkGameOver.winner;
      }

      if (nextState.pendingRemove) {
        setGameState({
          ...gameState,
          board: newBoard,
          pendingRemove: true,
        });
        setPendingLocalMove(moveInfo);
        return;
      }

      await submitOnlineMove(moveInfo, newBoard, nextState.winner);
    }

    if (moveInfo.type === "capture") {
      if (!pendingLocalMove) return;

      const combinedMove = {
        ...pendingLocalMove,
        captured: moveInfo.to,
      };

      const finalBoard = [...gameState.board];
      finalBoard[pendingLocalMove.to] = gameState.currentPlayer;
      if (pendingLocalMove.from !== undefined && pendingLocalMove.from !== null) {
        finalBoard[pendingLocalMove.from] = null;
      }
      finalBoard[moveInfo.to] = null;

      const opp = 3 - gameState.currentPlayer;
      const oppCount = finalBoard.filter(x => x === opp).length;
      let onlineWinner = null;
      if (oppCount < 3) {
        onlineWinner = gameState.currentPlayer;
      }

      setPendingLocalMove(null);
      await submitOnlineMove(combinedMove, finalBoard, onlineWinner);
    }
  };

  const submitOnlineMove = async (move, nodes, resolvedWinner) => {
    try {
      const serverNodes = nodes.map(v => {
        if (v === 1) return "tiger";
        if (v === 2) return "stick";
        return null;
      });

      const hostPlaced = 9 - gameState.piecesToPlace[1] + (gameState.currentPlayer === 1 && move.type === "place" ? 1 : 0);
      const guestPlaced = 9 - gameState.piecesToPlace[2] + (gameState.currentPlayer === 2 && move.type === "place" ? 1 : 0);

      const body = {
        roomId,
        playerId,
        role: myRole,
        move: {
          from: move.from,
          to: move.to,
          captured: move.captured,
        },
        boardState: {
          nodes: serverNodes,
          placedTigers: hostPlaced,
          placedSticks: guestPlaced,
          capturedSticks: 9 - nodes.filter(x => x === 2).length - (9 - guestPlaced),
          phase: (hostPlaced >= 9 && guestPlaced >= 9) ? "movement" : "placement",
        },
        winner: resolvedWinner === 1 ? "tigers" : resolvedWinner === 2 ? "sticks" : null,
      };

      const res = await fetch("/api/game/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        fetchRoomState();
      }
    } catch (e) {
      console.error("Failed to submit move:", e);
    }
  };

  const handleReset = async () => {
    if (myRole === "tigers") {
      try {
        await fetch("/api/game/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, playerId }),
        });
      } catch (e) {}
    }
    router.push("/");
  };

  // Dynamic Position Mapping based on Role (Host on bottom, Guest on top, or vice versa)
  const isMeHost = myRole === "tigers";

  return (
    <div className="tigarh-app-wrapper" style={{ position: "relative" }}>
      <h1 className="ancient-title" style={{ fontSize: "2.2rem", marginBottom: "15px" }}>9 Men's Morris</h1>

      <div className="dashboard-layout" style={{ position: "relative" }}>
        {/* Game Controls widget in corner */}
        <GameControlsHeader
          soundMuted={soundMuted}
          onToggleSound={() => setSoundMuted(!soundMuted)}
          onReset={handleReset}
          roomId={roomId}
          room={room}
          isOnline={true}
        />

        {/* Top: Opponent Card */}
        <PlayerDetailsBar
          name={isMeHost ? player2Name : player1Name}
          isTurn={isMeHost ? (gameState.currentPlayer === 2) : (gameState.currentPlayer === 1)}
          piecesToPlaceCount={isMeHost ? gameState.piecesToPlace[2] : gameState.piecesToPlace[1]}
          piecesActiveCount={isMeHost ? gameState.piecesActive[2] : gameState.piecesActive[1]}
          capturedCount={isMeHost ? captured2 : captured1}
          icon={isMeHost ? "🪵" : "⚪"}
          isMe={false}
        />

        {/* Central Game Board */}
        <GameBoard
          gameState={gameState}
          myRole={myRole}
          isOnline={true}
          flyingMode={flyingMode}
          onMakeMove={handleMakeMove}
          soundMuted={soundMuted}
          playPebbleThud={playPebbleThud}
          playStickClick={playStickClick}
          playTigaChime={playTigaChime}
          playCaptureShatter={playCaptureShatter}
        />

        {/* Bottom: Mine Card */}
        <PlayerDetailsBar
          name={isMeHost ? player1Name : player2Name}
          isTurn={isMeHost ? (gameState.currentPlayer === 1) : (gameState.currentPlayer === 2)}
          piecesToPlaceCount={isMeHost ? gameState.piecesToPlace[1] : gameState.piecesToPlace[2]}
          piecesActiveCount={isMeHost ? gameState.piecesActive[1] : gameState.piecesActive[2]}
          capturedCount={isMeHost ? captured1 : captured2}
          icon={isMeHost ? "⚪" : "🪵"}
          isMe={true}
        />
      </div>

      {/* Guest Onboarding Overlay Modal */}
      {showOnboarding && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(4px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 3000
        }}>
          <div className="lobby-card glass-panel" style={{ maxWidth: "480px", width: "90%", margin: "0 20px" }}>
            <div className="lobby-opt-icon">{onboardingError ? "⚠️" : "👤"}</div>
            <h2 className="clay-text-glow">{onboardingError ? "Room Error" : "Join Game Room"}</h2>
            <p className="lobby-subtitle" style={{ margin: "5px 0 15px" }}>
              {onboardingError || `Enter your nickname to join Room ${roomId}`}
            </p>

            {onboardingError ? (
              <button className="action-btn" onClick={() => router.push("/")} style={{ width: "100%" }}>
                Exit to Lobby
              </button>
            ) : (
              <form onSubmit={handleJoinOnboardingSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
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
                  <button type="button" className="action-btn secondary-btn" onClick={() => router.push("/")}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OnlinePlay({ params }) {
  return (
    <Suspense fallback={<div className="tigarh-app-wrapper"><h2 className="clay-text-glow">Loading Room...</h2></div>}>
      <OnlinePlayContent params={params} />
    </Suspense>
  );
}
