"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GameBoard from "../../../components/GameBoard";
import Dashboard from "../../../components/Dashboard";
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
      <h1 className="ancient-title" style={{ fontSize: "2.2rem", marginBottom: "15px" }}>9 Men's Morris</h1>

      <div className="dashboard-layout">
        <Dashboard
          gameState={gameState}
          player1Name="Player 1"
          player2Name="Player 2"
          flyingMode={flyingMode}
          onToggleFlying={() => {}} // Disabled in play
          isOnline={false}
          isAIMode={false}
          soundMuted={soundMuted}
          onToggleSound={() => setSoundMuted(!soundMuted)}
          onReset={handleReset}
        />

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
