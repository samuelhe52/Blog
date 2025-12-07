---
title: "Lecture 1: Knowledge"
description: "CS50 AI lecture notes on propositional and first-order logic, entailment, and resolution."
date: 2025-11-30
lang: "en"
translationSlug: "cs50-ai-notes/1-knowledge"
author: "konakona"
---

## Overview

We explore the concept of knowledge representation and reasoning in artificial intelligence. Specifically, we discuss how to represent knowledge in a way that machines can understand and **reason** about it.

## Propositional Logic

**Sentence:** A declarative statement that can be true or false.

**Propositional logic** uses sentences formed by **propositional variables** (e.g., P, Q, R) and logical connectives (AND, OR, NOT, IMPLIES).

Each logical connective can be represented with a symbol:

- AND: ∧
- OR: ∨
- NOT: ¬
- IMPLIES: → (P → Q reads "P implies Q")
- IF AND ONLY IF: ↔ (Biconditional)

**Truth Table:** A table that shows the truth value of a sentence for every possible combination of truth values of its propositional variables.

**Note:** This relationship only indicates that when P is true, Q must also be true, but **does not assert anything** when P is false.

Example:

| P | Q | P ∧ Q |
|---|---|--------|
| true | true | true |
| true | false | false |
| false | true | false |
| false | false | false |

| P | Q | P → Q |
|---|---|--------|
| true | true | true |
| true | false | false |
| false | true | true |
| false | false | true |

**Model:** An assignment of truth values to all propositional variables.

Example: For P and Q, one model is {P: true, Q: false}. There are 2^n possible models for n propositional variables.

**Entailment (⊨):** A sentence A **entails** sentence B (A ⊨ B) if in every model where A is true, B is also true.

## Inference

**Inference:** The process of deriving new sentences from known sentences using rules of inference.

**Model Checking:** A method to determine if a sentence B is entailed by sentence A by checking all models, i.e., verifying if in every model where A is true, B is also true. Every sentence in the knowledge base can be seen as a constraint on the models, eliminating conditions where sentence B would be false when A is true. Model checking is not the way that we humans typically reason, but it is a systematic method that can be implemented in computers. Essentially the computer does not "think" but rather "checks" all possibilities. It says: I don't understand the logical relationships, but if A and B co-occur in all models, then A and B must be related. In this specific case, A entails B.

Model checking can be computationally expensive, as the number of models grows exponentially with the number of propositional variables. In practice, more efficient inference algorithms are used.

### Inference Rules

**Inference Rules:** Logical rules that allow us to derive new sentences from existing ones. Examples include:

- **Modus Ponens:** From P and (P → Q), infer Q.
- **Modus Tollens:** From ¬Q and (P → Q), infer ¬P.
- **Disjunction Elimination:** From (P ∨ Q), ¬P, infer Q.

…And many others.

Now the question comes to how to implement inference with these rules. We can think of this as a **search problem** where we start with known sentences (the knowledge base) and apply inference rules to derive new sentences until we reach the desired conclusion. We can define theorem proving as such:

- initial state: starting knowledge base
- actions: inference rules
- transition model: new knowledge base after inference
- goal test: check statement we're trying to prove
- path cost function: number of steps in proof

### Resolution

**Clause:** A disjunction (things connected by OR) of literals (a propositional variable or its negation). e.g., (A ∨ ¬B ∨ C)

**Unit Resolution Rule:** If we have a clause (A ∨ B) and we know ¬A is true, we can infer B. Generalization: If we have to clauses: (A ∨ Q) and (¬A ∨ R), we can infer (Q ∨ R).

**Conjunctive Normal Form (CNF):** A logical sentence that is a conjunction (AND) of clauses.

**Any propositional logic sentence can be converted to CNF** using inference rules and logical equivalences.

- Eliminate biconditionals: A ↔ B  ≡  (A → B) ∧ (B → A)
- Eliminate implications: A → B  ≡  ¬A ∨ B
- Move NOTs inwards using De Morgan's laws: ¬(A ∧ B)  ≡  ¬A ∨ ¬B
- Use distributive laws to move ORs where they need to be:

e.g.

(P ∨ Q) → R

≡ ¬(P ∨ Q) ∨ R // eliminate implication

≡ (¬P ∧ ¬Q) ∨ R // move NOTs inwards

≡ (¬P ∨ R) ∧ (¬Q ∨ R) // distribute OR

The reason why we want to convert sentences to CNF is that it allows us to use the resolution inference rule effectively. The resolution rule can be applied directly to clauses in CNF to **derive new clauses**, meaning new knowledge.

Before diving into the algorithms, let's take a look at two special cases of resolution:

- If we have S and ¬S, we can derive an **empty clause** (contradiction) that is always false.
- If we have S ∨ Q ∨ R and ¬S ∨ P ∨ R , we can derive Q ∨ P ∨ R ∨ R. Notice that R is a duplicate, so we can **simplify to Q ∨ P ∨ R.**

#### Inference by Resolution

To determine if KB ⊨ Q:

- Check if KB ∧ ¬Q is a contradiction.
  - If it is, then KB ⊨ Q.
  - If not, then KB ⊭ Q.

1. Convert all sentences in KB and ¬Q to CNF.
2. Convert (KB ∧ ¬Q) to a CNF.
3. Apply the resolution rule repeatedly to derive new clauses until:
   - An empty clause is derived (indicating a contradiction), or
   - No new clauses can be derived (indicating no contradiction).
4. If an empty clause is derived, conclude that KB ⊨ Q; otherwise, conclude that KB ⊭ Q.

e.g. Does (A ∨ B) ∧ (¬B ∨ C) ∧ (¬C) entail A?

1. Convert to CNF:
   - KB: (A ∨ B), (¬B ∨ C), (¬C)
   - ¬Q: ¬A
2. Combine: (A ∨ B) ∧ (¬B ∨ C) ∧ (¬C) ∧ (¬A)
3. Now we have these clauses:
   - (A ∨ B)
   - (¬B ∨ C)
   - (¬C)
   - (¬A)
4. Apply resolution:
   - (A ∨ B) and (¬A) resolve to (B)
   - (B) and (¬B ∨ C) resolve to (C)
   - (C) and (¬C) resolve to an empty clause
   - We have a contradiction, so (A ∨ B) ∧ (¬B ∨ C) ∧ (¬C) ⊨ A.

## First-Order Logic

The whole inference process above are based on propositional logic, which is limited in expressiveness. First-order logic (FOL) extends propositional logic by introducing a classification of symbols: Constants and Predicates.

**Constant Symbols:** Represent specific objects in the world (e.g., `Minerva`, `Pomona`, `Gryffindor`, `Hufflepuff`).

**Predicate Symbols:** Represent relations or properties that can be true or false about objects (e.g., `Person(x)`, `House(x)`, `BelongsTo(x, y)`).

### Quantifiers

FOL introduces **quantifiers** that allow us to express statements about collections of objects:

- **Universal Quantification (∀):** "For all" — asserts that a statement holds for every object in the domain.
  - ∀x. BelongsTo(x, Gryffindor) → Brave(x)
  - "Everyone who belongs to Gryffindor is brave."
- **Existential Quantification (∃):** "There exists" — asserts that at least one object satisfies a statement.
  - ∃x. House(x) ∧ BelongsTo(Minerva, x)
  - "There exists a house that Minerva belongs to."

### Example: Hogwarts Houses

Let's model the Harry Potter sorting system using first-order logic.

**Constants:**

- `Harry`, `Hermione`, `Draco`, `Cedric`
- `Gryffindor`, `Slytherin`, `Hufflepuff`, `Ravenclaw`

**Predicates:**

- `Person(x)` — x is a person
- `House(x)` — x is a house
- `BelongsTo(x, y)` — person x belongs to house y
- `Brave(x)` — x is brave
- `Ambitious(x)` — x is ambitious

**Knowledge Base:**

```plaintext
Person(Harry)
Person(Hermione)
Person(Draco)
Person(Cedric)
House(Gryffindor)
House(Slytherin)
House(Hufflepuff)
BelongsTo(Harry, Gryffindor)
BelongsTo(Hermione, Gryffindor)
BelongsTo(Draco, Slytherin)
BelongsTo(Cedric, Hufflepuff)

∀x. BelongsTo(x, Gryffindor) → Brave(x)
∀x. BelongsTo(x, Slytherin) → Ambitious(x)
```

**Inference Example:**

From the knowledge base, we can infer:

1. `BelongsTo(Harry, Gryffindor)` is known.
2. `∀x. BelongsTo(x, Gryffindor) → Brave(x)` applies to all x.
3. Substituting `Harry` for `x`: `BelongsTo(Harry, Gryffindor) → Brave(Harry)`
4. By **Modus Ponens**: Since `BelongsTo(Harry, Gryffindor)` is true, we conclude `Brave(Harry)`.

### Why First-Order Logic?

In propositional logic, we would need separate propositions for each fact:

- `HarryInGryffindor`, `HermioneInGryffindor`, `HarryIsBrave`, …

This becomes unwieldy as the domain grows. First-order logic allows us to express **general rules** that apply to entire categories of objects, making knowledge representation more **compact** and **expressive**.

## Conclusion

Apart from propositional logic and first-order logic, there are many other kinds of "logic", but they all serves the purpose of **representing knowledge** in a formal way that machines can **understand** and **reason about.**

The key to solving problems with inference (mimicking human reasoning) is to represent knowledge in a structured way that allows us to **derive new knowledge** efficiently. Often, by constantly trying to derive new sentences from known sentences and then use the derived sentences to derive even more sentences, we can reach complex conclusions that are even beyond what humans can intuitively reason about.

Combining knowledge representation with inference allows AI systems to make logical decisions based on known facts, or validate new information.

Project: [Minesweeper AI](/en/posts/cs50-ai-notes/minesweeper-ai/)
