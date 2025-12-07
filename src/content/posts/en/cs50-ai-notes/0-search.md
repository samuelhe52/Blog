---
title: "Lecture 0: Search"
description: "CS50 AI lecture notes on search algorithms, from BFS/DFS to A* and minimax."
date: 2025-11-28
lang: "en"
translationSlug: "cs50-ai-notes/0-search"
author: "konakona"
---

## Introduction

A **solution** to a search problem is a sequence of actions that leads from the start state to a goal state. The process of finding such a solution is called **searching**.

In the search process, data is often stored in a ***node***, a data structure that typically contains:

- The current state
- Its parent node, through which it was reached
- The action that was applied to the parent to reach this state
- The path cost from the start state to this node

This gives us a way to reconstruct the solution path once we reach the goal state.

## General Idea of Search Algorithms

Nodes are just data, they don't perform searching themselves. To actually search, we use the ***frontier***, the mechanism that "manages" the nodes. The frontier manages which nodes to explore next, based on the search strategy.

The general search algorithm works as follows:

1. Initialize the frontier with the initial state node.
2. Loop:
   - If the frontier is empty, return failure (no solution).
   - Remove a node from the frontier.
   - If the node contains a goal state, return the solution.
   - Expand the node to generate its child nodes.
   - Add the child nodes to the frontier according to the search strategy.

To avoid exploring the same state multiple times, we can maintain an ***explored set***, which keeps track of all states that have already been visited.

## Uninformed Search

Uninformed search strategies do not use any information about the goal state beyond the problem definition. They explore the search space blindly.

**DFS:** DFS always expands the **deepest** node in the current frontier. It uses a stack data structure (LIFO) to manage the frontier.

**BFS:** BFS always expands the **shallowest** node in the current frontier. It uses a queue data structure (FIFO) to manage the frontier.

## Informed Search

Informed search strategies use problem-specific knowledge (heuristics) to guide the search process towards the goal more efficiently.

**Greedy Best-First Search:** Expand the node that appears to be closest to the goal, based on a heuristic function h(n) that estimates the cost from node n to the goal. Uses a priority queue ordered by h(n). It **might not find the optimal solution.**

### A* Search

Expands the node with the lowest estimated total cost f(n) = g(n) + h(n), where g(n) is the cost from the start node to n, and h(n) is the heuristic estimate from n to the goal. Uses a priority queue ordered by f(n). It is both complete and optimal, provided certain conditions on the heuristic are met.

A* is optimal if the heuristic h(n) is:

- **Admissible**: Never overestimates the true cost to reach the goal.
- **Consistent (Monotonic)**: For every node n and every successor n' of n with step cost c(n, n'), there is h(n) ≤ c(n, n') + h(n').

**Key Difference:** Greedy Best-First Search focuses solely on the heuristic h(n), while A* considers both **the cost to reach the current node g(n)** and the estimated cost to the goal h(n).

### Adversarial Search

Adversarial search is used in scenarios where multiple agents (players) compete against each other, such as in games. The goal is to find the optimal move for a player, assuming that **the opponent also plays optimally.**

We're often interested in two-player, zero-sum games, where one player's gain is the other player's loss. In this case, **Minimax** is a common algorithm used to determine the best move.

**Minimax Algorithm:** The algorithm explores the game tree, assuming that both players play optimally. The maximizing player (Max) tries to maximize their score, while the minimizing player (Min) tries to minimize Max's score. The algorithm recursively evaluates the game tree and assigns values to each node based on the possible outcomes.

```plaintext
Utility(state): Returns a numeric value of a certain state for the maximizing player.

function Max-Value(state):
    if Terminal(state):
        return Utility(state)
    v = -∞
    for action in Actions(state):
        v = Max(v, Min-Value(Result(state, action)))
    return v

function Min-Value(state):
    if Terminal(state):
        return Utility(state)
    v = +∞
    for action in Actions(state):
        v = Min(v, Max-Value(Result(state, action)))
    return v
```

The Minimax algorithm can be optimized using **Alpha-Beta Pruning**, which eliminates branches in the game tree that do not need to be explored because they cannot influence the final decision. This optimization allows the algorithm to search deeper in the same amount of time.

```plaintext
function Alpha-Beta(state, depth, α, β, maximizingPlayer):
    if depth == 0 or Terminal(state):
        return Utility(state)
    if maximizingPlayer:
        v = -∞
        for action in Actions(state):
            v = Max(v, Alpha-Beta(Result(state, action), depth - 1, α, β, false))
            α = Max(α, v)
            if β ≤ α:
                break  // β cut-off
        return v
    else:
        v = +∞
        for action in Actions(state):
            v = Min(v, Alpha-Beta(Result(state, action), depth - 1, α, β, true))
            β = Min(β, v)
            if β ≤ α:
                break  // α cut-off
        return v
```

The Utility function evaluates the desirability of a game state for the maximizing player. In practical applications, especially in complex games, the utility function is often the most relevant part of the algorithm that ensures the move's quality. The utility function is often approximated using heuristics, especially when the game tree is too large to explore fully.
