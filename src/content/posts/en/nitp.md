---
title: "NITP"
description: "Predicting the next token in both the output space and the hidden space."
date: 2026-08-13
lang: "en"
translationSlug: "nitp"
author: "konakona"
---

> This post is based on the ICML 2026 paper: [NITP: Next Implicit Token Prediction for LLM Pre-training](https://arxiv.org/abs/2605.24956) — Zhang et al., 2026.

Despite the complexity and the scale of modern language models, at pre-training time they essentially have a single task to perform: next-token prediction (NTP). It is a rather simple objective: given all previous tokens, predict the next one.

But predicting the correct next token says little about how the model should represent it internally, and the model has to learn this on its own. To make it worse, different hidden representations can produce the same output distribution, so long as the final prediction is correct, and the loss has no preference between them: this can lead to representation degeneration. The model is told what to predict, but receives much weaker guidance about what its hidden space should look like.

NITP's answer is remarkably simple. Along with predicting the identity of the next token, the model also predicts the next token's hidden representation. So the next token gets predicted twice: once in the output space, once in the hidden space.

> Representation degeneration can lead to degraded generalization performance on downstream tasks.

## Core Idea

NITP introduces a self-supervised objective that explicitly supervises the hidden representation of the next token using hidden representations from earlier layers in an autoregressive manner.

![NITP Architecture](imgs/nitp-overview.png)

**NITP is NTP in the hidden space: NTP defines what to predict, but fails to supervise how predictions are represented, and NITP fills this gap.**

## NITP Objective

Let $\mathbf{z}_{t+1}$ denote the shallow-layer representation of the token at position $t+1$, and let $\mathbf{h}_t$ denote the final hidden state at position $t$. Let $P$ be a learned projection head that maps $\mathbf{h}_t$ to the shallow representation space. NITP aligns $P(\mathbf{h}_t)$ with the next implicit token representation using cosine loss:

$$
\mathcal{L}_{\mathrm{NITP}} = 1 - \frac{P(\mathbf{h}_t)^\top \mathbf{z}_{t+1}}{\left\lVert P(\mathbf{h}_t) \right\rVert_2 \left\lVert \mathbf{z}_{t+1} \right\rVert_2}.
$$

> Besides cosine similarity, the authors also experimented on MSE, Smooth L1, and KL divergence losses, and found that cosine similarity works best.

Note that the projection $P$ is necessary here to bridge the *distributional gap* between the shallow and deep layers.

The complete pre-training loss:

$$
\mathcal{L}_{\mathrm{total}}(\theta) = \mathcal{L}_{\mathrm{NTP}}(\theta) + \lambda \mathcal{L}_{\mathrm{NITP}}(\theta),
$$

where $\theta$ denotes the model parameters, and $\lambda$ is a hyperparameter that controls the strength of the NITP regularization.

## Thoughts

Cross-layer supervision is not a new idea. Previous works have explored aligning hidden representations across different layers, particularly in *self-distillation*, where shallower layers are often trained to imitate the representations of deeper layers. NITP differs in an important way: the supervision is shifted not only vertically across layers, but also horizontally across positions (*temporal shift*). In fact, the authors included an ablation study that shows that the temporal shift is crucial for the performance gain.

The semantic richness of hidden representations at different layers is also well-studied. The raw embeddings suffer from *polysemy*, or lexical ambiguity; after a few transformer blocks, the token representation is gradually disambiguated by the context, while also retaining fine-grained lexical detail; in even deeper layers, the representation becomes more abstract and task-specific, losing semantic richness. This is why NITP uses a shallow layer as the target for supervision: it is shallow enough to retain semantic richness, but deep enough to be context-dependent.

Building on these insights, NITP provides a stunningly simple yet effective way to improve the pre-training of large language models.
