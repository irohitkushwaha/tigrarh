/**
 * Tigarh (Nine Men's Morris Variant) - Core Game Logic & Rules Engine
 * 
 * This module is designed to be fully stateless, pure, and modular. It represents
 * the board as an array of 24 elements, where each index maps to a specific node on
 * the three concentric squares (outer, middle, inner) of the game board.
 * 
 * Board Nodes Index Mapping:
 * - Outer Square:
 *   0: top-left, 1: top-middle, 2: top-right,
 *   3: middle-right, 4: bottom-right, 5: bottom-middle,
 *   6: bottom-left, 7: middle-left.
 * - Middle Square:
 *   8: top-left, 9: top-middle, 10: top-right,
 *   11: middle-right, 12: bottom-right, 13: bottom-middle,
 *   14: bottom-left, 15: middle-left.
 * - Inner Square:
 *   16: top-left, 17: top-middle, 18: top-right,
 *   19: middle-right, 20: bottom-right, 21: bottom-middle,
 *   22: bottom-left, 23: middle-left.
 */

// 1. Adjacency List: Maps each node index (0 to 23) to its direct connected neighbors.
export const ADJACENCY_LIST = {
  0: [1, 7],
  1: [0, 2, 9],
  2: [1, 3],
  3: [2, 4, 11],
  4: [3, 5],
  5: [4, 6, 13],
  6: [5, 7],
  7: [6, 0, 15],
  
  8: [9, 15],
  9: [8, 10, 1, 17],
  10: [9, 11],
  11: [10, 12, 3, 19],
  12: [11, 13],
  13: [12, 14, 5, 21],
  14: [13, 15],
  15: [14, 8, 7, 23],
  
  16: [17, 23],
  17: [16, 18, 9],
  18: [17, 19],
  19: [18, 20, 11],
  20: [19, 21],
  21: [20, 22, 13],
  22: [21, 23],
  23: [22, 16, 15]
};

// 2. Mills List: Array of all 16 valid horizontal and vertical lines of 3 (mills or Tigas).
export const MILLS_LIST = [
  // Outer Square Edges
  [0, 1, 2],
  [2, 3, 4],
  [4, 5, 6],
  [6, 7, 0],
  
  // Middle Square Edges
  [8, 9, 10],
  [10, 11, 12],
  [12, 13, 14],
  [14, 15, 8],
  
  // Inner Square Edges
  [16, 17, 18],
  [18, 19, 20],
  [20, 21, 22],
  [22, 23, 16],
  
  // Midpoint Cross-Cutting Connectors
  [1, 9, 17],
  [3, 11, 19],
  [5, 13, 21],
  [7, 15, 23]
];

/**
 * Dynamically computes a player's current game phase.
 * 
 * @param {number} piecesToPlace - Number of pieces the player has left to place.
 * @param {number} piecesActive - Number of the player's pieces currently on the board.
 * @returns {'placing' | 'moving' | 'flying'}
 */
export function getPlayerPhase(piecesToPlace, piecesActive) {
  if (piecesToPlace > 0) {
    return 'placing';
  } else if (piecesActive === 3) {
    return 'flying';
  } else {
    return 'moving';
  }
}

/**
 * Checks if placing or moving a piece to `nodeIndex` forms a new line of three for that player.
 * Since this checks a static board state, a mill is formed if the node belongs to any line of 3
 * where all three nodes are occupied by the specified player.
 * 
 * @param {Array} board - The 24-element board array (null, 1, or 2).
 * @param {number} player - The player index (1 or 2).
 * @param {number} nodeIndex - The index of the node to check (0 to 23).
 * @returns {boolean} True if a mill (Tiga) is formed/exists containing nodeIndex.
 */
export function checkMill(board, player, nodeIndex) {
  if (nodeIndex === null || nodeIndex === undefined || nodeIndex < 0 || nodeIndex > 23) {
    return false;
  }
  return MILLS_LIST.some(mill => 
    mill.includes(nodeIndex) && 
    mill.every(idx => board[idx] === player)
  );
}

/**
 * Returns valid move target nodes from a specified nodeIndex.
 * 
 * @param {Array} board - The 24-element board array (null, 1, or 2).
 * @param {number} player - The player index (1 or 2).
 * @param {number} nodeIndex - The index of the source node (0 to 23).
 * @param {'placing' | 'moving' | 'flying'} phase - The player's current phase.
 * @returns {Array<number>} An array of valid destination node indices.
 */
export function getValidMoves(board, player, nodeIndex, phase) {
  if (phase === 'placing') {
    // During placing phase, you place pieces on any empty node.
    // Moving from a specific node is not a valid action.
    if (nodeIndex === null || nodeIndex === undefined) {
      return board.map((val, idx) => val === null ? idx : null).filter(val => val !== null);
    }
    return [];
  }
  
  if (phase === 'moving') {
    if (nodeIndex === null || nodeIndex === undefined) {
      return [];
    }
    const neighbors = ADJACENCY_LIST[nodeIndex] || [];
    return neighbors.filter(neighbor => board[neighbor] === null);
  }
  
  if (phase === 'flying') {
    // Can fly to any empty node on the board
    return board.map((val, idx) => val === null ? idx : null).filter(val => val !== null);
  }
  
  return [];
}

/**
 * Validates a proposed placement, movement, or capture move.
 * 
 * @param {Array} board - The 24-element board array (null, 1, or 2).
 * @param {Object} moveInfo - Object describing the move.
 * @param {string} moveInfo.type - 'place', 'move', or 'capture'/'remove'.
 * @param {number} moveInfo.player - The player making the move (1 or 2).
 * @param {number} [moveInfo.from] - The source node index (required for 'move').
 * @param {number} moveInfo.to - The destination or capture node index.
 * @param {Object} state - The current game state.
 * @param {number} state.currentPlayer - The player whose turn it is.
 * @param {Object} state.piecesToPlace - Map of pieces remaining to place (e.g. {1: 9, 2: 9}).
 * @param {Object} state.piecesActive - Map of active pieces on board (e.g. {1: 0, 2: 0}).
 * @param {boolean} state.pendingRemove - Whether a mill was formed and a capture is required.
 * @returns {Object} { valid: boolean, error: string }
 */
export function validateMove(board, moveInfo, state) {
  const { type, player, from, to } = moveInfo;
  
  // 1. Verify player's turn
  if (player !== state.currentPlayer) {
    return { valid: false, error: `It is Player ${state.currentPlayer}'s turn, not Player ${player}'s.` };
  }
  
  const opponent = 3 - player;
  
  // 2. Validate Capture Moves (when pendingRemove is true)
  if (state.pendingRemove) {
    if (type !== 'capture' && type !== 'remove') {
      return { valid: false, error: 'A mill was formed. You must capture an opponent\'s piece.' };
    }
    
    if (to === null || to === undefined || to < 0 || to > 23) {
      return { valid: false, error: 'Invalid capture position.' };
    }
    
    if (board[to] !== opponent) {
      return { valid: false, error: 'You can only capture an opponent\'s piece.' };
    }
    
    // Check if the piece is in a mill. Pieces in mills cannot be captured 
    // unless the opponent only has pieces that are part of mills.
    const isTargetInMill = checkMill(board, opponent, to);
    if (isTargetInMill) {
      const opponentPieces = [];
      for (let i = 0; i < 24; i++) {
        if (board[i] === opponent) {
          opponentPieces.push(i);
        }
      }
      const allOpponentPiecesInMills = opponentPieces.every(p => checkMill(board, opponent, p));
      if (!allOpponentPiecesInMills) {
        return { 
          valid: false, 
          error: 'You cannot capture a piece that is part of an active mill unless all opponent pieces are in mills.' 
        };
      }
    }
    
    return { valid: true };
  }
  
  // 3. Prevent capturing during normal placement/movement turns
  if (type === 'capture' || type === 'remove') {
    return { valid: false, error: 'You cannot capture a piece right now.' };
  }
  
  // 4. Validate Placement Moves
  if (type === 'place') {
    if (state.piecesToPlace[player] <= 0) {
      return { valid: false, error: 'No pieces left to place. You must move an existing piece.' };
    }
    
    if (to === null || to === undefined || to < 0 || to > 23) {
      return { valid: false, error: 'Invalid placement position.' };
    }
    
    if (board[to] !== null) {
      return { valid: false, error: 'The destination node is already occupied.' };
    }
    
    return { valid: true };
  }
  
  // 5. Validate Movement Moves
  if (type === 'move') {
    if (state.piecesToPlace[player] > 0) {
      return { valid: false, error: 'You must place all 9 pieces before moving.' };
    }
    
    if (from === null || from === undefined || from < 0 || from > 23) {
      return { valid: false, error: 'Invalid source position.' };
    }
    
    if (to === null || to === undefined || to < 0 || to > 23) {
      return { valid: false, error: 'Invalid destination position.' };
    }
    
    if (board[from] !== player) {
      return { valid: false, error: 'You do not own the piece at the source position.' };
    }
    
    if (board[to] !== null) {
      return { valid: false, error: 'The destination node is already occupied.' };
    }
    
    const phase = getPlayerPhase(state.piecesToPlace[player], state.piecesActive[player]);
    if (phase === 'moving') {
      const neighbors = ADJACENCY_LIST[from] || [];
      if (!neighbors.includes(to)) {
        return { valid: false, error: 'You can only move to adjacent nodes during the moving phase.' };
      }
    }
    
    return { valid: true };
  }
  
  return { valid: false, error: 'Unknown move type.' };
}

/**
 * Checks win/loss conditions for the game.
 * A player loses if they have fewer than 3 pieces left (after placing phase)
 * or if they have no legal moves on their turn (blocked).
 * 
 * @param {Array} board - The 24-element board array (null, 1, or 2).
 * @param {number} player - The player index whose turn it is to act (1 or 2).
 * @param {number} piecesRemaining - The number of pieces the player has left to place.
 * @param {number} boardPiecesCount - The number of pieces the player has currently on the board.
 * @returns {Object} { gameOver: boolean, winner: number | null, reason: string }
 */
export function isGameOver(board, player, piecesRemaining, boardPiecesCount) {
  // During placing phase, players cannot be eliminated or blocked
  if (piecesRemaining > 0) {
    return { gameOver: false, winner: null, reason: '' };
  }
  
  // 1. Elimination: Player has fewer than 3 pieces left
  if (boardPiecesCount < 3) {
    const winner = 3 - player;
    return {
      gameOver: true,
      winner: winner,
      reason: `Player ${player} has less than 3 pieces remaining.`
    };
  }
  
  // 2. Blocked: Player has no valid moves
  const phase = getPlayerPhase(piecesRemaining, boardPiecesCount);
  let hasLegalMoves = false;
  
  for (let i = 0; i < 24; i++) {
    if (board[i] === player) {
      const validMoves = getValidMoves(board, player, i, phase);
      if (validMoves.length > 0) {
        hasLegalMoves = true;
        break;
      }
    }
  }
  
  if (!hasLegalMoves) {
    const winner = 3 - player;
    return {
      gameOver: true,
      winner: winner,
      reason: `Player ${player} is blocked with no legal moves.`
    };
  }
  
  return { gameOver: false, winner: null, reason: '' };
}

/**
 * Statelessly applies a move to the board and state, returning the new board and state copies.
 * Correctly handles turn switching, mill detection, and piece tracking.
 * 
 * @param {Array} board - The 24-element board array.
 * @param {Object} moveInfo - Object describing the move (type, player, from, to).
 * @param {Object} state - The current game state.
 * @returns {Object} { board: Array, state: Object }
 */
export function applyMove(board, moveInfo, state) {
  const newBoard = [...board];
  const newState = {
    currentPlayer: state.currentPlayer,
    piecesToPlace: { ...state.piecesToPlace },
    piecesActive: { ...state.piecesActive },
    pendingRemove: state.pendingRemove
  };
  
  const { type, player, from, to } = moveInfo;
  const opponent = 3 - player;
  
  if (type === 'place') {
    newBoard[to] = player;
    newState.piecesToPlace[player]--;
    newState.piecesActive[player]++;
    
    // Check if placement completed a mill
    if (checkMill(newBoard, player, to)) {
      newState.pendingRemove = true;
      // Do not change currentPlayer: player must choose a piece to capture
    } else {
      newState.pendingRemove = false;
      newState.currentPlayer = opponent;
    }
  } else if (type === 'move') {
    newBoard[from] = null;
    newBoard[to] = player;
    
    // Check if movement completed a mill
    if (checkMill(newBoard, player, to)) {
      newState.pendingRemove = true;
      // Do not change currentPlayer: player must choose a piece to capture
    } else {
      newState.pendingRemove = false;
      newState.currentPlayer = opponent;
    }
  } else if (type === 'capture' || type === 'remove') {
    newBoard[to] = null;
    newState.piecesActive[opponent]--;
    newState.pendingRemove = false;
    // Turn switches to opponent after capture is resolved
    newState.currentPlayer = opponent;
  }
  
  return { board: newBoard, state: newState };
}
