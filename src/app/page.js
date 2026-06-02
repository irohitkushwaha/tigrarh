"use client";

import React, { useState, useEffect, useRef } from "react";
import Lobby from "../components/Lobby";
import GameBoard from "../components/GameBoard";
import Dashboard from "../components/Dashboard";
import RulesModal from "../components/RulesModal";
import {
  playPebbleThud,
  playStickClick,
  playTigaChime,
  playCaptureShatter,
} from "../lib/soundSynth";
import {
  validateMove,
  applyMove,
  isGameOver,
  checkMill,
} from "../lib/gameLogic";
import { getBestMove } from "../lib/aiEngine";

export default function Home() {
  // --- STATE ---
  const [gameMode, setGameMode] = useState("lobby"); // "lobby", "local", "ai", "online-host", "online-active"
  
  // Game state matching components & lib
  const [gameState, setGameState] = useState({
    board: Array(24).fill(null),
    currentPlayer: 1, // 1 (Stones/Pebbles), 2 (Sticks/Wood)
    piecesToPlace: { 1: 9, 2: 9 },
    piecesActive: { 1: 0, 2: 0 },
    pendingRemove: false,
    winner: null,
  });

  // Settings & UI state
  const [flyingMode, setFlyingMode] = useState(true);
  const [aiDifficulty, setAiDifficulty] = useState("hard");
  const [soundMuted, setSoundMuted] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  
  // Names
  const [player1Name, setPlayer1Name] = useState("Player 1");
  const [player2Name, setPlayer2Name] = useState("Player 2");

  // Online Multiplayer State
  const [roomId, setRoomId] = useState("");
  const [room, setRoom] = useState(null);
  const [playerId, setPlayerId] = useState("");
  const [myRole, setMyRole] = useState("tigers"); // 'tigers' (Pebbles) or 'sticks' (Wood)
  const [onlineError, setOnlineError] = useState(null);
  const [pendingLocalMove, setPendingLocalMove] = useState(null); // combined move placeholder for online mills

  // Refs for polling loops
  const pollingRef = useRef(null);

  // --- PERSISTENT PLAYER ID ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      let pId = localStorage.getItem("tigarh_player_id");
      if (!pId) {
        pId = "PLAYER_" + Math.random().toString(36).substring(2, 8).toUpperCase();
        localStorage.setItem("tigarh_player_id", pId);
      }
      setPlayerId(pId);
      
      // Auto-join from URL parameter if present
      const params = new URLSearchParams(window.location.search);
      const joinRoomId = params.get("join");
      if (joinRoomId) {
        // We will trigger Lobby join state
        setGameMode("lobby");
      }
    }
  }, []);

  // --- ONLINE MULTIPLAYER POLLING LOOP ---
  useEffect(() => {
    if (gameMode.startsWith("online") && roomId) {
      // Start polling room state every 1.5 seconds as smart fallback
      fetchRoomState();
      pollingRef.current = setInterval(fetchRoomState, 1500);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [gameMode, roomId]);

  const fetchRoomState = async () => {
    if (!roomId) return;
    try {
      const res = await fetch(`/api/game/state?roomId=${roomId}`);
      const data = await res.json();
      if (data.success && data.room) {
        setRoom(data.room);
        
        // If room state is waiting or playing, show active playground
        if (data.room.status === "waiting" || data.room.status === "playing" || data.room.status === "finished") {
          if (gameMode !== "online-active") {
            setGameMode("online-active");
          }
          
          // Map server board variables back to client gameState
          const serverState = data.room.gameState;
          const mappedNodes = serverState.board.nodes.map(node => {
            if (node === "tiger") return 1;
            if (node === "stick") return 2;
            return null;
          });

          // Server turn: 'tigers' -> 1, 'sticks' -> 2
          const mappedTurn = serverState.turn === "tigers" ? 1 : 2;
          const mappedWinner = serverState.winner === "tigers" ? 1 : serverState.winner === "sticks" ? 2 : null;

          const p1Placed = serverState.board.placedTigers || 0;
          const p2Placed = serverState.board.placedSticks || 0;

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
            pendingRemove: false, // The server handles completed transactions
            winner: mappedWinner,
          });

          setPlayer1Name(data.room.host.name);
          setPlayer2Name(data.room.guest?.name || "Waiting for Guest...");
        } else if (data.room.status === "canceled") {
          setOnlineError("The Host has canceled this game room.");
          handleReset();
        }
      }
    } catch (e) {
      console.warn("Failed to poll room state:", e);
    }
  };

  // --- OFFLINE FOREST SPIRIT AI LOOP ---
  useEffect(() => {
    if (
      gameMode === "ai" &&
      gameState.currentPlayer === 2 &&
      !gameState.winner &&
      !isAiThinking.current
    ) {
      isAiThinking.current = true;
      const aiTimer = setTimeout(() => {
        triggerAiMove();
      }, 900);
      return () => clearTimeout(aiTimer);
    }
  }, [gameState.currentPlayer, gameMode, gameState.winner, gameState.pendingRemove]);

  const isAiThinking = useRef(false);

  const triggerAiMove = () => {
    isAiThinking.current = false;
    const aiMove = getBestMove(
      gameState.board,
      2,
      gameState,
      aiDifficulty
    );

    if (aiMove) {
      applyLocalMove(aiMove);
    }
  };

  // --- LOCAL GAMEPLAY TRANSFORMATIONS ---

  const applyLocalMove = (moveInfo) => {
    const { board: newBoard, state: nextState } = applyMove(
      gameState.board,
      moveInfo,
      gameState
    );

    // Evaluate Win/Loss Conditions
    const checkGameOver = isGameOver(
      newBoard,
      nextState.currentPlayer,
      nextState.piecesToPlace[nextState.currentPlayer],
      nextState.piecesActive[nextState.currentPlayer]
    );

    if (checkGameOver.gameOver) {
      nextState.winner = checkGameOver.winner;
    }

    setGameState({
      board: newBoard,
      currentPlayer: nextState.currentPlayer,
      piecesToPlace: nextState.piecesToPlace,
      piecesActive: nextState.piecesActive,
      pendingRemove: nextState.pendingRemove,
      winner: nextState.winner,
    });
  };

  // Core gameplay dispatcher triggered by clicking nodes on GameBoard
  const handleMakeMove = async (moveInfo) => {
    // --- 1. LOCAL & VS AI GAME MODES ---
    if (gameMode === "local" || gameMode === "ai") {
      applyLocalMove(moveInfo);
      return;
    }

    // --- 2. ONLINE MULTIPLAYER GAME MODE ---
    if (gameMode === "online-active") {
      // Prevent making a move if guest is not connected
      if (!room || !room.guest) return;

      const activeRole = turnToRole(gameState.currentPlayer);
      if (activeRole !== myRole) return; // Not my turn!

      // Case A: Placing/Moving move
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

        // If a mill is formed, we LOCK the board locally and wait for the capture click
        if (nextState.pendingRemove) {
          setGameState({
            ...gameState,
            board: newBoard,
            pendingRemove: true, // enter local capture phase
          });
          setPendingLocalMove(moveInfo); // hold placement/movement reference
          return;
        }

        // Otherwise submit immediately to server
        await submitOnlineMove(moveInfo, newBoard, nextState.winner);
      }
      
      // Case B: Capture move clicked
      if (moveInfo.type === "capture") {
        if (!pendingLocalMove) return;

        const combinedMove = {
          ...pendingLocalMove,
          captured: moveInfo.to, // Record captured node
        };

        const finalBoard = [...gameState.board];
        finalBoard[pendingLocalMove.to] = gameState.currentPlayer;
        if (pendingLocalMove.from !== undefined && pendingLocalMove.from !== null) {
          finalBoard[pendingLocalMove.from] = null;
        }
        finalBoard[moveInfo.to] = null; // remove captured piece

        // Evaluate game over after capture
        const opp = 3 - gameState.currentPlayer;
        const oppCount = finalBoard.filter(x => x === opp).length;
        let onlineWinner = null;
        if (oppCount < 3) {
          onlineWinner = gameState.currentPlayer;
        }

        setPendingLocalMove(null);
        await submitOnlineMove(combinedMove, finalBoard, onlineWinner);
      }
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
        fetchRoomState(); // instant refresh
      }
    } catch (e) {
      console.error("Failed to submit move to server:", e);
    }
  };

  // Helper mappings
  const turnToRole = (tNum) => (tNum === 1 ? "tigers" : "sticks");

  // --- LOBBY ACTIONS ---

  const handleSelectMode = async (mode, options = {}) => {
    if (mode === "local") {
      setPlayer1Name("Player 1");
      setPlayer2Name("Player 2");
      setGameMode("local");
      setFlyingMode(options.hasOwnProperty("flyingMode") ? options.flyingMode : true);
      setGameState({
        board: Array(24).fill(null),
        currentPlayer: 1,
        piecesToPlace: { 1: 9, 2: 9 },
        piecesActive: { 1: 0, 2: 0 },
        pendingRemove: false,
        winner: null,
      });
      playPebbleThud();
    } else if (mode === "ai") {
      setPlayer1Name("You");
      setPlayer2Name("Forest Spirit");
      setGameMode("ai");
      setFlyingMode(options.hasOwnProperty("flyingMode") ? options.flyingMode : true);
      setGameState({
        board: Array(24).fill(null),
        currentPlayer: 1,
        piecesToPlace: { 1: 9, 2: 9 },
        piecesActive: { 1: 0, 2: 0 },
        pendingRemove: false,
        winner: null,
      });
      playPebbleThud();
    } else if (mode === "online-host") {
      // Create secure online room
      try {
        const name = options.hostName || "Host Player";
        const res = await fetch("/api/game/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            hostId: playerId, 
            hostName: name,
            flyingMode: options.flyingMode 
          }),
        });
        const data = await res.json();
        if (data.success && data.room) {
          setRoomId(data.room.roomId);
          setRoom(data.room);
          setMyRole("tigers"); // Host is Pebbles
          setFlyingMode(data.room.flyingMode); // Lock rules locally
          setPlayer1Name(name);
          setPlayer2Name("Waiting for Guest...");
          setGameMode("online-active"); // Go directly to playground
          playPebbleThud();
        } else {
          setOnlineError(data.error || "Could not create online room.");
        }
      } catch (e) {
        setOnlineError("Network error creating online room.");
      }
    } else if (mode === "online-active") {
      // Host clicks start match
      if (roomId) {
        setGameMode("online-active");
        fetchRoomState();
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
        setRoomId(data.room.roomId);
        setRoom(data.room);
        setMyRole("sticks"); // Guest is Wood
        setGameMode("online-active");
        playStickClick();
      } else {
        setOnlineError(data.error || "Room is full or doesn't exist.");
      }
    } catch (e) {
      setOnlineError("Network error joining online room.");
    }
  };

  const handleKick = async () => {
    if (!roomId) return;
    try {
      await fetch("/api/game/kick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, playerId }),
      });
      fetchRoomState();
    } catch (e) {
      console.warn("Failed to kick guest:", e);
    }
  };

  const handleCancel = async () => {
    if (!roomId) return;
    try {
      await fetch("/api/game/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, playerId }),
      });
      handleReset();
    } catch (e) {
      console.warn("Failed to cancel lobby:", e);
    }
  };

  // State to hold join parameter from URL
  const [initialJoinCode, setInitialJoinCode] = useState("");

  // --- PERSISTENT PLAYER ID & JOIN URL READING ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      let pId = localStorage.getItem("tigarh_player_id");
      if (!pId) {
        pId = "PLAYER_" + Math.random().toString(36).substring(2, 8).toUpperCase();
        localStorage.setItem("tigarh_player_id", pId);
      }
      setPlayerId(pId);
      
      // Auto-join from URL parameter if present
      const params = new URLSearchParams(window.location.search);
      const joinRoomId = params.get("join");
      if (joinRoomId) {
        setInitialJoinCode(joinRoomId.toUpperCase());
        setGameMode("lobby");
      }
    }
  }, []);

  const handleReset = () => {
    setGameState({
      board: Array(24).fill(null),
      currentPlayer: 1,
      piecesToPlace: { 1: 9, 2: 9 },
      piecesActive: { 1: 0, 2: 0 },
      pendingRemove: false,
      winner: null,
    });
    setRoomId("");
    setRoom(null);
    setInitialJoinCode("");
    setGameMode("lobby");
    setPendingLocalMove(null);
    playPebbleThud();
  };

  const handleClearError = () => {
    setOnlineError(null);
    handleReset();
  };

  return (
    <div className="tigarh-app-wrapper">
      {gameMode === "lobby" ? (
        <>
          <h1 className="ancient-title">Nine Men's Morris</h1>
          <p style={{ fontFamily: "var(--font-outfit)", fontSize: "0.95rem", opacity: 0.75, textTransform: "uppercase", letterSpacing: "0.22em", margin: "5px 0 25px", color: "var(--color-gold)", textShadow: "0 0 10px rgba(228,114,52,0.3)" }}>
            also known as
          </p>
        </>
      ) : (
        <h1 className="ancient-title" style={{ fontSize: "2.2rem", marginBottom: "15px" }}>9 Men's Morris</h1>
      )}

      {/* Mode selectors & Lobby wrapper */}
      {gameMode === "lobby" || gameMode === "online-host" ? (
        <Lobby
          onSelectMode={handleSelectMode}
          roomId={roomId}
          room={room}
          playerId={playerId}
          onKick={handleKick}
          onCancel={handleCancel}
          error={onlineError}
          onClearError={handleClearError}
          onJoinRoomSubmit={handleJoinRoomSubmit}
          flyingMode={flyingMode}
          onToggleFlying={() => setFlyingMode(!flyingMode)}
          initialJoinCode={initialJoinCode}
        />
      ) : (
        <div className="dashboard-layout">
          {/* Dashboard control sidebar */}
          <Dashboard
            gameState={gameState}
            player1Name={player1Name}
            player2Name={player2Name}
            flyingMode={flyingMode}
            onToggleFlying={() => setFlyingMode(!flyingMode)}
            isOnline={gameMode.startsWith("online")}
            isAIMode={gameMode === "ai"}
            aiDifficulty={aiDifficulty}
            onChangeAIDifficulty={setAiDifficulty}
            soundMuted={soundMuted}
            onToggleSound={() => setSoundMuted(!soundMuted)}
            onReset={handleReset}
            roomId={roomId}
            room={room}
            isHost={room && room.host.id === playerId}
          />

          {/* Interactive GameBoard wrapper */}
          <GameBoard
            gameState={gameState}
            myRole={myRole}
            isOnline={gameMode.startsWith("online")}
            flyingMode={flyingMode}
            onMakeMove={handleMakeMove}
            soundMuted={soundMuted}
            playPebbleThud={playPebbleThud}
            playStickClick={playStickClick}
            playTigaChime={playTigaChime}
            playCaptureShatter={playCaptureShatter}
          />
        </div>
      )}

      {/* Rules overlay button */}
      {gameMode === "lobby" && (
        <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "center" }}>
          <button className="action-btn" onClick={() => setRulesOpen(true)}>
            📖 Scroll of Rules
          </button>
          <button className="action-btn secondary-btn" onClick={() => setSoundMuted(!soundMuted)}>
            {soundMuted ? "🔇 Sound Muted" : "🔊 Sound Enabled"}
          </button>
        </div>
      )}

      {/* Scrolling Rules overlay */}
      <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}
