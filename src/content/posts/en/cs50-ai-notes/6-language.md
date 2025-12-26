---
title: "Lecture 6: Language"
description: "CS50 AI lecture notes on NLP: context-free grammars, n-grams, bag-of-words Naive Bayes, embeddings, word2vec, sequence models, attention, and transformers."
date: 2025-12-26
lang: "en"
translationSlug: "cs50-ai-notes/6-language"
author: "konakona"
---

## Overview

Natural Language Processing (NLP) is a field of AI focused on the interaction between computers and human languages.

Human languages consist of words, phrases, and sentences that convey meaning. Two aspects matter most: **syntax** (the structure or rules for forming sentences) and **semantics** (the meaning those sentences convey). We start with context-free grammar to focus on syntax.

## Context-Free Grammar

*Formal Grammar* is defined as a system of rules for generating sentences in a language. Context-Free Grammar is a formal grammar that abstracts text from its meaning to represent the structure of the sentence.

Let's take a simple sentence as an example:

```plaintext
The cat sat on the mat.
```

This sentence can be broken down into words:

- "The" (Determiner)
- "cat" (Noun)
- "sat" (Verb)
- "on" (Preposition)
- "the" (Determiner)
- "mat" (Noun)

Note that we assign each word a *part of speech* (POS) tag. This can be simplified into a few categories such as Noun (N), Verb (V), Determiner (D), and Preposition (P). We can also go on to group words into phrases and sentences:

- Noun Phrase (NP): "The cat", "the mat"
- Verb Phrase (VP): "sat on the mat"
- Sentence (S): "The cat sat on the mat"

Phrases can be thought of as produced by rules:

- `VP -> V | V NP`: A Verb Phrase can be a Verb alone or a Verb followed by a Noun Phrase.
- `NP -> N | D N`: A Noun Phrase can be a Noun alone or a Determiner followed by a Noun.
- `S -> NP VP`: A Sentence consists of a Noun Phrase followed by a Verb Phrase.

Now, we can represent the structure of the sentence using a *parse tree*:

```plaintext
        S
       / \
      NP  VP
     / \   / \
    D   N V   NP
   |    | |   / \
  The  cat sat D  N
               |  |
              the mat
```

Note that the symbols we use are non-leaf nodes (like S, NP, VP) and the actual words are leaf nodes (like "The", "cat", etc.). Thus, these non-leaf nodes can be called *non-terminals* and the leaf nodes can be called *terminals*.

## N-grams

An *n-gram* is a contiguous sequence of `n` items (words, characters, etc.) from a given text or speech sample. Example with the sentence "The cat sat on the mat":

- Unigrams (1-grams): "The", "cat", "sat", "on", "the", "mat"
- Bigrams (2-grams): "The cat", "cat sat", "sat on", "on the", "the mat"
- Trigrams (3-grams): "The cat sat", "cat sat on", "sat on the", "on the mat"

With this definition, we can build **statistical language models** that learn the probabilities of different n-grams occurring in a language. For example, we can estimate the probability of a word given the previous words using n-grams.

## Text Classification

Text classification includes labeling text into predefined categories. Common applications include spam detection, sentiment analysis, and topic categorization.

### Bag-of-Words Model

A Bag-of-Words (BoW) model represents text data as an unordered collection of words, disregarding grammar and word order but keeping multiplicity. Each unique word in the text is treated as a feature, and the frequency of each word is recorded.

We use a **Naive Bayes classifier** for text classification tasks. It is based on Bayes' theorem with the "naive" assumption that features (words) are conditionally independent given the class label. Under this assumption, the probability of a document belonging to a class can be computed as:

$$
P(Class \mid Words) \propto P(Class) \prod_{i=1}^{n} P(Word_i \mid Class)
$$

Where $P(Class)$ is the prior probability of the class, and $P(Word_i \mid Class)$ is the likelihood of each word given the class. The conditional probability $P(Word_i \mid Class)$ can be estimated using the frequency of the word in documents of that class.

One of the problems with the Bag-of-Words model and Naive Bayes classifier is that if a word in the test data is not present in the training data, the whole predicted probability becomes zero. To solve this, we can use **Laplace smoothing** (add-one smoothing), which adds one to the count of each word in the vocabulary when estimating probabilities. Essentially, we pretend that we have seen each word at least once in each class.

## Word Representation

Note that in machine learning, we often have to pass information to computers in numerical format for them to process and understand. Thus, we need to convert words into numerical representations. For example, we can use one-hot encoding: Each word is represented as a binary vector with a length equal to the size of the vocabulary. The position corresponding to the word is set to 1, while all other positions are set to 0 (a vector of a single 1).

However, the information density in one-hot encoding is very low, and it does not capture any semantic relationships between words (similar words can have very different vector representations). Thus, we often use **word embeddings**, which are dense vector representations of words that capture semantic relationships. Popular methods for generating word embeddings include Word2Vec, GloVe, and FastText. In general, word embeddings map words to vector spaces where semantically similar words are located closer together.

Distance between two word embeddings can be measured using *cosine similarity* or *Euclidean distance*.

Interestingly, word embeddings can capture **relational** semantics between words. For example, we can perform vector arithmetic on word embeddings to find relationships. For example:

```plaintext
embedding("king") - embedding("man")
+ embedding("woman") ≈ embedding("queen")
```

## Word2Vec

In the Word2Vec algorithm, we obtain word embeddings by training a shallow neural network to predict words and their surrounding context. There are two main architectures:

- **Skip-gram**: Given a target word, predict the surrounding context words. For example, given "sat", predict "cat" and "on".
- **Continuous Bag of Words (CBOW)**: Given the surrounding context words, predict the target word. For example, given "cat" and "on", predict "sat".

We train a **single network** for the entire vocabulary. Taking Skip-gram as an example:

- We have a three-layer neural network, with an input layer, a hidden layer, and an output layer.
- **Input**: A one-hot encoded vector of the target word (size = vocabulary size $V$).
- **Hidden layer**: A weight matrix $W_{V \times d}$ projects the input to a dense vector of dimension $d$ (the embedding size). Since the input is one-hot, this is equivalent to looking up the row in $W$ corresponding to the target word.
- **Output layer**: Another weight matrix projects back to size $V$, followed by softmax to produce a probability distribution over all words.
- **Loss**: Cross-entropy between the predicted distribution and the actual context word(s).

Some important nuances:

- The input is one-hot encoded, so only one neuron in the input layer is activated at a time. Thus, only the corresponding $d$ weights in the hidden layer are updated during backpropagation.
- The raw output of the network is logits for each word in the vocabulary. After applying softmax, we get probabilities for each word being a context word.
- Note that we can have multiple context words for each target word. In that case, we can sum or average the cross-entropy losses for each one-hot encoded context word.
- But the softmax and cross-entropy over a large vocabulary can be computationally expensive. To address this issue, we often use a technique called **negative sampling**, where we only update a small subset of "negative" samples (words not in the context) along with the positive context words. To achieve this, we pick a few negative samples (words not in the context) for each target word, and compute the dot product between the target word's embedding and both the context words' embeddings (positive samples) and the negative samples' embeddings. Our objective is thus to maximize the first dot product and minimize the second dot product.

> We use dot product as a measure of similarity here since it is proportional to cosine similarity for normalized vectors. This is intuitive: we want to encourage the model to learn embeddings such that context words have similar embeddings to the target word, while non-context words have dissimilar embeddings.

After training, the rows of $W$ (the input-to-hidden weights) become the word embeddings. Each word's embedding is simply its corresponding row in this matrix.

The key insight is that words appearing in similar contexts will have similar embeddings, since the network learns to produce similar outputs for them.

## Neural Networks

Now that we have effective numerical representations of words, one natural idea is to train neural networks with these word embeddings as inputs for various NLP tasks.

Note that unlike with traditional neural networks where the input and output sizes are fixed, in NLP tasks, these metrics can vary significantly (e.g., in machine translation or text generation). We can use **Recurrent Neural Networks (RNNs)** for this task.

### Encoder-Decoder Architecture

Two components are involved in this architecture:

- **Encoder**: The encoder processes the input sequence (e.g., a sentence in English) and encodes it into some kind of *hidden state* or *context vector* that captures the meaning of the input sequence. It does so iteratively: at the very first time step, it takes in the first word and an initial hidden state (often initialized to zeros) and produces a new hidden state. At each subsequent time step, it takes in the next word *and* the previous hidden state to produce the new hidden state. After processing the entire input sequence, we obtain a final hidden state that summarizes the input sequence, which will be passed to the decoder.
- **Decoder**: The decoder takes the final hidden state from the encoder as its initial hidden state and generates the output sequence (e.g., a sentence in French) one word at a time. Similar to the encoder, at each time step, it takes in the previous word (starting with a special start token) *and* the previous hidden state to produce the new hidden state and the next word in the output sequence. This process continues until a special end token is generated or a maximum length is reached.

With this architecture, we can train models that are not confined to fixed-size inputs and outputs.

## Attention Mechanism

There are some limitations to the basic encoder-decoder architecture. For example, the entire input sequence is compressed into a **single fixed-size context vector**. This can be problematic for long sequences, as important information may be lost. To address this, we need to somehow combine the information from all the hidden states of the encoder, not just the final one. However, these hidden states can be of varying importance for generating each word in the output sequence, and that's where the **attention mechanism** comes in.

We can assign different *attention scores* to each hidden state of the encoder based on its **relevance** to the current word being generated by the decoder. These attention scores can be computed using various methods, such as dot product, scaled dot product, or learned feed-forward networks. These scores capture how much "attention" the decoder should pay to each hidden state of the encoder when generating the current word.

After normalizing these scores, we can take the weighted average of the encoder's hidden states to obtain a **context vector** that is specific to the current word being generated. This allows the decoder to take advantage of the entire input sequence while focusing on the most relevant parts for each output word.

## Transformers

RNNs have limitations in itself, such as difficulty in capturing long-range dependencies and being difficult to parallelize (since each time step depends on the previous one). To address these issues, the **Transformer** architecture was introduced.

There are many types of Transformers, and we only cover one of the possible architectures here.

### Encoder Stage

We start with the objective of parallelizing and breaking down the sequential dependencies in RNNs. That means we have to process all words in the input sequence simultaneously and independently. However, by doing that we lose all positional and contextual information. To address this, we introduce two key components: **Positional Encoding** and **Self-Attention**.

- **Positional Encoding:** Instead of passing only the word embeddings to the model, we add positional encodings to the word embeddings to inject information about the position of each word in the sequence.
- **Self-Attention:** Each word in the input sequence attends to **all other words** in the sequence to capture contextual relationships. This is done using the attention mechanism described earlier, but now each word's representation is updated based on its relationships with all other words in the sequence.
- In fact, we can use **multi-head attention**, where multiple attention mechanisms (heads) operate in parallel, allowing the model to capture different facets of the relationships between words.
- After the self-attention layer, we have a feed-forward neural network (FFNN) applied to each position independently, which hopefully outputs a meaningful representation of each word.
- We can stack multiple such layers to build a deep Transformer model.

Visualization:

```plaintext
Input Embeddings + Positional Encodings
          |
   +-----------------------------------+
   |         Transformer Block         |
   | +-------------------------------+ |
   | |   Multi-Head Self-Attention   | |
   | +-------------------------------+ |
   |                 |                 |
   | +-------------------------------+ |
   | |  Positionwise Feed-Forward NN | |
   | +-------------------------------+ |
   +-----------------------------------+
          |
       (stack N times)
          |
      Output Representations
```

### Decoder Stage

The decoder stage is similar to the encoder stage but with some modifications to accommodate the generation of the output sequence.

- The decoder also uses **positional encodings** to retain information about the positions of words in the output sequence.
- The decoder has a **multi-head self-attention** layer that allows each word in the output sequence to attend to all previous words in the output sequence (but not future words, to maintain causality).
- The decoder also has **another multi-head attention** layer that attends to the output of the **encoder** (encoder-decoder attention). This allows the decoder to focus on relevant parts of the input sequence when generating each word in the output sequence.
- Similar to the encoder, the decoder has a feed-forward neural network (FFNN) applied to each position independently.
- We can stack multiple such layers to build a deep Transformer decoder.

Visualization:

```plaintext
Output Embeddings + Positional Encodings
          |
   +-----------------------------------+
   |         Transformer Block         |
   | +-------------------------------+ |
   | |   Masked Multi-Head Self-     | |
   | |         Attention             | |
   | +-------------------------------+ |
   |                 |                 |
   | +-------------------------------+ |
   | |  Multi-Head Encoder-Decoder   | |
   | |         Attention             | |
   | +-------------------------------+ |
   |                 |                 |
   | +-------------------------------+ |
   | |  Positionwise Feed-Forward NN | |
   | +-------------------------------+ |
   +-----------------------------------+
          |
       (stack N times)
          |
      Output Representations
```

### Putting It All Together

There can be many other variations of the Transformer architecture, but the key idea is to use **self-attention** mechanisms to keep the model aware of the most relevant parts of the input and output sequences, while allowing for parallel processing of words.

Attention is All You Need!
