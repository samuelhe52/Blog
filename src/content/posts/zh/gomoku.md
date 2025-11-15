---
title: "五子棋 AI：极大极小算法与 Alpha-Beta 剪枝"
description: "五子棋 AI 中极大极小算法与 Alpha-Beta 剪枝的实现。"
date: 2025-11-03
lang: "zh-CN"
translationSlug: "gomoku"
author: "konakona"
---

## 极大极小算法

**Minimax** 是一种适用于双人博弈的算法，其中一方试图最小化得分，而另一方试图最大化得分。通过交替调用 `minimize()` 和 `maximize()`，算法假设对手会采取最佳策略，从而搜索出最佳的移动路径。

**伪代码：**

```plaintext
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

## Alpha-Beta 剪枝

**伪代码：**

```plaintext
function alphabeta(node, depth, α, β, maximizingPlayer) is
    if depth == 0 or node is terminal then
        return the heuristic value of node
    if maximizingPlayer then
        value := −∞
        for each child of node do
            value := max(value, alphabeta(child, depth − 1, α, β, FALSE))
            if value ≥ β then
                break _(* β 剪枝 *)_
            α := max(α, value)
        return value
    else
        value := +∞
        for each child of node do
            value := min(value, alphabeta(child, depth − 1, α, β, TRUE))
            if value ≤ α then
                break _(* α 剪枝 *)_
            β := min(β, value)
        return value
```

对于最大化玩家：

**β 值来自父节点**（最小化玩家），记录父节点目前找到的最小值。如果 β ≤ α，则无需进一步探索，因为父节点不会选择这条路径。

---

**完整 C++ 实现（五子棋）：**

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
            // 始终从 AI 的角度评估
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
                // β 值来自父节点，记录父节点目前找到的最小值
                // 如果 β ≤ α，则无需进一步探索，因为父节点不会选择这条路径
                // （父节点是最小化玩家）
                if (beta <= alpha) {
                    break; // Alpha 剪枝
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
                    // α 值来自父节点，记录父节点目前找到的最大值
                    // 如果 β ≤ α，则无需进一步探索，因为父节点不会选择这条路径
                    // （父节点是最大化玩家）
                    break; // Beta 剪枝
                }
            }
            
            return {minEval, bestMove};
        }
}
```

## 其他优化

### 评估函数

这是性能和“智能”瓶颈所在。过于复杂的评估函数会显著增加 CPU 负担，而简单的评估函数则会导致 AI 智能不足。

为了使评估快速且有效，通常会加入威胁检测，以确保即使在较低深度（如 4 或 5）下也能获得最佳性能。常见做法：

- 当检测到活四或胜利条件时，提前返回（避免后续评分计算的干扰）；
- 为双三或四连加分，鼓励形成连三并阻止对手形成双活三模式；

### 可行移动

在棋盘上寻找可行移动也是优化点之一。

你可以：

- 仅扫描以现有棋子为中心的一定半径范围内；
- 使用启发式移动排序，使得可能得分较高的移动优先被评估，**这对 Alpha-Beta 剪枝的效果至关重要。** 没有移动排序的 Alpha-Beta 剪枝效果有限。不过，这里也有权衡：过于复杂的启发式排序也会影响性能。
- **优先检查威胁：** 检查会导致某一方胜利的移动，以及会形成活三的移动或其他类似威胁模式。然后将这些移动放在返回的可行移动列表的最前面，甚至更好的是，提前返回极其危险的移动，以显著提高边界情况的性能。
- 缓存可行移动，并在进行新移动时更新缓存。仅更新新移动周围的区域。

最后一种优化技术要求我们在极大极小算法使用 `makeMove()`/`undoMove()` 循环测试移动时记录增量历史。

示例：

```cpp
struct MoveRecord {
    BoardPosition position;
    std::set<BoardPosition> addedCandidates;
    bool removedFromCache;
};


// 记录移动历史以便撤销和缓存信息
std::vector<MoveRecord> movesHistory;
std::set<BoardPosition> candidateMovesCache;
void updateCandidatesCache();
std::vector<BoardPosition> candidatesAround(BoardPosition position, int radius) const;
const int candidateRadius = MAX_CANDIDATE_RADIUS;

// 在 undoMove() 中：
// 1. 获取最后一步移动及缓存差异
// 2. 逆转差异
```
