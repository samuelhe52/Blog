---
title: "Two pages Claude built from my notes, and some thoughts on Opus 5.5"
description: "Two interactive pages Opus 5.5 one-shotted from my notes repo, plus my impressions of its taste, how it communicates, and Claude Code"
date: 2026-09-28
lang: "en"
translationSlug: "notes-insights-with-claude"
author: "konakona"
---

I recently got Claude Pro to try out Opus 5.5, and found that Anthropic was generously handing out $100 of credit for cloud sessions (is this still the Anthropic I know?). So I wanted to put that credit to use.

I keep my study notes in an Obsidian vault backed by a Git repo. Over the past year it has grown to about 320 notes, covering all kinds of classic CS and ML topics. So I opened two sessions, both running Opus 5.5, with these prompts:

- Session 1: "Think of a way to showcase my learnings and focuses. A visual, intuitive way." (Opus 5.5 Medium)
- Session 2: "Create something interesting out of your analysis and understanding of this repo. There's no limit to what you do, as long as it's interesting, pleasant to look at, and can count as a 'creation'." (Opus 5.5 Max)

Each session read the whole repo and its Git history, wrote its own analysis scripts, and produced a self-contained HTML page: Notes Atlas and Side-Step. Below are Claude's own summaries.

## Notes Atlas

**[Open Notes Atlas →](/lab/notes-atlas/)**

A map of what I've studied and when:

- A treemap with one tile per topic folder, sized by word count. Click a tile to see the notes inside it.
- A monthly heatmap, built from Git history, showing which topics I worked on each month.
- Five phases of the year, from systems languages to LLM post-training. Claude named and described them from the heatmap and note titles.

## 反复横跳 / Side-Step

**[Open Side-Step →](/lab/side-step/)**

This one started from a line in my personal notes, where I wrote that I keep side-stepping (反复横跳) between classic CS and AI. Claude took that literally:

- Every commit is placed between a CS lane and an AI lane, and the page counts how often my notes crossed the center line: 59 times in 351 days.
- Ten "bridges": pairs of notes, one from each lane, that describe the same idea. For example, Bellman–Ford and the Bellman equation, Huffman coding and BPE, or the identical rotation equations in my graphics course notes and my RoPE note. Most of them come with a small interactive demo.

## Thoughts

Like the many fun one-shot projects people have posted since Opus 5.5 came out, these two pages really opened my eyes. Side-Step especially: its visualizations and interactive demos gave me a sense that the model has a certain spark, or taste. While working with Opus 5.5, I also clearly noticed how good it is at communicating with people. It has a strong sense of boundaries: it understands what a request actually means, knows where to stop, and knows what to report and what to leave out. In short, it's comfortable to talk to. My main models until now have been GPT 5.6 Sol and the newer 6 Sol/Astra. The 6 series has improved at communication, but to me Opus 5.5 is clearly better at it.

I had used the Claude Code CLI before, but switching from Codex Desktop to CC still made some of the CLI's limits obvious: forking a session is awkward, side chats (`/btw` in CC) aren't great, math doesn't render in the terminal, long passages of text are hard to read, and so on. In some situations this slowed me down. Claude Desktop, meanwhile, is clearly not a fully polished product yet. In my opinion Codex Desktop still has the better user experience. Its only problem is Electron: it's slow to start, uses a lot of memory, and seems to have some memory leaks.

Anthropic has lately started getting things right on marketing and user experience (higher limits, free credits, a model that's genuinely good and relatively affordable), while Codex's two new models are cheap enough but haven't felt very fresh to me beyond that. Anyway, I'm looking forward to what both of them do next!
