---
title: "Lecture 2: Uncertainty"
description: "CS50 AI lecture notes on probabilistic reasoning, Bayes' rule, Bayesian networks, and HMMs."
date: 2025-12-05
lang: "en"
translationSlug: "cs50-ai-notes/2-uncertainty"
author: "konakona"
---

## Overview

When dealing with real-world scenarios, information is often incomplete or uncertain. To handle such situations, we use **probabilistic reasoning** to make informed decisions based on available evidence.

## Conditional Probability

In the context of AI and uncertainty, **conditional probability** is a fundamental concept. It allows us to update our beliefs about an event **based on new evidence**.

The conditional probability of an event A given event B is defined as:

$$P(A|B) = \frac{P(A \cap B)}{P(B)}$$

provided that $P(B) > 0$.

## Random Variables

A **random variable** is a variable with a domain of possible values that it can take on, each associated with a probability. Random variables can be discrete (taking on specific values) or continuous (taking on any value within a range).

## Independence

Two events A and B are said to be **independent** if the occurrence of one does not affect the probability of the occurrence of the other. Mathematically, this is expressed as:

$$P(A \cap B) = P(A) \cdot P(B)$$

or equivalently:

$$P(A|B) = P(A)$$

## Bayes' Rule

Bayes' Rule is a powerful theorem that allows us to update our beliefs about the probability of an event based on new evidence. It is expressed as:

$$P(A|B) = \frac{P(B|A) \cdot P(A)}{P(B)}$$

In practice, Bayes' Rule can often be used when we have data about the likelihood of evidence given a hypothesis and we want to infer the probability of the hypothesis given the evidence. Sometimes it's just easier to obtain data about $P(B|A)$ than $P(A|B)$, but we really care about $P(A|B)$. That's where Bayes' Rule comes in handy.

## Bayesian Networks

A **Bayesian Network** is a graphical model that represents a set of random variables and their conditional dependencies via a directed acyclic graph (DAG). Each node in the graph represents a random variable, and the edges represent the conditional dependencies between them. Let's say that there's a directed edge from node X to node Y. This indicates that X has a **direct influence** on Y, and we can express this relationship using conditional probabilities.

### Example: Train Appointment Network

```plaintext
            ┌─────────────────────┐
            │        Rain         │
            │ {none, light, heavy}│
            └─────────────────────┘
                   /       \
                  /         \
                 ▼           \
    ┌─────────────────────┐   \
    │    Maintenance      │    \
    │      {yes, no}      │     \
    └─────────────────────┘      \
                 |                \
                 |                 \
                 ▼                  ▼
            ┌─────────────────────────┐
            │         Train           │
            │    {on time, delayed}   │
            └─────────────────────────┘
                      |
                      |
                      ▼
            ┌─────────────────────┐
            │    Appointment      │
            │   {attend, miss}    │
            └─────────────────────┘
```

Note that despite factors like rain and maintenance ultimately affect whether we make it to our appointment on time, they do not directly influence the appointment itself. There's no arrow from Rain or Maintenance to Appointment. Instead, their influence is mediated through the Train variable. This makes the model simpler and more efficient to work with.

## Sampling

When exact inference in Bayesian Networks is computationally infeasible, we can use **sampling methods** to approximate probabilities. Each sample is a possible combination of variable assignments, and by generating many samples, we can estimate the probabilities of interest.

We generate samples by selecting values for each variable based on its conditional probability (or unconditional probability) distribution given the values of its parent (if it has any) variables in the network.

Given enough samples, we can approximate the desired probabilities by counting the frequency of occurrences of specific events in the samples. If we're interested in the probability of event A given evidence B, we can count how many samples satisfy both A and B, and divide that by the number of samples that satisfy B. This is known as **rejection sampling** (rejecting samples that don't match the evidence).

We can also use other sampling techniques such as **likelihood weighting**. The procedure can be summarized as follows:

- Start by fixing the values for evidence variables.
- Sample the non-evidence variables using conditional probabilities in the Bayesian network.
- Weight each sample by its likelihood: the probability of all the evidence occurring.

For example, if we have the observation that the train was on time, we will start sampling as before. We sample a value of Rain given its probability distribution, then Maintenance, but when we get to Train - we always give it the observed value, in our case, on time. Then we proceed and sample Appointment based on its probability distribution given Train = on time. Now that this sample exists, we weight it by the conditional probability of the observed variable given its sampled parents. That is, if we sampled Rain and got light, and then we sampled Maintenance and got yes, then we will weight this sample by P(Train = on time | light, yes).

## Markov Models

**Markov Assumption** states that the current state depends on only a finite number of previous states. In a first-order Markov model, the current state depends only on the immediately preceding state.

**Markov Chain** is a sequence of random variables where the future state depends only on the current state, not on the sequence of events that preceded it. This property is known as the **Markov Property**.

## Hidden Markov Models

Sometimes, the AI has some measurement of the world but no access to the **precise state of the world**. In these cases, the state of the world is called the **hidden state** and whatever data the AI has access to are the **observations**. Here are a few examples for this:

- For a robot exploring uncharted territory, the hidden state is its position, and the observation is the data recorded by the robot's sensors.
- In speech recognition, the hidden state is the words that were spoken, and the observation is the audio waveforms.
- When measuring user engagement on websites, the hidden state is how engaged the user is, and the observation is the website or app analytics.

Based on hidden Markov models, multiple tasks can be achieved:

- Filtering: given observations from start until now, calculate the probability distribution for the current state. For example, given information on when people bring umbrellas form the start of time until today, we generate a probability distribution for whether it is raining today or not.
- Prediction: given observations from start until now, calculate the probability distribution for a future state.
- Smoothing: given observations from start until now, calculate the probability distribution for a past state. For example, calculating the probability of rain yesterday given that people brought umbrellas today.
- Most likely explanation: given observations from start until now, calculate most likely sequence of events.

A real world example of a hidden Markov model is the **Part-of-Speech Tagging** problem in Natural Language Processing. Here, the hidden states are the parts of speech (nouns, verbs, adjectives, etc.) of each word in a sentence, while the observations are the actual words themselves. The goal is to determine the most likely sequence of parts of speech given the observed words (most likely explanation problem). Because the parts of speech of a word often depend on the parts of speech of the previous word or words, we can model this problem using a hidden Markov model. A similar example is **Speech Recognition**, where the hidden states are the phonemes (basic units of sound) and the observations are the audio signals. The goal is to determine the most likely sequence of phonemes given the observed audio signals. By modeling the dependencies between phonemes using a hidden Markov model, we can improve the accuracy of speech recognition systems.
