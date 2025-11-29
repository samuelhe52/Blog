---
title: "Thoughts on Computing Machinery and Intelligence by Alan Turing"
description: "Reflections on Turing's seminal 1950 paper discussing machine intelligence, the Imitation Game, and the nature of human vs. machine logic."
date: 2025-11-30
lang: "en"
translationSlug: "thoughts-turing-can-machines-think"
author: "konakona"
---

Paper: [Computing Machinery and Intelligence](https://www.csee.umbc.edu/courses/471/papers/turing.pdf) by Alan Turing (1950)

There are several key points and arguments presented in this paper that truly are worth reflecting on: The concept of the Imitation Game (now known as the Turing Test), the discussion on the fundamental differences between human and machine logic, the discussion on discrete and continuous states and their relationship with chaos/randomness (and more importantly, intelligence), and the exploration of various approaches to the realization of machine intelligence.

## The Imitation Game

By introducing the Imitation Game, Turing turns the abstract and philosophical question of "Can machines think?" into a more concrete and testable scenario. More importantly, he sidesteps the ambiguous definitions of "thinking" and instead focuses on **observable behavior**. It's not about whether a machine can "think" in the human sense, but whether it can **imitate human-like responses** convincingly enough to fool a human interrogator.

## Human vs. Machine Logic

Turing discusses the differences between human and machine logic, particularly highlighting that humans are not strictly logical beings. He points out that humans can be influenced by emotions, make mistakes, and exhibit creativity, whereas machines operate based on predefined rules and algorithms. This distinction is crucial because it suggests that for a machine to truly mimic human intelligence, it must go beyond mere logical processing and incorporate elements of unpredictability and adaptability.

## Discrete vs. Continuous States

Turing delves into the nature of states, distinguishing between discrete and continuous states. He argues that while machines typically operate in discrete states (e.g., binary states in digital computers), human cognition often involves continuous states (chemical and electrical processes in the brain are analog).

Turing addresses a common objection: that discrete-state machines are inherently predictable since, in principle, you can compute their next state given the current state and inputs. Critics argued this predictability disqualifies machines from true "thinking," which seems to involve unpredictability and free will.

Turing's counterargument is elegant: even though discrete machines are theoretically deterministic, they can be **so complex that predicting their behavior becomes practically impossible**. A machine with a massive state space (like a modern computer with gigabytes of memory) has so many possible configurations that no human could feasibly predict its outputs without essentially running the computation themselves. Furthermore, discrete machines can **simulate continuous systems to arbitrary precision**, meaning any behavior achievable by a continuous system can be approximated by a discrete one.

It's worth noting that discrete systems *can* exhibit genuine chaotic behavior—the logistic map ($x_{n+1} = rx_n(1-x_n)$) is a classic example of a discrete dynamical system with true chaos. What matters for chaos is not continuity per se, but two key ingredients: (1) a **sufficiently large state space** so trajectories have room to diverge before repeating, and (2) the right kind of **dynamics**—rules that "stretch and fold" the state space. Think of it like kneading dough: stretching pulls nearby points apart (amplifying small differences), while folding brings the dough back on itself (preventing it from stretching to infinity). The dough stays roughly the same size, but its internal structure becomes incredibly complex. This combination—local divergence but global boundedness—is the hallmark of chaos.

> **What is Chaos?**
>
> A dynamical system is **chaotic** if it exhibits:
>
> 1. **Sensitivity to initial conditions** — nearby trajectories diverge exponentially
> 2. **Topological transitivity** — the system is "mixing"; any region eventually overlaps with any other
> 3. **Dense periodic orbits** — periodic behaviors are scattered throughout the state space
>
> Crucially, chaos requires **boundedness**. If a system just explodes to infinity, that's divergence, not chaos — trajectories escape rather than mix. Chaos is complex, unpredictable behavior *within* a confined space, like a pinball bouncing forever inside a machine. Without bounds, you get a one-way trip to infinity, which is simple (boring!) rather than complex (chaotic).

Turing's broader point is that the discrete nature of digital computers is not a fundamental barrier to intelligence. Whether through sheer complexity, simulation of continuous dynamics, or introduction of randomness, discrete machines can achieve the unpredictability and adaptability that critics claimed was exclusive to continuous (and thus, biological) systems.

## Approaches to Machine Intelligence

Turing sees clearly that mimicking full human intelligence is a monumental task. That is why he explores a specific approach of using **learning machines** in the paper. He suggests that instead of trying to program a machine with all the knowledge and skills of a human, we should focus on creating machines that can learn from experience, much like humans do. He takes inspiration from child development, proposing that we start with a **child machine** that have basic capabilities that we humans can understand and program with relative ease. Then, through a process of learning and interaction with the environment, this child machine can gradually acquire knowledge and skills, eventually maturing into an intelligent adult machine.

Some people might argue that machines can't change their own programming, but Turing counters this by suggesting that the learning process itself can be programmed into the machine. He envisions a machine that can modify some non-essential parts of its own programming based on its experiences, allowing it to adapt and improve over time. A good analogy would be the Constitution of the United States, which provides a framework for governance but allows for amendments and changes as society evolves.

> The explanation of the paradox is that the rules which get changed in the learning process are of a rather less pretentious kind, claiming only an ephemeral validity. The reader may draw a parallel with the Constitution of the United States.
>
> Alan Turing, "Computing Machinery and Intelligence" (1950)

In the paper, he also proposes a few methods and insights on the learning process, including:

- **Reward and Punishment:** Turing suggests that machines can be trained using a system of rewards and punishments, similar to how animals are trained. This idea is a precursor to modern reinforcement learning techniques.
- **Randomness in Learning:** Turing acknowledges the role of randomness in the learning process. He suggests that introducing random variations in the machine's behavior can help it explore different strategies and solutions, which is a concept that resonates with modern techniques like genetic algorithms and stochastic optimization.
- **Inevitable Opaqueness:** Turing recognizes that the learning process may not be fully transparent or understandable by its teachers (humans). He accepts that as machines become more complex and learn from vast amounts of data, their internal workings may become opaque, making it difficult to trace how they arrived at certain decisions. This is exactly the challenge we face today with deep learning models, which are often criticized for being "black boxes".

## A Few Final Thoughts

Turing's paper is remarkably prescient, anticipating many of the challenges and approaches that would later become central to the field of artificial intelligence. **He is truly a fucking genius in every sense of the word.** This paper made me feel like that all that we have achieved in AI so far is really just following the path that Turing laid out more than 70 years ago. We cracked engineering problems, built faster hardware, and developed new algorithms, which Turing had no way of foreseeing due to the technological limitations of his time, but he did foresee or he did hold a firm belief that these challenges would be dealt with eventually, and that the core ideas he presented would remain relevant. He didn't know how; but he knew we would.

I'm out of words to express how impressive this is. All the engineering feats we have accomplished in AI so far are just tracing Turing's footsteps, and guess what? 70 years later, no one can argue that he was wrong. Because we are now living in the future he predicted.

He wasn't just arguing "machines can think."

He was laying down the foundational blueprint for **how we would build thinking machines**.

And every idea he outlines — neural nets, learning, interpretability issues, emergent complexity — has turned out to be precisely the direction AI actually took.

He didn't just predict the future.

He sketched the field.
