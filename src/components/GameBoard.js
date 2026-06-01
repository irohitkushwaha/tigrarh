import React, { useState, useEffect } from "react";
import { getValidMoves, ADJACENCY_LIST, MILLS_LIST, checkMill } from "../lib/gameLogic";

export const NODE_COORDINATES = {
  0: { x: 5, y: 5 },
  1: { x: 50, y: 5 },
  2: { x: 95, y: 5 },
  3: { x: 95, y: 50 },
  4: { x: 95, y: 95 },
  5: { x: 50, y: 95 },
  6: { x: 5, y: 95 },
  7: { x: 5, y: 50 },

  8: { x: 20, y: 20 },
  9: { x: 50, y: 20 },
  10: { x: 80, y: 20 },
  11: { x: 80, y: 50 },
  12: { x: 80, y: 80 },
  13: { x: 50, y: 80 },
  14: { x: 20, y: 80 },
  15: { x: 20, y: 50 },

  16: { x: 35, y: 35 },
  17: { x: 50, y: 35 },
  18: { x: 65, y: 35 },
  19: { x: 65, y: 50 },
  20: { x: 65, y: 65 },
  21: { x: 50, y: 65 },
  22: { x: 35, y: 65 },
  23: { x: 35, y: 50 }
};

// Segments mapping for rendering individual SVG lines between nodes
const SVG_BOARD_LINES = [
  // Outer square
  { from: 0, to: 1 }, { from: 1, to: 2 },
  { from: 2, to: 3 }, { from: 3, to: 4 },
  { from: 4, to: 5 }, { from: 5, to: 6 },
  { from: 6, to: 7 }, { from: 7, to: 0 },
  // Middle square
  { from: 8, to: 9 }, { from: 9, to: 10 },
  { from: 10, to: 11 }, { from: 11, to: 12 },
  { from: 12, to: 13 }, { from: 13, to: 14 },
  { from: 14, to: 15 }, { from: 15, to: 8 },
  // Inner square
  { from: 16, to: 17 }, { from: 17, to: 18 },
  { from: 18, to: 19 }, { from: 19, to: 20 },
  { from: 20, to: 21 }, { from: 21, to: 22 },
  { from: 22, to: 23 }, { from: 23, to: 16 },
  // Cross cutting midpoint connectors
  { from: 1, to: 9 }, { from: 9, to: 17 },
  { from: 3, to: 11 }, { from: 11, to: 19 },
  { from: 5, to: 13 }, { from: 13, to: 21 },
  { from: 7, to: 15 }, { from: 15, to: 23 }
];

export default function GameBoard({
  gameState,
  myRole, // 'tigers' or 'sticks' (only used in online mode)
  isOnline = false,
  flyingMode = true,
  onMakeMove,
  soundMuted = false,
  playPebbleThud,
  playStickClick,
  playTigaChime,
  playCaptureShatter,
}) {
  const { board, currentPlayer, piecesToPlace, piecesActive, pendingRemove, winner } = gameState;

  const [selectedNode, setSelectedNode] = useState(null);
  const [shatteringNode, setShatteringNode] = useState(null);
  const [activeMillLines, setActiveMillLines] = useState([]);

  // Clear selections when turn switches
  useEffect(() => {
    setSelectedNode(null);
  }, [currentPlayer, pendingRemove]);

  // Compute fully active mill lines for highlighting
  useEffect(() => {
    const activeMills = [];
    MILLS_LIST.forEach((mill) => {
      const occupant1 = board[mill[0]];
      const occupant2 = board[mill[1]];
      const occupant3 = board[mill[2]];
      
      if (occupant1 !== null && occupant1 === occupant2 && occupant2 === occupant3) {
        // This mill is active! Add its node pairs
        activeMills.push(`${mill[0]}-${mill[1]}`);
        activeMills.push(`${mill[1]}-${mill[2]}`);
        
        // Also cover the wraparound for edges if applicable (e.g. 0-2 covers 0-1 and 1-2)
        if (mill[0] === 6 && mill[2] === 0) {
          activeMills.push(`6-7`);
          activeMills.push(`7-0`);
        } else if (mill[0] === 14 && mill[2] === 8) {
          activeMills.push(`14-15`);
          activeMills.push(`15-8`);
        } else if (mill[0] === 22 && mill[2] === 16) {
          activeMills.push(`22-23`);
          activeMills.push(`23-16`);
        }
      }
    });
    setActiveMillLines(activeMills);
  }, [board]);

  // Check if it's my turn (always true in local or vs AI, but checked in online mode)
  const isMyTurn = () => {
    if (winner) return false;
    if (!isOnline) return true;
    
    // In online mode:
    // Host is player 1 ('tigers'), Guest is player 2 ('sticks')
    const mappedRole = currentPlayer === 1 ? "tigers" : "sticks";
    return mappedRole === myRole;
  };

  const getPlayerPhaseType = (playerIdx) => {
    if (piecesToPlace[playerIdx] > 0) return "placing";
    if (piecesActive[playerIdx] === 3 && flyingMode) return "flying";
    return "moving";
  };

  // Get active valid moves for highlight
  const currentPhase = getPlayerPhaseType(currentPlayer);
  const validDestinations = selectedNode !== null 
    ? getValidMoves(board, currentPlayer, selectedNode, currentPhase)
    : [];

  const handleNodeClick = (nodeIndex) => {
    if (!isMyTurn()) return;
    
    const opponent = 3 - currentPlayer;

    // A. Handling Mill Capture
    if (pendingRemove) {
      if (board[nodeIndex] !== opponent) return; // Must capture opponent's piece
      
      // Enforce rule: cannot capture piece in mill unless all opponent's pieces are in mills
      const isTargetInMill = checkMill(board, opponent, nodeIndex);
      if (isTargetInMill) {
        const opponentPieces = [];
        for (let i = 0; i < 24; i++) {
          if (board[i] === opponent) {
            opponentPieces.push(i);
          }
        }
        const allOpponentPiecesInMills = opponentPieces.every(p => checkMill(board, opponent, p));
        if (!allOpponentPiecesInMills) {
          alert("You cannot capture a piece that is part of an active mill unless all opponent pieces are in mills.");
          return;
        }
      }

      // Execute shatter effect before submitting
      if (!soundMuted && playCaptureShatter) playCaptureShatter();
      setShatteringNode(nodeIndex);
      
      setTimeout(() => {
        setShatteringNode(null);
        onMakeMove({
          type: "capture",
          player: currentPlayer,
          to: nodeIndex
        });
      }, 650);
      
      return;
    }

    // B. Handling Normal Turns
    const phase = getPlayerPhaseType(currentPlayer);

    if (phase === "placing") {
      if (board[nodeIndex] !== null) return; // Must place on empty node

      // Play Sound
      if (!soundMuted) {
        if (currentPlayer === 1 && playPebbleThud) playPebbleThud();
        else if (currentPlayer === 2 && playStickClick) playStickClick();
      }

      // Form a temporary board update locally to check if a mill is completed
      const tempBoard = [...board];
      tempBoard[nodeIndex] = currentPlayer;
      const isMillFormed = checkMill(tempBoard, currentPlayer, nodeIndex);
      if (isMillFormed && !soundMuted && playTigaChime) {
        playTigaChime();
      }

      onMakeMove({
        type: "place",
        player: currentPlayer,
        to: nodeIndex
      });

    } else {
      // Moving or Flying Phase
      if (board[nodeIndex] === currentPlayer) {
        // Select one of your own pieces
        setSelectedNode(nodeIndex === selectedNode ? null : nodeIndex);
      } else if (selectedNode !== null && board[nodeIndex] === null) {
        // Attempting to move selected piece to empty node
        if (!validDestinations.includes(nodeIndex)) return;

        // Play Sound
        if (!soundMuted) {
          if (currentPlayer === 1 && playPebbleThud) playPebbleThud();
          else if (currentPlayer === 2 && playStickClick) playStickClick();
        }

        // Form a temporary board update locally to check if a mill is completed
        const tempBoard = [...board];
        tempBoard[selectedNode] = null;
        tempBoard[nodeIndex] = currentPlayer;
        const isMillFormed = checkMill(tempBoard, currentPlayer, nodeIndex);
        if (isMillFormed && !soundMuted && playTigaChime) {
          playTigaChime();
        }

        onMakeMove({
          type: "move",
          player: currentPlayer,
          from: selectedNode,
          to: nodeIndex
        });
        setSelectedNode(null);
      }
    }
  };

  // Helper to determine if a connection line is part of a mill
  const isLineInMill = (p1, p2) => {
    return activeMillLines.includes(`${p1}-${p2}`) || activeMillLines.includes(`${p2}-${p1}`);
  };

  return (
    <div className="board-outer-container">
      <div className="board-wrapper glass-panel">
        
        {/* SVG lines grid */}
        <svg className="board-svg" viewBox="0 0 100 100">
          {SVG_BOARD_LINES.map((line, idx) => {
            const coord1 = NODE_COORDINATES[line.from];
            const coord2 = NODE_COORDINATES[line.to];
            
            const isMill = isLineInMill(line.from, line.to);
            const lineClass = isMill 
              ? "board-line mill-active" 
              : "board-line";

            return (
              <line
                key={idx}
                x1={coord1.x}
                y1={coord1.y}
                x2={coord2.x}
                y2={coord2.y}
                className={lineClass}
              />
            );
          })}
        </svg>

        {/* Board intersections (Nodes / Pits) */}
        <div className="board-nodes-container">
          {Object.keys(NODE_COORDINATES).map((nodeStr) => {
            const idx = parseInt(nodeStr, 10);
            const coord = NODE_COORDINATES[idx];
            const occupant = board[idx];
            
            // CSS state flags
            const isEmpty = occupant === null;
            const isSelected = selectedNode === idx;
            const isValidDest = validDestinations.includes(idx);
            
            // Check capture highlight availability (glow eligible opponent pieces in capture phase)
            const isCaptureTarget = pendingRemove && isMyTurn() && occupant === (3 - currentPlayer);
            
            let nodeClass = "board-node";
            if (isEmpty) {
              if (isValidDest) nodeClass += " valid-move";
              else nodeClass += " empty";
            } else if (isSelected) {
              nodeClass += " selected";
            }

            return (
              <div
                key={idx}
                className={nodeClass}
                style={{
                  left: `${coord.x}%`,
                  top: `${coord.y}%`,
                  boxShadow: isCaptureTarget ? "0 0 15px #cc3333, inset 0 0 8px rgba(200, 30, 30, 0.4)" : undefined,
                  border: isCaptureTarget ? "2px solid #cc3333" : undefined,
                }}
                onClick={() => handleNodeClick(idx)}
              />
            );
          })}
        </div>

        {/* Piece Layer for sliding/rendering actual stones and sticks */}
        <div className="piece-layer">
          {board.map((occupant, idx) => {
            if (occupant === null && shatteringNode !== idx) return null;

            const coord = NODE_COORDINATES[idx];
            const isPebble = occupant === 1;
            const isStick = occupant === 2;
            const isSelected = selectedNode === idx;
            const isShattered = shatteringNode === idx;
            
            // Traditional in-mill glow representation
            const inMill = checkMill(board, occupant || 3 - currentPlayer, idx);
            
            let pieceClass = isPebble ? "piece pebble" : "piece stick";
            
            // Handcrafted shapes based on node index for variety
            const shapeIdx = idx % 4;
            pieceClass += ` shape-${shapeIdx}`;
            
            if (isSelected) pieceClass += " active-selected";
            if (inMill && !isShattered) pieceClass += " mill-glow";
            if (isShattered) pieceClass += " captured-shatter";

            return (
              <div
                key={idx}
                className={pieceClass}
                style={{
                  left: `${coord.x}%`,
                  top: `${coord.y}%`,
                }}
                onClick={() => handleNodeClick(idx)}
              >
                {isStick && (
                  <>
                    <div className="piece stick-cap-l" />
                    <div className="piece stick-cap-r" />
                    {shapeIdx % 2 === 0 && <div className="piece stick-knot" />}
                  </>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
