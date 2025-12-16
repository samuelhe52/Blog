---
title: "Lecture 4: Learning"
description: "CS50 AI lecture notes on nearest neighbors, perceptrons, SVMs, reinforcement learning, and clustering."
date: 2025-12-13
lang: "en"
translationSlug: "cs50-ai-notes/4-learning"
author: "konakona"
---

## Overview

Learning is a fundamental aspect of artificial intelligence, enabling systems to **improve their performance based on experience**. We explore various learning techniques in this note.

## Nearest Neighbor

Nearest Neighbor Classification stores all available cases and classifies new cases **based on a similarity measure**. In practice, we often consider the nearest k neighbors and choose the most common class among them (k-NN, k-Nearest Neighbors).

## Perceptron

### The Basics

We can use a simple neural network called a **perceptron** to classify data. A perceptron takes multiple inputs, applies weights to them, calculates a weighted sum, and passes the result through an activation function (like a step function) to produce an output. We represent weights as a vector $\mathbf{w}$ and inputs as a vector $\mathbf{x}$. The output is thus given by $\text{output} = f(\mathbf{w} \cdot \mathbf{x})$, where $f$ is the activation function.

Activation functions are also known as threshold functions because they determine whether a neuron "fires" based on whether the weighted sum exceeds a certain threshold.

**Hard threshold**: Returns 1 if input is above a certain value, otherwise returns 0.

**Soft threshold**: Returns a value between 0 and 1, often using a sigmoid function (functions whose graph is "S"-shaped). A common choice is the logistic function:

$$f(z) = \frac{1}{1 + e^{-z}}$$

With a soft threshold, we can interpret the output as a probability that the input belongs to a certain class.

### Training a Perceptron

To train a perceptron, we can apply the **Perceptron Learning Rule**, which updates the weights based on the error between the predicted output and the actual output. The update rule is given by:

$$
\mathbf{w} \leftarrow \mathbf{w} + \eta (y - \hat{y}) \mathbf{x}
$$

Where:

- $\eta$ is the learning rate (a small positive constant)
- $y$ is the actual output (true label)
- $\hat{y}$ is the predicted output from the current perceptron
- $\mathbf{x}$ is the input vector

Note that the perceptron learning rule only converges if the data is **linearly separable**.

> Comparison to Gradient Descent: The Perceptron Learning Rule can be seen as a simplified version of gradient descent, where we adjust weights based on the error for each single data point, rather than computing the gradient over the entire dataset. This means that perceptron updates are local and immediate, while gradient descent updates are global and averaged over all data points.

## Support Vector Machines (SVMs)

Recall that the goal of a classifier is to find a decision boundary that separates different classes. However, there can be many possible decision boundaries since our training data may not be enough to uniquely determine one. Support Vector Machines (SVMs) aim to find the optimal decision boundary by **maximizing the margin** between the classes. Such a boundary is called a **Maximum Margin Separator**.

One benefit of SVMs is that they can be used to classify data that is not linearly separable.

## Regression

Regression is a type of supervised learning used to predict **continuous** outcomes, as opposed to classification where we predict discrete labels.

> This section is largely omitted as the author already has extensive notes on regression in [d2l](https://d2l.ai/chapter_linear-regression/linear-regression.html) lectures.

## Reinforcement Learning

Reinforcement Learning (RL) is a type of machine learning where an agent learns to make decisions by interacting with an environment. The learning process starts with a state, on which the agent takes an action. The environment then provides the resulting state and a reward signal, which tells the agent how good or bad the action was. The agent's goal is to maximize the total reward over time.

### Markov Decision Processes (MDPs)

RL can be modeled using Markov Decision Processes (MDPs). An MDP is defined by:

- A set of states $S$
- A set of actions $A$
- A transition function $T(s, a, s')$
- A reward function $R(s, a)$

The transition function $T(s, a, s')$ gives the probability of moving from state $s$ to state $s'$ after taking action $a$. The reward function $R(s, a)$ gives the immediate reward received after taking action $a$ in state $s$.

But how does the model decide which action to take in each state? This is where the concept of a **policy** comes in. A policy $\pi(s)$ is a mapping from states to actions, indicating which action to take in each state.

The goal of reinforcement learning is to find an optimal policy $\pi^*$ that maximizes the expected cumulative reward over time. This can be achieved using various algorithms, such as Q-learning and policy gradients.

### Q-Learning

Q-learning is a way to learn the **value of taking a certain action in a given state**. The value is defined as the cumulative future reward that can be obtained by taking that action and following the optimal policy thereafter. The can be represented using a Q-function, denoted as $Q(s, a)$.

We initialize the learning process by setting all Q-values to zero. As the agent interacts with the environment, it updates the Q-values using the following update rule:

$$
Q(s, a) \leftarrow Q(s, a) + \alpha \left(r + \gamma \max_{a'} Q(s', a') - Q(s, a)\right)
$$

Where:

- $\alpha$ is the learning rate
- $r$ is the reward received after taking action $a$ in state $s$
- $\gamma$ is the discount factor, which determines the importance of future rewards
- $s'$ is the new state after taking action $a$, and $a'$ represents possible actions in state $s'$
- $\max_{a'} Q(s', a')$ is the maximum Q-value that the agent can achieve by taking any action $a'$ in the new state $s'$

Note that the when updating a Q-value, we take into account both the immediate reward and the estimated future rewards, which allows the agent to learn long-term strategies.

## Unsupervised Learning

Unsupervised learning involves training models on data without labeled responses. The goal is to find hidden patterns or structures in the data. Common techniques include clustering and dimensionality reduction.

### k-means Clustering

k-means clustering is an algorithm used to partition data into k distinct clusters based on feature similarity. The algorithm works as follows:

- Initialize k center points randomly.
- Repeat until convergence:
  - Assign each data point to the nearest center point, forming k clusters.
  - Move each center point to the mean of the data points assigned to its cluster.

The algorithm converges when the assignments no longer change after an iteration.
