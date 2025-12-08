---
title: "Minesweeper AI"
description: "CS50 AI project notes on knowledge-based inference for Minesweeper."
date: 2025-11-30
lang: "en"
translationSlug: "cs50-ai-notes/minesweeper-ai"
author: "konakona"
---

## Overview

[CS50 - Minesweeper - Introduction to Artificial Intelligence with Python](https://cs50.harvard.edu/ai/projects/1/minesweeper/)

The goal of this project is to create an AI that can play the game of Minesweeper. Our AI is a knowledge-based agent that uses knowledge representation and logical inference to play Minesweeper. The AI maintains a knowledge base of sentences that represent the state of the game, and uses this knowledge to make decisions.

What information does the AI have access to? In Minesweeper, the basic form of knowledge the AI has is: for a given revealed cell, the number of neighboring cells that contain mines is known. We can represent this knowledge using logical sentences.

e.g. Suppose we have a board:

```plaintext
A B C
D 1 E
F G H
```

Here we use letters to represent unrevealed cells for ease of reference. We know that exactly one of the cells A, B, D, E contains a mine. We can represent this knowledge as a sentence using propositional logic:

```plaintext
Or(
    And(A, Not(B), Not(C), Not(D), Not(E), Not(F), Not(G), Not(H)),
    And(Not(A), B, Not(C), Not(D), Not(E), Not(F), Not(G), Not(H)),
    And(Not(A), Not(B), C, Not(D), Not(E), Not(F), Not(G), Not(H)),
    And(Not(A), Not(B), Not(C), D, Not(E), Not(F), Not(G), Not(H)),
    And(Not(A), Not(B), Not(C), Not(D), E, Not(F), Not(G), Not(H)),
    And(Not(A), Not(B), Not(C), Not(D), Not(E), F, Not(G), Not(H)),
    And(Not(A), Not(B), Not(C), Not(D), Not(E), Not(F), G, Not(H)),
    And(Not(A), Not(B), Not(C), Not(D), Not(E), Not(F), Not(G), H)
)
```

Apparently this is quite verbose! Luckily, we can create a more compact representation using a custom `Sentence` class that represents a logical statement about a set of cells and the count of mines among them: ({Cell1, Cell2, …}: Count).

For each sentence that we defined, we can perform basic logical inferences:

1. If count=0, then all cells in the sentence are safe.
2. If count=cell count, then all cells in the sentence are mines.
3. If a cell is known to be a mine or safe, we can update all sentences in the knowledge base to remove that cell and adjust the count accordingly.
    - If a cell is a mine, remove it from the sentence and decrease the count by 1.
    - If a cell is safe, simply remove it from the sentence.
4. If we have two sentences where the cells of one sentence are **a subset of the other**, we can derive a new sentence by subtracting the subset from the superset. Example:
    - Sentence 1: {A, B, C}: 1
    - Sentence 2: {A, B}: 1
    - New Sentence: S1.cells - S2.cells = {C}, S1.count - S2.count = 0 → {C}: 0 (C is safe)

Combining these inferences allows the AI to deduce new knowledge about the board, ultimately enabling it to make safe moves and avoid mines. The AI can do this with the following workflow each time a cell is revealed:

1. Mark the revealed cell as safe and update the knowledge base accordingly.
2. Add a new sentence to the knowledge base based on the revealed cell and its count of neighboring mines. Note that we should only include neighboring cells that are **not already known to be safe or mines.** Otherwise, we introduce redundancy.
3. Repeat:
    - For each sentence in the knowledge base, check if it can infer any new safe cells or mines. If so, mark them accordingly and update the knowledge base. This can be seen as propagating known information from single sentences throughout the knowledge base.
    - For **each pair of sentences** in the knowledge base, check if one is a subset of the other. If so, derive a new sentence and add it to the knowledge base if it's not already present.
    - When performing these inferences, we may end up marking new cells as safe or mines, which in turn may allow further inferences. Therefore, we repeat this process until no new information can be inferred. In other words, we only break out of the loop when nothing changes in an iteration.

Finally, the AI can make a move based on the recorded safe cells and mines.

Notice that despite the logical reasoning is complete and rigiorous, the minesweeper game itself may require guessing in certain situations where the knowledge base does not provide enough information to make a safe move. In such cases, the AI will have to make a random move among the remaining unrevealed cells.

Additionally, although the workflow above is simple, **many caveats and edge cases need to be carefully handled** in the actual implementation. Examples include:

- Modifying sentences in the knowledge base while iterating through them. Can lead to infinite loops or skipped sentences if not handled carefully.
- Ensuring that newly derived sentences are not duplicates of existing ones in the knowledge base.
- Checking for empty sentences (no cells) and removing them from the knowledge base.
- Ensuring the two sentences being compared for subset relations are not the same sentence (proper subset).
- Only set changed flag when new information is actually inferred. This requires checking if cells are already known to be safe or mines before marking them again.
- And more…
