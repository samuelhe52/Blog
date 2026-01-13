---
title: "Principal Component Analysis, Explained Intuitively"
description: "An intuitive explanation of PCA for dimensionality reduction, covering variance maximization, covariance matrices, and the spectral theorem."
date: 2026-01-09
lang: "en"
translationSlug: "pca-intuitive"
author: "konakona"
---

Principal Component Analysis (PCA) is a widely used technique for **dimensionality reduction** and **feature extraction**. Its goal is to find a new set of orthogonal axes (principal components) in the feature space onto which we can project our data, such that we can reduce the number of dimensions (axes) while preserving as much information as possible.

## Analyzing the Goal

To achieve PCA, we first need to define what we mean by "preserving as much information as possible". A common approach is to maximize the **variance** of the projected data along the new axes. The intuition is that directions with higher variance capture more of the data's structure and variability, while directions with low variance may represent noise or less important features. Because variance is a quantitative measure of how spread out the data points are, we now have a tool for measuring the "quality" of a new axis: the higher the variance of the data projected onto that axis, the better that axis is at capturing the information in the data.

Additionally, we want the new axes (principal components) to be **uncorrelated** with each other, meaning that they exhibit no linear dependence. Intuitively, correlation indicates overlapping linear information: changes along one direction partially explain changes along another. By choosing uncorrelated axes, each principal component captures a unique linear aspect of the data’s variability, allowing us to reduce dimensionality without unnecessary redundancy.

Thus, our goal in PCA can be summarized as follows:

1. Find a set of new axes (principal components) such that the variance of the data projected onto these axes is maximized.
2. Ensure that these new axes are uncorrelated with each other.
3. Order the principal components by the amount of variance they capture, so that we can select the top $k$ components for dimensionality reduction.

Now that we have a high-level understanding of PCA's objectives, we can dive into the mathematics behind it.

## Notation and Setup

Let $\mathbf{x} \in \mathbb{R}^d$ be a random vector representing a data point with $d$ features. We can think of each realization of $\mathbf{x}$ as a point in a $d$-dimensional space. The collection of all such points forms a "cloud" whose shape reflects the underlying distribution of the data.

Given $n$ samples, we arrange them as columns in a data matrix $\mathbf{X} = [\mathbf{x}_1, \mathbf{x}_2, \ldots, \mathbf{x}_n] \in \mathbb{R}^{d \times n}$.

> We represent each data point as a column vector to be consistent with linear algebra conventions. This differs from the common ML convention of using row vectors.

### Why Centering Matters

Before applying PCA, we **center** the data by subtracting the sample mean:

$$
\bar{\mathbf{x}} = \frac{1}{n} \sum_{i=1}^{n} \mathbf{x}_i, \quad \tilde{\mathbf{x}}_i = \mathbf{x}_i - \bar{\mathbf{x}}
$$

This gives us centered data $\tilde{\mathbf{X}} = [\tilde{\mathbf{x}}_1, \ldots, \tilde{\mathbf{x}}_n]$ with $E[\tilde{\mathbf{x}}] = \mathbf{0}$.

**Why is centering essential?** In PCA, we search for directions (unit vectors) that maximize variance. A direction is a line through the origin—it starts from $\mathbf{0}$. When we project data onto a direction $\mathbf{w}$, we measure how spread out the projections are *along that line through the origin*.

If the data's centroid (mean) is not at the origin, this measurement becomes meaningless. Imagine your data cloud is centered at some point $\mathbf{c}$ far from the origin. A direction $\mathbf{w}$ that passes through the origin might completely miss the data cloud, or intersect it at an arbitrary angle unrelated to the cloud's actual shape. The "variance" you compute would reflect the distance from the origin to the data, not the spread within the data.

By centering, we move the data's centroid to coincide with the origin. Now, directions through the origin pass through the "center" of the data cloud, and variance along a direction genuinely measures the spread of data in that direction.

**From now on, we assume all data is centered and drop the tilde for simplicity.**

## Geometric Intuition

Imagine the data cloud in $\mathbb{R}^d$. It might be elongated in some directions and compressed in others—like an ellipsoid rather than a sphere. PCA aims to find the axes of this ellipsoid: the directions along which the data is most spread out.

The first principal component is the direction along which projecting the data yields the largest variance. The second principal component is the direction (orthogonal to the first) that captures the next largest variance, and so on.

## The Covariance Matrix

To formalize this, we first need to introduce the **covariance matrix** $\Sigma$ of the random vector $\mathbf{x}$:

$$
\text{Cov}(\mathbf{x}) = E[(\mathbf{x} - E[\mathbf{x}])(\mathbf{x} - E[\mathbf{x}])^T]
$$

Since the data is centered, $E[\mathbf{x}] = \mathbf{0}$, so:

$$
\text{Cov}(\mathbf{x}) = E[(\mathbf{x} - \mathbf{0})(\mathbf{x} - \mathbf{0})^T] = E[\mathbf{x}\mathbf{x}^T] = \Sigma
$$

The diagonal entries $\Sigma_{ii} = E[x_i^2]$ are the variances of individual features, and the off-diagonal entries $\Sigma_{ij} = E[x_i x_j]$ are the covariances between features.

It might not be immediately obvious why the covariance matrix is useful, but it sets the stage for finding the optimal directions (principal components) by analyzing the properties of the covariance matrix $\Sigma$.

> **Empirical covariance matrix.** In practice, we estimate $\Sigma$ from the data:
> $$\Sigma \approx \frac{1}{n} \sum_{i=1}^{n} \mathbf{x}_i \mathbf{x}_i^T = \frac{1}{n} \mathbf{X} \mathbf{X}^T$$

## Properties of the Covariance Matrix

Before finding principal components, we need to understand key properties of $\Sigma$:

**$\Sigma$ is symmetric.** Since $\Sigma_{ij} = E[x_i x_j] = E[x_j x_i] = \Sigma_{ji}$, the matrix is symmetric: $\Sigma = \Sigma^T$.

**The Spectral Theorem.** Any real symmetric matrix can be diagonalized by an orthogonal matrix. Specifically, there exists an orthogonal matrix $\mathbf{W}$ (where $\mathbf{W}^T \mathbf{W} = \mathbf{W}\mathbf{W}^T = \mathbf{I}$) such that:

$$
\mathbf{W}^T \Sigma \mathbf{W} = \Lambda
$$

where $\Lambda$ is a diagonal matrix of eigenvalues and the columns of $\mathbf{W}$ are the corresponding eigenvectors. Again, it might not be clear why the fact that $\Sigma$ can be diagonalized is important, but it will become clear as we proceed.

## Finding All Principal Components at Once

Rather than finding principal components one by one, we can leverage the spectral theorem to find them all simultaneously. Let $\mathbf{W} = [\mathbf{w}_1, \mathbf{w}_2, \ldots, \mathbf{w}_d]$ be the orthogonal matrix of eigenvectors of $\Sigma$, ordered by decreasing eigenvalue:

$$
\Lambda = \begin{bmatrix}
\lambda_1 & 0 & \cdots & 0 \\
0 & \lambda_2 & \cdots & 0 \\
\vdots & \vdots & \ddots & \vdots \\
0 & 0 & \cdots & \lambda_d
\end{bmatrix}, \quad \lambda_1 \geq \lambda_2 \geq \ldots \geq \lambda_d \geq 0
$$

### The Transformation and Its Covariance

The transformation $\mathbf{z} = \mathbf{W}^T \mathbf{x}$ projects the original data onto the new axes defined by the eigenvectors. Each component $z_i = \mathbf{w}_i^T \mathbf{x}$ is the projection onto the $i$-th axis.

What is the covariance matrix of the transformed data $\mathbf{z}$? Since $\mathbf{z} = \mathbf{W}^T \mathbf{x}$ and $E[\mathbf{z}] = \mathbf{W}^T E[\mathbf{x}] = \mathbf{0}$:

$$
\text{Cov}(\mathbf{z}) = E[\mathbf{z}\mathbf{z}^T] = E[(\mathbf{W}^T \mathbf{x})(\mathbf{W}^T \mathbf{x})^T] = E[\mathbf{W}^T \mathbf{x} \mathbf{x}^T \mathbf{W}] = \mathbf{W}^T E[\mathbf{x}\mathbf{x}^T] \mathbf{W} = \mathbf{W}^T \Sigma \mathbf{W}
$$

By the spectral theorem, $\mathbf{W}^T \Sigma \mathbf{W} = \Lambda$. Therefore:

$$
\text{Cov}(\mathbf{z}) = \Lambda
$$

This shows that with the transformation defined by the eigenvector matrix $\mathbf{W}$, the covariance matrix of the transformed data $\mathbf{z}$ is diagonal. Quick-minded readers will notice that a diagonal covariance matrix has two important implications:

- The **diagonal entries** $\Lambda_{ii} = \lambda_i$ are the variances: $\text{Var}(z_i) = \lambda_i$
- The **off-diagonal entries** are all zero: $\text{Cov}(z_i, z_j) = 0$ for $i \neq j$

This tells us two crucial things:

1. The transformed components are **uncorrelated**—exactly what we wanted!
2. The **variance** of each component equals the corresponding **eigenvalue**.

### Identifying Principal Components

We just showed that when we use the eigenvector matrix $\mathbf{W}$ to define new axes, the variance along the $i$-th axis equals $\lambda_i$. Since $\lambda_1 \geq \lambda_2 \geq \ldots \geq \lambda_d$, the direction with maximum variance is $\mathbf{w}_1$—the eigenvector corresponding to the largest eigenvalue $\lambda_1$.

Finding the first principal component is simply extracting the first column of the transformation matrix $\mathbf{W}$:

$$
\mathbf{w}_1 = \text{first column of } \mathbf{W}, \quad \text{Var}(\mathbf{w}_1^T \mathbf{x}) = \lambda_1
$$

Similarly, the second principal component $\mathbf{w}_2$ (the direction with the second highest variance, orthogonal to $\mathbf{w}_1$) is the second column of $\mathbf{W}$, and so on.

The eigenvector matrix $\mathbf{W}$ simultaneously gives us:

- All principal component directions (as columns)
- The assurance that these directions are uncorrelated (off-diagonal covariance is zero)
- The variance captured by each (the corresponding eigenvalues)

> It might seem surprising that the eigenvectors of the covariance matrix yield exactly what we want for PCA. This can be understood from an optimization perspective: finding the first principal component is equivalent to solving: $\max_{\|\mathbf{w}\|=1} \mathrm{Var}(\mathbf{w}^T \mathbf{x})$.
> One can show that the solution to this problem is the eigenvector of $\Sigma$ corresponding to its largest eigenvalue, thereby providing a direct connection to the spectral theorem. The details of this derivation are beyond the scope of this section.

## Dimensionality Reduction

To reduce from $d$ dimensions to $k$ dimensions (where $k < d$), we select the top $k$ eigenvectors forming $\mathbf{W}_k = [\mathbf{w}_1, \ldots, \mathbf{w}_k] \in \mathbb{R}^{d \times k}$:

$$
\mathbf{z}_{\text{reduced}} = \mathbf{W}_k^T \mathbf{x} \in \mathbb{R}^k
$$

This retains the $k$ directions with the highest variance, discarding the rest. Our work to implement PCA is now complete! We have successfully derived a method to find principal components that captures maximum information while ensuring uncorrelatedness.

## Summary

PCA finds orthogonal directions (principal components) that maximize variance:

1. **Center** the data by subtracting the mean (so the centroid is at the origin).
2. **Compute** the covariance matrix $\Sigma = \frac{1}{n} \mathbf{X} \mathbf{X}^T$.
3. **Diagonalize** $\Sigma$ to obtain eigenvalues $\lambda_i$ and eigenvectors $\mathbf{w}_i$.
4. **Sort** eigenvectors by decreasing eigenvalue.
5. **Select** the top $k$ eigenvectors to form $\mathbf{W}_k$.
6. **Transform** the data: $\mathbf{z} = \mathbf{W}_k^T \mathbf{x}$.
