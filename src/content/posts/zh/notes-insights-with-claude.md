---
title: "Claude 根据我的笔记做的两个页面，以及对 Opus 5.5 的一些感想"
description: "Opus 5.5 基于我的笔记库 One-Shot 出的两个交互页面，以及对它的 taste、交流体验和 Claude Code 的感想"
date: 2026-09-28
lang: "zh-CN"
translationSlug: "notes-insights-with-claude"
author: "konakona"
---

最近开了个 Claude Pro 来试试 Opus 5.5，发现 Anthropic 居然十分 generous 地提供了 100$ 的云端任务额度（这还是我认识的 Anthropic 吗！），我想着要拿他们干点什么。

我的学习笔记放在一个 Git 管理的 Obsidian 库里，过去一年里它增长到了大约 320 篇，包含了各种传统 CS 和 ML 相关的内容。于是我开了两个会话，模型都是 Opus 5.5。给的提示词如下：

- 会话一："Think of a way to showcase my learnings and focuses. A visual, intuitive way." (Opus 5.5 Medium)
- 会话二："Create something interesting out of your analysis and understanding of this repo. There's no limit to what you do, as long as it's interesting, pleasant to look at, and can count as a 'creation'." (Opus 5.5 Max)

两个会话各自读完了整个仓库和 Git 历史，自己写分析脚本，最后产出了两个自包含的 HTML 页面：Note Atlas 和 Side-Step。以下是 Claude 自己的总结：

## Notes Atlas

**[打开 Notes Atlas →](/lab/notes-atlas/)**

一张"我学了什么、什么时候学的"的地图：

- 矩形树图：每个主题文件夹一块，面积按字数算。点开可以看到里面的笔记。
- 按月的热力图，从 Git 历史统计每个月在写哪些主题。
- 一年分成五个阶段，从系统编程语言到 LLM 后训练。阶段的命名和描述是 Claude 根据热力图和笔记标题自己总结的。

## 反复横跳 / Side-Step

**[打开反复横跳 →](/lab/side-step/)**

这个页面的起点是我个人笔记里的一句话：我总在传统 CS 和 AI 之间反复横跳。Claude 把这句话当真了：

- 每个提交按改动内容放在 CS 和 AI 两条跑道之间，并统计笔记越过中线的次数：351 天里 59 次。
- 十座"桥"：每座桥是两篇分属两边、讲的却是同一个想法的笔记。比如 Bellman–Ford 和 Bellman 方程、Huffman 编码和 BPE，还有图形学课程笔记和 RoPE 笔记里那组相同的旋转公式。大多数桥都配了一个可以动手玩的小演示。

## Thoughts

就像 Opus 5.5 发布以来我刷到的许多人们拿这个模型 One-Shot 做的各种有趣的事情一样，这两个页面也让我大开眼界。尤其是“反复横跳”这个页面，其中的各种可视化、可交互的演示让我感受到了这个模型的一种灵气，或者说 taste。另外，在用 Opus 5.5 开发过程中，我也明显感受到了这个模型在与人交流方面的优越性：它边界感强，很清楚应该如何理解人类的请求，知道该执行到哪一步停止，知道该 report 哪些东西，省略哪些东西。概括来说就是与它交流很舒服。我此前的主力一直是 GPT 5.6 Sol 以及更新的 6 Sol/Astra，虽然 6 系列模型在交流方面有所改善，但个人感觉 Opus 5.5 在这方面明显要更胜一筹。

另外，虽然以前也用过 Claude Code CLI，但从 Codex Desktop 切换到 CC 仍然让我感受到了一些 CLI 的局限性：fork session 不方便、side chat（CC 中是 `/btw`）不是很好用、CLI 中不能渲染数学公式、大段文字可读性不好等等，在某些场景下这拖慢了我的开发效率。而 Claude Desktop 目前明显是个没有完全打磨好的产品。私以为现在 Codex Desktop 的用户体验还是 superior 的，它唯一的问题是使用 Electron，启动慢，占用内存大，而且似乎还有些内存泄露问题。

最近 Anthropic 也是逐渐在营销和用户体验上（指的是额度提升、送福利、模型好用且相对便宜）开始干人事了，而 Codex 推出的两款新模型虽然足够便宜，但除此之外并没有给我太多新鲜感。总之期待两家未来的发展吧！
