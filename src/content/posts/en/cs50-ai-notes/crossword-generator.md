---
title: "Crossword Generator"
description: "CS50 AI project notes on solving crosswords as a CSP with heuristics and AC-3."
date: 2025-12-07
lang: "en"
translationSlug: "cs50-ai-notes/crossword-generator"
author: "konakona"
---

## Overview

[CS50 - Crossword - Introduction to Artificial Intelligence with Python](https://cs50.harvard.edu/ai/projects/3/crossword/)

We provide a crossword generator implementation that models the puzzle as a constraint satisfaction problem (CSP) and solves it with backtracking plus consistency pruning.

## Representation

- **Variables**: Each contiguous horizontal or vertical slot of length > 1 becomes a `Variable(i, j, direction, length)` with precomputed `cells`.
- **Domains**: Start as the full word list. Node consistency trims words whose lengths differ from the slot length.
- **Overlaps**: For every pair of variables, `overlaps[(v1, v2)]` stores `(i, j)` indices if they cross on a single cell, otherwise `None`. This powers consistency checks.

```python
# Variable footprints
for k in range(self.length):
    self.cells.append(
        (self.i + (k if self.direction == Variable.DOWN else 0),
         self.j + (k if self.direction == Variable.ACROSS else 0))
    )
```

## Consistency

- **Node consistency**: Removes words with the wrong length per slot.
- **Arc consistency (AC-3)**: Runs `revise(x, y)` on arcs to drop x-values that have no supporting y-value at the overlap.

```python
def revise(self, x, y):
    intersection = self.crossword.overlaps[x, y]
    if intersection is None:
        return False
    to_remove = set()
    for x_word in self.domains[x]:
        if not any(x_word[i] == y_word[j] for y_word in self.domains[y]
                    for i, j in [intersection]):
            to_remove.add(x_word)
    if to_remove:
        self.domains[x] -= to_remove
        return True
    return False
```

## Heuristics

- **MRV (minimum remaining values)**: Pick an unassigned variable with the smallest domain; tie-break by degree (most neighbors). This reduces search space size.
- **LCV (least constraining value)**: Order candidate words by how few domain values they eliminate from neighbors. This helps find solutions faster.

```python
def select_unassigned_variable(self, assignment):
    candidates = [v for v in self.crossword.variables if v not in assignment]
    candidates.sort(key=lambda v: (len(self.domains[v]), -len(self.crossword.neighbors(v))))
    return candidates[0]
```

## Backtracking with Inference

- Choose a variable, try values in LCV order, check consistency, run AC-3 on affected arcs, and recurse. If failure, restore domains and try next value.

```python
def backtrack(self, assignment):
    if self.assignment_complete(assignment):
        return assignment
    var = self.select_unassigned_variable(assignment)
    for word in self.order_domain_values(var, assignment):
        if self.consistent({**assignment, var: word}):
            assignment[var] = word
            # Copy domains for restoration
            # We need to manually deepcopy since sets are mutable
            saved = {v: self.domains[v].copy() for v in self.domains}
            arcs = [(n, var) for n in self.crossword.neighbors(var)]
            if self.ac3(arcs):
                result = self.backtrack(assignment)
                if result:
                    return result
            self.domains = saved
            del assignment[var]
    return None
```

## Output

Assignments can be printed as ASCII grids or saved as images via PIL. The solver enforces CSP constraints first, then searches with heuristics to reduce branching.
