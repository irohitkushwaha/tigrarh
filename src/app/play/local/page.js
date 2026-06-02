"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlayerDetailsBar, GameControlsHeader } from "../../../components/Dashboard";
import GameBoard from "../../../components/GameBoard";
import {
  playPebbleThud,
  playStickClick,
  playTigaChime,
  playCaptureShatter,
} from "../../../lib/soundSynth";
import {
  applyMove,
  isGameOver,
} from "../../../lib/gameLogic";

function LocalPlayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flyingMode = searchParams.get("flyingMode") !== "false";

  // Game state
  const [gameState, setGameState] = useState({
    board: Array(24).fill(null),
    currentPlayer: 1, // 1 (Stones/Pebbles), 2 (Sticks/Wood)
    piecesToPlace: { 1: 9, 2: 9 },
    piecesActive: { 1: 0, 2: 0 },
    pendingRemove: false,
    winner: null,
  });

  const [soundMuted, setSoundMuted] = useState(false);

  // Calculate captured counts
  const captured1 = 9 - gameState.piecesActive[2] - gameState.piecesToPlace[2]; // Captured sticks (taken by Player 1)
  const captured2 = 9 - gameState.piecesActive[1] - gameState.piecesToPlace[1]; // Captured pebbles (taken by Player 2)

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

  const handleMakeMove = (moveInfo) => {
    applyLocalMove(moveInfo);
  };

  const handleReset = () => {
    router.push("/");
  };

  return (
    <div className="tigarh-app-wrapper">
      <div className="dashboard-layout">
        {/* Game Controls widget in corner */}
        <GameControlsHeader
          soundMuted={soundMuted}
          onToggleSound={() => setSoundMuted(!soundMuted)}
          onReset={handleReset}
          isOnline={false}
        />

        {/* Top: Opponent Bar (Player 2 - Sticks) */}
        <PlayerDetailsBar
          name="Player 2"
          isTurn={gameState.currentPlayer === 2}
          piecesToPlaceCount={gameState.piecesToPlace[2]}
          piecesActiveCount={gameState.piecesActive[2]}
          capturedCount={captured2}
          icon="🪵"
          isMe={false}
        />

        {/* Central interactive GameBoard */}
        <GameBoard
          gameState={gameState}
          myRole="tigers"
          isOnline={false}
          flyingMode={flyingMode}
          onMakeMove={handleMakeMove}
          soundMuted={soundMuted}
          playPebbleThud={playPebbleThud}
          playStickClick={playStickClick}
          playTigaChime={playTigaChime}
          playCaptureShatter={playCaptureShatter}
        />

        {/* Bottom: Player Bar (Player 1 - Pebbles) */}
        <PlayerDetailsBar
          name="Player 1"
          isTurn={gameState.currentPlayer === 1}
          piecesToPlaceCount={gameState.piecesToPlace[1]}
          piecesActiveCount={gameState.piecesActive[1]}
          capturedCount={captured1}
          icon="⚪"
          isMe={true}
        />
      </div>
    </div>
  );
}

export default function LocalPlay() {
  return (
    <Suspense fallback={<div className="tigarh-app-wrapper"><h2 className="clay-text-glow">Loading Board...</h2></div>}>
      <LocalPlayContent />
    </Suspense>
  );
}
