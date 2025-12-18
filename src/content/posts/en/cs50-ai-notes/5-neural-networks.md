---
title: "Lecture 5: Neural Networks"
description: "CS50 AI lecture notes on neural networks, activation functions, backpropagation, and convolutional architectures."
date: 2025-12-19
lang: "en"
translationSlug: "cs50-ai-notes/5-neural-networks"
author: "konakona"
---

## Overview

Neural networks are inspired by the structure and function of the human brain. They consist of layers of interconnected nodes (neurons) that process data and learn patterns. Each neuron receives and processes inputs, applies an activation function, and passes the output to the next layer.

## Concepts

### Activation Functions

Recall from the previous lecture that for a perceptron, we used **threshold functions** as criteria for determining the class. Those threshold functions are also known as **activation functions** in the context of neural networks.

- Step function (hard threshold): Returns 1 if input is above a certain value, otherwise returns 0.
- Logistic sigmoid function (soft threshold): Returns a value between 0 and 1, often using a sigmoid function (functions whose graph is "S"-shaped). A common choice is the logistic function:

$$f(z) = \frac{1}{1 + e^{-z}}$$

- ReLU (Rectified Linear Unit): Returns the input directly if it is positive; otherwise, it returns zero. Mathematically, it is defined as:

$$f(z) = \max(0, z)$$

### Neural Network Structure

Each layer in a neural network consists of multiple neurons. The output of one layer serves as the input to the next layer. The first layer is called the **input layer**, the last layer is the **output layer**, and any layers in between are called **hidden layers**.

Essentially, each layer performs a linear transformation followed by a non-linear activation function. For example, for a layer with weights $\mathbf{W}$, biases $\mathbf{b}$, and activation function $f$, the output $\mathbf{y}$ can be computed as:

$$
\mathbf{y} = f(\mathbf{W} \cdot \mathbf{x} + \mathbf{b})
$$

where $\mathbf{x}$ is the input to the layer.

### Gradient Descent

To train a neural network, we use optimization algorithms like **gradient descent** to minimize a loss function. The loss function measures how well the model's predictions match the actual labels.

Standard procedure:

- Start with a random choice of weights.
- Repeat:
  - Calculate the gradient based on all data points that will lead to decreasing loss.
  - Update weights according to the gradient.

There are variants of gradient descent:

- Stochastic Gradient Descent (SGD): Updates weights using the gradient from a single data point, instead of all data points at a time.
- Mini-batch Gradient Descent: Updates weights using the gradient from a small batch of data points. A common middle ground between standard gradient descent and SGD.

### Backpropagation

For neural networks with **hidden layers**, we use the **backpropagation** algorithm to efficiently compute gradients for all weights in the network.

- Calculate the loss at the output layer.
- For each layer, starting from the output layer and moving backward to the input layer:
  - Propagate the error back one layer, computing the gradient of the loss **with respect to** the weights and biases of that layer.
  - Update the weights and biases using the computed gradients.

### Multilayer Neural Networks

Single layer neural networks (like the perceptron) can only learn linear decision boundaries. If the data is **not linearly separable**, we need to use **multilayer neural networks** (also known as **deep neural networks**) to learn more complex decision boundaries. They have at least one hidden layer.

### Dropout

Dropout is a **regularization technique** used to prevent overfitting by randomly deactivating neurons during training.

Often, neural networks can **overfit** the training data by over-reliance on specific neurons. Based on this observation, we can randomly "drop" a fraction of the neurons during training to mitigate the issue.

## Computer Vision

Images consist of pixels, and each pixel has color values (e.g., RGB). For example, a 28x28 pixel grayscale image can be represented as a 784-dimensional vector (28*28=784). When the image is colored (RGB), it can be represented as a 3x28x28 tensor.

One way to process images is to **flatten** them into vectors and feed them into a fully connected neural network. However, there are a few drawbacks to this approach:

- Input has too high dimensionality, leading to a large number of parameters and increased computational cost.
- Flattening destroys the spatial structure of the image, making it harder for the network to learn spatial features.

### Image Convolution

**Image Convolution** is a technique that preserves the spatial structure of images while reducing dimensionality. It uses **filters** that slide over the image to extract local features. A filter adds each pixel's value with its neighbors' values, weighted by the filter's weights (a kernel matrix).

The kernel matrix is typically a small matrix (e.g., 3x3 or 5x5) that defines the weights for the convolution operation.

For example, consider this famous edge-detection kernel:

$$
\begin{pmatrix}
-1 & -1 & -1 \\
-1 & 8 & -1 \\
-1 & -1 & -1
\end{pmatrix}
$$

In this kernel, the center pixel has a high positive weight (8), while the surrounding pixels have negative weights (-1). When the pixels tend to be the same in the region on which the kernel is applied, the output will be low (close to 0). However, when there is a significant difference (like an edge), the output will be high. This makes it effective for edge detection.

Image Convolution techniques help reduce the number of parameters in the model and preserve spatial relationships.

### Pooling

**Pooling** is another technique used to reduce the spatial dimensions of images while retaining important features. The most common type is **max pooling**, which divides the image into non-overlapping regions (e.g., 2x2) and takes the maximum value from each region to form a smaller output. For example, for a 4x4 input image, applying 2x2 max pooling results in a 2x2 output image.

### CNNs

CNNs combine the techniques mentioned above (convolution and pooling) to build powerful models for image recognition and classification tasks.

General structure:

- Input layer: Receives the raw image data.
- Convolutional layers: Apply multiple filters to extract local features.
- Pooling layers: Reduce spatial dimensions while retaining important features.
- Flattening layer: Converts the 2D feature maps into a 1D vector.
- Standard neural network layers: Fully connected layers for classification or regression tasks.

We can also do convolution and pooling multiple times before flattening the data and feeding it into standard neural network layers.

## Feed-forward Neural Networks

Feed-forward neural networks are networks where connections between nodes are all in one direction, from input to output. There are no cycles or loops in the network.

## Recurrent Neural Networks

Recurrent Neural Networks (RNNs) are designed so that the output from previous steps is fed as input to the current step.

They are particularly useful for sequential data, such as producing text (a sequence of words) or analyzing video frames (a sequence of images).

Visualization:

```plaintext
Input x --> [ RNN Cell ] --> Output
                ^   |
                |___|
```

or:

```plaintext
x1 --> [ RNN Cell ]
           | y1
x2 --> [ RNN Cell ]
           | y2
x3 --> [ RNN Cell ]
           | y3
x4 --> [ RNN Cell ] --> y4
```
