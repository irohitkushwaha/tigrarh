/**
 * Tigarh (Nine Men's Morris Variant) - Smart Computer AI Opponent
 * 
 * Implements three levels of AI intelligence:
 * 1. Easy: Chooses a random legal action.
 * 2. Medium: Prioritizes forming own mills (Tigas), blocking opponent's imminent mills,
 *    and falls back to a random legal action.
 * 3. Hard: Uses a heuristic-based Minimax algorithm with Alpha-Beta pruning to find
 *    the mathematically optimal move up to a balanced search depth.
 */

import {
  ADJACENCY_LIST,
  MILLS_LIST,
  getPlayerPhase,
  getValidMoves,
  checkMill,
  applyMove,
  isGameOver
} from './gameLogic.js';

/**
 * Counts the active pieces belonging to a player on the board.
 */
function countActivePieces(board, player) {
  let count = 0;
  for (let i = 0; i < 24; i++) {
    if (board[i] === player) count++;
  }
  return count;
}

/**
 * Counts completed mills (lines of 3) for a specific player.
 */
function countCompletedMills(board, player) {
  let count = 0;
  for (const mill of MILLS_LIST) {
    if (mill.every(idx => board[idx] === player)) {
      count++;
    }
  }
  return count;
}

/**
 * Counts the potential mills (2 pieces of the player and 1 empty slot) for a player.
 */
function countPotentialMills(board, player) {
  let count = 0;
  for (const mill of MILLS_LIST) {
    let pCount = 0;
    let emptyCount = 0;
    for (const idx of mill) {
      if (board[idx] === player) pCount++;
      else if (board[idx] === null) emptyCount++;
    }
    if (pCount === 2 && emptyCount === 1) {
      count++;
    }
  }
  return count;
}

/**
 * Evaluates the mobility (total number of legal moves) for a player.
 */
function getMobility(board, player, piecesToPlace, piecesActive) {
  if (piecesToPlace > 0) {
    // In placing phase, mobility is represented by the number of empty nodes
    let emptyCount = 0;
    for (let i = 0; i < 24; i++) {
      if (board[i] === null) emptyCount++;
    }
    return emptyCount;
  }
  
  // In moving or flying phases, calculate actual valid move destinations
  let totalMoves = 0;
  const phase = piecesActive === 3 ? 'flying' : 'moving';
  
  for (let i = 0; i < 24; i++) {
    if (board[i] === player) {
      const targets = getValidMoves(board, player, i, phase);
      totalMoves += targets.length;
    }
  }
  return totalMoves;
}

/**
 * Evaluates the static score of the board from the perspective of the given player.
 * High positive score is good for the player, negative is bad.
 * 
 * Heuristics used:
 * - Game over / win / loss detection (+/- 10000)
 * - Active piece count difference (weight: 100)
 * - Completed mills difference (weight: 25)
 * - Open double-mills/potential mills difference (weight: 15)
 * - Blocked pieces / mobility difference (weight: 5)
 */
export function evaluateBoard(board, player, state) {
  const opponent = 3 - player;
  
  const piecesToPlaceP = state.piecesToPlace[player];
  const piecesToPlaceO = state.piecesToPlace[opponent];
  
  const activeP = countActivePieces(board, player);
  const activeO = countActivePieces(board, opponent);
  
  // 1. Instant Victory / Defeat Evaluations:
  // If opponent has less than 3 active pieces (and placement phase is finished)
  if (piecesToPlaceO === 0 && activeO < 3) {
    return 10000;
  }
  // If player has less than 3 active pieces
  if (piecesToPlaceP === 0 && activeP < 3) {
    return -10000;
  }
  
  const mobilityP = getMobility(board, player, piecesToPlaceP, activeP);
  const mobilityO = getMobility(board, opponent, piecesToPlaceO, activeO);
  
  // If opponent is completely blocked (no legal moves and placement phase finished)
  if (piecesToPlaceO === 0 && mobilityO === 0) {
    return 10000;
  }
  // If player is completely blocked
  if (piecesToPlaceP === 0 && mobilityP === 0) {
    return -10000;
  }
  
  const millsP = countCompletedMills(board, player);
  const millsO = countCompletedMills(board, opponent);
  
  const potentialsP = countPotentialMills(board, player);
  const potentialsO = countPotentialMills(board, opponent);
  
  // 2. Relative Heuristics Score:
  let score = 0;
  score += 100 * (activeP - activeO);
  score += 25 * (millsP - millsO);
  score += 15 * (potentialsP - potentialsO);
  score += 5 * (mobilityP - mobilityO);
  
  return score;
}

/**
 * Returns all legally valid moves for a given player in the current state.
 */
export function getAllLegalMoves(board, player, state) {
  const opponent = 3 - player;
  const legalMoves = [];

  // Capture Move Validation
  if (state.pendingRemove) {
    const opponentPieces = [];
    for (let i = 0; i < 24; i++) {
      if (board[i] === opponent) {
        opponentPieces.push(i);
      }
    }
    
    // Check if ALL opponent pieces are part of mills
    const allInMills = opponentPieces.every(p => checkMill(board, opponent, p));
    
    for (const pos of opponentPieces) {
      // Can capture if the piece is NOT in a mill, OR if ALL opponent pieces are in mills
      if (allInMills || !checkMill(board, opponent, pos)) {
        legalMoves.push({ type: 'capture', player, to: pos });
      }
    }
    return legalMoves;
  }

  // Placing Phase Moves
  if (state.piecesToPlace[player] > 0) {
    for (let i = 0; i < 24; i++) {
      if (board[i] === null) {
        legalMoves.push({ type: 'place', player, to: i });
      }
    }
    return legalMoves;
  }

  // Moving / Flying Phase Moves
  const phase = getPlayerPhase(state.piecesToPlace[player], state.piecesActive[player]);
  for (let from = 0; from < 24; from++) {
    if (board[from] === player) {
      const targets = getValidMoves(board, player, from, phase);
      for (const to of targets) {
        legalMoves.push({ type: 'move', player, from, to });
      }
    }
  }

  return legalMoves;
}

/**
 * Scans the board for positions where the given opponent has 2 out of 3 pieces in a mill line,
 * meaning that empty slot is an active threat that must be blocked.
 */
function getOpponentThreats(board, opponent) {
  const threats = [];
  for (const mill of MILLS_LIST) {
    let oppCount = 0;
    let emptyCount = 0;
    let emptyIdx = -1;
    for (const idx of mill) {
      if (board[idx] === opponent) {
        oppCount++;
      } else if (board[idx] === null) {
        emptyCount++;
        emptyIdx = idx;
      }
    }
    if (oppCount === 2 && emptyCount === 1) {
      threats.push(emptyIdx);
    }
  }
  return threats;
}

/**
 * EASY DIFFICULTY:
 * Chooses a random legal move from all available legal moves.
 */
export function getEasyMove(board, player, state) {
  const moves = getAllLegalMoves(board, player, state);
  if (moves.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * moves.length);
  return moves[randomIndex];
}

/**
 * MEDIUM DIFFICULTY:
 * 1. Capture: Targets opponent pieces that are part of potential mills to disrupt them.
 * 2. Placing/Moving: Prioritizes moves that form its own mills (Tigas).
 * 3. Blocking: If no mill can be formed, blocks any immediate threat from the opponent.
 * 4. Fallback: Selects a random legal move.
 */
export function getMediumMove(board, player, state) {
  const moves = getAllLegalMoves(board, player, state);
  if (moves.length === 0) return null;
  
  const opponent = 3 - player;
  
  // A. Handling Captures
  if (state.pendingRemove) {
    const threats = getOpponentThreats(board, opponent);
    const threatCaptures = moves.filter(m => threats.includes(m.to));
    if (threatCaptures.length > 0) {
      return threatCaptures[Math.floor(Math.random() * threatCaptures.length)];
    }
    return moves[Math.floor(Math.random() * moves.length)];
  }
  
  // B. Handling Placement/Movement
  // Priority 1: Complete an immediate mill of our own
  const millMoves = [];
  for (const move of moves) {
    const { state: nextState } = applyMove(board, move, state);
    if (nextState.pendingRemove) {
      millMoves.push(move);
    }
  }
  if (millMoves.length > 0) {
    return millMoves[Math.floor(Math.random() * millMoves.length)];
  }
  
  // Priority 2: Block an immediate opponent threat (mill)
  const threats = getOpponentThreats(board, opponent);
  const blockMoves = moves.filter(m => threats.includes(m.to));
  if (blockMoves.length > 0) {
    return blockMoves[Math.floor(Math.random() * blockMoves.length)];
  }
  
  // Priority 3: Make a random legal move
  return moves[Math.floor(Math.random() * moves.length)];
}

/**
 * Minimax algorithm with Alpha-Beta Pruning.
 * Properly accounts for mill formation turn-retention (captures within the same turn).
 */
export function minimax(board, state, depth, alpha, beta, isMaximizing, aiPlayer) {
  const opponent = 3 - aiPlayer;
  const activePlayer = state.currentPlayer;
  
  // 1. Terminal Node (Game Over check)
  const piecesRemaining = state.piecesToPlace[activePlayer];
  const boardPiecesCount = countActivePieces(board, activePlayer);
  const gameOverState = isGameOver(board, activePlayer, piecesRemaining, boardPiecesCount);
  
  if (gameOverState.gameOver) {
    // If the winner is the AI, reward highly. If opponent, penalize highly.
    // Factor in depth to prefer faster victories and delayed defeats.
    return gameOverState.winner === aiPlayer ? (10000 + depth) : (-10000 - depth);
  }
  
  // 2. Leaf Node (Depth limit reached)
  if (depth === 0) {
    return evaluateBoard(board, aiPlayer, state);
  }
  
  const moves = getAllLegalMoves(board, activePlayer, state);
  if (moves.length === 0) {
    // Blocked player loses
    return activePlayer === aiPlayer ? -10000 : 10000;
  }
  
  // 3. Maximizing Player (AI Player's decisions)
  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const { board: nextBoard, state: nextState } = applyMove(board, move, state);
      // Note: If nextState.currentPlayer === aiPlayer, it means the turn did not change
      // (a mill was completed and the AI must make a capture now). Hence, isMaximizing remains true.
      const nextIsMaximizing = nextState.currentPlayer === aiPlayer;
      const evalVal = minimax(nextBoard, nextState, depth - 1, alpha, beta, nextIsMaximizing, aiPlayer);
      maxEval = Math.max(maxEval, evalVal);
      alpha = Math.max(alpha, evalVal);
      if (beta <= alpha) {
        break; // Beta cut-off
      }
    }
    return maxEval;
  } 
  // 4. Minimizing Player (Opponent's decisions)
  else {
    let minEval = Infinity;
    for (const move of moves) {
      const { board: nextBoard, state: nextState } = applyMove(board, move, state);
      const nextIsMaximizing = nextState.currentPlayer === aiPlayer;
      const evalVal = minimax(nextBoard, nextState, depth - 1, alpha, beta, nextIsMaximizing, aiPlayer);
      minEval = Math.min(minEval, evalVal);
      beta = Math.min(beta, evalVal);
      if (beta <= alpha) {
        break; // Alpha cut-off
      }
    }
    return minEval;
  }
}

/**
 * HARD DIFFICULTY:
 * Uses minimax with alpha-beta pruning to find the optimal move.
 * Uses dynamic depth based on the phase of the game to ensure optimal balance between latency and decision quality.
 */
export function getHardMove(board, player, state) {
  const moves = getAllLegalMoves(board, player, state);
  if (moves.length === 0) return null;
  
  // If there is only one legal move, execute it immediately
  if (moves.length === 1) {
    return moves[0];
  }
  
  const phase = getPlayerPhase(state.piecesToPlace[player], state.piecesActive[player]);
  
  // Standard depth configuration (Placing phase = 3, Moving/Flying phase = 4)
  let depth = 3;
  if (phase === 'moving' || phase === 'flying') {
    depth = 4;
  }
  
  let bestMove = null;
  let bestScore = -Infinity;
  
  // Shuffle moves before sorting to avoid highly deterministic robotic gameplay
  const shuffledMoves = [...moves].sort(() => Math.random() - 0.5);
  
  for (const move of shuffledMoves) {
    const { board: nextBoard, state: nextState } = applyMove(board, move, state);
    const nextIsMaximizing = nextState.currentPlayer === player;
    
    const score = minimax(nextBoard, nextState, depth - 1, -Infinity, Infinity, nextIsMaximizing, player);
    
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  
  return bestMove;
}

/**
 * Unified public interface for the AI engine.
 * 
 * @param {Array} board - The 24-element board array (null, 1, or 2).
 * @param {number} player - The active player index making the turn (1 or 2).
 * @param {Object} state - The game state object.
 * @param {'easy' | 'medium' | 'hard'} difficulty - AI difficulty level.
 * @returns {Object|null} Selected moveInfo object (e.g. { type: 'place', player, to: 5 }).
 */
export function getBestMove(board, player, state, difficulty = 'hard') {
  const diff = difficulty.toLowerCase();
  
  if (diff === 'easy') {
    return getEasyMove(board, player, state);
  } else if (diff === 'medium') {
    return getMediumMove(board, player, state);
  } else {
    return getHardMove(board, player, state);
  }
}
