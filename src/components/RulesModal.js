import React from "react";

export default function RulesModal({ isOpen, onClose }) {
  return (
    <div className={`modal-overlay ${isOpen ? "open" : ""}`} onClick={onClose}>
      <div className="rules-modal glass-panel" onClick={(e) => e.stopPropagation()}>
        <button className="rules-modal-close" onClick={onClose} aria-label="Close rules">
          ✕
        </button>
        
        <h2 className="clay-text-glow" style={{ textAlign: "center", marginBottom: "10px" }}>
          Tigarh Rules
        </h2>
        <p className="lobby-subtitle" style={{ fontSize: "0.9rem", color: "var(--color-slate-light)" }}>
          A traditional Indian strategy board game played for generations, combining geometric precision with deep foresight.
        </p>

        <div className="rules-text">
          <h3 className="rules-section-title">1. The Setup & Elements</h3>
          <p>
            The game is played on a board consisting of three concentric squares connected by crosslines, creating <strong>24 intersection nodes</strong>.
          </p>
          <ul className="rules-list">
            <li>
              <strong>Player 1 (Host/Peebles)</strong>: Uses smooth clay river pebbles (slate grey stones).
            </li>
            <li>
              <strong>Player 2 (Guest/Sticks)</strong>: Uses natural hand-cut wooden twigs or sticks.
            </li>
            <li>
              Each player starts with exactly <strong>9 pieces</strong> in their hand.
            </li>
          </ul>

          <h3 className="rules-section-title">2. Phase I: Placing Phase</h3>
          <p>
            Beginning with Pebbles (Stones), players take turns placing one piece from their hand onto any <strong>empty node</strong> on the board.
          </p>
          <ul className="rules-list">
            <li>No pieces already on the board can be moved during this phase.</li>
            <li>
              If a player forms a line of three pieces along any of the grid lines (called a <strong>Mill</strong> or <strong>Tiga</strong>), they immediately trigger a capture and must remove one of their opponent's active pieces.
            </li>
          </ul>

          <h3 className="rules-section-title">3. Phase II: Sliding & Movement Phase</h3>
          <p>
            Once all 9 pieces have been placed, players take turns sliding one of their pieces along a marked line to an <strong>adjacent empty node</strong>.
          </p>
          <ul className="rules-list">
            <li>You cannot jump over pieces or move to occupied nodes.</li>
            <li>If a move forms a new <strong>Tiga (Mill)</strong>, a capture is triggered.</li>
          </ul>

          <h3 className="rules-section-title">4. Phase III: Flying Phase</h3>
          <p>
            When a player is reduced to exactly <strong>3 pieces</strong>, their pieces break free from sliding restrictions and can <strong>fly (jump)</strong> to any empty node on the entire board.
          </p>
          <ul className="rules-list">
            <li>
              <strong>Settings Toggle (Rural/Strict vs. Tournament/Flying)</strong>:
              Traditional village rules ("Rural/Strict") disable flying, keeping pieces restricted to sliding even with only 3 remaining. Tournament rules allow the Flying Phase.
            </li>
          </ul>

          <h3 className="rules-section-title">5. Mills (Tiga) & Capturing Rules</h3>
          <p>
            Forming a line of three of your pieces horizontally or vertically along a line is a <strong>Tiga (Mill)</strong>.
          </p>
          <ul className="rules-list">
            <li>
              <strong>Capture Protection</strong>: You cannot capture an opponent's piece that is currently part of an active mill, <em>unless</em> the opponent has only mill pieces left on the board.
            </li>
            <li>
              <strong>Active Turn Lock</strong>: When you form a Tiga, the game turn locks on you. You cannot perform other actions until you click an eligible opponent piece to capture.
            </li>
          </ul>

          <h3 className="rules-section-title">6. Victory Conditions</h3>
          <p>The game is won when:</p>
          <ul className="rules-list">
            <li>
              <strong>Elimination</strong>: You reduce the opponent to <strong>fewer than 3 pieces</strong>.
            </li>
            <li>
              <strong>Blockade</strong>: You trap the opponent so that they have <strong>no legal moves</strong> remaining on their turn.
            </li>
          </ul>
        </div>
        
        <div style={{ display: "flex", justifyContent: "center", marginTop: "10px" }}>
          <button className="action-btn" onClick={onClose} style={{ minWidth: "150px" }}>
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
}
