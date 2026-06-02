import React, { useState, useEffect, useRef } from "react";
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

const SVG_BOARD_LINES = [
  { from: 0, to: 1 }, { from: 1, to: 2 },
  { from: 2, to: 3 }, { from: 3, to: 4 },
  { from: 4, to: 5 }, { from: 5, to: 6 },
  { from: 6, to: 7 }, { from: 7, to: 0 },
  { from: 8, to: 9 }, { from: 9, to: 10 },
  { from: 10, to: 11 }, { from: 11, to: 12 },
  { from: 12, to: 13 }, { from: 13, to: 14 },
  { from: 14, to: 15 }, { from: 15, to: 8 },
  { from: 16, to: 17 }, { from: 17, to: 18 },
  { from: 18, to: 19 }, { from: 19, to: 20 },
  { from: 20, to: 21 }, { from: 21, to: 22 },
  { from: 22, to: 23 }, { from: 23, to: 16 },
  { from: 1, to: 9 }, { from: 9, to: 17 },
  { from: 3, to: 11 }, { from: 11, to: 19 },
  { from: 5, to: 13 }, { from: 13, to: 21 },
  { from: 7, to: 15 }, { from: 15, to: 23 }
];

export default function GameBoard({
  gameState,
  myRole,
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

  // Drag and Drop States
  const [draggedNode, setDraggedNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const startPosRef = useRef({ x: 0, y: 0 });
  const wrapperRef = useRef(null);

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
        activeMills.push(`${mill[0]}-${mill[1]}`);
        activeMills.push(`${mill[1]}-${mill[2]}`);
        
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

  const isMyTurn = () => {
    if (winner) return false;
    if (!isOnline) return true;
    const mappedRole = currentPlayer === 1 ? "tigers" : "sticks";
    return mappedRole === myRole;
  };

  const getPlayerPhaseType = (playerIdx) => {
    if (piecesToPlace[playerIdx] > 0) return "placing";
    if (piecesActive[playerIdx] === 3 && flyingMode) return "flying";
    return "moving";
  };

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

    // B. Handling Placement Node Clicks
    const phase = getPlayerPhaseType(currentPlayer);
    if (phase === "placing") {
      if (board[nodeIndex] !== null) return; 

      if (!soundMuted) {
        if (currentPlayer === 1 && playPebbleThud) playPebbleThud();
        else if (currentPlayer === 2 && playStickClick) playStickClick();
      }

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
      // Tap-to-select support (click piece first, click empty node second)
      if (board[nodeIndex] === currentPlayer) {
        setSelectedNode(nodeIndex === selectedNode ? null : nodeIndex);
      } else if (selectedNode !== null && board[nodeIndex] === null) {
        if (!validDestinations.includes(nodeIndex)) return;

        if (!soundMuted) {
          if (currentPlayer === 1 && playPebbleThud) playPebbleThud();
          else if (currentPlayer === 2 && playStickClick) playStickClick();
        }

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

  // --- DRAG AND DROP HANDLERS (POINTER EVENTS) ---
  const handlePointerDown = (e, nodeIndex) => {
    if (!isMyTurn() || pendingRemove) return;
    const phase = getPlayerPhaseType(currentPlayer);
    if (phase === "placing") return; // Only drag placed elements during movement/flying
    if (board[nodeIndex] !== currentPlayer) return;

    setSelectedNode(nodeIndex);
    setDraggedNode(nodeIndex);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    setDragOffset({ x: 0, y: 0 });
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (draggedNode === null) return;
    const dx = e.clientX - startPosRef.current.x;
    const dy = e.clientY - startPosRef.current.y;
    setDragOffset({ x: dx, y: dy });
  };

  const handlePointerUp = (e, nodeIndex) => {
    if (draggedNode === null) return;
    e.target.releasePointerCapture(e.pointerId);

    // Calculate nearest node
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      
      // Calculate final absolute drops relative to container rectangle
      const dropX = e.clientX - rect.left;
      const dropY = e.clientY - rect.top;

      const dropPctX = (dropX / rect.width) * 100;
      const dropPctY = (dropY / rect.height) * 100;

      // Find nearest empty node within 12% Euclidean distance threshold
      let nearestNode = null;
      let minDistance = 999999;

      Object.keys(NODE_COORDINATES).forEach((key) => {
        const idx = parseInt(key, 10);
        const coord = NODE_COORDINATES[idx];

        // Only evaluate empty nodes (or original node if returned)
        if (board[idx] === null || idx === nodeIndex) {
          const dist = Math.sqrt(
            Math.pow(coord.x - dropPctX, 2) + Math.pow(coord.y - dropPctY, 2)
          );
          if (dist < minDistance && dist < 12) {
            minDistance = dist;
            nearestNode = idx;
          }
        }
      });

      // Try applying movement if node is found, empty, and is different
      if (nearestNode !== null && nearestNode !== nodeIndex) {
        const phase = getPlayerPhaseType(currentPlayer);
        const moves = getValidMoves(board, currentPlayer, nodeIndex, phase);

        if (moves.includes(nearestNode)) {
          if (!soundMuted) {
            if (currentPlayer === 1 && playPebbleThud) playPebbleThud();
            else if (currentPlayer === 2 && playStickClick) playStickClick();
          }

          const tempBoard = [...board];
          tempBoard[nodeIndex] = null;
          tempBoard[nearestNode] = currentPlayer;
          const isMillFormed = checkMill(tempBoard, currentPlayer, nearestNode);
          if (isMillFormed && !soundMuted && playTigaChime) {
            playTigaChime();
          }

          onMakeMove({
            type: "move",
            player: currentPlayer,
            from: nodeIndex,
            to: nearestNode
          });
        }
      }
    }

    setDraggedNode(null);
    setSelectedNode(null);
    setDragOffset({ x: 0, y: 0 });
  };

  const isLineInMill = (p1, p2) => {
    return activeMillLines.includes(`${p1}-${p2}`) || activeMillLines.includes(`${p2}-${p1}`);
  };

  return (
    <div className="board-outer-container">
      <div className="board-wrapper glass-panel" ref={wrapperRef}>
        
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
            
            const isEmpty = occupant === null;
            const isSelected = selectedNode === idx;
            const isValidDest = validDestinations.includes(idx);
            
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
            const isCurrentlyDragged = draggedNode === idx;
            
            const inMill = checkMill(board, occupant || 3 - currentPlayer, idx);
            
            let pieceClass = isPebble ? "piece pebble" : "piece stick";
            
            const shapeIdx = idx % 4;
            pieceClass += ` shape-${shapeIdx}`;
            
            if (isSelected && !isCurrentlyDragged) pieceClass += " active-selected";
            if (inMill && !isShattered) pieceClass += " mill-glow";
            if (isShattered) pieceClass += " captured-shatter";

            // Visual dragging offset transform inline
            const style = {
              left: `${coord.x}%`,
              top: `${coord.y}%`,
              userSelect: "none",
              touchAction: "none"
            };

            if (isCurrentlyDragged) {
              style.transform = `translate(calc(-50% + ${dragOffset.x}px), calc(-50% + ${dragOffset.y}px)) scale(1.15)`;
              style.zIndex = 1000;
              style.cursor = "grabbing";
            }

            return (
              <div
                key={idx}
                className={pieceClass}
                style={style}
                onPointerDown={(e) => handlePointerDown(e, idx)}
                onPointerMove={handlePointerMove}
                onPointerUp={(e) => handlePointerUp(e, idx)}
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

      {/* Mill (Tiga) Formed Alert Banner (Requested split highlight) */}
      {pendingRemove && isMyTurn() && (
        <div className="mill-highlight-banner">
          🔥 TIGA FORMED! Pick an opponent piece to capture.
        </div>
      )}
    </div>
  );
}
