---
title: "主成分分析（PCA）直观理解"
description: "用方差最大化、协方差矩阵以及谱定理，直观理解主成分分析（PCA）。"
date: 2026-01-09
lang: "zh-CN"
translationSlug: "pca-intuitive"
author: "konakona"
---

> **本文由 AI 翻译。**

主成分分析（Principal Component Analysis, PCA）是一种应用非常广泛的 **降维** 与 **特征提取** 技术。它的目标是在特征空间中找到一组新的正交坐标轴（主成分），把数据投影到这些轴上，从而在尽可能保留信息的前提下减少维度（轴的数量）。

## 目标分析

要实现 PCA，我们首先要澄清“尽可能保留信息”到底指什么。一种常见做法是：让数据在新坐标轴上的投影 **方差** 尽可能大。直觉上，方差更大的方向往往捕捉到了数据结构与变化的主要部分；而方差很小的方向可能更多对应噪声或不重要的特征。因为方差可以量化数据点在某个方向上的“分散程度”，它就给了我们一个衡量新轴“质量”的工具：沿该轴投影后的方差越大，这根轴就越能捕捉数据中的信息。

此外，我们希望这些新轴（主成分）彼此 **不相关**，也就是不存在线性依赖。直觉上，相关性意味着线性信息的重叠：沿一个方向的变化可以部分解释沿另一个方向的变化。选择不相关的轴，可以让每个主成分捕捉数据变动中独特的线性方面，从而在降维时避免不必要的冗余。

因此，PCA 的目标可以概括为：

1. 找到一组新的坐标轴（主成分），使数据投影到这些轴上的方差最大。
2. 确保这些新轴彼此不相关。
3. 按捕捉到的方差大小对主成分排序，以便选择前 $k$ 个主成分用于降维。

有了对目标的整体理解后，我们就可以进入背后的数学推导。

## 记号与设定

令 $\mathbf{x} \in \mathbb{R}^d$ 表示一个数据点对应的随机向量，其中包含 $d$ 个特征。我们可以把 $\mathbf{x}$ 的每次取值看作 $d$ 维空间中的一个点；所有点的集合形成一个“点云”，其形状反映了数据分布的结构。

给定 $n$ 个样本，我们将它们按列排成数据矩阵 $\mathbf{X} = [\mathbf{x}_1, \mathbf{x}_2, \ldots, \mathbf{x}_n] \in \mathbb{R}^{d \times n}$。

> 为了与线性代数的惯例一致，我们把每个数据点表示为列向量。这与机器学习中常见的“样本按行排列”的约定不同。

### 为什么需要中心化

在做 PCA 之前，我们先对数据进行 **中心化**：减去样本均值

$$
\bar{\mathbf{x}} = \frac{1}{n} \sum_{i=1}^{n} \mathbf{x}_i, \quad \tilde{\mathbf{x}}_i = \mathbf{x}_i - \bar{\mathbf{x}}
$$

于是得到中心化后的数据 $\tilde{\mathbf{X}} = [\tilde{\mathbf{x}}_1, \ldots, \tilde{\mathbf{x}}_n]$，并且满足 $E[\tilde{\mathbf{x}}] = \mathbf{0}$。

**为什么中心化是必要的？** 在 PCA 里，我们要找的是能使方差最大的方向（单位向量）。一个方向对应一条过原点的直线——它从 $\mathbf{0}$ 出发。当我们把数据投影到某个方向 $\mathbf{w}$ 上时，我们衡量的是投影点在 *这条过原点的直线* 上的分散程度。

如果数据的质心（均值）不在原点，这个衡量就会变得没有意义。想象你的数据点云集中在距离原点很远的某个位置 $\mathbf{c}$。一条必须穿过原点的方向 $\mathbf{w}$ 可能会完全错开点云，或者以一个与点云真实形状无关的角度穿过它。这时计算出来的“方差”，反映的很可能是点云离原点的距离，而不是点云本身的展开方向。

通过中心化，我们把点云的质心移动到原点。这样，所有过原点的方向都会穿过数据云的“中心”，沿某个方向的方差才真正表示数据在该方向上的扩散程度。

**从现在开始，我们默认数据已经中心化，为了简洁起见省略波浪号。**

## 几何直觉

把数据点云想象成 $\mathbb{R}^d$ 中的一个形状：它在某些方向上被拉长，在另一些方向上被压扁——更像一个椭球体而不是球。PCA 想要找到这个椭球的坐标轴：也就是数据最“伸展”的那些方向。

第一主成分是使投影后方差最大的方向。第二主成分是在与第一主成分正交的前提下，使方差次大的方向，以此类推。

## 协方差矩阵

为了形式化，我们先引入随机向量 $\mathbf{x}$ 的 **协方差矩阵** $\Sigma$：

$$
\text{Cov}(\mathbf{x}) = E[(\mathbf{x} - E[\mathbf{x}])(\mathbf{x} - E[\mathbf{x}])^T]
$$

由于数据已中心化，$E[\mathbf{x}] = \mathbf{0}$，因此

$$
\text{Cov}(\mathbf{x}) = E[(\mathbf{x} - \mathbf{0})(\mathbf{x} - \mathbf{0})^T] = E[\mathbf{x}\mathbf{x}^T] = \Sigma
$$

对角元素 $\Sigma_{ii} = E[x_i^2]$ 是各个特征的方差；非对角元素 $\Sigma_{ij} = E[x_i x_j]$ 是不同特征之间的协方差。

协方差矩阵为什么有用可能并不直观，但它为我们后续通过分析 $\Sigma$ 的性质来找到最优方向（主成分）铺平了道路。

> **经验协方差矩阵。** 实践中我们用数据估计 $\Sigma$：
> $$\Sigma \approx \frac{1}{n} \sum_{i=1}^{n} \mathbf{x}_i \mathbf{x}_i^T = \frac{1}{n} \mathbf{X} \mathbf{X}^T$$

## 协方差矩阵的性质

在寻找主成分之前，我们需要了解 $\Sigma$ 的一些关键性质：

**$\Sigma$ 是对称矩阵。** 因为 $\Sigma_{ij} = E[x_i x_j] = E[x_j x_i] = \Sigma_{ji}$，所以 $\Sigma = \Sigma^T$。

**谱定理（Spectral Theorem）。** 任意实对称矩阵都可以被一个正交矩阵对角化。具体地，存在一个正交矩阵 $\mathbf{W}$（满足 $\mathbf{W}^T \mathbf{W} = \mathbf{W}\mathbf{W}^T = \mathbf{I}$），使得

$$
\mathbf{W}^T \Sigma \mathbf{W} = \Lambda
$$

其中 $\Lambda$ 是对角矩阵，对角线元素是特征值；$\mathbf{W}$ 的列向量是对应的特征向量。同样地，为什么“可对角化”如此重要可能还不明显，但接下来会看到它正是 PCA 的核心。

## 一次性求出所有主成分

与其一个一个地找主成分，我们可以直接利用谱定理一次性得到全部主成分。令 $\mathbf{W} = [\mathbf{w}_1, \mathbf{w}_2, \ldots, \mathbf{w}_d]$ 为 $\Sigma$ 的特征向量组成的正交矩阵，并按特征值从大到小排列：

$$
\Lambda = \begin{bmatrix}
\lambda_1 & 0 & \cdots & 0 \\
0 & \lambda_2 & \cdots & 0 \\
\vdots & \vdots & \ddots & \vdots \\
0 & 0 & \cdots & \lambda_d
\end{bmatrix}, \quad \lambda_1 \geq \lambda_2 \geq \ldots \geq \lambda_d \geq 0
$$

### 变换及其协方差

变换 $\mathbf{z} = \mathbf{W}^T \mathbf{x}$ 将原始数据投影到由特征向量定义的新坐标轴上。每个分量 $z_i = \mathbf{w}_i^T \mathbf{x}$ 就是沿第 $i$ 根新轴的投影。

变换后的数据 $\mathbf{z}$ 的协方差矩阵是什么？因为 $\mathbf{z} = \mathbf{W}^T \mathbf{x}$ 且 $E[\mathbf{z}] = \mathbf{W}^T E[\mathbf{x}] = \mathbf{0}$，于是

$$
\text{Cov}(\mathbf{z}) = E[\mathbf{z}\mathbf{z}^T] = E[(\mathbf{W}^T \mathbf{x})(\mathbf{W}^T \mathbf{x})^T] = E[\mathbf{W}^T \mathbf{x} \mathbf{x}^T \mathbf{W}] = \mathbf{W}^T E[\mathbf{x}\mathbf{x}^T] \mathbf{W} = \mathbf{W}^T \Sigma \mathbf{W}
$$

根据谱定理，$\mathbf{W}^T \Sigma \mathbf{W} = \Lambda$，因此

$$
\text{Cov}(\mathbf{z}) = \Lambda
$$

这说明：使用特征向量矩阵 $\mathbf{W}$ 做变换后，$\mathbf{z}$ 的协方差矩阵变成了对角矩阵。敏锐的读者会注意到，对角协方差矩阵有两个重要含义：

- **对角线元素** $\Lambda_{ii} = \lambda_i$ 就是方差：$\text{Var}(z_i) = \lambda_i$
- **非对角元素** 全为 0：当 $i \neq j$ 时 $\text{Cov}(z_i, z_j) = 0$

这直接给出两条关键信息：

1. 变换后的各个分量两两 **不相关**——正是我们想要的！
2. 每个分量的 **方差** 恰好等于对应的 **特征值**。

### 识别主成分

我们已经看到：当用 $\mathbf{W}$ 定义新坐标轴时，第 $i$ 根轴上的方差就是 $\lambda_i$。由于 $\lambda_1 \geq \lambda_2 \geq \ldots \geq \lambda_d$，方差最大的方向是 $\mathbf{w}_1$——也就是最大特征值 $\lambda_1$ 对应的特征向量。

因此，第一主成分就是取变换矩阵 $\mathbf{W}$ 的第一列：

$$
\mathbf{w}_1 = \text{first column of } \mathbf{W}, \quad \text{Var}(\mathbf{w}_1^T \mathbf{x}) = \lambda_1
$$

同理，第二主成分 $\mathbf{w}_2$（在与 $\mathbf{w}_1$ 正交的前提下方差第二大）就是 $\mathbf{W}$ 的第二列，依此类推。

特征向量矩阵 $\mathbf{W}$ 同时给了我们：

- 所有主成分方向（作为列向量）
- 这些方向彼此不相关的保证（协方差的非对角元素为 0）
- 每个主成分捕捉到的方差（对应的特征值）

> 你可能会觉得：为什么协方差矩阵的特征向量恰好就是 PCA 想要的方向？这可以从优化角度来理解：寻找第一主成分等价于求解 $\max_{\|\mathbf{w}\|=1} \mathrm{Var}(\mathbf{w}^T \mathbf{x})$。
> 可以证明该问题的解就是 $\Sigma$ 的最大特征值对应的特征向量，从而把 PCA 直接连接到谱定理。推导细节超出了本节范围。

## 降维

要把维度从 $d$ 降到 $k$（其中 $k < d$），我们选择前 $k$ 个特征向量组成
$\mathbf{W}_k = [\mathbf{w}_1, \ldots, \mathbf{w}_k] \in \mathbb{R}^{d \times k}$：

$$
\mathbf{z}_{\text{reduced}} = \mathbf{W}_k^T \mathbf{x} \in \mathbb{R}^k
$$

这样就保留了方差最大的 $k$ 个方向，丢弃其余方向。至此，我们实现 PCA 的工作就完成了！我们得到了一个既能最大化信息保留、又能保证不相关性的主成分提取方法。

## 总结

PCA 通过寻找能最大化方差的正交方向（主成分）来降维：

1. **中心化** 数据：减去均值（使质心位于原点）。
2. **计算** 协方差矩阵 $\Sigma = \frac{1}{n} \mathbf{X} \mathbf{X}^T$。
3. **对角化** $\Sigma$ 得到特征值 $\lambda_i$ 与特征向量 $\mathbf{w}_i$。
4. **按特征值降序排序** 特征向量。
5. **选取** 前 $k$ 个特征向量组成 $\mathbf{W}_k$。
6. **变换** 数据：$\mathbf{z} = \mathbf{W}_k^T \mathbf{x}$。
