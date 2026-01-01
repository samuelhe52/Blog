---
title: "Thoughts on Computing Machinery and Intelligence by Alan Turing"
description: "Reflections on Turing's seminal 1950 paper discussing machine intelligence, the Imitation Game, and the nature of human vs. machine logic."
date: 2025-11-30
lang: "en"
translationSlug: "thoughts-turing-can-machines-think"
author: "konakona"
---

Paper: [Computing Machinery and Intelligence](https://www.csee.umbc.edu/courses/471/papers/turing.pdf) by Alan Turing (1950)

There are several key points and arguments presented in this paper that are truly worth reflecting on: The concept of the Imitation Game (now known as the Turing Test), the discussion on the fundamental differences between human and machine logic, the discussion on discrete and continuous states and their relationship with chaos/randomness (and more importantly, intelligence), and the exploration of various approaches to the realization of machine intelligence.

## The Imitation Game

By introducing the Imitation Game, Turing turns the abstract and philosophical question of "Can machines think?" into a more concrete and testable scenario. More importantly, he sidesteps the ambiguous definitions of "thinking" and instead focuses on **observable behavior**. It's not about whether a machine can "think" in the human sense, but whether it can **imitate human-like responses** convincingly enough to fool a human interrogator.

## Human vs. Machine Logic

Turing discusses the differences between human and machine logic, particularly highlighting that humans are not strictly logical beings. He points out that humans can be influenced by emotions, make mistakes, and exhibit creativity, whereas machines operate based on predefined rules and algorithms. This distinction is crucial because it suggests that for a machine to truly mimic human intelligence, it must go beyond mere logical processing and incorporate elements of unpredictability and adaptability.

## Discrete vs. Continuous States

Turing draws a line between **discrete-state machines** (like digital computers) and **continuous systems** (like the analog chemistry and electricity in the brain). Critics in his time often leaned on this distinction: continuous systems feel messy, unstable, and "alive," while discrete machines feel clean, rigid, and therefore doomed to be predictable and uncreative.

Objectors would argue that if a machine is a discrete-state system, then in principle you can calculate its future from its present state. Humans, on the other hand, seem to involve noise, uncertainty, and real unpredictability. Therefore, they claim that machines are boxed into mechanical regularity, while minds get access to some mysterious, chaos-flavored freedom.

Turing's response is to separate **determinism** from **practical predictability**. Yes, a discrete machine is deterministic. But a deterministic system with an enormous state space can still be effectively unpredictable. With enough memory and complexity, you cannot see what it will do except by actually running it step by step – which is exactly how we "predict" people too: we wait and see.

He then points out a key technical fact: a discrete machine can **approximate any continuous process to arbitrary precision**. Whatever complicated, unstable, continuous dynamics you think the brain has, a sufficiently powerful digital machine can simulate it as closely as you like. Discreteness is not a fundamental barrier to capturing the randomness of continuous systems.

So the real lesson is: **the digital, discrete nature of computers does not disqualify them from exhibiting seemingly chaotic, creative, or "free" behavior**. Once you allow scale, learning, and possibly some randomness, the separation between continuous and discrete collapses. That clears the way for Turing's bigger claim: there's no principled, physics-level obstacle preventing machines from eventually matching the behavioral richness of human minds.

## Approaches to Machine Intelligence

Turing was very clearly aware that mimicking full human intelligence is a monumental task. That is why he explores a more practical approach of using **learning machines** in the paper. He suggests that instead of trying to program a machine with all the knowledge and skills of a human, we should create machines that can learn from experience, much like humans do. He takes inspiration from child development, proposing that we start with a **child machine** that have basic capabilities that we humans can understand and program with relative ease. Then, through a process of learning and interaction with the environment, this child machine can gradually acquire knowledge and skills, eventually maturing into an intelligent adult machine.

Critics in Turing's time argued that machines can't change their own programming, but Turing counters this by drawing a clear distinction between the core, unchanging rules of the machine and the more flexible, temporary rules that can be modified through learning. He envisions a machine that can modify some non-essential parts of its own programming based on its experiences, allowing it to adapt and improve over time. A good analogy would be the Constitution of the United States, which provides a framework for governance but allows for amendments and changes as society evolves.

> The explanation of the paradox is that the rules which get changed in the learning process are of a rather less pretentious kind, claiming only an ephemeral validity. The reader may draw a parallel with the Constitution of the United States.
>
> Alan Turing, "Computing Machinery and Intelligence" (1950)

In the paper, he also proposes a few methods and insights on the learning process, including:

- **Reward and Punishment:** Turing suggests that machines can be trained using a system of rewards and punishments, similar to how animals are trained. This idea is a precursor to modern reinforcement learning techniques.
- **Randomness in Learning:** Turing acknowledges the role of randomness in the learning process. He suggests that introducing random variations in the machine's behavior can help it explore different strategies and solutions, which is a concept that resonates with modern techniques like genetic algorithms and stochastic optimization.
- **Inevitable Opaqueness:** Turing recognizes that the learning process may not be fully transparent or understandable by its teachers (humans). He accepts that as machines become more complex and learn from vast amounts of data, their internal workings may become opaque, making it difficult to trace how they arrived at certain decisions. This is exactly the challenge we face today with deep learning models, which are often criticized for being "black boxes".

## Final Thoughts

Turing's paper is remarkably prescient, anticipating many of the challenges and approaches that would later become central to the field of artificial intelligence. **He is truly a genius in every sense of the word.** This paper made me feel like that all that we have achieved in AI so far is really just following the path that Turing laid out more than 70 years ago. We cracked engineering problems, built faster hardware, and developed new algorithms, which Turing had no way of foreseeing due to the technological limitations of his time, but he did foresee or he did hold a firm belief that these challenges would be dealt with eventually, and that the core ideas he presented would remain relevant. He didn't know how; but he knew we would.

I'm out of words to express how impressive this is. All the engineering feats we have accomplished in AI so far are just tracing Turing's footsteps, and guess what? 70 years later, no one can argue that he was wrong. **Because we are now living in the future he predicted.**

He wasn't just arguing "machines can think."

He was laying down the foundational blueprint for **how we would build thinking machines**.

And every idea he outlines — neural nets, learning, interpretability issues, emergent complexity — has turned out to be precisely the direction AI actually took.

He didn't just predict the future.

He sketched the field.
