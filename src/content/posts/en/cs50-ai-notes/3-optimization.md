---
title: "Lecture 3: Optimization"
description: "CS50 AI lecture notes on local search, simulated annealing, linear programming, and CSPs."
date: 2025-12-07
lang: "en"
translationSlug: "cs50-ai-notes/3-optimization"
author: "konakona"
---

## Overview

Optimization is the process of choosing the best option from a set of options.

## Local Search

Local search is a search algorithm that maintains a single node and searches by moving to a neighboring node. This makes it quite different to other search algorithms like breadth-first search or depth-first search, which maintain a list of nodes to explore.

### Hill Climbing

**Hill Climbing** is a local search algorithm that continuously moves towards the direction of increasing value (uphill) to find the peak of the search-space landscape. It suffers from the problem of getting stuck in *local maxima* and *plateaus*.

- **Local Maxima**: Points that are higher than their immediate neighbors but lower than the global maximum.
- **Plateaus**: Flat areas where neighboring states have the same value, making it difficult to determine the direction of improvement.

To calculate the value or cost of a state, we use an *objective function* (also known as a fitness function or cost function). This function takes a state as input and returns a numerical value that represents its quality.

### Variants of Hill Climbing

- **Steepest-Ascent**: Evaluating all neighbors and choosing the one with the highest value.
- **Stochastic**: Choosing randomly from higher-valued neighbors.
- **Random-Restart**: Performing multiple hill climbing searches from different random initial states to increase the chances of finding the global maximum.
- **First-Choice**: Choose the first neighbor that improves the current state, rather than evaluating all neighbors.
- **Local Beam Search**: Keeping track of $k$ states (beams) and exploring their neighbors simultaneously, selecting the best ones to continue. (More than one current state)

### Simulated Annealing

**Annealing** is a process in metallurgy. You can imagine heating a metal until it is red-hot and then slowly cooling it down. This allows the atoms in the metal to settle into a more stable configuration, minimizing internal stresses and defects. When the temperature is high, the atoms can move freely, allowing them to explore various configurations (randomness is high). As the temperature decreases, the atoms settle into a more stable arrangement (randomness decreases).

**Simulated Annealing** is an optimization algorithm inspired by the annealing process in metallurgy. It is used to find an approximate solution to optimization problems by exploring the state-space landscape in a way that allows for occasional uphill moves (i.e., moves to higher-cost states) to escape local minima, or local maxima in maximization problems.

Early in the process, when the "temperature" is high, the algorithm is more likely to accept worse solutions, allowing it to explore a broader range of states. As the temperature decreases, the algorithm becomes more conservative, focusing on refining the current solution.

Pseudocode for Simulated Annealing:

```plaintext
function Simulated-Annealing(problem, max):
  current = initial state of problem
  for t = 1 to max:
    T = Temperature(t)
    neighbor = random neighbor of current
    ΔE = how much better neighbor is than current
      if ΔE > 0:
        current = neighbor
      with probability e^(ΔE/T) set current = neighbor
        return current
```

Note that the probability of accepting a worse solution is often calculated using the Boltzmann distribution: $P(accept) = e^{\Delta E / T}$, where $\Delta E$ is the change in energy (or cost) and $T$ is the current temperature.

### Traveling Salesperson Problem

This is one of the most famous optimization problems. Given a list of cities and the distances between each pair of cities, the task is to find the shortest possible route that visits each city exactly once and returns to the origin city. This problem is *NP-hard*, meaning that there is no known polynomial-time solution for it.

We often use local search algorithms like hill climbing or simulated annealing to find *approximate* solutions to the traveling salesperson problem, as finding the exact solution can be computationally infeasible for large numbers of cities.

## Linear Programming

Linear programming is a method for optimizing a **linear objective function**, subject to a set of **linear equality and inequality constraints**.

A standard form of a linear programming problem is as follows:

- Minimize a cost function: $c_1 x_1 + c_2 x_2 + … + c_n x_n$
- Subject to constraints:
  - $a_{11} x_1 + a_{12} x_2 + … + a_{1n} x_n \leq b_1$
  - $a_{21} x_1 + a_{22} x_2 + … + a_{2n} x_n \leq b_2$
  - …
- With bounds on variables: $x_i \geq 0$ for all $i$

Where $c_i$ are the *coefficients* of the objective function, $a_{ij}$ are the coefficients of the constraints, and $b_i$ are the bounds for each constraint.

A classic example of linear programming is the *investment problem*, where an investor wants to allocate funds among different assets to maximize returns while adhering to budget constraints and risk tolerance.

Algorithms that can be used to solve linear programming problems, such as the **Simplex method** or **Interior-Point methods**, is not our concern here. We focus on the applications. We can solve linear programming problems using libraries such as SciPy in Python.

Example:

```python
from scipy.optimize import linprog

"""
Problem Description:
Maximize Z = 1x1 + 2x2
Subject to:
2x1 + 1x2 <= 20
1x1 + 1x2 >= 16
"""

# Coefficients for the objective function (note: linprog does minimization)
c = [-1, -2]  # Negate for maximization
# Coefficients for the inequality constraints
A = [[2, 1], [-1, -1]]
# Right-hand side of the inequality constraints
b = [20, -16]

# Solve the linear programming problem
res = linprog(c, A_ub=A, b_ub=b, method='highs')

print('Optimal value:', -res.fun)  # Negate back to get the maximized value
print('Values of x1 and x2:', res.x)
```

The `linprog` function from the `scipy.optimize` module is used to solve linear programming problems. Notice that the coefficients of the objective function are negated because `linprog` performs minimization by default; constraints are expected in the form of inequalities (less than or equal to), so we convert the greater than or equal to constraint accordingly.

## Constraint Satisfaction

Linear programming falls under the broader category of **constraint satisfaction problems (CSPs)**, where the goal is to find values for a set of variables that satisfy a series of constraints.

Constraints satisfaction problems have the following properties:

- Set of variables $\{ X₁, X₂, \dots , Xₙ \}$
- Set of domains for each variable $\{ D₁, D₂, \dots , Dₙ \}$
- Set of constraints $C$

Sudoku can be represented as a CSP: variables are all cells, the domain is the numbers 1-9, and the constraints are that no number can repeat in any row, column, or 3x3 subgrid.

We can construct a constraint graph to represent the relationships between variables and constraints. Each variable is a node, and an edge connects two nodes if there is a constraint involving those variables.

Types of Constraints:

- **Hard Constraints**: Must be strictly satisfied to form a valid solution.
- **Soft Constraints**: Preferable to satisfy but not mandatory; violations may incur a penalty.
- **Unary Constraints**: Involve a single variable (e.g., $X₁ \neq 5$).
- **Binary Constraints**: Involve pairs of variables (e.g., $X₁ + X₂ \leq 10$).

### Node Consistency

A variable is node-consistent if all the values in its domain satisfy the variable's **unary constraints**. A CSP is node-consistent if all its variables are node-consistent.

We can enforce node consistency by iterating through each variable and removing values from its domain that violate unary constraints.

### Arc Consistency

A directed arc $(X_i \to X_j)$ is arc-consistent if **for every value** in the domain of $X_i$, there **exists some value** in the domain of $X_j$ that **satisfies the binary constraint b**etween $X_i$ and $X_j$. A CSP is arc-consistent if all its arcs are arc-consistent.

Enforcing arc consistency can be a little more complicated.

We can use a `Revise` function to enforce arc consistency from variable X to variable Y:

```plaintext
function Revise(csp, X, Y):
  revised = false
  for x in X.domain:
    if no y in Y.domain satisfies constraint for (X, Y):
      delete x from X.domain
      revised = true
  return revised
```

**AC-3 Algorithm** can be used to enforce arc consistency across the entire CSP:

```plaintext
function AC-3(csp):
  queue = all arcs in csp
  while queue is not empty:
    (X, Y) = queue.pop()
    if Revise(csp, X, Y):
      // If we revised the domain of X
      // Then we need to check all other arcs 
      // involving X, because they might not be
      // arc-consistent anymore
      if X.domain is empty:
        return false
      for each Z in X.neighbors - {Y}:
        add (Z, X) to queue
  return true
```

This algorithm iteratively checks and revises arcs until no more revisions are needed or a domain becomes empty, indicating that the CSP has no solution (Returns false in that case).

The main idea is to maintain a queue of arcs that need to be checked for arc consistency. When an arc is revised, any neighboring arcs that may have been affected are added back to the queue for further checking.

AC-3 can be used to simplify a CSP before applying more complex search algorithms, since it can reduce the domains of variables, making it easier to find a solution later on.

### Backtracking Search

Backtracking search is a depth-first search algorithm for solving CSPs. It incrementally builds candidates for solutions (assignments of values to variables) and abandons a candidate (*backtracks*) as soon as it determines that the candidate cannot possibly lead to a valid solution.

Pseudocode:

```plaintext
// assignment: a mapping of variables to values
function Backtrack(assignment, csp):
  if assignment is complete: return assignment
  var = Select-Unassigned-Variable(csp, assignment)
  for each value in Domain-Values(var, assignment, csp):
    if value consistent with assignment:
      add {var = value} to assignment
      result = Backtrack(assignment, csp)
      if result != failure: return result
    remove {var = value} from assignment
  return failure
```

The `Select-Unassigned-Variable` function chooses the next variable that has not yet been assigned a value. The `Domain-Values` function returns the possible values for that variable, potentially ordered by some heuristic (like least-constraining value).

These two functions can be enhanced with heuristics to improve the efficiency of the backtracking search.

For `Select-Unassigned-Variable`:

- **Minimum Remaining Values (MRV)**: Choose the variable with the smallest domain (fewest legal values).
- **Degree Heuristic**: Choose the variable that has the highest degree. Degree is the number of constraints that involve the variable. If a variable is involved in many constraints, when we assign it a value, it is more likely to reduce the domains of other variables, reducing the size of the search space.

For `Domain-Values`:

- **Least Constraining Value**: Return variables in order by number of choices they rule out for neighboring variables. We start by trying the least-constraining value first, as it leaves us with a larger search space for the remaining variables, increasing the chances of finding a solution.

Overall, we want to choose variables that are most likely to cause failure early (MRV and Degree Heuristic) and choose values that leave the most options open for other variables (Least Constraining Value).

### Maintaining Arc Consistency (MAC)

Maintaining Arc Consistency (MAC) is an enhancement to the backtracking search algorithm that ensures arc consistency is maintained throughout the search process. After each assignment of a value to a variable, MAC enforces arc consistency on the remaining unassigned variables, potentially reducing their domains and pruning the search space. Specifically, after assigning a value to a variable, MAC calls the AC-3 algorithm to ensure that all arcs involving the newly assigned variable are arc-consistent.

To put it more generally, MAC is an idea of integrating search and inference (like arc consistency) to improve the efficiency of solving CSPs.

## Summary

To solve optimization problems, it is really important to correctly formulate the problem and to figure out the correct way to interpret it, which algorithm to use, and which heuristics to apply. The implementation details are often less important than choosing an optimal overall approach to the problem.
