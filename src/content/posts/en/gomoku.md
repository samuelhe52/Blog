---
title: "Gomoku AI: Minimax and Alpha-Beta Pruning"
description: "Implementation of Minimax algorithm with Alpha-Beta pruning for Gomoku AI."
date: 2025-11-03
lang: "en"
translationSlug: "gomoku"
author: "konakona"
---

## Minimax

**Minimax** is an algorithm that can be applied to two-player games, in which one player tries to minimize its score, while the other tries to maximize his. By calling minimize() and maximize() alternately, the algorithm effectively searches for best moves by assuming the opponent takes the best move and returning the move with highest (lowest) score.

**Pseudocode:**

```pseudocode
function minimax(node, depth, maximizingPlayer) is
    if depth = 0 or node is a terminal node then
        return the heuristic value of node
    if maximizingPlayer then
        value := −∞
        for each child of node do
            value := max(value, minimax(child, depth − 1, FALSE))
        return value
    else minimizing player
        value := +∞
        for each child of node do
            value := min(value, minimax(child, depth − 1, TRUE))
        return value
```

## Alpha-beta Pruning

**Pseudocode:**

```pseudocode
function alphabeta(node, depth, α, β, maximizingPlayer) is
    if depth == 0 or node is terminal then
        return the heuristic value of node
    if maximizingPlayer then
        value := −∞
        for each child of node do
            value := max(value, alphabeta(child, depth − 1, α, β, FALSE))
            if value ≥ β then
                break _(* β cutoff *)_
            α := max(α, value)
        return value
    else
        value := +∞
        for each child of node do
            value := min(value, alphabeta(child, depth − 1, α, β, TRUE))
            if value ≤ α then
                break _(* α cutoff *)_
            β := min(β, value)
        return value
```

For the maximizer:

**beta comes from the parent** (minimizer) and records the smallest value found by the parent so far. So if beta <= alpha, no need to explore further, because the parent will never choose this path.

---

**Full cpp implementation (for gomoku):**

```cpp
std::pair<int, BoardPosition> GomokuAI::minimaxAlphaBeta(
    BoardManager& boardManager,
    int depth,
    bool isMaximizing,
    int currentPlayer,
    int alpha,
    int beta) {
        int winner = boardManager.checkWinner();
        if (depth == 0 || winner != EMPTY) {
            if (winner == color) {
                return {std::numeric_limits<int>::max() / 2, {}};
            } else if (winner == getOpponent(color)) {
                return {std::numeric_limits<int>::min() / 2, {}};
            }
            // Always evaluate from the AI's perspective
            return {evaluate(boardManager, color), {}};
        }

        BoardPosition bestMove;
        auto moves = candidateMoves(boardManager);
        
        if (isMaximizing) {
            int maxEval = std::numeric_limits<int>::min();

            for (const auto& pos : moves) {
                boardManager.makeMove(pos);
                auto [eval, _] = minimaxAlphaBeta(boardManager, depth - 1, false, getOpponent(currentPlayer), alpha, beta);
                boardManager.undoMove();
                
                if (eval > maxEval) {
                    maxEval = eval;
                    bestMove = pos;
                }
                
                alpha = std::max(alpha, eval);
                // beta comes from the parent and records the smallest value found by the parent so far
                // so if beta <= alpha, no need to explore further, because the parent will not choose this path
                // (parent is minimizing player)
                if (beta <= alpha) {
                    break; // Alpha cutoff
                }
            }
            
            return {maxEval, bestMove};
        } else {
            int minEval = std::numeric_limits<int>::max();

            for (const auto& pos : moves) {
                boardManager.makeMove(pos);
                auto [eval, _] = minimaxAlphaBeta(boardManager, depth - 1, true, getOpponent(currentPlayer), alpha, beta);
                boardManager.undoMove();
                
                if (eval < minEval) {
                    minEval = eval;
                    bestMove = pos;
                }
                
                beta = std::min(beta, eval);
                if (beta <= alpha) {
                    // alpha comes from the parent and records the largest value found by the parent so far
                    // so if beta <= alpha, no need to explore further, because the parent will not choose this path
                    // (parent is maximizing player)
                    break; // Beta cutoff
                }
            }
            
            return {minEval, bestMove};
        }
}
```

## Other Optimizations

### Evaluation

This is often the performance and "intelligence" bottleneck. Too complex evaluation puts significant strain on cpu, while simple ones lead to poor intelligence.

To make evaluation quick and effective, threat detection is usually added to ensure optimal performance even with relatively lower depths like 4 or 5. Common practice:

- Early return when an open four or win condition is detected (avoid confusions by the following score calculations);
- Implement bonus for double threes or fours, encouraging forming linked threes and preventing the player from forming a double open three pattern;

### Possible Moves

Finding possible moves on board can also be a point of optimization.

You can:

- Scan only within a certain radius centered around existing stones
- Use heuristic move ordering to get moves that likely score high be the first ones evaluated, **which is crucial for effective alpha-beta pruning.** Alpha-beta pruning without move ordering won't see much effect. There's another tradeoff, though: Too complex heuristics in move ordering can also impact performance.
- **Check Threat First:** Check for moves that would make one player win and moves that would form an open three for either player or other similar threat patterns. Then put these moves first in the returned possible moves, or even better, early return extremely dangerous moves to drastically improve performance in edge cases.
- Caching possible moves and update the cache when making a new move. Only update the area around the new move.

The last optimization technique requires us to record a delta history when minimax uses a `makeMove()`/`undoMove()` cycle to test moves.

Example:

```cpp
struct MoveRecord {
    BoardPosition position;
    std::set<BoardPosition> addedCandidates;
    bool removedFromCache;
};


// Keep track of moves for undo and win checking with cache information
std::vector<MoveRecord> movesHistory;
std::set<BoardPosition> candidateMovesCache;
void updateCandidatesCache();
std::vector<BoardPosition> candidatesAround(BoardPosition position, int radius) const;
const int candidateRadius = MAX_CANDIDATE_RADIUS;

// In undoMove():
// 1. get the last move and cache diff
// 2. Reverse the diffs
```
