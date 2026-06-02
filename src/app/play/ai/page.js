"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
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
import { getBestMove } from "../../../lib/aiEngine";

function AIPlayContent() {
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

  const [aiDifficulty, setAiDifficulty] = useState("hard");
  const [soundMuted, setSoundMuted] = useState(false);

  const isAiThinking = useRef(false);

  // --- OFFLINE FOREST SPIRIT AI LOOP ---
  useEffect(() => {
    if (
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
  }, [gameState.currentPlayer, gameState.winner, gameState.pendingRemove]);

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
    if (gameState.currentPlayer === 1) {
      applyLocalMove(moveInfo);
    }
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
          player1Name="You"
          player2Name="Forest Spirit"
          flyingMode={flyingMode}
          onToggleFlying={() => {}}
          isOnline={false}
          isAIMode={true}
          aiDifficulty={aiDifficulty}
          onChangeAIDifficulty={setAiDifficulty}
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

export default function AIPlay() {
  return (
    <Suspense fallback={<div className="tigarh-app-wrapper"><h2 className="clay-text-glow">Loading Board...</h2></div>}>
      <AIPlayContent />
    </Suspense>
  );
}
